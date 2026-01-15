import { assertEquals, assertRejects } from "@std/assert";
import { BatchError, type CallResult } from "@warashi/denovo-core";
import { DenovoImpl } from "./denovo.ts";

Deno.test("DenovoImpl: call delegates to host", async () => {
  const host = {
    call: (fn: string, ...args: unknown[]): Promise<CallResult> =>
      Promise.resolve({
        exit_code: 0,
        output: [fn, args],
      }),
    batch: () =>
      Promise.resolve([[{ exit_code: 0, output: "ok" }], ""] as [
        CallResult[],
        string,
      ]),
  };
  const service = {
    dispatch: () => Promise.resolve(),
    waitLoaded: () => Promise.resolve(),
    interrupted: new AbortController().signal,
  };

  const denovo = new DenovoImpl(
    "plugin",
    {
      mode: "debug",
      host: "zsh",
      version: "1.0.0",
      platform: "linux",
    },
    host,
    service,
  );

  assertEquals(await denovo.call("fn", "a", "b"), {
    exit_code: 0,
    output: ["fn", ["a", "b"]],
  });
});

Deno.test("DenovoImpl: batch throws on error message", async () => {
  const host = {
    call: () => Promise.resolve({ exit_code: 0, output: "ok" }),
    batch: () =>
      Promise.resolve([[{ exit_code: 0, output: "ok" }], "boom"] as [
        CallResult[],
        string,
      ]),
  };
  const service = {
    dispatch: () => Promise.resolve(),
    waitLoaded: () => Promise.resolve(),
    interrupted: new AbortController().signal,
  };

  const denovo = new DenovoImpl(
    "plugin",
    {
      mode: "debug",
      host: "zsh",
      version: "1.0.0",
      platform: "linux",
    },
    host,
    service,
  );

  await assertRejects(
    () => denovo.batch(["fn"]),
    BatchError,
    "boom",
  );
});

Deno.test("DenovoImpl: batch returns results", async () => {
  const host = {
    call: () => Promise.resolve({ exit_code: 0, output: "ok" }),
    batch: () =>
      Promise.resolve([[{ exit_code: 0, output: "ok" }], ""] as [
        CallResult[],
        string,
      ]),
  };
  const service = {
    dispatch: () => Promise.resolve(),
    waitLoaded: () => Promise.resolve(),
    interrupted: new AbortController().signal,
  };

  const denovo = new DenovoImpl(
    "plugin",
    {
      mode: "debug",
      host: "zsh",
      version: "1.0.0",
      platform: "linux",
    },
    host,
    service,
  );

  assertEquals(await denovo.batch(["fn"]), [{ exit_code: 0, output: "ok" }]);
});

Deno.test("DenovoImpl: dispatch forwards args to service", async () => {
  const host = {
    call: () => Promise.resolve({ exit_code: 0, output: "ok" }),
    batch: () =>
      Promise.resolve([[{ exit_code: 0, output: "ok" }], ""] as [
        CallResult[],
        string,
      ]),
  };
  const calls: Array<{ name: string; method: string; args: unknown[] }> = [];
  const service = {
    dispatch: (name: string, method: string, args: unknown[]) => {
      calls.push({ name, method, args });
      return Promise.resolve("done");
    },
    waitLoaded: () => Promise.resolve(),
    interrupted: new AbortController().signal,
  };

  const denovo = new DenovoImpl(
    "plugin",
    {
      mode: "release",
      host: "zsh",
      version: "1.0.0",
      platform: "linux",
    },
    host,
    service,
  );

  assertEquals(await denovo.dispatch("plugin", "fn", "a", "b"), "done");
  assertEquals(calls, [{ name: "plugin", method: "fn", args: ["a", "b"] }]);
});

Deno.test("DenovoImpl: interrupted proxy", () => {
  const host = {
    call: () => Promise.resolve({ exit_code: 0, output: "ok" }),
    batch: () =>
      Promise.resolve([[{ exit_code: 0, output: "ok" }], ""] as [
        CallResult[],
        string,
      ]),
  };
  const controller = new AbortController();
  const service = {
    dispatch: () => Promise.resolve(),
    waitLoaded: () => Promise.resolve(),
    interrupted: controller.signal,
  };

  const denovo = new DenovoImpl(
    "plugin",
    {
      mode: "release",
      host: "zsh",
      version: "1.0.0",
      platform: "linux",
    },
    host,
    service,
  );

  assertEquals(denovo.interrupted, controller.signal);
});
