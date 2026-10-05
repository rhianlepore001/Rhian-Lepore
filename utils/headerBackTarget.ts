/**
 * Destino da seta "voltar" do Header no celular.
 * Sub-páginas do Financeiro (ex.: Performance) voltam ao Financeiro,
 * não à Home — evita "despejar" o gestor fora do fluxo.
 */
export interface HeaderBackTarget {
  to: string;
  label: string;
}

export function resolveHeaderBackTarget(pathname: string): HeaderBackTarget {
  if (pathname.startsWith('/financeiro/')) {
    // Performance (e futuras sub-rotas) entram pelo fluxo de Pagamentos/comissões.
    return { to: '/financeiro?tab=commissions', label: 'Voltar ao Financeiro' };
  }
  // Meus resultados é destino primário do staff na nav; sem histórico de finance,
  // a Home continua sendo o fallback seguro.
  if (pathname === '/meus-insights') {
    return { to: '/', label: 'Voltar ao início' };
  }
  return { to: '/', label: 'Voltar ao início' };
}
