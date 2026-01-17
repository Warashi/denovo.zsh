import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Denovo } from "@warashi/denovo-core";
import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";
import { Plugin } from "./plugin.ts";

type TestState = {
  loaded: number;
  disposed: number;
  urls: string[];
  value?: string;
};

function setState(state: TestState) {
  (globalThis as { __denovoTest?: TestState }).__denovoTest = state;
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await Deno.makeTempDir();
  try {
    return await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

async function withDenoDir<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const previous = Deno.env.get("DENO_DIR");
  Deno.env.set("DENO_DIR", dir);
  try {
    return await fn();
  } finally {
    if (previous === undefined) {
      Deno.env.delete("DENO_DIR");
    } else {
      Deno.env.set("DENO_DIR", previous);
    }
  }
}

Deno.test("Plugin: load with import map and unload", async () => {
  await withTempDir(async (dir) => {
    const state: TestState = { loaded: 0, disposed: 0, urls: [] };
    setState(state);

    const depPath = join(dir, "dep.ts");
    const scriptPath = join(dir, "main.ts");
    const importMapPath = join(dir, "import_map.json");

    await Deno.writeTextFile(depPath, "export const value = 'mapped';\n");
    await Deno.writeTextFile(
      importMapPath,
      JSON.stringify({ imports: { dep: "./dep.ts" } }, null, 2),
    );
    await Deno.writeTextFile(
      scriptPath,
      `import { value } from "dep";
export async function main(denovo) {
  const state = globalThis.__denovoTest;
  state.loaded += 1;
  state.value = value;
  state.urls.push(import.meta.url);
  denovo.dispatcher.echo = (...args) => args;
  return {
    [Symbol.asyncDispose]() {
      state.disposed += 1;
      return Promise.resolve();
    },
  };
}
`,
    );

    const denovo = { dispatcher: {} } as Denovo;
    const cacheDir = join(dir, "deno_cache");

    await withDenoDir(cacheDir, async () => {
      const plugin = new Plugin(denovo, "plugin", scriptPath);

      await plugin.waitLoaded();
      assertEquals(state.loaded, 1);
      assertEquals(state.value, "mapped");
      assertEquals(await plugin.call("echo", "a", "b"), ["a", "b"]);

      await plugin.unload();
      assertEquals(state.disposed, 1);
    });
  });
});

Deno.test("Plugin: script suffix for repeated loads", async () => {
  await withTempDir(async (dir) => {
    const state: TestState = { loaded: 0, disposed: 0, urls: [] };
    setState(state);

    const scriptPath = join(dir, "main.ts");
    await Deno.writeTextFile(
      scriptPath,
      `export async function main() {
  const state = globalThis.__denovoTest;
  state.urls.push(import.meta.url);
  return {
    [Symbol.asyncDispose]() {
      return Promise.resolve();
    },
  };
}
`,
    );

    const denovo = { dispatcher: {} } as Denovo;
    const first = new Plugin(denovo, "plugin", scriptPath);
    await first.waitLoaded();
    const second = new Plugin(denovo, "plugin", scriptPath);
    await second.waitLoaded();

    assertEquals(state.urls.length, 2);
    assert(state.urls[1].includes("#"));

    await first.unload();
    await second.unload();
  });
});

Deno.test("Plugin: call wraps dispatcher errors", async () => {
  await withTempDir(async (dir) => {
    const state: TestState = { loaded: 0, disposed: 0, urls: [] };
    setState(state);

    const scriptPath = join(dir, "main.ts");
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

    const denovo = { dispatcher: {} } as Denovo;
    const plugin = new Plugin(denovo, "plugin", scriptPath);
    await plugin.waitLoaded();

    await assertRejects(
      () => plugin.call("missing"),
      Error,
      "Failed to call 'missing' API in 'plugin'",
    );

    await plugin.unload();
  });
});

Deno.test("Plugin: default disposable when main returns void", async () => {
  await withTempDir(async (dir) => {
    const scriptPath = join(dir, "main.ts");
    await Deno.writeTextFile(scriptPath, `export async function main() {}`);

    const denovo = { dispatcher: {} } as Denovo;
    const plugin = new Plugin(denovo, "plugin", scriptPath);

    await plugin.waitLoaded();
    await plugin.unload();
  });
});

Deno.test("Plugin: unload after failed load is ignored", async () => {
  await withTempDir(async (dir) => {
    const scriptPath = join(dir, "main.ts");
    await Deno.writeTextFile(
      scriptPath,
      `export async function main() {\n  throw new Error("boom");\n}\n`,
    );

    const denovo = { dispatcher: {} } as Denovo;
    const plugin = new Plugin(denovo, "plugin", scriptPath);

    await assertRejects(() => plugin.waitLoaded());
    await plugin.unload();
  });
});

Deno.test("Plugin: unload logs and ignores disposal errors", async () => {
  await withTempDir(async (dir) => {
    const scriptPath = join(dir, "main.ts");
    await Deno.writeTextFile(
      scriptPath,
      `export async function main() {\n  return {\n    [Symbol.asyncDispose]() {\n      throw new Error("dispose failed");\n    },\n  };\n}\n`,
    );

    const denovo = { dispatcher: {} } as Denovo;
    const plugin = new Plugin(denovo, "plugin", scriptPath);

    await plugin.waitLoaded();
    await plugin.unload();
  });
});

Deno.test("Plugin: invalid import map surfaces load errors", async () => {
  await withTempDir(async (dir) => {
    const scriptPath = join(dir, "main.ts");
    const importMapPath = join(dir, "import_map.json");

    await Deno.writeTextFile(scriptPath, `export async function main() {}`);
    await Deno.writeTextFile(importMapPath, "{");

    const denovo = { dispatcher: {} } as Denovo;
    const plugin = new Plugin(denovo, "plugin", scriptPath);

    await assertRejects(() => plugin.waitLoaded());
  });
});

Deno.test("Plugin: call wraps non-Error throws", async () => {
  await withTempDir(async (dir) => {
    const scriptPath = join(dir, "main.ts");
    await Deno.writeTextFile(scriptPath, `export async function main() {}`);

    const denovo = {
      dispatcher: {
        thrower: () => {
          throw "boom";
        },
      },
      context: {},
    } as unknown as Denovo;

    const plugin = new Plugin(denovo, "plugin", scriptPath);
    await plugin.waitLoaded();

    await assertRejects(
      () => plugin.call("thrower"),
      Error,
      "Failed to call 'thrower' API in 'plugin': boom",
    );

    await plugin.unload();
  });
});

Deno.test("Plugin: load from file URL with import map", async () => {
  await withTempDir(async (dir) => {
    const state: TestState = { loaded: 0, disposed: 0, urls: [] };
    setState(state);

    const depPath = join(dir, "dep.ts");
    const scriptPath = join(dir, "main.ts");
    const importMapPath = join(dir, "import_map.json");

    await Deno.writeTextFile(depPath, "export const value = 'url';\n");
    await Deno.writeTextFile(
      importMapPath,
      JSON.stringify({ imports: { dep: "./dep.ts" } }, null, 2),
    );
    await Deno.writeTextFile(
      scriptPath,
      `import { value } from "dep";
export async function main() {
  const state = globalThis.__denovoTest;
  state.value = value;
  return {
    [Symbol.asyncDispose]() {
      return Promise.resolve();
    },
  };
}
`,
    );

    const denovo = { dispatcher: {} } as Denovo;
    const cacheDir = join(dir, "deno_cache");
    const scriptUrl = toFileUrl(scriptPath).href;

    await withDenoDir(cacheDir, async () => {
      const plugin = new Plugin(denovo, "plugin", scriptUrl);
      await plugin.waitLoaded();
      assertEquals(state.value, "url");
      await plugin.unload();
    });
  });
});
