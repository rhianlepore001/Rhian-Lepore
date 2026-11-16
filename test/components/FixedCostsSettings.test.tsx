import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { FixedCostsSettings } from '../../components/settings/FixedCostsSettings';

vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: { text: '', textMuted: '', border: '', card: '' }, classes: { input: '', label: '' }, radius: { card: '', button: '' } }) }));
vi.mock('../../components/ui', () => ({ Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, Button: ({ children, loading: _loading, fullWidth: _fullWidth, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; fullWidth?: boolean }) => <button {...props}>{children}</button> }));
vi.mock('../../components/BusinessHoursEditor', () => ({ BusinessHoursEditor: ({ onChange }: { onChange: (hours: unknown) => void }) => <button onClick={() => onChange({ mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] } })}>Editar horário de segunda</button> }));

const makeApi = () => ({
  list: vi.fn().mockResolvedValue({ costs: [], services: [{ id: 's1', name: 'Corte' }], materials: [], professionals: [{ id: 'p1', name: 'Ana' }], lowMargin: 20, lowMarginSaved: false }),
  suggestions: vi.fn().mockResolvedValue([{ id: 'e1', description: 'Aluguel', amount: 100, created_at: '2026-10-01T12:00:00Z' }]),
  saveCost: vi.fn().mockResolvedValue(undefined),
  saveMaterial: vi.fn().mockResolvedValue(undefined),
  removeCost: vi.fn().mockResolvedValue(undefined),
  saveLowMargin: vi.fn().mockResolvedValue(undefined),
  saveWorkingHours: vi.fn().mockResolvedValue(undefined),
  saveMaterialLines: vi.fn().mockResolvedValue(undefined),
  updateMaterialPrice: vi.fn().mockResolvedValue(undefined),
});

const expandService = async (name: string) => {
  const toggle = screen.queryByRole('button', { name: new RegExp(`(configurar|expandir).*${name}`, 'i') })
    ?? screen.queryByRole('button', { name: new RegExp(name, 'i') });
  if (toggle) fireEvent.click(toggle);
};

const openWizardBlock = async (name: RegExp) => {
  fireEvent.click(await screen.findByRole('heading', { name }));
};

describe('custos fixos e materiais', () => {
  it.each([['PT', '€'], ['BR', 'R$']] as const)('mostra a moeda de %s nos campos editáveis de custo', async (region, currency) => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" region={region} api={api} />);
    expect(await screen.findByText(`Custo mensal (${currency})`)).toBeInTheDocument();
    expect(screen.getByLabelText('Custo mensal')).toBeEnabled();
    await openWizardBlock(/3\.\s*Materiais/i);
    expect(screen.getByRole('heading', { name: 'Corte' })).toBeInTheDocument();
    await expandService('Corte');
    expect(screen.getByLabelText(/preço da embalagem/i)).toBeInTheDocument();
    expect(screen.getAllByText(currency).length).toBeGreaterThan(0);
  });

  it('mostra progresso 0 de 4 e os quatro blocos de ajuste quando vazio', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    expect(await screen.findByText(/\d+ de 4 configurados/)).toHaveTextContent('0 de 4 configurados');
    expect(screen.getByRole('heading', { name: /Contas do mês/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Horários da equipe/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Materiais/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Quanto precisa sobrar|Margem desejada|Sobra pouco|Quando avisar/i })).toBeInTheDocument();
    expect(screen.getAllByText('Falta')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /ver resultados por hora/i })).toHaveAttribute('href', '/#/resultados-por-hora');
  });

  it('pede confirmação antes de salvar uma despesa sugerida', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: /usar despesas que já lancei/i }));
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
    expect(await screen.findByLabelText(/este custo é a minha retirada \(pró-labore\)/i)).not.toBeChecked();
    expect(screen.queryByLabelText(/incluir essa retirada no custo da hora/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar custo mensal' }));
    expect(api.saveCost).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('distingue custo de material não informado de zero informado', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    await openWizardBlock(/3\.\s*Materiais/i);
    await screen.findByRole('heading', { name: 'Corte' });
    await expandService('Corte');
    fireEvent.click(screen.getByRole('button', { name: /salvar total do serviço/i }));
    expect(api.saveMaterialLines).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/preço da embalagem/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/rendimento/i), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar total do serviço/i }));
    await waitFor(() => expect(api.saveMaterialLines).toHaveBeenCalledWith('empresa', 's1', expect.any(Array), 0));
  });

  it('preserva o histórico ao editar custo existente, permitindo apenas encerrar a vigência', async () => {
    const api = makeApi();
    api.list.mockResolvedValue({ costs: [{ id: 'c1', company_id: 'empresa', professional_id: null, category: 'Aluguel', description: 'Sala', amount: 500, start_date: '2025-01-01', end_date: null, is_owner_salary: false, active: true }], services: [], materials: [], professionals: [] } as never);
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    await openWizardBlock(/1\.\s*Contas do mês/i);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Sala' }));
    expect(screen.getByLabelText('Custo mensal')).toBeDisabled();
    expect(screen.getByLabelText('Categoria')).toBeDisabled();
    expect(screen.getByLabelText('Profissional')).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/termina em \(opcional/i), { target: { value: '2099-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar custo mensal' }));
    await waitFor(() => expect(api.saveCost).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', amount: 500, start_date: '2025-01-01', end_date: '2099-12-31' })));
  });

  it('permite configurar limite provisório de margem sem presumir decisão do Rhian', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    expect(await screen.findByText(/o valor inicial pode ser alterado/i)).toBeInTheDocument();
    await openWizardBlock(/4\.\s*Quanto precisa sobrar/i);
    fireEvent.change(screen.getByLabelText(/avisar .*sobra pouco/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar limite/i }));
    await waitFor(() => expect(api.saveLowMargin).toHaveBeenCalledWith('empresa', 15));
  });

  it('após salvar limite recarrega list() e marca bloco 4 como Feito', async () => {
    const api = makeApi();
    api.list
      .mockResolvedValueOnce({ costs: [], services: [{ id: 's1', name: 'Corte' }], materials: [], professionals: [], lowMargin: 20, lowMarginSaved: false })
      .mockResolvedValueOnce({ costs: [], services: [{ id: 's1', name: 'Corte' }], materials: [], professionals: [], lowMargin: 15, lowMarginSaved: true });
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    expect(await screen.findByText('0 de 4 configurados')).toBeInTheDocument();
    const marginHeading = screen.getByRole('heading', { name: /4\.\s*Quanto precisa sobrar/i });
    const marginBlock = marginHeading.closest('div')?.parentElement ?? marginHeading.parentElement!;
    expect(within(marginBlock).getByText('Falta')).toBeInTheDocument();
    fireEvent.click(marginHeading);
    fireEvent.change(screen.getByLabelText(/avisar .*sobra pouco/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar limite/i }));
    await waitFor(() => expect(api.saveLowMargin).toHaveBeenCalledWith('empresa', 15));
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(marginBlock).getByText('Feito')).toBeInTheDocument());
  });

  it('salva expediente específico ou retorna ao horário do negócio', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    await openWizardBlock(/2\.\s*Horários da equipe/i);
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
    fireEvent.click(await screen.findByRole('button', { name: /novo valor a partir de/i }));
    expect(screen.getByLabelText(/este custo é a minha retirada \(pró-labore\)/i)).toBeChecked();
    expect(screen.getByLabelText(/incluir essa retirada no custo da hora/i)).not.toBeChecked();
    fireEvent.click(screen.getByLabelText(/incluir essa retirada no custo da hora/i));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar custo mensal' }));
    await waitFor(() => expect(api.saveCost).toHaveBeenCalledWith(expect.objectContaining({ id: undefined, active: true, is_owner_salary: true, amount: 500 })));
  });

  it('permite encerrar o pró-labore ativo sem alterar seu valor ou período anterior', async () => {
    const api = makeApi();
    api.list.mockResolvedValue({ costs: [{ id: 'salary-active', company_id: 'empresa', professional_id: null, category: 'Gestão', description: 'Pró-labore', amount: 500, start_date: '2025-01-01', end_date: null, is_owner_salary: true, active: true }], services: [], materials: [], professionals: [] } as never);
    render(<FixedCostsSettings companyId="empresa" timezone="America/Sao_Paulo" api={api} />);
    await openWizardBlock(/1\.\s*Contas do mês/i);
    fireEvent.click(await screen.findByRole('button', { name: 'Encerrar pró-labore' }));
    expect(screen.getByText(/encerramento será aplicado ao salvar/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Custo mensal')).toBeDisabled();
    const end = (screen.getByLabelText(/termina em \(opcional/i) as HTMLInputElement).value;
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
    expect(screen.getByRole('button', { name: /novo valor a partir de/i })).toBeEnabled();
  });

  it('lista serviço sem material como não configurado e amount zero como não usa material', async () => {
    const api = makeApi();
    api.list.mockResolvedValue({ costs: [], services: [{ id: 's1', name: 'Corte' }, { id: 's2', name: 'Barba' }], materials: [{ service_id: 's2', amount: 0 }], professionals: [], lowMargin: 20, lowMarginSaved: false });
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    await openWizardBlock(/3\.\s*Materiais/i);
    await screen.findByRole('heading', { name: 'Corte' });
    expect(screen.getAllByText(/não configurado|Não informado/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/não usa material/i).length).toBeGreaterThan(0);
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

describe('FixedCostsSettings — UX 390px', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390, writable: true });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('0 de 4: formulário de contas visível e campos dos blocos 2–4 fechados', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    expect(await screen.findByText('0 de 4 configurados')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /1\.\s*Contas do mês/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2\.\s*Horários da equipe/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3\.\s*Materiais/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /4\.\s*Quanto precisa sobrar/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Custo mensal')).toBeInTheDocument();
    expect(screen.queryByLabelText('Profissional para horários')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/preço da embalagem/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/avisar .*sobra pouco/i)).not.toBeInTheDocument();
  });

  it('fórmula da hora no topo reflete contas, material e comissão (#192)', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    await screen.findByText('0 de 4 configurados');
    expect(screen.getAllByText(/contas do mês.*horas abertas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/material.*comiss/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/horas atendidas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sobra.*custo da hora|rendeu.*custo/i).length).toBeGreaterThan(0);
  });

  it('fórmula e exemplo de cada bloco visíveis sem abrir “Ver exemplo e fórmula”', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    await screen.findByText('0 de 4 configurados');
    expect(screen.queryByText('Ver exemplo e fórmula')).not.toBeInTheDocument();
    expect(screen.getAllByText(/contas do mês ÷ horas abertas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/jornada|horas abertas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/preço da embalagem|giletes|material/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sobra pouco|sobrar menos/i).length).toBeGreaterThan(0);
  });

  it('serviço Corte listado com calculadora recolhida até expandir', async () => {
    const api = makeApi();
    render(<FixedCostsSettings companyId="empresa" api={api} />);
    await openWizardBlock(/3\.\s*Materiais/i);
    await screen.findByRole('heading', { name: 'Corte' });
    expect(screen.queryByLabelText(/preço da embalagem/i)).not.toBeInTheDocument();
    await expandService('Corte');
    expect(screen.getByLabelText(/preço da embalagem/i)).toBeInTheDocument();
  });
});

describe('FixedCostsSettings — deep link e acordeão (UX rodada 3)', () => {
  const originalHash = window.location.hash;

  afterEach(() => {
    window.location.hash = originalHash;
  });

  const renderWithHash = (hash: string, api = makeApi()) => {
    window.location.hash = hash;
    return render(
      <HashRouter>
        <FixedCostsSettings companyId="empresa" api={api} />
      </HashRouter>,
    );
  };

  it.each([
    '#/configuracoes/financeiro?bloco=materiais',
    '#/configuracoes/financeiro#materiais',
  ])('monta com %s e abre bloco Materiais', async (hash) => {
    renderWithHash(hash);
    await screen.findByRole('heading', { name: 'Corte' });
    const materialsToggle = screen.getByRole('button', { name: /3\.\s*Materiais/i });
    expect(materialsToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByLabelText('Profissional para horários')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Custo mensal')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Corte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /configurar corte/i })).toBeInTheDocument();
  });

  it('acordeão honesto: lista da conta “Sala” só aparece ao abrir bloco 1', async () => {
    const api = makeApi();
    api.list.mockResolvedValue({
      costs: [{
        id: 'c1',
        company_id: 'empresa',
        professional_id: null,
        category: 'Aluguel',
        description: 'Sala',
        amount: 500,
        start_date: '2026-01-01',
        end_date: null,
        is_owner_salary: false,
        active: true,
      }],
      services: [{ id: 's1', name: 'Corte' }],
      materials: [],
      professionals: [{ id: 'p1', name: 'Ana' }],
      lowMargin: 20,
      lowMarginSaved: false,
    } as never);
    renderWithHash('#/configuracoes/financeiro', api);
    await screen.findByRole('heading', { name: /1\.\s*Contas do mês/i });
    expect(screen.getByRole('heading', { name: /1\.\s*Contas do mês/i }).closest('button')?.parentElement).toBeTruthy();
    expect(screen.queryByText('Sala')).not.toBeInTheDocument();
    const resumo = screen.queryByText(/1 conta/i);
    if (resumo) expect(resumo).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /1\.\s*Contas do mês/i }));
    expect((await screen.findAllByText('Sala')).length).toBeGreaterThan(0);
  });

  it('após salvar limite o campo do bloco 4 permanece visível', async () => {
    const api = makeApi();
    api.list
      .mockResolvedValueOnce({ costs: [], services: [{ id: 's1', name: 'Corte' }], materials: [], professionals: [], lowMargin: 20, lowMarginSaved: false })
      .mockResolvedValueOnce({ costs: [], services: [{ id: 's1', name: 'Corte' }], materials: [], professionals: [], lowMargin: 15, lowMarginSaved: true });
    renderWithHash('#/configuracoes/financeiro?bloco=margem', api);
    fireEvent.change(await screen.findByLabelText(/avisar .*sobra pouco/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar limite/i }));
    await waitFor(() => expect(api.saveLowMargin).toHaveBeenCalledWith('empresa', 15));
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText(/avisar .*sobra pouco/i)).toBeInTheDocument();
  });
});
