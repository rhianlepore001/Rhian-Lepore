import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ServiceCostCalculator } from '@/components/settings/ServiceCostCalculator';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ colors: { text: '', textMuted: '', border: '', card: '' }, classes: { input: '', label: '' }, radius: { card: '', button: '' } }),
}));
vi.mock('@/hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ colors: { text: '', textMuted: '', border: '', card: '' }, classes: { input: '', label: '' }, radius: { card: '', button: '' } }),
}));

describe('ServiceCostCalculator', () => {
  it('modo rendimento: giletes 20 rende 40 → preview 0,50 e salva total', () => {
    const onSave = vi.fn();
    render(<ServiceCostCalculator serviceId="s1" serviceName="Corte" currency="R$" onSave={onSave} />);
    expect(screen.getByRole('heading', { name: 'Corte' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Giletes' } });
    fireEvent.change(screen.getByLabelText(/modo/i), { target: { value: 'count' } });
    fireEvent.change(screen.getByLabelText(/preço da embalagem/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/rendimento/i), { target: { value: '40' } });
    expect(screen.getByText(/0[,.]50.*por atendimento/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /salvar total do serviço/i }));
    expect(onSave).toHaveBeenCalledWith('s1', 0.5, expect.arrayContaining([expect.objectContaining({ name: 'Giletes', mode: 'count' })]));
  });

  it('não chama onSave se nada válido foi preenchido e o botão salvar fica desabilitado', () => {
    const onSave = vi.fn();
    render(<ServiceCostCalculator serviceId="s1" serviceName="Barba" currency="R$" onSave={onSave} />);
    const saveBtn = screen.getByRole('button', { name: /salvar total do serviço/i });
    expect(saveBtn).toBeDisabled();
    fireEvent.click(saveBtn);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('com savedAmount mostra total salvo e aviso de substituição', () => {
    render(
      <ServiceCostCalculator serviceId="s1" serviceName="Corte" currency="R$" savedAmount={4.5} onSave={vi.fn()} />,
    );
    expect(screen.getByText(/Total salvo/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*4[,.]50/)).toBeInTheDocument();
    expect(screen.getByText(/Salvar de novo substitui o total atual/i)).toBeInTheDocument();
  });

  it('"Este serviço não usa material" chama onSave com zero', () => {
    const onSave = vi.fn();
    render(<ServiceCostCalculator serviceId="s1" serviceName="Corte" currency="R$" onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /este serviço não usa material/i }));
    expect(onSave).toHaveBeenCalledWith('s1', 0, []);
  });

  it('mostra fórmula no modo rendimento e no modo quantidade', () => {
    render(<ServiceCostCalculator serviceId="s1" serviceName="Corte" currency="R$" onSave={vi.fn()} />);
    expect(screen.getByText(/preço da embalagem ÷ quantos atendimentos rende/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/modo/i), { target: { value: 'quantity' } });
    expect(screen.getByText(/preço × \(quantidade usada ÷ quantidade da embalagem\)/i)).toBeInTheDocument();
  });

  it('explica que só o total é guardado quando linhas não são persistidas', () => {
    render(<ServiceCostCalculator serviceId="s1" serviceName="Corte" currency="R$" onSave={vi.fn()} />);
    expect(screen.getByText(/guarda o total|só o total/i)).toBeInTheDocument();
    expect(screen.getByText(/não ficam guardados/i)).toBeInTheDocument();
  });

  it('com persistLines não avisa que os itens não ficam guardados', () => {
    render(
      <ServiceCostCalculator
        serviceId="s1"
        serviceName="Corte"
        currency="R$"
        persistLines
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByText(/não ficam guardados/i)).not.toBeInTheDocument();
  });

  it('com initialLines preenche nome, preço e rendimento do catálogo', () => {
    render(
      <ServiceCostCalculator
        serviceId="s1"
        serviceName="Corte"
        currency="R$"
        persistLines
        initialLines={[{ name: 'Giletes', mode: 'count', packagePrice: 20, yieldCount: 40 }]}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/^nome$/i)).toHaveValue('Giletes');
    expect(screen.getByLabelText(/preço da embalagem/i)).toHaveValue(20);
    expect(screen.getByLabelText(/rendimento/i)).toHaveValue(40);
  });

  it('não usa R$ 0,00 como herói vazio', () => {
    const { container } = render(<ServiceCostCalculator serviceId="s1" serviceName="Corte" currency="R$" onSave={vi.fn()} />);
    expect(container.textContent).not.toMatch(/R\$\s*0[,.]00/);
  });

  it('placeholder neutro no preço da embalagem', () => {
    render(<ServiceCostCalculator serviceId="s1" serviceName="Corte" currency="R$" onSave={vi.fn()} />);
    expect(screen.getByLabelText(/preço da embalagem/i)).toHaveAttribute('placeholder', 'ex.: 20,00');
    expect(screen.getByLabelText(/preço da embalagem/i).getAttribute('placeholder')).not.toMatch(/^0[,.]00$/);
  });

  it('modo quantidade: embalagem 1000 ml, 60 ml por atendimento', () => {
    const onSave = vi.fn();
    render(<ServiceCostCalculator serviceId="s2" serviceName="Coloração" currency="€" onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Tintura' } });
    fireEvent.change(screen.getByLabelText(/modo/i), { target: { value: 'quantity' } });
    fireEvent.change(screen.getByLabelText(/preço da embalagem/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/qtd.*embalagem/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/qtd.*atendimento/i), { target: { value: '60' } });
    expect(screen.getByText(/6[,.]00?.*por atendimento/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /salvar total do serviço/i }));
    expect(onSave).toHaveBeenCalledWith('s2', 6, expect.arrayContaining([expect.objectContaining({ name: 'Tintura', mode: 'quantity' })]));
  });
});