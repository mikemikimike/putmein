---
id: troubleshooting
title: Troubleshooting
slug: /troubleshooting
---

# Troubleshooting Guide

Common issues and solutions when running PutmeIn.

## Port Conflicts

### Error: Port 4567 or 4500 is already in use
If another process is using port 4567 (Ray) or 4500 (Brain), you can override the ports via environment variables:

```bash
RAY_PORT=4568 BRAIN_PORT=4501 ray start
```

Or edit `~/.putmein/.env`:
```env
RAY_PORT=4568
BRAIN_PORT=4501
```

---

## Daemon Health & PM2 Reset

If background services become unresponsive or enter an error loop:

```bash
# Gracefully stop processes
ray stop

# Restart services fresh
ray restart

# Inspect live error logs
ray logs
```

---

## Permission Errors on Startup
If `ray starter` fails due to insufficient system permissions when configuring auto-boot:
```bash
sudo env PATH=$PATH:$(which ray) ray starter
```
