import { defaultConfig, type SiteConfig, type SiteData } from './model';

const demoId = (beauty: boolean, n: number) => `d0000000-0000-4000-${beauty ? '8002' : '8001'}-${String(n).padStart(12, '0')}`;

export const DEMO_SLUGS = ['demo-corte-fino', 'demo-studio-aurora', 'demo-barbearia-do-bairro'] as const;

/** Casa fictícia com cadastro mínimo e fotos ruins de celular: prova de robustez do template. */
function minimalDemo(): { data: SiteData; config: SiteConfig } {
  const data: SiteData = {
    id: 'demo-minimal', slug: 'demo-barbearia-do-bairro', name: 'Barbearia do Bairro', kind: 'barber', region: 'BR', demo: true,
    cover: '/presenca/robustez/celular-escura.webp', address: 'Rua Exemplo, 100 — Vila Mariana, São Paulo',
    hours: [{ day: 'Terça a sábado', hours: '10h às 19h' }, { day: 'Domingo e segunda', hours: 'Fechado' }],
    services: [
      { id: 'd0000000-0000-4000-8003-000000000001', name: 'Corte', includes: [], duration: 40, price: 40, image: '/presenca/robustez/celular-baixa-resolucao.webp' },
      { id: 'd0000000-0000-4000-8003-000000000002', name: 'Barba', includes: [], duration: 30, price: 30 },
    ],
    team: [{ id: 'd0000000-0000-4000-8003-000000000010', name: 'Zé Almeida' }],
    gallery: [], reviews: [], reviewCount: 0,
  };
  return { data, config: { ...defaultConfig(data), headline: 'Barbearia na Vila Mariana.' } };
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
    cover: beauty ? '/presenca/rhian/salon-hero.jpg' : '/presenca/rhian/barber-hero.jpg',
    phone: beauty ? '+55 (11) 3032-8810' : '+55 (11) 3062-4190',
    instagram: beauty ? '@studioaurora.sp' : '@cortefino',
    address: beauty ? 'Rua dos Pinheiros, 870 — Pinheiros, São Paulo' : 'Rua Fradique Coutinho, 420 — Pinheiros, São Paulo',
    hours: [{ day: 'Segunda a sexta', hours: '09h às 20h' }, { day: 'Sábado', hours: '09h às 18h' }, { day: 'Domingo', hours: 'Fechado' }],
    services: beauty ? [
      { id: demoId(true, 20), name: 'Corte feminino', description: 'Um corte que respeita a textura do seu cabelo e acompanha o seu dia a dia. A gente conversa, entende e só então corta.', includes: ['Conversa sobre o seu cabelo', 'Lavagem e corte personalizado', 'Finalização e dicas de cuidado'], audience: 'Para renovar o visual sem abrir mão de ser você.', duration: 60, price: 120, image: photo('servico-corte-feminino') },
      { id: demoId(true, 23), name: 'Mechas e luzes', description: 'Luminosidade na medida certa, com transições suaves e um plano de cuidado para manter os fios saudáveis.', includes: ['Diagnóstico e teste de mecha', 'Técnica de iluminação personalizada', 'Tonalização e finalização'], audience: 'Para quem quer iluminar os fios com um resultado natural.', duration: 120, price: 320, priceFrom: true, priceNote: 'O valor varia conforme comprimento e técnica. Confirmamos antes de começar.', image: photo('servico-mechas-luzes') },
      { id: demoId(true, 24), name: 'Hidratação', description: 'Cuidado para devolver maciez, brilho e movimento aos fios. O tratamento é escolhido depois de avaliar seu cabelo.', includes: ['Avaliação dos fios', 'Tratamento de hidratação', 'Finalização'], audience: 'Para cabelos ressecados ou que precisam de uma pausa da química.', duration: 45, price: 90, image: photo('servico-hidratacao') },
    ] : [
      { id: demoId(false, 20), name: 'Corte masculino', description: 'Do degradê ao clássico na tesoura. Um corte pensado para o seu rosto, seu cabelo e o jeito que você gosta de usar.', includes: ['Conversa sobre o corte', 'Corte na máquina e na tesoura', 'Acabamento e finalização'], audience: 'Para manter o corte em dia ou encontrar um novo estilo.', duration: 30, price: 45, image: photo('servico-corte-masculino') },
      { id: demoId(false, 22), name: 'Corte + barba', description: 'O cuidado completo, no seu tempo. Corte com acabamento preciso e barba desenhada para valorizar o seu rosto.', includes: ['Corte personalizado', 'Barba com toalha quente', 'Acabamento na navalha e balm'], audience: 'Para sair com cabelo e barba alinhados em uma única visita.', duration: 60, price: 75, image: photo('servico-corte-barba') },
      { id: demoId(false, 21), name: 'Barba', description: 'Desenho, alinhamento e cuidado com a pele. Toalha quente para preparar, navalha para definir e balm para finalizar.', includes: ['Desenho da barba', 'Toalha quente e navalha', 'Hidratação com balm'], audience: 'Para quem gosta de uma barba bem cuidada, curta ou cheia.', duration: 30, price: 35, image: photo('servico-barba') },
    ],
    team: (beauty ? ['Marina Costa', 'Luiza Martins', 'Ana Ribeiro'] : ['Rafael Costa', 'Lucas Mendes', 'André Lima']).map((name, i) => ({
      id: demoId(beauty, 30 + i),
      name,
      image: beauty
        ? [photo('servico-escova'), '/presenca/rhian/salon-balayage.jpg', photo('servico-corte-feminino')][i]
        : ['/presenca/rhian/barber-portrait.jpg', '/presenca/rhian/barber-fade.jpg', photo('servico-corte-barba')][i],
      bio: beauty ? ['Cortes e movimento natural', 'Cor, mechas e iluminação', 'Tratamentos e finalização'][i] : ['Degradê navalhado & visagismo', 'Corte na tesoura & barboterapia', 'Barba longa & alinhamento'][i],
    })),
    gallery: beauty
      ? [
          { src: '/presenca/rhian/salon-hero.jpg', alt: 'Espaço luminoso do Studio Aurora — foto ilustrativa' },
          { src: '/presenca/rhian/salon-balayage.jpg', alt: 'Resultado de cor e balayage — foto ilustrativa' },
          { src: photo('galeria-05'), alt: 'Finalização e movimento — foto ilustrativa' },
        ]
      : [
          { src: '/presenca/rhian/barber-hero.jpg', alt: 'Bancadas e luz natural na casa — foto ilustrativa' },
          { src: '/presenca/rhian/barber-fade.jpg', alt: 'Acabamento de degradê na navalha — foto ilustrativa' },
          { src: '/presenca/rhian/barber-portrait.jpg', alt: 'Equipe pronta para atendimento com hora marcada — foto ilustrativa' },
        ],
    rating: 4.9, reviewCount: beauty ? 128 : 214,
    reviews: [
      { id: 'demo-review-1', name: beauty ? 'Beatriz S.' : 'Bruno M.', rating: 5, comment: beauty ? 'A Marina perguntou como eu arrumo o cabelo em casa e cortou pensando nisso. Em Pinheiros, é o único lugar em que eu saio sabendo o que fazer no dia seguinte.' : 'Marquei com o Rafael às 18h, depois do trabalho. Entrou na hora, desenhou a barba e o degradê ficou no comprimento que eu pedi — não no que estava na moda.' },
      { id: 'demo-review-2', name: beauty ? 'Clara F.' : 'André R.', rating: 5, comment: beauty ? 'Nas mechas, o valor só fechou depois do teste de mecha. Demorou, mas o loiro não quebrou o cabelo. Voltei em seis semanas.' : 'Barba com toalha quente e navalha, não só máquina. Saí às 19h e ainda deu para chegar em casa para o jantar.' },
      { id: 'demo-review-3', name: beauty ? 'Juliana A.' : 'Felipe C.', rating: 5, comment: beauty ? 'Primeira visita: paguei o corte e a hidratação entrou, como estava no site. Sem letra miúda no caixa.' : 'Cadeira reservada, sem fila. O Lucas fez o clássico na tesoura em 30 minutos e o acabamento da nuca ficou limpo.' },
    ],
  };
  data.services[beauty ? 0 : 1].featured = true;
  const config: SiteConfig = {
    ...defaultConfig(data), style: 'light', accent: beauty ? '#3F4E41' : '#9A5628',
    headline: beauty
      ? 'Salão em Pinheiros dedicado à cor natural e ao cuidado do cabelo'
      : 'Barbearia em Pinheiros com corte preciso e horário respeitado',
    cover: beauty ? '/presenca/rhian/salon-hero.jpg' : '/presenca/rhian/barber-hero.jpg',
    photoFocus: beauty ? 'space' : 'work',
    photoPosition: beauty ? { x: 58, y: 48 } : { x: 42, y: 38 },
    about: beauty
      ? 'Diagnóstico transparente e um plano de cuidado para os fios, em Pinheiros.'
      : 'Tesoura, navalha e agenda pontual até as 20h na Fradique Coutinho.',
    offer: {
      enabled: true,
      title: beauty ? 'Hidratação de presente na primeira visita' : '15% de desconto na sua primeira visita',
      condition: beauty ? 'Ao agendar corte ou coloração.' : 'Válido para novos clientes de terça a quinta-feira em qualquer corte ou combo.',
      serviceId: data.services[beauty ? 0 : 1].id,
    },
    differences: beauty
      ? ['Orçamento transparente apresentado antes de iniciar qualquer coloração.', 'Atendimento individualizado com foco em crescimento suave da cor.', 'Consulta de 10 minutos antes de qualquer tesoura ou química.']
      : ['Atendimento rigorosamente no horário marcado — sem fila de espera.', 'Lâminas descartáveis e toalhas esterilizadas a cada cliente.', 'Horário estendido até 20h de segunda a sexta.', 'Garantia de ajuste gratuito em até 7 dias caso precise retocar.'],
    beforeAfter: beauty
      ? [{ before: photo('servico-corte-feminino'), after: '/presenca/rhian/salon-balayage.jpg', caption: 'Cor e movimento — fotos ilustrativas.' }]
      : [{ before: '/presenca/rhian/barber-hero.jpg', after: '/presenca/rhian/barber-fade.jpg', caption: 'Degradê e alinhamento — fotos ilustrativas.' }],
    faq: [
      { question: 'Preciso agendar antes de ir?', answer: 'Sim. Escolha o serviço, o profissional e um horário disponível aqui no site. Assim, a gente reserva um tempo só para você.' },
      { question: 'E se eu precisar remarcar?', answer: 'Use o link enviado na confirmação. Na demonstração, a política é de até 2 horas antes do atendimento.' },
      { question: 'Quais formas de pagamento vocês aceitam?', answer: 'Nesta casa fictícia, simulamos pagamento por Pix, dinheiro e cartões, no estabelecimento.' },
      { question: beauty ? 'O valor das mechas é sempre o mesmo?' : 'Posso escolher quem vai me atender?', answer: beauty ? 'O valor varia pelo comprimento e pela técnica. A equipe confirma o orçamento antes de iniciar qualquer procedimento.' : 'Pode, sim. Ao agendar, escolha o profissional da sua preferência ou veja os horários de toda a equipe.' },
    ],
  };
  return { data, config };
}
