# Node.js TypeScript Express - Base

A robust Node.js TypeScript Express base project with Socket.IO support, IP restrictions, logging, and comprehensive environment variable configuration.

## Features

- **TypeScript** - Full TypeScript support with proper configuration
- **Express.js** - Latest Express.js framework
- **Socket.IO** - Optional WebSocket support
- **IP Restrictions** - Configurable IP address restrictions
- **Logging** - Winston-based logging with configurable levels
- **Environment Variables** - Comprehensive configuration via environment variables
- **Testing** - Jest testing framework setup
- **Webpack** - Asset bundling and development tools

## Installation

```bash
npm install
```

## Configuration

This project uses [dotenv](https://github.com/motdotla/dotenv) for environment variable management. Create a `.env` file in the root directory and add your configuration.

### Environment Variables

Copy `env.example` to `.env` and configure the following variables:

#### Server Configuration

- `PORT` - Server port (default: 3000)
- `WITH_SOCKETIO` - Enable Socket.IO support (default: false)

#### Application Configuration

- `TIME_ZONE` - Application timezone (default: America/Los_Angeles)
- `CONFIG` - Configuration directory (default: config)

#### Logging Configuration

- `BE_LOG_LEVEL` - Log level (debug, info, warn, error)
- `BE_APP_NAME` - Application name for logging
- `BE_LOG_FORMAT` - Log format (simple, json, etc.)

#### IP Restriction Configuration

- `IP_RESTRICTION_ENABLED` - Enable IP restriction (default: false)
- `ALLOWED_IPS` - Comma-separated list of allowed IP addresses
- `ALLOW_LOCAL_ADDRESSES` - Allow local address access (default: true)

### Example .env file

```bash
# Server Configuration
PORT=3000
WITH_SOCKETIO=true

# Application Configuration
TIME_ZONE=America/Los_Angeles
CONFIG=config

# Logging Configuration
BE_LOG_LEVEL=debug
BE_APP_NAME=express-base
BE_LOG_FORMAT=simple

# IP Restriction Configuration
IP_RESTRICTION_ENABLED=false
ALLOWED_IPS=192.168.1.100,10.0.0.50
ALLOW_LOCAL_ADDRESSES=true
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## URLs

- **Local Development**: http://localhost:3000/
- **Socket.IO Script**: http://localhost:3000/socket.io/socket.io.js (when enabled)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project with Webpack
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run start:watch` - Start with nodemon for development
- `npm run start:build` - Start Webpack in watch mode

## Project Structure

```
├── bin/www                 # Application entry point
├── config/                 # Configuration files
├── database/               # Database related files
├── public/                 # Static assets
├── src/                    # Source code
│   ├── middleware/         # Express middleware
│   ├── api.ts             # API routes
│   ├── controller.ts      # Controllers
│   ├── server.ts          # Server setup
│   └── ...
├── test/                   # Test files
├── views/                  # Pug templates
└── package.json           # Dependencies and scripts
```

## License

MIT License - see LICENSE file for details
