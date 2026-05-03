import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { _useSearchParamsState, createUseRouteParams, createUseRouteSearch } from "./hooks";
import type { AdapterLinkProps, RouterAdapter } from "./types";

function makeStubAdapter(initialUrl = "/"): RouterAdapter & {
  setUrl: (u: string) => void;
  currentUrl: () => string;
} {
  let url = initialUrl;
  const navigate = (newUrl: string) => {
    url = newUrl;
  };
  const adapter: RouterAdapter & {
    setUrl: (u: string) => void;
    currentUrl: () => string;
  } = {
    usePath: () => url.split("?")[0] ?? "/",
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(url.split("?")[1] ?? ""),
    useNavigate: () => navigate,
    Link: ({ href, children }: AdapterLinkProps) => <a href={href}>{children}</a>,
    setUrl: (u) => {
      url = u;
    },
    currentUrl: () => url,
  };
  return adapter;
}

describe("_useSearchParamsState", () => {
  test("reads parsed values from URL", () => {
    const adapter = makeStubAdapter("/list?page=2");
    const schema = z.object({ page: z.coerce.number().default(1).catch(1) });
    const { result } = renderHook(() => _useSearchParamsState(schema, adapter));
    expect(result.current.values).toEqual({ page: 2 });
  });

  test("returns defaults when URL is empty", () => {
    const adapter = makeStubAdapter("/list");
    const schema = z.object({ page: z.coerce.number().default(1).catch(1) });
    const { result } = renderHook(() => _useSearchParamsState(schema, adapter));
    expect(result.current.values).toEqual({ page: 1 });
  });

  test("returns catch fallback on bad input (no throw)", () => {
    const adapter = makeStubAdapter("/list?page=notanumber");
    const schema = z.object({ page: z.coerce.number().default(99).catch(99) });
    const { result } = renderHook(() => _useSearchParamsState(schema, adapter));
    expect(result.current.values).toEqual({ page: 99 });
  });

  test("update preserves the current path from adapter", () => {
    const adapter = makeStubAdapter("/list?page=2");
    const schema = z.object({ page: z.coerce.number().default(1).catch(1) });
    const { result } = renderHook(() => _useSearchParamsState(schema, adapter));
    act(() => {
      result.current.update({ page: 5 });
    });
    expect(adapter.currentUrl()).toBe("/list?page=5");
  });
});

describe("createUseRouteParams", () => {
  const routes = {
    "/items/[itemID]": { params: z.object({ itemID: z.string() }) },
    "/about": {},
  } as const;

  test("returns parsed params for valid route", () => {
    const adapter = makeStubAdapter();
    adapter.useParams = () => ({ itemID: "abc" });
    const useRouteParams = createUseRouteParams(routes, adapter);
    const { result } = renderHook(() => useRouteParams("/items/[itemID]"));
    expect(result.current).toEqual({ itemID: "abc" });
  });

  test("throws on route without params declared", () => {
    const adapter = makeStubAdapter();
    const useRouteParams = createUseRouteParams(routes, adapter);
    expect(() =>
      renderHook(() =>
        // @ts-expect-error - intentionally wrong
        useRouteParams("/about")
      )
    ).toThrow(/no params/i);
  });

  test("throws on schema parse failure", () => {
    const adapter = makeStubAdapter();
    adapter.useParams = () => ({ wrong: "abc" });
    const useRouteParams = createUseRouteParams(routes, adapter);
    expect(() => renderHook(() => useRouteParams("/items/[itemID]"))).toThrow(
      /Invalid route params/
    );
  });
});

describe("createUseRouteSearch", () => {
  const routes = {
    "/list": {
      search: z.object({
        page: z.coerce.number().int().default(1).catch(1),
        q: z.string().default("").catch(""),
      }),
    },
    "/about": {},
  } as const;

  test("reads parsed search from URL", () => {
    const adapter = makeStubAdapter("/list?page=3&q=foo");
    const useRouteSearch = createUseRouteSearch(routes, adapter);
    const { result } = renderHook(() => useRouteSearch("/list"));
    expect(result.current.search).toEqual({ page: 3, q: "foo" });
  });

  test("updateSearch merges by default", () => {
    const adapter = makeStubAdapter("/list?page=3&q=foo");
    const useRouteSearch = createUseRouteSearch(routes, adapter);
    const { result } = renderHook(() => useRouteSearch("/list"));
    act(() => {
      result.current.updateSearch({ page: 5 });
    });
    expect(adapter.currentUrl()).toBe("/list?page=5&q=foo");
  });

  test("updateSearch with reset:true resets non-specified to defaults", () => {
    const adapter = makeStubAdapter("/list?page=3&q=foo");
    const useRouteSearch = createUseRouteSearch(routes, adapter);
    const { result } = renderHook(() => useRouteSearch("/list"));
    act(() => {
      result.current.updateSearch({ page: 5 }, { reset: true });
    });
    expect(adapter.currentUrl()).toBe("/list?page=5");
  });

  test("updateSearch with replace:true uses replace navigation (history)", () => {
    const navOpts: Array<unknown> = [];
    const adapter = makeStubAdapter("/list");
    adapter.useNavigate = () => (url: string, opts?: unknown) => {
      navOpts.push(opts);
      adapter.setUrl(url);
    };
    const useRouteSearch = createUseRouteSearch(routes, adapter);
    const { result } = renderHook(() => useRouteSearch("/list"));
    act(() => result.current.updateSearch({ page: 2 }, { replace: true }));
    expect(navOpts[0]).toMatchObject({ replace: true });
  });

  test("updateSearch function form receives current values", () => {
    const adapter = makeStubAdapter("/list?page=3&q=foo");
    const useRouteSearch = createUseRouteSearch(routes, adapter);
    const { result } = renderHook(() => useRouteSearch("/list"));
    act(() => {
      result.current.updateSearch((prev) => ({ page: prev.page + 1 }));
    });
    expect(adapter.currentUrl()).toBe("/list?page=4&q=foo");
  });

  test("null value deletes a param", () => {
    const adapter = makeStubAdapter("/list?page=3&q=foo");
    const useRouteSearch = createUseRouteSearch(routes, adapter);
    const { result } = renderHook(() => useRouteSearch("/list"));
    act(() => {
      result.current.updateSearch({ q: null });
    });
    expect(adapter.currentUrl()).toBe("/list?page=3");
  });

  test("returns defaults and warns on parse failure (no throw)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const strictRoutes = {
      "/strict": { search: z.object({ page: z.number().default(0) }) },
    } as const;
    const adapter = makeStubAdapter("/strict?page=notanumber");
    const useRouteSearch = createUseRouteSearch(strictRoutes, adapter);
    const { result } = renderHook(() => useRouteSearch("/strict"));
    expect(result.current.search).toEqual({ page: 0 });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test("default updateSearch uses shallow:true", () => {
    const navOpts: Array<unknown> = [];
    const adapter = makeStubAdapter("/list");
    adapter.useNavigate = () => (url: string, opts?: unknown) => {
      navOpts.push(opts);
      adapter.setUrl(url);
    };
    const useRouteSearch = createUseRouteSearch(routes, adapter);
    const { result } = renderHook(() => useRouteSearch("/list"));
    act(() => result.current.updateSearch({ page: 2 }));
    expect(navOpts[0]).toMatchObject({ shallow: true });
  });

  test("throws when route has no search declared", () => {
    const adapter = makeStubAdapter();
    const useRouteSearch = createUseRouteSearch(routes, adapter);
    expect(() =>
      renderHook(() =>
        // @ts-expect-error - intentionally wrong
        useRouteSearch("/about")
      )
    ).toThrow(/no search/i);
  });
});
