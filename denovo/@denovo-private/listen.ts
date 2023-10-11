import { using } from "./deps.ts";
import { HostImpl } from "./host.ts";
import { JsonOperatorSession } from "./json.ts";
import { Service } from "./service.ts";

/**
 * Start the server.
 */
export function start(
  zshSocketPath: string,
  denoSocketPath: string,
): Promise<void> {
  const listener = Deno.listen({
    transport: "unix",
    path: denoSocketPath,
  });
  return using(
    new HostImpl(listener, { transport: "unix", path: zshSocketPath }),
    (host) => {
      using(new Service(host), async () => {
        await host.waitClosed();
      });
    },
  );
}

export function startJsonServer(
  socketPath: string,
): Promise<void> {
  const listener = Deno.listen({
    transport: "unix",
    path: socketPath,
  });
  return using(
    new JsonOperatorSession(listener),
    async (session) => {
      await session.start();
    },
  );
}
