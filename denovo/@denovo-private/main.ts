import { ensure } from "@core/unknownutil/ensure";
import { asyncSignal } from "@milly/async-signal";
import { Zsh } from "./host/zsh.ts";
import { Service } from "./service.ts";
import { isMeta } from "./util.ts";
import { patchConsole } from "./console.ts";

async function main() {
  globalThis.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
    console.error(`Unhandled rejection:`, event.reason);
  });

  using sigintTrap = asyncSignal("SIGINT");

  await using host = new Zsh(Deno.stdin.readable, Deno.stdout.writable);
  const meta = ensure((await host.call("_denovo_meta")).output, isMeta);

  patchConsole(host, meta);

  await using service = new Service(meta);

  await host.init(service);

  await Promise.race([
    service.waitClosed(),
    host.waitClosed(),
    sigintTrap,
  ]);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    Deno.exit(1);
  });
}
