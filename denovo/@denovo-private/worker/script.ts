import {
  assertObject,
  assertString,
  isObject,
  isString,
} from "https://deno.land/x/unknownutil@v2.1.1/mod.ts#^";
import {
  Client,
  Session,
} from "https://deno.land/x/messagepack_rpc@v1.0.0/mod.ts#^";
import {
  readableStreamFromWorker,
  writableStreamFromWorker,
} from "https://deno.land/x/workerio@v3.1.0/mod.ts#^";
import type { Denovo, Meta } from "../../@denovo/mod.ts";
import { DenovoImpl } from "../impl.ts";
import { patchConsole } from "./patch_console.ts";

const worker = self as unknown as Worker & { name: string };

async function main(
  scriptUrl: string,
  meta: Meta,
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
  const denovo: Denovo = new DenovoImpl(worker.name, meta, {
    get dispatcher() {
      return session.dispatcher;
    },
    set dispatcher(dispatcher) {
      session.dispatcher = dispatcher;
    },
    call(method: string, ...params: unknown[]): Promise<unknown> {
      return client.call(method, ...params);
    },
    async eval(expr: string): Promise<ReadableStream<Uint8Array>> {
      return await client.call("eval", expr) as ReadableStream<Uint8Array>;
    },
  });
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
  let meta: Meta;
  if (isMeta(event.data.meta)) {
    meta = event.data.meta;
  } else {
    meta = { mode: "debug", version: "", platform: "mac" }; // TODO
  }
  const { scriptUrl } = event.data;
  main(scriptUrl, meta).catch((e) => {
    console.error(
      `Unexpected error occurred in '${scriptUrl}': ${e}`,
    );
  });
}, { once: true });
