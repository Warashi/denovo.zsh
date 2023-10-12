import { JsonParseStream, JsonStringifyStream, JsonValue } from "./deps.ts";
import * as jsonrpc from "./jsonrpc/mod.ts";
import { TextLineStream, toTransformStream } from "./deps.ts";
import { is } from "./deps.ts";

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
      .pipeThrough(
        toTransformStream<JsonValue, jsonrpc.ResponseWithId>(this.transform),
      )
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
  async *transform(
    src: ReadableStream<JsonValue>,
  ): AsyncGenerator<jsonrpc.ResponseWithId, void, void> {
    for await (const chunk of src) {
      if (jsonrpc.isRequest(chunk)) {
        if (is.Undefined(chunk.id)) {
          this.notify(chunk);
        } else {
          const response = await this.dispatch(chunk);
          yield { id: chunk.id, ...response };
        }
      }
    }
  }
}
