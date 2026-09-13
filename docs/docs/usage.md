---
id: usage
title: CLI Usage & Commands
slug: /usage
---

# CLI Usage & Commands

The PutmeIn engine is managed through the global `ray` command line interface.

## Command Reference

| Command | Description |
|---|---|
| `ray` or `ray start` | Starts Ray and Brain in background mode via PM2 and displays active dashboard URLs. |
| `ray stop` | Gracefully terminates background services. |
| `ray restart` | Reboots all services with a refreshed state. |
| `ray status` | Displays process health, PIDs, memory usage, and port allocations. |
| `ray logs` | Streams live unified output logs from both Ray and Brain. |
| `ray starter` | Configures systemd / launchd automatic startup on system boot (`pm2 startup` & `pm2 save`). |
| `ray --no-startup` | Removes startup hooks and disables auto-boot daemonization. |
| `ray cohen` | Launches the interactive Cohen terminal TUI client. |
| `ray --help` | Shows the full command manual. |
| `ray --version` | Outputs current installed version. |

---

## Process Lifecycle Management

### Starting Services
```bash
ray start
```

Starts background daemon workers and outputs network access URLs:
```text
✔ PutmeIn daemon active
  ➜ Local Dashboard:    http://localhost:4567
  ➜ Network Dashboard:  http://192.168.1.100:4567
  ➜ Brain Engine API:   http://localhost:4500
```

### Checking Status
```bash
ray status
```

### Inspecting Logs
To stream live console logs in real time:
```bash
ray logs
```
