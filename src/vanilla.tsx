"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AdapterLinkProps, NavigateOptions, RouterAdapter } from "./types";

const POPSTATE_EVENT = "popstate";
const URL_CHANGE_EVENT = "zod-routes:urlchange";

function subscribe(callback: () => void) {
  window.addEventListener(POPSTATE_EVENT, callback);
  window.addEventListener(URL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener(POPSTATE_EVENT, callback);
    window.removeEventListener(URL_CHANGE_EVENT, callback);
  };
}

function getSearchString() {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

function getPath() {
  if (typeof window === "undefined") return "/";
  return window.location.pathname;
}

function dispatchUrlChange() {
  window.dispatchEvent(new Event(URL_CHANGE_EVENT));
}

function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSearchString, () => "");
  return new URLSearchParams(search);
}

function usePathHook(): string {
  return useSyncExternalStore(subscribe, getPath, () => "/");
}

function useParamsHook(): Record<string, string | string[]> {
  // Vanilla adapter has no built-in path matcher. `useRouteParams` will throw
  // because of this — the vanilla adapter is intended for `buildUrl`,
  // `useRouteSearch`, and `TypedLink`. If you need params, write a tiny adapter
  // that derives them from the current path.
  return {};
}

function useNavigateHook() {
  return useCallback((url: string, opts?: NavigateOptions) => {
    if (typeof window === "undefined") return;
    if (opts?.replace) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
    dispatchUrlChange();
  }, []);
}

function VanillaLink({
  href,
  ref,
  children,
  replace,
  scroll: _scroll,
  prefetch: _prefetch,
  target,
  ...rest
}: AdapterLinkProps) {
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      if (target && target !== "_self") return;
      e.preventDefault();
      if (replace) {
        window.history.replaceState(null, "", href);
      } else {
        window.history.pushState(null, "", href);
      }
      dispatchUrlChange();
    },
    [href, replace, target]
  );
  return (
    <a href={href} ref={ref} target={target} {...rest} onClick={onClick}>
      {children}
    </a>
  );
}

export const vanillaAdapter: RouterAdapter = {
  usePath: usePathHook,
  useParams: useParamsHook,
  useSearchParams,
  useNavigate: useNavigateHook,
  Link: VanillaLink,
};
