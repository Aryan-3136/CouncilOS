import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "CouncilOS", short_name: "CouncilOS", description: "Your personal and council command center.", start_url: "/", display: "standalone", background_color: "#fbfcfe", theme_color: "#111827", icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}
