export type SetupBlockId = 'costs' | 'hours' | 'materials' | 'margin';

export interface SetupInput {
  hasActiveCost: boolean;
  hasOpenHours: boolean;
  hasMaterial: boolean;
  marginSaved: boolean;
}

export type WorkingHoursLike = Record<string, { isOpen: boolean; blocks: { start: string; end: string }[] }> | null | undefined;

export const WIZARD_BLOCK_HASH: Record<SetupBlockId, string> = {
  costs: 'contas',
  hours: 'horarios',
  materials: 'materiais',
  margin: 'margem',
};

const HASH_TO_BLOCK: Record<string, SetupBlockId> = {
  contas: 'costs',
  horarios: 'hours',
  materiais: 'materials',
  margem: 'margin',
};

const SETUP_BLOCK_LABEL: Record<SetupBlockId, string> = {
  costs: 'contas do mês',
  hours: 'horários',
  materials: 'material',
  margin: 'quando avisar “sobra pouco”',
};

const BLOCK_ORDER: SetupBlockId[] = ['costs', 'hours', 'materials', 'margin'];

export function hasOpenBusinessHours(hours: WorkingHoursLike): boolean {
  if (!hours) return false;
  return Object.values(hours).some((day) =>
    day?.isOpen === true
    && Array.isArray(day.blocks)
    && day.blocks.some((block) => typeof block.start === 'string' && typeof block.end === 'string' && block.start < block.end),
  );
}

export function setupProgress(input: SetupInput): { configured: number; total: 4; blocks: Record<SetupBlockId, boolean> } {
  const blocks: Record<SetupBlockId, boolean> = {
    costs: input.hasActiveCost,
    hours: input.hasOpenHours,
    materials: input.hasMaterial,
    margin: input.marginSaved,
  };
  const configured = BLOCK_ORDER.filter((id) => blocks[id]).length;
  return { configured, total: 4, blocks };
}

export function setupProgressLabel(configured: number, total = 4): string {
  return `${configured} de ${total} configurados`;
}

export function firstPendingBlock(blocks: Record<SetupBlockId, boolean>): SetupBlockId | null {
  return BLOCK_ORDER.find((id) => !blocks[id]) ?? null;
}

export function allServicesHaveMaterialDecision(
  services: { id: string }[],
  materials: { service_id: string }[],
): boolean {
  if (!services.length) return true;
  const decided = new Set(materials.map((item) => item.service_id));
  return services.every((service) => decided.has(service.id));
}

export function wizardBlockFromLocation(hash: string): SetupBlockId | null {
  const query = hash.match(/[?&]bloco=([a-z]+)/i)?.[1]?.toLowerCase();
  if (query && HASH_TO_BLOCK[query]) return HASH_TO_BLOCK[query];
  const tokens = hash.split(/[#?&/=]/).map((part) => part.toLowerCase()).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (HASH_TO_BLOCK[tokens[i]]) return HASH_TO_BLOCK[tokens[i]];
  }
  return null;
}

export function pendingSetupWarning(blocks: Record<SetupBlockId, boolean> | null): {
  kind: 'cost' | 'margin' | null;
  text: string;
  pending: SetupBlockId[];
} {
  if (!blocks) return { kind: null, text: '', pending: [] };
  const pending = BLOCK_ORDER.filter((id) => !blocks[id]);
  if (!pending.length) return { kind: null, text: '', pending };
  if (pending.length === 1 && pending[0] === 'margin') {
    return { kind: 'margin', text: 'Falta definir quando avisar “sobra pouco”.', pending };
  }
  const labels = pending.map((id) => SETUP_BLOCK_LABEL[id]);
  const list = labels.length === 2
    ? `${labels[0]} e ${labels[1]}`
    : `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
  const count = pending.length;
  const verb = count > 1 ? 'Faltam' : 'Falta';
  const costAffecting = pending.some((id) => id !== 'margin');
  return {
    kind: 'cost',
    text: `${verb} ${count} de 4 ajustes: ${list}.${costAffecting ? ' O custo da hora pode estar baixo e a sobra, alta demais.' : ''}`,
    pending,
  };
}
