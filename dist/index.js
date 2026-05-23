#!/usr/bin/env node
import {
  getAIResponse
} from "./chunk-CXO5WFPN.js";
import {
  handleCommand
} from "./chunk-36FLJDVA.js";
import {
  SessionPicker
} from "./chunk-DZXB24AU.js";
import {
  createSession,
  loadSession,
  saveSession,
  updateSession
} from "./chunk-T2VMBNCG.js";

// index.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Text, Box, useApp, useInput } from "ink";
import { spawn } from "child_process";
var args = process.argv.slice(2);
var OPEN_PICKER = args.includes("--session-picker");
var _a;
var LOAD_ID = (_a = args.find((a) => a.startsWith("--session="))) == null ? void 0 : _a.split("=")[1];
process.stdout.write("\x1Bc");
var uid = () => Math.random().toString(36).slice(2);
var ASCII_ART = [
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557   \u2588\u2588\u2557",
  "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2551   \u2588\u2588\u2551",
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551   \u2588\u2588\u2551",
  "\u2588\u2588\u2554\u2550\u2550\u2550\u255D \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u255A\u2588\u2588\u2557 \u2588\u2588\u2554\u255D",
  "\u2588\u2588\u2551     \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D   \u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u255A\u2588\u2588\u2588\u2588\u2554\u255D ",
  "\u255A\u2550\u255D      \u255A\u2550\u2550\u2550\u2550\u2550\u255D    \u255A\u2550\u255D   \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u255D  "
];
var WelcomeMsg = () => /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", alignItems: "center", borderStyle: "round", borderColor: "green", paddingX: 2, paddingY: 1, marginBottom: 1 }, ASCII_ART.map((line, i) => /* @__PURE__ */ React.createElement(Text, { key: i, color: "green" }, line)), /* @__PURE__ */ React.createElement(Box, { marginTop: 1 }, /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "DevOps is not a joke  \xB7  Powered by Ozias  \xB7  Type "), /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, "/help"), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, " to get started")));
var FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
var PHRASES = [
  "Ozias is reasoning",
  "Ozias is reasoning.",
  "Ozias is reasoning..",
  "Ozias is reasoning..."
];
var ThinkingLoader = () => {
  const [pi, setPi] = useState(0);
  const [fi, setFi] = useState(0);
  useEffect(() => {
    const p = setInterval(() => setPi((x) => (x + 1) % PHRASES.length), 420);
    const f = setInterval(() => setFi((x) => (x + 1) % FRAMES.length), 80);
    return () => {
      clearInterval(p);
      clearInterval(f);
    };
  }, []);
  return /* @__PURE__ */ React.createElement(Box, { paddingLeft: 2 }, /* @__PURE__ */ React.createElement(Text, { color: "magenta" }, FRAMES[fi], " "), /* @__PURE__ */ React.createElement(Text, { color: "yellow" }, PHRASES[pi]));
};
var Header = ({ sessionName, msgCount }) => /* @__PURE__ */ React.createElement(Box, { borderStyle: "single", borderColor: "cyan", paddingX: 2, justifyContent: "space-between" }, /* @__PURE__ */ React.createElement(Box, null, /* @__PURE__ */ React.createElement(Text, { bold: true, color: "cyan" }, "\u2B21 PUTDEV"), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "  v0.2")), /* @__PURE__ */ React.createElement(Box, null, /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "session: "), /* @__PURE__ */ React.createElement(Text, { color: "white" }, sessionName), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "  \xB7  ", msgCount, " msg", msgCount !== 1 ? "s" : "")), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "/help \xB7 /sessions \xB7 /new"));
var Footer = ({ query, loading, onChange, onSubmit }) => {
  useInput((input, key) => {
    if (loading) return;
    if (key.return) {
      onSubmit(query);
      return;
    }
    if (key.backspace || key.delete) {
      onChange(query.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      onChange(query + input);
    }
  });
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column" }, /* @__PURE__ */ React.createElement(Box, { borderStyle: "round", borderColor: loading ? "gray" : "cyan", paddingX: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true, color: loading ? "gray" : "cyan" }, "\u276F "), query.length > 0 ? /* @__PURE__ */ React.createElement(Text, { color: "white" }, query) : /* @__PURE__ */ React.createElement(Text, { dimColor: true }, loading ? "Ozias is working\u2026" : "Ask Ozias something\u2026")), /* @__PURE__ */ React.createElement(Box, { paddingX: 2 }, /* @__PURE__ */ React.createElement(Text, { dimColor: true }, process.platform === "darwin" ? "\u2318" : "Ctrl", "+Shift+Space open", "  \xB7  ", "/sessions switch", "  \xB7  ", "/new fresh", "  \xB7  ", "/help commands")));
};
var MsgRow = ({ msg }) => {
  if (msg.role === "welcome") return /* @__PURE__ */ React.createElement(WelcomeMsg, null);
  if (msg.component) return /* @__PURE__ */ React.createElement(Box, { marginBottom: 1 }, msg.component);
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", marginBottom: 1, paddingLeft: 1 }, msg.thinking && /* @__PURE__ */ React.createElement(Box, { borderStyle: "classic", borderColor: "gray", paddingX: 1, marginLeft: 2 }, /* @__PURE__ */ React.createElement(Text, { italic: true, color: "gray", dimColor: true }, "Thought: ", msg.thinking)), msg.role === "user" && /* @__PURE__ */ React.createElement(Box, null, /* @__PURE__ */ React.createElement(Text, { bold: true, color: "cyan" }, "\u276F "), /* @__PURE__ */ React.createElement(Text, { color: "white" }, msg.content)), msg.role === "assistant" && /* @__PURE__ */ React.createElement(Box, null, /* @__PURE__ */ React.createElement(Text, { color: "green", bold: true }, "Ozias:  "), /* @__PURE__ */ React.createElement(Text, { color: "greenBright" }, msg.content)), msg.role === "terminal" && /* @__PURE__ */ React.createElement(Box, { borderStyle: "round", borderColor: "gray", paddingX: 1, marginLeft: 2, flexDirection: "column" }, /* @__PURE__ */ React.createElement(Text, { dimColor: true, bold: true }, "$ output"), /* @__PURE__ */ React.createElement(Text, { color: "gray" }, msg.content)), msg.role === "system" && /* @__PURE__ */ React.createElement(Box, { paddingLeft: 2 }, /* @__PURE__ */ React.createElement(Text, { color: "yellow", dimColor: true, italic: true }, "\u2139 \xA0 ", msg.content)), msg.role === "error" && /* @__PURE__ */ React.createElement(Box, { paddingLeft: 2 }, /* @__PURE__ */ React.createElement(Text, { color: "red" }, "\u2716 ", msg.content)));
};
var App = () => {
  const { exit } = useApp();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [termStream, setTerm] = useState("");
  const [showPicker, setPicker] = useState(OPEN_PICKER);
  const [rows, setRows] = useState(process.stdout.rows || 24);
  const [session, setSession] = useState(() => {
    if (LOAD_ID) {
      const s = loadSession(LOAD_ID);
      if (s) return s;
    }
    return createSession();
  });
  const [history, setHistory] = useState(() => {
    if (LOAD_ID) {
      const s = loadSession(LOAD_ID);
      if (s == null ? void 0 : s.messages.length) {
        return s.messages.map((m) => ({ id: uid(), role: m.role, content: m.content, thinking: m.thinking }));
      }
    }
    return [{ id: "welcome", role: "welcome" }];
  });
  useEffect(() => {
    const onResize = () => setRows(process.stdout.rows || 24);
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);
  useEffect(() => {
    const msgs = history.filter((m) => ["user", "assistant", "terminal"].includes(m.role) && m.content).map((m) => ({ role: m.role, content: m.content, thinking: m.thinking, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
    if (!msgs.length) return;
    const updated = updateSession(session, msgs);
    setSession(updated);
    saveSession(updated);
  }, [history]);
  const runCommand = useCallback((command) => {
    return new Promise((resolve) => {
      setTerm("");
      const isWin = process.platform === "win32";
      const child = spawn(isWin ? "powershell.exe" : "/bin/sh", isWin ? ["-Command", command] : ["-c", command], { shell: isWin });
      let out = "";
      const onData = (d) => {
        out += d;
        setTerm((p) => p + d);
      };
      child.stdout.on("data", onData);
      child.stderr.on("data", onData);
      child.on("close", () => resolve(out));
      child.on("error", (e) => resolve(`Failed: ${e.message}`));
    });
  }, []);
  const historyRef = useRef(history);
  historyRef.current = history;
  const handleSubmit = useCallback(async (value) => {
    const input = value.trim();
    if (!input || loading) return;
    const cmd = handleCommand(input);
    if (cmd.isCommand) {
      setQuery("");
      if (cmd.action === "exit") {
        exit();
        return;
      }
      if (cmd.action === "sessions") {
        setPicker(true);
        return;
      }
      if (cmd.action === "clear") {
        setHistory([{ id: "welcome", role: "welcome" }]);
        return;
      }
      if (cmd.action === "new") {
        const fresh = createSession();
        setSession(fresh);
        setHistory([{ id: "welcome", role: "welcome" }, { id: uid(), role: "system", content: `New session: ${fresh.name}` }]);
        return;
      }
      if (cmd.action === "rename") {
        const up = { ...session, name: cmd.name, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
        setSession(up);
        saveSession(up);
        setHistory((h) => [...h, { id: uid(), role: "system", content: `Renamed to: "${cmd.name}"` }]);
        return;
      }
      if (cmd.action === "component") {
        setHistory((h) => [...h, { id: uid(), role: "command", component: cmd.component }]);
        return;
      }
    }
    setHistory((h) => [...h, { id: uid(), role: "user", content: input }]);
    setQuery("");
    setLoading(true);
    let currentInput = input;
    let isDone = false;
    let localHistory = [
      ...historyRef.current.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content || "" })),
      { role: "user", content: input }
    ];
    while (!isDone) {
      const res = await getAIResponse(currentInput, localHistory);
      if (res.error) {
        setHistory((h) => [...h, { id: uid(), role: "error", content: `AI error: ${res.error}` }]);
        break;
      }
      setHistory((h) => [...h, { id: uid(), role: "assistant", thinking: res.thinking, content: res.text }]);
      localHistory.push({ role: "assistant", content: res.text });
      const match = res.text.match(/<exec>([\s\S]*?)<\/exec>/);
      if (match) {
        const out = await runCommand(match[1]);
        setTerm("");
        setHistory((h) => [...h, { id: uid(), role: "terminal", content: out }]);
        currentInput = `Command output:
${out}`;
      } else {
        isDone = true;
      }
    }
    setLoading(false);
  }, [loading, session, exit, runCommand]);
  const handlePickSession = useCallback((picked) => {
    setPicker(false);
    setSession(picked);
    setHistory([
      ...picked.messages.map((m) => ({ id: uid(), role: m.role, content: m.content, thinking: m.thinking })),
      { id: uid(), role: "system", content: `Switched to: "${picked.name}"` }
    ]);
  }, []);
  const handleNewSession = useCallback(() => {
    setPicker(false);
    const fresh = createSession();
    setSession(fresh);
    setHistory([{ id: "welcome", role: "welcome" }, { id: uid(), role: "system", content: `New session: ${fresh.name}` }]);
  }, []);
  const overhead = 10 + (loading ? 1 : 0) + (termStream ? 3 : 0);
  const avail = Math.max(4, rows - overhead);
  const maxVisible = Math.max(3, Math.floor(avail / 2));
  const visible = history.slice(-maxVisible);
  if (showPicker) {
    return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", paddingY: 1, paddingX: 2 }, /* @__PURE__ */ React.createElement(
      SessionPicker,
      {
        onSelect: handlePickSession,
        onNew: handleNewSession,
        onCancel: () => setPicker(false),
        currentSessionId: session.id
      }
    ));
  }
  const msgCount = history.filter((m) => m.role === "user").length;
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column" }, /* @__PURE__ */ React.createElement(Header, { sessionName: session.name, msgCount }), /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", flexGrow: 1 }, visible.map((msg) => /* @__PURE__ */ React.createElement(MsgRow, { key: msg.id, msg }))), termStream ? /* @__PURE__ */ React.createElement(Box, { borderStyle: "round", borderColor: "gray", paddingX: 1, flexDirection: "column", marginX: 1 }, /* @__PURE__ */ React.createElement(Text, { dimColor: true, bold: true }, "$ live"), /* @__PURE__ */ React.createElement(Text, { color: "gray" }, termStream)) : null, loading && /* @__PURE__ */ React.createElement(ThinkingLoader, null), /* @__PURE__ */ React.createElement(
    Footer,
    {
      query,
      loading,
      onChange: setQuery,
      onSubmit: handleSubmit
    }
  ));
};
render(/* @__PURE__ */ React.createElement(App, null));
