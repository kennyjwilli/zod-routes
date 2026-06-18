import { getSchemaDefaults, serializeToURLSearchParams } from "./schema-utils";
import type { BuildUrlFn, RouteDefinition, Routes } from "./types";

interface LooseOptions {
  params?: Record<string, unknown>;
  search?: Record<string, unknown>;
  anchor?: unknown;
}

/**
 * Creates a type-safe URL builder for the given routes.
 *
 * @example
 * const buildUrl = createBuildUrl(routes);
 * buildUrl("/")                                                       // "/"
 * buildUrl("/families/[family]", { params: { family: "Asteraceae" } }) // "/families/Asteraceae"
 * buildUrl("/list", { search: { page: 2 } })                          // "/list?page=2"
 */
export function createBuildUrl<T extends Routes>(routes: T): BuildUrlFn<T> {
  // Implementation typed loosely so the body doesn't have to fight the
  // variadic-conditional signature of BuildUrlFn. The single cast at the
  // return assertions the strict shape for callers.
  function buildUrl(route: string, callOptions?: LooseOptions): string {
    const routeDef = routes[route as keyof T] as RouteDefinition;
    let path = route;

    if (callOptions?.params && routeDef.params) {
      const result = routeDef.params.safeParse(callOptions.params);
      const params = result.success ? result.data : callOptions.params;

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
        callOptions.search,
        defaults,
        new URLSearchParams(),
        routeDef.search
      );
      const searchString = params.toString();
      if (searchString) path += `?${searchString}`;
    }

    if (callOptions?.anchor != null && routeDef.anchor) {
      const result = routeDef.anchor.safeParse(callOptions.anchor);
      const value = result.success ? result.data : String(callOptions.anchor);

      if (!result.success) {
        console.warn(`[zod-routes] Invalid anchor for "${route}", using raw value`, {
          anchor: callOptions.anchor,
          error: result.error,
        });
      }

      const frag = value.replace(/^#/, "");
      if (frag) path += `#${encodeURIComponent(frag)}`;
    }

    return path;
  }

  return buildUrl as BuildUrlFn<T>;
}
