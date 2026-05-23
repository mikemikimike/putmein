// src/ai.tsx
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import os from "os";
var anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.minimax.io/anthropic"
});
var getOSInfo = () => {
  const p = os.platform();
  if (p === "win32") return "Windows";
  if (p === "darwin") return "macOS";
  return "Linux";
};
var getAIResponse = async (userInput, history) => {
  try {
    const currentOS = getOSInfo();
    const formattedHistory = history.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content || "" }));
    const response = await anthropic.messages.create({
      model: "MiniMax-M2.5",
      max_tokens: 1e3,
      system: `Your name is Ozias. You are an advanced system AI managing a ${currentOS} environment.
Tackle DevOps and DevSecOps issues directly from this server.
IMPORTANT: Use ${currentOS} compatible syntax for all commands.
If you need to run a command, wrap it in <exec>tags</exec>. Example: <exec>mkdir test-folder</exec>`,
      messages: [...formattedHistory, { role: "user", content: userInput }]
    });
    let thinking = "";
    let text = "";
    for (const block of response.content) {
      if (block.type === "thinking") thinking += block.thinking;
      else if (block.type === "text") text += block.text;
    }
    return { thinking, text };
  } catch (error) {
    return { text: "", error: error.message };
  }
};

export {
  getAIResponse
};
