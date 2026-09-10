import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui';
import { QueuePayStep } from '@/components/queue/QueuePayStep';
import type { PublicClubPaymentConfig } from '@/services/memberships';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', region: 'PT' }),
}));

const mbwayConfig: PublicClubPaymentConfig = {
  pix_key_value: null,
  pix_key_type: null,
  pix_holder_name: null,
  pix_merchant_city: null,
  mbway_phone: '912345678',
  mbway_holder_name: 'Barbearia Silva',
};

const baseProps = {
  region: 'PT' as const,
  themeOverride: 'barber' as const,
  onConfirm: vi.fn(),
  amountCents: 2000,
  serviceName: 'Sobrancelha',
  pixConfig: null as PublicClubPaymentConfig | null,
};

function renderPay(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('QueuePayStep', () => {
  it('pré-seleciona o balcão quando nada foi escolhido', () => {
    const onSelect = vi.fn();
    renderPay(<QueuePayStep {...baseProps} canUseMembership={false} selected="" onSelect={onSelect} />);
    expect(onSelect).toHaveBeenCalledWith('cash');
  });

  it('pré-seleciona a assinatura quando o cliente pode usá-la', () => {
    const onSelect = vi.fn();
    renderPay(<QueuePayStep {...baseProps} canUseMembership selected="" onSelect={onSelect} />);
    expect(onSelect).toHaveBeenCalledWith('membership');
  });

  it('volta para o balcão se a opção digital escolhida não está configurada', () => {
    const onSelect = vi.fn();
    renderPay(<QueuePayStep {...baseProps} canUseMembership={false} selected="mbway" onSelect={onSelect} />);
    expect(onSelect).toHaveBeenCalledWith('cash');
    expect(screen.queryByText('MB WAY — ver número para pagar')).not.toBeInTheDocument();
  });

  it('habilita o CTA com uma opção válida selecionada', () => {
    renderPay(<QueuePayStep {...baseProps} canUseMembership={false} selected="cash" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirmar e entrar na fila' })).toBeEnabled();
    expect(screen.getByText('Pagar no balcão')).toBeInTheDocument();
  });

  it('mostra o MB WAY do estabelecimento e só libera Já paguei depois da confirmação', async () => {
    const onConfirm = vi.fn();
    renderPay(
      <QueuePayStep
        {...baseProps}
        onConfirm={onConfirm}
        canUseMembership={false}
        selected="mbway"
        onSelect={vi.fn()}
        pixConfig={mbwayConfig}
      />,
    );
    expect(screen.getByTestId('queue-mbway-pay')).toBeInTheDocument();
    expect(screen.getByText('Pagar com MB WAY')).toBeInTheDocument();
    expect(screen.getByText('Barbearia Silva')).toBeInTheDocument();
    expect(screen.getByText('+351 912 345 678')).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: 'Já paguei — entrar na fila' });
    expect(cta).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Confirmar e entrar na fila' })).not.toBeInTheDocument();
    await waitFor(() => expect(cta).toBeEnabled(), { timeout: 1500 });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('escolher MB WAY não entra na fila no mesmo toque', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onSelect = vi.fn();
    renderPay(
      <QueuePayStep
        {...baseProps}
        onConfirm={onConfirm}
        canUseMembership={false}
        selected="cash"
        onSelect={onSelect}
        pixConfig={mbwayConfig}
      />,
    );
    await user.click(screen.getByRole('button', { name: /MB WAY — ver número/ }));
    expect(onSelect).toHaveBeenCalledWith('mbway');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
