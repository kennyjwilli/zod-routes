"use client";

import NextLink from "next/link";
import {
  useParams as nextUseParams,
  useSearchParams as nextUseSearchParams,
  usePathname,
  useRouter,
} from "next/navigation";
import { useCallback } from "react";
import type { AdapterLinkProps, NavigateOptions, RouterAdapter } from "./types";

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
