export type Tab = 'heute' | 'routinen' | 'einstellungen';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'heute', label: 'Heute', icon: '✓' },
  { id: 'routinen', label: 'Routinen', icon: '⟳' },
  { id: 'einstellungen', label: 'Einstellungen', icon: '⚙' },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="sticky bottom-0 flex border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs ${
            active === tab.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
          }`}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
