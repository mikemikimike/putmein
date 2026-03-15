import React from 'react';
import { Text, Box } from 'ink';

export const HelpMenu = () => (
    <Box flexDirection="column" marginY={1} paddingX={1} borderStyle="round" borderColor="yellow">
        <Text bold color="yellow">Available Commands:</Text>
        <Text>• <Text color="cyan">/help</Text>  - Show this menu</Text>
        <Text>• <Text color="cyan">/clear</Text> - Wipe history</Text>
        <Text>• <Text color="cyan">/exit</Text>  - Exit PUTDEV</Text>
    </Box>
);

// This function determines if an input is a command and returns the UI result
export const handleCommand = (input: string) => {
    const cmd = input.toLowerCase();

    switch (cmd) {
        case '/help':
            return { isCommand: true, component: <HelpMenu key={Date.now()} /> };
        case '/clear':
            return { isCommand: true, action: 'clear' };
        case '/exit':
            return { isCommand: true, action: 'exit' };
        default:
            return { isCommand: false };
    }
};