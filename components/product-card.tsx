import { ArrowUpRight, Check, ShieldCheck, X } from "lucide-react";
import { AffiliateLink } from "@/components/affiliate-link";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getMerchantLabel } from "@/lib/affiliate";
import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  /** Wird für Tracking, Sub-ID und UTM-Kampagne verwendet. */
  placement: string;
  /** 1-basierte Position – steuert auch das Ranking-Label ("Platz 1"). */
  position: number;
  /** Match-Score aus der Empfehlungs-Engine (0–100). */
  score?: number;
  /** Begründungen, warum das Produkt empfohlen wird. */
  reasons?: string[];
  className?: string;
}

const rankLabels = [
  "Unsere Top-Empfehlung",
  "Starke Alternative",
  "Ebenfalls empfehlenswert",
];

export function ProductCard({
  product,
  placement,
  position,
  score,
  reasons = [],
  className,
}: ProductCardProps) {
  const isTop = position === 1;

  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md",
        isTop && "border-primary/60 shadow-md ring-1 ring-primary/20",
        className
      )}
    >
      {/* Visual: reiner CSS-Gradient statt Bild -> keine Ladezeit, kein Layout-Shift */}
      <div
        className={cn(
          "relative flex h-28 items-end bg-gradient-to-br p-4",
          product.accent
        )}
      >
        <span className="absolute right-3 top-3 rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          Platz {position}
        </span>
        <div className="text-sm font-semibold uppercase tracking-wide text-white/90">
          {product.brand}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isTop ? "default" : "secondary"}>
            {rankLabels[position - 1] ?? "Empfehlung"}
          </Badge>
          {typeof score === "number" && (
            <Badge variant="success">{score} % Match</Badge>
          )}
          {product.highlight && (
            <Badge variant="muted">{product.highlight}</Badge>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold leading-tight tracking-tight">
            {product.name}
          </h3>
          <StarRating
            rating={product.rating}
            reviewCount={product.reviewCount}
          />
          <p className="text-sm text-muted-foreground">{product.summary}</p>
        </div>

        {reasons.length > 0 && (
          <ul className="space-y-1 rounded-md bg-muted/60 p-3">
            {reasons.map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-2 text-sm font-medium"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-2 text-sm">
          {product.pros.slice(0, 3).map((pro) => (
            <div key={pro} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{pro}</span>
            </div>
          ))}
          {product.cons.slice(0, 2).map((con) => (
            <div
              key={con}
              className="flex items-start gap-2 text-muted-foreground"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{con}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-3 pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-muted-foreground">
              Richtpreis – Tagespreis prüfen
            </span>
          </div>

          <AffiliateLink
            product={product}
            placement={placement}
            position={position}
            className={cn(
              buttonVariants({ variant: "cta", size: "lg" }),
              "w-full"
            )}
          >
            Preis auf {getMerchantLabel(product.network)} prüfen
            <ArrowUpRight className="h-4 w-4" />
          </AffiliateLink>

          <p className="text-center text-[11px] leading-tight text-muted-foreground">
            Werbe-Link · Preis kann sich geändert haben · Kein Aufpreis für dich
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
