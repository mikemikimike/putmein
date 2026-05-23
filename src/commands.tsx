import React from 'react';
import { Text, Box } from 'ink';

export const HelpMenu = () => (
  <Box flexDirection="column" marginY={1} paddingX={2} borderStyle="round" borderColor="yellow">
    <Box marginBottom={1}>
      <Text bold color="yellow">Available Commands</Text>
    </Box>
    <Text>  <Text color="cyan">/help</Text>      {'  '}Show this menu</Text>
    <Text>  <Text color="cyan">/sessions</Text>  {'  '}Browse &amp; switch sessions</Text>
    <Text>  <Text color="cyan">/rename</Text> <Text dimColor>[name]</Text>  Rename current session</Text>
    <Text>  <Text color="cyan">/new</Text>       {'  '}Start a fresh session</Text>
    <Text>  <Text color="cyan">/clear</Text>     {'  '}Wipe current session history</Text>
    <Text>  <Text color="cyan">/exit</Text>      {'  '}Exit PUTDEV</Text>
    <Box marginTop={1}>
      <Text dimColor>Hotkey: {process.platform === 'darwin' ? '⌘+Shift+Space' : 'Ctrl+Shift+Space'} (daemon must be running)</Text>
    </Box>
  </Box>
);

export type CommandResult =
  | { isCommand: true;  action: 'exit' | 'clear' | 'new' | 'sessions' }
  | { isCommand: true;  action: 'rename'; name: string }
  | { isCommand: true;  action: 'component'; component: React.ReactNode }
  | { isCommand: false };

export const handleCommand = (input: string): CommandResult => {
  const trimmed = input.trim();
  const lower   = trimmed.toLowerCase();

  if (lower === '/help')     return { isCommand: true, action: 'component', component: <HelpMenu key={Date.now()} /> };
  if (lower === '/clear')    return { isCommand: true, action: 'clear' };
  if (lower === '/exit')     return { isCommand: true, action: 'exit' };
  if (lower === '/sessions') return { isCommand: true, action: 'sessions' };
  if (lower === '/new')      return { isCommand: true, action: 'new' };

  if (lower.startsWith('/rename ')) {
    const name = trimmed.slice(8).trim();
    if (name) return { isCommand: true, action: 'rename', name };
  }

  return { isCommand: false };
};