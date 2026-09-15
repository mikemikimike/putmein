---
id: commands
title: Command Reference
slug: /usage/commands
---

# Command Reference

Comprehensive reference manual for the PutmeIn `ray` command suite.

---

### `ray start`
Starts both Ray (frontend dashboard) and Brain (AI orchestration daemon) as managed background processes.

```bash
ray start
```

* Launches background processes through the local or global PM2 runtime.
* Automatically initializes the database connection and internal authentication secrets.
* Displays terminal banner with local and network URLs.

---

### `ray stop`
Terminates all running background workers gracefully.

```bash
ray stop
```

---

### `ray restart`
Refreshes the PM2 process table and restarts both services with updated environment variables:

```bash
ray restart
```

---

### `ray status`
Inspects running processes, process IDs (PIDs), CPU usage, memory consumption, and port availability:

```bash
ray status
```

---

### `ray logs`
Streams real-time combined output logs from both the Next.js web application and the Go backend:

```bash
ray logs
```

---

### `ray starter`
Configures the host operating system to launch PutmeIn automatically upon boot:

```bash
ray starter
```

* On **macOS**: Configures `launchd` service agents.
* On **Linux**: Configures `systemd` units.
* On **Windows**: Sets up Windows service wrappers.

---

### `ray --no-startup`
Disables automatic system startup:

```bash
ray --no-startup
```

---

### `ray cohen`
Launches Cohen, the high-performance terminal user interface (TUI):

```bash
ray cohen
```
