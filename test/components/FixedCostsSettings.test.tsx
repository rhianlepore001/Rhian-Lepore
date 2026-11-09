import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FixedCostsSettings } from '../../components/settings/FixedCostsSettings';

vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: { text: '', textMuted: '', border: '', card: '' }, classes: { input: '', label: '' }, radius: { card: '', button: '' } }) }));
vi.mock('../../components/ui', () => ({ Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, Button: ({ children, loading: _loading, fullWidth: _fullWidth, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; fullWidth?: boolean }) => <button {...props}>{children}</button> }));
vi.mock('../../components/BusinessHoursEditor', () => ({ BusinessHoursEditor: ({ onChange }: { onChange: (hours: unknown) => void }) => <button onClick={() => onChange({ mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] } })}>Editar horário de segunda</button> }));

const makeApi = () => ({
  list: vi.fn().mockResolvedValue({ costs: [], services: [{ id: 's1', name: 'Corte' }], materials: [], professionals: [{ id: 'p1', name: 'Ana' }] }),
  suggestions: vi.fn().mockResolvedValue([{ id: 'e1', description: 'Aluguel', amount: 100, created_at: '2026-10-01T12:00:00Z' }]),
  saveCost: vi.fn().mockResolvedValue(undefined),
  saveMaterial: vi.fn().mockResolvedValue(undefined),
  removeCost: vi.fn().mockResolvedValue(undefined),
  saveLowMargin: vi.fn().mockResolvedValue(undefined),
  saveWorkingHours: vi.fn().mockResolvedValue(undefined),
});

describe('custos fixos e materiais', () => {
  it.each([['PT', '€'], ['BR', 'R$']] as const)('mostra a moeda de %s nos campos editáveis de custo', async (region, currency) => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" region={region} api={api} />);
    expect(await screen.findByText(`Custo mensal (${currency})`)).toBeInTheDocument();
    expect(screen.getByLabelText('Custo de material por atendimento: Corte')).toBeInTheDocument();
    expect(screen.getAllByText(currency).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Custo mensal')).toBeEnabled();
  });

  it('pede confirmação antes de salvar uma despesa sugerida', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Puxar despesas já lançadas' }));
    fireEvent.click(await screen.findByRole('button', { name: /usar aluguel/i }));
    expect(api.saveCost).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Descrição')).toHaveValue('Aluguel');
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Aluguel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar custo mensal' }));
    await waitFor(() => expect(api.saveCost).toHaveBeenCalledTimes(1));
  });

  it('pró-labore começa desligado e exige valor e categoria válidos', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    expect(await screen.findByLabelText('Incluir pró-labore do dono')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar custo mensal' }));
    expect(api.saveCost).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('distingue custo de material não informado de zero informado', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    const input = await screen.findByLabelText('Custo de material por atendimento: Corte');
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar material de Corte' }));
    await waitFor(() => expect(api.saveMaterial).toHaveBeenCalledWith('empresa', 's1', 0));
  });

  it('preserva o histórico ao editar custo existente, permitindo apenas encerrar a vigência', async () => {
    const api = makeApi();
    api.list.mockResolvedValue({ costs: [{ id: 'c1', company_id: 'empresa', professional_id: null, category: 'Aluguel', description: 'Sala', amount: 500, start_date: '2025-01-01', end_date: null, is_owner_salary: false, active: true }], services: [], materials: [], professionals: [] } as never);
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Sala' }));
    expect(screen.getByLabelText('Custo mensal')).toBeDisabled();
    expect(screen.getByLabelText('Categoria')).toBeDisabled();
    expect(screen.getByLabelText('Profissional')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Termina em (opcional)'), { target: { value: '2099-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar custo mensal' }));
    await waitFor(() => expect(api.saveCost).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', amount: 500, start_date: '2025-01-01', end_date: '2099-12-31' })));
  });

  it('permite configurar limite provisório de margem sem presumir decisão do Rhian', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    expect(await screen.findByText(/o valor inicial pode ser alterado/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/avisar .*sobra pouco/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar limite/i }));
    await waitFor(() => expect(api.saveLowMargin).toHaveBeenCalledWith('empresa', 15));
  });

  it('salva expediente específico ou retorna ao horário do negócio', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    fireEvent.change(await screen.findByLabelText('Profissional para horários'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Editar horário de segunda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar horários' }));
    await waitFor(() => expect(api.saveWorkingHours).toHaveBeenCalledWith('empresa', 'p1', { mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] } }));
    fireEvent.click(screen.getByRole('button', { name: 'Usar horário do negócio' }));
    await waitFor(() => expect(api.saveWorkingHours).toHaveBeenCalledWith('empresa', 'p1', null));
  });

  it('permite iniciar nova vigência para pró-labore desligado sem mudar o registro anterior', async () => {
    const api = makeApi();
    api.list.mockResolvedValue({ costs: [{ id: 'salary-old', company_id: 'empresa', professional_id: null, category: 'Gestão', description: 'Pró-labore', amount: 500, start_date: '2025-01-01', end_date: null, is_owner_salary: true, active: false }], services: [], materials: [], professionals: [] } as never);
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mudar valor de Pró-labore' }));
    expect(screen.getByLabelText('Incluir pró-labore do dono')).not.toBeChecked();
    fireEvent.click(screen.getByLabelText('Incluir pró-labore do dono'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar custo mensal' }));
    await waitFor(() => expect(api.saveCost).toHaveBeenCalledWith(expect.objectContaining({ id: undefined, active: true, is_owner_salary: true, amount: 500 })));
  });

  it('permite encerrar o pró-labore ativo sem alterar seu valor ou período anterior', async () => {
    const api = makeApi();
    api.list.mockResolvedValue({ costs: [{ id: 'salary-active', company_id: 'empresa', professional_id: null, category: 'Gestão', description: 'Pró-labore', amount: 500, start_date: '2025-01-01', end_date: null, is_owner_salary: true, active: true }], services: [], materials: [], professionals: [] } as never);
    render(<FixedCostsSettings companyId="empresa" timezone="America/Sao_Paulo" api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Encerrar pró-labore' }));
    expect(screen.getByText(/encerramento será aplicado ao salvar/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Custo mensal')).toBeDisabled();
    const end = (screen.getByLabelText('Termina em (opcional)') as HTMLInputElement).value;
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(api.saveCost).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar custo mensal' }));
    await waitFor(() => expect(api.saveCost).toHaveBeenCalledWith(expect.objectContaining({ id: 'salary-active', start_date: '2025-01-01', amount: 500, end_date: end, active: true })));
  });

  it('informa quando uma vigência já foi encerrada', async () => {
    const api = makeApi();
    api.list.mockResolvedValue({ costs: [{ id: 'c1', company_id: 'empresa', professional_id: null, category: 'Gestão', description: 'Pró-labore', amount: 500, start_date: '2020-01-01', end_date: '2020-12-31', is_owner_salary: true, active: true }], services: [], materials: [], professionals: [] } as never);
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    expect(await screen.findByText(/encerrado em 31\/12\/2020/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar pró-labore' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Pró-labore' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mudar valor de Pró-labore' })).toBeEnabled();
  });

  it('não permite alterar custos quando os dados não puderem ser carregados', async () => {
    const api = makeApi();
    api.list.mockRejectedValue(new Error('Falha'));
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os custos');
    expect(screen.queryByRole('button', { name: 'Salvar custo mensal' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
