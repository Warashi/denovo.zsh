import { Denovo, Dispatcher, Meta } from "../@denovo/mod.ts";

export interface Session {
  dispatcher: Dispatcher;
  eval(expr: string): Promise<ReadableStream<Uint8Array>>;
  call(method: string, ...params: unknown[]): Promise<unknown>;
}

export class DenovoImpl implements Denovo {
  readonly name: string;
  readonly meta: Meta;
  #sesssion: Session;

  constructor(
    name: string,
    meta: Meta,
    session: Session,
  ) {
    this.name = name;
    this.meta = meta;
    this.#sesssion = session;
  }

  get dispatcher(): Dispatcher {
    return this.#sesssion.dispatcher;
  }

  set dispatcher(dispatcher: Dispatcher) {
    this.#sesssion.dispatcher = dispatcher;
  }

  async eval(expr: string): Promise<ReadableStream<Uint8Array>> {
    return await this.#sesssion.eval(expr);
  }

  async dispatch(
    name: string,
    fn: string,
    ...args: unknown[]
  ): Promise<unknown> {
    return await this.#sesssion.call("dispatch", name, fn, ...args);
  }
}
