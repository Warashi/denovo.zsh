import { Invoker, isInvokerMethod } from "./invoker.ts";
import { Session } from "./session.ts";
import { NewError, NewSuccess, Response } from "./jsonrpc/mod.ts";
import { Disposable } from "./deps.ts";
import { evalZsh } from "./eval.ts";

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
   * Wait host closed
   */
  waitClosed(): Promise<void>;
}

export class HostImpl implements Host {
  #session: Session;
  #connectOptions: Deno.UnixConnectOptions;

  constructor(
    listener: Deno.Listener,
    opts: Deno.UnixConnectOptions,
  ) {
    this.#session = new Session(listener);
    this.#connectOptions = opts;
  }

  eval(expr: string): Promise<string> {
    return evalZsh(expr, this.#connectOptions);
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

  dispose(): void {
    // noop
  }

  async waitClosed(): Promise<void> {
    await this.#session.start();
  }
}
