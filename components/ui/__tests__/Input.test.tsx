import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../Input';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

describe('Input Component', () => {
  it('associa a label corretamente com o input através de id/htmlFor', () => {
    render(<Input label="Nome de Usuário" placeholder="Nome" />);
    
    // getByLabelText lança erro se não houver associação correta
    const input = screen.getByLabelText('Nome de Usuário');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Nome');
  });

  it('renderiza o erro com role="alert" e atualiza o estado de acessibilidade do input', () => {
    render(
      <Input
        label="E-mail"
        placeholder="E-mail"
        error="E-mail inválido"
        hint="Insira um e-mail válido"
      />
    );

    const input = screen.getByLabelText('E-mail');
    
    // Verifica se aria-invalid está como true
    expect(input).toHaveAttribute('aria-invalid', 'true');
    
    // O erro deve possuir role="alert"
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent('E-mail inválido');
    
    // O ID do erro deve estar no aria-describedby do input
    const errorId = errorEl.getAttribute('id');
    expect(errorId).toBeDefined();
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(errorId!));
  });

  it('renderiza a dica (hint) e associa ao input quando não há erros', () => {
    render(
      <Input
        label="Telefone"
        placeholder="Apenas números"
        hint="DDD + Número"
      />
    );

    const input = screen.getByLabelText('Telefone');
    
    // Verifica se aria-invalid está como false (ou undefined)
    expect(input).toHaveAttribute('aria-invalid', 'false');
    
    // A dica deve estar na tela
    const hintEl = screen.getByText('DDD + Número');
    expect(hintEl).toBeInTheDocument();
    
    // A dica deve estar no aria-describedby
    const hintId = hintEl.getAttribute('id');
    expect(hintId).toBeDefined();
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(hintId!));
  });
});
