import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '../../design-system/tokens.css';
import '../../styles/tailwind.css';
import { CheckoutModal } from '../../components/CheckoutModal';
import { ToastProvider } from '../../components/ui/Toast';
import { ChairHourCard } from '../../components/performance/ChairHourCard';
import { FixedCostsSettings } from '../../components/settings/FixedCostsSettings';
import { HourlyResults } from '../../pages/HourlyResults';

const day = { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] };
const fixtureHours = { mon: day, tue: day, wed: day, thu: day, fri: day, sat: { isOpen: true, blocks: [{ start: '08:00', end: '14:00' }] }, sun: { isOpen: false, blocks: [] } };
const closedDay = { isOpen: false, blocks: [] as { start: string; end: string }[] };

const fixtureApi = {
  list: async () => ({
    costs: [
      { id: 'c1', company_id: 'fixture-company', professional_id: null, category: 'Aluguel', description: 'Aluguel do ponto', amount: 2400, start_date: '2026-01-01', end_date: null, is_owner_salary: false, active: true },
      { id: 'c2', company_id: 'fixture-company', professional_id: null, category: 'Contas', description: 'Luz e água', amount: 380, start_date: '2026-01-01', end_date: null, is_owner_salary: false, active: true },
    ],
    services: [{ id: 's1', name: 'Corte' }, { id: 's2', name: 'Barba' }],
    materials: [{ service_id: 's1', amount: 4.5 }],
    professionals: [{ id: 'tm-1', name: 'Ana Souza', working_hours: fixtureHours }, { id: 'tm-2', name: 'Bruno Lima', working_hours: null }],
    lowMargin: 20,
    lowMarginSaved: true,
  }),
  suggestions: async () => [],
  saveCost: async () => undefined,
  saveLowMargin: async () => undefined,
  saveWorkingHours: async () => undefined,
  saveMaterial: async () => undefined,
} as unknown as React.ComponentProps<typeof FixedCostsSettings>['api'];

const emptySettingsApi = {
  list: async () => ({
    costs: [],
    services: [{ id: 's1', name: 'Corte' }],
    materials: [],
    professionals: [{ id: 'tm-1', name: 'Ana Souza', working_hours: null }],
    lowMargin: 20,
    lowMarginSaved: false,
  }),
  suggestions: async () => [],
  saveCost: async () => undefined,
  saveLowMargin: async () => undefined,
  saveWorkingHours: async () => undefined,
  saveMaterial: async () => undefined,
} as unknown as React.ComponentProps<typeof FixedCostsSettings>['api'];

const configuringSettingsApi = {
  list: async () => ({
    costs: [{ id: 'c1', company_id: 'fixture-company', professional_id: null, category: 'Aluguel', description: 'Aluguel', amount: 500, start_date: '2026-01-01', end_date: null, is_owner_salary: false, active: true }],
    services: [{ id: 's1', name: 'Corte' }],
    materials: [],
    professionals: [{ id: 'tm-1', name: 'Ana Souza', working_hours: fixtureHours }],
    lowMargin: 20,
    lowMarginSaved: false,
  }),
  suggestions: async () => [],
  saveCost: async () => undefined,
  saveLowMargin: async () => undefined,
  saveWorkingHours: async () => undefined,
  saveMaterial: async () => undefined,
} as unknown as React.ComponentProps<typeof FixedCostsSettings>['api'];

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme') || 'barber';
document.documentElement.dataset.mode = params.get('mode') || 'dark';
const screen = params.get('screen') || 'card';

const view =
  screen === 'checkout'
    ? (
      <CheckoutModal
        appointment={{ id: 'fixture-appointment', clientName: 'Cliente fictício', service: 'Serviço de demonstração', time: '10:00', appointment_time: '2026-11-08T10:00:00Z', status: 'Confirmed', price: 100, duration_minutes: 40 }}
        teamMembers={[]}
        financialSettings={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    )
    : screen === 'settings'
      ? <FixedCostsSettings companyId="fixture-company" region="BR" timezone="America/Sao_Paulo" businessHours={fixtureHours} api={fixtureApi} />
      : screen === 'settings-empty'
        ? <FixedCostsSettings companyId="fixture-company" region="BR" timezone="America/Sao_Paulo" businessHours={{ mon: closedDay, tue: closedDay, wed: closedDay, thu: closedDay, fri: closedDay, sat: closedDay, sun: closedDay }} api={emptySettingsApi} />
        : screen === 'settings-configuring'
          ? <FixedCostsSettings companyId="fixture-company" region="BR" timezone="America/Sao_Paulo" businessHours={fixtureHours} api={configuringSettingsApi} />
          : screen === 'results-empty' || screen === 'results-data'
            ? (
              <Routes>
                <Route path="*" element={<HourlyResults />} />
              </Routes>
            )
            : <ChairHourCard month="2026-10-01" endDate={params.get('range') ? '2026-10-31' : null} />;

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[`/resultados-por-hora?de=2026-11-01&ate=2026-11-30`]}>
    <ToastProvider>
      <main className="min-h-screen bg-theme-bg p-4 text-theme-text">{view}</main>
    </ToastProvider>
  </MemoryRouter>,
);