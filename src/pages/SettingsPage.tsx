import { useRef, useState, type ChangeEvent } from 'react';
import { downloadDataExport, exportAllData, importAllData } from '../lib/exportImport';

export function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleExport() {
    const data = await exportAllData();
    downloadDataExport(data);
    setStatus('Export heruntergeladen.');
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importAllData(file);
      setStatus('Import erfolgreich. Alle Daten wurden ersetzt.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Einstellungen</h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-medium">Daten</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Alle Daten liegen ausschließlich lokal auf diesem Gerät. Exportiere regelmäßig ein
          Backup als JSON-Datei.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg bg-[var(--color-accent)] p-3 text-sm font-medium text-[var(--color-bg)]"
          >
            Daten exportieren (JSON)
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[var(--color-border)] p-3 text-sm"
          >
            Daten importieren (ersetzt alles)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        {status && <p className="mt-2 text-sm text-[var(--color-accent)]">{status}</p>}
      </div>
    </div>
  );
}
