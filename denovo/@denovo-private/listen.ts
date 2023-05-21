import { using } from "./deps.ts";
import { HostImpl } from "./host.ts";
import { Service } from "./service.ts";

export async function start(
  zshSocketPath: string,
  denoSocketPath: string,
): Promise<void> {
  const listener = Deno.listen({
    transport: "unix",
    path: denoSocketPath,
  });
  await using(
    new HostImpl(listener, { transport: "unix", path: zshSocketPath }),
    async (host) => {
      await using(new Service(host), async () => {
        await host.waitClosed()
      });
    },
  );
}
