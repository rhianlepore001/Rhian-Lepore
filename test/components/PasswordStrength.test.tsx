import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrength } from '@/components/auth/PasswordStrength';

const level = () => screen.getByTestId('password-strength').getAttribute('data-level');

describe('PasswordStrength', () => {
  it('vazio: mostra o que a senha precisa', () => {
    render(<PasswordStrength password="" />);
    expect(level()).toBe('empty');
    expect(screen.getByTestId('password-strength')).toHaveTextContent('Precisa de:8 caracteresuma letra maiúscula');
  });

  it('faltando: marca o que já foi cumprido e anuncia o que falta', () => {
    render(<PasswordStrength password="abcdefgh" />);
    expect(level()).toBe('missing');
    expect(document.querySelector('[data-req="length"]')).toHaveAttribute('data-ok', 'true');
    expect(document.querySelector('[data-req="uppercase"]')).toHaveAttribute('data-ok', 'false');
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent('Falta uma letra maiúscula.');
  });

  it.each([
    ['Abcdefgh', 'weak', 'Senha fraca'],
    ['Abcdefg1', 'strong', 'Senha forte'],
    ['Abcdefgh12!x', 'very_strong', 'Muito forte'],
  ])('%s → %s', (pwd, lvl, label) => {
    render(<PasswordStrength password={pwd} />);
    expect(level()).toBe(lvl);
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent(label);
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(label);
  });
});
