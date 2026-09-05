
import { Appointment, Client, FinanceRecord } from './types';
import { LucideIcon, Bell, LayoutDashboard, Calendar, Users, Settings, DollarSign, Package, CreditCard, Clock, Shield, Trash2, ClipboardList, ShieldAlert, TrendingUp, Crown } from 'lucide-react';

export function isPathActive(pathname: string, itemPath: string, exact = false): boolean {
  if (itemPath === '/') return pathname === '/';
  if (exact) return pathname === itemPath;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function findActiveSettingsItem<T extends { path: string }>(items: T[], pathname: string): T | undefined {
  return items
    .filter((item) => isPathActive(pathname, item.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

export const CLUB_OWNER_NAV = [
  { id: 'planos', label: 'Planos', path: '/configuracoes/clube' },
  { id: 'pix', label: 'Pix', path: '/configuracoes/clube/pix' },
  { id: 'assinantes', label: 'Assinantes', path: '/clube/assinantes' },
] as const;

export const NAVIGATION_ITEMS = [
  { name: 'Início', icon: LayoutDashboard, path: '/', ownerOnly: false, group: 'Operação' },
  { name: 'Agenda', icon: Calendar, path: '/agenda', ownerOnly: false, group: 'Operação' },
  { name: 'Fila Digital', icon: Clock, path: '/fila', ownerOnly: false, group: 'Operação' },
  { name: 'Clientes', icon: Users, path: '/clientes', ownerOnly: true, group: 'Operação' },
  { name: 'Produtos', icon: Package, path: '/produtos', ownerOnly: false, group: 'Operação' },
  { name: 'Financeiro', icon: DollarSign, path: '/financeiro', ownerOnly: true, group: 'Crescimento' },
  { name: 'Análises', icon: TrendingUp, path: '/insights', ownerOnly: true, group: 'Crescimento' },
  { name: 'Clube', icon: Crown, path: '/clube/assinantes', ownerOnly: true, group: 'Crescimento' },
  { name: 'Ajustes', icon: Settings, path: '/configuracoes', ownerOnly: true, group: 'Sistema' },
];

export interface SettingsItem {
  label: string;
  path: string;
  icon: LucideIcon;
  devOnly?: boolean;
  group: 'Negócio' | 'Financeiro' | 'Conta' | 'Sistema';
}

export const SETTINGS_ITEMS: SettingsItem[] = [
  { label: 'Geral', path: '/configuracoes/geral', icon: Settings, group: 'Negócio' },
  { label: 'Agendamento', path: '/configuracoes/agendamento', icon: Calendar, group: 'Negócio' },
  { label: 'Equipe e Comissões', path: '/configuracoes/equipe', icon: Users, group: 'Negócio' },
  { label: 'Serviços', path: '/configuracoes/servicos', icon: Package, group: 'Negócio' },
  { label: 'Clube', path: '/configuracoes/clube', icon: Crown, group: 'Negócio' },
  { label: 'Plano AgendiX', path: '/configuracoes/assinatura', icon: CreditCard, group: 'Financeiro' },
  { label: 'Notificações', path: '/configuracoes/notificacoes', icon: Bell, group: 'Conta' },
  { label: 'Segurança', path: '/configuracoes/seguranca', icon: Shield, group: 'Conta' },
  { label: 'Preview UI', path: '/configuracoes/ui-preview', icon: ClipboardList, devOnly: true, group: 'Sistema' },
  { label: 'Auditoria', path: '/configuracoes/auditoria', icon: ShieldAlert, devOnly: true, group: 'Sistema' },
  { label: 'Lixeira', path: '/configuracoes/lixeira', icon: Trash2, devOnly: true, group: 'Sistema' },
];
export const PREDEFINED_SERVICES = {
  barber: [
    { name: 'Corte Masculino', price: 40, duration_minutes: 30, category: 'Geral' },
    { name: 'Barba', price: 30, duration_minutes: 20, category: 'Geral' },
    { name: 'Combo Corte + Barba', price: 60, duration_minutes: 50, category: 'Geral' },
    { name: 'Acabamento/Pezinho', price: 15, duration_minutes: 15, category: 'Geral' },
    { name: 'Sobrancelha', price: 15, duration_minutes: 15, category: 'Geral' },
    { name: 'Pigmentação', price: 35, duration_minutes: 30, category: 'Geral' }
  ],
  beauty: [
    { name: 'Corte Feminino', price: 80, duration_minutes: 60, category: 'Cabelo' },
    { name: 'Escova', price: 60, duration_minutes: 40, category: 'Cabelo' },
    { name: 'Manicure', price: 35, duration_minutes: 45, category: 'Unhas' },
    { name: 'Pedicure', price: 40, duration_minutes: 45, category: 'Unhas' },
    { name: 'Coloração', price: 120, duration_minutes: 90, category: 'Cabelo' },
    { name: 'Design de Sobrancelha', price: 40, duration_minutes: 30, category: 'Estética' }
  ]
};
