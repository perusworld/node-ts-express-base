# Session Database Isolation & IP-Based Session Mapping - Prototype System

This feature provides **in-memory isolated database instances per app session** for prototyping and demonstrating multi-tenant capabilities. It's designed for client presentations, demos, and proof-of-concept development where you need to show isolated data per user without setting up real database infrastructure.

## ⚠️ **Important: Prototype/Demo Purpose**

**Session isolation provides in-memory, per-session data.** It's designed for:

- **Client demonstrations** showing multi-tenant architecture
- **Sales presentations** without database setup complexity
- **Prototyping** multi-tenant features quickly
- **Development testing** of session-based logic

**Session isolation limitations:**

- CMS data per session is in-memory (lost on server restart)
- No persistent storage or backup for session-scoped CMS data
- Limited to single server instance

**Note:** User and Job data (when `STORAGE=prisma`) are stored in PostgreSQL and are persistent. Session isolation applies to the CMS endpoints and in-memory task system.

## Overview

When enabled, each request can specify a session key that determines which in-memory database instance to use. This prevents data corruption between different users or demo sessions. Additionally, when IP-based mapping is enabled, session keys are automatically generated for requests without explicit session keys.

**Perfect for:**

- Showing isolated data per customer in sales demos
- Demonstrating multi-tenant capabilities to prospects
- Rapid prototyping of session-based features
- Client workshops with working examples

## Configuration

### Auth Mode and Session Routes

When `AUTH_MODE=full`, CMS, task, and session routes require a valid JWT. The session key is then derived from the authenticated user's ID (`req.user.id`), not from IP or headers. Use `AUTH_MODE=prototype` for demos where IP/session headers determine isolation.

### Environment Variables

Set `ENABLE_SESSION_ISOLATION=true` in your environment to enable this feature.

```bash
# Enable session isolation (Core demo feature)
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

# Auto-mapping Session Keys by IP (Optional)
AUTO_MAP_SESSION_BY_IP=true
IP_SESSION_PREFIX=ip_

# Auth mode: prototype = session from IP/header; full = JWT required, session from user id
AUTH_MODE=prototype
```

### Complete Example .env Configuration

```bash
# Session Database Isolation (Core Demo Feature)
ENABLE_SESSION_ISOLATION=true
SESSION_PREFIX=session_
MAX_SESSIONS=100
SESSION_TIMEOUT=1800000
SESSION_HEADER=X-App-Session
SESSION_QUERY_PARAM=session
SESSION_COOKIE=app_session
DEFAULT_SESSION=default

# Auto-mapping Session Keys by IP (Optional)
AUTO_MAP_SESSION_BY_IP=true
IP_SESSION_PREFIX=ip_

# Auth mode (when using JWT auth)
AUTH_MODE=prototype
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

### 5. Automatic IP-Based Session Mapping

When both `ENABLE_SESSION_ISOLATION=true` and `AUTO_MAP_SESSION_BY_IP=true` are set, the application will automatically generate session keys based on client IP addresses when no explicit session key is provided in the request.

**In prisma mode (`STORAGE=prisma`):** Session isolation and IP-based mapping still apply to CMS and session-scoped data (the session middleware runs regardless of `STORAGE`). When you also use `AUTH_MODE=full`, CMS/task/session routes use the **authenticated user's id** as the session key instead of the IP—so for those scoped routes the session key comes from the JWT, not from IP mapping. IP mapping is still used for unauthenticated requests and for non-scoped routes.

**Perfect for demo scenarios** where you want each client to see their own isolated data without manual session management.

#### How it works:

1. **Request without session key**: When a request comes in without a session key in header, query parameter, or cookie
2. **IP detection**: The client's IP address is extracted using the same logic as IP restriction middleware
3. **Session key generation**: A session key is generated in the format `ip_<hashed_ip_address>` (16-character SHA-256 hash)
4. **Session mapping**: The IP address is mapped to this session key for future requests
5. **Data isolation**: Each IP gets its own isolated in-memory database instance

#### Example:

- Request from `192.168.1.100` without session key → Session key: `ip_a1b2c3d4e5f6g7h8` (hashed)
- Request from `2001:db8::1` without session key → Session key: `ip_5afd19e856d1c18d` (hashed)
- Request with explicit session key → Uses the explicit session key (auto-mapping is bypassed)

**Note**: IP addresses are cryptographically hashed for security and privacy. The same IP will always generate the same session key, but the original IP cannot be derived from the session key.

## API Endpoints

### Session Management (when ENABLE_SESSION_ISOLATION=true)

- `GET /api/v1/sessions/stats` - Get session statistics
- `GET /api/v1/sessions/cleanup` - Cleanup expired sessions
- `DELETE /api/v1/sessions/:sessionKey` - Remove specific session

### IP-Based Session Mapping (when ENABLE_SESSION_ISOLATION=true and AUTO_MAP_SESSION_BY_IP=true)

- `GET /api/v1/sessions/ip-mappings` - Get IP-session mapping statistics
- `DELETE /api/v1/sessions/ip-mappings` - Clear all IP-session mappings

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

### IP-Based Session Mapping

```bash
# Request from IP 192.168.1.100 without session key
# Automatically gets session key like "ip_a1b2c3d4e5f6g7h8"
curl http://localhost:3000/api/v1/cms/users

# Same IP, same session key automatically used
curl http://localhost:3000/api/v1/cms/users

# Different IP gets different session key automatically
# (from different machine or using different network)
curl http://localhost:3000/api/v1/cms/users
```

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

### IP-Session Mapping Statistics

```bash
curl http://localhost:3000/api/v1/sessions/ip-mappings
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
- IP-based mapping can provide automatic session keys

## Troubleshooting

### Session Not Working

1. Check if `ENABLE_SESSION_ISOLATION=true`
2. Verify session key is being sent correctly
3. Check server logs for session creation messages

### IP-Based Mapping Not Working

1. Ensure `AUTO_MAP_SESSION_BY_IP=true`
2. Check that `ENABLE_SESSION_ISOLATION=true`
3. Verify IP detection is working (check IP restriction logs)

### Memory Issues

1. Reduce `MAX_SESSIONS` value
2. Reduce `SESSION_TIMEOUT` value
3. Implement periodic cleanup

### Data Persistence

- Each session can save/load its own database file
- File names include session ID for isolation
- Default session uses original database file
- IP-based sessions use hashed IP in filename
