import { JsonValue, TextLineStream, toTransformStream } from "./deps.ts";

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
      });
    }
  }

  /**
   * Accept connection
   */
  private async accept(conn: Deno.Conn): Promise<void> {
    await conn.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeThrough(toTransformStream(this.transform()))
      .pipeThrough(new TextEncoderStream())
      .pipeTo(conn.writable);
  }

  /**
   * Transform stream
   */
  private transform() {
    return async function* (src: ReadableStream<string>) {
      const values = src.values();
      const asyncIterable: AsyncIterable<string> = {
        [Symbol.asyncIterator](): AsyncIterator<string> {
          return {
            async next() {
              const v = await values.next();
              return v;
            },
            return(_: string) {
              return Promise.resolve({ value: "", done: false });
            },
          };
        },
      };
      for await (const chunk of asyncIterable) {
        switch (chunk) {
          case "construct-json":
            yield await constructJson(asyncIterable);
            return;
          case "query-json":
            yield await queryJson(asyncIterable);
            return;
          case "unquote-json":
            yield await unquoteJson(asyncIterable);
            return;
          default:
            throw new Error(`unknown command: ${chunk}`);
        }
      }
    };
  }
}

async function unquoteJson(src: AsyncIterable<string>): Promise<string> {
  for await (const chunk of src) {
    const object = JSON.parse(chunk);
    switch (typeof object) {
      case "string":
        return object;
      default:
        return JSON.stringify(object);
    }
  }
  throw new Error("unreachable unquoteJson");
}

async function queryJson(src: AsyncIterable<string>): Promise<string> {
  let field = undefined;
  for await (const chunk of src) {
    if (field === undefined) {
      field = chunk;
      continue;
    }
    const object = JSON.parse(chunk);
    switch (typeof object) {
      case "object":
        return JSON.stringify(object[field]);
      default:
        return JSON.stringify(null);
    }
  }
  throw new Error("unreachable queryJson");
}

async function constructJson(src: AsyncIterable<string>): Promise<string> {
  const parser = new Parser(src);
  const object = await parser.parse();
  return JSON.stringify(object);
}

class Parser {
  private src: AsyncIterable<string>;

  constructor(src: AsyncIterable<string>) {
    this.src = src;
  }

  parse(): Promise<JsonValue> {
    return this.parseValue();
  }

  private async parseObject(): Promise<Record<string, JsonValue>> {
    const object: Record<string, JsonValue> = {};
    for await (const chunk of this.src) {
      switch (chunk) {
        case "":
          continue;
        case "object-end":
          return object;
        default:
          object[chunk] = await this.parseValue();
      }
    }
    throw new Error("unreachable parseObject");
  }

  private async parseArray(): Promise<JsonValue[]> {
    const array: JsonValue[] = [];
    for await (const chunk of this.src) {
      switch (chunk) {
        case "":
          continue;
        case "array-end":
          return array;
        default:
          array.push(await this.parseValue(chunk));
      }
    }
    throw new Error("unreachable parseArray");
  }

  private async parseValue(type?: string): Promise<JsonValue> {
    if (type) {
      return this.parseValueSwitch(type);
    }
    for await (const chunk of this.src) {
      return this.parseValueSwitch(chunk);
    }
    throw new Error("unreachable parseValue");
  }

  private parseValueSwitch(type: string): Promise<JsonValue> {
    switch (type) {
      case "null":
        return this.parseNull();
      case "string":
        return this.parseString();
      case "number":
        return this.parseNumber();
      case "boolean":
        return this.parseBoolean();
      case "array-start":
        return this.parseArray();
      case "object-start":
        return this.parseObject();
      default:
        throw new Error(`unknown type: ${type}`);
    }
  }

  private async parseString(): Promise<string> {
    for await (const chunk of this.src) {
      return chunk;
    }
    throw new Error("unreachable parseString");
  }

  private async parseNumber(): Promise<number> {
    for await (const chunk of this.src) {
      return parseFloat(chunk);
    }
    throw new Error("unreachable parseNumber");
  }

  private async parseBoolean(): Promise<boolean> {
    for await (const chunk of this.src) {
      return chunk === "true";
    }
    throw new Error("unreachable parseBoolean");
  }

  private parseNull(): Promise<null> {
    return Promise.resolve(null);
  }
}
