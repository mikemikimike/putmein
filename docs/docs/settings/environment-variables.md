---
id: environment-variables
title: Environment Variables
slug: /settings/environment-variables
---

# Environment Variables

PutmeIn reads runtime variables across Ray (web console) and Brain (AI orchestration daemon).

---

## Core Variables

| Variable | Default | Description | Required |
|---|---|---|---|
| `DATABASE_URL` | — | Connection string for MySQL / MariaDB (e.g. `mysql://user:pass@host:3306/db`). | Yes |
| `JWT_SECRET` | *auto-fallback* | Secret key for signing and verifying user authentication sessions. | Recommended |
| `RAY_PORT` | `4567` | Port used by the Ray web console in daemon mode (`3000` in dev). | Optional |
| `BRAIN_PORT` | `4500` | Port used by the Brain AI engine API (`3100` in dev). | Optional |
| `BRAIN_INTERNAL_SECRET` | *auto-generated* | Cryptographic token for secure Ray ↔ Brain inter-service RPC. | Optional |
| `AGENT_AUTONOMOUS` | `false` | Enable or disable autonomous DevOps action mode. | Optional |

---

## Database Connection String

For MySQL 8.0+ databases, PutmeIn supports standard URI schemas:

```bash
DATABASE_URL="mysql://root:secret@127.0.0.1:3306/putmein?allowPublicKeyRetrieval=true"
```

:::tip Connection Resilience
When connecting to MySQL instances where the public key retrieval handshake is required, append `?allowPublicKeyRetrieval=true` to the URL.
:::
