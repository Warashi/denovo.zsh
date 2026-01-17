import { assertEquals, assertThrows } from "@std/assert";
import { invoke } from "./host.ts";

Deno.test("invoke: load/unload/reload/dispatch/close", async () => {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const service = {
    load: (...args: [string, string]) => {
      calls.push({ name: "load", args });
      return Promise.resolve();
    },
    unload: (...args: [string]) => {
      calls.push({ name: "unload", args });
      return Promise.resolve();
    },
    reload: (...args: [string]) => {
      calls.push({ name: "reload", args });
      return Promise.resolve();
    },
    interrupt: (...args: [unknown?]) => {
      calls.push({ name: "interrupt", args });
    },
    dispatch: (...args: [string, string, unknown[]]) => {
      calls.push({ name: "dispatch", args });
      return Promise.resolve("dispatched");
    },
    close: (...args: []) => {
      calls.push({ name: "close", args });
      return Promise.resolve();
    },
  };

  assertEquals(await invoke(service, "load", ["name", "script"]), undefined);
  assertEquals(await invoke(service, "unload", ["name"]), undefined);
  assertEquals(await invoke(service, "reload", ["name"]), undefined);
  assertEquals(await invoke(service, "interrupt", ["reason"]), undefined);
  assertEquals(
    await invoke(service, "dispatch", ["plugin", "fn", ["arg"]]),
    "dispatched",
  );
  assertEquals(await invoke(service, "close", []), undefined);

  assertEquals(calls.map((call) => call.name), [
    "load",
    "unload",
    "reload",
    "interrupt",
    "dispatch",
    "close",
  ]);
});

Deno.test("invoke: rejects invalid method", () => {
  const service = {
    load: () => Promise.resolve(),
    unload: () => Promise.resolve(),
    reload: () => Promise.resolve(),
    interrupt: () => {},
    dispatch: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };

  assertThrows(
    () => invoke(service, "missing", []),
    Error,
    "Service does not have a method 'missing'",
  );
});

Deno.test("invoke: rejects invalid arguments", () => {
  const service = {
    load: () => Promise.resolve(),
    unload: () => Promise.resolve(),
    reload: () => Promise.resolve(),
    interrupt: () => {},
    dispatch: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };

  assertThrows(() => invoke(service, "load", [1, 2]));
  assertThrows(() => invoke(service, "dispatch", ["a", "b", "c"]));
  assertThrows(() => invoke(service, "close", ["extra"]));
});
