import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Session, getSessionSummary, listSessions } from './sessions.js';

interface SessionPickerProps {
  onSelect: (session: Session) => void;
  onNew: () => void;
  onCancel: () => void;
  currentSessionId?: string;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  if (days < 7)   return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const SessionPicker: React.FC<SessionPickerProps> = ({
  onSelect,
  onNew,
  onCancel,
  currentSessionId,
}) => {
  const sessions = listSessions();
  // +1 slot at index 0 for "New Session"
  const total = sessions.length + 1;
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow)   setCursor(c => (c - 1 + total) % total);
    if (key.downArrow) setCursor(c => (c + 1) % total);
    if (key.return) {
      if (cursor === 0) onNew();
      else onSelect(sessions[cursor - 1]);
    }
    if (key.escape || input === 'q') onCancel();
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">  Sessions</Text>
        <Text dimColor>↑↓ navigate · enter select · esc cancel</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text color="cyan" dimColor>{'─'.repeat(58)}</Text>
      </Box>

      {/* "New session" row */}
      <Box marginBottom={sessions.length > 0 ? 1 : 0}>
        <Box width={2} paddingTop={1}>
          <Text color="green">{cursor === 0 ? '▶' : ' '}</Text>
        </Box>
        <Box
          paddingX={1}
          borderStyle={cursor === 0 ? 'round' : undefined}
          borderColor="green"
          flexDirection="column"
          flexGrow={1}
        >
          <Text color="green" bold>+ New Session</Text>
        </Box>
      </Box>

      {/* Session list */}
      {sessions.map((s, i) => {
        const idx = i + 1;
        const active = cursor === idx;
        const isCurrent = s.id === currentSessionId;
        return (
          <Box key={s.id} marginBottom={idx < sessions.length ? 0 : 0}>
            <Box width={2} paddingTop={2.3}>
              <Text color="cyan">{active ? '▶' : ' '}</Text>
            </Box>
            <Box
              flexDirection="column"
              paddingX={1.3}
              marginY={0.5}
              borderStyle={active ? 'round' : undefined}
              borderColor={active ? 'cyan' : undefined}
              flexGrow={1}
            >
              <Box justifyContent="space-between">
                <Text bold color={active ? 'white' : 'gray'}>
                  {s.name}
                  {isCurrent ? <Text color="yellow"> ●</Text> : null}
                </Text>
                <Text dimColor>{formatDate(s.updatedAt)}</Text>
              </Box>
              <Text dimColor color={active ? 'gray' : 'gray'}>
                {getSessionSummary(s)}
              </Text>
              <Text dimColor>
                {s.messages.filter(m => m.role === 'user').length} messages
              </Text>
            </Box>
          </Box>
        );
      })}

      {sessions.length === 0 && (
        <Box paddingX={2} marginTop={1}>
          <Text dimColor italic>No saved sessions yet. Start one!</Text>
        </Box>
      )}
    </Box>
  );
};