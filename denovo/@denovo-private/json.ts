import {
  JsonStringifyStream,
  TextLineStream,
  toTransformStream,
} from "./deps.ts";

export class JsonOperatorSession {
  #listener: Deno.Listener;

  constructor(listener: Deno.Listener) {
    this.#listener = listener;
  }

  dispose(): void {
    this.#listener.close();
  }

  /**
   * Start session
   */
  async start(): Promise<void> {
    for await (const conn of this.#listener) {
      this.accept(conn).catch((err) => {
        if (err instanceof Deno.errors.BadResource) {
          // ignore BadResource because it occurs when the listener is closed
          return;
        }
        console.log(err);
      });
    }
  }

  /**
   * Accept connection
   */
  async accept(conn: Deno.Conn): Promise<void> {
    await conn.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeThrough(toTransformStream(this.transform()))
      .pipeThrough(new JsonStringifyStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(conn.writable);
  }

  /**
   * Transform stream
   */
  transform() {
    return async function* (src: ReadableStream<string>) {
      let next: "key" | "type" | "value" = "key";
      const object: Record<string, string | number | boolean | null> = {};
      let currentKey = "";
      let currentType = "";
      for await (const chunk of src) {
        switch (next) {
          case "key":
            if (chunk === "") {
              yield object;
              return; // we serve only one object for one connection
            }
            next = "type";
            currentKey = chunk;
            break;
          case "type":
            if (currentKey === "") {
              throw new Error("unreachable");
            }
            if (chunk === "null") {
              object[currentKey] = null;
              next = "key";
              break;
            }
            next = "value";
            currentType = chunk;
            break;
          case "value":
            if (currentKey === "" || currentType === "") {
              throw new Error("unreachable");
            }
            next = "type";
            switch (currentType) {
              case "string":
                object[currentKey] = chunk;
                break;
              case "number":
                object[currentKey] = parseFloat(chunk);
                break;
              case "boolean":
                object[currentKey] = chunk === "true";
                break;
            }
            break;
        }
      }
    };
  }
}
