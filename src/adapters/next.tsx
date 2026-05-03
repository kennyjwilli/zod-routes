"use client";

// Use explicit `.js` extensions so Node's strict ESM resolver can find these
// when the package is consumed via node_modules (e.g., from a Vitest test).
// Next 16 has no `exports` map, so bare specifiers without `.js` only resolve
// through Vite/webpack/turbopack — not Node ESM strict.
import NextLink from "next/link.js";
import {
  useParams as nextUseParams,
  useSearchParams as nextUseSearchParams,
  usePathname,
  useRouter,
} from "next/navigation.js";
import { useCallback } from "react";
import type { AdapterLinkProps, NavigateOptions, RouterAdapter } from "../types";

function usePathHook(): string {
  return usePathname() ?? "/";
}

function useParamsHook(): Record<string, string | string[]> {
  const params = nextUseParams();
  return params as Record<string, string | string[]>;
}

function useSearchParamsHook(): URLSearchParams {
  const params = nextUseSearchParams();
  // Next's ReadonlyURLSearchParams is a URLSearchParams subset; clone for full mutability.
  return new URLSearchParams(params.toString());
}

function useNavigateHook() {
  const router = useRouter();
  return useCallback(
    (url: string, opts?: NavigateOptions) => {
      const shallow = opts?.shallow ?? false;
      if (shallow) {
        if (typeof window === "undefined") return;
        if (opts?.replace) {
          window.history.replaceState(null, "", url);
        } else {
          window.history.pushState(null, "", url);
        }
        return;
      }
      const navOpts: { scroll?: boolean } = {};
      if (opts?.scroll !== undefined) navOpts.scroll = opts.scroll;
      if (opts?.replace) {
        router.replace(url, navOpts);
      } else {
        router.push(url, navOpts);
      }
    },
    [router]
  );
}

function NextLinkAdapter({ href, ref, children, ...rest }: AdapterLinkProps) {
  return (
    <NextLink href={href} ref={ref} {...rest}>
      {children}
    </NextLink>
  );
}

export const nextAdapter: RouterAdapter = {
  usePath: usePathHook,
  useParams: useParamsHook,
  useSearchParams: useSearchParamsHook,
  useNavigate: useNavigateHook,
  Link: NextLinkAdapter,
};
