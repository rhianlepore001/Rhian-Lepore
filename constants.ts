
import { Appointment, Client, FinanceRecord } from './types';
import { LayoutDashboard, Calendar, Users, TrendingUp, FileText, Settings, DollarSign, LogOut, Package, CreditCard } from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Agenda', icon: Calendar, path: '/agenda' },
  { name: 'Clientes CRM', icon: Users, path: '/clientes' },
  { name: 'Financeiro', icon: DollarSign, path: '/financeiro' },
  { name: 'Marketing', icon: TrendingUp, path: '/marketing' },
  { name: 'Relatórios', icon: FileText, path: '/relatorios' },
  { name: 'Ajustes', icon: Settings, path: '/configuracoes' },
];

export const SETTINGS_ITEMS = [
  { label: 'Geral', path: '/configuracoes/geral', icon: Settings },
  { label: 'Agendamento', path: '/configuracoes/agendamento', icon: Calendar },
  { label: 'Equipe', path: '/configuracoes/equipe', icon: Users },
  { label: 'Serviços', path: '/configuracoes/servicos', icon: Package },
  { label: 'Comissões', path: '/configuracoes/comissoes', icon: DollarSign },
  { label: 'Assinatura', path: '/configuracoes/assinatura', icon: CreditCard },
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
