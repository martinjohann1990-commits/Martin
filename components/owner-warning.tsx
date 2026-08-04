import { AlertTriangle } from "lucide-react";
import { getMissingOwnerFields } from "@/lib/owner";

/**
 * Sichtbarer Hinweis, solange die Betreiberdaten noch Platzhalter sind.
 * Bewusst auch in Produktion sichtbar: Eine Seite mit unvollständigem
 * Impressum darf nicht unbemerkt online stehen.
 */
export function OwnerWarning() {
  const missing = getMissingOwnerFields();
  if (missing.length === 0) return null;

  return (
    <div className="mb-8 flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-destructive">
          Diese Seite ist noch nicht vollständig ausgefüllt
        </p>
        <p className="text-muted-foreground">
          Folgende Angaben fehlen in <code>data/owner.json</code>:{" "}
          {missing.join(", ")}. Ohne vollständiges Impressum darf die Seite
          nicht öffentlich betrieben werden.
        </p>
      </div>
    </div>
  );
}
