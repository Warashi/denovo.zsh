import { DENOVO_ZSH_SOCK } from "./settings.ts";

/**
 * Evaluate a zsh script and return the output as a stream.
 */
export async function evalZsh(
  script: string,
): Promise<ReadableStream<Uint8Array>> {
  const socketPath = DENOVO_ZSH_SOCK;
  if (socketPath == null) {
    throw new Error("DENOVO_ZSH_SOCK is empty");
  }
  const conn = await Deno.connect({
    transport: "unix",
    path: socketPath,
  });
  await conn.write(new TextEncoder().encode(script));
  await conn.closeWrite();
  return conn.readable;
}
