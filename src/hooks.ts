"use client";

import { useCallback, useMemo } from "react";
import type { z } from "zod";
import {
  getSchemaDefaults,
  isArraySchema,
  isObjectSchema,
  serializeToURLSearchParams,
} from "./schema-utils";
import type {
  RouteDefinition,
  RouteParams,
  RouteSearchState,
  RouteWithParams,
  RouteWithSearch,
  RouterAdapter,
  Routes,
  UpdateSearchOptions,
  UseRouteParamsFn,
  UseRouteSearchFn,
  WithNullableValues,
} from "./types";

type UpdateFn<T> = (
  updates: WithNullableValues<T> | ((prev: T) => WithNullableValues<T>),
  options?: UpdateSearchOptions
) => void;

export interface UseSearchParamsStateReturn<T> {
  values: T;
  update: UpdateFn<T>;
}

/**
 * Internal hook used to implement `createUseRouteSearch`. Not part of the
 * public API — define URL state on a route's `search` schema instead, then use
 * the route-bound `useRouteSearch`.
 */
export function _useSearchParamsState<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  adapter: RouterAdapter
): UseSearchParamsStateReturn<z.output<T>> {
  const path = adapter.usePath();
  const searchParams = adapter.useSearchParams();
  const navigate = adapter.useNavigate();
  // Stable string snapshot of the current search params — `searchParams` itself
  // is a fresh URLSearchParams instance per render, which would defeat
  // useCallback identity. The string is identity-stable when content is.
  const searchString = searchParams.toString();

  const defaults = useMemo(() => getSchemaDefaults(schema), [schema]);
  const schemaKeys = useMemo(() => Object.keys(schema.shape), [schema]);

  const values = useMemo(() => {
    // Start from per-field defaults so that fields missing from the URL fall
    // back individually (rather than collapsing the whole object to defaults
    // when one field is absent or unparseable).
    const rawParams: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
    const params = new URLSearchParams(searchString);

    for (const key of schemaKeys) {
      const urlValues = params.getAll(key);
      if (urlValues.length === 0) continue;
      const schemaField = schema.shape[key];
      if (schemaField == null) continue;

      if (isArraySchema(schemaField)) {
        rawParams[key] = urlValues;
      } else if (isObjectSchema(schemaField)) {
        const jsonStr = urlValues[0];
        if (jsonStr) {
          try {
            rawParams[key] = JSON.parse(jsonStr);
          } catch {
            rawParams[key] = jsonStr;
          }
        }
      } else {
        rawParams[key] = urlValues.length > 1 ? urlValues : urlValues[0];
      }
    }

    const result = schema.safeParse(rawParams);
    if (!result.success) {
      console.warn("[zod-routes] Invalid URL params, using defaults", {
        rawParams,
        error: result.error,
      });
      return defaults;
    }
    return result.data;
  }, [searchString, schema, defaults, schemaKeys]);

  const update: UpdateFn<z.output<T>> = useCallback(
    (updates, options) => {
      const resolvedUpdates = (typeof updates === "function" ? updates(values) : updates) as Record<
        string,
        unknown
      >;
      const looseDefaults = defaults as Record<string, unknown>;
      const currentParams = new URLSearchParams(searchString);

      let newValues: Record<string, unknown>;
      if (options?.replace) {
        newValues = {};
        for (const key of schemaKeys) {
          const newValue = resolvedUpdates[key] ?? looseDefaults[key];
          newValues[key] = newValue == null ? null : newValue;
        }
      } else {
        newValues = { ...values, ...resolvedUpdates };
      }

      const newParams = serializeToURLSearchParams(newValues, looseDefaults, currentParams, schema);
      const url = newParams.size === 0 ? path : `${path}?${newParams.toString()}`;
      navigate(url, { shallow: options?.shallow ?? true });
    },
    [values, defaults, searchString, schemaKeys, schema, navigate, path]
  );

  return { values, update };
}

/** Creates a type-safe route params hook for the given routes. */
export function createUseRouteParams<T extends Routes>(
  routes: T,
  adapter: RouterAdapter
): UseRouteParamsFn<T> {
  return function useRouteParams<K extends RouteWithParams<T> & string>(
    route: K
  ): RouteParams<T, K> {
    const rawParams = adapter.useParams();
    const routeDef = routes[route] as RouteDefinition;

    return useMemo(() => {
      if (!routeDef.params) {
        throw new Error(`[zod-routes] Route "${route}" has no params declared`);
      }

      const result = routeDef.params.safeParse(rawParams);
      if (!result.success) {
        throw new Error(
          `[zod-routes] Invalid route params for "${route}": ${result.error.message}`
        );
      }
      return result.data as RouteParams<T, K>;
    }, [rawParams, route, routeDef]);
  };
}

/** Creates a type-safe route search hook for the given routes. */
export function createUseRouteSearch<T extends Routes>(
  routes: T,
  adapter: RouterAdapter
): UseRouteSearchFn<T> {
  return function useRouteSearch<K extends RouteWithSearch<T> & string>(
    route: K
  ): RouteSearchState<T, K> {
    const routeDef = routes[route] as RouteDefinition;

    // The type system constrains `route` to a search-having key, so this throw
    // is only reachable via deliberate type circumvention (`@ts-expect-error`
    // or `as any`). Throws happen before hooks are called — a render that
    // switches from a search-having route to a search-less one within the same
    // call site would violate Rules of Hooks. The type system prevents this.
    if (!routeDef.search) {
      throw new Error(`[zod-routes] Route "${route}" has no search declared`);
    }

    const { values, update } = _useSearchParamsState(routeDef.search, adapter);

    return {
      search: values,
      updateSearch: update,
    } as unknown as RouteSearchState<T, K>;
  };
}
