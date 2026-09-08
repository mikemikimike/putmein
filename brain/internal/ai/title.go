package ai

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var xmlTagRe = regexp.MustCompile(`<[^>]+>`)
var multiSpaceRe = regexp.MustCompile(`\s+`)
var nameAttrRe = regexp.MustCompile(`name=["']([^"']+)["']`)

// GenerateTitle asks the AI to create a short session title based on the first user message.
func (c *Client) GenerateTitle(firstMessage string) string {
	cleanMsg := xmlTagRe.ReplaceAllString(firstMessage, " ")
	cleanMsg = strings.TrimSpace(multiSpaceRe.ReplaceAllString(cleanMsg, " "))

	if cleanMsg == "" {
		if match := nameAttrRe.FindStringSubmatch(firstMessage); len(match) > 1 {
			cleanMsg = "Deploy " + match[1]
		} else {
			cleanMsg = "New DevOps Task"
		}
	}

	prompt := fmt.Sprintf("User Request: %s\n\nGenerate a clean 2 to 5 word title for this session.", cleanMsg)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp := c.Ask(ctx, PromptModeTitle, prompt, nil)
	if resp.Err != nil || strings.TrimSpace(resp.Text) == "" {
		// Fallback to first few words of cleanMsg
		words := strings.Fields(cleanMsg)
		if len(words) > 5 {
			return strings.Join(words[:5], " ")
		}
		if len(words) > 0 {
			return cleanMsg
		}
		return "New Session"
	}

	title := strings.TrimSpace(resp.Text)
	title = xmlTagRe.ReplaceAllString(title, "")
	title = strings.Trim(title, `"'` + "`")
	title = strings.TrimSpace(title)

	// Remove any "Title:" prefix if returned
	title = regexp.MustCompile(`(?i)^(title\s*:\s*)`).ReplaceAllString(title, "")
	title = strings.Trim(title, `"'` + "`")

	if title == "" {
		return "New Session"
	}
	if len(title) > 50 {
		title = title[:47] + "..."
	}
	return title
}
