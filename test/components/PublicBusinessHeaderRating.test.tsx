import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PublicBusinessHeader } from '../../components/PublicBusinessHeader';

vi.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ mode: 'dark', toggleMode: vi.fn() }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

describe('PublicBusinessHeader — nota pública', () => {
  it('sem avaliações oferece o acesso sem exibir uma nota', () => {
    render(<PublicBusinessHeader businessName="Barbearia Fictícia" reviewSummary={{ average: null, total: 0 }} onOpenReviews={() => {}} />);
    expect(screen.queryByText('4,9')).not.toBeInTheDocument();
    expect(screen.queryByText('0 avaliações')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avaliações de clientes' })).toBeVisible();
  });
  it('com avaliações reais mostra nota e contagem', () => {
    const openReviews = vi.fn();
    render(<PublicBusinessHeader businessName="Barbearia Fictícia" reviewSummary={{ average: 4.8, total: 23 }} onOpenReviews={openReviews} />);
    const trigger = screen.getByRole('button', { name: /4,8 de 5.*23 avaliações/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    trigger.click();
    expect(openReviews).toHaveBeenCalledOnce();
    expect(screen.getByText('23 avaliações')).toBeInTheDocument();
  });
  it('mostra as fotos do espaço no carregamento', () => {
    render(<PublicBusinessHeader businessName="Barbearia Fictícia" gallery={[{ id: '1', image_url: '/fotos/1.webp' }]} />);
    const photo = screen.getByRole('img', { name: 'Foto 1 do espaço de Barbearia Fictícia' });
    expect(photo.closest('details')).toHaveAttribute('open');
  });
  it('mantém a troca de tema por padrão e permite ocultá-la na simulação', () => {
    const { rerender } = render(<PublicBusinessHeader businessName="Barbearia Fictícia" />);
    expect(screen.getByRole('button', { name: 'Ativar modo claro' })).toBeVisible();
    rerender(<PublicBusinessHeader businessName="Barbearia Fictícia" showThemeToggle={false} />);
    expect(screen.queryByRole('button', { name: 'Ativar modo claro' })).not.toBeInTheDocument();
  });
});
