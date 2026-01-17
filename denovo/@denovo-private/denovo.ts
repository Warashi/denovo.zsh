import {
  BatchError,
  type Call,
  type CallResult,
  type Denovo,
  type Dispatcher,
  type Meta,
} from "@warashi/denovo-core";
import type { Host as HostOrigin } from "./host.ts";
import type { Service as ServiceOrigin } from "./service.ts";

export type Host = Pick<HostOrigin, "call" | "batch">;
export type Service = Pick<
  ServiceOrigin,
  "dispatch" | "waitLoaded" | "interrupted"
>;
export class DenovoImpl implements Denovo {
  readonly name: string;
  readonly meta: Meta;
  readonly context: Record<PropertyKey, unknown> = {};
  dispatcher: Dispatcher = {};

  #host: Host;
  #service: Service;

  constructor(
    name: string,
    meta: Meta,
    host: Host,
    service: Service,
  ) {
    this.name = name;
    this.meta = meta;
    this.#host = host;
    this.#service = service;
  }

  get interrupted(): AbortSignal | undefined {
    return this.#service.interrupted;
  }

  async call(fn: string, ...args: string[]): Promise<CallResult> {
    return await this.#host.call(fn, ...args);
  }

  async batch(...calls: Call[]): Promise<CallResult[]> {
    const [results, errmsg] = await this.#host.batch(...calls);
    if (errmsg !== "") {
      throw new BatchError(errmsg, results);
    }
    return results;
  }

  async dispatch(
    name: string,
    method: string,
    ...args: unknown[]
  ): Promise<unknown> {
    return await this.#service.dispatch(name, method, args);
  }
}
