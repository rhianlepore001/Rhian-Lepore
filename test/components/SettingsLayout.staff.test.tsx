import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OWNER_SETTINGS_CARD_LABELS } from '@/constants';

const auth = { role: 'staff' as const, isDev: false };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth,
}));
vi.mock('@/hooks/useAppTour', () => ({
  useAppTour: () => ({}),
}));
vi.mock('@/hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    accent: { bg: '', text: '', bgDim: '', border: '' },
    colors: {
      text: '',
      textSecondary: '',
      textMuted: '',
      bg: '',
      divider: '',
      card: '',
      border: '',
    },
  }),
}));

import { SettingsLayout } from '@/components/SettingsLayout';

describe('SettingsLayout — colaborador com conta nova (fixture staff)', () => {
  it('não mostra os cards de Ajustes do dono', () => {
    render(
      <MemoryRouter initialEntries={['/configuracoes/servicos']}>
        <SettingsLayout>
          <p>conteúdo</p>
        </SettingsLayout>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Serviços').length).toBeGreaterThan(0);
    for (const card of OWNER_SETTINGS_CARD_LABELS) {
      expect(screen.queryByText(card)).not.toBeInTheDocument();
    }
  });
});
