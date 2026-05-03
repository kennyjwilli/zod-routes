import { createBuildUrl } from "./builder";
import { createTypedLink } from "./components";
import { createUseRouteParams, createUseRouteSearch } from "./hooks";
import type { BuildUrlFn, RouterAdapter, RouterBindings, Routes } from "./types";

export interface CreateRouterOptions<T extends Routes> {
  routes: T;
  adapter: RouterAdapter;
  /** Optional. When provided, `buildFullUrl` prepends it; otherwise `buildFullUrl` returns the same string as `buildUrl`. */
  baseUrl?: string;
}

export function createRouter<T extends Routes>(options: CreateRouterOptions<T>): RouterBindings<T> {
  const { routes, adapter, baseUrl = "" } = options;
  const buildUrl = createBuildUrl(routes);
  const TypedLink = createTypedLink(buildUrl, adapter.Link);
  const useRouteParams = createUseRouteParams(routes, adapter);
  const useRouteSearch = createUseRouteSearch(routes, adapter);

  // Cast: the variadic conditional-tuple signature of BuildUrlFn doesn't admit
  // a generic spread without losing type info. Wrap and cast at the boundary.
  const buildFullUrl: BuildUrlFn<T> = ((route: string, ...args: unknown[]) => {
    const path = (buildUrl as (route: string, options?: unknown) => string)(route, args[0]);
    return `${baseUrl}${path}`;
  }) as BuildUrlFn<T>;

  return {
    buildUrl,
    buildFullUrl,
    TypedLink,
    useRouteParams,
    useRouteSearch,
  };
}

// Re-export types for consumers
export type {
  AdapterLinkProps,
  BuildUrlFn,
  BuildUrlOptions,
  NavigateOptions,
  RouteDefinition,
  RouteParams,
  RoutePath,
  RouteSearch,
  RouteSearchState,
  RouterAdapter,
  RouterBindings,
  Routes,
  RouteWithParams,
  RouteWithSearch,
  TypedLinkComponent,
  TypedLinkProps,
  UseRouteParamsFn,
  UseRouteSearchFn,
  WithNullableValues,
} from "./types";
