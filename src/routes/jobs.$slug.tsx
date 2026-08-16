import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL → Job and Internship detail */
export const Route = createFileRoute("/jobs/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/job-and-internship/$slug",
      params: { slug: params.slug },
      replace: true,
    });
  },
});
