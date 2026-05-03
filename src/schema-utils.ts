import type { z } from "zod";
import type { WithNullableValues } from "./types";

/**
 * Extracts default/fallback values from a Zod object schema by parsing `{}`.
 *
 * For fields to participate in defaults extraction, declare them with
 * `.default(x).catch(x)`: `.default()` fires when the key is missing (which is
 * the case here), and `.catch()` covers bad-value cases at parse time elsewhere.
 * Bare `.catch()` alone won't work on Zod ≥4.4 — the parser errors with
 * `expected nonoptional` before `.catch()` can fire.
 */
export function getSchemaDefaults<T extends z.ZodObject<z.ZodRawShape>>(schema: T): z.output<T> {
  return schema.parse({});
}

function isSchemaOfType(schema: unknown, type: string): boolean {
  if (!schema || typeof schema !== "object") return false;
  if ("type" in schema && (schema as { type: unknown }).type === type) {
    return true;
  }
  if ("unwrap" in schema && typeof (schema as { unwrap: unknown }).unwrap === "function") {
    return isSchemaOfType((schema as { unwrap: () => unknown }).unwrap(), type);
  }
  return false;
}

/** Check if a schema is an array (handles wrapped types like .optional(), .catch()) */
export function isArraySchema(schema: unknown): boolean {
  return isSchemaOfType(schema, "array");
}

/** Check if a schema is an object (handles wrapped types like .optional(), .catch()) */
export function isObjectSchema(schema: unknown): boolean {
  return isSchemaOfType(schema, "object");
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Serializes values to URLSearchParams, omitting defaults.
 * - Arrays: multiple params with same key (?tags=a&tags=b)
 * - Objects: JSON-encoded string (?filter={"status":"active"})
 * - Primitives: string value
 * - null: deletes the param
 * - undefined: skips (preserves existing)
 */
export function serializeToURLSearchParams<T extends Record<string, unknown>>(
  values: WithNullableValues<T>,
  defaults: T,
  currentParams: URLSearchParams = new URLSearchParams(),
  schema?: { shape: Record<string, unknown> }
): URLSearchParams {
  const result = new URLSearchParams();
  if (currentParams.size > 0) {
    currentParams.forEach((value, key) => result.append(key, value));
  }

  for (const [key, value] of Object.entries(values)) {
    const defaultValue = defaults[key];

    if (value === null) {
      result.delete(key);
      continue;
    }
    if (value === undefined) continue;

    if (deepEqual(value, defaultValue)) {
      result.delete(key);
      continue;
    }

    result.delete(key);

    if (Array.isArray(value)) {
      for (const item of value) result.append(key, String(item));
    } else if (
      (schema && isObjectSchema(schema.shape[key])) ||
      (!schema && typeof value === "object" && value !== null)
    ) {
      result.set(key, JSON.stringify(value));
    } else {
      result.set(key, String(value));
    }
  }

  return result;
}
