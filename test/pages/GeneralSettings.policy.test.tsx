import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const updateSettings = vi.fn().mockResolvedValue({});
const state: { settings: Record<string, unknown> | null; profileRegion: string } = {
  settings: null,
  profileRegion: 'PT',
};

vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: state.settings }),
  useUpdateBusinessSettings: () => ({ mutateAsync: updateSettings }),
  useUpdateBusinessTimezone: () => ({ mutateAsync: vi.fn().mockResolvedValue('saved') }),
  useProfileFields: () => ({ data: { business_name: 'Barbearia Bob', region: state.profileRegion } }),
  useUpdateProfileFields: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1' }, companyId: 'owner-1', region: state.profileRegion, updateRegion: vi.fn() }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    auth: { updateUser: () => Promise.resolve({ error: null }) },
    storage: { from: () => ({}) },
  },
}));

vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../hooks/useBusinessCopy', () => ({ useBusinessCopy: () => ({ businessNamePlaceholder: '', slugPlaceholder: '' }) }));
vi.mock('../../components/SettingsLayout', () => ({ SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../components/SettingsSection', () => ({
  SettingsSection: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
}));
vi.mock('../../components/BrandIdentitySection', () => ({ BrandIdentitySection: () => null }));
vi.mock('../../components/BusinessGalleryManager', () => ({ BusinessGalleryManager: () => null }));
vi.mock('../../components/BusinessHoursEditor', () => ({ BusinessHoursEditor: () => null }));
vi.mock('../../components/PhoneInput', () => ({ PhoneInput: () => null }));
vi.mock('../../components/HelpButtons', () => ({ InfoButton: () => null }));
vi.mock('../../components/SaveFooter', () => ({ SaveFooter: ({ onSave }: { onSave: () => void }) => <button onClick={onSave}>Salvar</button> }));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    isBeauty: false,
    accent: { bgDim: '', border: '', text: '', borderDim: '', shadow: '' },
    colors: { text: '', textSecondary: '', textMuted: '', inputBg: '', border: '' },
    classes: { label: 'label', input: 'input' },
  }),
}));

import { GeneralSettings } from '../../pages/settings/GeneralSettings';
import { CANCELLATION_POLICY_NOTES_HINT } from '@/utils/cancellationPolicyCopy';

describe('GeneralSettings — PR-1 política gerada da regra real (D3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.profileRegion = 'PT';
    state.settings = {
      user_id: 'owner-1',
      business_hours: null,
      cancellation_policy: 'flexible',
      timezone: 'Europe/Lisbon',
    };
  });

  it('não mostra a palavra flexible nem chips 24h/48h/72h com multa', () => {
    render(<GeneralSettings />);
    expect(screen.queryByText(/^flexible$/i)).toBeNull();
    expect(screen.queryByDisplayValue(/^flexible$/i)).toBeNull();
    expect(screen.queryByText('Flexível')).toBeNull();
    expect(screen.queryByText('Moderada')).toBeNull();
    expect(screen.queryByText('Rígida')).toBeNull();

    expect(screen.queryByText('72h')).toBeNull();
    expect(screen.queryByText(/cobrança de 50%/i)).toBeNull();
  });

  it('mostra o texto gerado da regra real (cancelar até 2h antes)', () => {
    render(<GeneralSettings />);
    expect(screen.getByTestId('cancellation-policy-generated')).toHaveValue('Você pode cancelar até 2h antes pela Minha Área');
  });

  it('mostra a dica sob o campo de observações, sem prometer multa', () => {
    render(<GeneralSettings />);
    expect(screen.getByTestId('cancellation-policy-notes-hint')).toHaveTextContent(CANCELLATION_POLICY_NOTES_HINT);
    expect(screen.queryByText(/cobrança de 50%/i)).toBeNull();
  });
  it('salva prazo, texto e observações pelo formulário geral', async () => {
    render(<GeneralSettings />);
    fireEvent.change(screen.getByTestId('cancel-cutoff'), { target: { value: '24' } });
    expect(screen.getByTestId('cancellation-policy-generated')).toHaveValue('Você pode cancelar até 24h antes pela Minha Área');
    fireEvent.change(screen.getByTestId('cancellation-policy-generated'), { target: { value: 'Cancele até 24 horas antes.' } });
    fireEvent.change(screen.getByTestId('cancellation-policy-notes'), { target: { value: 'Avise a equipe.' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ client_cancel_cutoff_hours: 24, client_cancel_note: 'Avise a equipe.', client_cancel_policy_text: 'Cancele até 24 horas antes.' })));
  });

});
