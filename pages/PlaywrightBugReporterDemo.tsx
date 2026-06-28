import React, { useState } from 'react';
import { BugReportModal } from '../components/BugReportModal';
import { Button } from '../components/ui/Button';
import { UIProvider } from '../contexts/UIContext';

export const PlaywrightBugReporterDemo: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <UIProvider>
      <div className="min-h-screen bg-theme-bg p-8">
        <h1 className="text-theme-text text-2xl font-bold mb-4">Demo do Bug Reporter</h1>
        <Button onClick={() => setOpen(true)}>Abrir modal</Button>
        {open && <BugReportModal reportType="bug" onClose={() => setOpen(false)} />}
      </div>
    </UIProvider>
  );
};
