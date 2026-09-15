import { DEMO_MARKER, TIME_ZONE } from './constants.mjs';
import { resolveDemoEmail, resolveDemoSlug } from './safety.mjs';

const WEEKDAY_HOURS = {
  isOpen: true,
  blocks: [
    { start: '09:00', end: '12:30' },
    { start: '13:30', end: '19:00' },
  ],
};

const SATURDAY_HOURS = {
  isOpen: true,
  blocks: [{ start: '09:00', end: '14:00' }],
};

const CLOSED = { isOpen: false, blocks: [] };

export const BUSINESS_HOURS = Object.freeze({
  mon: WEEKDAY_HOURS,
  tue: WEEKDAY_HOURS,
  wed: WEEKDAY_HOURS,
  thu: WEEKDAY_HOURS,
  fri: WEEKDAY_HOURS,
  sat: SATURDAY_HOURS,
  sun: CLOSED,
});

const BARBER_CATEGORIES = [
  { name: 'Cabelo', display_order: 0 },
  { name: 'Barba', display_order: 1 },
  { name: 'Combo', display_order: 2 },
];

const BEAUTY_CATEGORIES = [
  { name: 'Cabelo', display_order: 0 },
  { name: 'Estética', display_order: 1 },
  { name: 'Unhas', display_order: 2 },
];

const BARBER_SERVICES = [
  { category: 'Cabelo', name: 'Corte masculino', price: 55, duration: 30, description: 'Máquina + tesoura' },
  { category: 'Barba', name: 'Barba completa', price: 40, duration: 30, description: 'Toalha quente e navalha' },
  { category: 'Combo', name: 'Corte + barba', price: 85, duration: 60, description: 'O combo mais pedido' },
  { category: 'Cabelo', name: 'Sobrancelha', price: 20, duration: 15, description: 'Acabamento na tesoura' },
  { category: 'Cabelo', name: 'Pigmentação', price: 90, duration: 45, description: 'Disfarce com pigmento' },
  { category: 'Combo', name: 'Ritual VIP', price: 140, duration: 75, description: 'Corte, barba e hidratação' },
];

const BEAUTY_SERVICES = [
  { category: 'Cabelo', name: 'Corte feminino', price: 120, duration: 45, description: 'Corte e finalização' },
  { category: 'Cabelo', name: 'Escova', price: 80, duration: 40, description: 'Escova modelada' },
  { category: 'Cabelo', name: 'Coloração', price: 220, duration: 90, description: 'Cor e tratamento' },
  { category: 'Estética', name: 'Design de sobrancelha', price: 45, duration: 20, description: 'Design com henna' },
  { category: 'Estética', name: 'Hidratação', price: 95, duration: 40, description: 'Cronograma capilar' },
  { category: 'Unhas', name: 'Manicure completa', price: 55, duration: 40, description: 'Corte, lixa e esmalte' },
];

const BARBER_PRODUCTS = [
  { name: 'Pomada modeladora', sale_price: 42, cost_price: 18, stock_quantity: 24, min_stock_quantity: 4 },
  { name: 'Óleo de barba', sale_price: 38, cost_price: 16, stock_quantity: 18, min_stock_quantity: 3 },
  { name: 'Shampoo detox', sale_price: 49, cost_price: 22, stock_quantity: 12, min_stock_quantity: 3 },
];

const BEAUTY_PRODUCTS = [
  { name: 'Sérum reparador', sale_price: 89, cost_price: 38, stock_quantity: 16, min_stock_quantity: 3 },
  { name: 'Máscara hidratação', sale_price: 72, cost_price: 30, stock_quantity: 14, min_stock_quantity: 3 },
  { name: 'Leave-in protetor', sale_price: 54, cost_price: 22, stock_quantity: 20, min_stock_quantity: 4 },
];

const BARBER_TEAM = [
  { name: 'Rafael Mendes', role: 'Dono', bio: 'Especialista em clássico e degradê', slug: 'demo-cf-rafael-mendes', is_owner: true, commission_rate: 0 },
  { name: 'Lucas Oliveira', role: 'Profissional', bio: 'Barba e pigmentação', slug: 'demo-cf-lucas-oliveira', is_owner: false, commission_rate: 40 },
  { name: 'Diego Costa', role: 'Profissional', bio: 'Cortes modernos', slug: 'demo-cf-diego-costa', is_owner: false, commission_rate: 40 },
];

const BEAUTY_TEAM = [
  { name: 'Camila Ferreira', role: 'Dona', bio: 'Colorista e cortes', slug: 'demo-lb-camila-ferreira', is_owner: true, commission_rate: 0 },
  { name: 'Juliana Alves', role: 'Profissional', bio: 'Escova e hidratação', slug: 'demo-lb-juliana-alves', is_owner: false, commission_rate: 40 },
  { name: 'Beatriz Rocha', role: 'Profissional', bio: 'Sobrancelha e unhas', slug: 'demo-lb-beatriz-rocha', is_owner: false, commission_rate: 40 },
];

const BARBER_CLIENTS = [
  { name: 'João Pedro Nunes', phone: '(11) 97000-1001', email: 'joao.pedro.nunes@example.com' },
  { name: 'Marcos Vinícius Lima', phone: '(11) 97000-1002', email: 'marcos.lima@example.com' },
  { name: 'André Souza', phone: '(11) 97000-1003', email: 'andre.souza@example.com' },
  { name: 'Felipe Barbosa', phone: '(11) 97000-1004', email: 'felipe.barbosa@example.com' },
  { name: 'Thiago Rocha', phone: '(11) 97000-1005', email: 'thiago.rocha@example.com' },
  { name: 'Bruno Carvalho', phone: '(11) 97000-1006', email: 'bruno.carvalho@example.com' },
  { name: 'Ricardo Almeida', phone: '(11) 97000-1007', email: 'ricardo.almeida@example.com' },
  { name: 'Gustavo Pereira', phone: '(11) 97000-1008', email: 'gustavo.pereira@example.com' },
  { name: 'Henrique Dias', phone: '(11) 97000-1009', email: 'henrique.dias@example.com' },
  { name: 'Paulo Henrique Melo', phone: '(11) 97000-1010', email: 'paulo.melo@example.com' },
  { name: 'Caio Martins', phone: '(11) 97000-1011', email: 'caio.martins@example.com' },
  { name: 'Leandro Gomes', phone: '(11) 97000-1012', email: 'leandro.gomes@example.com' },
  { name: 'Renato Azevedo', phone: '(11) 97000-1013', email: 'renato.azevedo@example.com' },
  { name: 'Igor Fernandes', phone: '(11) 97000-1014', email: 'igor.fernandes@example.com' },
  { name: 'Samuel Teixeira', phone: '(11) 97000-1015', email: 'samuel.teixeira@example.com' },
  { name: 'Vinícius Castro', phone: '(11) 97000-1016', email: 'vinicius.castro@example.com' },
  { name: 'Daniel Moreira', phone: '(11) 97000-1017', email: 'daniel.moreira@example.com' },
  { name: 'Eduardo Pinto', phone: '(11) 97000-1018', email: 'eduardo.pinto@example.com' },
];

const BEAUTY_CLIENTS = [
  { name: 'Ana Clara Mendes', phone: '(11) 97100-1001', email: 'ana.clara.mendes@example.com' },
  { name: 'Mariana Lopes', phone: '(11) 97100-1002', email: 'mariana.lopes@example.com' },
  { name: 'Beatriz Cunha', phone: '(11) 97100-1003', email: 'beatriz.cunha@example.com' },
  { name: 'Larissa Duarte', phone: '(11) 97100-1004', email: 'larissa.duarte@example.com' },
  { name: 'Patrícia Nogueira', phone: '(11) 97100-1005', email: 'patricia.nogueira@example.com' },
  { name: 'Camila Borges', phone: '(11) 97100-1006', email: 'camila.borges@example.com' },
  { name: 'Juliana Pires', phone: '(11) 97100-1007', email: 'juliana.pires@example.com' },
  { name: 'Fernanda Ribeiro', phone: '(11) 97100-1008', email: 'fernanda.ribeiro@example.com' },
  { name: 'Aline Cardoso', phone: '(11) 97100-1009', email: 'aline.cardoso@example.com' },
  { name: 'Gabriela Freitas', phone: '(11) 97100-1010', email: 'gabriela.freitas@example.com' },
  { name: 'Isabela Monteiro', phone: '(11) 97100-1011', email: 'isabela.monteiro@example.com' },
  { name: 'Natália Campos', phone: '(11) 97100-1012', email: 'natalia.campos@example.com' },
  { name: 'Priscila Vieira', phone: '(11) 97100-1013', email: 'priscila.vieira@example.com' },
  { name: 'Renata Farias', phone: '(11) 97100-1014', email: 'renata.farias@example.com' },
  { name: 'Sabrina Moura', phone: '(11) 97100-1015', email: 'sabrina.moura@example.com' },
  { name: 'Tatiane Correia', phone: '(11) 97100-1016', email: 'tatiane.correia@example.com' },
  { name: 'Vanessa Prado', phone: '(11) 97100-1017', email: 'vanessa.prado@example.com' },
  { name: 'Yasmin Barros', phone: '(11) 97100-1018', email: 'yasmin.barros@example.com' },
];

const BOOKING_CUSTOMERS_BARBER = [
  { name: 'Otávio Ramos', phone: '(11) 97200-2001' },
  { name: 'Murilo Batista', phone: '(11) 97200-2002' },
  { name: 'César Antunes', phone: '(11) 97200-2003' },
];

const BOOKING_CUSTOMERS_BEAUTY = [
  { name: 'Helena Vasconcelos', phone: '(11) 97300-2001' },
  { name: 'Lorena Guimarães', phone: '(11) 97300-2002' },
  { name: 'Débora Siqueira', phone: '(11) 97300-2003' },
];

export function decorateClient(client, index) {
  const birthYear = 1982 + (index % 18);
  const month = String((index % 12) + 1).padStart(2, '0');
  const day = String((index % 27) + 1).padStart(2, '0');
  return {
    ...client,
    notes: `${DEMO_MARKER} cliente fictício para prints`,
    source: 'manual',
    is_active: true,
    loyalty_tier: index % 7 === 0 ? 'Gold' : index % 3 === 0 ? 'Silver' : 'Bronze',
    total_visits: 2 + (index % 12),
    birth_date: `${birthYear}-${month}-${day}`,
  };
}

export function getTenantBlueprint(kind, env = process.env) {
  const isBarber = kind === 'barber';
  return {
    kind,
    email: resolveDemoEmail(kind, env),
    slug: resolveDemoSlug(kind, env),
    userType: isBarber ? 'barber' : 'beauty',
    region: 'BR',
    fullName: isBarber ? 'Rafael Mendes' : 'Camila Ferreira',
    businessName: isBarber ? 'Barbearia Corte Fino' : 'Studio Luna Belle',
    phone: isBarber ? '(11) 3090-4401' : '(11) 3090-5502',
    address: isBarber
      ? 'Rua Augusta, 1200 — Consolação, São Paulo (endereço fictício)'
      : 'Rua Oscar Freire, 450 — Jardins, São Paulo (endereço fictício)',
    instagram: isBarber ? 'barbearia.cortefino' : 'studio.lunabelle',
    monthlyGoal: isBarber ? 18000 : 22000,
    dailyGoal: isBarber ? 800 : 1000,
    pixEmail: isBarber ? 'pix.agendix.demo.barber@example.com' : 'pix.agendix.demo.beauty@example.com',
    pixHolder: isBarber ? 'BARBEARIA CORTE FINO DEMO' : 'STUDIO LUNA BELLE DEMO',
    categories: isBarber ? BARBER_CATEGORIES : BEAUTY_CATEGORIES,
    services: isBarber ? BARBER_SERVICES : BEAUTY_SERVICES,
    products: isBarber ? BARBER_PRODUCTS : BEAUTY_PRODUCTS,
    team: isBarber ? BARBER_TEAM : BEAUTY_TEAM,
    clients: (isBarber ? BARBER_CLIENTS : BEAUTY_CLIENTS).map(decorateClient),
    bookingCustomers: isBarber ? BOOKING_CUSTOMERS_BARBER : BOOKING_CUSTOMERS_BEAUTY,
    club: isBarber
      ? {
          activeName: 'Clube Corte Livre',
          inactiveName: 'Clube Barba (pausado)',
          priceCents: 8990,
          description: `${DEMO_MARKER} 4 cortes/mês — plano fictício`,
        }
      : {
          activeName: 'Clube Glow',
          inactiveName: 'Clube Escova (pausado)',
          priceCents: 12990,
          description: `${DEMO_MARKER} 3 visitas/mês — plano fictício`,
        },
    hours: BUSINESS_HOURS,
    timeZone: TIME_ZONE,
  };
}

export function listBlueprints(tenantKeys, env = process.env) {
  return tenantKeys.map((kind) => getTenantBlueprint(kind, env));
}
