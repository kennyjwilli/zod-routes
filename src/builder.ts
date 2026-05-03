import { getSchemaDefaults, serializeToURLSearchParams } from "./schema-utils";
import type {
  BuildUrlFn,
  BuildUrlOptions,
  RouteDefinition,
  RouteParams,
  RouteSearch,
  Routes,
} from "./types";

/**
 * Creates a type-safe URL builder for the given routes.
 *
 * @example
 * const buildUrl = createBuildUrl(routes);
 * buildUrl("/")                                                  // "/"
 * buildUrl("/families/[family]", { params: { family: "Asteraceae" } }) // "/families/Asteraceae"
 * buildUrl("/list", { search: { page: 2 } })                     // "/list?page=2"
 */
export function createBuildUrl<T extends Routes>(routes: T): BuildUrlFn<T> {
  return function buildUrl<K extends keyof T & string>(
    route: K,
    ...args: RouteParams<T, K> extends never
      ? RouteSearch<T, K> extends never
        ? []
        : [options?: BuildUrlOptions<T, K>]
      : [options: BuildUrlOptions<T, K>]
  ): string {
    const options = args[0] as BuildUrlOptions<T, K> | undefined;
    const routeDef = routes[route] as RouteDefinition;
    let path: string = route;

    if (options?.params && routeDef.params) {
      const result = routeDef.params.safeParse(options.params);
      const params = result.success ? result.data : (options.params as Record<string, unknown>);

      if (!result.success) {
        console.warn(`[zod-routes] Invalid route params for "${route}", using raw values`, {
          params: options.params,
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
          { params: options.params }
        );
        path = path.replace(/\[[^\]]+\]/g, "");
      }
    }

    if (options?.search && routeDef.search) {
      const defaults = getSchemaDefaults(routeDef.search);
      const params = serializeToURLSearchParams(
        options.search as Record<string, unknown>,
        defaults as Record<string, unknown>,
        new URLSearchParams(),
        routeDef.search
      );
      const searchString = params.toString();
      if (searchString) path += `?${searchString}`;
    }

    return path;
  };
}
