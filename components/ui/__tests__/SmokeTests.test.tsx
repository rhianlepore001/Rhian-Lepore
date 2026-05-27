import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from 'lucide-react';
import { Badge } from '../Badge';
import { EmptyState } from '../EmptyState';
import { Skeleton, SkeletonCard } from '../Skeleton';
import { ErrorState } from '../ErrorState';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

describe('Smoke e Acessibilidade dos Componentes de UI Coadjuvantes', () => {
  
  describe('Badge Component', () => {
    it('renderiza o conteúdo textual corretamente', () => {
      render(<Badge>Premium</Badge>);
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('aplica classes base do span', () => {
      const { container } = render(<Badge variant="accent">Novo</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge.tagName).toBe('SPAN');
      expect(badge.className).toContain('inline-flex');
    });
  });

  describe('EmptyState Component', () => {
    it('renderiza com título, descrição e botão de ação', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          icon={Search}
          title="Sem registros"
          description="Nenhum cliente cadastrado no sistema"
          action={<button onClick={onAction}>Cadastrar</button>}
        />
      );

      expect(screen.getByText('Sem registros')).toBeInTheDocument();
      expect(screen.getByText('Nenhum cliente cadastrado no sistema')).toBeInTheDocument();
      
      const btn = screen.getByRole('button', { name: 'Cadastrar' });
      expect(btn).toBeInTheDocument();
      btn.click();
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Skeleton Component', () => {
    it('possui role="status" e texto de leitor de tela para acessibilidade', () => {
      render(<Skeleton />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('SkeletonCard possui tags estruturais e role="status" corretos', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('role', 'status');
      
      const statuses = screen.getAllByRole('status');
      expect(statuses.length).toBeGreaterThan(1);
    });
  });

  describe('ErrorState Component', () => {
    it('possui role="alert" para leitores de tela e renderiza título e mensagem', () => {
      render(
        <ErrorState
          title="Falha crítica"
          message="Erro interno do sistema"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Falha crítica')).toBeInTheDocument();
      expect(screen.getByText('Erro interno do sistema')).toBeInTheDocument();
    });

    it('chama onRetry quando fornecido e clicado', async () => {
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="Erro"
          message="Falha"
          onRetry={onRetry}
          retryLabel="Recarregar"
        />
      );

      const btn = screen.getByRole('button', { name: 'Recarregar' });
      expect(btn).toBeInTheDocument();
      
      await userEvent.click(btn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

});
