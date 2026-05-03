import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { vanillaAdapter } from "./vanilla";

const setUrl = (url: string) => {
  window.history.replaceState(null, "", url);
};

describe("vanillaAdapter", () => {
  beforeEach(() => setUrl("/"));
  afterEach(() => setUrl("/"));

  test("useSearchParams reads from window.location.search", () => {
    setUrl("/list?page=2&q=foo");
    const { result } = renderHook(() => vanillaAdapter.useSearchParams());
    expect(result.current.get("page")).toBe("2");
    expect(result.current.get("q")).toBe("foo");
  });

  test("useNavigate writes via pushState by default", () => {
    const { result } = renderHook(() => vanillaAdapter.useNavigate());
    act(() => result.current("/list?page=3"));
    expect(window.location.pathname + window.location.search).toBe("/list?page=3");
  });

  test("useNavigate with replace uses replaceState", () => {
    const initialLength = window.history.length;
    const { result } = renderHook(() => vanillaAdapter.useNavigate());
    act(() => result.current("/x", { replace: true }));
    expect(window.history.length).toBe(initialLength);
  });

  test("Link renders an <a> with the given href", () => {
    const { container } = render(<vanillaAdapter.Link href="/foo">Click</vanillaAdapter.Link>);
    const a = container.querySelector("a");
    expect(a?.getAttribute("href")).toBe("/foo");
  });

  test("usePath reflects window.location.pathname", () => {
    setUrl("/items/abc");
    const { result } = renderHook(() => vanillaAdapter.usePath());
    expect(result.current).toBe("/items/abc");
  });

  test("useParams returns empty object (limitation: no built-in matcher)", () => {
    setUrl("/items/abc");
    const { result } = renderHook(() => vanillaAdapter.useParams());
    expect(result.current).toEqual({});
  });
});

describe("VanillaLink click interception", () => {
  beforeEach(() => setUrl("/start"));
  afterEach(() => setUrl("/"));

  test("plain click intercepts and navigates via pushState", () => {
    const { container } = render(<vanillaAdapter.Link href="/dest">click</vanillaAdapter.Link>);
    const a = container.querySelector("a")!;
    a.click();
    expect(window.location.pathname).toBe("/dest");
  });

  test("click with replace uses replaceState", () => {
    const initialLength = window.history.length;
    const { container } = render(
      <vanillaAdapter.Link href="/dest" replace>
        click
      </vanillaAdapter.Link>
    );
    const a = container.querySelector("a")!;
    a.click();
    expect(window.location.pathname).toBe("/dest");
    expect(window.history.length).toBe(initialLength);
  });

  test("modifier-click does not intercept (lets browser handle)", () => {
    const { container } = render(<vanillaAdapter.Link href="/dest">click</vanillaAdapter.Link>);
    const a = container.querySelector("a")!;
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
    a.dispatchEvent(ev);
    expect(window.location.pathname).toBe("/start");
    expect(ev.defaultPrevented).toBe(false);
  });

  test('target="_blank" does not intercept', () => {
    const { container } = render(
      <vanillaAdapter.Link href="/dest" target="_blank">
        click
      </vanillaAdapter.Link>
    );
    const a = container.querySelector("a")!;
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    a.dispatchEvent(ev);
    expect(window.location.pathname).toBe("/start");
    expect(ev.defaultPrevented).toBe(false);
  });

  test("middle-click (button !== 0) does not intercept", () => {
    const { container } = render(<vanillaAdapter.Link href="/dest">click</vanillaAdapter.Link>);
    const a = container.querySelector("a")!;
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true, button: 1 });
    a.dispatchEvent(ev);
    expect(window.location.pathname).toBe("/start");
    expect(ev.defaultPrevented).toBe(false);
  });
});
