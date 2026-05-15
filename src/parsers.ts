import type {
  ParseRouteSearchFn,
  RouteDefinition,
  RouteWithSearch,
  Routes,
  SearchOutput,
} from "./types";

/** Creates a type-safe server-side search-params parser for the given routes. */
export function createParseRouteSearch<T extends Routes>(routes: T): ParseRouteSearchFn<T> {
  return function parseRouteSearch<K extends RouteWithSearch<T> & string>(
    route: K,
    raw: unknown
  ): SearchOutput<T, K> {
    const routeDef = routes[route] as RouteDefinition;

    if (!routeDef.search) {
      throw new Error(`[zod-routes] Route "${route}" has no search declared`);
    }

    const result = routeDef.search.safeParse(raw);
    if (!result.success) {
      throw new Error(
        `[zod-routes] Invalid search params for "${route}": ${result.error.message}`
      );
    }
    return result.data as SearchOutput<T, K>;
  };
}
