import { describe, it, expect } from 'vitest';
import { assessPassword, describeServerWeakPassword, passwordPolicyError } from '@/utils/passwordPolicy';

describe('política de senha: exigência mínima', () => {
  it.each([
    ['', false],
    ['abcdefgh', false], // sem maiúscula
    ['Abcdefg', false], // 7 caracteres
    ['Abcdefgh', true], // mínimo exato
    ['ÁRVORE-bonita', true], // maiúscula acentuada conta
    ['abcdefgH', true],
  ])('%j → válida=%s', (pwd, valid) => {
    expect(assessPassword(pwd).valid).toBe(valid);
    expect(passwordPolicyError(pwd) === null).toBe(valid);
  });

  it('número e símbolo NÃO são obrigatórios', () => {
    expect(passwordPolicyError('Barbearia')).toBeNull();
  });

  it('diz exatamente o que falta', () => {
    expect(assessPassword('abc').missing).toEqual(['8 caracteres', 'uma letra maiúscula']);
    expect(assessPassword('abcdefgh').missing).toEqual(['uma letra maiúscula']);
    expect(assessPassword('Abc').missing).toEqual(['8 caracteres']);
    expect(passwordPolicyError('abc')).toBe('A senha precisa de 8 caracteres e uma letra maiúscula.');
    expect(passwordPolicyError('')).toBe('A senha precisa de 8 caracteres e uma letra maiúscula.');
  });
});

describe('política de senha: força', () => {
  it.each([
    ['', 'empty', 0],
    ['abc', 'missing', 0],
    ['Abcdefgh', 'weak', 1],
    ['Abcdefg1', 'strong', 2], // + número
    ['Abcdefg!', 'strong', 2], // + símbolo
    ['Abcdefghijkl', 'strong', 2], // 12+
    ['Abcdefgh1!', 'strong', 2], // número + símbolo mas < 12
    ['Abcdefgh12!x', 'very_strong', 3], // tudo e 12+
    ['Minha senha 2026', 'very_strong', 3], // espaço conta como símbolo
  ])('%j → %s', (pwd, level, score) => {
    const a = assessPassword(pwd);
    expect(a.level).toBe(level);
    expect(a.score).toBe(score);
  });

  it('rótulos e dicas', () => {
    expect(assessPassword('Abcdefgh').label).toBe('Senha fraca');
    expect(assessPassword('Abcdefgh').tip).toMatch(/número, um símbolo ou 12\+/);
    expect(assessPassword('Abcdefg1').label).toBe('Senha forte');
    expect(assessPassword('Abcdefg1').tip).toBe('Para ficar muito forte: um símbolo e 12+ caracteres.');
    expect(assessPassword('Abcdefgh12!x').label).toBe('Muito forte');
    expect(assessPassword('Abcdefgh12!x').tip).toBeNull();
  });
});

describe('erro weak_password do Supabase', () => {
  it('ignora outros erros', () => {
    expect(describeServerWeakPassword({ code: 'user_already_exists', message: 'User already registered' })).toBeNull();
    expect(describeServerWeakPassword({ code: 'same_password', message: 'New password should be different from the old password.' })).toBeNull();
    expect(describeServerWeakPassword(null)).toBeNull();
  });
  it('tamanho mínimo do servidor', () => {
    expect(describeServerWeakPassword({ code: 'weak_password', message: 'Password should be at least 10 characters.', reasons: ['length'] })).toBe(
      'Senha fraca: use pelo menos 10 caracteres.',
    );
  });
  it('caracteres exigidos pelo servidor', () => {
    expect(
      describeServerWeakPassword({ code: 'weak_password', message: 'Password should contain at least one character of each: abc..., ABC..., 0123456789, !@#...', reasons: ['characters'] }),
    ).toMatch(/número e um símbolo/);
  });
  it('senha vazada', () => {
    expect(describeServerWeakPassword({ code: 'weak_password', message: 'Password is known to be weak and easy to guess', weak_password: { reasons: ['pwned'] } })).toMatch(/vazamentos/);
  });
});
