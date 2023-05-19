export interface Dispatcher {
  [key: string]: (...args: unknown[]) => unknown;
}

export interface Meta {
  readonly mode: "release" | "debug" | "test";
  readonly version: string;
  readonly platform: "windows" | "mac" | "linux";
}

export interface Denovo {
  readonly name: string;
  readonly meta: Meta;
  dispatcher: Dispatcher;
  eval(script: string): Promise<ReadableStream<Uint8Array>>;
  dispatch(name: string, fn: string, ...args: unknown[]): Promise<unknown>;
}
