import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { createBuildUrl } from "./builder";

const routes = {
  "/": {},
  "/about": {},
  "/families/[family]": {
    params: z.object({ family: z.string() }),
  },
  "/families/[family]/genera/[genus]": {
    params: z.object({ family: z.string(), genus: z.string() }),
  },
  "/list": {
    search: z.object({
      page: z.coerce.number().int().default(1).catch(1),
      tags: z.array(z.string()).default([]).catch([]),
    }),
  },
  "/list/[id]": {
    params: z.object({ id: z.string() }),
    search: z.object({
      tab: z.enum(["a", "b"]).default("a").catch("a"),
    }),
  },
} as const;

describe("createBuildUrl", () => {
  const buildUrl = createBuildUrl(routes);

  test("simple route", () => {
    expect(buildUrl("/")).toBe("/");
    expect(buildUrl("/about")).toBe("/about");
  });

  test("route with single param", () => {
    expect(buildUrl("/families/[family]", { params: { family: "Asteraceae" } })).toBe(
      "/families/Asteraceae"
    );
  });

  test("route with multiple params", () => {
    expect(
      buildUrl("/families/[family]/genera/[genus]", {
        params: { family: "Asteraceae", genus: "Bellis" },
      })
    ).toBe("/families/Asteraceae/genera/Bellis");
  });

  test("URL-encodes param values", () => {
    expect(buildUrl("/families/[family]", { params: { family: "a/b c" } })).toBe(
      "/families/a%2Fb%20c"
    );
  });

  test("search params: includes non-defaults", () => {
    expect(buildUrl("/list", { search: { page: 2 } })).toBe("/list?page=2");
  });

  test("search params: omits defaults", () => {
    expect(buildUrl("/list", { search: { page: 1 } })).toBe("/list");
  });

  test("search params: arrays", () => {
    expect(buildUrl("/list", { search: { tags: ["a", "b"] } })).toBe("/list?tags=a&tags=b");
  });

  test("params + search", () => {
    expect(buildUrl("/list/[id]", { params: { id: "x" }, search: { tab: "b" } })).toBe(
      "/list/x?tab=b"
    );
  });

  test("invalid params: warns and uses raw values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // @ts-expect-error - intentionally invalid
    expect(buildUrl("/families/[family]", { params: { family: 42 } })).toBe("/families/42");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test("partial params: unfilled placeholders are replaced with empty string + warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      buildUrl("/families/[family]/genera/[genus]", {
        // @ts-expect-error - intentionally missing genus
        params: { family: "Asteraceae" },
      })
    ).toBe("/families/Asteraceae/genera/");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
