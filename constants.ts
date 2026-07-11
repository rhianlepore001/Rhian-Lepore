
import { Appointment, Client, FinanceRecord } from './types';
import { LucideIcon, Bell, LayoutDashboard, Calendar, Users, Settings, DollarSign, Package, CreditCard, Clock, Shield, Trash2, ClipboardList, ShieldAlert, TrendingUp } from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/', ownerOnly: false, group: 'Operação' },
  { name: 'Agenda', icon: Calendar, path: '/agenda', ownerOnly: false, group: 'Operação' },
  { name: 'Fila Digital', icon: Clock, path: '/fila', ownerOnly: true, group: 'Operação' },
  { name: 'Clientes CRM', icon: Users, path: '/clientes', ownerOnly: false, group: 'Operação' },
  { name: 'Produtos', icon: Package, path: '/produtos', ownerOnly: false, group: 'Operação' },
  { name: 'Financeiro', icon: DollarSign, path: '/financeiro', ownerOnly: true, group: 'Crescimento' },
  { name: 'Insights', icon: TrendingUp, path: '/insights', ownerOnly: true, group: 'Crescimento' },
  { name: 'Ajustes', icon: Settings, path: '/configuracoes', ownerOnly: true, group: 'Sistema' },
];

export interface SettingsItem {
  label: string;
  path: string;
  icon: LucideIcon;
  devOnly?: boolean;
}

export const SETTINGS_ITEMS: SettingsItem[] = [
  { label: 'Geral', path: '/configuracoes/geral', icon: Settings },
  { label: 'Agendamento', path: '/configuracoes/agendamento', icon: Calendar },
  { label: 'Equipe', path: '/configuracoes/equipe', icon: Users },
  { label: 'Serviços', path: '/configuracoes/servicos', icon: Package },
  { label: 'Comissões', path: '/configuracoes/comissoes', icon: DollarSign },
  { label: 'Notificações', path: '/configuracoes/notificacoes', icon: Bell },
  { label: 'Assinatura', path: '/configuracoes/assinatura', icon: CreditCard },
  { label: 'Segurança', path: '/configuracoes/seguranca', icon: Shield },
  { label: 'Preview UI', path: '/configuracoes/ui-preview', icon: ClipboardList, devOnly: true },
  { label: 'Auditoria', path: '/configuracoes/auditoria', icon: ShieldAlert, devOnly: true },
  { label: 'Lixeira', path: '/configuracoes/lixeira', icon: Trash2, devOnly: true },
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
