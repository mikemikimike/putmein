// src/sessions.tsx
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
var SESSIONS_DIR = path.join(os.homedir(), ".putdev", "sessions");
var ensureSessionsDir = () => {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
};
var listSessions = () => {
  ensureSessionsDir();
  try {
    return fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json")).map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), "utf-8"));
      } catch {
        return null;
      }
    }).filter((s) => s !== null).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
};
var saveSession = (session) => {
  ensureSessionsDir();
  fs.writeFileSync(
    path.join(SESSIONS_DIR, `${session.id}.json`),
    JSON.stringify(session, null, 2),
    "utf-8"
  );
};
var loadSession = (id) => {
  const p = path.join(SESSIONS_DIR, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
};
var createSession = (name) => ({
  id: randomUUID(),
  name: name || `Session \u2014 ${(/* @__PURE__ */ new Date()).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })}`,
  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
  updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
  messages: []
});
var updateSession = (session, messages) => ({
  ...session,
  messages,
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
});
var deleteSession = (id) => {
  const p = path.join(SESSIONS_DIR, `${id}.json`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
};
var renameSession = (id, name) => {
  const session = loadSession(id);
  if (!session) return null;
  const updated = { ...session, name, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  saveSession(updated);
  return updated;
};
var getSessionSummary = (session) => {
  const first = session.messages.find((m) => m.role === "user");
  if (!first) return "Empty session";
  return first.content.length > 60 ? first.content.slice(0, 57) + "\u2026" : first.content;
};

export {
  SESSIONS_DIR,
  ensureSessionsDir,
  listSessions,
  saveSession,
  loadSession,
  createSession,
  updateSession,
  deleteSession,
  renameSession,
  getSessionSummary
};
