import { supabase } from '../lib/supabase';
import { validateWhatsAppTemplate } from '../utils/whatsappTemplateEditor';
import type { WhatsAppTemplateOverride } from '../utils/whatsappTemplates';

export async function fetchWhatsAppTemplates(
  companyId: string,
): Promise<WhatsAppTemplateOverride[]> {
  const { data, error } = await supabase
    .from('whatsapp_message_templates')
    .select('message_key, enabled, body')
    .eq('business_id', companyId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicWhatsAppTemplates(
  slug: string,
): Promise<WhatsAppTemplateOverride[]> {
  const { data, error } = await supabase.rpc('get_public_whatsapp_templates', {
    p_slug: slug,
  });
  if (error) throw error;
  return data ?? [];
}

export async function saveWhatsAppTemplate(
  companyId: string,
  template: WhatsAppTemplateOverride,
): Promise<WhatsAppTemplateOverride> {
  const validation =
    template.body === null
      ? null
      : validateWhatsAppTemplate(template.message_key, template.body);
  if (validation) throw new Error(validation);
  const { data, error } = await supabase
    .from('whatsapp_message_templates')
    .upsert(
      {
        business_id: companyId,
        message_key: template.message_key,
        enabled: template.enabled,
        body: template.body,
      },
      { onConflict: 'business_id,message_key' },
    )
    .select('message_key, enabled, body')
    .eq('business_id', companyId)
    .single();
  if (error) throw error;
  return data;
}
