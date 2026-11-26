import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createPublishEstablishmentSiteHandler } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const siteOrigin = Deno.env.get('PUBLIC_SITE_ORIGIN') || 'https://www.agendixstudio.com';

const admin = createClient(supabaseUrl, serviceRoleKey);

const handler = createPublishEstablishmentSiteHandler({
  siteOrigin,
  async getUserFromToken(token) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id };
  },
  async getOwnerSiteByUser(userId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, company_id, role, business_slug, business_name, user_type, region, address_street, phone, instagram_handle, logo_url, cover_photo_url')
      .eq('id', userId)
      .maybeSingle();
    if (!profile || profile.role !== 'owner') return null;
    const companyId = profile.id;
    const [{ data: site }, { data: services }] = await Promise.all([
      admin
        .from('establishment_sites')
        .select('published, presence_enabled, published_config')
        .eq('company_id', companyId)
        .maybeSingle(),
      admin
        .from('services')
        .select('id, name, description, price, duration_minutes, image_url')
        .eq('user_id', companyId)
        .eq('active', true),
    ]);
    return {
      companyId,
      role: profile.role,
      slug: profile.business_slug || null,
      name: profile.business_name || 'Estabelecimento',
      kind: profile.user_type === 'beauty' ? 'beauty' : profile.user_type === 'studio' ? 'studio' : 'barber',
      region: profile.region === 'PT' ? 'PT' : 'BR',
      address: profile.address_street || '',
      phone: profile.phone || undefined,
      instagram: profile.instagram_handle || undefined,
      logo: profile.logo_url || undefined,
      cover: profile.cover_photo_url || undefined,
      presenceEnabled: site?.presence_enabled === true,
      published: site?.published === true,
      publishedConfig: (site?.published_config as Record<string, unknown> | null) || null,
      services: (services || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        price: Number(item.price || 0),
        duration: Number(item.duration_minutes || 30),
        image: item.image_url || undefined,
      })),
    };
  },
  async listPublishedSlugs() {
    const { data } = await admin.rpc('list_published_site_slugs');
    return Array.isArray(data) ? data : [];
  },
  async uploadPublishedFile(path, content, contentType) {
    const { error } = await admin.storage
      .from('published-sites')
      .upload(path, new Blob([content], { type: contentType }), { contentType, upsert: true });
    if (error) throw error;
  },
  async removePublishedPrefix(prefix) {
    await admin.storage.from('published-sites').remove([`${prefix}.html`]);
    const { data: nested } = await admin.storage.from('published-sites').list(`${prefix}/servico`);
    if (nested?.length) {
      await admin.storage
        .from('published-sites')
        .remove(nested.map(item => `${prefix}/servico/${item.name}`));
    }
  },
});

Deno.serve(handler);
