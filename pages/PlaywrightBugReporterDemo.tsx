import React, { useEffect, useState } from 'react';
import { BugReportModal } from '../components/BugReportModal';
import { Button } from '../components/ui/Button';
import { UIProvider } from '../contexts/UIContext';
import { capturePageForBugReport, type BugContext } from '../lib/bugReport';

export const PlaywrightBugReporterDemo: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturedContext, setCapturedContext] = useState<BugContext | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', 'barber');
    html.setAttribute('data-mode', 'dark');
    let active = true;
    void (async () => {
      const result = await capturePageForBugReport();
      if (!active) return;
      setScreenshot(result.screenshot);
      setCapturedContext(result.context);
      setOpen(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const reopen = () => {
    void (async () => {
      setOpen(false);
      const result = await capturePageForBugReport();
      setScreenshot(result.screenshot);
      setCapturedContext(result.context);
      setOpen(true);
    })();
  };

  return (
    <UIProvider>
      <div className="min-h-screen bg-theme-bg p-8">
        <div className="mb-6 rounded-xl bg-theme-accent text-black px-4 py-3 font-bold text-lg max-w-lg">
          Conteúdo visível da tela — o print precisa mostrar este aviso.
        </div>
        <h1 className="text-theme-text text-2xl font-bold mb-4">Demo do Bug Reporter</h1>
        <p className="text-theme-text-secondary mb-4 max-w-lg">
          Esta tela simula o painel. O print é capturado antes do modal abrir.
        </p>
        <Button onClick={reopen}>Abrir modal</Button>
        {open && (
          <BugReportModal
            reportType="bug"
            onClose={() => setOpen(false)}
            screenshot={screenshot}
            capturedContext={capturedContext}
          />
        )}
      </div>
    </UIProvider>
  );
};
