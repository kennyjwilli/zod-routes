"use client";

import type {
  AdapterLinkProps,
  BuildUrlFn,
  Routes,
  TypedLinkComponent,
  TypedLinkProps,
} from "./types";

/**
 * Creates a type-safe Link component that wraps the adapter's Link primitive.
 *
 * @example
 * const TypedLink = createTypedLink(buildUrl, adapter.Link);
 * <TypedLink to="/items/[id]" params={{ id: "abc" }}>Item</TypedLink>
 */
export function createTypedLink<T extends Routes>(
  buildUrl: BuildUrlFn<T>,
  Link: React.ComponentType<AdapterLinkProps>
): TypedLinkComponent<T> {
  return function TypedLink<K extends keyof T & string>({
    to,
    params,
    search,
    anchor,
    children,
    ...rest
  }: TypedLinkProps<T, K>): React.ReactElement {
    const href = (buildUrl as (route: string, options?: unknown) => string)(to, {
      params,
      search,
      anchor,
    });
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  };
}
