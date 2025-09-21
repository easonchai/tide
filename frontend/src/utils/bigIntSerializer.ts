/**
 * Recursively transforms any BigInt values in an object to strings
 *
 * @param data Any object or value that might contain BigInt values
 * @returns The same structure with all BigInt values converted to strings
 */
export function serializeBigInt<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "bigint") {
    return data.toString() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeBigInt(item)) as unknown as T;
  }

  if (typeof data === "object" && data.constructor === Object) {
    const result = {} as Record<string, unknown>;

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serializeBigInt((data as Record<string, unknown>)[key]);
      }
    }

    return result as unknown as T;
  }

  return data;
}

export const BIGINT_PREFIX = "__fs_bigint__";

export function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return `${BIGINT_PREFIX}${value.toString()}`;
  }
  return value;
}

export function bigIntReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && value.startsWith(BIGINT_PREFIX)) {
    const numericString = value.slice(BIGINT_PREFIX.length);
    try {
      return BigInt(numericString);
    } catch {
      return numericString;
    }
  }
  return value;
}

export function stringifyWithBigInt(data: unknown): string {
  return JSON.stringify(data, bigIntReplacer);
}

export function parseWithBigInt<T>(json: string): T {
  return JSON.parse(json, bigIntReviver) as T;
}
