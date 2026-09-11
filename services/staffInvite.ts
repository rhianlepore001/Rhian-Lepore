import { supabasePublic } from '@/lib/supabase';
import { mapError } from '@/utils/mapError';

export interface StaffInviteMember {
  id: string;
  name: string;
  role: string;
  staff_user_id: string | null;
  business_name: string | null;
  user_type: string | null;
}

export interface StaffInviteCompany {
  business_name: string | null;
  user_type: string | null;
}

export type StaffInviteResult =
  | { status: 'ready'; member: StaffInviteMember }
  | { status: 'incomplete'; company: StaffInviteCompany | null; message: string }
  | { status: 'error'; message: string };

const INVITE_TIMEOUT_MS = 12_000;

function firstRow<T>(data: T | T[] | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

async function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promiseLike),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Não foi possível validar o convite. Tente de novo.')),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readQueryParam(params: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Extrai company/member do path `/invite/:company/:member`, da query do HashRouter
 * e da query externa (WhatsApp às vezes move o `?` para fora do hash).
 */
export function parseStaffInviteParams(input: {
  pathname?: string;
  search?: string;
  hash?: string;
}): { companyId: string | null; memberId: string | null } {
  const search = input.search?.startsWith('?') ? input.search.slice(1) : (input.search ?? '');
  const hashRaw = (input.hash ?? '').replace(/^#/, '');
  const hashQ = hashRaw.includes('?') ? hashRaw.slice(hashRaw.indexOf('?') + 1) : '';
  const pathFromHash = hashRaw.includes('?') ? hashRaw.slice(0, hashRaw.indexOf('?')) : hashRaw;
  const pathname = (input.pathname || pathFromHash || '').replace(/\/+$/, '');

  const invitePath = pathname.match(/\/invite\/([^/?#]+)\/([^/?#]+)/);
  const query = new URLSearchParams(search);
  const hashQuery = new URLSearchParams(hashQ);

  const companyId =
    (invitePath?.[1] ? decodeURIComponent(invitePath[1]) : null)
    || readQueryParam(query, ['company', 'c'])
    || readQueryParam(hashQuery, ['company', 'c']);

  const memberId =
    (invitePath?.[2] ? decodeURIComponent(invitePath[2]) : null)
    || readQueryParam(query, ['member', 'm'])
    || readQueryParam(hashQuery, ['member', 'm']);

  return { companyId, memberId };
}

export async function fetchStaffInvite(
  companyId: string,
  memberId?: string | null,
): Promise<StaffInviteResult> {
  try {
    if (memberId) {
      const { data, error } = await withTimeout(
        supabasePublic.rpc('get_team_member_for_invite', {
          p_company_id: companyId,
          p_member_id: memberId,
        }) as PromiseLike<{ data: unknown; error: unknown }>,
        INVITE_TIMEOUT_MS,
      );

      if (error) {
        return { status: 'error', message: mapError(error, 'Não foi possível validar o convite.').message };
      }

      const row = firstRow(data) as StaffInviteMember | null;
      if (!row?.id) {
        return { status: 'error', message: 'Convite inválido ou profissional não encontrado.' };
      }
      if (row.staff_user_id) {
        return { status: 'error', message: 'Este convite já foi utilizado.' };
      }

      return { status: 'ready', member: row };
    }

    const { data, error } = await withTimeout(
      supabasePublic.rpc('get_company_for_invite', { p_company_id: companyId }) as PromiseLike<{
        data: unknown;
        error: unknown;
      }>,
      INVITE_TIMEOUT_MS,
    );

    if (error) {
      return { status: 'error', message: mapError(error, 'Não foi possível validar o convite.').message };
    }

    const row = firstRow(data) as StaffInviteCompany | null;
    return {
      status: 'incomplete',
      company: row,
      message: 'Este link está incompleto. Peça ao gestor o convite gerado ao cadastrar seu perfil na equipe.',
    };
  } catch (error: unknown) {
    return {
      status: 'error',
      message: mapError(error, 'Não foi possível validar o convite. Tente de novo.').message,
    };
  }
}
