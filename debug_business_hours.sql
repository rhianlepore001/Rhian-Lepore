-- Script para verificar configuração de business_hours
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se business_hours está configurado
SELECT 
    p.business_name,
    p.business_slug,
    bs.business_hours,
    CASE 
        WHEN bs.business_hours IS NULL THEN '❌ NULL'
        WHEN bs.business_hours::text = '{}'::text THEN '❌ VAZIO'
        ELSE '✅ CONFIGURADO'
    END as status
FROM profiles p
LEFT JOIN business_settings bs ON bs.user_id = p.id
WHERE p.business_slug IS NOT NULL
ORDER BY p.business_name;

-- 2. Ver exemplo de business_hours configurado (se existir)
SELECT 
    p.business_name,
    jsonb_pretty(bs.business_hours) as horarios_formatados
FROM profiles p
LEFT JOIN business_settings bs ON bs.user_id = p.id
WHERE bs.business_hours IS NOT NULL 
  AND bs.business_hours::text != '{}'::text
LIMIT 1;

-- 3. Exemplo de estrutura esperada para business_hours
-- Se nenhum negócio tiver configurado, use este exemplo:
/*
{
  "mon": {
    "isOpen": true,
    "blocks": [
      {"start": "09:00", "end": "12:00"},
      {"start": "14:00", "end": "18:00"}
    ]
  },
  "tue": {
    "isOpen": true,
    "blocks": [
      {"start": "09:00", "end": "12:00"},
      {"start": "14:00", "end": "18:00"}
    ]
  },
  "wed": {
    "isOpen": true,
    "blocks": [
      {"start": "09:00", "end": "12:00"},
      {"start": "14:00", "end": "18:00"}
    ]
  },
  "thu": {
    "isOpen": true,
    "blocks": [
      {"start": "09:00", "end": "12:00"},
      {"start": "14:00", "end": "18:00"}
    ]
  },
  "fri": {
    "isOpen": true,
    "blocks": [
      {"start": "09:00", "end": "12:00"},
      {"start": "14:00", "end": "18:00"}
    ]
  },
  "sat": {
    "isOpen": true,
    "blocks": [
      {"start": "09:00", "end": "13:00"}
    ]
  },
  "sun": {
    "isOpen": false,
    "blocks": []
  }
}
*/
