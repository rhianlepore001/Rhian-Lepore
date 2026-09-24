import { describe, expect, it } from 'vitest';
import {
  filterBookableServices,
  isBookableService,
} from '@/utils/filterBookableServices';

describe('filterBookableServices', () => {
  const catalog = [
    { id: 'a', name: 'Corte', active: true },
    { id: 'b', name: 'Barba', active: false },
    { id: 'c', name: 'Combo', active: true },
    { id: 'd', name: 'Antigo', active: null },
  ];

  it('mantém apenas serviços com active === true', () => {
    expect(filterBookableServices(catalog).map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('isBookableService exige active true estrito', () => {
    expect(isBookableService({ id: '1', active: true })).toBe(true);
    expect(isBookableService({ id: '2', active: false })).toBe(false);
    expect(isBookableService({ id: '3', active: undefined })).toBe(false);
    expect(isBookableService({ id: '4' })).toBe(false);
  });

  it('keepSelectedIds preserva inativo já selecionado sem reabrir outros inativos', () => {
    const result = filterBookableServices(catalog, { keepSelectedIds: ['b'] });
    expect(result.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('não inclui inativos não selecionados mesmo com keep vazio', () => {
    expect(filterBookableServices(catalog, { keepSelectedIds: [] })).toHaveLength(2);
  });
});
