import { using } from "./deps.ts";
import { HostImpl } from "./host.ts";
import { Service } from "./service.ts";

/**
 * Start the server.
 */
export function start(
  zshSocketPath: string,
  denoSocketPath: string,
): void {
  const listener = Deno.listen({
    transport: "unix",
    path: denoSocketPath,
  });
  using(
    new HostImpl(listener, { transport: "unix", path: zshSocketPath }),
    (host) => {
      using(new Service(host), async () => {
        await host.waitClosed();
      });
    },
  );
}
