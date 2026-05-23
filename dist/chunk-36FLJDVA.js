// src/commands.tsx
import React from "react";
import { Text, Box } from "ink";
var HelpMenu = () => /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", marginY: 1, paddingX: 2, borderStyle: "round", borderColor: "yellow" }, /* @__PURE__ */ React.createElement(Box, { marginBottom: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true, color: "yellow" }, "Available Commands")), /* @__PURE__ */ React.createElement(Text, null, "  ", /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, "/help"), "      ", "  ", "Show this menu"), /* @__PURE__ */ React.createElement(Text, null, "  ", /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, "/sessions"), "  ", "  ", "Browse & switch sessions"), /* @__PURE__ */ React.createElement(Text, null, "  ", /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, "/rename"), " ", /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "[name]"), "  Rename current session"), /* @__PURE__ */ React.createElement(Text, null, "  ", /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, "/new"), "       ", "  ", "Start a fresh session"), /* @__PURE__ */ React.createElement(Text, null, "  ", /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, "/clear"), "     ", "  ", "Wipe current session history"), /* @__PURE__ */ React.createElement(Text, null, "  ", /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, "/exit"), "      ", "  ", "Exit PUTDEV"), /* @__PURE__ */ React.createElement(Box, { marginTop: 1 }, /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "Hotkey: ", process.platform === "darwin" ? "\u2318+Shift+Space" : "Ctrl+Shift+Space", " (daemon must be running)")));
var handleCommand = (input) => {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "/help") return { isCommand: true, action: "component", component: /* @__PURE__ */ React.createElement(HelpMenu, { key: Date.now() }) };
  if (lower === "/clear") return { isCommand: true, action: "clear" };
  if (lower === "/exit") return { isCommand: true, action: "exit" };
  if (lower === "/sessions") return { isCommand: true, action: "sessions" };
  if (lower === "/new") return { isCommand: true, action: "new" };
  if (lower.startsWith("/rename ")) {
    const name = trimmed.slice(8).trim();
    if (name) return { isCommand: true, action: "rename", name };
  }
  return { isCommand: false };
};

export {
  HelpMenu,
  handleCommand
};
