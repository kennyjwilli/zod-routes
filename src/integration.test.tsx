import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { createRouter } from "./index";
import type { AdapterLinkProps, RouterAdapter } from "./types";
import { vanillaAdapter } from "./vanilla";

function makeStubAdapter(initialUrl = "/") {
  let url = initialUrl;
  const Link = ({ href, children, ...rest }: AdapterLinkProps) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  const adapter: RouterAdapter & {
    currentUrl: () => string;
    setUrl: (u: string) => void;
  } = {
    usePath: () => url.split("?")[0] ?? "/",
    useParams: () => {
      const path = url.split("?")[0] ?? "/";
      const m = path.match(/^\/items\/(.+)$/);
      const params: Record<string, string> = {};
      if (m) params.id = decodeURIComponent(m[1]!);
      return params;
    },
    useSearchParams: () => new URLSearchParams(url.split("?")[1] ?? ""),
    useNavigate: () => (newUrl: string) => {
      url = newUrl;
    },
    Link,
    currentUrl: () => url,
    setUrl: (u: string) => {
      url = u;
    },
  };
  return adapter;
}

describe("createRouter integration", () => {
  const routes = {
    "/": {},
    "/items/[id]": { params: z.object({ id: z.string() }) },
    "/list": { search: z.object({ page: z.coerce.number().default(1).catch(1) }) },
  } as const;

  test("returns all expected bindings (buildFullUrl always present)", () => {
    const adapter = makeStubAdapter();
    const router = createRouter({ routes, adapter });
    expect(router.buildUrl).toBeTypeOf("function");
    expect(router.buildFullUrl).toBeTypeOf("function");
    expect(router.TypedLink).toBeTypeOf("function");
    expect(router.useRouteParams).toBeTypeOf("function");
    expect(router.useRouteSearch).toBeTypeOf("function");
  });

  test("buildFullUrl with no baseUrl returns same string as buildUrl", () => {
    const adapter = makeStubAdapter();
    const router = createRouter({ routes, adapter });
    expect(router.buildFullUrl("/")).toBe(router.buildUrl("/"));
    expect(router.buildFullUrl("/items/[id]", { params: { id: "abc" } })).toBe(
      router.buildUrl("/items/[id]", { params: { id: "abc" } })
    );
  });

  test("buildFullUrl prepends baseUrl when provided", () => {
    const adapter = makeStubAdapter();
    const router = createRouter({
      routes,
      adapter,
      baseUrl: "https://example.com",
    });
    expect(router.buildFullUrl("/")).toBe("https://example.com/");
    expect(router.buildFullUrl("/items/[id]", { params: { id: "abc" } })).toBe(
      "https://example.com/items/abc"
    );
    expect(router.buildFullUrl("/list", { search: { page: 2 } })).toBe(
      "https://example.com/list?page=2"
    );
  });

  test("end-to-end: TypedLink + useRouteParams", () => {
    const adapter = makeStubAdapter("/items/abc");
    const { TypedLink, useRouteParams } = createRouter({ routes, adapter });

    render(
      <TypedLink to="/items/[id]" params={{ id: "xyz" }}>
        Go
      </TypedLink>
    );
    expect(screen.getByText("Go").closest("a")?.getAttribute("href")).toBe("/items/xyz");

    const { result } = renderHook(() => useRouteParams("/items/[id]"));
    expect(result.current).toEqual({ id: "abc" });
  });

  test("end-to-end: useRouteSearch update preserves path", () => {
    const adapter = makeStubAdapter("/list");
    const { useRouteSearch } = createRouter({ routes, adapter });

    const { result } = renderHook(() => useRouteSearch("/list"));
    expect(result.current.search).toEqual({ page: 1 });

    act(() => {
      result.current.updateSearch({ page: 5 });
    });
    expect(adapter.currentUrl()).toBe("/list?page=5");
  });
});

describe("createRouter with vanillaAdapter (real adapter)", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));

  test("useRouteSearch round-trip via vanilla adapter", () => {
    const routes = {
      "/list": { search: z.object({ page: z.coerce.number().default(1).catch(1) }) },
    } as const;
    const { useRouteSearch } = createRouter({ routes, adapter: vanillaAdapter });

    window.history.replaceState(null, "", "/list");
    const { result } = renderHook(() => useRouteSearch("/list"));
    expect(result.current.search).toEqual({ page: 1 });

    act(() => result.current.updateSearch({ page: 7 }));
    expect(window.location.pathname).toBe("/list");
    expect(window.location.search).toBe("?page=7");
  });
});
