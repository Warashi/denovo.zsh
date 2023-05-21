import { Service } from "./service.ts";
import { Meta } from "../@denovo/mod.ts";
import { NewSuccess, Response } from "./jsonrpc/mod.ts";

export type RegisterOptions = {
  /**
   * The behavior of register when the plugin is already registered.
   *
   * reload:  Reload the plugin
   * skip:    Skip registration
   * error:   Throw an error
   */
  mode?: "reload" | "skip" | "error";
};

export type ReloadOptions = {
  /**
   * The behavior of reload when the plugin is not registered yet.
   *
   * skip:    Skip reload
   * error:   Throw an error
   */
  mode?: "skip" | "error";
};

export class Invoker {
  #service: Service;

  constructor(service: Service) {
    this.#service = service;
  }

  pid(): Response {
    return NewSuccess({ result: Deno.pid });
  }

  register(
    name: string,
    script: string,
    meta: Meta,
    options: RegisterOptions,
  ): Response {
    return this.#service.register(name, script, meta, options);
  }

  reload(
    name: string,
    meta: Meta,
    options: ReloadOptions,
  ): Response {
    return this.#service.reload(name, meta, options);
  }

  dispatch(name: string, fn: string, ...args: unknown[]): Promise<Response> {
    return this.#service.dispatch(name, fn, args);
  }
}

export function isInvokerMethod(value: string): value is keyof Invoker {
  return value in Invoker.prototype;
}
