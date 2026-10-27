import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppLink,
  renderTemplate,
  renderWhatsAppTemplate,
  WHATSAPP_TEMPLATE_KEYS,
  type WhatsAppTemplateVars,
} from '@/utils/whatsappTemplates';

const templateVars: WhatsAppTemplateVars = {
  cliente: 'Cliente Exemplo',
  primeiro_nome: 'Cliente',
  data: '26/10/2026',
  hora: '14:30',
  servico: 'Corte e finalização',
  profissional: 'Profissional Exemplo',
  estabelecimento: 'Negócio Exemplo',
  valor: 'R$ 50,00',
  data_anterior: '25/10/2026',
  hora_anterior: '13:00',
  dias_ausente: 45,
  link_fila: 'https://example.test/#/minha-area/studio?tab=fila',
  plano: 'Mensal Essencial',
};

describe('renderTemplate', () => {
  it('substitui somente as variáveis da whitelist', () => {
    expect(renderTemplate('Olá {cliente}, saldo {valor}.', {
      cliente: 'Cliente',
      valor: 'R$ 10',
    }, ['cliente'])).toBe('Olá Cliente, saldo {valor}.');
  });

  it('substitui valor ausente por vazio e remove espaços duplicados', () => {
    expect(renderTemplate('Olá {primeiro_nome}! Serviço: {servico}.', {
      primeiro_nome: '',
      servico: null,
    }, ['primeiro_nome', 'servico'])).toBe('Olá! Serviço:.');
  });

  it('remove controles e quebras de linha de nomes', () => {
    expect(renderTemplate('Olá {cliente}.', {
      cliente: 'Cliente\r\nExemplo\u0000',
    }, ['cliente'])).toBe('Olá Cliente Exemplo.');
  });

  it('trunca nomes em 80 caracteres', () => {
    expect(renderTemplate('{cliente}', {
      cliente: 'A'.repeat(90),
    }, ['cliente'])).toBe('A'.repeat(80));
  });
});

describe('buildWhatsAppLink', () => {
  it('adiciona DDI brasileiro a número nacional e codifica a mensagem', () => {
    expect(buildWhatsAppLink('(00) 00000-0000', 'BR', 'Oi & olá'))
      .toBe('https://wa.me/5500000000000?text=Oi%20%26%20ol%C3%A1');
  });

  it('adiciona DDI português e não duplica o DDI já salvo', () => {
    expect(buildWhatsAppLink('000 000 000', 'PT')).toBe('https://wa.me/351000000000');
    expect(buildWhatsAppLink('+351 000 000 000', 'PT')).toBe('https://wa.me/351000000000');
  });

  it('não duplica o DDI brasileiro já salvo', () => {
    expect(buildWhatsAppLink('+55 00 00000-0000', 'BR')).toBe('https://wa.me/5500000000000');
  });
});

describe('templates de WhatsApp por tema', () => {
  it('mantém snapshot de todas as chaves nos temas barber e beauty', () => {
    const snapshots = Object.fromEntries(WHATSAPP_TEMPLATE_KEYS.map((key) => [key, Object.fromEntries(
      (['barber', 'beauty'] as const).map((theme) => {
        const vars = { ...templateVars };
        if (key === 'reschedule') {
          vars.profissional = 'com Profissional Exemplo';
        }
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

describe('variáveis de atendido', () => {
  it('informa o dependente ao titular mesmo com mensagem personalizada antiga', () => {
    const message = renderWhatsAppTemplate('wizard_confirm', 'beauty', { cliente: 'Titular Fictício', atendido: 'Dependente Fictício', para_quem: ' para Dependente Fictício' }, undefined, { message_key: 'wizard_confirm', enabled: true, body: 'Olá {cliente}!' });
    expect(message).toBe('Olá Titular Fictício!\nAtendimento para Dependente Fictício.');
  });
  it('substitui ambas as variáveis sem duplicar a informação', () => {
    expect(renderWhatsAppTemplate('wizard_confirm', 'beauty', { atendido: 'Dependente Fictício', para_quem: ' para Dependente Fictício' }, undefined, { message_key: 'wizard_confirm', enabled: true, body: 'Atendido: {atendido}. Reserva {para_quem}.' })).toBe('Atendido: Dependente Fictício. Reserva para Dependente Fictício.');
  });
});
