import { Denovo, Dispatcher, Meta } from "../@denovo/mod.ts";

export interface Session {
  /**
   * The dispatcher to use for calls.
   */
  dispatcher: Dispatcher;

  /**
   * Evaluate a shell expression in the session.
   */
  eval(expr: string): Promise<string>;

  /**
   * Call a method on the session.
   */
  call(method: string, ...params: unknown[]): Promise<unknown>;
}

export class DenovoImpl implements Denovo {
  readonly name: string;
  readonly directory: string;
  readonly meta: Meta;
  readonly config: unknown;
  #sesssion: Session;

  constructor(
    name: string,
    directory: string,
    meta: Meta,
    config: unknown,
    session: Session,
  ) {
    this.name = name;
    this.directory = directory;
    this.meta = meta;
    this.config = config;
    this.#sesssion = session;
  }

  get dispatcher(): Dispatcher {
    return this.#sesssion.dispatcher;
  }

  set dispatcher(dispatcher: Dispatcher) {
    this.#sesssion.dispatcher = dispatcher;
  }

  async eval(expr: string): Promise<string> {
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
