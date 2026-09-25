import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const state: { settings: Record<string, unknown> | null; profileRegion: string } = {
  settings: null,
  profileRegion: 'BR',
};
const updateSettings = vi.fn().mockResolvedValue({});
const updateProfile = vi.fn().mockResolvedValue({});
const updateTimezone = vi.fn().mockResolvedValue('saved');

vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: state.settings }),
  useUpdateBusinessSettings: () => ({ mutateAsync: updateSettings }),
  useUpdateBusinessTimezone: () => ({ mutateAsync: updateTimezone }),
  useProfileFields: () => ({ data: { business_name: 'Barbearia Bob', region: state.profileRegion } }),
  useUpdateProfileFields: () => ({ mutateAsync: updateProfile }),
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
  SettingsSection: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => <section><h2>{title}</h2>{children}</section>,
}));
vi.mock('../../components/BrandIdentitySection', () => ({ BrandIdentitySection: () => null }));
vi.mock('../../components/BusinessGalleryManager', () => ({ BusinessGalleryManager: () => null }));
vi.mock('../../components/BusinessHoursEditor', () => ({ BusinessHoursEditor: () => null }));
vi.mock('../../components/PhoneInput', () => ({ PhoneInput: () => null }));
vi.mock('../../components/HelpButtons', () => ({ InfoButton: () => null }));
vi.mock('../../components/SaveFooter', () => ({
  SaveFooter: ({ onSave, hasChanges }: { onSave: () => void; hasChanges: boolean }) => (
    <button type="button" onClick={onSave} data-has-changes={String(hasChanges)}>Salvar</button>
  ),
}));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    isBeauty: false,
    accent: { bgDim: '', border: '', text: '', borderDim: '', shadow: '' },
    colors: { text: '', textSecondary: '', textMuted: '', inputBg: '', border: '' },
    classes: { label: 'label', input: 'input' },
  }),
}));

import { GeneralSettings } from '../../pages/settings/GeneralSettings';

const select = () => screen.getByTestId('business-timezone-select') as HTMLSelectElement;
const baseSettings = { user_id: 'owner-1', business_hours: null, cancellation_policy: 'x' };

describe('GeneralSettings — fuso horário do estabelecimento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.settings = null;
    state.profileRegion = 'BR';
  });

  it('PT sem fuso salvo mostra Europe/Lisbon (padrão do país) e permite trocar', () => {
    state.profileRegion = 'PT';
    state.settings = { ...baseSettings, timezone: null };
    render(<GeneralSettings />);
    expect(select().value).toBe('Europe/Lisbon');
    expect(select().disabled).toBe(false);
    expect(screen.queryByTestId('business-timezone-pending')).toBeNull();
  });

  it('BR com fuso salvo (Manaus) mostra o salvo', () => {
    state.settings = { ...baseSettings, timezone: 'America/Manaus' };
    render(<GeneralSettings />);
    expect(select().value).toBe('America/Manaus');
  });

  it('antes da migration (sem coluna) mostra o padrão da região, desabilitado, e não tenta gravar', async () => {
    state.settings = { ...baseSettings }; // sem chave timezone
    render(<GeneralSettings />);
    expect(select().value).toBe('America/Sao_Paulo');
    expect(select().disabled).toBe(true);
    expect(screen.getByTestId('business-timezone-pending')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalled());
    expect(updateTimezone).not.toHaveBeenCalled();
  });

  it('trocar o fuso marca alteração e salva o novo valor', async () => {
    state.settings = { ...baseSettings, timezone: 'America/Sao_Paulo' };
    render(<GeneralSettings />);
    fireEvent.change(select(), { target: { value: 'America/Manaus' } });
    expect(screen.getByRole('button', { name: 'Salvar' }).getAttribute('data-has-changes')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(updateTimezone).toHaveBeenCalledWith('America/Manaus'));
  });

  it('trocar a região para Portugal leva o fuso para Europe/Lisbon', async () => {
    state.settings = { ...baseSettings, timezone: 'America/Sao_Paulo' };
    render(<GeneralSettings />);
    fireEvent.click(screen.getByRole('button', { name: /Portugal/ }));
    expect(select().value).toBe('Europe/Lisbon');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(updateTimezone).toHaveBeenCalledWith('Europe/Lisbon'));
  });

  it('não grava quando nada mudou (segue acompanhando a região)', async () => {
    state.settings = { ...baseSettings, timezone: null };
    render(<GeneralSettings />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalled());
    expect(updateTimezone).not.toHaveBeenCalled();
  });
});
