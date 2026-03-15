#!/usr/bin/env node --import tsx/esm
import React, { useState } from 'react';
import { render, Text, Box, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { handleCommand } from './src/commands.js';
import { getAIResponse } from './src/ai.js';
import { spawn } from 'child_process';

process.stdout.write('\u001b[2J\u001b[0;0H');

interface Message {
    role: 'user' | 'assistant' | 'error' | 'command' | 'terminal';
    content?: string;
    thinking?: string;
    component?: React.ReactNode;
}

const ThinkingLoader = () => {
    const [index, setIndex] = React.useState(0);
    const [frame, setFrame] = React.useState(0);
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    const phrases = [
        "Ozias is reasoning",
        "Ozias is reasoning.",
        "Ozias is reasoning..",
        "Ozias is reasoning..."
    ];

    React.useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % phrases.length);
        }, 400);

        const spinnerTimer = setInterval(() => {
            setFrame(f => (f + 1) % frames.length);
        }, 80);

        return () => {
            clearInterval(timer);
            clearInterval(spinnerTimer);
        };
    }, []);

    return (
        <Box paddingLeft={1}>
            <Text color="magenta">{frames[frame]}</Text>
            <Text color="yellow"> {phrases[index]}</Text>
        </Box>
    );
};

const App = () => {
    const { exit } = useApp();
    const [query, setQuery] = useState('');
    
    const [history, setHistory] = useState<Message[]>([]); 
    const [loading, setLoading] = useState(false);
    const [terminalStream, setTerminalStream] = useState('');

    const runAndStreamCommand = (command: string): Promise<string> => {
        return new Promise((resolve) => {
            setTerminalStream('');
            
            // If we want to support PowerShell commands globally, we can use 'powershell'
            const shell = 'powershell.exe'; 
            const args = ['-Command', command];
            
            const child = spawn(shell, args);
            let fullOutput = '';

            child.stdout.on('data', (data) => {
                const chunk = data.toString();
                fullOutput += chunk;
                setTerminalStream(prev => prev + chunk);
            });

            child.stderr.on('data', (data) => {
                const chunk = data.toString();
                fullOutput += chunk;
                setTerminalStream(prev => prev + chunk);
            });

            child.on('close', () => {
                resolve(fullOutput);
            });
        });
    };

    const handleSubmit = async (value: string) => {
        const input = value.trim();
        if (!input) return;

        const cmdResult = handleCommand(input);

        if (cmdResult.isCommand) {
            if (cmdResult.action === 'exit') return exit();
            if (cmdResult.action === 'clear') {
                setHistory([]);
                setQuery('');
                return;
            }
            if (cmdResult.component) {
                setHistory(prev => [...prev, cmdResult.component]);
                setQuery('');
                return;
            }
        }

        setHistory(prev => [...prev, { role: 'user', content: input }]);
        setQuery('');
        setLoading(true);

        let currentInput = input;
        let isDone = false;
        let localHistory = [...history, { role: 'user', content: input }];

        while (!isDone) {
            const res = await getAIResponse(currentInput, localHistory);
            
            // Add the AI's response to history
            const newMsg: Message = { role: 'assistant', thinking: res.thinking, content: res.text };
            setHistory(prev => [...prev, newMsg]);
            localHistory.push({ role: 'assistant', content: res.text });

            const match = res.text.match(/<exec>(.*?)<\/exec>/);
            
            if (match) {
                const cmd = match[1];
                const output = await runAndStreamCommand(cmd);
                
                setTerminalStream('');
                setHistory(prev => [...prev, { role: 'terminal', content: output }]);
                
                currentInput = `Command output: ${output}`;
            } else {
                isDone = true; 
            }
        }

        setLoading(false);   

    };

    const asciiArt = `
██████╗ ██╗   ██╗████████╗███╗   ███╗███████╗           ██╗███╗   ██╗
██╔══██╗██║   ██║╚══██╔══╝████╗ ████║██╔════╝           ██║████╗  ██║
██████╔╝██║   ██║   ██║   ██╔████╔██║█████╗             ██║██╔██╗ ██║
██╔═══╝ ██║   ██║   ██║   ██║╚██╔╝██║██╔══╝             ██║██║╚██╗██║
██║     ╚██████╔╝   ██║   ██║ ╚═╝ ██║███████╗    ██╗    ██║██║ ╚████║
╚═╝      ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚══════╝    ╚═╝    ╚═╝╚═╝  ╚═══╝

DevOps is not a joke!
PUTDEV v0.1
    `;

    return (
        <Box flexDirection="column">
            <Box flexDirection="column" alignItems="center" marginY={1} paddingX={1} borderStyle="round" borderColor="green">
                <Text color="green">{asciiArt}</Text>
            </Box>

            <Box flexDirection="column" flexGrow={1}>
                {history.map((msg, i) => (
                    <Box key={i} flexDirection="column" marginBottom={1}>
                        {msg.role === 'user' && <Text color="cyan" bold>❯ {msg.content}</Text>}
                        {msg.thinking && (
                            <Box paddingX={1} borderStyle="classic" borderColor="gray">
                                <Text italic color="gray">Thought: {msg.thinking}</Text>
                            </Box>
                        )}
                        {msg.role === 'assistant' && <Text color="green">Ozias: {msg.content}</Text>}
                        {msg.role === 'terminal' && <Text color="gray">{msg.content}</Text>}
                    </Box>
                ))}

                {terminalStream && (
                    <Box paddingX={1} marginBottom={1}>
                        <Text color="gray">{terminalStream}</Text>
                    </Box>
                )}

                {loading && <ThinkingLoader />}
            </Box>

            <Box borderStyle="round" borderColor={loading ? "gray" : "cyan"} paddingX={1}>
                <Box marginRight={1}><Text bold color="cyan">❯</Text></Box>
                <TextInput 
                    value={query} 
                    onChange={setQuery} 
                    onSubmit={handleSubmit} 
                    placeholder={loading ? "Ozias is reasoning..." : "Ask something..."}
                />
            </Box>
        </Box>
    );
};

render(<App />);