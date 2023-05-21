import { JsonParseStream, JsonStringifyStream, JsonValue } from "./deps.ts";
import * as jsonrpc from "./jsonrpc/mod.ts";
import { TextLineStream, toTransformStream } from "./deps.ts";
import { isNumber, isObject } from "./deps.ts";

export class Session {
  #listener: Deno.Listener;
  onMessage: (message: jsonrpc.Request) => Promise<unknown> = async () => {};

  constructor(
    listener: Deno.Listener,
  ) {
    this.#listener = listener;
  }

  async start(): Promise<void> {
    for await (const conn of this.#listener) {
      this.accept(conn).catch((err) => console.error("Unexpected error", err));
    }
  }

  async accept(conn: Deno.Conn): Promise<void> {
    await conn.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeThrough(new JsonParseStream())
      .pipeThrough(toTransformStream(this.transform()))
      .pipeThrough(new JsonStringifyStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(conn.writable);
  }

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

  async notify(request: jsonrpc.Request): Promise<void> {
    await this.dispatch(request);
  }

  transform() {
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
        return;
      }
    };
  }
}
