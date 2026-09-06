import type { LucideIcon } from 'lucide-react';
import {
  BellOff,
  CalendarDays,
  CircleDollarSign,
  Layers3,
  Package,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import type { LandingNiche } from '../../hooks/useNiche';

export type VisualKind = 'agenda' | 'money' | 'membership' | 'team' | 'booking' | 'packages';

export interface PainPoint {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface TrailFeature {
  title: string;
  description: string;
  visual: VisualKind;
  icon: LucideIcon;
}

export interface TrailContent {
  niche: LandingNiche;
  publicLabel: 'barbearia' | 'salao';
  eyebrow: string;
  headline: string;
  description: string;
  ctaLabel: string;
  trailTitle: string;
  trailDescription: string;
  pains: PainPoint[];
  features: TrailFeature[];
}

export const TRAIL_CONTENT: Record<LandingNiche, TrailContent> = {
  barber: {
    niche: 'barber',
    publicLabel: 'barbearia',
    eyebrow: 'BARBEARIA / RITMO DE BALCÃO',
    headline: 'Agenda cheia. Comissão certa. Zero planilha.',
    description:
      'O AgendiX deixa cada atendimento no lugar, do primeiro clique ao Pix no bolso do profissional.',
    ctaLabel: 'Testar por 20 dias',
    trailTitle: 'Mais corte. Menos operação.',
    trailDescription:
      'Uma visão direta do que acontece no balcão: agenda, equipe, produtos e recorrência em um só fluxo.',
    pains: [
      {
        title: 'Comissão sem atrito',
        description: 'Cada atendimento já nasce preparado para o acerto da equipe, sem fechar o mês no escuro.',
        icon: CircleDollarSign,
      },
      {
        title: 'Balcão sem fila',
        description: 'Venda produtos e mantenha a fila digital andando sem trocar de sistema no meio do atendimento.',
        icon: Package,
      },
      {
        title: 'Cliente que volta',
        description: 'Clube de assinatura e link de agendamento transformam a próxima visita em hábito.',
        icon: RefreshCw,
      },
    ],
    features: [
      {
        title: 'A agenda acompanha o seu ritmo',
        description: 'Horários, profissionais e encaixes aparecem em uma leitura rápida, feita para o celular.',
        visual: 'agenda',
        icon: CalendarDays,
      },
      {
        title: 'O acerto fica transparente',
        description: 'Serviços e produtos ficam separados para a comissão não virar uma conta de cabeça.',
        visual: 'money',
        icon: WalletCards,
      },
      {
        title: 'Recorrência no lugar certo',
        description: 'Apresente o clube como parte da experiência, não como mais uma ferramenta para administrar.',
        visual: 'membership',
        icon: Sparkles,
      },
    ],
  },
  beauty: {
    niche: 'beauty',
    publicLabel: 'salao',
    eyebrow: 'SALÃO / OPERAÇÃO COM LEVEZA',
    headline: 'Sua equipe agenda. Seu caixa fecha. Você dorme tranquila.',
    description:
      'O AgendiX conecta serviços, profissionais e pagamentos para o salão crescer sem depender de planilhas.',
    ctaLabel: 'Testar por 20 dias',
    trailTitle: 'A complexidade fica nos bastidores.',
    trailDescription:
      'Múltiplos serviços, uma equipe inteira e um caixa que faz sentido no fim do dia.',
    pains: [
      {
        title: 'Equipe em sintonia',
        description: 'Cabelo, unhas e maquiagem compartilham o mesmo calendário sem disputar informação.',
        icon: UsersRound,
      },
      {
        title: 'Serviços sem confusão',
        description: 'Combos, pacotes e durações diferentes entram no fluxo sem virar retrabalho.',
        icon: Layers3,
      },
      {
        title: 'Menos faltas',
        description: 'Lembretes e um link de agendamento simples ajudam a proteger cada horário da equipe.',
        icon: BellOff,
      },
    ],
    features: [
      {
        title: 'A cliente escolhe sem baixar app',
        description: 'Um link com a marca do salão resolve o agendamento desde o primeiro toque.',
        visual: 'booking',
        icon: Smartphone,
      },
      {
        title: 'A equipe trabalha na mesma página',
        description: 'Profissionais, serviços e disponibilidade ficam visíveis para quem precisa decidir.',
        visual: 'team',
        icon: UsersRound,
      },
      {
        title: 'Pacotes que continuam vendendo',
        description: 'Organize produtos e pacotes sem perder a leitura do que realmente move o negócio.',
        visual: 'packages',
        icon: ShieldCheck,
      },
    ],
  },
};

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_CONTENT: Record<LandingNiche, FaqItem[]> = {
  barber: [
    {
      question: 'Meu cliente precisa baixar um aplicativo?',
      answer: 'Não. Ele agenda pelo link público da sua barbearia, direto do navegador.',
    },
    {
      question: 'O Pix fica com quem?',
      answer: 'No Clube de Assinatura, o repasse vai direto para o profissional, sem intermediação do AgendiX.',
    },
    {
      question: 'Consigo vender produtos no balcão?',
      answer: 'Sim. Produtos podem ser vendidos no fluxo do atendimento e aparecem separados no financeiro.',
    },
  ],
  beauty: [
    {
      question: 'Posso organizar serviços de profissionais diferentes?',
      answer: 'Sim. O calendário combina serviços, duração e disponibilidade da equipe em um único fluxo.',
    },
    {
      question: 'A cliente agenda sem instalar nada?',
      answer: 'Sim. O link público funciona no navegador e pode carregar a identidade do seu salão.',
    },
    {
      question: 'Como o sistema ajuda com faltas?',
      answer: 'O agendamento online e os lembretes reduzem o espaço para esquecimento antes do horário.',
    },
  ],
};

export const getRegisterPath = (niche: LandingNiche | null): string => {
  if (!niche) return '/register';
  return `/register?nicho=${TRAIL_CONTENT[niche].publicLabel}`;
};
