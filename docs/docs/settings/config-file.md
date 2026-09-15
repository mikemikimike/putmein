---
id: config-file
title: Configuration Files
slug: /settings/config-file
---

# Configuration Files

PutmeIn provides an integrated configuration file profile to simplify daemon execution across machines.

---

## Default Configuration File Location

The global configuration profile is located in the user's home directory:

```bash
# macOS / Linux
~/.putmein/.env

# Windows
%USERPROFILE%\.putmein\.env
```

---

## Example Configuration

Below is a standard reference `.env` configuration:

```ini
# Core Database Connection
DATABASE_URL="mysql://root:password@127.0.0.1:3306/putmein?allowPublicKeyRetrieval=true"

# Service Ports
RAY_PORT=4567
BRAIN_PORT=4500

# Security Credentials
JWT_SECRET="your-secure-random-jwt-secret-here"
BRAIN_INTERNAL_SECRET="your-internal-rpc-secret-here"

# Autonomous Mode
AGENT_AUTONOMOUS=false
```

---

## Applying Updates

When modifying configuration files:

```bash
# Restart background daemons to reload environment variables
ray restart
```
