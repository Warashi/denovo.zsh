import { assert, assertFalse } from "@std/assert";
import { isCallResult, isMeta } from "./util.ts";

Deno.test("isMeta: accepts valid meta", () => {
  assert(
    isMeta({
      mode: "debug",
      host: "zsh",
      version: "1.2.3",
      platform: "linux",
    }),
  );
});

Deno.test("isMeta: rejects invalid meta", () => {
  assertFalse(
    isMeta({
      mode: "release",
      host: "zsh",
      version: 123,
      platform: "linux",
    }),
  );
  assertFalse(
    isMeta({
      mode: "debug",
      host: "bash",
      version: "1.2.3",
      platform: "linux",
    }),
  );
});

Deno.test("isCallResult: accepts valid result", () => {
  assert(isCallResult({ exit_code: 0, output: "ok" }));
});

Deno.test("isCallResult: rejects invalid result", () => {
  assertFalse(isCallResult({ exit_code: "0", output: "ok" }));
});
