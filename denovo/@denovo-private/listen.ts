import { using } from "https://deno.land/x/disposable@v1.1.1/mod.ts#^";
import { HostImpl } from "./host.ts";
import { Service } from "./service.ts";
import { DENOVO_ZSH_SOCK } from "./settings.ts";

export async function listen(socketPath: string): Promise<void> {
  const listener = Deno.listen({
    transport: "unix",
    path: socketPath,
  });
  for await (const conn of listener) {
    handle(conn).catch((err) => console.error("Unexpected error", err));
  }
}

async function handle(conn: Deno.Conn): Promise<void> {
  const socketPath = DENOVO_ZSH_SOCK;
  if (socketPath == null) {
    throw new Error("env:DENOVO_ZSH_SOCK is empty");
  }

  const reader = conn.readable;
  const writer = conn.writable;

  await using(
    new HostImpl(reader, writer, { transport: "unix", path: socketPath }),
    async (host) => {
      await using(new Service(host), async () => {
        await new Promise(() => {});
      });
    },
  );
}
