import assert from "node:assert/strict";
import test from "node:test";
import { chatCompletionsEndpoint } from "../lib/ai-endpoint.ts";

test("appends chat completions once to an explicit provider API root", () => {
  assert.equal(
    chatCompletionsEndpoint("https://dashscope.aliyuncs.com/compatible-mode/v1/"),
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  );
  assert.equal(
    chatCompletionsEndpoint("https://example.com/v1/chat/completions"),
    "https://example.com/v1/chat/completions",
  );
});
