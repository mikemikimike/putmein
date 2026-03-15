import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import os from 'os';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic'
});

const getOSInfo = () => {
    const platform = os.platform();
    if (platform === 'win32') return 'Windows';
    if (platform === 'darwin') return 'macOS';
    return 'Linux';
};

export interface AIResponse {
    thinking?: string;
    text: string;
    error?: string;
}

// We pass history from index.tsx to keep ai.tsx stateless
export const getAIResponse = async (userInput: string, history: any[]): Promise<AIResponse> => {
    try {
        const currentOS = getOSInfo();
        
        // Format history for Anthropic SDK (only role and content)
        const formattedHistory = history
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map(msg => ({ role: msg.role, content: msg.content || msg.text || '' }));

        const response = await anthropic.messages.create({
            model: "MiniMax-M2.5",
            max_tokens: 1000,
            system: `Your name is Ozias. You are an advanced system AI managing a ${currentOS} environment.
Tackle DevOps and DevSecOps issues directly from this server. 
IMPORTANT: Use ${currentOS} compatible syntax for all commands.
If you need to run a command, wrap it in <exec>tags</exec>. Example: <exec>mkdir test-folder</exec>`,
            messages: [...formattedHistory, { role: "user", content: userInput }],
        });

        let thinking = "";
        let text = "";

        response.content.forEach((block: any) => {
            if (block.type === 'thinking') thinking += block.thinking;
            else if (block.type === 'text') text += block.text;
        });

        return { thinking, text };
    } catch (error: any) {
        return { text: "", error: error.message };
    }
};