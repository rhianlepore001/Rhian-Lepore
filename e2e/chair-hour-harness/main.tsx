import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../design-system/tokens.css';
import '../../styles/tailwind.css';
import { CheckoutModal } from '../../components/CheckoutModal';
import { ToastProvider } from '../../components/ui/Toast';
import { ChairHourCard } from '../../components/performance/ChairHourCard';

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme') || 'barber';
document.documentElement.dataset.mode = params.get('mode') || 'dark';
const checkout = params.get('screen') === 'checkout';
createRoot(document.getElementById('root')!).render(<MemoryRouter><ToastProvider><main className="min-h-screen bg-theme-bg p-4 text-theme-text">{checkout ? <CheckoutModal appointment={{ id: 'fixture-appointment', clientName: 'Cliente fictício', service: 'Serviço de demonstração', time: '10:00', status: 'Confirmed', price: 100, duration_minutes: 40 }} teamMembers={[]} onClose={() => {}} onConfirm={() => {}} /> : <ChairHourCard month="2026-10-01" endDate="2026-10-31" />}</main></ToastProvider></MemoryRouter>);
