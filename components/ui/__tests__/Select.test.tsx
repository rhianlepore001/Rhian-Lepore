import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, type SelectOption } from '../Select';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const OPTIONS: SelectOption[] = [
  { value: 'opcao-a', label: 'Opção A' },
  { value: 'opcao-b', label: 'Opção B' },
  { value: 'opcao-c', label: 'Opção C', disabled: true },
];

describe('Select Component', () => {
  it('renderiza o select com a label e as opções fornecidas', () => {
    render(
      <Select
        label="Escolha uma opção"
        options={OPTIONS}
        placeholder="Selecione um item..."
      />
    );

    const select = screen.getByLabelText('Escolha uma opção');
    expect(select).toBeInTheDocument();

    // Placeholder
    const placeholderOpt = screen.getByText('Selecione um item...');
    expect(placeholderOpt).toBeInTheDocument();
    expect(placeholderOpt).toBeDisabled();

    // Opções
    expect(screen.getByText('Opção A')).toBeInTheDocument();
    expect(screen.getByText('Opção B')).toBeInTheDocument();
    
    const disabledOpt = screen.getByText('Opção C');
    expect(disabledOpt).toBeInTheDocument();
    expect(disabledOpt).toBeDisabled();
  });

  it('renderiza o erro com role="alert" e atualiza o estado do select', () => {
    render(
      <Select
        label="Item"
        options={OPTIONS}
        error="Campo obrigatório"
      />
    );

    const select = screen.getByLabelText('Item');
    expect(select).toHaveAttribute('aria-invalid', 'true');

    const errorEl = screen.getByRole('alert');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent('Campo obrigatório');

    const errorId = errorEl.getAttribute('id');
    expect(errorId).toBeDefined();
    expect(select).toHaveAttribute('aria-describedby', expect.stringContaining(errorId!));
  });
});
