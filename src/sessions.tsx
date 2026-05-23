import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

export const SESSIONS_DIR = path.join(os.homedir(), '.putdev', 'sessions');

export interface SessionMessage {
  role: 'user' | 'assistant' | 'terminal';
  content: string;
  thinking?: string;
  timestamp: string;
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: SessionMessage[];
}

export const ensureSessionsDir = (): void => {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
};

export const listSessions = (): Session[] => {
  ensureSessionsDir();
  try {
    return fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8')) as Session;
        } catch { return null; }
      })
      .filter((s): s is Session => s !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch { return []; }
};

export const saveSession = (session: Session): void => {
  ensureSessionsDir();
  fs.writeFileSync(
    path.join(SESSIONS_DIR, `${session.id}.json`),
    JSON.stringify(session, null, 2),
    'utf-8'
  );
};

export const loadSession = (id: string): Session | null => {
  const p = path.join(SESSIONS_DIR, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return null; }
};

export const createSession = (name?: string): Session => ({
  id: randomUUID(),
  name: name || `Session — ${new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [],
});

export const updateSession = (session: Session, messages: SessionMessage[]): Session => ({
  ...session,
  messages,
  updatedAt: new Date().toISOString(),
});

export const deleteSession = (id: string): void => {
  const p = path.join(SESSIONS_DIR, `${id}.json`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
};

export const renameSession = (id: string, name: string): Session | null => {
  const session = loadSession(id);
  if (!session) return null;
  const updated = { ...session, name, updatedAt: new Date().toISOString() };
  saveSession(updated);
  return updated;
};

export const getSessionSummary = (session: Session): string => {
  const first = session.messages.find(m => m.role === 'user');
  if (!first) return 'Empty session';
  return first.content.length > 60
    ? first.content.slice(0, 57) + '…'
    : first.content;
};