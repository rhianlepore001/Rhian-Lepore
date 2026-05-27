import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

describe('Button Component', () => {
  it('renderiza os filhos (children) corretamente', () => {
    render(<Button>Enviar Cadastro</Button>);
    expect(screen.getByRole('button', { name: 'Enviar Cadastro' })).toBeInTheDocument();
  });

  it('respeita a propriedade disabled impedindo cliques', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Clique aqui</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('respeita a propriedade loading exibindo o spinner e impedindo cliques', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Enviar</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    
    // Verifica se renderiza o ícone de loader (Loader2 possui tag SVG)
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
    
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('possui o atributo HTML type padrão como "button"', () => {
    render(<Button>Confirmar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('permite sobrescrever o atributo HTML type', () => {
    render(<Button type="submit">Enviar Form</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
