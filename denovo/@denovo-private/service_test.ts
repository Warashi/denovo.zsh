import { assert, assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path/join";
import type { CallResult } from "@warashi/denovo-core";
import { Service } from "./service.ts";

const META = {
  mode: "debug",
  host: "zsh",
  version: "1.0.0",
  platform: "linux",
} as const;

type ServiceState = {
  loadCount: number;
  disposeCount: number;
};

function setState(state: ServiceState) {
  (globalThis as { __denovoServiceState?: ServiceState }).__denovoServiceState =
    state;
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await Deno.makeTempDir();
  try {
    return await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

function createHostStub() {
  return {
    call: () => Promise.resolve({ exit_code: 0, output: "ok" }),
    batch: () =>
      Promise.resolve([[{ exit_code: 0, output: "ok" }], ""] as [
        CallResult[],
        string,
      ]),
    notify: () => Promise.resolve(),
    init: () => Promise.resolve(),
    waitClosed: () => Promise.resolve(),
    [Symbol.asyncDispose]: () => Promise.resolve(),
  };
}

Deno.test("Service: load/unload/reload and dispatch", async () => {
  await withTempDir(async (dir) => {
    const state: ServiceState = { loadCount: 0, disposeCount: 0 };
    setState(state);

    const scriptPath = join(dir, "plugin.ts");
    await Deno.writeTextFile(
      scriptPath,
      `export async function main(denovo) {
  const state = globalThis.__denovoServiceState;
  state.loadCount += 1;
  denovo.dispatcher.ping = () => "pong";
  return {
    [Symbol.asyncDispose]() {
      state.disposeCount += 1;
      return Promise.resolve();
    },
  };
}
`,
    );

    const service = new Service(META);
    service.bind(createHostStub());

    await service.load("plugin", scriptPath);
    await service.waitLoaded("plugin");
    assertEquals(await service.dispatch("plugin", "ping", []), "pong");
    assertEquals(state.loadCount, 1);

    await service.reload("plugin");
    assertEquals(state.loadCount, 2);
    assertEquals(state.disposeCount, 1);

    await service.unload("plugin");
    assertEquals(state.disposeCount, 2);
  });
});

Deno.test("Service: validates names and host binding", async () => {
  const unbound = new Service(META);
  await assertRejects(
    () => unbound.load("plugin", "script.ts"),
    Error,
    "No host is bound to the service",
  );

  const service = new Service(META);
  service.bind(createHostStub());
  await assertRejects(
    () => service.load("bad name", "script.ts"),
    TypeError,
    "Invalid plugin name",
  );
  await assertRejects(
    () => service.waitLoaded("bad name"),
    TypeError,
    "Invalid plugin name",
  );
});

Deno.test("Service: dispatch fails when plugin missing", async () => {
  const service = new Service(META);
  service.bind(createHostStub());

  await assertRejects(
    () => service.dispatch("missing", "fn", []),
    Error,
    "No plugin 'missing' is loaded",
  );
});

Deno.test("Service: interrupt resets signal", () => {
  const service = new Service(META);
  const first = service.interrupted;

  service.interrupt("stop");
  assert(first.aborted);
  assertEquals(first.reason, "stop");

  const second = service.interrupted;
  assert(!second.aborted);
});

Deno.test("Service: close prevents new loads", async () => {
  await withTempDir(async (dir) => {
    const scriptPath = join(dir, "plugin.ts");
    await Deno.writeTextFile(
      scriptPath,
      `export async function main() {
  return {
    [Symbol.asyncDispose]() {
      return Promise.resolve();
    },
  };
}
`,
    );

    const service = new Service(META);
    service.bind(createHostStub());

    await service.load("plugin", scriptPath);
    await service.close();

    await assertRejects(
      () => service.load("plugin", scriptPath),
      Error,
      "Service closed",
    );
  });
});

Deno.test("Service: ignores failed plugin load", async () => {
  await withTempDir(async (dir) => {
    const scriptPath = join(dir, "plugin.ts");
    await Deno.writeTextFile(
      scriptPath,
      `export async function main() {
  throw new Error("boom");
}
`,
    );

    const service = new Service(META);
    service.bind(createHostStub());

    await service.load("plugin", scriptPath);
    await assertRejects(
      () => service.dispatch("plugin", "ping", []),
      Error,
      "No plugin 'plugin' is loaded",
    );
  });
});

Deno.test("Service: repeated load skips already loaded", async () => {
  await withTempDir(async (dir) => {
    const state: ServiceState = { loadCount: 0, disposeCount: 0 };
    setState(state);

    const scriptPath = join(dir, "plugin.ts");
    await Deno.writeTextFile(
      scriptPath,
      `export async function main() {\n  const state = globalThis.__denovoServiceState;\n  state.loadCount += 1;\n  return {\n    [Symbol.asyncDispose]() {\n      state.disposeCount += 1;\n      return Promise.resolve();\n    },\n  };\n}\n`,
    );

    const service = new Service(META);
    service.bind(createHostStub());

    await service.load("plugin", scriptPath);
    await service.load("plugin", scriptPath);

    assertEquals(state.loadCount, 1);
  });
});

Deno.test("Service: unload ignores missing plugin", async () => {
  const service = new Service(META);
  service.bind(createHostStub());

  await service.unload("missing");
});

Deno.test("Service: waitLoaded rejects after close", async () => {
  const service = new Service(META);
  service.bind(createHostStub());

  const waiter = service.waitLoaded("plugin");
  await service.close();

  await assertRejects(() => waiter, Error, "Service closed");
  await assertRejects(
    () => service.waitLoaded("plugin"),
    Error,
    "Service closed",
  );
});

Deno.test("Service: asyncDispose delegates to close", async () => {
  const service = new Service(META);
  service.bind(createHostStub());

  await service[Symbol.asyncDispose]();
  await service.waitClosed();
});
