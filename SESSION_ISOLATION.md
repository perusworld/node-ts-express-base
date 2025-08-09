# Session Database Isolation

This feature provides isolated database instances per app session, allowing multiple users to work with their own data without interference.

## Overview

When enabled, each request can specify a session key that determines which database instance to use. This prevents data corruption between different users or demo sessions.

## Configuration

### Environment Variables

Set `ENABLE_SESSION_ISOLATION=true` in your environment to enable this feature.

```bash
# Enable session isolation
ENABLE_SESSION_ISOLATION=true

# Session configuration
SESSION_PREFIX=session_
MAX_SESSIONS=100
SESSION_TIMEOUT=1800000  # 30 minutes in milliseconds

# Session key sources (in order of precedence)
SESSION_HEADER=X-App-Session
SESSION_QUERY_PARAM=session
SESSION_COOKIE=app_session
DEFAULT_SESSION=default
```

## Usage

### 1. Using HTTP Headers

```bash
curl -H "X-App-Session: user123" http://localhost:3000/api/v1/cms/users
```

### 2. Using Query Parameters

```bash
curl "http://localhost:3000/api/v1/cms/users?session=user123"
```

### 3. Using Cookies

```bash
curl -H "Cookie: app_session=user123" http://localhost:3000/api/v1/cms/users
```

### 4. Default Session

If no session key is provided, the `DEFAULT_SESSION` value is used.

## API Endpoints

### Session Management (when enabled)

- `GET /api/v1/sessions/stats` - Get session statistics
- `GET /api/v1/sessions/cleanup` - Cleanup expired sessions
- `DELETE /api/v1/sessions/:sessionKey` - Remove specific session

### CMS Endpoints (session-aware)

All CMS endpoints automatically use the session database:

- `GET /api/v1/cms/:name` - List all items in table
- `GET /api/v1/cms/:name/:id` - Get item by ID
- `POST /api/v1/cms/save/:name` - Create or update item
- `DELETE /api/v1/cms/:name/:id` - Delete item by ID
- `POST /api/v1/cms/find/:name` - Find first matching item
- `POST /api/v1/cms/find-all/:name` - Find all matching items
- `GET /api/v1/cms/reset/:name` - Delete all items in table
- `GET /api/v1/cms/reset-all` - Delete all data
- `POST /api/v1/cms/save-db` - Save database to file
- `POST /api/v1/cms/load-db` - Load database from file

## Architecture

### Components

1. **DatabaseFactory** (`src/db-factory.ts`)
   - Manages multiple database instances
   - Handles session lifecycle (creation, expiration, cleanup)
   - Provides session statistics

2. **SessionDatabaseMiddleware** (`src/middleware/session-database.ts`)
   - Extracts session keys from requests
   - Attaches appropriate database to request
   - Handles session key normalization and security

3. **Updated CMS Route** (`src/cms.ts`)
   - Uses session database when available
   - Falls back to default database
   - Maintains backward compatibility

### Session Key Sources (Priority Order)

1. HTTP Header (`X-App-Session`)
2. Query Parameter (`?session=key`)
3. Cookie (`app_session`)
4. Default Session (`default`)

### Security Features

- Session key sanitization (prevents path traversal)
- Session timeout (automatic cleanup)
- Maximum session limit
- Input validation

## Example Use Cases

### Frontend Demo Applications

```javascript
// Frontend code
const sessionKey = 'demo_user_' + Date.now();

// All API calls use the same session
fetch('/api/v1/cms/users', {
  headers: {
    'X-App-Session': sessionKey,
  },
});

fetch('/api/v1/cms/users', {
  headers: {
    'X-App-Session': sessionKey,
  },
  method: 'POST',
  body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
});
```

### Multiple Concurrent Users

```bash
# User A
curl -H "X-App-Session: user_a" -X POST http://localhost:3000/api/v1/cms/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# User B (different session, isolated data)
curl -H "X-App-Session: user_b" -X POST http://localhost:3000/api/v1/cms/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "email": "bob@example.com"}'

# Each user sees only their own data
curl -H "X-App-Session: user_a" http://localhost:3000/api/v1/cms/users
curl -H "X-App-Session: user_b" http://localhost:3000/api/v1/cms/users
```

## Performance Considerations

- Each session maintains its own in-memory database
- Sessions are automatically cleaned up after timeout
- Maximum session limit prevents memory exhaustion
- Database operations remain fast (in-memory)

## Monitoring

### Session Statistics

```bash
curl http://localhost:3000/api/v1/sessions/stats
```

Response:

```json
{
  "activeSessions": 5,
  "maxSessions": 100,
  "sessionTimeout": 1800000
}
```

### Manual Cleanup

```bash
curl http://localhost:3000/api/v1/sessions/cleanup
```

## Migration from Non-Session Mode

When `ENABLE_SESSION_ISOLATION=false` (default):

- All requests use the same database instance
- No changes to existing code required
- Backward compatibility maintained

When `ENABLE_SESSION_ISOLATION=true`:

- Add session keys to requests
- Each session gets isolated data
- Existing data remains in default session

## Troubleshooting

### Session Not Working

1. Check if `ENABLE_SESSION_ISOLATION=true`
2. Verify session key is being sent correctly
3. Check server logs for session creation messages

### Memory Issues

1. Reduce `MAX_SESSIONS` value
2. Reduce `SESSION_TIMEOUT` value
3. Implement periodic cleanup

### Data Persistence

- Each session can save/load its own database file
- File names include session ID for isolation
- Default session uses original database file
