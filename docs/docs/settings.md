---
id: settings
title: Settings & Configuration
slug: /settings
---

# Settings & Configuration

PutmeIn reads runtime configurations from environment variables or from `~/.putmein/.env`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RAY_PORT` | `4567` | Port for the Ray web dashboard. |
| `BRAIN_PORT` | `4500` | Port for the Brain background engine. |
| `DATABASE_URL` | — | Database connection string (MySQL / MariaDB / SQLite). |
| `BRAIN_INTERNAL_SECRET` | *auto-generated* | Secret token for secure Brain ↔ Ray communication. |
| `AGENT_AUTONOMOUS` | `false` | Enable or disable autonomous DevOps action mode. |

---

## Configuration File Location

The local configuration file is stored in your home directory:

```bash
~/.putmein/.env
```

Example `.env` configuration:

```env
RAY_PORT=4567
BRAIN_PORT=4500
DATABASE_URL=mysql://root:password@127.0.0.1:3306/putmein
AGENT_AUTONOMOUS=true
```
