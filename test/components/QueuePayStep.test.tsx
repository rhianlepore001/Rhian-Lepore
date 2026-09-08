import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueuePayStep } from '@/components/queue/QueuePayStep';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', region: 'PT' }),
}));

const baseProps = {
  region: 'PT' as const,
  themeOverride: 'barber' as const,
  onConfirm: vi.fn(),
  amountCents: 2000,
  serviceName: 'Sobrancelha',
  pixConfig: null,
};

describe('QueuePayStep', () => {
  it('pré-seleciona o balcão quando nada foi escolhido', () => {
    const onSelect = vi.fn();
    render(<QueuePayStep {...baseProps} canUseMembership={false} selected="" onSelect={onSelect} />);
    expect(onSelect).toHaveBeenCalledWith('cash');
  });

  it('pré-seleciona a assinatura quando o cliente pode usá-la', () => {
    const onSelect = vi.fn();
    render(<QueuePayStep {...baseProps} canUseMembership selected="" onSelect={onSelect} />);
    expect(onSelect).toHaveBeenCalledWith('membership');
  });

  it('volta para o balcão se a opção digital escolhida não está configurada', () => {
    const onSelect = vi.fn();
    render(<QueuePayStep {...baseProps} canUseMembership={false} selected="mbway" onSelect={onSelect} />);
    expect(onSelect).toHaveBeenCalledWith('cash');
    expect(screen.queryByText('Pagar agora com MB WAY')).not.toBeInTheDocument();
  });

  it('habilita o CTA com uma opção válida selecionada', () => {
    render(<QueuePayStep {...baseProps} canUseMembership={false} selected="cash" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirmar e entrar na fila' })).toBeEnabled();
    expect(screen.getByText('Pagar no balcão')).toBeInTheDocument();
  });
});
