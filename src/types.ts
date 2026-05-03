import type { z } from "zod";

// ============================================================================
// Route Definition
// ============================================================================

export interface RouteDefinition {
  params?: z.ZodObject<z.ZodRawShape>;
  search?: z.ZodObject<z.ZodRawShape>;
}

export type RouteKey = `/${string}`;
export type Routes = Record<RouteKey, RouteDefinition>;

// ============================================================================
// Route Type Helpers
// ============================================================================

export type RoutePath<T> = keyof T & string;

export type RouteWithParams<T> = {
  [K in keyof T]: "params" extends keyof T[K] ? K : never;
}[keyof T];

export type RouteWithSearch<T> = {
  [K in keyof T]: "search" extends keyof T[K] ? K : never;
}[keyof T];

export type RouteParams<T, K extends keyof T> = T[K] extends { params: z.ZodType<infer P> }
  ? P
  : never;

export type RouteSearch<T, K extends keyof T> = T[K] extends { search: z.ZodType<infer S> }
  ? Partial<S>
  : never;

// ============================================================================
// BuildUrl Types
// ============================================================================

export type BuildUrlOptions<T, K extends keyof T> = (K extends RouteWithParams<T>
  ? { params: RouteParams<T, K> }
  : { params?: never }) &
  (K extends RouteWithSearch<T> ? { search?: RouteSearch<T, K> } : { search?: never });

export type BuildUrlFn<T> = <K extends keyof T & string>(
  route: K,
  ...args: RouteParams<T, K> extends never
    ? RouteSearch<T, K> extends never
      ? []
      : [options?: BuildUrlOptions<T, K>]
    : [options: BuildUrlOptions<T, K>]
) => string;

// ============================================================================
// Adapter Types
// ============================================================================

export interface NavigateOptions {
  replace?: boolean;
  scroll?: boolean;
  /** Search-param-only update. Adapters may bypass router for speed. */
  shallow?: boolean;
}

export interface AdapterLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
  ref?: React.Ref<HTMLAnchorElement>;
  children?: React.ReactNode;
}

export interface RouterAdapter {
  /** Read current pathname (e.g. "/families/Asteraceae"). Called as a hook. */
  usePath(): string;
  /** Read current dynamic route params. Called as a hook. */
  useParams(): Record<string, string | string[]>;
  /** Read current URL search params. Called as a hook. */
  useSearchParams(): URLSearchParams;
  /** Returns a navigate function. Called as a hook. */
  useNavigate(): (url: string, opts?: NavigateOptions) => void;
  /** Link primitive the library wraps */
  Link: React.ComponentType<AdapterLinkProps>;
}

// ============================================================================
// TypedLink Types
// ============================================================================

export interface TypedLinkOwnProps<T, K extends keyof T & string> {
  to: K;
  params?: RouteParams<T, K>;
  search?: RouteSearch<T, K>;
}

export type TypedLinkProps<T, K extends keyof T & string> = TypedLinkOwnProps<T, K> &
  Omit<AdapterLinkProps, "href">;

export type TypedLinkComponent<T> = <K extends keyof T & string>(
  props: TypedLinkProps<T, K>
) => React.ReactElement;

// ============================================================================
// Hook Types
// ============================================================================

export type UseRouteParamsFn<T> = <K extends RouteWithParams<T> & string>(
  route: K
) => RouteParams<T, K>;

export type WithNullableValues<T> = {
  [K in keyof T]?: T[K] | null;
};

type SearchOutput<T, K extends RouteWithSearch<T>> = T[K] extends { search: z.ZodType<infer O> }
  ? O
  : never;

export interface UpdateSearchOptions {
  /** Reset all schema fields not specified in `updates` to their defaults. Default false (merge). */
  reset?: boolean;
  /** Use `history.replaceState` instead of `pushState` (no new history entry). Default false. */
  replace?: boolean;
  /** Search-param-only update; adapters may bypass router for speed. Default true. */
  shallow?: boolean;
}

export interface RouteSearchState<T, K extends RouteWithSearch<T>> {
  search: SearchOutput<T, K>;
  updateSearch: (
    updates:
      | WithNullableValues<SearchOutput<T, K>>
      | ((prev: SearchOutput<T, K>) => WithNullableValues<SearchOutput<T, K>>),
    options?: UpdateSearchOptions
  ) => void;
}

export type UseRouteSearchFn<T> = <K extends RouteWithSearch<T> & string>(
  route: K
) => RouteSearchState<T, K>;

// ============================================================================
// createRouter return type
// ============================================================================

export interface RouterBindings<T extends Routes> {
  buildUrl: BuildUrlFn<T>;
  /** When `baseUrl` was not provided to `createRouter`, this returns the same string as `buildUrl`. */
  buildFullUrl: BuildUrlFn<T>;
  TypedLink: TypedLinkComponent<T>;
  useRouteParams: UseRouteParamsFn<T>;
  useRouteSearch: UseRouteSearchFn<T>;
}
