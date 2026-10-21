import { createMetaCapiHandler } from './handler.ts';

Deno.serve(createMetaCapiHandler({
  pixelId: Deno.env.get('META_PIXEL_ID') || '',
  token: Deno.env.get('META_CAPI_TOKEN') || '',
  testEventCode: Deno.env.get('META_TEST_EVENT_CODE'),
  allowedOrigins: (Deno.env.get('META_ALLOWED_ORIGINS') || '').split(',').map(origin => origin.trim()).filter(Boolean),
}));
