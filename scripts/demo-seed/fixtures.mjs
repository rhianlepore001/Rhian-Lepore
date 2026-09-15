/**
 * Dois tenants fictícios (Brasil) para prints da landing.
 * Nomes, telefones e Pix são inventados — não usar PII real.
 */

import {
  BUSINESS_PREFIX,
  DEFAULT_EMAILS,
  MARKER,
  note,
  weekdayOpenHours,
} from './lib.mjs';

function demoName(name) {
  return `${BUSINESS_PREFIX} ${name}`;
}

export function buildTenantSpecs(emails = DEFAULT_EMAILS) {
  return {
    barber: {
      key: 'barber',
      email: emails.barber,
      userType: 'barber',
      region: 'BR',
      fullName: 'Rafael Monteiro',
      businessName: demoName('Barbearia Corte Fino'),
      slug: 'demo-barbearia-corte-fino',
      phone: '(11) 97000-1000',
      address: 'Rua Harmonia, 412 — Vila Madalena, São Paulo',
      instagram: 'democortefino',
      monthlyGoal: 18000,
      dailyGoal: 750,
      pix: {
        pix_key_type: 'email',
        pix_key_value: 'pix.cortefino@agendix.demo',
        pix_holder_name: 'DEMO Barbearia Corte Fino',
        pix_merchant_city: 'SAO PAULO',
      },
      categories: [
        { name: 'Cabelo', order: 1 },
        { name: 'Barba', order: 2 },
        { name: 'Combo', order: 3 },
      ],
      services: [
        { name: 'Corte masculino', category: 'Cabelo', price: 55, duration: 30, description: note('corte máquina + tesoura') },
        { name: 'Barba completa', category: 'Barba', price: 40, duration: 30, description: note('toalha quente') },
        { name: 'Corte + barba', category: 'Combo', price: 85, duration: 60, description: note('combo mais pedido') },
        { name: 'Sobrancelha', category: 'Cabelo', price: 25, duration: 15, description: note('navalha') },
        { name: 'Pigmentação', category: 'Cabelo', price: 90, duration: 45, description: note('disfarce') },
        { name: 'Hidratação capilar', category: 'Cabelo', price: 45, duration: 30, description: note('tratamento') },
      ],
      staff: [
        { name: 'Rafael Monteiro', role: 'owner', isOwner: true, slug: 'demo-corte-fino-rafael', bio: note('dono e barbeiro'), commission: 0 },
        { name: 'Lucas Andrade', role: 'barber', isOwner: false, slug: 'demo-corte-fino-lucas', bio: note('cortes modernos'), commission: 40 },
        { name: 'Caio Ferreira', role: 'barber', isOwner: false, slug: 'demo-corte-fino-caio', bio: note('barba e pigmentação'), commission: 40 },
      ],
      clients: [
        { name: 'Thiago Azevedo', phone: '(11) 97000-1001', email: 'thiago.azevedo@agendix.demo', vip: true },
        { name: 'Bruno Pacheco', phone: '(11) 97000-1002', email: 'bruno.pacheco@agendix.demo' },
        { name: 'Felipe Cardoso', phone: '(11) 97000-1003', email: 'felipe.cardoso@agendix.demo' },
        { name: 'André Melo', phone: '(11) 97000-1004', email: 'andre.melo@agendix.demo' },
        { name: 'Diego Fontes', phone: '(11) 97000-1005', email: 'diego.fontes@agendix.demo' },
        { name: 'Marcelo Vieira', phone: '(11) 97000-1006', email: 'marcelo.vieira@agendix.demo' },
        { name: 'Iago Nascimento', phone: '(11) 97000-1007', email: 'iago.nascimento@agendix.demo' },
        { name: 'Renata Prado', phone: '(11) 97000-1008', email: 'renata.prado@agendix.demo', vip: true },
        { name: 'Paulo Henrique', phone: '(11) 97000-1009', email: 'paulo.henrique@agendix.demo' },
        { name: 'Gustavo Tavares', phone: '(11) 97000-1010', email: 'gustavo.tavares@agendix.demo' },
        { name: 'Henrique Bastos', phone: '(11) 97000-1011', email: 'henrique.bastos@agendix.demo' },
        { name: 'Otávio Lima', phone: '(11) 97000-1012', email: 'otavio.lima@agendix.demo' },
      ],
      products: [
        { name: 'Pomada modeladora', sale: 42, cost: 18, stock: 24 },
        { name: 'Óleo para barba', sale: 38, cost: 14, stock: 18 },
        { name: 'Shampoo detox', sale: 49, cost: 20, stock: 12 },
      ],
      club: {
        active: { name: 'Clube Corte Livre', priceCents: 9900, badge: 'gold', limit: 4 },
        inactive: { name: 'Clube Barba Extra', priceCents: 5900, badge: 'silver', limit: 2 },
      },
      expenses: [
        { description: 'Aluguel da loja', amount: 3200, category: 'aluguel' },
        { description: 'Produtos de higiene', amount: 480, category: 'insumos' },
        { description: 'Conta de luz', amount: 390, category: 'utilidades' },
      ],
    },
    beauty: {
      key: 'beauty',
      email: emails.beauty,
      userType: 'beauty',
      region: 'BR',
      fullName: 'Camila Nogueira',
      businessName: demoName('Studio Aurora'),
      slug: 'demo-studio-aurora',
      phone: '(11) 97000-2000',
      address: 'Rua Oscar Freire, 890 — Jardins, São Paulo',
      instagram: 'demostudioaurora',
      monthlyGoal: 22000,
      dailyGoal: 900,
      pix: {
        pix_key_type: 'email',
        pix_key_value: 'pix.aurora@agendix.demo',
        pix_holder_name: 'DEMO Studio Aurora',
        pix_merchant_city: 'SAO PAULO',
      },
      categories: [
        { name: 'Cabelo', order: 1 },
        { name: 'Estética', order: 2 },
        { name: 'Unhas', order: 3 },
      ],
      services: [
        { name: 'Corte feminino', category: 'Cabelo', price: 90, duration: 45, description: note('corte + finalização') },
        { name: 'Coloração', category: 'Cabelo', price: 180, duration: 90, description: note('tintura') },
        { name: 'Escova modelada', category: 'Cabelo', price: 70, duration: 40, description: note('escova') },
        { name: 'Design de sobrancelha', category: 'Estética', price: 45, duration: 30, description: note('design') },
        { name: 'Manicure completa', category: 'Unhas', price: 50, duration: 45, description: note('esmaltação') },
        { name: 'Hidratação', category: 'Cabelo', price: 85, duration: 50, description: note('tratamento') },
      ],
      staff: [
        { name: 'Camila Nogueira', role: 'owner', isOwner: true, slug: 'demo-aurora-camila', bio: note('dona e colorista'), commission: 0 },
        { name: 'Marina Alves', role: 'beauty', isOwner: false, slug: 'demo-aurora-marina', bio: note('cortes e escova'), commission: 40 },
        { name: 'Bia Rocha', role: 'beauty', isOwner: false, slug: 'demo-aurora-bia', bio: note('unhas e estética'), commission: 35 },
      ],
      clients: [
        { name: 'Juliana Freitas', phone: '(11) 97000-2001', email: 'juliana.freitas@agendix.demo', vip: true },
        { name: 'Amanda Ribeiro', phone: '(11) 97000-2002', email: 'amanda.ribeiro@agendix.demo' },
        { name: 'Larissa Campos', phone: '(11) 97000-2003', email: 'larissa.campos@agendix.demo' },
        { name: 'Beatriz Moura', phone: '(11) 97000-2004', email: 'beatriz.moura@agendix.demo' },
        { name: 'Fernanda Salles', phone: '(11) 97000-2005', email: 'fernanda.salles@agendix.demo' },
        { name: 'Carolina Dias', phone: '(11) 97000-2006', email: 'carolina.dias@agendix.demo' },
        { name: 'Patrícia Gomes', phone: '(11) 97000-2007', email: 'patricia.gomes@agendix.demo', vip: true },
        { name: 'Vanessa Rocha', phone: '(11) 97000-2008', email: 'vanessa.rocha@agendix.demo' },
        { name: 'Isabela Martins', phone: '(11) 97000-2009', email: 'isabela.martins@agendix.demo' },
        { name: 'Sofia Teixeira', phone: '(11) 97000-2010', email: 'sofia.teixeira@agendix.demo' },
        { name: 'Helena Barros', phone: '(11) 97000-2011', email: 'helena.barros@agendix.demo' },
        { name: 'Lívia Castro', phone: '(11) 97000-2012', email: 'livia.castro@agendix.demo' },
      ],
      products: [
        { name: 'Leave-in hidratante', sale: 62, cost: 28, stock: 16 },
        { name: 'Esmalte vermelho', sale: 28, cost: 9, stock: 30 },
        { name: 'Óleo capilar', sale: 54, cost: 22, stock: 14 },
      ],
      club: {
        active: { name: 'Clube Glow Mensal', priceCents: 12900, badge: 'gold', limit: 3 },
        inactive: { name: 'Clube Unhas', priceCents: 7900, badge: 'bronze', limit: 2 },
      },
      expenses: [
        { description: 'Aluguel do studio', amount: 4100, category: 'aluguel' },
        { description: 'Coloração e insumos', amount: 760, category: 'insumos' },
        { description: 'Conta de luz', amount: 420, category: 'utilidades' },
      ],
    },
  };
}

export function hoursPayload() {
  return weekdayOpenHours();
}

export function assertFixtureCoverage(specs) {
  const issues = [];
  for (const spec of Object.values(specs)) {
    if (!spec.slug?.startsWith('demo-')) issues.push(`${spec.key}: slug deve começar com demo-`);
    if (!spec.businessName?.startsWith(BUSINESS_PREFIX)) issues.push(`${spec.key}: businessName precisa do prefixo DEMO`);
    if (spec.services.length < 4) issues.push(`${spec.key}: poucos serviços`);
    if (spec.staff.length < 3) issues.push(`${spec.key}: equipe incompleta`);
    if (spec.clients.length < 8) issues.push(`${spec.key}: CRM raso`);
    if (!spec.club?.active) issues.push(`${spec.key}: falta plano de clube`);
    if ((spec.products || []).length < 3) issues.push(`${spec.key}: catálogo raso`);
    if (!spec.pix?.pix_key_value?.includes('agendix.demo')) issues.push(`${spec.key}: Pix precisa ser fictício`);
  }
  return issues;
}

export { MARKER, note };
