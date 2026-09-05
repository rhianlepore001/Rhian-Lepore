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
