---
id: index
title: CLI Usage & Commands
slug: /usage
---

# CLI Usage & Commands

The PutmeIn engine is controlled and managed through the global `ray` command line interface.

---

## Command Reference Summary

| Command | Description |
|---|---|
| `ray` or `ray start` | Starts Ray and Brain in background mode via PM2 and outputs active dashboard URLs. |
| `ray stop` | Gracefully stops the running background services. |
| `ray restart` | Reboots all services with refreshed environment state. |
| `ray status` | Displays process health, PIDs, memory usage, and port allocations. |
| `ray logs` | Streams live unified output logs from both Ray and Brain. |
| `ray starter` | Configures systemd / launchd automatic startup on system boot (`pm2 startup` & `pm2 save`). |
| `ray --no-startup` | Removes startup hooks and disables auto-boot daemonization. |
| `ray cohen` | Launches the interactive Cohen terminal TUI client. |
| `ray --help` | Shows the full command manual. |
| `ray --version` | Outputs current installed version. |

---

## Subpages

Explore the dedicated guides for command line usage:

* [**Command Reference**](/usage/commands) — Detailed explanations, parameters, and outputs for all CLI commands.
* [**Service Lifecycle**](/usage/lifecycle) — Managing daemon workers, health checks, logging, and automatic system startup.
