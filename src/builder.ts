import { getSchemaDefaults, serializeToURLSearchParams } from "./schema-utils";
import type {
  BuildUrlFn,
  BuildUrlOptions,
  RouteDefinition,
  RouteParams,
  RouteSearch,
  Routes,
} from "./types";

export interface CreateBuildUrlOptions {
  /** Prefixed to every URL produced. Trailing slash is stripped. Defaults to "". */
  baseUrl?: string;
}

/**
 * Creates a type-safe URL builder for the given routes.
 *
 * @example
 * const buildUrl = createBuildUrl(routes);
 * buildUrl("/")                                                  // "/"
 * buildUrl("/families/[family]", { params: { family: "Asteraceae" } }) // "/families/Asteraceae"
 * buildUrl("/list", { search: { page: 2 } })                     // "/list?page=2"
 *
 * // With a baseUrl:
 * const buildFullUrl = createBuildUrl(routes, { baseUrl: "https://example.com" });
 * buildFullUrl("/list")                                          // "https://example.com/list"
 */
export function createBuildUrl<T extends Routes>(
  routes: T,
  options: CreateBuildUrlOptions = {}
): BuildUrlFn<T> {
  const baseUrl = options.baseUrl ?? "";
  // Strip trailing slash so `${baseUrl}${path}` doesn't double the leading slash on path.
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return function buildUrl<K extends keyof T & string>(
    route: K,
    ...args: RouteParams<T, K> extends never
      ? RouteSearch<T, K> extends never
        ? []
        : [options?: BuildUrlOptions<T, K>]
      : [options: BuildUrlOptions<T, K>]
  ): string {
    const callOptions = args[0] as BuildUrlOptions<T, K> | undefined;
    const routeDef = routes[route] as RouteDefinition;
    let path: string = route;

    if (callOptions?.params && routeDef.params) {
      const result = routeDef.params.safeParse(callOptions.params);
      const params = result.success ? result.data : (callOptions.params as Record<string, unknown>);

      if (!result.success) {
        console.warn(`[zod-routes] Invalid route params for "${route}", using raw values`, {
          params: callOptions.params,
          error: result.error,
        });
      }

      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`[${key}]`, encodeURIComponent(String(value)));
      }

      // If validation failed and the user supplied a partial params object, some
      // `[placeholder]` segments will still be in the path. Replace them with
      // empty string and warn — anything is better than navigating to a URL that
      // contains literal `[name]` syntax.
      const unfilled = path.match(/\[([^\]]+)\]/g);
      if (unfilled) {
        console.warn(
          `[zod-routes] Route "${route}" has unfilled params (${unfilled.join(", ")}); replacing with empty string`,
          { params: callOptions.params }
        );
        path = path.replace(/\[[^\]]+\]/g, "");
      }
    }

    if (callOptions?.search && routeDef.search) {
      const defaults = getSchemaDefaults(routeDef.search);
      const params = serializeToURLSearchParams(
        callOptions.search as Record<string, unknown>,
        defaults as Record<string, unknown>,
        new URLSearchParams(),
        routeDef.search
      );
      const searchString = params.toString();
      if (searchString) path += `?${searchString}`;
    }

    return `${normalizedBase}${path}`;
  };
}
