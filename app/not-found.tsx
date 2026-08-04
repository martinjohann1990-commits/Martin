import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllLandingPages, getLandingHeadline } from "@/lib/landing-pages";

export default function NotFound() {
  const suggestions = getAllLandingPages().slice(0, 6);

  return (
    <div className="container py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Fehler 404
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Diese Seite gibt es nicht (mehr)
        </h1>
        <p className="mt-3 text-muted-foreground">
          Dafür haben wir bestimmt die passende Kaufberatung – oder du startest
          direkt den Finder.
        </p>
        <Link
          href="/#finder"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Finder starten
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-2">
        {suggestions.map((page) => (
          <Link
            key={page.slug}
            href={`/${page.slug}`}
            className="rounded-lg border bg-card p-4 font-medium transition hover:border-primary"
          >
            {getLandingHeadline(page)}
          </Link>
        ))}
      </div>
    </div>
  );
}
