import { Response } from "./types.ts";

type Method = (id?: number, ...args: unknown[]) => Promise<Response>;
type Methods = Record<string, Method>;
const methods: Methods = {};

export function register(
  name: string,
  fn: Method,
) {
  methods[name] = fn;
}

export async function invoke(
  name: string,
  id?: number,
  ...args: unknown[]
): Promise<Response> {
  const fn = methods[name];
  if (fn === null || fn === undefined) {
    return {
      jsonrpc: "2.0",
      id: id,
      error: {
        code: -32601,
        message: "Method not found",
        data: { "method": name },
      },
    };
  }
  return await methods[name](id, ...args);
}
