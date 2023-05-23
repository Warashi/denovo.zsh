import { toFileUrl } from "./deps.ts";
import { assertArray, assertString } from "./deps.ts";
import { Client, Session } from "./deps.ts";
import { readableStreamFromWorker, writableStreamFromWorker } from "./deps.ts";
import { Disposable } from "./deps.ts";
import { Host } from "./host.ts";
import { Invoker, RegisterOptions, ReloadOptions } from "./invoker.ts";
import { Meta } from "../@denovo/mod.ts";
import { NewError, NewSuccess, Response } from "./jsonrpc/mod.ts";

const workerScript = "./worker/script.ts";

/**
 * Plugin information
 */
type Plugin = {
  /**
   * plugin script url
   */
  script: string;
  
  /**
   * plugin worker
   */
  worker: Worker;

  /**
   * msgpack rpc session
   */
  session: Session;
  
  /**
   * msgpack rpc client
   */
  client: Client;
};

/**
 * Core functionality of denovo service
 */
export class Service implements Disposable {
  #plugins: Map<string, Plugin>;
  host: Host;

  constructor(host: Host) {
    this.#plugins = new Map();
    this.host = host;
    this.host.register(new Invoker(this));
  }

  /**
   * Register a plugin
   */
  register(
    name: string,
    script: string,
    meta: Meta,
    options: RegisterOptions,
  ): Response {
    const plugin = this.#plugins.get(name);
    if (plugin) {
      if (options.mode === "reload") {
        if (meta.mode === "debug") {
          console.log(
            `A denovo plugin '${name}' is already registered. Reload`,
          );
        }
        plugin.worker.terminate();
      } else if (options.mode === "skip") {
        if (meta.mode === "debug") {
          console.log(`A denovo plugin '${name}' is already registered. Skip`);
        }
        return NewSuccess({});
      } else {
        return NewError({
          error: {
            code: 400,
            message: `A denovo plugin '${name}' is already registered`,
          },
        });
      }
    }
    const worker = new Worker(
      new URL(workerScript, import.meta.url).href,
      {
        name,
        type: "module",
      },
    );
    const scriptUrl = resolveScriptUrl(script);
    worker.postMessage({ scriptUrl, meta });
    const session = buildServiceSession(
      name,
      meta,
      readableStreamFromWorker(worker),
      writableStreamFromWorker(worker),
      this,
    );
    this.#plugins.set(name, {
      script,
      worker,
      session,
      client: new Client(session),
    });
    return NewSuccess({});
  }

  /**
   * Reload a plugin
   */
  reload(
    name: string,
    meta: Meta,
    options: ReloadOptions,
  ): Response {
    const plugin = this.#plugins.get(name);
    if (!plugin) {
      if (options.mode === "skip") {
        if (meta.mode === "debug") {
          console.log(`A denovo plugin '${name}' is not registered yet. Skip`);
        }
        return NewSuccess({});
      } else {
        return NewError({
          error: {
            code: 404,
            message: `A denovo plugin '${name}' is not registered yet`,
          },
        });
      }
    }
    this.register(name, plugin.script, { ...meta, mode: "release" }, {
      mode: "reload",
    });
    return NewSuccess({});
  }

  /**
   * Dispatch a function call to a plugin
   */
  async dispatch(name: string, fn: string, args: unknown[]): Promise<Response> {
    try {
      const plugin = this.#plugins.get(name);
      if (!plugin) {
        return NewError({
          error: {
            code: 404,
            message: `No plugin '${name}' is registered`,
          },
        });
      }
      const result = await plugin.client.call(fn, ...args);
      return NewSuccess({ result });
    } catch (e) {
      return NewError({
        error: {
          code: 500,
          message: `${e.stack ?? e.toString()}`,
        },
      });
    }
  }

  /**
   * Dispose the service
   */
  dispose(): void {
    // Dispose all sessions
    for (const plugin of this.#plugins.values()) {
      plugin.session.shutdown();
    }
    // Terminate all workers
    for (const plugin of this.#plugins.values()) {
      plugin.worker.terminate();
    }
  }
}

/**
 * Build a service session
 * this session receive request from plugin worker, and send response back
 */
function buildServiceSession(
  name: string,
  meta: Meta,
  reader: ReadableStream<Uint8Array>,
  writer: WritableStream<Uint8Array>,
  service: Service,
) {
  const session = new Session(reader, writer);
  session.onMessageError = (error, message) => {
    if (error instanceof Error && error.name === "Interrupted") {
      return;
    }
    console.error(`Failed to handle message ${message}`, error);
  };
  session.dispatcher = {
    reload: () => {
      service.reload(name, meta, {
        mode: "skip",
      });
      return Promise.resolve();
    },

    dispatch: async (name, fn, ...args) => {
      assertString(name);
      assertString(fn);
      assertArray(args);
      return await service.dispatch(name, fn, args);
    },

    eval: async (expr) => {
      assertString(expr);
      return await service.host.eval(expr);
    },
  };
  session.start();
  return session;
}

/**
 * Resolve a script url
 */
function resolveScriptUrl(script: string): string {
  try {
    return toFileUrl(script).href;
  } catch {
    return new URL(script, import.meta.url).href;
  }
}
