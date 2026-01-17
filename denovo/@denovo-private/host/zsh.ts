import { type CallResult } from "@warashi/denovo-core";
import { ensure } from "@core/unknownutil/ensure";
import { isString } from "@core/unknownutil/is/string";
import { isArray } from "@core/unknownutil/is/array";
import { isArrayOf } from "@core/unknownutil/is/array-of";
import { Client, Session } from "@warashi/jsonrpc";
import { type Host, invoke, type Service } from "../host.ts";
import { isCallResult } from "../util.ts";

export class Zsh implements Host {
  #session: Session;
  #client: Client;
  #service?: Service;

  constructor(
    reader: ReadableStream<Uint8Array>,
    writer: WritableStream<Uint8Array>,
  ) {
    this.#session = new Session(reader, writer);

    this.#session.dispatcher = {
      void() {
        return Promise.resolve();
      },
      invoke: (method: unknown, args: unknown): Promise<unknown> => {
        if (!this.#service) {
          throw new Error("No service is registered in the host");
        }
        return invoke(
          this.#service,
          ensure(method, isString),
          ensure(args, isArray),
        );
      },
    };

    this.#session.onInvalidMessage = (message) => {
      console.error(`received invalid message ${JSON.stringify(message)}`);
    };

    this.#session.onMessageError = (error, message) => {
      if (error instanceof Error && error.name === "Interrupted") {
        return;
      }
      console.error(
        `Failed to handle message ${JSON.stringify(message)}`,
        error,
      );
    };

    this.#session.start();

    this.#client = new Client(this.#session);
  }

  async call(fn: string, ...args: unknown[]): Promise<CallResult> {
    return ensure(
      await this.#client.call("call_function", fn, ...args),
      isCallResult,
    );
  }

  async batch(
    ...calls: (readonly [string, ...unknown[]])[]
  ): Promise<[CallResult[], string]> {
    try {
      const result = ensure(
        await this.#client.call("batch_call_functions", calls),
        isArrayOf(isCallResult),
      );
      return [result, ""];
    } catch (error) {
      return [[], error instanceof Error ? error.message : String(error)];
    }
  }

  async notify(fn: string, ...args: unknown[]): Promise<void> {
    await this.#client.notify("call_function", fn, ...args);
  }

  init(service: Service): Promise<void> {
    this.#service = service;
    this.#service.bind(this);
    return Promise.resolve();
  }

  waitClosed(): Promise<void> {
    return this.#session.wait();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    try {
      await this.#session.shutdown();
    } catch {
      // Do nothing
    }
  }
}
