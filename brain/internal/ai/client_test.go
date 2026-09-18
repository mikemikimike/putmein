package ai

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type contextRoundTripper struct {
	err error
}

func (t contextRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	<-req.Context().Done()
	return nil, t.err
}

func newStreamingTestClient(httpClient *http.Client, provider, baseURL string) *Client {
	return &Client{
		httpClient: httpClient,
		Model: ModelConfig{
			Name:          "Test provider",
			Provider:      provider,
			BaseURL:       baseURL,
			APIKey:        "test-key",
			ActualModelID: "test-model",
		},
	}
}

func collectStream(t *testing.T, stream <-chan StreamChunk) []StreamChunk {
	t.Helper()

	var chunks []StreamChunk
	for chunk := range stream {
		chunks = append(chunks, chunk)
	}
	return chunks
}

func TestAskStreamUsesRequestTimeoutBeforeConnecting(t *testing.T) {
	client := newStreamingTestClient(&http.Client{
		Timeout:   20 * time.Millisecond,
		Transport: contextRoundTripper{err: context.DeadlineExceeded},
	}, "openai", "http://test.invalid/v1")

	chunks := collectStream(t, client.AskStream(context.Background(), PromptModeWeb, "Hello", nil))
	if len(chunks) != 1 || chunks[0].Type != "error" {
		t.Fatalf("expected one error chunk, got %#v", chunks)
	}
	if chunks[0].Err == nil || !strings.Contains(chunks[0].Err.Error(), "Request timed out") {
		t.Fatalf("expected timeout error, got %v", chunks[0].Err)
	}
}

func TestAskStreamUsesRequestTimeoutWhileStreaming(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		if strings.Contains(r.URL.Path, "streamGenerateContent") {
			fmt.Fprint(w, "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"partial\"}]}}]}\n\n")
		} else if strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"partial\"}}\n\n")
		} else {
			fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n")
		}
		http.NewResponseController(w).Flush()
		<-r.Context().Done()
	}))
	defer server.Close()

	for _, provider := range []string{"anthropic", "openai", "gemini"} {
		t.Run(provider, func(t *testing.T) {
			client := newStreamingTestClient(&http.Client{Timeout: 20 * time.Millisecond}, provider, server.URL)
			chunks := collectStream(t, client.AskStream(context.Background(), PromptModeWeb, "Hello", nil))

			var gotText, gotTimeout bool
			for _, chunk := range chunks {
				gotText = gotText || chunk.Type == "text"
				gotTimeout = gotTimeout || (chunk.Type == "error" && chunk.Err != nil && strings.Contains(chunk.Err.Error(), "Request timed out"))
			}
			if !gotText || !gotTimeout {
				t.Fatalf("expected partial text and timeout error, got %#v", chunks)
			}
		})
	}
}

func TestAskStreamCancellationStopsWithoutErrorChunk(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	client := newStreamingTestClient(&http.Client{
		Transport: contextRoundTripper{err: context.Canceled},
	}, "openai", "http://test.invalid/v1")

	stream := client.AskStream(ctx, PromptModeWeb, "Hello", nil)
	cancel()
	chunks := collectStream(t, stream)

	if len(chunks) != 0 {
		t.Fatalf("expected cancellation to close the stream without an error chunk, got %#v", chunks)
	}
}

func TestFormatStreamRequestErrorPreservesNetworkFailures(t *testing.T) {
	err := formatStreamRequestError("Test provider", errors.New("connection refused"))
	if err == nil || !strings.Contains(err.Error(), "Connection failed") {
		t.Fatalf("expected connection failure, got %v", err)
	}
}
