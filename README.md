# Node.js TypeScript Express - Base

A robust Node.js TypeScript Express base project with Socket.IO support, IP restrictions, logging, session isolation, and async task processing capabilities.

## 🚀 Features

- **TypeScript** - Full TypeScript support with proper configuration
- **Express.js** - Latest Express.js framework
- **Socket.IO** - Optional WebSocket support
- **IP Restrictions** - Configurable IP address restrictions
- **Logging** - Winston-based logging with configurable levels
- **Session Database Isolation** - Isolated database instances per session
- **Async Task System** - Background task processing with progress tracking
- **Testing** - Jest testing framework setup
- **Webpack** - Asset bundling and development tools

## 📋 Prerequisites

- Node.js (v22 or higher)
- npm or yarn

## 🛠️ Installation

```bash
npm install
```

## ⚙️ Configuration

This project uses [dotenv](https://github.com/motdotla/dotenv) for environment variable management. Copy `env.example` to `.env` and configure the following variables:

### Essential Configuration

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
IP_RESTRICTION_ENABLED=true
ALLOWED_IPS=192.168.1.100,10.0.0.50
ALLOW_LOCAL_ADDRESSES=true

# Session Database Isolation
ENABLE_SESSION_ISOLATION=true
AUTO_MAP_SESSION_BY_IP=true
```

### Advanced Configuration

For complete configuration options, see:

- **[SESSION_ISOLATION.md](SESSION_ISOLATION.md)** - Session isolation and IP-based session mapping
- **[TASK_SYSTEM_GUIDE.md](TASK_SYSTEM_GUIDE.md)** - Async task system configuration

## 🏃‍♂️ Quick Start

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

## 🌐 URLs

- **Local Development**: http://localhost:3000/
- **Socket.IO Script**: http://localhost:3000/socket.io/socket.io.js (when enabled)

## 📚 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project with Webpack
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run start:watch` - Start with nodemon for development
- `npm run start:build` - Start Webpack in watch mode

## 📄 License

MIT License - see LICENSE file for details
