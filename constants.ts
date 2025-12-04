
import { Appointment, Client, FinanceRecord } from './types';
import { LayoutDashboard, Calendar, Users, TrendingUp, FileText, Settings, DollarSign, LogOut, Package } from 'lucide-react';

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
];
