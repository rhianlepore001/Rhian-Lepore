import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Cake,
  Calendar,
  Edit2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCcw,
  Scissors,
  Trash2,
  User,
} from 'lucide-react';
import { Card, Button, Modal, ConfirmModal } from '../components/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { PhoneInput } from '../components/PhoneInput';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useToast } from '../components/ui/Toast';
import { useClientActiveMembership } from '../hooks/useMemberships';
import { MembershipBadge } from '../components/membership/MembershipBadge';
import { formatPhone, formatCurrency } from '../utils/formatters';
import { getWhatsAppUrl } from '../utils/aiosCopywriter';
import {
  BIRTHDAY_WINDOW_DAYS,
  daysUntilBirthday,
  formatVisitAgo,
  getVipClientIds,
  isBirthdaySoon,
  isInactiveClient,
  isNewClient,
} from '../services/crm';

const HISTORY_PAGE = 10;

interface AppointmentHistoryItem {
  id: string;
  service: string;
  appointment_time: string;
  price: number;
  professional_name?: string;
}

export const ClientCRM: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, region, companyId } = useAuth();
  const tenantId = companyId ?? user?.id;
  const { accent, isBeauty, classes, colors, radius, status } = useBrutalTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const { data: clubMembership } = useClientActiveMembership(id ?? null);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id || !user || !tenantId) return;
      try {
        const { data, error } = await supabase
          .rpc('get_client_profile', { p_client_id: id })
          .single();

        if (error) throw error;
        if (!data) return;

        const { client: clientData, ltv, appointments_history } = data as any;
        const appointmentsData: AppointmentHistoryItem[] = appointments_history || [];
        const totalVisits = appointmentsData.length;
        const lastVisitAt = appointmentsData[0]?.appointment_time || null;
        const firstVisitAt = appointmentsData[appointmentsData.length - 1]?.appointment_time || null;

        setNotes(clientData.notes || '');
        setEditName(clientData.name);
        setEditPhone(clientData.phone || '');
        setEditEmail(clientData.email || '');
        setEditBirthDate(clientData.birth_date || '');

        setClient({
          ...clientData,
          lastVisitAt,
          firstVisitAt,
          totalVisits,
          ltv: ltv || 0,
          appointmentsHistory: appointmentsData,
          isInactive: isInactiveClient(totalVisits, lastVisitAt),
          isNew: isNewClient(totalVisits, firstVisitAt),
          birthdaySoon: isBirthdaySoon(clientData.birth_date, BIRTHDAY_WINDOW_DAYS),
          daysToBirthday: daysUntilBirthday(clientData.birth_date),
        });

        // VIP: comparar LTV deste cliente com top 10 do tenant
        const { data: aptRows } = await supabase
          .from('appointments')
          .select('client_id, price')
          .eq('user_id', tenantId)
          .eq('status', 'Completed');

        if (aptRows) {
          const map = new Map<string, { visitCount: number; ltv: number }>();
          for (const row of aptRows) {
            if (!row.client_id) continue;
            const cur = map.get(row.client_id) || { visitCount: 0, ltv: 0 };
            cur.visitCount += 1;
            cur.ltv += Number(row.price) || 0;
            map.set(row.client_id, cur);
          }
          setIsVip(getVipClientIds(map).has(id));
        }
      } catch (error) {
        console.error('Error fetching client:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchClient();
  }, [id, user, tenantId]);

  const visibleHistory = useMemo(() => {
    const history: AppointmentHistoryItem[] = client?.appointmentsHistory || [];
    return showAllHistory ? history : history.slice(0, HISTORY_PAGE);
  }, [client, showAllHistory]);

  const handleSaveNotes = async () => {
    if (!client?.id || !tenantId) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ notes })
        .eq('id', client.id)
        .eq('user_id', tenantId);

      if (error) throw error;
      setClient({ ...client, notes });
      showToast('Observação salva.', 'success');
    } catch (error) {
      console.error('Error saving notes:', error);
      showToast('Não foi possível salvar a observação.', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (!client?.phone) {
      showToast('Cliente sem telefone cadastrado.', 'info');
      return;
    }
    window.open(getWhatsAppUrl(client.phone, ''), '_blank');
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.id || !tenantId) return;
    setUpdating(true);
    try {
      const birthDate = editBirthDate.trim() || null;
      const { error } = await supabase
        .from('clients')
        .update({
          name: editName,
          phone: editPhone,
          email: editEmail,
          birth_date: birthDate,
        })
        .eq('id', client.id)
        .eq('user_id', tenantId);

      if (error) throw error;

      setClient({
        ...client,
        name: editName,
        phone: editPhone,
        email: editEmail,
        birth_date: birthDate,
        birthdaySoon: isBirthdaySoon(birthDate, BIRTHDAY_WINDOW_DAYS),
        daysToBirthday: daysUntilBirthday(birthDate),
      });
      showToast('Cliente atualizado.', 'success');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating client:', error);
      showToast('Não foi possível atualizar o cliente.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const confirmDeleteClient = async () => {
    if (!client?.id || !tenantId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', client.id)
        .eq('user_id', tenantId);

      if (error) throw error;
      showToast('Cliente desativado.', 'success');
      navigate('/clientes');
    } catch (error) {
      console.error('Error deactivating client:', error);
      showToast('Não foi possível desativar o cliente.', 'error');
      setDeleting(false);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return <div className={`${colors.text} text-center p-10`}>Carregando cliente...</div>;
  }

  if (!client) {
    return <div className={`${colors.text} text-center p-10`}>Cliente não encontrado.</div>;
  }

  const statusChips: { label: string; className: string }[] = [];
  if (isVip) statusChips.push({ label: 'VIP', className: `${accent.bg} text-[var(--color-on-accent)]` });
  if (client.isInactive) {
    statusChips.push({
      label: 'Inativo',
      className: `${status.warningBg} ${status.warning}`,
    });
  } else if (client.isNew) {
    statusChips.push({
      label: 'Novo',
      className: `${colors.surface} ${colors.textSecondary} border ${colors.border}`,
    });
  }

  return (
    <div className="space-y-4 md:space-y-5 pb-28">
      <button
        type="button"
        onClick={() => navigate('/clientes')}
        className={`flex items-center gap-2 ${colors.textSecondary} hover:text-[var(--color-text)] transition-colors min-h-[44px]`}
      >
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        <span className="font-mono text-sm uppercase">Clientes</span>
      </button>

      <Card className="overflow-hidden">
        <div className="flex gap-4 items-start">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 ${radius.avatar} border ${accent.border} ${colors.inputBg} overflow-hidden flex items-center justify-center`}
          >
            {client.photo_url ? (
              <img src={client.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className={`w-7 h-7 ${accent.text}`} aria-hidden="true" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {statusChips.map((chip) => (
                <span
                  key={chip.label}
                  className={`text-xs font-bold px-2 py-0.5 ${radius.button} ${chip.className}`}
                >
                  {chip.label}
                </span>
              ))}
              {client.birthdaySoon && (
                <span className={`text-xs font-medium ${accent.text} inline-flex items-center gap-1`}>
                  <Cake className="w-3.5 h-3.5" aria-hidden="true" />
                  {client.daysToBirthday === 0
                    ? 'Aniversário hoje'
                    : `Aniversário em ${client.daysToBirthday}d`}
                </span>
              )}
            </div>

            <h1 className={`text-xl sm:text-2xl font-heading font-bold ${colors.text} leading-tight truncate`}>
              {client.name}
            </h1>
            {clubMembership?.plan && (
              <div className="mt-2" data-testid="crm-club-badge">
                <MembershipBadge
                  color={clubMembership.plan.badge_color}
                  label={clubMembership.status === 'active' ? clubMembership.plan.name : `${clubMembership.plan.name} · ${clubMembership.status === 'pending' ? 'pendente' : 'atrasado'}`}
                />
              </div>
            )}

            <div className={`mt-2 space-y-1 font-mono text-xs sm:text-sm ${colors.textSecondary}`}>
              <p className="flex items-center gap-2 min-w-0">
                <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {client.phone ? formatPhone(client.phone, region as 'BR' | 'PT') : 'Sem telefone'}
                </span>
              </p>
              {client.email ? (
                <p className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{client.email}</span>
                </p>
              ) : null}
              {client.birth_date ? (
                <p className="flex items-center gap-2">
                  <Cake className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {new Date(`${client.birth_date}T12:00:00`).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                  })}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="primary"
            icon={<Scissors />}
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => navigate(`/agenda?clientId=${client.id}`)}
          >
            {isBeauty ? 'Novo serviço' : 'Novo corte'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border-[var(--color-success-border)] text-[var(--color-success)] hover:bg-[var(--color-success-bg)]"
            onClick={handleWhatsAppClick}
            aria-label="Abrir WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEditModal(true)}
            aria-label="Editar cliente"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border-[var(--color-danger-border)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            aria-label="Desativar cliente"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
          <div className={`${colors.surface} p-3 border ${colors.border} ${radius.input} min-w-0`}>
            <p className={`text-xs ${colors.textSecondary} uppercase tracking-wide`}>Última visita</p>
            <p className={`text-sm sm:text-base font-bold ${colors.text} mt-0.5 leading-tight break-words`}>
              {formatVisitAgo(client.lastVisitAt)}
            </p>
          </div>
          <div className={`${colors.surface} p-3 border ${colors.border} ${radius.input} min-w-0`}>
            <p className={`text-xs ${colors.textSecondary} uppercase tracking-wide`}>Visitas</p>
            <p className={`text-sm sm:text-base font-bold ${colors.text} mt-0.5`}>{client.totalVisits}</p>
          </div>
          <div className={`${colors.surface} p-3 border ${colors.border} ${radius.input} min-w-0`}>
            <p className={`text-xs ${colors.textSecondary} uppercase tracking-wide`}>Total gasto</p>
            <p className={`text-sm sm:text-base font-bold ${accent.text} mt-0.5 tabular-nums leading-tight break-words`}>
              {formatCurrency(client.ltv || 0, region)}
            </p>
          </div>
        </div>
      </Card>

      <Card title={isBeauty ? 'Histórico de visitas' : 'Histórico de cortes'}>
        {!client.appointmentsHistory?.length ? (
          <EmptyState
            bordered
            icon={Scissors}
            title="Nenhum atendimento ainda"
            description="Visitas concluídas deste cliente aparecem aqui."
          />
        ) : (
          <div className="space-y-2">
            {visibleHistory.map((apt: AppointmentHistoryItem, index: number) => (
              <div
                key={apt.id}
                className={`flex items-center gap-3 p-3 border ${colors.border} ${colors.surface} ${radius.input}`}
              >
                <Calendar className={`w-5 h-5 shrink-0 ${accent.text} opacity-70`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-heading font-bold ${colors.text} truncate`}>{apt.service}</p>
                    {index === 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 ${accent.bg} text-[var(--color-on-accent)] shrink-0`}>
                        Último
                      </span>
                    )}
                  </div>
                  <p className={`text-xs font-mono ${colors.textSecondary}`}>
                    {new Date(apt.appointment_time).toLocaleDateString('pt-BR')}
                    {apt.professional_name ? ` · ${apt.professional_name}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${colors.text}`}>
                    {formatCurrency(apt.price || 0, region)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/agenda?clientId=${client.id}&service=${encodeURIComponent(apt.service)}`)
                    }
                    className={`mt-1 text-xs font-mono uppercase ${accent.text} inline-flex items-center gap-1 min-h-[44px]`}
                  >
                    <RefreshCcw className="w-3 h-3" aria-hidden="true" />
                    Repetir
                  </button>
                </div>
              </div>
            ))}
            {client.appointmentsHistory.length > HISTORY_PAGE && (
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setShowAllHistory((v) => !v)}
              >
                {showAllHistory
                  ? 'Ver menos'
                  : `Ver mais (${client.appointmentsHistory.length - HISTORY_PAGE})`}
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card title="Observações">
        <textarea
          className={`w-full h-32 ${colors.inputBg} border ${colors.inputBorder} p-4 ${colors.text} font-mono text-sm focus:outline-none focus:border-[var(--color-input-focus)] resize-none ${radius.input}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Preferências, alergias, observações do atendimento..."
          aria-label="Observações do cliente"
        />
        <div className="flex justify-end mt-2">
          <Button variant="secondary" size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
            {savingNotes ? 'Salvando...' : 'Salvar observação'}
          </Button>
        </div>
      </Card>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar cliente" size="md">
        <form onSubmit={handleUpdateClient} className="space-y-4">
          <div>
            <label className={`block mb-1 ${classes.label}`} htmlFor="crm-edit-name">
              Nome completo
            </label>
            <input
              id="crm-edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={classes.input}
              required
            />
          </div>
          <div>
            <label className={`block mb-2 ${classes.label}`} htmlFor="crm-edit-phone">
              Telefone
            </label>
            <PhoneInput
              value={editPhone}
              onChange={setEditPhone}
              defaultRegion={region as 'BR' | 'PT'}
              className="w-full"
            />
          </div>
          <div>
            <label className={`block mb-1 ${classes.label}`} htmlFor="crm-edit-email">
              E-mail
            </label>
            <input
              id="crm-edit-email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className={classes.input}
            />
          </div>
          <div>
            <label className={`block mb-1 ${classes.label}`} htmlFor="crm-edit-birth">
              Data de aniversário
            </label>
            <input
              id="crm-edit-birth"
              type="date"
              value={editBirthDate}
              onChange={(e) => setEditBirthDate(e.target.value)}
              className={classes.input}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" fullWidth onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" fullWidth loading={updating}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => void confirmDeleteClient()}
        title="Desativar cliente?"
        message="O histórico fica preservado. O cliente some da lista ativa."
        confirmLabel="Desativar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
