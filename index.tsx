#!/usr/bin/env node
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Text, Box, useApp, useInput } from 'ink';
import { spawn } from 'child_process';
import { handleCommand } from './src/commands.js';
import { getAIResponse } from './src/ai.js';
import {
  Session,
  SessionMessage,
  createSession,
  loadSession,
  saveSession,
  updateSession,
} from './src/sessions.js';
import { SessionPicker } from './src/SessionPicker.js';

const args        = process.argv.slice(2);
const OPEN_PICKER = args.includes('--session-picker');
const LOAD_ID     = args.find(a => a.startsWith('--session='))?.split('=')[1];

process.stdout.write('\x1Bc');

interface Message {
  id: string;
  role: 'welcome' | 'user' | 'assistant' | 'error' | 'command' | 'terminal' | 'system';
  content?: string;
  thinking?: string;
  component?: React.ReactNode;
}

const uid = () => Math.random().toString(36).slice(2);

const ASCII_ART = [
  '██████╗ ██╗   ██╗████████╗██████╗ ███████╗██╗   ██╗',
  '██╔══██╗██║   ██║╚══██╔══╝██╔══██╗██╔════╝██║   ██║',
  '██████╔╝██║   ██║   ██║   ██║  ██║█████╗  ██║   ██║',
  '██╔═══╝ ██║   ██║   ██║   ██║  ██║██╔══╝  ╚██╗ ██╔╝',
  '██║     ╚██████╔╝   ██║   ██████╔╝███████╗ ╚████╔╝ ',
  '╚═╝      ╚═════╝    ╚═╝   ╚═════╝ ╚══════╝  ╚═══╝  ',
];

const WelcomeMsg = () => (
  <Box flexDirection="column" alignItems="center" borderStyle="round" borderColor="green" paddingX={2} paddingY={1} marginBottom={1}>
    {ASCII_ART.map((line, i) => <Text key={i} color="green">{line}</Text>)}
    <Box marginTop={1}>
      <Text dimColor>DevOps is not a joke  ·  Powered by Ozias  ·  Type </Text>
      <Text color="cyan">/help</Text>
      <Text dimColor> to get started</Text>
    </Box>
  </Box>
);

const FRAMES  = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
const PHRASES = [
  'Ozias is reasoning',
  'Ozias is reasoning.',
  'Ozias is reasoning..',
  'Ozias is reasoning...',
];

const ThinkingLoader = () => {
  const [pi, setPi] = useState(0);
  const [fi, setFi] = useState(0);
  useEffect(() => {
    const p = setInterval(() => setPi(x => (x + 1) % PHRASES.length), 420);
    const f = setInterval(() => setFi(x => (x + 1) % FRAMES.length), 80);
    return () => { clearInterval(p); clearInterval(f); };
  }, []);
  return (
    <Box paddingLeft={2}>
      <Text color="magenta">{FRAMES[fi]} </Text>
      <Text color="yellow">{PHRASES[pi]}</Text>
    </Box>
  );
};

// ── Header ────────────────────────────────────────────────────────────────────
const Header: React.FC<{ sessionName: string; msgCount: number }> = ({ sessionName, msgCount }) => (
  <Box borderStyle="single" borderColor="cyan" paddingX={2} justifyContent="space-between">
    <Box>
      <Text bold color="cyan">⬡ PUTDEV</Text>
      <Text dimColor>  v0.2</Text>
    </Box>
    <Box>
      <Text dimColor>session: </Text>
      <Text color="white">{sessionName}</Text>
      <Text dimColor>  ·  {msgCount} msg{msgCount !== 1 ? 's' : ''}</Text>
    </Box>
    <Text dimColor>/help · /sessions · /new</Text>
  </Box>
);

// ── Footer — owns the useInput hook so input always works ─────────────────────
const Footer: React.FC<{
  query: string;
  loading: boolean;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}> = ({ query, loading, onChange, onSubmit }) => {
  useInput((input, key) => {
    if (loading) return;
    if (key.return)                      { onSubmit(query); return; }
    if (key.backspace || key.delete)     { onChange(query.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) { onChange(query + input); }
  });

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={loading ? 'gray' : 'cyan'} paddingX={1}>
        <Text bold color={loading ? 'gray' : 'cyan'}>❯ </Text>
        {query.length > 0
          ? <Text color="white">{query}</Text>
          : <Text dimColor>{loading ? 'Ozias is working…' : 'Ask Ozias something…'}</Text>}
      </Box>
      <Box paddingX={2}>
        <Text dimColor>
          {process.platform === 'darwin' ? '⌘' : 'Ctrl'}+Shift+Space open
          {'  ·  '}/sessions switch{'  ·  '}/new fresh{'  ·  '}/help commands
        </Text>
      </Box>
    </Box>
  );
};

const MsgRow: React.FC<{ msg: Message }> = ({ msg }) => {
  if (msg.role === 'welcome') return <WelcomeMsg />;
  if (msg.component)          return <Box marginBottom={1}>{msg.component}</Box>;
  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      {msg.thinking && (
        <Box borderStyle="classic" borderColor="gray" paddingX={1} marginLeft={2}>
          <Text italic color="gray" dimColor>Thought: {msg.thinking}</Text>
        </Box>
      )}
      {msg.role === 'user' && (
        <Box><Text bold color="cyan">❯ </Text><Text color="white">{msg.content}</Text></Box>
      )}
      {msg.role === 'assistant' && (
        <Box><Text color="green" bold>Ozias:  </Text><Text color="greenBright">{msg.content}</Text></Box>
      )}
      {msg.role === 'terminal' && (
        <Box borderStyle="round" borderColor="gray" paddingX={1} marginLeft={2} flexDirection="column">
          <Text dimColor bold>$ output</Text>
          <Text color="gray">{msg.content}</Text>
        </Box>
      )}
      {msg.role === 'system' && (
        <Box paddingLeft={2}><Text color="yellow" dimColor italic>ℹ &nbsp; {msg.content}</Text></Box>
      )}
      {msg.role === 'error' && (
        <Box paddingLeft={2}><Text color="red">✖ {msg.content}</Text></Box>
      )}
    </Box>
  );
};

const App = () => {
  const { exit } = useApp();

  const [query,       setQuery]   = useState('');
  const [loading,     setLoading] = useState(false);
  const [termStream,  setTerm]    = useState('');
  const [showPicker,  setPicker]  = useState(OPEN_PICKER);
  const [rows,        setRows]    = useState(process.stdout.rows || 24);

  const [session, setSession] = useState<Session>(() => {
    if (LOAD_ID) { const s = loadSession(LOAD_ID); if (s) return s; }
    return createSession();
  });

  const [history, setHistory] = useState<Message[]>(() => {
    if (LOAD_ID) {
      const s = loadSession(LOAD_ID);
      if (s?.messages.length) {
        return s.messages.map(m => ({ id: uid(), role: m.role as Message['role'], content: m.content, thinking: m.thinking }));
      }
    }
    return [{ id: 'welcome', role: 'welcome' as const }];
  });

  // Track terminal height for message windowing
  useEffect(() => {
    const onResize = () => setRows(process.stdout.rows || 24);
    process.stdout.on('resize', onResize);
    return () => { process.stdout.off('resize', onResize); };
  }, []);

  // Auto-save on history change
  useEffect(() => {
    const msgs: SessionMessage[] = history
      .filter(m => ['user','assistant','terminal'].includes(m.role) && m.content)
      .map(m => ({ role: m.role as SessionMessage['role'], content: m.content!, thinking: m.thinking, timestamp: new Date().toISOString() }));
    if (!msgs.length) return;
    const updated = updateSession(session, msgs);
    setSession(updated);
    saveSession(updated);
  }, [history]);

  // ── Command runner ────────────────────────────────────────────────────────────
  const runCommand = useCallback((command: string): Promise<string> => {
    return new Promise(resolve => {
      setTerm('');
      const isWin = process.platform === 'win32';
      const child = spawn(isWin ? 'powershell.exe' : '/bin/sh', isWin ? ['-Command', command] : ['-c', command], { shell: isWin });
      let out = '';
      const onData = (d: Buffer) => { out += d; setTerm(p => p + d); };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      child.on('close', () => resolve(out));
      child.on('error', e => resolve(`Failed: ${e.message}`));
    });
  }, []);

  // Use a ref for history inside the async submit to avoid stale closures
  const historyRef = useRef(history);
  historyRef.current = history;

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (value: string) => {
    const input = value.trim();
    if (!input || loading) return;

    const cmd = handleCommand(input);
    if (cmd.isCommand) {
      setQuery('');
      if (cmd.action === 'exit')     { exit(); return; }
      if (cmd.action === 'sessions') { setPicker(true); return; }
      if (cmd.action === 'clear')    { setHistory([{ id: 'welcome', role: 'welcome' }]); return; }
      if (cmd.action === 'new') {
        const fresh = createSession(); setSession(fresh);
        setHistory([{ id: 'welcome', role: 'welcome' }, { id: uid(), role: 'system', content: `New session: ${fresh.name}` }]);
        return;
      }
      if (cmd.action === 'rename') {
        const up = { ...session, name: cmd.name, updatedAt: new Date().toISOString() };
        setSession(up); saveSession(up);
        setHistory(h => [...h, { id: uid(), role: 'system', content: `Renamed to: "${cmd.name}"` }]);
        return;
      }
      if (cmd.action === 'component') {
        setHistory(h => [...h, { id: uid(), role: 'command', component: (cmd as any).component }]);
        return;
      }
    }

    setHistory(h => [...h, { id: uid(), role: 'user', content: input }]);
    setQuery('');
    setLoading(true);

    let currentInput = input;
    let isDone = false;
    let localHistory = [
      ...historyRef.current
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user'|'assistant', content: m.content || '' })),
      { role: 'user' as const, content: input },
    ];

    while (!isDone) {
      const res = await getAIResponse(currentInput, localHistory);
      if (res.error) {
        setHistory(h => [...h, { id: uid(), role: 'error', content: `AI error: ${res.error}` }]);
        break;
      }
      setHistory(h => [...h, { id: uid(), role: 'assistant', thinking: res.thinking, content: res.text }]);
      localHistory.push({ role: 'assistant', content: res.text });

      const match = res.text.match(/<exec>([\s\S]*?)<\/exec>/);
      if (match) {
        const out = await runCommand(match[1]);
        setTerm('');
        setHistory(h => [...h, { id: uid(), role: 'terminal', content: out }]);
        currentInput = `Command output:\n${out}`;
      } else {
        isDone = true;
      }
    }
    setLoading(false);
  }, [loading, session, exit, runCommand]);

  // ── Session picker handlers ───────────────────────────────────────────────────
  const handlePickSession = useCallback((picked: Session) => {
    setPicker(false);
    setSession(picked);
    setHistory([
      ...picked.messages.map(m => ({ id: uid(), role: m.role as Message['role'], content: m.content, thinking: m.thinking })),
      { id: uid(), role: 'system', content: `Switched to: "${picked.name}"` },
    ]);
  }, []);

  const handleNewSession = useCallback(() => {
    setPicker(false);
    const fresh = createSession(); setSession(fresh);
    setHistory([{ id: 'welcome', role: 'welcome' }, { id: uid(), role: 'system', content: `New session: ${fresh.name}` }]);
  }, []);

  // ── How many messages to show based on terminal height ────────────────────────
  // Header ~3, footer ~3, loader ~1, terminal stream ~3 = ~10 rows overhead
  const overhead   = 10 + (loading ? 1 : 0) + (termStream ? 3 : 0);
  const avail      = Math.max(4, rows - overhead);
  const maxVisible = Math.max(3, Math.floor(avail / 2));
  const visible    = history.slice(-maxVisible);

  // ── Session picker overlay ────────────────────────────────────────────────────
  if (showPicker) {
    return (
      <Box flexDirection="column" paddingY={1} paddingX={2}>
        <SessionPicker
          onSelect={handlePickSession}
          onNew={handleNewSession}
          onCancel={() => setPicker(false)}
          currentSessionId={session.id}
        />
      </Box>
    );
  }

  const msgCount = history.filter(m => m.role === 'user').length;

  return (
    <Box flexDirection="column">

      {/* Fixed top navbar */}
      <Header sessionName={session.name} msgCount={msgCount} />

      {/* Scrolling message area — older messages naturally scroll off as window fills */}
      <Box flexDirection="column" flexGrow={1}>
        {visible.map(msg => <MsgRow key={msg.id} msg={msg} />)}
      </Box>

      {/* Live terminal stream while a command runs */}
      {termStream ? (
        <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column" marginX={1}>
          <Text dimColor bold>$ live</Text>
          <Text color="gray">{termStream}</Text>
        </Box>
      ) : null}

      {loading && <ThinkingLoader />}

      {/* Fixed bottom footer — input lives here */}
      <Footer
        query={query}
        loading={loading}
        onChange={setQuery}
        onSubmit={handleSubmit}
      />

    </Box>
  );
};

render(<App />);