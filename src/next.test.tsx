import { act, render, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "abc" }),
  useSearchParams: () => new URLSearchParams("page=2"),
  usePathname: () => "/items/abc",
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest} data-testid="next-link">
      {children}
    </a>
  ),
}));

import { nextAdapter } from "./next";

describe("nextAdapter", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  test("usePath delegates to next/navigation usePathname", () => {
    const { result } = renderHook(() => nextAdapter.usePath());
    expect(result.current).toBe("/items/abc");
  });

  test("useParams delegates to next/navigation", () => {
    const { result } = renderHook(() => nextAdapter.useParams());
    expect(result.current).toEqual({ id: "abc" });
  });

  test("useSearchParams delegates to next/navigation", () => {
    const { result } = renderHook(() => nextAdapter.useSearchParams());
    expect(result.current.get("page")).toBe("2");
  });

  test("useNavigate with shallow:true uses pushState", () => {
    const pushStateSpy = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => nextAdapter.useNavigate());
    act(() => result.current("/x", { shallow: true }));
    expect(pushStateSpy).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    pushStateSpy.mockRestore();
  });

  test("useNavigate with shallow:false calls router.push", () => {
    const { result } = renderHook(() => nextAdapter.useNavigate());
    act(() => result.current("/x", { shallow: false }));
    expect(pushMock).toHaveBeenCalledWith("/x", expect.any(Object));
  });

  test("useNavigate with shallow:false + replace calls router.replace", () => {
    const { result } = renderHook(() => nextAdapter.useNavigate());
    act(() => result.current("/x", { shallow: false, replace: true }));
    expect(replaceMock).toHaveBeenCalledWith("/x", expect.any(Object));
  });

  test("useNavigate with shallow:false + scroll forwards scroll option", () => {
    const { result } = renderHook(() => nextAdapter.useNavigate());
    act(() => result.current("/x", { shallow: false, scroll: false }));
    expect(pushMock).toHaveBeenCalledWith("/x", { scroll: false });
  });

  test("Link renders next/link", () => {
    const { getByTestId } = render(<nextAdapter.Link href="/foo">x</nextAdapter.Link>);
    expect(getByTestId("next-link").getAttribute("href")).toBe("/foo");
  });
});
