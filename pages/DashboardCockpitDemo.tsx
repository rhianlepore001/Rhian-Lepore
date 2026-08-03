import React, { useState } from 'react';
import { NextAppointmentHero } from '../components/dashboard/NextAppointmentHero';
import { AttentionInbox } from '../components/dashboard/AttentionInbox';
import { TodayKpiStrip } from '../components/dashboard/TodayKpiStrip';
import { TodayAgendaList } from '../components/dashboard/TodayAgendaList';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import type { DashboardAppointment } from '../types/dashboard';
import { Activity, Calendar, CheckCircle2, Sparkles, Target } from 'lucide-react';

const MOCK_AGENDA: DashboardAppointment[] = [
  {
    id: '1',
    clientName: 'João Silva',
    service: 'Corte + Barba',
    time: '13:30',
    date: '03/08',
    rawDate: '2026-08-03',
    status: 'Confirmed',
    price: 80,
    appointment_time: new Date().toISOString(),
    professional_id: null,
  },
  {
    id: '2',
    clientName: 'Maria Santos',
    service: 'Escova',
    time: '14:15',
    date: '03/08',
    rawDate: '2026-08-03',
    status: 'Pending',
    price: 60,
    appointment_time: new Date(Date.now() + 45 * 60_000).toISOString(),
    professional_id: null,
  },
  {
    id: '3',
    clientName: 'Carlos Oliveira',
    service: 'Barba',
    time: '15:00',
    date: '03/08',
    rawDate: '2026-08-03',
    status: 'Confirmed',
    price: 40,
    appointment_time: new Date(Date.now() + 90 * 60_000).toISOString(),
    professional_id: null,
  },
  {
    id: '4',
    clientName: 'Ana Costa',
    service: 'Corte',
    time: '16:30',
    date: '03/08',
    rawDate: '2026-08-03',
    status: 'Confirmed',
    price: 50,
    appointment_time: new Date(Date.now() + 180 * 60_000).toISOString(),
    professional_id: null,
  },
];

/**
 * Preview isolado do cockpit (Fase 1) com dados mock —
 * rota pública para validação visual desktop/mobile sem login.
 */
export const DashboardCockpitDemo: React.FC = () => {
  const { accent, colors } = useBrutalTheme();
  const [persona, setPersona] = useState<'owner' | 'staff'>('owner');
  const isStaff = persona === 'staff';
  const next = MOCK_AGENDA[0];
  const upcoming = MOCK_AGENDA.slice(1, 3);
  const iconClass = `flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`;

  const ownerKpis = [
    { id: 'revenue', label: 'Receita', value: 'R$ 620', hint: 'Meta R$ 800', progress: 78 },
    { id: 'agenda', label: 'Agenda', value: '8', hint: '8 agendamentos' },
    { id: 'queue', label: 'Na fila', value: '3', hint: 'Aguardando' },
    { id: 'free', label: 'Livres', value: '5', hint: 'Horários estimados' },
  ];

  const staffKpis = [
    { id: 'done', label: 'Concluídos', value: '3', hint: 'Hoje' },
    { id: 'pending', label: 'Pendentes', value: '4', hint: 'Ainda na agenda' },
    { id: 'commission', label: 'Comissões', value: 'R$ 186', hint: 'A receber' },
    { id: 'agenda', label: 'Na agenda', value: '7', hint: 'Hoje' },
  ];

  return (
    <div className="min-h-screen bg-theme-bg p-4 md:p-8" data-testid="dashboard-cockpit-demo">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-mono uppercase tracking-widest ${accent.text}`}>
              Preview · Cockpit Fase 1
            </p>
            <h1 className={`font-heading text-2xl font-bold ${colors.text}`}>
              Dashboard operacional
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant={persona === 'owner' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPersona('owner')}
            >
              Gestor
            </Button>
            <Button
              variant={persona === 'staff' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPersona('staff')}
            >
              Colaborador
            </Button>
          </div>
        </div>

        <PageHeader
          title={`Olá, ${isStaff ? 'Lucas' : 'Rhian'}`}
          subtitle="segunda-feira, 3 de agosto"
          action={
            !isStaff ? (
              <Button variant="primary" icon={<Calendar className="h-4 w-4" />}>
                Agendar
              </Button>
            ) : undefined
          }
        />

        <NextAppointmentHero
          next={next}
          upcoming={upcoming}
          showPrice={!isStaff}
          priceLabel={!isStaff ? 'R$ 80' : undefined}
          onPrimaryAction={() => undefined}
          onOpenAgenda={() => undefined}
        />

        <TodayKpiStrip items={isStaff ? staffKpis : ownerKpis} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.85fr)] lg:items-start">
          <TodayAgendaList
            appointments={MOCK_AGENDA}
            nextId={next.id}
            showPrice={!isStaff}
            formatPrice={(p) => `R$ ${p}`}
            onOpenAll={() => undefined}
          />

          <div className="space-y-4">
            {!isStaff && (
              <AttentionInbox
                items={[
                  {
                    id: '1',
                    text: '1 reserva online aguardando aprovação.',
                    tone: 'warning',
                    onClick: () => undefined,
                  },
                  {
                    id: '2',
                    text: '3 clientes ainda não confirmaram o horário.',
                    tone: 'warning',
                    onClick: () => undefined,
                  },
                ]}
              />
            )}

            {!isStaff && (
              <Card variant="outlined">
                <h2 className={`mb-3 text-sm font-semibold ${colors.text}`}>Oportunidades</h2>
                <ul className="space-y-2">
                  <li className={`rounded-2xl p-3 ${colors.surface}`}>
                    <p className={`text-sm font-semibold ${colors.text}`}>
                      12 clientes sem retorno há 30+ dias
                    </p>
                    <p className={`text-xs ${colors.textSecondary}`}>Ver clientes inativos</p>
                  </li>
                  <li className={`rounded-2xl p-3 ${colors.surface}`}>
                    <p className={`text-sm font-semibold ${colors.text}`}>5 horários livres hoje</p>
                    <p className={`text-xs ${colors.textSecondary}`}>Preencher agenda</p>
                  </li>
                </ul>
              </Card>
            )}

            {!isStaff && (
              <Card variant="outlined">
                <div className="flex items-start gap-3">
                  <div className={iconClass}>
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={`font-heading text-base font-bold ${colors.text}`}>Metas</h2>
                    <p className={`text-sm ${colors.textSecondary}`}>Dia R$ 620 / R$ 800</p>
                    <p className={`text-sm ${colors.textSecondary}`}>Mês R$ 2.400 / R$ 5.000</p>
                  </div>
                </div>
                <div className={`mt-4 h-2 overflow-hidden rounded-full ${colors.surface}`}>
                  <div className={`h-full ${accent.bg}`} style={{ width: '48%' }} />
                </div>
              </Card>
            )}

            {!isStaff && (
              <Card variant="outlined">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={iconClass}>
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className={`font-heading text-base font-bold ${colors.text}`}>
                        Saúde do negócio
                      </h2>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        Receita ok; retorno caiu um pouco.
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono text-2xl font-black ${accent.text}`}>64</span>
                </div>
                <div className={`mt-4 flex items-start gap-3 rounded-2xl p-3 ${colors.surface}`}>
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 ${accent.text}`} />
                  <p className={`text-sm ${colors.textSecondary}`}>2 pontos de atenção</p>
                </div>
              </Card>
            )}

            {isStaff && (
              <Card variant="outlined">
                <div className="flex items-start gap-3">
                  <div className={iconClass}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={`font-heading text-base font-bold ${colors.text}`}>
                      Foco do turno
                    </h2>
                    <p className={`mt-1 text-sm ${colors.textSecondary}`}>
                      4 atendimentos pela frente. Confirme os pendentes e feche a comanda ao
                      concluir.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
