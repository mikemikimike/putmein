# PutmeIn (`putmein`)

> **Autonomous DevOps, Infrastructure Monitoring & Deployment Engine powered by Ray & Brain.**

[![npm version](https://img.shields.io/npm/v/putmein.svg)](https://www.npmjs.com/package/putmein)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

PutmeIn combines **Ray** (an interactive Next.js web console and management dashboard) with **Brain** (a high-performance Go AI background daemon and Docker orchestrator) into a unified, daemonized system manager.

---

## ⚡ Quick Start

### Option 1: Automatic One-Line Installation (Recommended)
```bash
# Linux / macOS / WSL
curl -fsSL https://get.putme.in | bash
```

```powershell
# Windows (PowerShell)
irm https://get.putme.in/ps1 | iex
```

### Option 2: Global NPM Installation
```bash
npm install -g putmein
```

Once installed, simply run:
```bash
ray
```

PutmeIn will start as a resilient background daemon via PM2 and display your local and network dashboard URLs:
* **Web Dashboard (Ray):** [http://localhost:4567](http://localhost:4567)
* **API Engine (Brain):** [http://localhost:4500](http://localhost:4500)

---

## 🛠️ CLI Usage & Commands

PutmeIn exposes the `ray` command globally:

| Command | Description |
|---|---|
| `ray` or `ray start` | Starts Ray and Brain in the background via PM2 and displays dashboard URLs. |
| `ray stop` | Gracefully stops the running background services. |
| `ray restart` | Restarts all services with fresh state. |
| `ray status` | Inspects running processes, PIDs, CPU usage, memory consumption, and port status. |
| `ray logs` | Streams live unified output logs from both Ray and Brain. |
| `ray starter` | Configures PutmeIn to start automatically on system boot (`pm2 startup` & `pm2 save`). |
| `ray --no-startup` | Disables automatic startup on system boot. |
| `ray cohen` | Launches the interactive terminal TUI client. |
| `ray --help` | Displays help menu and command list. |
| `ray --version` | Prints current installed version. |

---

## ⚙️ Configuration

PutmeIn reads runtime configurations from `~/.putmein/.env` or environment variables:

| Variable | Default | Description |
|---|---|---|
| `RAY_PORT` | `4567` | Port for the Ray web dashboard. |
| `BRAIN_PORT` | `4500` | Port for the Brain AI backend engine. |
| `DATABASE_URL` | — | MySQL / MariaDB connection string. |
| `BRAIN_INTERNAL_SECRET` | auto-generated | Secret token for secure Brain <-> Ray communication. |
| `AGENT_AUTONOMOUS` | `false` | Enable or disable autonomous DevOps action mode. |

---

## 🏗️ Building From Source

```bash
# Clone the repository
git clone https://github.com/putmein/putmein.git
cd putmein

# Install dependencies and build standalone distribution
npm run build

# Start services locally
npm start
```

---

## 📄 License

ISC © [Putme.in](https://putme.in)
