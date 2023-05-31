import { readAll } from "./deps.ts";

/**
 * Evaluate a zsh script and return the output as a stream.
 */
export async function evalZsh(
  script: string,
  opts: Deno.UnixConnectOptions,
): Promise<string> {
  const conn = await Deno.connect(opts);
  try {
    await conn.write(new TextEncoder().encode(script));
    await conn.closeWrite();
    return new TextDecoder().decode(await readAll(conn));
  } finally {
    conn.close();
  }
}
