import { Github, Linkedin } from "lucide-react";

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`flex flex-col items-center gap-1.5 text-center text-xs text-muted-foreground ${className}`}
    >
      <p>
        Desenvolvido por:{" "}
        <span className="font-semibold text-foreground">Marcos Antônio Felix</span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-primary">
        <a
          href="https://github.com/marcosfilho95"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub de Marcos Antônio Felix"
          className="inline-flex items-center gap-1.5 font-medium transition-colors hover:underline"
        >
          <Github className="size-4" aria-hidden />
          <span>marcosfilho95</span>
        </a>
        <a
          href="https://www.linkedin.com/in/marcosantoniofelix/?skipRedirect=true"
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn de Marcos Antônio Felix"
          className="inline-flex items-center gap-1.5 font-medium transition-colors hover:underline"
        >
          <Linkedin className="size-4" aria-hidden />
          <span>marcosantoniofelix</span>
        </a>
      </div>
    </footer>
  );
}

export function GoogleLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C39.9 36.6 44 31 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
