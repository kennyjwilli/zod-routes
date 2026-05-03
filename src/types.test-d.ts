import { expectTypeOf } from "expect-type";
import { z } from "zod";
import { createRouter } from "./index";
import type { AdapterLinkProps, RouterAdapter } from "./types";

const stubAdapter: RouterAdapter = {
  usePath: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  useNavigate: () => () => {},
  // biome-ignore lint/suspicious/noExplicitAny: type test stub
  Link: (_props: AdapterLinkProps) => null as any,
};

const routes = {
  "/": {},
  "/items/[id]": { params: z.object({ id: z.string() }) },
  "/list": { search: z.object({ page: z.coerce.number().default(1).catch(1) }) },
  "/items/[id]/edit": {
    params: z.object({ id: z.string() }),
    search: z.object({ tab: z.enum(["a", "b"]).default("a").catch("a") }),
  },
} as const;

const router = createRouter({ routes, adapter: stubAdapter });

// buildUrl: simple route — no args required
router.buildUrl("/");

// buildUrl: requires params for routes with params
// @ts-expect-error - missing required params
router.buildUrl("/items/[id]");
router.buildUrl("/items/[id]", { params: { id: "x" } });

// buildUrl: wrong param key is an error
// @ts-expect-error - wrong key
router.buildUrl("/items/[id]", { params: { wrongKey: "x" } });

// buildUrl: search optional on routes with search
router.buildUrl("/list");
router.buildUrl("/list", { search: { page: 2 } });

// useRouteParams: only allowed on routes with params
router.useRouteParams("/items/[id]");
// @ts-expect-error - route has no params
router.useRouteParams("/");
// @ts-expect-error - route has no params
router.useRouteParams("/list");

// useRouteParams return type
expectTypeOf(router.useRouteParams("/items/[id]")).toEqualTypeOf<{ id: string }>();

// useRouteSearch: only allowed on routes with search
router.useRouteSearch("/list");
// @ts-expect-error - no search
router.useRouteSearch("/");
// @ts-expect-error - no search
router.useRouteSearch("/items/[id]");

// useRouteSearch return type
expectTypeOf(router.useRouteSearch("/list").search).toEqualTypeOf<{ page: number }>();

// createRouter's return type does NOT include buildFullUrl — full URLs are
// the user's job (template literal at callsite). Verify by asserting the
// property is absent at the type level.
expectTypeOf<keyof typeof router>().toEqualTypeOf<
  "buildUrl" | "TypedLink" | "useRouteParams" | "useRouteSearch"
>();
