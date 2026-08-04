import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Sterne-Bewertung als reine Server-Komponente (kein JS im Browser nötig).
 * Halbe Sterne werden über eine überlagerte, beschnittene Ebene dargestellt.
 */
export function StarRating({
  rating,
  reviewCount,
  className,
  size = "sm",
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const percentage = (clamped / 5) * 100;
  const starSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative inline-flex"
        role="img"
        aria-label={`Bewertung ${clamped.toFixed(1)} von 5 Sternen`}
      >
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className={cn(starSize, "text-amber-300")} />
          ))}
        </div>
        <div
          className="absolute inset-0 flex gap-0.5 overflow-hidden"
          style={{ width: `${percentage}%` }}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={cn(starSize, "shrink-0 fill-amber-400 text-amber-400")}
            />
          ))}
        </div>
      </div>
      <span className="text-sm font-semibold">{clamped.toFixed(1)}</span>
      {typeof reviewCount === "number" && (
        <span className="text-xs text-muted-foreground">
          ({new Intl.NumberFormat("de-DE").format(reviewCount)} Bewertungen)
        </span>
      )}
    </div>
  );
}
