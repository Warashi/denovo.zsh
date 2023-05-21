import {
  JsonParseStream,
  JsonStringifyStream,
  JsonValue,
} from "https://deno.land/std@0.188.0/json/mod.ts";
import { isRequest, isResponse, NewError, Request } from "./jsonrpc/types.ts";
import {
  TextLineStream,
  toTransformStream,
} from "https://deno.land/std@0.188.0/streams/mod.ts";
import { ErrorInvalidRequest } from "./jsonrpc/error.ts";
import {
  isNumber,
  isObject,
} from "https://deno.land/x/unknownutil@v2.1.1/is.ts";
import { assertLike } from "https://deno.land/x/unknownutil@v2.1.1/assert.ts";

export class Session {
  #reader: ReadableStream<Uint8Array>;
  #writer: WritableStream<Uint8Array>;

  onMessage: (message: Request) => Promise<unknown> = async () => {};

  constructor(
    reader: ReadableStream<Uint8Array>,
    writer: WritableStream<Uint8Array>,
  ) {
    this.#reader = reader;
    this.#writer = writer;
  }

  async start(): Promise<void> {
    await this.#reader
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeThrough(new JsonParseStream())
      .pipeThrough(toTransformStream(this.transform()))
      .pipeThrough(new JsonStringifyStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(this.#writer);
  }

  transform() {
    // deno-lint-ignore no-this-alias
    const session = this;
    return async function* (src: ReadableStream<JsonValue>) {
      for await (const chunk of src) {
        if (!isRequest(chunk)) {
          if (isObject(chunk) && isNumber(chunk.id)) {
            yield { id: chunk.id, ...ErrorInvalidRequest };
          } else {
            yield ErrorInvalidRequest;
          }
        } else {
          try {
            const result = await session.onMessage(chunk);
            if (!isResponse(result)) {
              throw new Error("result is not Response");
            }
            result.id = chunk.id;
            yield result;
          } catch (e) {
            yield NewError({
              error: {
                code: 500,
                message: "internal server error",
                data: e,
              },
            });
          }
        }
        return;
      }
    };
  }

  async shutdown() {
    await this.#reader.cancel();
  }
}
