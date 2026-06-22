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
    ],
  }),
  component: App,
});
