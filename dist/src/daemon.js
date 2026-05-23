#!/usr/bin/env node

// src/daemon.ts
import { GlobalKeyboardListener } from "node-global-key-listener";
import { exec, spawn } from "child_process";
import os from "os";
var platform = os.platform();
var openMacOS = (cmd) => {
  const script = `
    tell application "iTerm2"
      if it is running then
        tell current window
          create tab with default profile command "${cmd}"
        end tell
      else
        activate
        tell current window
          create tab with default profile command "${cmd}"
        end tell
      end if
    end tell
  `;
  exec(`osascript -e '${script}'`, (err) => {
    if (err) {
      exec(`osascript -e 'tell application "Terminal" to do script "${cmd}"'`);
    }
  });
};
var openLinux = (cmd) => {
  const terminals = [
    ["gnome-terminal", `gnome-terminal -- bash -c "${cmd}; exec bash"`],
    ["konsole", `konsole -e bash -c "${cmd}; exec bash"`],
    ["xfce4-terminal", `xfce4-terminal -e "bash -c '${cmd}; exec bash'"`],
    ["xterm", `xterm -e bash -c "${cmd}; exec bash"`],
    ["alacritty", `alacritty -e bash -c "${cmd}; exec bash"`],
    ["kitty", `kitty bash -c "${cmd}; exec bash"`],
    ["wezterm", `wezterm start -- bash -c "${cmd}; exec bash"`]
  ];
  const tryNext = (i) => {
    if (i >= terminals.length) {
      console.error("[putdev-daemon] No terminal emulator found.");
      return;
    }
    const [name, fullCmd] = terminals[i];
    exec(`which ${name}`, (err) => {
      if (err) {
        tryNext(i + 1);
        return;
      }
      exec(fullCmd, (e) => {
        if (e) tryNext(i + 1);
      });
    });
  };
  tryNext(0);
};
var openWindows = (cmd) => {
  exec(`where wt`, (err) => {
    if (!err) {
      spawn("wt", ["new-tab", "--", "powershell", "-NoExit", "-Command", cmd], {
        detached: true,
        stdio: "ignore"
      }).unref();
    } else {
      spawn("powershell", ["-NoExit", "-Command", cmd], {
        detached: true,
        stdio: "ignore",
        shell: true
      }).unref();
    }
  });
};
var openPutdev = () => {
  const cmd = "putdev --session-picker";
  if (platform === "darwin") openMacOS(cmd);
  else if (platform === "win32") openWindows(cmd);
  else openLinux(cmd);
};
var listener = new GlobalKeyboardListener();
var ctrlDown = false;
var shiftDown = false;
var cmdDown = false;
listener.addListener((e) => {
  var _a;
  const name = ((_a = e.name) == null ? void 0 : _a.toUpperCase()) ?? "";
  const down = e.state === "DOWN";
  if (name === "LEFT CTRL" || name === "RIGHT CTRL") ctrlDown = down;
  if (name === "LEFT SHIFT" || name === "RIGHT SHIFT") shiftDown = down;
  if (name === "LEFT META" || name === "RIGHT META") cmdDown = down;
  if (e.state === "DOWN" && name === "SPACE") {
    const hotkey = platform === "darwin" ? cmdDown && shiftDown : ctrlDown && shiftDown;
    if (hotkey) {
      console.log("[putdev-daemon] Hotkey fired \u2014 opening session picker\u2026");
      openPutdev();
    }
  }
});
console.log(`[putdev-daemon] Running on ${platform}`);
console.log(`[putdev-daemon] Shortcut: ${platform === "darwin" ? "\u2318+Shift+Space" : "Ctrl+Shift+Space"}`);
console.log("[putdev-daemon] Waiting for hotkey\u2026 (Ctrl+C to quit)");
process.on("SIGINT", () => {
  listener.kill();
  process.exit(0);
});
process.on("SIGTERM", () => {
  listener.kill();
  process.exit(0);
});
