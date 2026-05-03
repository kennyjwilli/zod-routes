import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  getSchemaDefaults,
  isArraySchema,
  isObjectSchema,
  serializeToURLSearchParams,
} from "./schema-utils";

describe("getSchemaDefaults", () => {
  test("extracts default(x).catch(x) values (recommended pattern)", () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1).catch(1),
      search: z.string().default("").catch(""),
    });
    expect(getSchemaDefaults(schema)).toEqual({ page: 1, search: "" });
  });

  test("extracts plain default values", () => {
    const schema = z.object({
      tab: z.enum(["a", "b"]).default("a"),
    });
    expect(getSchemaDefaults(schema)).toEqual({ tab: "a" });
  });

  test("optional fields with no default produce undefined value", () => {
    const schema = z.object({
      maybe: z.string().optional(),
    });
    const result = getSchemaDefaults(schema);
    expect(result.maybe).toBeUndefined();
  });
});

describe("isArraySchema", () => {
  test("detects bare array", () => {
    expect(isArraySchema(z.array(z.string()))).toBe(true);
  });
  test("detects array wrapped in optional/catch/default/nullable", () => {
    expect(isArraySchema(z.array(z.string()).optional())).toBe(true);
    expect(isArraySchema(z.array(z.string()).catch([]))).toBe(true);
    expect(isArraySchema(z.array(z.string()).default([]))).toBe(true);
    expect(isArraySchema(z.array(z.string()).nullable())).toBe(true);
  });
  test("returns false for non-array schemas", () => {
    expect(isArraySchema(z.string())).toBe(false);
    expect(isArraySchema(z.object({}))).toBe(false);
  });
  test("returns false for non-schema values", () => {
    expect(isArraySchema(null)).toBe(false);
    expect(isArraySchema(undefined)).toBe(false);
    expect(isArraySchema("string")).toBe(false);
  });
});

describe("isObjectSchema", () => {
  test("detects bare object", () => {
    expect(isObjectSchema(z.object({ a: z.string() }))).toBe(true);
  });
  test("detects object wrapped in optional/catch", () => {
    expect(isObjectSchema(z.object({}).optional())).toBe(true);
    expect(isObjectSchema(z.object({}).catch({}))).toBe(true);
  });
  test("returns false for arrays and primitives", () => {
    expect(isObjectSchema(z.array(z.string()))).toBe(false);
    expect(isObjectSchema(z.string())).toBe(false);
  });
});

describe("serializeToURLSearchParams", () => {
  test("omits values matching defaults", () => {
    const params = serializeToURLSearchParams({ page: 1, search: "" }, { page: 1, search: "" });
    expect(params.toString()).toBe("");
  });

  test("includes values that differ from defaults", () => {
    const params = serializeToURLSearchParams({ page: 2, search: "foo" }, { page: 1, search: "" });
    expect(params.get("page")).toBe("2");
    expect(params.get("search")).toBe("foo");
  });

  test("null deletes a param", () => {
    const current = new URLSearchParams("page=2&search=foo");
    const params = serializeToURLSearchParams({ page: null }, { page: 1, search: "" }, current);
    expect(params.get("page")).toBe(null);
    expect(params.get("search")).toBe("foo");
  });

  test("undefined skips (preserves existing)", () => {
    const current = new URLSearchParams("page=2");
    const params = serializeToURLSearchParams({ page: undefined }, { page: 1 }, current);
    expect(params.get("page")).toBe("2");
  });

  test("arrays produce multiple params with same key", () => {
    const params = serializeToURLSearchParams<{ tags: string[] }>(
      { tags: ["a", "b"] },
      { tags: [] }
    );
    expect(params.getAll("tags")).toEqual(["a", "b"]);
  });

  test("objects JSON-encode when schema indicates object", () => {
    const schema = z.object({ filter: z.object({ status: z.string() }).catch({ status: "" }) });
    const params = serializeToURLSearchParams(
      { filter: { status: "active" } },
      { filter: { status: "" } },
      undefined,
      schema
    );
    expect(params.get("filter")).toBe('{"status":"active"}');
  });

  test("merges with current params by default", () => {
    const current = new URLSearchParams("a=1&b=2");
    const params = serializeToURLSearchParams({ b: "3" }, { a: "", b: "" }, current);
    expect(params.get("a")).toBe("1");
    expect(params.get("b")).toBe("3");
  });
});
