import { readAll } from "./deps.ts";
import { DENOVO_ZSH_SOCK } from "./settings.ts";

/**
 * Evaluate a zsh script and return the output as a stream.
 */
export async function evalZsh(
  script: string,
): Promise<string> {
  const socketPath = DENOVO_ZSH_SOCK;
  if (socketPath == null) {
    throw new Error("DENOVO_ZSH_SOCK is empty");
  }
  const conn = await Deno.connect({
    transport: "unix",
    path: socketPath,
  });
  try {
    await conn.write(new TextEncoder().encode(script));
    await conn.closeWrite();
    return new TextDecoder().decode(await readAll(conn));
  } finally {
    conn.close();
  }
}
