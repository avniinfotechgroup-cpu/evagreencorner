import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

/**
 * HTML fallback for document/router failures only.
 * Server-function RPC must rethrow so TanStack can seroval-serialize the error —
 * returning HTML here breaks the client deserializer (and can surface as
 * "Maximum call stack size exceeded").
 */
const errorMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next, handlerType }) => {
    try {
      return await next();
    } catch (error) {
      if (handlerType === "serverFn") {
        throw error;
      }
      if (error != null && typeof error === "object" && "statusCode" in error) {
        throw error;
      }
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
);

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
