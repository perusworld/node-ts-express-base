# Node.js TypeScript Express - Prototype Backend

A sophisticated Node.js TypeScript Express prototype backend designed for **rapid prototyping, sales demos, and proof-of-concept development**. This project eliminates the friction of setting up infrastructure while providing realistic multi-tenant experiences for client presentations and development iterations.

## 📋 Table of Contents

- [🎯 Perfect For](#-perfect-for)
- [🚀 Key Features](#-key-features)
- [⚠️ Important: Prototype/Demo Purpose](#️-important-prototypedemo-purpose)
- [🏃‍♂️ Quick Start](#️-quick-start)
- [⚙️ Configuration](#️-configuration)
- [🎭 Multi-Tenant Demo Magic](#-multi-tenant-demo-magic)
- [🔧 What You Get vs. What You Don't](#-what-you-get-vs-what-you-dont)
- [🎯 Use Cases & Scenarios](#-use-cases--scenarios)
- [📚 Development & Testing](#-development--testing)
- [🐳 Docker Deployment](#-docker-deployment)
- [📖 Advanced Topics](#-advanced-topics)
- [🔌 Storage & Production Options](#-storage--production-options)
- [📄 License](#-license)

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

**Optional production-oriented features** (opt-in via environment variables):

- **PostgreSQL + Prisma** - Persistent User and Job storage when `STORAGE=prisma`
- **Redis + BullMQ** - Real background job queue when `ENABLE_QUEUE=true`
- **JWT Auth** - User registration, login, and token-based auth for `AUTH_MODE=full`
- **Job API** - Persistent trackable jobs at `/api/v1/jobs` (requires Prisma + queue)

## ⚠️ **Important: Prototype/Demo Purpose**

**By default, this is a prototype system** designed for:

- **Rapid prototyping** and concept validation
- **Client demonstrations** without infrastructure setup
- **Development iterations** and feature testing
- **Sales presentations** showing system capabilities

**Default limitations** (when `STORAGE` is unset or `memory`):

- All data is stored in-memory (lost on server restart)
- No database persistence or redundancy
- No horizontal scaling capabilities
- No failover or disaster recovery
- Single-server architecture

**Optional production features:** When you need persistence and real background jobs, you can enable `STORAGE=prisma`, `ENABLE_QUEUE=true`, and `AUTH_MODE=full`. See [Storage & Production Options](#-storage--production-options).

## 🏃‍♂️ **Quick Start**

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd node-ts-express-base

# Install dependencies
npm install
```

### Get Running in Minutes

```bash
# Development mode (recommended for demos)
npm run dev

# Or production mode for demo deployment
npm run build
npm start
```

### Verify It's Working

- **Local Development**: http://localhost:3000/
- **Socket.IO Script**: http://localhost:3000/socket.io/socket.io.js (when enabled)

## ⚙️ **Configuration**

This project uses [dotenv](https://github.com/motdotla/dotenv) for environment variable management. Copy `env.example` to `.env` and configure the following variables:

### Preset configs (prototype vs production)

One-command config for prototype or production (combined approach):

| Script | Effect |
|--------|--------|
| `npm run env:prototype` | Copies `env.prototype` to `.env` (in-memory, no Postgres/Redis) |
| `npm run env:production` | Copies `env.production` to `.env` (then set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`) |

Then run `npm run dev` or `npm start` as usual. For a **prototype-only build** (smaller bundle, no Prisma/BullMQ in the artifact): `npm run build:prototype` then `npm run start:prototype` (uses `env.prototype` by default).

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

### Storage & Production Options

Optional environment variables for persistent storage and production-style features:

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE` | `memory` | `memory` = in-memory only; `prisma` = PostgreSQL via Prisma |
| `DATABASE_URL` | — | Required when `STORAGE=prisma`. PostgreSQL connection string |
| `REDIS_URL` | — | Redis URL for BullMQ (when `ENABLE_QUEUE=true`) |
| `ENABLE_QUEUE` | `false` | `true` = enable BullMQ (email worker, trackable-job worker) |
| `JWT_SECRET` | — | Secret for JWT signing. Generate with `openssl rand -hex 32` |
| `JWT_EXPIRATION` | `1h` | JWT token expiry |
| `AUTH_MODE` | `prototype` | `prototype` = IP/session isolation; `full` = JWT required for CMS/task/session routes |

**Quick start with PostgreSQL + Redis:**

```bash
# Start Postgres and Redis (project name: nteb; use -d to run in background)
docker compose -p nteb -f docker-compose-db.yml up

# Run migrations
npx prisma migrate dev --name init

# Set in .env
STORAGE=prisma
DATABASE_URL=postgresql://user:pass@localhost:5432/nteb?schema=public
REDIS_URL=redis://localhost:6379
ENABLE_QUEUE=true
JWT_SECRET=your_secret_here
AUTH_MODE=full   # or prototype for demos
```

### Advanced Configuration

For complete configuration options, see:

- **[SESSION_ISOLATION.md](SESSION_ISOLATION.md)** - Session isolation and IP-based session mapping for demo isolation
- **[TASK_SYSTEM_GUIDE.md](TASK_SYSTEM_GUIDE.md)** - Async task system for workflow demonstrations

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

## 🔧 **What You Get vs. What You Don't**

### **✅ What You Get (Perfect for Prototyping)**

- Working multi-tenant system in minutes
- Realistic data isolation between users
- Background task processing demonstrations
- Real-time updates and progress tracking
- Professional-looking API structure
- Session management and security features

### **✅ What You Get (Optional, when using production options)**

When `STORAGE=prisma` and `ENABLE_QUEUE=true`:

- **Persistent data storage** - User and Job data in PostgreSQL
- **User auth API** - Register, login, JWT tokens at `/api/v1/users`
- **Job API** - Create, list, and track jobs at `/api/v1/jobs`
- **Background workers** - Email worker, trackable-job worker via BullMQ

### **❌ What You Don't Get (Even with production options)**

- Database redundancy or failover
- Horizontal scaling capabilities
- Monitoring and alerting
- Backup and disaster recovery

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

## 📚 **Development & Testing**

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project with Webpack (full server)
- `npm run build:prototype` - Build prototype-only bundle (no Prisma/BullMQ in bundle)
- `npm start` - Start production server (full)
- `npm run start:prototype` - Start prototype server (uses `env.prototype`; run `build:prototype` first)
- `npm run env:prototype` - Copy `env.prototype` to `.env`
- `npm run env:production` - Copy `env.production` to `.env`
- `npm test` - Run tests (in-memory only; integration tests excluded)
- `npm run test:integration` - Run integration tests (Prisma + Redis; requires `docker compose -p nteb -f docker-compose-db.yml up` and migrations)
- `npm run start:watch` - Start with nodemon for development
- `npm run start:build` - Start Webpack in watch mode

### Testing

Tests respect the combined approach (prototype vs production):

- **Unit tests (prototype mode):** `npm test` — runs all tests except `test/integration/`. Uses `STORAGE=memory` and `ENABLE_QUEUE=false` so no Postgres or Redis is required, regardless of your `.env`. Safe to run anytime.
- **Integration tests (production mode):** `npm run test:integration` — runs only `test/integration/` (auth API, jobs API, AUTH_MODE=full). Uses `STORAGE=prisma`, `ENABLE_QUEUE=true`, `AUTH_MODE=full`. Requires Postgres and Redis running **and** migrations applied.

**Run integration tests:**

```bash
# 1. Start Postgres + Redis (project name: nteb; use -d to run in background)
docker compose -p nteb -f docker-compose-db.yml up

# 2. Apply migrations (first time or after schema changes)
npx prisma migrate deploy

# 3. Run integration tests
npm run test:integration
```

**Stop DB and remove volumes:**

```bash
docker compose -p nteb -f docker-compose-db.yml down -v
```

```bash
npm test                    # unit tests only, prototype mode, no DB
npm run test:integration    # integration tests, production mode, after DB + migrate
```

### Getting Started with Demos

1. **Clone and run** - Get a working system in minutes
2. **Configure sessions** - Set up demo isolation
3. **Create demo data** - Populate with sample content
4. **Present to clients** - Show real system capabilities
5. **Iterate quickly** - Make changes and see results immediately

This project transforms the typical "let me set up a demo environment" conversation into "let me show you right now" - making it perfect for sales, prototyping, and rapid development scenarios.

## 🐳 **Docker Deployment**

This project includes a multi-stage Dockerfile for both **production** and **development** workflows.

### **Production Deployment**

#### **Option 1 — Direct `docker build`**

1. **Build the image**

   ```bash
   docker build -t node-ts-express-base . --target runner
   ```

2. **Run the container**

   ```bash
   docker run --rm -p 3000:3000 -e ENV_FILE=env.docker --name node-ts-express-base node-ts-express-base
   ```

   - **`--env-file env.docker`** – loads Docker-specific environment variables (includes IP restrictions for Docker networking)
   - **`-p 3000:3000`** – maps container port 3000 to host port 3000
   - The app runs using `npm start` from `package.json`

#### **Option 2 — Using `docker-compose.prod.yml`**

**Run:**

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- `--build` ensures a fresh build
- `-d` runs in detached mode
- `restart: unless-stopped` makes it production-friendly (auto-restarts if the container stops)

**Stop:**

```bash
docker compose -f docker-compose.prod.yml down
```

### **Development with Docker (Hot Reload)**

A separate `dev` target and `docker-compose.dev.yml` are provided for live-reload development.

1. **Start dev environment**

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

2. **Live reload**
   - Edits on your host are reflected immediately in the container
   - `node_modules` is preserved inside the container to avoid mismatches

### **Docker Notes**

- **Images & stages**
  - `runner` → lean production image (compiled JS, prod dependencies only)
  - `dev` → development image (full dependencies, no pre-build)

- **Default port**: `3000` (change via `PORT` in environment file)
- **Environment variables**:
  - **Docker**: Use `env.docker` for containerized deployment (includes Docker IP restrictions)
  - **Local development**: Create `.env` from `env.example` for local development

## 📖 **Advanced Topics**

### Session Isolation System

The session isolation system is the core feature that makes this project perfect for demos. Each user gets their own isolated data space, simulating real multi-tenant architecture without database complexity.

**Key Benefits:**

- **No data cross-contamination** between different client presentations
- **Automatic session management** based on IP addresses
- **Realistic multi-tenant experience** for prospects and clients
- **Instant demo setup** without infrastructure provisioning

### Async Task System

The background task processing system demonstrates real-world workflow scenarios:

- **Long-running processes** with progress tracking
- **Workflow demonstrations** for complex business processes
- **Real-time updates** via Socket.IO
- **Task management API** for demo interactions

For detailed information, see:

- **[SESSION_ISOLATION.md](SESSION_ISOLATION.md)** - Complete guide to session isolation
- **[TASK_SYSTEM_GUIDE.md](TASK_SYSTEM_GUIDE.md)** - Comprehensive task system documentation

## 🔌 **Storage & Production Options**

When you need persistence and production-style features, enable the optional stack:

### User Auth API

Base path: `/api/v1/users`. User routes are always mounted; register/login do not require auth.

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/v1/users/register` | — | Register with email and password; returns user + JWT |
| `POST /api/v1/users/login` | — | Login; returns user + JWT |
| `GET /api/v1/users/config` | JWT | Get user config |
| `PUT /api/v1/users/config` | JWT | Update user config |

### Job API

Base path: `/api/v1/jobs`. **Only mounted when** `STORAGE=prisma` and `ENABLE_QUEUE=true`. All job routes require JWT.

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/jobs` | Create a job (type, arguments; admins can create system jobs with `system: true`) |
| `POST /api/v1/jobs/start-dummy-job` | Create and enqueue a dummy job (configurable delay) |
| `GET /api/v1/jobs` | List jobs (user-scoped; admins see all) |
| `GET /api/v1/jobs/:id` | Get job by ID |

**Admin users:** Set `role='admin'` in the User table to list all jobs and create system jobs (`userId=null`).

### Modes at a Glance

| Mode | `STORAGE` | `AUTH_MODE` | `ENABLE_QUEUE` | Use case |
|------|-----------|-------------|----------------|----------|
| **Prototype** | `memory` | `prototype` | `false` | Demos, POCs, no infra |
| **Production** | `prisma` | `full` | `true` | Persistent users, jobs, JWT auth |

## 📄 **License**

MIT License - see LICENSE file for details
