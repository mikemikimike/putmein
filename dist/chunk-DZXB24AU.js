import {
  getSessionSummary,
  listSessions
} from "./chunk-T2VMBNCG.js";

// src/SessionPicker.tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
var formatDate = (iso) => {
  const d = new Date(iso);
  const now = /* @__PURE__ */ new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 6e4);
  const hrs = Math.floor(diff / 36e5);
  const days = Math.floor(diff / 864e5);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
var SessionPicker = ({
  onSelect,
  onNew,
  onCancel,
  currentSessionId
}) => {
  const sessions = listSessions();
  const total = sessions.length + 1;
  const [cursor, setCursor] = useState(0);
  useInput((input, key) => {
    if (key.upArrow) setCursor((c) => (c - 1 + total) % total);
    if (key.downArrow) setCursor((c) => (c + 1) % total);
    if (key.return) {
      if (cursor === 0) onNew();
      else onSelect(sessions[cursor - 1]);
    }
    if (key.escape || input === "q") onCancel();
  });
  return /* @__PURE__ */ React.createElement(
    Box,
    {
      flexDirection: "column",
      borderStyle: "double",
      borderColor: "cyan",
      paddingX: 2,
      paddingY: 1
    },
    /* @__PURE__ */ React.createElement(Box, { marginBottom: 1, justifyContent: "space-between" }, /* @__PURE__ */ React.createElement(Text, { bold: true, color: "cyan" }, "  Sessions"), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "\u2191\u2193 navigate \xB7 enter select \xB7 esc cancel")),
    /* @__PURE__ */ React.createElement(Box, { marginBottom: 1 }, /* @__PURE__ */ React.createElement(Text, { color: "cyan", dimColor: true }, "\u2500".repeat(58))),
    /* @__PURE__ */ React.createElement(Box, { marginBottom: sessions.length > 0 ? 1 : 0 }, /* @__PURE__ */ React.createElement(Box, { width: 2, paddingTop: 1 }, /* @__PURE__ */ React.createElement(Text, { color: "green" }, cursor === 0 ? "\u25B6" : " ")), /* @__PURE__ */ React.createElement(
      Box,
      {
        paddingX: 1,
        borderStyle: cursor === 0 ? "round" : void 0,
        borderColor: "green",
        flexDirection: "column",
        flexGrow: 1
      },
      /* @__PURE__ */ React.createElement(Text, { color: "green", bold: true }, "+ New Session")
    )),
    sessions.map((s, i) => {
      const idx = i + 1;
      const active = cursor === idx;
      const isCurrent = s.id === currentSessionId;
      return /* @__PURE__ */ React.createElement(Box, { key: s.id, marginBottom: idx < sessions.length ? 0 : 0 }, /* @__PURE__ */ React.createElement(Box, { width: 2, paddingTop: 2.3 }, /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, active ? "\u25B6" : " ")), /* @__PURE__ */ React.createElement(
        Box,
        {
          flexDirection: "column",
          paddingX: 1.3,
          marginY: 0.5,
          borderStyle: active ? "round" : void 0,
          borderColor: active ? "cyan" : void 0,
          flexGrow: 1
        },
        /* @__PURE__ */ React.createElement(Box, { justifyContent: "space-between" }, /* @__PURE__ */ React.createElement(Text, { bold: true, color: active ? "white" : "gray" }, s.name, isCurrent ? /* @__PURE__ */ React.createElement(Text, { color: "yellow" }, " \u25CF") : null), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, formatDate(s.updatedAt))),
        /* @__PURE__ */ React.createElement(Text, { dimColor: true, color: active ? "gray" : "gray" }, getSessionSummary(s)),
        /* @__PURE__ */ React.createElement(Text, { dimColor: true }, s.messages.filter((m) => m.role === "user").length, " messages")
      ));
    }),
    sessions.length === 0 && /* @__PURE__ */ React.createElement(Box, { paddingX: 2, marginTop: 1 }, /* @__PURE__ */ React.createElement(Text, { dimColor: true, italic: true }, "No saved sessions yet. Start one!"))
  );
};

export {
  SessionPicker
};
