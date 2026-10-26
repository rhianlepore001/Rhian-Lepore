import { describe, expect, it } from 'vitest';
import {
  WHATSAPP_TEMPLATE_GROUPS,
  validateWhatsAppTemplate,
  whatsAppPreviewVars,
} from '../../utils/whatsappTemplateEditor';
import {
  WHATSAPP_TEMPLATE_KEYS,
  TEMPLATE_ALLOWED_KEYS,
  renderTemplate,
  renderWhatsAppTemplate,
  buildWhatsAppLink,
} from '../../utils/whatsappTemplates';
import { buildRescheduleWhatsAppMessage } from '../../utils/rescheduleCopy';

describe('edição de mensagens', () => {
  it('agrupa todas as chaves uma única vez', () => {
    expect(
      WHATSAPP_TEMPLATE_GROUPS.flatMap((group) =>
        group.messages.map((message) => message.key),
      ).sort(),
    ).toEqual([...WHATSAPP_TEMPLATE_KEYS].sort());
  });
  it.each([
    '',
    '   ',
    '{senha}',
    '{Cliente}',
    '{cliente',
    '{cliente2}',
    '{cliente}}',
    '\u0000Olá',
    '\tOlá',
    'Olá\r',
    'Olá\u007f',
    'Olá\u009f',
    'Olá\n\n\n\nTudo bem?',
    'x'.repeat(1001),
  ])('rejeita corpo inválido %j', (body) => {
    expect(validateWhatsAppTemplate('wizard_confirm', body)).toBeTruthy();
  });
  it('aceita formatação, emojis, três quebras e 1000 caracteres Unicode', () => {
    expect(
      validateWhatsAppTemplate(
        'wizard_confirm',
        '*Olá {cliente}*\n\n\n_Bem-vinda_ ✨',
      ),
    ).toBeNull();
    expect(
      validateWhatsAppTemplate('wizard_confirm', '✨'.repeat(1000)),
    ).toBeNull();
    expect(
      validateWhatsAppTemplate('wizard_confirm', '😊'.repeat(1000)),
    ).toBeNull();
  });
  it('nome de pessoa é limitado em 80, serviços em 300 e negócio preservado', () => {
    expect(
      renderTemplate(
        '{cliente}|{servico}|{estabelecimento}',
        {
          cliente: 'A'.repeat(90),
          servico: 'S'.repeat(350),
          estabelecimento: 'E'.repeat(100),
        },
        ['cliente', 'servico', 'estabelecimento'],
      ),
    ).toBe(`${'A'.repeat(80)}|${'S'.repeat(300)}|${'E'.repeat(100)}`);
  });
  it('remarcação passa apenas o nome ao texto personalizado', () => {
    expect(
      buildRescheduleWhatsAppMessage({
        theme: 'beauty',
        clientName: 'Cliente',
        businessName: 'Studio',
        timeZone: 'UTC',
        oldTimeIso: '2026-10-26T12:00:00Z',
        newTimeIso: '2026-10-27T12:00:00Z',
        template: {
          message_key: 'reschedule',
          enabled: true,
          body: 'Oi {cliente}!',
        },
      }),
    ).toBe('Oi Cliente!');
  });
  for (const theme of ['barber', 'beauty'] as const) {
    it.each(WHATSAPP_TEMPLATE_KEYS)(
      `${theme}: usa texto salvo, padrão com null e link sem texto ao desligar %s`,
      (key) => {
        const variable = TEMPLATE_ALLOWED_KEYS[key][0];
        const vars = whatsAppPreviewVars('Negócio Exemplo', 'BR');
        const custom = {
          message_key: key,
          enabled: true,
          body: `Personalizada {${variable}}`,
        };
        expect(
          renderWhatsAppTemplate(key, theme, vars, undefined, custom),
        ).toBe(`Personalizada ${vars[variable]}`);
        expect(
          renderWhatsAppTemplate(key, theme, vars, undefined, {
            ...custom,
            body: null,
          }),
        ).toBe(renderWhatsAppTemplate(key, theme, vars));
        expect(
          buildWhatsAppLink(
            '00000000000',
            'BR',
            renderWhatsAppTemplate(key, theme, vars, undefined, {
              ...custom,
              enabled: false,
            }),
          ),
        ).toBe('https://wa.me/5500000000000');
      },
    );
  }
  it('texto salvo tem prioridade sobre variantes VIP e já confirmado', () => {
    for (const [key, variant] of [
      ['reactivation', 'vip'],
      ['client_request_confirm', 'confirmed'],
    ] as const) {
      expect(
        renderWhatsAppTemplate(key, 'barber', {}, variant, {
          message_key: key,
          enabled: true,
          body: 'Texto salvo',
        }),
      ).toBe('Texto salvo');
    }
  });
});
