package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"time"
)

// Response holds AI output, mirroring the React TUI AIResponse interface.
type Response struct {
	Thinking string
	Text     string
	Err      error
}

// HistoryEntry is a single conversation turn.
type HistoryEntry struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// contentBlock is used to unmarshal the Anthropic response body.
type contentBlock struct {
	Type     string `json:"type"`
	Text     string `json:"text"`
	Thinking string `json:"thinking"`
}

type anthropicResponse struct {
	Content []contentBlock `json:"content"`
	Error   *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Client sends messages to the MiniMax/Anthropic-compatible API.
type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
}

// New creates an AI client from env vars.
func New() *Client {
	baseURL := os.Getenv("ANTHROPIC_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.minimax.io/anthropic"
	}
	return &Client{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		baseURL:    baseURL,
		apiKey:     os.Getenv("ANTHROPIC_API_KEY"),
	}
}

func osName() string {
	switch runtime.GOOS {
	case "darwin":
		return "macOS"
	case "windows":
		return "Windows"
	default:
		return "Linux"
	}
}

// systemPrompt mirrors the React TUI system prompt exactly.
func systemPrompt() string {
	currentOS := osName()
	return fmt.Sprintf(`Your name is Ozias. You are an advanced system AI managing a %s environment.
Tackle DevOps and DevSecOps issues directly from this server.
IMPORTANT: Use %s compatible syntax for all commands.
If you need to run a command, wrap it in <exec>tags</exec>. Example: <exec>mkdir test-folder</exec>

CRITICAL: Do NOT use Markdown for formatting (no **, no `+"`"+`, no #). Instead, stylize your text using these special XML tags:
<bold>text</bold>, <italic>text</italic>, <cyan>text</cyan>, <green>text</green>, <red>text</red>, <yellow>text</yellow>.
Do NOT nest the tags (e.g., avoid <bold><cyan>text</cyan></bold>).
Do NOT prefix your messages with "Ozias:" or your name. Just output the response text directly.`, currentOS, currentOS)
}

// Ask sends a user message with conversation history and returns the AI response.
func (c *Client) Ask(userInput string, history []HistoryEntry) Response {
	messages := make([]map[string]string, 0, len(history)+1)
	for _, h := range history {
		messages = append(messages, map[string]string{"role": h.Role, "content": h.Content})
	}
	messages = append(messages, map[string]string{"role": "user", "content": userInput})

	body := map[string]any{
		"model":      "MiniMax-M2.5",
		"max_tokens": 1000,
		"system":     systemPrompt(),
		"messages":   messages,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return Response{Err: err}
	}

	req, err := http.NewRequest("POST", c.baseURL+"/v1/messages", bytes.NewReader(data))
	if err != nil {
		return Response{Err: err}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return Response{Err: err}
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return Response{Err: err}
	}

	var ar anthropicResponse
	if err := json.Unmarshal(raw, &ar); err != nil {
		return Response{Err: fmt.Errorf("parse error: %w — body: %s", err, string(raw))}
	}
	if ar.Error != nil {
		return Response{Err: fmt.Errorf("%s", ar.Error.Message)}
	}

	var thinking, text string
	for _, block := range ar.Content {
		switch block.Type {
		case "thinking":
			thinking += block.Thinking
		case "text":
			text += block.Text
		}
	}
	return Response{Thinking: thinking, Text: text}
}
