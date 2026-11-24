import { defaultConfig, type SiteConfig, type SiteData } from './model';

const demoId = (beauty: boolean, n: number) => `d0000000-0000-4000-${beauty ? '8002' : '8001'}-${String(n).padStart(12, '0')}`;

export function getDemoSite(slug: string): { data: SiteData; config: SiteConfig } | null {
  if (!['demo-corte-fino', 'demo-studio-aurora'].includes(slug)) return null;
  const beauty = slug === 'demo-studio-aurora';
  const folder = beauty ? 'salao' : 'barbearia';
  const photo = (file: string) => `/demo/${folder}/${file}.webp`;
  const data: SiteData = {
    id: beauty ? 'demo-beauty' : 'demo-barber', slug,
    name: beauty ? 'Studio Aurora' : 'Corte Fino', kind: beauty ? 'beauty' : 'barber', region: 'BR', demo: true,
    cover: photo('capa'), address: beauty ? 'Rua dos Pinheiros, 870 — Pinheiros, São Paulo' : 'Rua Fradique Coutinho, 420 — Pinheiros, São Paulo',
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
    team: (beauty ? ['Marina Costa', 'Luiza Martins', 'Ana Ribeiro'] : ['Rafael Costa', 'Lucas Mendes', 'André Lima']).map((name, i) => ({ id: demoId(beauty, 30 + i), name, bio: beauty ? ['Cortes e movimento natural', 'Cor, mechas e iluminação', 'Tratamentos e finalização'][i] : ['Clássicos na tesoura e barba', 'Degradês e cortes modernos', 'Barba e acabamento na navalha'][i] })),
    gallery: [1, 2, 6].map(n => ({ src: photo(`galeria-${String(n).padStart(2, '0')}`), alt: beauty ? 'Referência de cabelo e finalização — foto ilustrativa' : 'Referência de corte e acabamento — foto ilustrativa' })),
    rating: 4.9, reviewCount: beauty ? 128 : 214,
    reviews: [
      { id: 'demo-review-1', name: beauty ? 'Beatriz S.' : 'Bruno M.', rating: 5, comment: beauty ? 'A Marina ouviu o que eu queria e explicou cada etapa. Saí com um corte que consigo arrumar em casa.' : 'Primeira vez na casa e já acertei no lugar. O Rafael entendeu o corte e caprichou no acabamento.' },
      { id: 'demo-review-2', name: beauty ? 'Clara F.' : 'André R.', rating: 5, comment: beauty ? 'Adorei a cor e o cuidado com o meu cabelo. Atendimento tranquilo, sem correria.' : 'Marquei pelo celular, cheguei e fui atendido no horário. A barba com toalha quente vale a visita.' },
      { id: 'demo-review-3', name: beauty ? 'Juliana A.' : 'Felipe C.', rating: 5, comment: beauty ? 'Lugar acolhedor, preço combinado antes e resultado lindo. Vou voltar.' : 'Ambiente bom, conversa boa e corte melhor ainda. Virou minha barbearia do bairro.' },
    ],
  };
  const config: SiteConfig = {
    ...defaultConfig(data), style: beauty ? 'light' : 'dark', accent: beauty ? '#294D40' : '#C89B79',
    headline: beauty ? 'Seu salão em Pinheiros.' : 'Barbearia em Pinheiros.',
    about: beauty ? 'Corte, cor e cuidado para o cabelo que é só seu. A consulta vem antes da tesoura.' : 'Corte na conversa, barba no capricho. Seu horário reservado, sem correria.',
    offer: { enabled: true, title: beauty ? 'Seu primeiro corte, com hidratação de presente.' : 'Primeira visita? Corte + barba por R$ 65.', condition: beauty ? 'Na primeira visita, ao agendar um corte. Não cumulativo.' : 'Para novos clientes. Valor habitual: R$ 75. Não cumulativo.', serviceId: data.services[beauty ? 0 : 1].id },
    differences: beauty ? ['Seu cabelo tem voz. A consulta vem antes da tesoura.', 'Preço combinado antes de começar. Sem surpresas.', 'Cuidado que continua em casa, com orientação de verdade.'] : ['O corte começa na conversa. Sem receita pronta.', 'Seu horário é reservado. Atendimento com tempo para caprichar.', 'Acabamento de perto. Navalha, tesoura e atenção ao detalhe.'],
    faq: [
      { question: 'Preciso agendar antes de ir?', answer: 'Sim. Escolha o serviço, o profissional e um horário disponível aqui no site. Assim, a gente reserva um tempo só para você.' },
      { question: 'E se eu precisar remarcar?', answer: 'Use o link enviado na confirmação. Na demonstração, a política é de até 2 horas antes do atendimento.' },
      { question: 'Quais formas de pagamento vocês aceitam?', answer: 'Nesta casa fictícia, simulamos pagamento por Pix, dinheiro e cartões, no estabelecimento.' },
      { question: beauty ? 'O valor das mechas é sempre o mesmo?' : 'Posso escolher quem vai me atender?', answer: beauty ? 'O valor varia pelo comprimento e pela técnica. A equipe confirma o orçamento antes de iniciar qualquer procedimento.' : 'Pode, sim. Ao agendar, escolha o profissional da sua preferência ou veja os horários de toda a equipe.' },
    ],
  };
  return { data, config };
}
