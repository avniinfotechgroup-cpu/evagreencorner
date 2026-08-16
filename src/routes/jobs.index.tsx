import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL → Job and Internship listing */
export const Route = createFileRoute("/jobs/")({
  beforeLoad: () => {
    throw redirect({ to: "/job-and-internship", replace: true });
  },
});
