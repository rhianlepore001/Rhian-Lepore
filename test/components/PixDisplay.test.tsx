import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PixDisplay } from '../../components/membership/PixDisplay';
import { copyTextToClipboard } from '../../utils/clipboard';

vi.mock('../../utils/clipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', region: 'BR' }),
}));

const copyMock = copyTextToClipboard as unknown as ReturnType<typeof vi.fn>;

describe('PixDisplay', () => {
  beforeEach(() => {
    copyMock.mockResolvedValue(true);
  });

  it('mostra o copia e cola na frente, não só o QR', async () => {
    render(
      <PixDisplay
        pixKey="52998224725"
        pixKeyType="cpf"
        merchantName="Barbearia Silva"
        merchantCity="SAO PAULO"
        amountCents={9000}
      />,
    );

    expect(screen.getByText(/No celular, copie o código/i)).toBeInTheDocument();
    const copyBtn = await screen.findByTestId('pix-copy-button');
    await waitFor(() => {
      expect(copyBtn).toHaveTextContent(/Copiar código Pix/i);
      expect((screen.getByTestId('pix-copia-cola') as HTMLTextAreaElement).value.length).toBeGreaterThan(20);
    });

    expect(screen.getByText('Mostrar QR Code')).toBeInTheDocument();
  });

  it('copia o código Pix ao tocar no botão', async () => {
    const user = userEvent.setup();
    render(
      <PixDisplay
        pixKey="52998224725"
        pixKeyType="cpf"
        merchantName="Barbearia Silva"
        merchantCity="SAO PAULO"
        amountCents={9000}
      />,
    );

    const copyBtn = await screen.findByTestId('pix-copy-button');
    await waitFor(() => expect(copyBtn).not.toBeDisabled());
    await user.click(copyBtn);
    expect(copyMock).toHaveBeenCalled();
    expect(copyMock.mock.calls[0][0]).toMatch(/^000201/);
  });
});
