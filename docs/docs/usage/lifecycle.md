---
id: lifecycle
title: Service Lifecycle
slug: /usage/lifecycle
---

# Service Lifecycle

PutmeIn utilizes a managed background process model to guarantee high availability, self-healing, and low resource overhead.

---

## Process Architecture

PutmeIn coordinates two primary background processes:

```
                  ┌────────────────────────┐
                  │    PM2 Process Mgr     │
                  └───────────┬────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
     ┌──────────────────┐          ┌──────────────────┐
     │   putmein-ray    │          │  putmein-brain   │
     │ (Next.js Console)│          │  (Go AI Daemon)  │
     │    Port: 4567    │          │    Port: 4500    │
     └──────────────────┘          └──────────────────┘
```

* **Health Monitoring**: PM2 monitors process status continuously. If a worker terminates unexpectedly, it is restarted automatically.
* **Log Rotation**: Stdout and stderr logs are aggregated in `~/.pm2/logs/` and streamable via `ray logs`.

---

## Managing the Service Lifecycle

### Starting the Daemon
```bash
ray start
```

### Inspecting Running Workers
```bash
ray status
```

### Clean Termination
```bash
ray stop
```

---

## Automatic System Boot (Autostart)

To enable automatic startup across system reboots:

```bash
ray starter
```

This runs `pm2 startup` for your current user account and saves the active process list (`pm2 save`). To reverse this and disable automatic boot launch:

```bash
ray --no-startup
```
