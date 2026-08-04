import { BadgeCheck, Clock3, Lock, ScanSearch } from "lucide-react";

const items = [
  {
    icon: ScanSearch,
    title: "Unabhängig geprüft",
    text: "Jede Empfehlung basiert auf Testberichten, Datenblättern und tausenden Kundenrezensionen.",
  },
  {
    icon: Clock3,
    title: "Ergebnis in 30 Sekunden",
    text: "Drei Fragen statt drei Stunden Recherche – ohne Anmeldung und ohne Newsletter.",
  },
  {
    icon: BadgeCheck,
    title: "Transparent finanziert",
    text: "Wir verdienen an Provisionen des Händlers. Der Preis bleibt für dich identisch.",
  },
  {
    icon: Lock,
    title: "Keine Datensammlung",
    text: "Kein Konto, kein Tracking-Profil. Deine Antworten bleiben im Browser.",
  },
];

export function TrustBar() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-lg border bg-card p-4 shadow-sm"
        >
          <item.icon className="h-5 w-5 text-primary" />
          <p className="mt-2 text-sm font-semibold">{item.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.text}
          </p>
        </div>
      ))}
    </section>
  );
}
