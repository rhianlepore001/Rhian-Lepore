import { describe, expect, it } from 'vitest';
import {
  CLUB_OWNER_NAV,
  NAVIGATION_ITEMS,
  SETTINGS_ITEMS,
  findActiveSettingsItem,
  isPathActive,
} from '@/constants';

describe('navegação do Clube (dono)', () => {
  it('expõe Clube em Ajustes, distinto de Plano AgendiX', () => {
    const clube = SETTINGS_ITEMS.find((item) => item.path === '/configuracoes/clube');
    const agendix = SETTINGS_ITEMS.find((item) => item.path === '/configuracoes/assinatura');
    expect(clube?.label).toBe('Clube');
    expect(clube?.group).toBe('Negócio');
    expect(agendix?.label).toBe('Plano AgendiX');
    expect(agendix?.group).toBe('Financeiro');
  });

  it('expõe Equipe no menu principal só para dono, sem confundir com Ajustes', () => {
    const equipe = NAVIGATION_ITEMS.find((item) => item.path === '/configuracoes/equipe');
    const ajustes = NAVIGATION_ITEMS.find((item) => item.path === '/configuracoes');
    expect(equipe?.name).toBe('Equipe');
    expect(equipe?.ownerOnly).toBe(true);
    expect(equipe?.group).toBe('Operação');
    expect(ajustes?.name).toBe('Ajustes');
    expect(findActiveSettingsItem(NAVIGATION_ITEMS, '/configuracoes/equipe')?.name).toBe('Equipe');
    expect(findActiveSettingsItem(NAVIGATION_ITEMS, '/configuracoes/geral')?.name).toBe('Ajustes');
  });

  it('mantém abas Planos, Pix e Assinantes', () => {
    expect(CLUB_OWNER_NAV.map((item) => item.label)).toEqual(['Planos', 'Pix', 'Assinantes']);
  });

  it('marca Clube ativo em /configuracoes/clube/pix', () => {
    expect(isPathActive('/configuracoes/clube/pix', '/configuracoes/clube')).toBe(true);
    expect(isPathActive('/configuracoes/clube/pix', '/configuracoes/clube', true)).toBe(false);
    expect(findActiveSettingsItem(SETTINGS_ITEMS, '/configuracoes/clube/pix')?.label).toBe('Clube');
  });

  it('marca Clube e Análises como exclusivos do plano Equipe', () => {
    const clube = NAVIGATION_ITEMS.find((item) => item.path === '/clube/assinantes');
    const analises = NAVIGATION_ITEMS.find((item) => item.path === '/insights');
    const settingsClube = SETTINGS_ITEMS.find((item) => item.path === '/configuracoes/clube');
    expect(clube?.equipeOnly).toBe(true);
    expect(analises?.equipeOnly).toBe(true);
    expect(settingsClube?.equipeOnly).toBe(true);
  });

  it('não confunde Ajustes com a rota pública /clube/:slug', () => {
    expect(isPathActive('/clube/minha-barbearia', '/clube/assinantes')).toBe(false);
  });
});
