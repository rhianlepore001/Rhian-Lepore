import {
  buildWhatsAppLink,
  renderWhatsAppTemplate,
  type WhatsAppRegion,
  type WhatsAppTheme,
  type WhatsAppTemplateOverride,
} from './whatsappTemplates';

export interface ClientContext {
  name: string;
  daysMissing: number;
  userType: 'barber' | 'beauty' | string;
  businessName?: string;
  lastService?: string;
  ltv?: number;
  template?: WhatsAppTemplateOverride;
}

export const generateReactivationMessage = (context: ClientContext): string => {
  const theme: WhatsAppTheme = context.userType === 'beauty' ? 'beauty' : 'barber';
  const variant = context.ltv && context.ltv > 500 ? 'vip' : undefined;

  return renderWhatsAppTemplate('reactivation', theme, {
    primeiro_nome: context.name.trim().split(/\s+/).filter(Boolean)[0] ?? '',
    dias_ausente: context.daysMissing,
    estabelecimento: context.businessName?.trim() || 'nossa unidade',
    servico: context.lastService?.trim() || 'visual',
  }, variant, context.template);
};

export const getWhatsAppUrl = (
  phone: string,
  message: string,
  region: WhatsAppRegion = 'BR',
): string => buildWhatsAppLink(phone, region, message);
