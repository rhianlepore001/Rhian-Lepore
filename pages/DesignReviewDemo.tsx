import React, { useState } from 'react';
import { BugReportModal } from '../components/BugReportModal';
import { Button } from '../components/ui/Button';
import { MoreOptionsDrawer } from '../components/MoreOptionsDrawer';
import { OccupancyRateCard } from '../components/dashboard/OccupancyRateCard';
import { UIProvider } from '../contexts/UIContext';
import { Card } from '../components/ui/Card';

export const DesignReviewDemo: React.FC = () => {
  const [bugOpen, setBugOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <UIProvider>
      <div className="min-h-screen bg-theme-bg p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-theme-text text-3xl font-heading font-bold mb-2">
            Design Review Demo
          </h1>
          <p className="text-theme-textSecondary text-sm">
            Demonstração isolada para validação visual com Playwright
          </p>
        </div>

        <Card variant="outlined" className="max-w-2xl">
          <h2 className="text-theme-text text-lg font-bold mb-4">Taxa de Ocupação</h2>
          <OccupancyRateCard />
        </Card>

        <Card variant="outlined" className="max-w-2xl">
          <h2 className="text-theme-text text-lg font-bold mb-4">Ações de Menu</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <Button onClick={() => setMenuOpen(true)} data-testid="open-more-options">
              Abrir Menu Mobile
            </Button>
            <Button onClick={() => setBugOpen(true)} variant="secondary">
              Abrir Bug Reporter
            </Button>
          </div>
        </Card>

        {bugOpen && <BugReportModal reportType="bug" onClose={() => setBugOpen(false)} />}
        {menuOpen && <MoreOptionsDrawer onClose={() => setMenuOpen(false)} />}
      </div>
    </UIProvider>
  );
};
