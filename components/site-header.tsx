import Link from "next/link";
import { Zap } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </span>
          <span className="tracking-tight">{siteConfig.name}</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/ratgeber"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Ratgeber
          </Link>
          <Link
            href="/#finder"
            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Finder starten
          </Link>
        </nav>
      </div>
    </header>
  );
}
