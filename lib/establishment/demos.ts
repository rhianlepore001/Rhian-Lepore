import { defaultConfig, type SiteConfig, type SiteData } from './model';

const demoId = (beauty: boolean, n: number) => `d0000000-0000-4000-${beauty ? '8002' : '8001'}-${String(n).padStart(12, '0')}`;

export const DEMO_SLUGS = ['demo-corte-fino', 'demo-studio-aurora', 'demo-barbearia-do-bairro'] as const;

/** Casa fictícia com cadastro mínimo e sem extras: prova de robustez do template. */
function minimalDemo(): { data: SiteData; config: SiteConfig } {
  const data: SiteData = {
    id: 'demo-minimal', slug: 'demo-barbearia-do-bairro', name: 'Barbearia do Bairro', kind: 'barber', region: 'BR', demo: true,
    cover: '/presenca/rhian/barber-portrait.webp', address: 'Rua Exemplo, 100 — Vila Mariana, São Paulo',
    hours: [{ day: 'Terça a sábado', hours: '10h às 19h' }, { day: 'Domingo e segunda', hours: 'Fechado' }],
    services: [
      { id: 'd0000000-0000-4000-8003-000000000001', name: 'Corte', includes: [], duration: 40, price: 40, image: '/demo/barbearia/galeria-06.webp' },
      { id: 'd0000000-0000-4000-8003-000000000002', name: 'Barba', includes: [], duration: 30, price: 30 },
    ],
    team: [{ id: 'd0000000-0000-4000-8003-000000000010', name: 'Zé Almeida' }],
    gallery: [], reviews: [], reviewCount: 0,
  };
  return {
    data,
    config: {
      ...defaultConfig(data),
      cover: '/presenca/rhian/barber-portrait.webp',
      photoPosition: { x: 50, y: 18 },
      headline: 'Barbearia na Vila Mariana',
      about: 'Corte e barba com hora marcada, sem fila.',
    },
  };
}

export function getDemoSite(slug: string): { data: SiteData; config: SiteConfig } | null {
  if (slug === 'demo-barbearia-do-bairro') return minimalDemo();
  if (!['demo-corte-fino', 'demo-studio-aurora'].includes(slug)) return null;
  const beauty = slug === 'demo-studio-aurora';
  const folder = beauty ? 'salao' : 'barbearia';
  const photo = (file: string) => `/demo/${folder}/${file}.webp`;
  const data: SiteData = {
    id: beauty ? 'demo-beauty' : 'demo-barber', slug,
    name: beauty ? 'Studio Aurora' : 'Corte Fino', kind: beauty ? 'beauty' : 'barber', region: 'BR', demo: true,
    logo: beauty ? '/presenca/demo-logo-salon.svg' : '/presenca/demo-logo-barber.svg',
    cover: beauty ? '/presenca/rhian/salon-hero.webp' : '/presenca/rhian/barber-hero.webp',
    phone: beauty ? '+55 (11) 3032-8810' : '+55 (11) 3062-4190',
    instagram: beauty ? '@studioaurora.sp' : '@cortefino',
    address: beauty ? 'Rua dos Pinheiros, 870 — Pinheiros, São Paulo' : 'Rua Fradique Coutinho, 420 — Pinheiros, São Paulo',
    hours: [{ day: 'Segunda a sexta', hours: '09h às 20h' }, { day: 'Sábado', hours: '09h às 18h' }, { day: 'Domingo', hours: 'Fechado' }],
    services: beauty ? [
      { id: demoId(true, 20), name: 'Corte feminino', category: 'Corte', description: 'Um corte que respeita a textura do seu cabelo e acompanha o seu dia a dia. A gente conversa, entende e só então corta.', includes: ['Conversa sobre o seu cabelo', 'Lavagem e corte personalizado', 'Finalização e dicas de cuidado'], audience: 'Para renovar o visual sem abrir mão de ser você.', duration: 60, price: 120, image: photo('servico-corte-feminino') },
      { id: demoId(true, 23), name: 'Mechas e luzes', category: 'Cor e mechas', description: 'Luminosidade na medida certa, com transições suaves e um plano de cuidado para manter os fios saudáveis.', includes: ['Diagnóstico e teste de mecha', 'Técnica de iluminação personalizada', 'Tonalização e finalização'], audience: 'Para quem quer iluminar os fios com um resultado natural.', duration: 120, price: 320, priceFrom: true, priceNote: 'O valor varia conforme comprimento e técnica. Confirmamos antes de começar.', image: '/presenca/rhian/salon-balayage.webp' },
      { id: demoId(true, 24), name: 'Hidratação', category: 'Tratamento', description: 'Cuidado para devolver maciez, brilho e movimento aos fios. O tratamento é escolhido depois de avaliar seu cabelo.', includes: ['Avaliação dos fios', 'Tratamento de hidratação', 'Finalização'], audience: 'Para cabelos ressecados ou que precisam de uma pausa da química.', duration: 45, price: 90, image: photo('servico-hidratacao') },
    ] : [
      { id: demoId(false, 20), name: 'Corte masculino', category: 'Cabelo', description: 'Do degradê ao clássico na tesoura. Um corte pensado para o seu rosto, seu cabelo e o jeito que você gosta de usar.', includes: ['Conversa sobre o corte', 'Corte na máquina e na tesoura', 'Acabamento e finalização'], audience: 'Para manter o corte em dia ou encontrar um novo estilo.', duration: 30, price: 45, image: photo('galeria-06') },
      { id: demoId(false, 22), name: 'Corte + barba', category: 'Combo', description: 'O cuidado completo, no seu tempo. Corte com acabamento preciso e barba desenhada para valorizar o seu rosto.', includes: ['Corte personalizado', 'Barba com toalha quente', 'Acabamento na navalha e balm'], audience: 'Para sair com cabelo e barba alinhados em uma única visita.', duration: 60, price: 75, image: '/presenca/rhian/barber-fade.webp' },
      { id: demoId(false, 21), name: 'Barba', category: 'Barba', description: 'Desenho, alinhamento e cuidado com a pele. Toalha quente para preparar, navalha para definir e balm para finalizar.', includes: ['Desenho da barba', 'Toalha quente e navalha', 'Hidratação com balm'], audience: 'Para quem gosta de uma barba bem cuidada, curta ou cheia.', duration: 30, price: 35, image: photo('servico-barba') },
    ],
    clubPlans: [],
    team: (beauty ? ['Marina Costa', 'Luiza Martins'] : ['Rafael Costa', 'Lucas Mendes']).map((name, i) => ({
      id: demoId(beauty, 30 + i),
      name,
      image: beauty
        ? ['/presenca/rhian/salon-portrait-marina.webp', '/presenca/rhian/salon-portrait-luiza.webp'][i]
        : ['/presenca/rhian/barber-portrait.webp', '/presenca/rhian/barber-portrait-lucas.webp'][i],
      bio: beauty ? ['Cortes e movimento natural', 'Cor, mechas e iluminação'][i] : ['Degradê navalhado e visagismo', 'Corte na tesoura e barboterapia'][i],
    })),
    gallery: beauty
      ? [
          { src: '/presenca/rhian/salon-balayage.webp', alt: 'Cor natural e iluminação suave — foto ilustrativa' },
          { src: photo('galeria-04'), alt: 'Ondas iluminadas com movimento natural — foto ilustrativa' },
          { src: photo('servico-hidratacao'), alt: 'Tratamento e brilho nos fios — foto ilustrativa' },
        ]
      : [
          { src: '/presenca/rhian/barber-fade.webp', alt: 'Atendimento e barba desenhada na navalha — foto ilustrativa' },
          { src: photo('galeria-06'), alt: 'Degradê limpo e acabamento da barba — foto ilustrativa' },
          { src: photo('galeria-08'), alt: 'Contorno preciso na navalha — foto ilustrativa' },
        ],
    rating: 4.9, reviewCount: beauty ? 128 : 214,
    reviews: [
      { id: 'demo-review-1', name: beauty ? 'Beatriz S.' : 'Bruno M.', rating: 5, comment: beauty ? 'A Marina perguntou como eu arrumo o cabelo em casa e cortou pensando nisso. É o único lugar de onde saio sabendo cuidar no dia seguinte.' : 'Marquei com o Rafael às 18h, depois do trabalho. Entrou na hora e o degradê ficou exatamente no comprimento que eu pedi.' },
      { id: 'demo-review-2', name: beauty ? 'Clara F.' : 'André R.', rating: 5, comment: beauty ? 'Nas mechas, o valor só fechou depois do teste de mecha. O loiro ficou natural e não ressecou os fios.' : 'Barba com toalha quente e navalha, sem pressa. Saí no horário certo.' },
      { id: 'demo-review-3', name: beauty ? 'Juliana A.' : 'Felipe C.', rating: 5, comment: beauty ? 'Na primeira visita ganhei a hidratação junto com o corte, exatamente como estava no site.' : 'Cadeira reservada, sem fila. O Lucas fez o corte na tesoura em meia hora com acabamento limpo.' },
    ],
  };
  const config: SiteConfig = {
    ...defaultConfig(data),
    preset: beauty ? 'salon' : 'urban',
    style: beauty ? 'light' : 'dark',
    background: beauty ? '#FFFFFF' : '#09090B',
    accent: beauty ? '#3F4E41' : '#C89B79',
    headline: beauty ? 'Salão em Pinheiros' : 'Barbearia em Pinheiros',
    cover: beauty ? '/presenca/rhian/salon-hero.webp' : '/presenca/rhian/barber-hero.webp',
    photoFocus: beauty ? 'center' : 'center',
    photoPosition: beauty ? { x: 52, y: 50 } : { x: 52, y: 42 },
    about: beauty
      ? 'Cor natural, corte com movimento e cuidado para os fios.'
      : 'Corte na tesoura, degradê e barba na navalha com hora marcada.',
    offer: {
      enabled: true,
      kind: 'first_visit',
      title: beauty ? '1ª visita: hidratação de presente no corte ou cor' : '1ª visita: 15% de desconto em qualquer corte',
      condition: beauty ? 'Ao agendar corte ou coloração.' : 'Válido para novos clientes de terça a quinta-feira em qualquer corte ou combo.',
      serviceId: data.services[beauty ? 0 : 1].id,
    },
    contact: {
      addressNote: beauty ? 'Próximo à estação Faria Lima' : 'A 3 minutos do metrô Fradique Coutinho',
    },
    differences: [],
    beforeAfter: beauty
      ? [{ before: '/presenca/rhian/salon-before.webp', after: '/presenca/rhian/salon-after.webp', caption: '' }]
      : [{ before: '/presenca/rhian/barber-before.webp', after: '/presenca/rhian/barber-after.webp', caption: '' }],
    faq: [],
  };
  return { data, config };
}
