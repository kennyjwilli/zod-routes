import { createBuildUrl } from "./builder";
import { createTypedLink } from "./components";
import { createUseRouteParams, createUseRouteSearch } from "./hooks";
import { createParseRouteSearch } from "./parsers";
import type { RouterAdapter, RouterBindings, Routes } from "./types";

export interface CreateRouterOptions<T extends Routes> {
  routes: T;
  adapter: RouterAdapter;
}

export function createRouter<T extends Routes>(options: CreateRouterOptions<T>): RouterBindings<T> {
  const { routes, adapter } = options;
  const buildUrl = createBuildUrl(routes);
  const TypedLink = createTypedLink(buildUrl, adapter.Link);
  const useRouteParams = createUseRouteParams(routes, adapter);
  const useRouteSearch = createUseRouteSearch(routes, adapter);
  const parseRouteSearch = createParseRouteSearch(routes);

  return {
    buildUrl,
    TypedLink,
    useRouteParams,
    useRouteSearch,
    parseRouteSearch,
  };
}

// Re-export types for consumers
export type {
  AdapterLinkProps,
  BuildUrlFn,
  BuildUrlOptions,
  NavigateOptions,
  ParseRouteSearchFn,
  RouteAnchor,
  RouteDefinition,
  RouteParams,
  RoutePath,
  RouteSearch,
  RouteSearchState,
  RouterAdapter,
  RouterBindings,
  Routes,
  RouteWithAnchor,
  RouteWithParams,
  RouteWithSearch,
  TypedLinkComponent,
  TypedLinkOwnProps,
  TypedLinkProps,
  UseRouteParamsFn,
  UseRouteSearchFn,
  WithNullableValues,
} from "./types";
