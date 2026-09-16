import { redirect } from "next/navigation";

// The tool list now lives at /registry; this route only ever existed as
// the list view, so it redirects rather than duplicating the page.
// /tools/[id] (the certificate detail page) is untouched.
export default function ToolsIndexRedirect() {
  redirect("/registry");
}
