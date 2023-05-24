export interface Dispatcher {
  [key: string]: (...args: unknown[]) => unknown;
}

export interface Meta {
  /**
   * application mode
   */
  readonly mode: "release" | "debug" | "test";

  /**
   * zsh version
   */
  readonly version: string;

  /**
   * host platform
   */
  readonly platform: "windows" | "mac" | "linux" | "unknown";
}

export interface Denovo {
  /**
   * plugin name
   */
  readonly name: string;

  /**
   * meta information
   */
  readonly meta: Meta;

  /**
   * plugin-specific configuration
   */
  readonly config: unknown;

  /**
   * dispatcher registered by plugin
   */
  dispatcher: Dispatcher;

  /**
   * eval script in zsh
   *
   * @param script script to eval
   */
  eval(script: string): Promise<string>;

  /**
   * dispatch function to other plugins
   *
   * @param name plugin name
   * @param fn function name
   * @param args function arguments
   */
  dispatch(name: string, fn: string, ...args: unknown[]): Promise<unknown>;
}
