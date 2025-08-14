# Node.js TypeScript Express - Prototype Backend

A sophisticated Node.js TypeScript Express prototype backend designed for **rapid prototyping, sales demos, and proof-of-concept development**. This project eliminates the friction of setting up infrastructure while providing realistic multi-tenant experiences for client presentations and development iterations.

## 🎯 **Perfect For**

- **Sales Demos** - Show multi-tenant capabilities without database setup
- **Proof of Concepts** - Validate ideas quickly with working prototypes
- **Client Presentations** - Demonstrate system architecture and features
- **Developer Onboarding** - Show system design without infrastructure complexity
- **Hackathons** - Rapid prototyping with built-in multi-tenancy
- **MVP Development** - Focus on business logic, not infrastructure setup

## 🚀 **Key Features**

- **TypeScript** - Full TypeScript support with proper configuration
- **Express.js** - Latest Express.js framework for API development
- **Socket.IO** - Optional WebSocket support for real-time features
- **IP Restrictions** - Configurable IP address restrictions for demo environments
- **Logging** - Winston-based logging with configurable levels
- **Session Database Isolation** - **In-memory isolated database instances per session for demo isolation**
- **Async Task System** - Background task processing with progress tracking for workflow demonstrations
- **Multi-Tenant Demo Support** - Each demo user gets their own isolated data space
- **Testing** - Jest testing framework setup for development validation
- **Webpack** - Asset bundling and development tools

## ⚠️ **Important: Prototype/Demo Purpose**

**This is NOT a production-ready system.** It's designed for:

- **Rapid prototyping** and concept validation
- **Client demonstrations** without infrastructure setup
- **Development iterations** and feature testing
- **Sales presentations** showing system capabilities

**Production limitations:**

- All data is stored in-memory (lost on server restart)
- No database persistence or redundancy
- No horizontal scaling capabilities
- No failover or disaster recovery
- Single-server architecture

## 🎭 **Multi-Tenant Demo Magic**

The real value is in how it handles **demo scenarios**:

### **Session Isolation for Demos**

- Each demo user gets their own "database" instance
- No data cross-contamination between different client presentations
- Automatic session key generation from IP addresses
- Perfect for showing isolated data per customer without real database setup

### **In-Memory Per-Session Storage**

- Each session gets its own isolated data space
- Simulates real multi-tenant architecture
- No need to set up databases for each demo

### **Task System for Demo Workflows**

- Show long-running processes and progress tracking
- Demonstrate real-world workflow scenarios
- Simulate complex business processes

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

# Session Database Isolation (Core Demo Feature)
ENABLE_SESSION_ISOLATION=true
AUTO_MAP_SESSION_BY_IP=true
```

### Advanced Configuration

For complete configuration options, see:

- **[SESSION_ISOLATION.md](SESSION_ISOLATION.md)** - Session isolation and IP-based session mapping for demo isolation
- **[TASK_SYSTEM_GUIDE.md](TASK_SYSTEM_GUIDE.md)** - Async task system for workflow demonstrations

## 🏃‍♂️ Quick Start

### Development Mode

```bash
npm run dev
```

### Production Mode (for demo deployment)

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

## 🎯 **Use Cases & Scenarios**

### **Sales Team Presentations**

- Show multi-tenant capabilities to prospects
- Demonstrate system features without setup delays
- Create isolated demo environments for each client

### **Development Team**

- Rapidly prototype new features
- Test system architecture decisions
- Onboard new developers with working examples

### **Client Workshops**

- Interactive system demonstrations
- Feature validation sessions
- Requirements gathering with working prototypes

### **Proof of Concept Development**

- Validate business ideas quickly
- Test technical approaches
- Iterate on system design

## 🔧 **What You Get vs. What You Don't**

### **✅ What You Get (Perfect for Prototyping)**

- Working multi-tenant system in minutes
- Realistic data isolation between users
- Background task processing demonstrations
- Real-time updates and progress tracking
- Professional-looking API structure
- Session management and security features

### **❌ What You Don't Get (Production Limitations)**

- Persistent data storage
- Database redundancy or failover
- Horizontal scaling capabilities
- Production-grade security
- Monitoring and alerting
- Backup and disaster recovery

## 📄 License

MIT License - see LICENSE file for details

## 🚀 **Getting Started with Demos**

1. **Clone and run** - Get a working system in minutes
2. **Configure sessions** - Set up demo isolation
3. **Create demo data** - Populate with sample content
4. **Present to clients** - Show real system capabilities
5. **Iterate quickly** - Make changes and see results immediately

This project transforms the typical "let me set up a demo environment" conversation into "let me show you right now" - making it perfect for sales, prototyping, and rapid development scenarios.
