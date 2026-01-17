import type { Denovo, Entrypoint } from "@warashi/denovo-core";
import {
  type ImportMap,
  ImportMapImporter,
  isImportMap,
  loadImportMap,
} from "@lambdalisue/import-map-importer";
import { ensure } from "@core/unknownutil";
import { toFileUrl } from "@std/path/to-file-url";
import { fromFileUrl } from "@std/path/from-file-url";
import { join } from "@std/path/join";
import { dirname } from "@std/path/dirname";
import { parse as parseJsonc } from "@std/jsonc";

type PluginModule = {
  main: Entrypoint;
};

export class Plugin {
  #denovo: Denovo;
  #loadedWaiter: Promise<void>;
  #unloadedWaiter?: Promise<void>;
  #disposable: AsyncDisposable = voidAsyncDisposable;

  readonly name: string;
  readonly script: string;

  constructor(denovo: Denovo, name: string, script: string) {
    this.#denovo = denovo;
    this.name = name;
    this.script = resolveScriptUrl(script);
    this.#loadedWaiter = this.#load();
  }

  waitLoaded(): Promise<void> {
    return this.#loadedWaiter;
  }

  async #load(): Promise<void> {
    try {
      const mod: PluginModule = await importPlugin(this.script);
      this.#disposable = await mod.main(this.#denovo) ?? voidAsyncDisposable;
    } catch (e) {
      console.error(`Failed to load plugin '${this.name}': ${e}`);
      throw e;
    }
  }

  unload(): Promise<void> {
    if (!this.#unloadedWaiter) {
      this.#unloadedWaiter = this.#unload();
    }
    return this.#unloadedWaiter;
  }

  async #unload(): Promise<void> {
    try {
      // Wait for the load to complete to make the events atomically.
      await this.#loadedWaiter;
    } catch {
      // Load failed, do nothing
      return;
    }
    const disposable = this.#disposable;
    this.#disposable = voidAsyncDisposable;
    try {
      await disposable[Symbol.asyncDispose]();
    } catch (e) {
      console.error(`Failed to unload plugin '${this.name}': ${e}`);
      return;
    }
  }

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    try {
      return await this.#denovo.dispatcher[fn](...args);
    } catch (err) {
      const errMsg = err instanceof Error
        ? err.stack ?? err.message // Prefer 'stack' if available
        : String(err);
      throw new Error(
        `Failed to call '${fn}' API in '${this.name}': ${errMsg}`,
      );
    }
  }
}

const voidAsyncDisposable = {
  [Symbol.asyncDispose]: () => Promise.resolve(),
} as const satisfies AsyncDisposable;

const loadedScripts = new Set<string>();

function createScriptSuffix(script: string): string {
  const suffix = loadedScripts.has(script) ? `#${performance.now()}` : "";
  loadedScripts.add(script);
  return suffix;
}

function resolveScriptUrl(script: string): string {
  try {
    return toFileUrl(script).href;
  } catch {
    return new URL(script, import.meta.url).href;
  }
}

async function tryLoadImportMap(
  script: string,
): Promise<ImportMap | undefined> {
  if (script.startsWith("http://") || script.startsWith("https://")) {
    // We cannot load import maps for remote scripts
    return undefined;
  }
  const PATTERNS = [
    "deno.json",
    "deno.jsonc",
    "import_map.json",
    "import_map.jsonc",
  ];
  // Convert file URL to path for file operations
  const scriptPath = script.startsWith("file://")
    ? fromFileUrl(new URL(script))
    : script;
  const parentDir = dirname(scriptPath);
  for (const pattern of PATTERNS) {
    const importMapPath = join(parentDir, pattern);
    try {
      return await loadImportMap(importMapPath, {
        loader: (path: string) => {
          const content = Deno.readTextFileSync(path);
          return ensure(parseJsonc(content), isImportMap);
        },
      });
    } catch (err: unknown) {
      if (err instanceof Deno.errors.NotFound) {
        // Ignore NotFound errors and try the next pattern
        continue;
      }
      throw err; // Rethrow other errors
    }
  }
  return undefined;
}

async function importPlugin(script: string): Promise<PluginModule> {
  const suffix = createScriptSuffix(script);
  const importMap = await tryLoadImportMap(script);
  if (importMap) {
    const importer = new ImportMapImporter(importMap);
    return await importer.import<PluginModule>(`${script}${suffix}`);
  } else {
    return await import(`${script}${suffix}`);
  }
}
