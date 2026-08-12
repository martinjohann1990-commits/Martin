import { useState } from 'react';
import { BottomNav, type Tab } from './components/BottomNav';
import { DailyPage } from './pages/DailyPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAppState } from './hooks/useAppState';

export default function App() {
  const [tab, setTab] = useState<Tab>('heute');
  const state = useAppState();

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1 pb-4">
        {tab === 'heute' && (
          <DailyPage
            todayKey={state.todayKey}
            routines={state.routines}
            completions={state.completions}
            level={state.fullState.level.level}
            xpIntoLevel={state.fullState.level.xpIntoLevel}
            xpForNextLevel={state.fullState.level.xpForNextLevel}
            progress={state.fullState.level.progress}
            streak={state.fullState.currentStreak}
            consistencyScore={state.consistencyScore}
            previousConsistencyScore={state.previousConsistencyScore}
          />
        )}
        {tab === 'routinen' && <RoutinesPage routines={state.routines} />}
        {tab === 'einstellungen' && <SettingsPage />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
