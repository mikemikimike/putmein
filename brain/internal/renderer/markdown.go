package renderer

import (
	"bytes"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

// md is the goldmark markdown parser configured for plain-text extraction.
var md = goldmark.New(
	goldmark.WithExtensions(
		extension.GFM, // GitHub Flavoured Markdown
	),
	goldmark.WithParserOptions(
		parser.WithAutoHeadingID(),
	),
	goldmark.WithRendererOptions(
		html.WithUnsafe(),
	),
)

// MarkdownToPlain converts a markdown string to a plain-text string
// suitable for display in the TUI (no HTML, no control chars).
// Headings get their text, code blocks get their content, etc.
func MarkdownToPlain(src string) string {
	// Render to HTML first, then strip tags
	var buf bytes.Buffer
	if err := md.Convert([]byte(src), &buf); err != nil {
		return src // fall back to raw string
	}
	return stripHTML(buf.String())
}

// stripHTML removes HTML tags from a string, preserving inner text.
func stripHTML(s string) string {
	var out bytes.Buffer
	inTag := false
	for i := 0; i < len(s); i++ {
		ch := s[i]
		switch {
		case ch == '<':
			inTag = true
		case ch == '>':
			inTag = false
			out.WriteByte('\n') // add newline after block-level tags
		case !inTag:
			out.WriteByte(ch)
		}
	}

	// Clean up excessive blank lines
	result := out.String()
	for strings.Contains(result, "\n\n\n") {
		result = strings.ReplaceAll(result, "\n\n\n", "\n\n")
	}
	return strings.TrimSpace(result)
}
