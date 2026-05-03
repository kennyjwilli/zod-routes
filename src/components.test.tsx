import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createBuildUrl } from "./builder";
import { createTypedLink } from "./components";
import type { AdapterLinkProps } from "./types";

const routes = {
  "/": {},
  "/items/[id]": { params: z.object({ id: z.string() }) },
  "/list": { search: z.object({ page: z.coerce.number().default(1).catch(1) }) },
} as const;

const StubLink = ({ href, children, ...rest }: AdapterLinkProps) => (
  <a href={href} {...rest}>
    {children}
  </a>
);

describe("createTypedLink", () => {
  const buildUrl = createBuildUrl(routes);
  const TypedLink = createTypedLink(buildUrl, StubLink);

  test("renders the adapter Link with computed href", () => {
    render(<TypedLink to="/">Home</TypedLink>);
    const a = screen.getByText("Home").closest("a");
    expect(a?.getAttribute("href")).toBe("/");
  });

  test("builds href with params", () => {
    render(
      <TypedLink to="/items/[id]" params={{ id: "abc" }}>
        Item
      </TypedLink>
    );
    expect(screen.getByText("Item").closest("a")?.getAttribute("href")).toBe("/items/abc");
  });

  test("builds href with search", () => {
    render(
      <TypedLink to="/list" search={{ page: 2 }}>
        Page 2
      </TypedLink>
    );
    expect(screen.getByText("Page 2").closest("a")?.getAttribute("href")).toBe("/list?page=2");
  });

  test("forwards anchor attributes", () => {
    render(
      <TypedLink to="/" className="my-link" data-testid="typed-link">
        X
      </TypedLink>
    );
    const a = screen.getByTestId("typed-link");
    expect(a.getAttribute("class")).toBe("my-link");
  });

  test("forwards Link-specific props (replace, scroll, prefetch)", () => {
    const ForwardingStub = (props: AdapterLinkProps) => {
      const { href, replace, scroll, prefetch, children } = props;
      return (
        <a
          href={href}
          data-replace={String(replace)}
          data-scroll={String(scroll)}
          data-prefetch={String(prefetch)}
          data-testid="link-with-props"
        >
          {children}
        </a>
      );
    };
    const Link = createTypedLink(buildUrl, ForwardingStub);
    render(
      <Link to="/" replace scroll={false} prefetch>
        x
      </Link>
    );
    const a = screen.getByTestId("link-with-props");
    expect(a.getAttribute("data-replace")).toBe("true");
    expect(a.getAttribute("data-scroll")).toBe("false");
    expect(a.getAttribute("data-prefetch")).toBe("true");
  });

  test("forwards ref to the underlying Link", () => {
    const RefStub = (props: AdapterLinkProps) => {
      const { ref, href, children } = props;
      return (
        <a href={href} ref={ref} data-testid="ref-link">
          {children}
        </a>
      );
    };
    const Link = createTypedLink(buildUrl, RefStub);
    let receivedRef: HTMLAnchorElement | null = null;
    render(
      <Link
        to="/"
        ref={(el) => {
          receivedRef = el;
        }}
      >
        x
      </Link>
    );
    expect(receivedRef).toBeInstanceOf(HTMLAnchorElement);
  });
});
