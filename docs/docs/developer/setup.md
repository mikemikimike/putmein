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

## Step 3: Local Database Setup

PutmeIn requires a MySQL 8.0+ (or MariaDB) database for the Ray web dashboard, session authentication, and infrastructure metrics.

### Option A: Running via Docker (Recommended)

Running MySQL in an isolated Docker container is the fastest approach and requires zero host configuration:

```bash
docker run -d \
  --name putmein-mysql \
  --restart unless-stopped \
  -p 127.0.0.1:3306:3306 \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=putmein \
  -v putmein_mysql_data:/var/lib/mysql \
  mysql:8.0 --default-authentication-plugin=mysql_native_password
```

:::tip Connection Resilience
* **Use `127.0.0.1` instead of `localhost`**: Using IPv4 loopback (`127.0.0.1`) prevents connection timeouts caused by OS-level IPv6 (`::1`) resolution.
* **Authentication Plugin**: MySQL 8.0 defaults to `caching_sha2_password`. Passing `--default-authentication-plugin=mysql_native_password` ensures seamless driver compatibility with Prisma and MariaDB connectors.
* **Data Persistence**: The named volume `putmein_mysql_data` preserves your local records across container restarts and updates.
:::

### Option B: Running a Native MySQL Service

If you prefer using a native database server installed on your machine:

* **macOS (Homebrew)**:
  ```bash
  brew install mysql
  brew services start mysql
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS putmein;"
  ```
* **Linux (Ubuntu / Debian)**:
  ```bash
  sudo apt update && sudo apt install -y mysql-server
  sudo systemctl start mysql
  sudo mysql -e "CREATE DATABASE IF NOT EXISTS putmein;"
  ```
* **Windows**:
  Download and install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) or use Docker Desktop.

---

### Initializing Database Tables

Once the database server is running and accepting connections on port `3306`, apply the schema:

#### Method 1: Using Prisma (Recommended)
Sync the Prisma schema directly to your local database:

```bash
cd ray
npx prisma db push
cd ..
```

#### Method 2: Using the SQL Initialization Script
Alternatively, apply the idempotent SQL initialization schema included in the repository:

```bash
# When running via Docker:
docker exec -i putmein-mysql mysql -uroot -psecret putmein < bin/init-db.sql

# When running native MySQL:
mysql -h 127.0.0.1 -u root -p putmein < bin/init-db.sql
```

---

## Step 4: Environment Configuration

PutmeIn resolves configurations in priority order:
1. Local project `.env` files (e.g. `ray/.env`)
2. Repository root `.env`
3. Global user configuration (`~/.putmein/.env`)

Copy the template environment file to configure your local parameters:

```bash
cp .env.example .env
```

Ensure your `DATABASE_URL` matches your local database credentials:
```bash
DATABASE_URL="mysql://root:secret@127.0.0.1:3306/putmein?allowPublicKeyRetrieval=true"
```

Key environment configurations:
* `DATABASE_URL`: Connection string for MySQL (includes `allowPublicKeyRetrieval=true`).
* `JWT_SECRET`: Cryptographically secure 256-bit key for session token signing.
* `RAY_PORT`: Port for the Ray web console (default: `4567` for daemon, `3000` for dev).
* `BRAIN_PORT`: Port for the Brain AI daemon (default: `4500` for daemon, `3100` for dev).
* `BRAIN_INTERNAL_SECRET`: Shared secret for Ray ↔ Brain inter-service communication.

---

## Step 5: Compiling & Building

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

## Step 6: Launching Services Locally

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
