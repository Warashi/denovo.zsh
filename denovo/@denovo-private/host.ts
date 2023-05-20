import type { Disposable } from "https://deno.land/x/disposable@v1.1.1/mod.ts#^";
import { Invoker, isInvokerMethod } from "./invoker.ts";
import { Session } from "./session.ts";
import { NewError, NewSuccess, Response } from "./jsonrpc/types.ts";
import { readAll } from "https://deno.land/std@0.188.0/streams/read_all.ts";

export interface Host extends Disposable {
  /**
   * evaluate shell expr and return stdout
   */
  eval(expr: string): Promise<string>;

  /**
   * Register invoker
   */
  register(invoker: Invoker): void;

  /**
   * Wait host close
   */
  waitClosed(): Promise<void>;
}

export class HostImpl implements Host {
  #waiter: Promise<void>;
  #session: Session;
  #connectOptions: Deno.UnixConnectOptions;

  constructor(
    reader: ReadableStream<Uint8Array>,
    writer: WritableStream<Uint8Array>,
    opts: Deno.UnixConnectOptions,
  ) {
    this.#session = new Session(reader, writer);
    this.#waiter = this.#session.start();
    this.#connectOptions = opts;
  }

  async eval(expr: string): Promise<string> {
    const conn = await Deno.connect(this.#connectOptions);
    await conn.write(new TextEncoder().encode(expr));
    await conn.closeWrite();
    return new TextDecoder().decode(await readAll(conn));
  }

  register(invoker: Invoker): Response {
    this.#session.onMessage = async (message) => {
      const { method, params } = message;
      if (!isInvokerMethod(method)) {
        return NewError({
          error: {
            code: 404,
            message: `Method '${method}' is not defined in the invoker`,
          },
        });
      }
      // deno-lint-ignore no-explicit-any
      return await (invoker[method] as any)(...params);
    };
    return NewSuccess({});
  }

  async waitClosed(): Promise<void> {
    await this.#waiter;
  }

  async dispose(): Promise<void> {
    await this.#session.shutdown();
    await this.waitClosed();
  }
}
