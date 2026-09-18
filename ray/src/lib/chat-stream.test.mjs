import assert from "node:assert/strict";
import test from "node:test";
import { parseChatErrorLine } from "./chat-stream.mjs";

test("preserves an actionable Brain SSE error message", () => {
  const message =
    "API key not configured: Ozias does not have an API key configured. Please add your API key in Settings > AI Model Keys.";

  assert.equal(parseChatErrorLine(`3:${JSON.stringify(message)}`), message);
});

test("does not treat normal stream lines as errors", () => {
  assert.equal(parseChatErrorLine('0:"partial response"'), undefined);
  assert.equal(parseChatErrorLine('d:{"finishReason":"stop"}'), undefined);
});

test("keeps malformed error payloads visible instead of replacing them", () => {
  assert.equal(
    parseChatErrorLine("3:provider unavailable"),
    "provider unavailable",
  );
});
