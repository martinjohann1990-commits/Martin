"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import {
  trackFinderComplete,
  trackFinderStart,
  trackFinderStep,
} from "@/lib/analytics";
import { buildLandingSlug } from "@/lib/landing-pages";
import { getBudgetBands, recommendTop } from "@/lib/recommend";
import type { Category, Product, Target } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FinderProps {
  products: Product[];
  categories: Category[];
  targets: Target[];
  /** Slugs existierender Landingpages – für den Deep-Link nach dem Ergebnis. */
  landingSlugs: string[];
}

const STEPS = ["Produktart", "Einsatz", "Budget"] as const;

/**
 * Interaktiver 3-Schritt-Finder.
 *
 * Läuft komplett clientseitig auf den bereits geladenen Daten:
 * kein API-Call, keine Ladezeit zwischen den Schritten, kein Layout-Shift.
 */
export function Finder({
  products,
  categories,
  targets,
  landingSlugs,
}: FinderProps) {
  const [step, setStep] = React.useState(0);
  const [categorySlug, setCategorySlug] = React.useState<string | null>(null);
  const [targetSlug, setTargetSlug] = React.useState<string | null>(null);
  const [budgetId, setBudgetId] = React.useState<string | null>(null);
  const [hasStarted, setHasStarted] = React.useState(false);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const categoryProducts = React.useMemo(
    () =>
      categorySlug
        ? products.filter((product) => product.category === categorySlug)
        : [],
    [products, categorySlug]
  );

  const budgetBands = React.useMemo(
    () => getBudgetBands(categoryProducts),
    [categoryProducts]
  );

  const target = targets.find((item) => item.slug === targetSlug);
  const budget = budgetBands.find((band) => band.id === budgetId);
  const category = categories.find((item) => item.slug === categorySlug);

  const isComplete = Boolean(categorySlug && targetSlug && budgetId);

  const recommendations = React.useMemo(() => {
    if (!categorySlug || !isComplete) return [];
    return recommendTop({
      products,
      categorySlug,
      target,
      budget,
    });
  }, [products, categorySlug, target, budget, isComplete]);

  const markStarted = () => {
    if (!hasStarted) {
      trackFinderStart();
      setHasStarted(true);
    }
  };

  const handleCategory = (slug: string) => {
    markStarted();
    setCategorySlug(slug);
    setBudgetId(null);
    trackFinderStep(1, "category", slug);
    setStep(1);
  };

  const handleTarget = (slug: string) => {
    setTargetSlug(slug);
    trackFinderStep(2, "target", slug);
    setStep(2);
  };

  const handleBudget = (id: string) => {
    setBudgetId(id);
    trackFinderStep(3, "budget", id);
    setStep(3);
  };

  const reset = () => {
    setStep(0);
    setCategorySlug(null);
    setTargetSlug(null);
    setBudgetId(null);
  };

  // Nach dem letzten Schritt sanft zum Ergebnis scrollen.
  React.useEffect(() => {
    if (step === 3 && recommendations.length > 0) {
      trackFinderComplete(
        categorySlug ?? "",
        targetSlug ?? "",
        budgetId ?? "",
        recommendations.length
      );
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const landingSlug =
    categorySlug && targetSlug
      ? buildLandingSlug(categorySlug, targetSlug)
      : null;
  const hasLandingPage = landingSlug ? landingSlugs.includes(landingSlug) : false;

  return (
    <div
      id="finder"
      className="scroll-mt-20 rounded-2xl border bg-card p-5 shadow-sm sm:p-8"
      data-testid="finder"
    >
      <ProgressHeader step={step} />

      {step === 0 && (
        <Question
          title="Wonach suchst du?"
          subtitle="Wähle die Produktart – der Rest dauert keine 30 Sekunden."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((item) => (
              <OptionButton
                key={item.slug}
                icon={item.icon}
                label={item.label}
                description={item.description}
                selected={categorySlug === item.slug}
                onClick={() => handleCategory(item.slug)}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 1 && (
        <Question
          title={`Wofür brauchst du ${category?.label.toLowerCase() ?? "das Produkt"}?`}
          subtitle="Danach filtern wir die Empfehlungen – nicht nach Marketing-Versprechen."
          onBack={() => setStep(0)}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {targets.map((item) => (
              <OptionButton
                key={item.slug}
                icon={item.icon}
                label={item.label}
                description={item.description}
                selected={targetSlug === item.slug}
                onClick={() => handleTarget(item.slug)}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 2 && (
        <Question
          title="Wie viel möchtest du ausgeben?"
          subtitle="Die Stufen richten sich nach den realen Preisen dieser Kategorie."
          onBack={() => setStep(1)}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {budgetBands.map((band) => (
              <OptionButton
                key={band.id}
                icon="💶"
                label={band.label}
                description={band.hint}
                selected={budgetId === band.id}
                onClick={() => handleBudget(band.id)}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 3 && (
        <div ref={resultsRef} className="animate-fade-up scroll-mt-20 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-success">
                <Sparkles className="h-4 w-4" />
                Analyse abgeschlossen
              </div>
              <h3 className="mt-1 text-2xl font-bold tracking-tight">
                Deine {recommendations.length} besten Treffer
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {category?.label} · {target?.label} · {budget?.label} (
                {budget?.hint})
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Neu starten
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((recommendation, index) => (
              <ProductCard
                key={recommendation.product.id}
                product={recommendation.product}
                position={index + 1}
                score={recommendation.score}
                reasons={recommendation.reasons}
                placement={`finder-${categorySlug}-${targetSlug}`}
              />
            ))}
          </div>

          {hasLandingPage && landingSlug && (
            <Link
              href={`/${landingSlug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Ausführlicher Ratgeber: Die besten {category?.label} für{" "}
              {target?.label} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressHeader({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      {STEPS.map((label, index) => {
        const state =
          step > index ? "done" : step === index ? "active" : "todo";
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                state === "done" && "bg-success text-success-foreground",
                state === "active" && "bg-primary text-primary-foreground",
                state === "todo" && "bg-muted text-muted-foreground"
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm font-medium sm:inline",
                state === "todo" && "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-0.5 flex-1 rounded",
                  step > index ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Question({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up space-y-4">
      <div className="space-y-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </button>
        )}
        <h3 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function OptionButton({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group flex h-full flex-col gap-1 rounded-lg border bg-background p-4 text-left transition-all",
        "hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected && "border-primary bg-primary/5 shadow-sm"
      )}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {icon}
      </span>
      <span className="font-semibold">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
