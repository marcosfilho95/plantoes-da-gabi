import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Plantões da Gabi" },
      {
        name: "description",
        content: "Agenda PWA para organizar os plantões da Gabriella.",
      },
      { property: "og:title", content: "Plantões da Gabi" },
      {
        property: "og:description",
        content: "Agenda PWA para organizar os plantões da Gabriella.",
      },
      { property: "og:url", content: "https://plantoesdagabi.vercel.app/" },
      { property: "og:image", content: "https://plantoesdagabi.vercel.app/og-image.png" },
      { property: "og:image:secure_url", content: "https://plantoesdagabi.vercel.app/og-image.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Plantões da Gabi — Organize seus plantões e finanças" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://plantoesdagabi.vercel.app/og-image.png" },
    ],
  }),
  component: App,
});
