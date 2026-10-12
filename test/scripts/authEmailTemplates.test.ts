import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(__dirname, '../../supabase/templates');
const files = readdirSync(DIR).filter((f) => f.endsWith('.html'));

describe('templates de e-mail do Supabase Auth', () => {
  it('existem os 5 templates (reset obrigatório)', () => {
    expect(files.sort()).toEqual(['confirmation.html', 'email_change.html', 'invite.html', 'magic_link.html', 'recovery.html']);
  });

  it.each(files)('%s: pt-BR, 600px, botão + link de fallback, sem domínio antigo', (f) => {
    const html = readFileSync(path.join(DIR, f), 'utf8');
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('max-width:600px');
    // botão (VML + HTML) e link de texto
    expect(html.match(/\{\{ \.ConfirmationURL \}\}/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain('{{ .Email }}');
    expect(html).not.toMatch(/promptdeelite|Supabase Auth|powered by/i);
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toMatch(/\{\{\s*\.(?!ConfirmationURL|Email|NewEmail)[A-Za-z]+\s*\}\}/);
  });

  it('troca de e-mail mostra o endereço novo', () => {
    expect(readFileSync(path.join(DIR, 'email_change.html'), 'utf8')).toContain('{{ .NewEmail }}');
  });
});
