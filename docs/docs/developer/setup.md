---
id: setup
title: Setting up the Project
slug: /developer/setup
---

# Setting up the Project

This guide walks you through establishing a clean local development environment for PutmeIn.

---

## Step 1: Clone the Repository

Clone the project from GitHub and switch into the workspace directory:

```bash
git clone https://github.com/putme-in/putmein.git
cd putmein
```

---

## Step 2: Install Dependencies

Install root-level coordination tools and build scripts:

```bash
npm install
```

To work directly on a specific subproject (such as `ray` or `docs`), install dependencies within that subfolder:

```bash
# Example: working on the Ray web console
cd ray
npm install
cd ..
```

---

## Step 3: Environment Configuration

PutmeIn resolves configurations in priority order:
1. Local project `.env` files (e.g. `ray/.env`)
2. Repository root `.env`
3. Global user configuration (`~/.putmein/.env`)

Create a local `.env` if you need custom port assignments or database parameters:

```bash
cp .env.example .env
```

Key environment configurations:
* `DATABASE_URL`: Connection string for the MySQL / MariaDB database.
* `RAY_PORT`: Port for the Ray web console (default: `4567` for daemon, `3000` for dev).
* `BRAIN_PORT`: Port for the Brain AI daemon (default: `4500` for daemon, `3100` for dev).
* `JWT_SECRET`: Secret key used for session token signing.

---

## Step 4: Compiling & Building

To compile all services and create the standalone production distribution:

```bash
npm run build
```

The build process:
* Compiles the Go backend for Brain.
* Generates Prisma client bindings.
* Builds the Next.js standalone application for Ray.
* Verifies directory structure and sanitizes build output.

---

## Step 5: Launching Services Locally

### Option A: Running with PM2 (Daemon Mode)

To start the integrated daemon workers locally:

```bash
npm start
```

Inspect process health and resource consumption:
```bash
node bin/ray.js status
```

Stop background processes:
```bash
node bin/ray.js stop
```

### Option B: Running Individual Services (Development Mode)

If you are developing features for an isolated component:

```bash
# Run Ray frontend with hot reload
cd ray
npm run dev

# Run Brain backend
cd brain
go run .
```
