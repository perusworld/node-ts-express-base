# Database - Prototype In-Memory System

This directory contains the in-memory database implementation used for prototyping and demonstrations.

## Overview

The database system is **NOT a production database**. It's designed for:

- **Rapid prototyping** without database setup
- **Client demonstrations** showing data isolation
- **Development testing** of application logic
- **Proof of concept** development

## What It Is

- **In-memory storage** using JavaScript Maps
- **Session-based isolation** for multi-tenant demos
- **File-based persistence** (optional JSON backup)
- **No SQL or database server** required

## What It Is NOT

- Production database (PostgreSQL, MongoDB, etc.)
- Persistent storage system
- Scalable or distributed database
- ACID compliant

## Files

- `db.json` - Optional JSON backup file for development persistence
- Database logic is implemented in `src/db.ts` and `src/db-factory.ts`

## Usage

The database automatically initializes when the server starts. Each session gets its own isolated data space, making it perfect for demonstrating multi-tenant capabilities without real database infrastructure.

**Optional:** When `STORAGE=prisma`, User and Job data are stored in PostgreSQL via Prisma instead of in-memory. Session-scoped CMS data remains in-memory. See the main [README.md](../README.md) for configuration.
