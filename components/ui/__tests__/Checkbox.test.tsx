import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../Checkbox';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

describe('Checkbox', () => {
  it('renderiza label e alterna checked', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Aceito os termos" />);

    const input = screen.getByRole('checkbox', { name: 'Aceito os termos' });
    expect(input).not.toBeChecked();

    await user.click(input);
    expect(input).toBeChecked();
  });

  it('exibe mensagem de erro', () => {
    render(<Checkbox label="Campo" error="Obrigatório" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório');
  });
});
