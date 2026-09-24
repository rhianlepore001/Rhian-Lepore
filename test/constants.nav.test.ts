import { describe, expect, it } from 'vitest';
import {
  CLUB_OWNER_NAV,
  NAVIGATION_ITEMS,
  SETTINGS_ITEMS,
  TRIAL_DAYS,
  findActiveSettingsItem,
  getTrialEndsAt,
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

  it('não confunde Ajustes com a rota pública /clube/:slug', () => {
    expect(isPathActive('/clube/minha-barbearia', '/clube/assinantes')).toBe(false);
  });
});

describe('Serviços no menu principal', () => {
  it('expõe Serviços só para dono, entre Equipe e Produtos', () => {
    const servicos = NAVIGATION_ITEMS.find((item) => item.path === '/configuracoes/servicos');
    const equipeIdx = NAVIGATION_ITEMS.findIndex((item) => item.path === '/configuracoes/equipe');
    const servicosIdx = NAVIGATION_ITEMS.findIndex((item) => item.path === '/configuracoes/servicos');
    const produtosIdx = NAVIGATION_ITEMS.findIndex((item) => item.path === '/produtos');
    expect(servicos?.name).toBe('Serviços');
    expect(servicos?.ownerOnly).toBe(true);
    expect(servicos?.group).toBe('Operação');
    expect(servicosIdx).toBeGreaterThan(equipeIdx);
    expect(servicosIdx).toBeLessThan(produtosIdx);
    expect(findActiveSettingsItem(NAVIGATION_ITEMS, '/configuracoes/servicos')?.name).toBe('Serviços');
  });
});

describe('trial do produto AgendiX', () => {
  it('dura 20 dias e calcula trial_ends_at a partir disso', () => {
    expect(TRIAL_DAYS).toBe(20);
    const from = Date.UTC(2026, 8, 15);
    expect(getTrialEndsAt(from)).toBe(new Date(from + 20 * 24 * 60 * 60 * 1000).toISOString());
  });
});
