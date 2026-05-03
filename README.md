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
      page: z.coerce.number().int().catch(1),
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

### `createRouter({ routes, adapter, baseUrl? })`

Returns:
- `buildUrl(route, options?)` — pure URL builder. Server-safe.
- `buildFullUrl(route, options?)` — same as `buildUrl` but prepends `baseUrl`. If you didn't pass a `baseUrl`, returns the same string as `buildUrl`.
- `TypedLink` — typed wrapper around the adapter's Link.
- `useRouteParams(route)` — read dynamic route params.
- `useRouteSearch(route)` — read and update search params.

### Route definition shape

```ts
const routes = {
  "/path": {},
  "/path/[id]": { params: z.object({ id: z.string() }) },
  "/list": { search: z.object({ page: z.coerce.number().catch(1) }) },
  "/list/[id]": {
    params: z.object({ id: z.string() }),
    search: z.object({ tab: z.enum(["a", "b"]).catch("a") }),
  },
} as const;
```

`as const` is required so TypeScript preserves the literal route keys.

## Adapters

### Next.js App Router

```ts
import { nextAdapter } from "zod-routes/next";
```

Built against the App Router (`next@>=14`). Pages Router is not supported.

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
