import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../design-system/tokens.css';
import '../../styles/tailwind.css';
import { ChairHourCard } from '../../components/performance/ChairHourCard';

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme') || 'barber';
document.documentElement.dataset.mode = params.get('mode') || 'dark';
createRoot(document.getElementById('root')!).render(<MemoryRouter><main className="min-h-screen bg-theme-bg p-4 text-theme-text"><ChairHourCard month="2026-10-01" endDate="2026-10-31" /></main></MemoryRouter>);
