import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendeePicker } from '@/components/appointment/AttendeePicker';
import { createDependent } from '@/services/clientDependents';

vi.mock('@/hooks/useClientDependents', () => ({ useClientDependents: () => ({ dependents: [
  { id: 'dependent-a', name: 'Dependente Fictício A', nickname: null },
], loading: false, error: '', reload: vi.fn() }) }));
vi.mock('@/services/clientDependents', () => ({ createDependent: vi.fn() }));
vi.mock('@/components/ui/Button', () => ({ Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => <button onClick={onClick} disabled={disabled}>{children}</button> }));

function Picker() {
  const [id, setId] = useState('');
  return <AttendeePicker companyId="tenant-a" clientId="holder-a" clientName="Titular Fictício" value={id} onChange={setId} />;
}

describe('Para quem?', () => {
  beforeEach(() => vi.clearAllMocks());
  it('selects a dependent without replacing the holder contact', async () => {
    render(<Picker />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Para quem?' }), 'dependent-a');
    expect(screen.getByRole('combobox')).toHaveValue('dependent-a');
    expect(screen.getByRole('option', { name: 'Titular Fictício (titular)' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/telefone/i)).not.toBeInTheDocument();
  });
  it('adds a dependent under the holder and selects the new person', async () => {
    vi.mocked(createDependent).mockResolvedValue({ id: 'new-dependent', name: 'Nova Pessoa Fictícia' } as never);
    render(<Picker />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'new');
    await userEvent.type(screen.getByLabelText('Nome do dependente'), 'Nova Pessoa Fictícia');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar dependente' }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('new-dependent'));
    expect(createDependent).toHaveBeenCalledWith('tenant-a', 'holder-a', { name: 'Nova Pessoa Fictícia' });
  });
  it('permite voltar explicitamente ao titular após exclusão física do dependente', async () => {
    const change = vi.fn();
    render(<AttendeePicker companyId="tenant-a" clientId="holder-a" clientName="Titular Fictício" value="" snapshot="Pessoa Removida Fictícia" onChange={change} />);
    expect(screen.getByRole('combobox')).toHaveValue('historical');
    await userEvent.selectOptions(screen.getByRole('combobox'), '');
    expect(change).toHaveBeenCalledWith('', 'Titular Fictício');
  });
  it('preserves a historical dependent absent from the active list', () => {
    render(<AttendeePicker companyId="tenant-a" clientId="holder-a" clientName="Titular Fictício" value="archived" snapshot="Pessoa Antiga" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('archived');
    expect(screen.getByRole('option', { name: 'Pessoa Antiga (histórico)' })).toBeInTheDocument();
  });
});
