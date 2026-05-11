import React from 'react';
import { useAppStore } from '../store/appStore';
import { HomeView } from './views/HomeView';
import { UploadView } from './views/UploadView';
import { EditorView } from './views/EditorView';
import { SplitView } from './views/SplitView';
import { ResultsView } from './views/ResultsView';

type AppStep = 'home' | 'upload' | 'edit' | 'split' | 'results';

export const MainLayout: React.FC = () => {
  const { sessionId } = useAppStore();
  const [currentStep, setCurrentStep] = React.useState<AppStep>('home');

  // Simple routing based on state and URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');

    if (sessionParam && !sessionId) {
      useAppStore.getState().joinSession(sessionParam);
    }
  }, [sessionId]);

  React.useEffect(() => {
    if (sessionId) {
      if (currentStep === 'home') {
        setCurrentStep('upload');
      }
    } else {
      setCurrentStep('home');
    }
  }, [sessionId, currentStep]);

  // Bottom Navigation
  // Expose step setter to global context or listen to store if we want tight coupling.
  // For simplicity, we can pass it down via context or just use an event listener,
  // but since we want the UploadView to be able to navigate to 'edit', we can add a simple CustomEvent.
  React.useEffect(() => {
    const handleNavigation = (e: Event) => {
      const targetStep = (e as CustomEvent).detail;
      setCurrentStep(targetStep);
    };
    window.addEventListener('navigate', handleNavigation);
    return () => window.removeEventListener('navigate', handleNavigation);
  }, []);

  const renderNav = () => {
    if (!sessionId || currentStep === 'home') return null;

    const navItems: { id: AppStep; label: string }[] = [
      { id: 'upload', label: 'Účtenka' },
      { id: 'edit', label: 'Položky' },
      { id: 'split', label: 'Rozdělit' },
      { id: 'results', label: 'Výsledek' },
    ];

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="flex max-w-md mx-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentStep(item.id)}
              className={`flex-1 py-4 text-xs font-semibold text-center transition-colors ${
                currentStep === item.id ? 'text-blue-600 border-t-2 border-blue-600 -mt-[1px]' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl relative">
        <main className="h-full overflow-y-auto">
          {currentStep === 'home' && <HomeView />}
          {currentStep === 'upload' && <UploadView />}
          {currentStep === 'edit' && <EditorView />}
          {currentStep === 'split' && <SplitView />}
          {currentStep === 'results' && <ResultsView />}
        </main>
        {renderNav()}
      </div>
    </div>
  );
};
