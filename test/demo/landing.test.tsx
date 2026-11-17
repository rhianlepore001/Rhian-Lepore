import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Landing } from '../../pages/Landing';

describe('site oficial', () => {
  it('aponta para os fluxos reais de entrada e cadastro', () => {
    render(<Landing />);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/#/login');
    expect(screen.getAllByRole('link', { name: /Crie sua conta grátis/ })[0]).toHaveAttribute('href', '/#/register');
    expect(screen.getByRole('link', { name: 'Criar conta para salão' })).toHaveAttribute('href', '/#/register?type=beauty');
    expect(screen.getByRole('link', { name: /suporte no WhatsApp/i })).toHaveAttribute('href', expect.stringContaining('wa.me/351927688674'));
  });
  it('preserva Login e Register byte a byte', () => {
    const expected: Record<string, string> = {"pages/Login.tsx": "99da5310c7153d3c36302b4370e3c639ffa75f3b8c38e0bb27bfd490a5e6f52c", "pages/Register.tsx": "542710fca33607ea8081f6a44d02de94507add57db9acc5b624cce18e7ae40a3"};
    for (const [path, sha] of Object.entries(expected)) {
      expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(sha);
    }
  });
});
