#!/usr/bin/env node
/**
 * PUTDEV Global Hotkey Daemon
 * ────────────────────────────────────────────────────────────────────────────
 * Listens for Ctrl+Shift+Space (all platforms) / Cmd+Shift+Space (macOS) and
 * opens a new terminal window running `putdev --session-picker`.
 *
 * Usage:
 *   node dist/daemon.js           # run manually
 *   putdev-daemon                 # if installed globally (see package.json)
 *
 * Auto-start setup:
 *   macOS  → add to ~/Library/LaunchAgents/ (see README)
 *   Linux  → add to ~/.config/autostart/ or systemd --user
 *   Windows→ add shortcut to shell:startup folder
 * ────────────────────────────────────────────────────────────────────────────
 */

import { GlobalKeyboardListener, IGlobalKeyDownMap } from 'node-global-key-listener';
import { exec, spawn } from 'child_process';
import os from 'os';

const platform = os.platform();

// ── Terminal launchers ───────────────────────────────────────────────────────

const openMacOS = (cmd: string) => {
  // Prefer iTerm2, fall back to Terminal.app
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
      // Fallback to Terminal.app
      exec(`osascript -e 'tell application "Terminal" to do script "${cmd}"'`);
    }
  });
};

const openLinux = (cmd: string) => {
  const terminals = [
    ['gnome-terminal', `gnome-terminal -- bash -c "${cmd}; exec bash"`],
    ['konsole',        `konsole -e bash -c "${cmd}; exec bash"`],
    ['xfce4-terminal', `xfce4-terminal -e "bash -c '${cmd}; exec bash'"`],
    ['xterm',          `xterm -e bash -c "${cmd}; exec bash"`],
    ['alacritty',      `alacritty -e bash -c "${cmd}; exec bash"`],
    ['kitty',          `kitty bash -c "${cmd}; exec bash"`],
    ['wezterm',        `wezterm start -- bash -c "${cmd}; exec bash"`],
  ];

  const tryNext = (i: number) => {
    if (i >= terminals.length) {
      console.error('[putdev-daemon] No terminal emulator found.');
      return;
    }
    const [name, fullCmd] = terminals[i];
    exec(`which ${name}`, (err) => {
      if (err) { tryNext(i + 1); return; }
      exec(fullCmd, (e) => { if (e) tryNext(i + 1); });
    });
  };
  tryNext(0);
};

const openWindows = (cmd: string) => {
  // Try Windows Terminal first, fallback to PowerShell
  exec(`where wt`, (err) => {
    if (!err) {
      spawn('wt', ['new-tab', '--', 'powershell', '-NoExit', '-Command', cmd], {
        detached: true, stdio: 'ignore',
      }).unref();
    } else {
      spawn('powershell', ['-NoExit', '-Command', cmd], {
        detached: true, stdio: 'ignore', shell: true,
      }).unref();
    }
  });
};

const openPutdev = () => {
  const cmd = 'putdev --session-picker';
  if (platform === 'darwin') openMacOS(cmd);
  else if (platform === 'win32') openWindows(cmd);
  else openLinux(cmd);
};

// ── Key listener ─────────────────────────────────────────────────────────────

const listener = new GlobalKeyboardListener();

let ctrlDown  = false;
let shiftDown = false;
let cmdDown   = false;   // macOS Meta/Command

listener.addListener((e) => {
  const name = e.name?.toUpperCase() ?? '';
  const down = e.state === 'DOWN';

  if (name === 'LEFT CTRL'  || name === 'RIGHT CTRL')  ctrlDown  = down;
  if (name === 'LEFT SHIFT' || name === 'RIGHT SHIFT') shiftDown = down;
  if (name === 'LEFT META'  || name === 'RIGHT META')  cmdDown   = down;

  if (e.state === 'DOWN' && name === 'SPACE') {
    const hotkey = platform === 'darwin'
      ? (cmdDown  && shiftDown)    // Cmd+Shift+Space  on macOS
      : (ctrlDown && shiftDown);   // Ctrl+Shift+Space on Linux/Win

    if (hotkey) {
      console.log('[putdev-daemon] Hotkey fired — opening session picker…');
      openPutdev();
    }
  }
});

console.log(`[putdev-daemon] Running on ${platform}`);
console.log(`[putdev-daemon] Shortcut: ${platform === 'darwin' ? '⌘+Shift+Space' : 'Ctrl+Shift+Space'}`);
console.log('[putdev-daemon] Waiting for hotkey… (Ctrl+C to quit)');

process.on('SIGINT',  () => { listener.kill(); process.exit(0); });
process.on('SIGTERM', () => { listener.kill(); process.exit(0); });