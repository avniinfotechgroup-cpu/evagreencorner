import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageLoader } from "@/components/platform/PageLoader";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Only while a route loader/Suspense is actually pending — not a sticky overlay
    defaultPendingComponent: () => <PageLoader label="Loading EVA Green Corner…" />,
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
  });

  return router;
};
