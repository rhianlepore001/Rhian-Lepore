#!/usr/bin/env node
// ==========================================================================
// Audit MCP — servidor MCP restrito À SEÇÃO DE AUDITORIA do Agendix.
//
// Escopo de segurança: este servidor SÓ conhece a tabela `bug_reports`
// (a seção Auditoria em Configurações). Não existe nenhuma ferramenta capaz
// de tocar em clientes, agenda, financeiro ou na trilha imutável audit_logs.
// A permissão é "apenas na auditoria" por construção: o cardápio de tools
// abaixo é a fronteira.
//
// Protocolo: MCP sobre stdio (JSON-RPC 2.0, uma mensagem por linha).
// Sem dependências novas — reutiliza @supabase/supabase-js do app.
// ==========================================================================

import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SERVER_NAME = 'agendix-audit';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

// Única tabela que este MCP pode tocar. Trocar isto ampliaria o escopo —
// por isso fica travado numa constante e é validado em toda operação.
const AUDIT_TABLE = 'bug_reports';

// Valores permitidos (espelham os CHECKs das migrations do bug_reports).
const STATUSES = ['new', 'triaged', 'planned', 'in_progress', 'fixed', 'wontfix'];
const TYPES = ['bug', 'ux', 'backend', 'frontend', 'idea', 'question'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = ['agenda', 'login', 'clients', 'finance', 'queue', 'settings', 'modal', 'other'];

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// --- log só no stderr (stdout é exclusivo do protocolo) ---
const log = (...a) => process.stderr.write(`[audit-mcp] ${a.join(' ')}\n`);

// --------------------------------------------------------------------------
// Carrega credenciais do .env do projeto (sem duplicar segredo no .mcp.json).
// Variáveis reais do ambiente têm prioridade.
// --------------------------------------------------------------------------
function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(join(PROJECT_ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (env[k] === undefined) env[k] = v; // env real vence
    }
  } catch {
    // sem .env — segue com o que houver no process.env
  }
  return env;
}

const ENV = loadEnv();
const SUPABASE_URL = ENV.SUPABASE_URL || ENV.VITE_SUPABASE_URL;
const SERVICE_KEY = ENV.SUPABASE_SERVICE_KEY || ENV.SUPABASE_SERVICE_ROLE_KEY || null;
const ANON_KEY = ENV.SUPABASE_ANON_KEY || ENV.VITE_SUPABASE_ANON_KEY;
const LOGIN_EMAIL = ENV.AUDIT_MCP_EMAIL || ENV.AGENDIX_TEST_EMAIL;
const LOGIN_PASSWORD = ENV.AUDIT_MCP_PASSWORD || ENV.AGENDIX_TEST_PASSWORD;

// --------------------------------------------------------------------------
// Conexão preguiçosa: só conecta/loga na 1ª chamada de ferramenta, para que
// initialize / tools/list respondam mesmo offline.
// --------------------------------------------------------------------------
let _client = null;
let _clientPromise = null; // memoiza o login para evitar corrida de múltiplos sign-ins
let _companyId = null; // company_id do tenant logado (para inserts)
let _userId = null;

function getClient() {
  // Uma única inicialização compartilhada, mesmo com chamadas concorrentes.
  if (!_clientPromise) _clientPromise = initClient();
  return _clientPromise;
}

async function initClient() {
  if (_client) return _client;
  if (!SUPABASE_URL) throw new Error('Faltou VITE_SUPABASE_URL/SUPABASE_URL no .env.');

  if (SERVICE_KEY) {
    // Chave de serviço: acesso total (ignora RLS). Ainda assim, só usamos a
    // tabela de auditoria — o escopo é o cardápio de tools, não a chave.
    _client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    log('conectado com service_role (RLS ignorado).');
    return _client;
  }

  if (!ANON_KEY) throw new Error('Faltou VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY no .env.');
  _client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  if (LOGIN_EMAIL && LOGIN_PASSWORD) {
    const { data, error } = await _client.auth.signInWithPassword({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });
    if (error) throw new Error(`Falha no login (${LOGIN_EMAIL}): ${error.message}`);
    _userId = data.user?.id ?? null;
    log(`logado como ${LOGIN_EMAIL} (tenant isolado por RLS).`);
    // Descobre o company_id do perfil, necessário para criar registros.
    if (_userId) {
      const { data: prof } = await _client
        .from('profiles')
        .select('company_id')
        .eq('id', _userId)
        .maybeSingle();
      _companyId = prof?.company_id ?? null;
    }
  } else {
    log('sem login: só operações permitidas ao usuário anônimo (a RLS pode bloquear).');
  }
  return _client;
}

// --------------------------------------------------------------------------
// Definição das ferramentas (a fronteira do escopo).
// --------------------------------------------------------------------------
const TOOLS = [
  {
    name: 'audit_list',
    description:
      'Lista registros da seção Auditoria (bug_reports): problemas, sugestões e dúvidas. Filtros opcionais.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: STATUSES, description: 'Filtra por status.' },
        type: { type: 'string', enum: TYPES, description: 'Filtra por tipo.' },
        severity: { type: 'string', enum: SEVERITIES },
        category: { type: 'string', enum: CATEGORIES },
        source: { type: 'string', enum: ['manual', 'auto'] },
        level: { type: 'integer', minimum: 1, maximum: 5 },
        search: { type: 'string', description: 'Texto no título ou descrição.' },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        offset: { type: 'integer', minimum: 0, default: 0 },
      },
    },
  },
  {
    name: 'audit_get',
    description: 'Retorna um registro de auditoria completo pelo id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'UUID do registro.' } },
      required: ['id'],
    },
  },
  {
    name: 'audit_update_status',
    description:
      'Muda o status de um registro (ex.: new → in_progress → fixed). Ao marcar como fixed, grava a data de resolução.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: STATUSES },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'audit_create',
    description: 'Cria um novo registro na seção Auditoria.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: TYPES, default: 'question' },
        severity: { type: 'string', enum: SEVERITIES, default: 'low' },
        category: { type: 'string', enum: CATEGORIES, default: 'other' },
        status: { type: 'string', enum: STATUSES, default: 'new' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'audit_delete',
    description: 'Apaga UM registro de auditoria pelo id. Irreversível: exige confirm=true.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        confirm: { type: 'boolean', description: 'Precisa ser true para apagar de verdade.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'audit_delete_resolved',
    description:
      "Apaga TODOS os registros com status 'fixed' (limpeza dos resolvidos). Irreversível: exige confirm=true.",
    inputSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', description: 'Precisa ser true para apagar de verdade.' },
      },
    },
  },
];

// --------------------------------------------------------------------------
// Implementação das ferramentas — TODAS restritas a AUDIT_TABLE.
// --------------------------------------------------------------------------
const handlers = {
  async audit_list(args = {}) {
    const db = await getClient();
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const offset = Math.max(args.offset ?? 0, 0);
    let q = db.from(AUDIT_TABLE).select('*').order('created_at', { ascending: false });
    for (const col of ['status', 'type', 'severity', 'category', 'source', 'level']) {
      if (args[col] !== undefined && args[col] !== null) q = q.eq(col, args[col]);
    }
    if (args.search) q = q.or(`title.ilike.%${args.search}%,description.ilike.%${args.search}%`);
    q = q.range(offset, offset + limit - 1);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { count: data.length, offset, limit, entries: data };
  },

  async audit_get(args) {
    if (!args?.id) throw new Error('id é obrigatório.');
    const db = await getClient();
    const { data, error } = await db.from(AUDIT_TABLE).select('*').eq('id', args.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Nenhum registro com id ${args.id}.`);
    return data;
  },

  async audit_update_status(args) {
    if (!args?.id) throw new Error('id é obrigatório.');
    if (!STATUSES.includes(args.status)) throw new Error(`status inválido. Use: ${STATUSES.join(', ')}.`);
    const db = await getClient();
    const patch = { status: args.status };
    patch.resolved_at = args.status === 'fixed' ? new Date().toISOString() : null;
    const { data, error } = await db.from(AUDIT_TABLE).update(patch).eq('id', args.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Nada atualizado (id ${args.id} não existe ou fora do seu acesso).`);
    return { updated: true, entry: data };
  },

  async audit_create(args) {
    if (!args?.title || !args?.description) throw new Error('title e description são obrigatórios.');
    const db = await getClient();
    if (!SERVICE_KEY && !_companyId) {
      throw new Error(
        'Não foi possível descobrir o company_id do login para criar o registro. ' +
          'Garanta que o usuário de login tem perfil (profiles.company_id) ou use SUPABASE_SERVICE_KEY.'
      );
    }
    const row = {
      title: args.title,
      description: args.description,
      type: args.type ?? 'question',
      severity: args.severity ?? 'low',
      category: args.category ?? 'other',
      status: args.status ?? 'new',
      source: 'manual',
      mode: 'simple',
    };
    if (_companyId) row.company_id = _companyId;
    if (_userId) row.user_id = _userId;
    const { data, error } = await db.from(AUDIT_TABLE).insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { created: true, entry: data };
  },

  async audit_delete(args) {
    if (!args?.id) throw new Error('id é obrigatório.');
    if (args.confirm !== true) {
      return {
        deleted: false,
        needsConfirmation: true,
        message: `Isto vai APAGAR o registro ${args.id} para sempre. Chame de novo com confirm=true.`,
      };
    }
    const db = await getClient();
    const { data, error } = await db.from(AUDIT_TABLE).delete().eq('id', args.id).select();
    if (error) throw new Error(error.message);
    return { deleted: (data?.length ?? 0) > 0, removed: data?.length ?? 0 };
  },

  async audit_delete_resolved(args = {}) {
    if (args.confirm !== true) {
      return {
        deleted: false,
        needsConfirmation: true,
        message: "Isto vai APAGAR todos os registros 'fixed' (resolvidos). Chame de novo com confirm=true.",
      };
    }
    const db = await getClient();
    const { data, error } = await db.from(AUDIT_TABLE).delete().eq('status', 'fixed').select();
    if (error) throw new Error(error.message);
    return { deleted: true, removed: data?.length ?? 0 };
  },
};

// --------------------------------------------------------------------------
// Camada JSON-RPC / MCP.
// --------------------------------------------------------------------------
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}
function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}
function replyError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handleMessage(msg) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case 'initialize':
      reply(id, {
        protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
      return;

    case 'notifications/initialized':
    case 'initialized':
      return; // notificação — sem resposta

    case 'ping':
      if (!isNotification) reply(id, {});
      return;

    case 'tools/list':
      reply(id, { tools: TOOLS });
      return;

    case 'tools/call': {
      const name = params?.name;
      const args = params?.arguments ?? {};
      const fn = handlers[name];
      if (!fn) {
        reply(id, {
          content: [{ type: 'text', text: `Ferramenta desconhecida: ${name}` }],
          isError: true,
        });
        return;
      }
      try {
        const out = await fn(args);
        reply(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
      } catch (err) {
        reply(id, {
          content: [{ type: 'text', text: `Erro: ${err.message}` }],
          isError: true,
        });
      }
      return;
    }

    default:
      if (!isNotification) replyError(id, -32601, `Método não suportado: ${method}`);
  }
}

// Fila sequencial: garante que as mensagens são tratadas em ordem, sem corrida
// entre create/update/delete (cada uma espera a anterior terminar).
let _chain = Promise.resolve();
const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const t = line.trim();
  if (!t) return;
  let msg;
  try {
    msg = JSON.parse(t);
  } catch {
    log('linha ignorada (JSON inválido).');
    return;
  }
  _chain = _chain.then(() => handleMessage(msg)).catch((e) => log('erro não tratado:', e.message));
});

log(`pronto — servidor "${SERVER_NAME}" restrito à tabela ${AUDIT_TABLE}.`);
