import { JsonParseStream, JsonStringifyStream, JsonValue } from "./deps.ts";
import * as jsonrpc from "./jsonrpc/mod.ts";
import { TextLineStream, toTransformStream } from "./deps.ts";
import { isNumber, isObject } from "./deps.ts";

export class Session {
  #reader: ReadableStream<Uint8Array>;
  #writer: WritableStream<Uint8Array>;
  onMessage: (message: jsonrpc.Request) => Promise<unknown> = async () => {};

  constructor(
    reader: ReadableStream<Uint8Array>,
    writer: WritableStream<Uint8Array>,
  ) {
    this.#reader = reader;
    this.#writer = writer;
  }

  /**
   * Accept connection
   */
  async process(): Promise<void> {
    await this.#reader
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeThrough(new JsonParseStream())
      .pipeThrough(toTransformStream(this.transform()))
      .pipeThrough(new JsonStringifyStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(this.#writer);
  }

  /**
   * Dispatch request and return response
   */
  async dispatch(request: jsonrpc.Request): Promise<jsonrpc.Response> {
    try {
      const result = await this.onMessage(request);
      if (!jsonrpc.isResponse(result)) {
        throw new Error("result is not Response");
      }
      result.id = request.id;
      return result;
    } catch (e) {
      return jsonrpc.NewError({
        error: {
          code: 500,
          message: "internal server error",
          data: e,
        },
      });
    }
  }

  /**
   * Notify request and return immediately
   */
  notify(request: jsonrpc.Request): void {
    this.dispatch(request);
  }

  /**
   * Transform stream
   */
  transform() {
    // `this` points to generator in generator function, so we need to alias it
    // deno-lint-ignore no-this-alias
    const session = this;
    return async function* (src: ReadableStream<JsonValue>) {
      for await (const chunk of src) {
        if (jsonrpc.isRequest(chunk)) {
          if (chunk.id == null) {
            session.notify(chunk);
          } else {
            yield await session.dispatch(chunk);
          }
        } else {
          if (isObject(chunk) && isNumber(chunk.id)) {
            yield { id: chunk.id, ...jsonrpc.ErrorInvalidRequest };
          } else {
            yield jsonrpc.ErrorInvalidRequest;
          }
        }
      }
    };
  }
}
