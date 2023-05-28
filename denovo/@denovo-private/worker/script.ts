import {
  assertObject,
  assertString,
  ensureString,
  isObject,
  isString,
} from "../deps.ts";
import { Client, Session } from "../deps.ts";
import { readableStreamFromWorker, writableStreamFromWorker } from "../deps.ts";
import { Denovo, Meta } from "../../@denovo/mod.ts";
import { DenovoImpl } from "../impl.ts";
import { patchConsole } from "./patch_console.ts";

const worker = self as unknown as Worker & { name: string };

async function main(
  scriptUrl: string,
  directory: string,
  meta: Meta,
  config: unknown,
): Promise<void> {
  const session = new Session(
    readableStreamFromWorker(worker),
    writableStreamFromWorker(worker),
  );
  session.onMessageError = (error, message) => {
    if (error instanceof Error && error.name === "Interrupted") {
      return;
    }
    console.error(`Failed to handle message ${message}`, error);
  };
  session.start();
  const client = new Client(session);
  // Protect the process itself from "Unhandled promises"
  globalThis.addEventListener("unhandledrejection", (ev) => {
    let { reason } = ev;
    if (reason instanceof Error && reason.stack) {
      reason = reason.stack;
    }
    console.error(
      `Unhandled rejection is detected. Worker will be reloaded: ${reason}`,
    );
    // Reload the worker because "Unhandled promises" error occured.
    client.notify("reload");
    // Avoid process death
    ev.preventDefault();
  });
  const denovo: Denovo = new DenovoImpl(
    worker.name,
    directory,
    meta,
    config,
    {
      get dispatcher() {
        return session.dispatcher;
      },
      set dispatcher(dispatcher) {
        session.dispatcher = dispatcher;
      },
      call(method: string, ...params: unknown[]): Promise<unknown> {
        return client.call(method, ...params);
      },
      async eval(expr: string): Promise<string> {
        return ensureString(await client.call("eval", expr));
      },
    },
  );
  try {
    // Import module with fragment so that reload works properly
    const mod = await import(`${scriptUrl}#${performance.now()}`);
    await mod.main(denovo);
    await session.wait();
  } catch (e) {
    console.error(e);
    await session.shutdown();
  }
  self.close();
}

function isMeta(v: unknown): v is Meta {
  if (!isObject(v)) {
    return false;
  }
  if (!isString(v.mode) || !["release", "debug", "test"].includes(v.mode)) {
    return false;
  }
  if (!isString(v.version)) {
    return false;
  }
  if (
    !isString(v.platform) || !["windows", "mac", "linux"].includes(v.platform)
  ) {
    return false;
  }
  return true;
}

// Patch console with worker name for easy debugging
patchConsole(`(${worker.name})`);

// Wait startup arguments and start 'main'
worker.addEventListener("message", (event: MessageEvent<unknown>) => {
  assertObject(event.data);
  assertString(event.data.scriptUrl);
  assertString(event.data.directory);
  if (!isMeta(event.data.meta)) {
    throw new Error(`Invalid 'meta' is passed: ${event.data.meta}`);
  }
  const { scriptUrl, directory, meta, config } = event.data;
  main(scriptUrl, directory, meta, config).catch((e) => {
    console.error(
      `Unexpected error occurred in '${scriptUrl}': ${e}`,
    );
  });
}, { once: true });
