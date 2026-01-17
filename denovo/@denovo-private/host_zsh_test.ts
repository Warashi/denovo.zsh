import { assert, assertEquals } from "@std/assert";
import { Client, Session } from "@warashi/jsonrpc";
import { Zsh } from "./host/zsh.ts";

function createDuplexPair() {
  const aToB = new TransformStream<Uint8Array, Uint8Array>();
  const bToA = new TransformStream<Uint8Array, Uint8Array>();
  return {
    a: { readable: bToA.readable, writable: aToB.writable },
    b: { readable: aToB.readable, writable: bToA.writable },
  };
}

async function withServer<T>(
  handler: (ctx: {
    zsh: Zsh;
    serverSession: Session;
    serverClient: Client;
  }) => Promise<T>,
): Promise<T> {
  const { a, b } = createDuplexPair();
  const originalPipeTo = ReadableStream.prototype.pipeTo;
  ReadableStream.prototype.pipeTo = function (
    destination: WritableStream<Uint8Array>,
    options?: StreamPipeOptions,
  ) {
    if (destination === Deno.stderr.writable) {
      return originalPipeTo.call(this, destination, {
        ...options,
        preventClose: true,
      });
    }
    return originalPipeTo.call(this, destination, options);
  };
  let zsh: Zsh;
  try {
    zsh = new Zsh(a.readable, a.writable);
  } finally {
    ReadableStream.prototype.pipeTo = originalPipeTo;
  }
  const serverSession = new Session(b.readable, b.writable);
  const invalidWriter = b.writable.getWriter();
  const invalidPayload = JSON.stringify({ foo: "bar" }) + "\n";
  await invalidWriter.write(new TextEncoder().encode(invalidPayload));
  invalidWriter.releaseLock();
  serverSession.start();
  const serverClient = new Client(serverSession);

  try {
    return await handler({
      zsh,
      serverSession,
      serverClient,
    });
  } finally {
    const waitClosed = zsh.waitClosed();
    await serverSession.shutdown();
    try {
      await serverSession.wait();
    } catch {
      // Ignore already stopped sessions
    }
    try {
      await b.writable.abort();
    } catch {
      // Ignore locked or already closed stream
    }
    await zsh[Symbol.asyncDispose]();
    await waitClosed;
  }
}

Deno.test("Zsh: session behavior", async (t) => {
  await withServer(async ({ zsh, serverSession, serverClient }) => {
    await t.step("call/batch/notify", async () => {
      const notifyWaiter = Promise.withResolvers<void>();
      serverSession.dispatcher = {
        call_function: (...args: unknown[]) => {
          const [fn, ...rest] = args as [string, ...unknown[]];
          if (fn === "notify") {
            notifyWaiter.resolve();
          }
          return { exit_code: 0, output: [fn, rest] };
        },
        batch_call_functions: (...args: unknown[]) => {
          const [calls] = args as [(readonly [string, ...unknown[]])[]];
          return calls.map(([fn, ...rest]) => ({
            exit_code: 0,
            output: [fn, rest],
          }));
        },
      };

      assertEquals(await zsh.call("fn", "a"), {
        exit_code: 0,
        output: ["fn", ["a"]],
      });

      assertEquals(await zsh.batch(["fn", "a"], ["fn2"]), [
        [
          { exit_code: 0, output: ["fn", ["a"]] },
          { exit_code: 0, output: ["fn2", []] },
        ],
        "",
      ]);

      await zsh.notify("notify", "ping");
      await notifyWaiter.promise;
    });

    await t.step("batch error", async () => {
      serverSession.dispatcher = {
        batch_call_functions: () => {
          throw new Error("boom");
        },
        call_function: () => ({ exit_code: 0, output: "ok" }),
      };

      const [results, error] = await zsh.batch(["fn"]);
      assertEquals(results, []);
      assert(error.length > 0);
    });

    await t.step("invoke", async () => {
      await serverClient.notify("void");

      const calls: Array<{ name: string; args: unknown[] }> = [];
      const service = {
        bind: () => {},
        load: (name: string, script: string) => {
          calls.push({ name: "load", args: [name, script] });
          return Promise.resolve();
        },
        unload: (name: string) => {
          calls.push({ name: "unload", args: [name] });
          return Promise.resolve();
        },
        reload: (name: string) => {
          calls.push({ name: "reload", args: [name] });
          return Promise.resolve();
        },
        interrupt: (reason?: unknown) => {
          calls.push({ name: "interrupt", args: [reason] });
        },
        dispatch: (name: string, fn: string, args: unknown[]) => {
          calls.push({ name: "dispatch", args: [name, fn, args] });
          if (fn === "interrupt") {
            const err = new Error("interrupted");
            err.name = "Interrupted";
            throw err;
          }
          if (fn === "fail") {
            throw new Error("dispatch failed");
          }
          return Promise.resolve("ok");
        },
        close: () => {
          calls.push({ name: "close", args: [] });
          return Promise.resolve();
        },
      };

      let rejected = false;
      try {
        await serverClient.call("invoke", "load", ["name", "script"]);
      } catch {
        rejected = true;
      }
      assert(rejected);

      await zsh.init(service);

      assertEquals(
        await serverClient.call("invoke", "dispatch", ["name", "fn", []]),
        "ok",
      );
      await serverClient.call("invoke", "dispatch", ["name", "interrupt", []])
        .catch(() => {});
      await serverClient.call("invoke", "dispatch", ["name", "fail", []]).catch(
        () => {},
      );

      assertEquals(calls.map((call) => call.name), [
        "dispatch",
        "dispatch",
        "dispatch",
      ]);
    });
  });
});
