# zod-routes

Headless, type-safe URL routing helpers for React apps. Define your routes once with Zod schemas; get type-safe URL builders, `<Link>` components, and hooks. Pluggable adapters for Next.js, vanilla React, and any other router.

```ts
import { createRouter } from "zod-routes";
import { nextAdapter } from "zod-routes/next";
import { z } from "zod";

const routes = {
  "/": {},
  "/items/[id]": { params: z.object({ id: z.string() }) },
  "/list": {
    search: z.object({
      page: z.coerce.number().int().default(1).catch(1),
    }),
  },
} as const;

export const { buildUrl, TypedLink, useRouteParams, useRouteSearch } = createRouter({
  routes,
  adapter: nextAdapter,
});

// Fully type-safe:
buildUrl("/items/[id]", { params: { id: "abc" } }); // → "/items/abc"
buildUrl("/list", { search: { page: 2 } });         // → "/list?page=2"
```

## Install

```bash
npm install zod-routes zod
# For Next.js:
npm install next
```

## Why?

- **One source of truth.** Routes, params, and search-param schemas defined in one place.
- **Type-safe everywhere.** `buildUrl`, `TypedLink`, `useRouteParams`, and `useRouteSearch` enforce the route's contract at compile time.
- **Headless.** No styling, no markup opinions. `TypedLink` renders the framework's Link primitive.
- **Pluggable.** Ships with Next App Router and vanilla adapters. Write your own in ~30 lines.
- **Zero runtime deps.** Just `react` and `zod`.

## API

### `createRouter({ routes, adapter })`

Returns:
- `buildUrl(route, options?)` — pure URL builder, returns relative URLs. Server-safe.
- `TypedLink` — typed wrapper around the adapter's Link.
- `useRouteParams(route)` — read dynamic route params.
- `useRouteSearch(route)` — read and update search params.
- `parseRouteSearch(route, raw)` — parse `searchParams` in a server component. Server-safe.

#### Full URLs (sitemaps, emails, OG tags)

`buildUrl` always returns a relative URL. When you need a full URL, prepend your base at the callsite:

```ts
import { BASE_URL } from "@/constants";
const fullUrl = `${BASE_URL}${buildUrl("/items/[id]", { params: { id } })}`;
```

The library deliberately doesn't bind a `baseUrl` — most app code wants relative URLs (for `<Link>`, `router.push`, etc.), and the small minority that wants full URLs is concentrated in a few files (sitemap, mailers, MCP responses) where the template literal is no worse than calling a wrapper.

#### `useRouteSearch` update options

```ts
const { search, updateSearch } = useRouteSearch("/list");
updateSearch({ page: 2 });                            // merge
updateSearch({ page: 2 }, { replace: true });         // reset other fields to defaults
updateSearch({ page: 2 }, { shallow: false });        // full router navigation (default: shallow)
updateSearch((prev) => ({ page: prev.page + 1 }));    // function form
updateSearch({ q: null });                            // null deletes a field
```

### Server-side parsing with `parseRouteSearch`

In Next.js server components (or any server context), use `parseRouteSearch` to validate the incoming `searchParams` against your route's schema:

```ts
export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = router.parseRouteSearch("/publications", await searchParams);
  // `search` is fully typed as the parsed output of the route's search schema.
}
```

**Behavior:**
- Returns the parsed `z.output` of the schema on success.
- Throws an `Error` with message `[zod-routes] Invalid search params for "<route>": <zod message>` on parse failure. Next.js renders an error boundary; pair with Sentry or your error tracker for visibility.
- Throws if the route has no `search` declared — only reachable via type circumvention.

**Asymmetry with `useRouteSearch`:** the client hook falls back to defaults and emits a `console.warn` on parse failure (a hook can't reasonably throw without breaking the render tree). The server parser throws, because thrown errors there become observable 500s rather than silently-wrong URLs.

### Route definition shape

```ts
const routes = {
  "/path": {},
  "/path/[id]": { params: z.object({ id: z.string() }) },
  "/list": { search: z.object({ page: z.coerce.number().default(1).catch(1) }) },
  "/list/[id]": {
    params: z.object({ id: z.string() }),
    search: z.object({ tab: z.enum(["a", "b"]).default("a").catch("a") }),
  },
} as const;
```

`as const` is required so TypeScript preserves the literal route keys.

#### Search-param schema convention

Use `.default(x).catch(x)` for every search field:

- `.default(x)` fires when the URL doesn't have the key (you'll get `x`).
- `.catch(x)` fires when the URL has a value that fails validation (e.g., `?page=foo` for a number field).

Bare `.catch(x)` won't work on Zod ≥4.4 — the parser errors with `expected nonoptional` for missing keys before `.catch()` can fire.

## Adapters

### Next.js App Router

```ts
import { nextAdapter } from "zod-routes/next";
```

Built against the App Router (`next@>=14.1` recommended; `pushState`-based shallow updates require 14.1+ to be observed by `useSearchParams`). Pages Router is not supported.

#### Server / Client split (recommended)

`createRouter` returns both server-safe (`buildUrl`, `parseRouteSearch`) and client-only (`TypedLink`, `useRouteParams`, `useRouteSearch`) bindings in one object. To use the server-safe pieces from server components and the client pieces from client components, split the export across two files:

```ts
// app/lib/routes.ts  (no "use client" — importable from server components)
import { createRouter } from "zod-routes";
import { nextAdapter } from "zod-routes/next";

const router = createRouter({ routes, adapter: nextAdapter });

export const { buildUrl, parseRouteSearch } = router;
// re-exported for the client file to consume:
export const _router = router;
```

```ts
// app/lib/routes.client.ts  (client boundary)
"use client";
import { _router } from "./routes";

export const { TypedLink, useRouteParams, useRouteSearch } = _router;
```

Then import `buildUrl` from `routes.ts` anywhere; import `TypedLink`/hooks from `routes.client.ts` only in client components. React will surface a clear error if you accidentally use a client-only binding in a server component.

### Vanilla (`<a>` + `window.history`)

```ts
import { vanillaAdapter } from "zod-routes/vanilla";
```

Useful for plain React apps, demos, and tests.

**Limitation:** the vanilla adapter does not perform path matching, so `useRouteParams` will throw when used with it. Use it for `buildUrl`, `useRouteSearch`, and `TypedLink`. If you need params, write a tiny adapter that derives them from the current path.

### Writing your own

A `RouterAdapter` is an object with five members:

```ts
interface RouterAdapter {
  usePath(): string;
  useParams(): Record<string, string | string[]>;
  useSearchParams(): URLSearchParams;
  useNavigate(): (url: string, opts?: NavigateOptions) => void;
  Link: React.ComponentType<AdapterLinkProps>;
}
```

The four `use*` members are React hooks (called in component render). `useNavigate` is a hook that returns a navigation function. `Link` is the framework's Link primitive (or a wrapper around it).

For frameworks with a "shallow" or "search-param-only" navigation idiom, implement `opts?.shallow === true` as the fast path that bypasses route segment re-renders.

## Wrapping with your UI library

`TypedLink` is unstyled. Wrap it to add your design system:

```tsx
import { forwardRef, type ComponentProps } from "react";
import { Anchor } from "@mantine/core";

const { TypedLink: BareTypedLink, ...router } = createRouter({ /* ... */ });

export const TypedLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof BareTypedLink>
>((props, ref) => <Anchor component={BareTypedLink} ref={ref} {...props} />);
```

## License

MIT.
