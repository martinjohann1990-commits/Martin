"use client";

import * as React from "react";
import { AFFILIATE_REL, buildAffiliateUrl } from "@/lib/affiliate";
import { trackAffiliateClick } from "@/lib/analytics";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AffiliateLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "rel"> {
  product: Product;
  /** Wo auf der Seite steht der Link? Fließt in Sub-ID, UTM und Tracking-Event. */
  placement: string;
  /** Position in einer Liste (1-basiert). */
  position?: number;
  children: React.ReactNode;
}

/**
 * Zentraler Wrapper für ALLE Affiliate-Links.
 *
 * Übernimmt an genau einer Stelle:
 *  - Anreicherung der Ziel-URL mit Partner-ID, Sub-ID und UTM-Parametern
 *  - rechtssichere/SEO-konforme Attribute (rel="sponsored nofollow", target="_blank")
 *  - Click-Tracking
 *
 * Damit gibt es im Projekt kein einziges rohes <a href="https://amazon...">.
 */
export function AffiliateLink({
  product,
  placement,
  position,
  children,
  className,
  onClick,
  ...props
}: AffiliateLinkProps) {
  const href = buildAffiliateUrl(product, { placement, position });

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    trackAffiliateClick(product, { placement, position });
    onClick?.(event);
  };

  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel={AFFILIATE_REL}
      onClick={handleClick}
      data-affiliate-network={product.network}
      data-product-id={product.id}
      className={cn(className)}
    >
      {children}
    </a>
  );
}
