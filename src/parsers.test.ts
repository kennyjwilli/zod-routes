import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createParseRouteSearch } from "./parsers";

describe("createParseRouteSearch", () => {
  const routes = {
    "/list": {
      search: z.object({
        page: z.coerce.number().int().default(1).catch(1),
        q: z.string().default("").catch(""),
      }),
    },
    "/about": {},
  } as const;

  test("parses a valid search input and returns typed output", () => {
    const parseRouteSearch = createParseRouteSearch(routes);
    const result = parseRouteSearch("/list", { page: "3", q: "hello" });
    expect(result).toEqual({ page: 3, q: "hello" });
  });

  test("returns defaults when fields are missing from input", () => {
    const parseRouteSearch = createParseRouteSearch(routes);
    const result = parseRouteSearch("/list", {});
    expect(result).toEqual({ page: 1, q: "" });
  });

  test("throws on schema parse failure with [zod-routes] prefix and route key", () => {
    const strictRoutes = {
      "/strict": { search: z.object({ page: z.number() }) },
    } as const;
    const parseRouteSearch = createParseRouteSearch(strictRoutes);
    expect(() => parseRouteSearch("/strict", { page: "notanumber" })).toThrow(
      /\[zod-routes\] Invalid search params for "\/strict":/
    );
  });

  test("throws on route with no search declared", () => {
    const parseRouteSearch = createParseRouteSearch(routes);
    expect(() =>
      parseRouteSearch(
        // @ts-expect-error - intentionally violating the type constraint
        "/about",
        {}
      )
    ).toThrow(/no search/i);
  });
});
