export type SetupBlockId = 'costs' | 'hours' | 'materials' | 'margin';

export interface SetupInput {
  hasActiveCost: boolean;
  hasOpenHours: boolean;
  hasMaterial: boolean;
  marginSaved: boolean;
}

export type WorkingHoursLike = Record<string, { isOpen: boolean; blocks: { start: string; end: string }[] }> | null | undefined;

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
  const configured = (['costs', 'hours', 'materials', 'margin'] as const).filter((id) => blocks[id]).length;
  return { configured, total: 4, blocks };
}

export function setupProgressLabel(configured: number, total = 4): string {
  return `${configured} de ${total} configurados`;
}
