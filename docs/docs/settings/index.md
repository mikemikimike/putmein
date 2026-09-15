---
id: index
title: Settings & Configuration
slug: /settings
---

# Settings & Configuration

PutmeIn provides flexible configuration through environment variables, project-level `.env` files, and global configuration profiles.

---

## Configuration Precedence

When initializing services, PutmeIn reads configurations according to the following priority hierarchy:

1. **Active Shell Environment**: Explicitly exported environment variables (`export KEY=val`).
2. **Project Local `.env`**: Configuration placed in `ray/.env` or `.env` in the repository root.
3. **Global Profile**: User-level configuration at `~/.putmein/.env`.
4. **Internal Defaults**: Safe system fallback defaults.

---

## Subpages

Explore specific configuration topics:

* [**Environment Variables**](/settings/environment-variables) — Exhaustive reference of supported environment variables, types, and defaults.
* [**Configuration Files**](/settings/config-file) — Guidance on the `~/.putmein/.env` global profile location and sample templates.
