import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppLink,
  renderTemplate,
  renderWhatsAppTemplate,
  WHATSAPP_TEMPLATE_KEYS,
  type WhatsAppTemplateVars,
} from '@/utils/whatsappTemplates';

const templateVars: WhatsAppTemplateVars = {
  cliente: 'Camila Nogueira',
  primeiro_nome: 'Camila',
  data: '26/10/2026',
  hora: '14:30',
  servico: 'Corte e finalização',
  profissional: 'Rafa Lima',
  estabelecimento: 'Studio Aurora',
  valor: 'R$ 50,00',
  data_anterior: '25/10/2026',
  hora_anterior: '13:00',
  dias_ausente: 45,
  link_fila: 'https://agendixstudio.com/#/minha-area/studio?tab=fila',
  plano: 'Mensal Essencial',
};

describe('renderTemplate', () => {
  it('substitui somente as variáveis da whitelist', () => {
    expect(renderTemplate('Olá {cliente}, saldo {valor}.', {
      cliente: 'Ana',
      valor: 'R$ 10',
    }, ['cliente'])).toBe('Olá Ana, saldo {valor}.');
  });

  it('substitui valor ausente por vazio e remove espaços duplicados', () => {
    expect(renderTemplate('Olá {primeiro_nome}! Serviço: {servico}.', {
      primeiro_nome: '',
      servico: null,
    }, ['primeiro_nome', 'servico'])).toBe('Olá! Serviço:.');
  });

  it('remove controles e quebras de linha de nomes', () => {
    expect(renderTemplate('Olá {cliente}.', {
      cliente: 'Ana\r\nSilva\u0000',
    }, ['cliente'])).toBe('Olá Ana Silva.');
  });

  it('trunca nomes em 80 caracteres', () => {
    expect(renderTemplate('{cliente}', {
      cliente: 'A'.repeat(90),
    }, ['cliente'])).toBe('A'.repeat(80));
  });
});

describe('buildWhatsAppLink', () => {
  it('adiciona DDI brasileiro a número nacional e codifica a mensagem', () => {
    expect(buildWhatsAppLink('(11) 98765-4321', 'BR', 'Oi & olá'))
      .toBe('https://wa.me/5511987654321?text=Oi%20%26%20ol%C3%A1');
  });

  it('adiciona DDI português e não duplica o DDI já salvo', () => {
    expect(buildWhatsAppLink('912 345 678', 'PT')).toBe('https://wa.me/351912345678');
    expect(buildWhatsAppLink('+351 912 345 678', 'PT')).toBe('https://wa.me/351912345678');
  });

  it('não duplica o DDI brasileiro já salvo', () => {
    expect(buildWhatsAppLink('+55 11 98765-4321', 'BR')).toBe('https://wa.me/5511987654321');
  });
});

describe('templates de WhatsApp por tema', () => {
  it('mantém snapshot de todas as chaves nos temas barber e beauty', () => {
    const snapshots = Object.fromEntries(WHATSAPP_TEMPLATE_KEYS.map((key) => [key, Object.fromEntries(
      (['barber', 'beauty'] as const).map((theme) => {
        const vars = { ...templateVars };
        if (key === 'reschedule') {
          vars.cliente = theme === 'beauty' ? 'Olá, Camila! ✨' : 'Fala, Camila! 🔁';
          vars.profissional = 'com Rafa Lima';
        }
        if (key === 'client_change') vars.cliente = 'Sou Camila.';
        return [theme, renderWhatsAppTemplate(key, theme, vars)];
      }),
    )]));

    expect(snapshots).toMatchSnapshot();
  });

  it('mantém as variantes de confirmação e reativação VIP centralizadas', () => {
    expect(renderWhatsAppTemplate('client_request_confirm', 'barber', templateVars, 'confirmed'))
      .not.toContain('Pode confirmar');
    expect(renderWhatsAppTemplate('reactivation', 'beauty', templateVars, 'vip'))
      .toContain('Você é especial pra gente.');
  });
});
