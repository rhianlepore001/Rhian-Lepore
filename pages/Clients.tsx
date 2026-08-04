import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Cake, ChevronRight, MessageCircle, Plus, Search, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/Logger';
import { PhoneInput } from '../components/PhoneInput';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  SkeletonCard,
} from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatPhone } from '../utils/formatters';
import {
  createClient,
  enrichClients,
  fetchClientAppointmentStats,
  filterEnrichedClients,
  formatVisitAgo,
  syncPublicClientsToCrm,
} from '../services/crm';
import type { ClientFilter, ClientRecord, EnrichedClient } from '../types/crm';

const FILTERS: ClientFilter[] = ['Todos', 'VIP', 'Novos', 'Inativo'];

function ClientStatusChips({ client }: { client: EnrichedClient }) {
  const { accent, status, colors, radius } = useBrutalTheme();
  const chips: { key: string; label: string; className: string }[] = [];

  if (client.isVip) {
    chips.push({
      key: 'vip',
      label: 'VIP',
      className: `${accent.bg} text-[var(--color-on-accent)]`,
    });
  }
  if (client.isInactive) {
    chips.push({
      key: 'inactive',
      label: 'Inativo',
      className: `${status.warningBg} ${status.warning}`,
    });
  } else if (client.isNew) {
    chips.push({
      key: 'new',
      label: 'Novo',
      className: `${colors.surface} ${colors.textSecondary} border ${colors.border}`,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={`text-xs font-bold px-2 py-0.5 ${radius.button} ${chip.className}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export const Clients: React.FC = () => {
  const { user, region, companyId } = useAuth();
  const { showToast } = useToast();
  const { colors, accent, radius } = useBrutalTheme();
  const effectiveUserId = companyId ?? user?.id;
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<EnrichedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<ClientFilter>('Todos');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      if (effectiveUserId) {
        await syncPublicClientsToCrm(effectiveUserId);
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', effectiveUserId)
        .neq('is_active', false)
        .order('name', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as ClientRecord[];
      const stats = await fetchClientAppointmentStats(
        effectiveUserId || '',
        rows.map((c) => c.id),
      );
      setClients(enrichClients(rows, stats));
    } catch (error) {
      logger.error('Error fetching clients', error);
      setFetchError(true);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchClients();
  }, []);

  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch) setSearchTerm(querySearch);
  }, [searchParams]);

  const filteredClients = useMemo(
    () => filterEnrichedClients(clients, filterType, searchTerm),
    [clients, filterType, searchTerm],
  );

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setBirthDate('');
    setPhoto(null);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone && !email) {
      showToast('Informe pelo menos um contato (telefone ou e-mail).', 'info');
      return;
    }

    setUploading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuário não autenticado');

      let photoUrl: string | null = null;

      if (photo) {
        try {
          const fileExt = photo.name.split('.').pop();
          const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('client_photos')
            .upload(fileName, photo);

          if (uploadError) {
            logger.error('Photo upload error', uploadError);
            showToast('Não foi possível enviar a foto. O cliente será criado sem foto.', 'info');
          } else {
            const {
              data: { publicUrl },
            } = supabase.storage.from('client_photos').getPublicUrl(fileName);
            photoUrl = publicUrl;
          }
        } catch (photoError) {
          logger.error('Photo upload exception', photoError);
          showToast('Não foi possível enviar a foto. O cliente será criado sem foto.', 'info');
        }
      }

      await createClient({
        companyId: effectiveUserId || authUser.id,
        name,
        email,
        phone,
        photoUrl,
        birthDate: birthDate || null,
      });

      setShowModal(false);
      resetForm();
      await fetchClients();
      showToast('Cliente cadastrado.', 'success');
    } catch (error: unknown) {
      logger.error('Error creating client', error);
      const message = error instanceof Error ? error.message : 'Não foi possível criar o cliente.';
      showToast(message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 relative">
      <PageHeader
        title="Clientes"
        action={
          <Button variant="primary" icon={<Plus />} onClick={() => setShowModal(true)}>
            Adicionar cliente
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar clientes"
            className={[
              'w-full p-4 pl-12 text-sm outline-none transition-colors duration-200',
              radius.input,
              colors.text,
              colors.inputBg,
              `border ${colors.inputBorder}`,
              'focus:border-[var(--color-input-focus)] focus:ring-1 focus:ring-[var(--color-input-focus)]',
            ].join(' ')}
          />
        </div>
        <div
          className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar"
          role="tablist"
          aria-label="Filtrar clientes"
        >
          {FILTERS.map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={filterType === type}
              onClick={() => setFilterType(type)}
              className={[
                'px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap min-h-[44px]',
                radius.button,
                filterType === type
                  ? `${accent.bg} text-[var(--color-on-accent)]`
                  : `${colors.surface} ${colors.textSecondary} hover:bg-[var(--color-card-hover)]`,
              ].join(' ')}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : fetchError ? (
          <div className="col-span-full">
            <ErrorState
              title="Não foi possível carregar os clientes"
              onRetry={() => {
                void fetchClients();
              }}
            />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              title={
                searchTerm || filterType !== 'Todos'
                  ? 'Nenhum cliente neste filtro'
                  : 'Seus clientes aparecem aqui. Cadastre o primeiro ou espere o agendamento online.'
              }
              action={
                filterType === 'Todos' && !searchTerm ? (
                  <Button variant="primary" size="md" icon={<Plus />} onClick={() => setShowModal(true)}>
                    Adicionar cliente
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          filteredClients.map((client) => {
            const totalVisits = client.visitCount;
            const lastLabel = formatVisitAgo(client.lastVisitAt);

            return (
              <Link key={client.id} to={`/clientes/${client.id}`} className="block group">
                <Card
                  variant="outlined"
                  className="hover:bg-[var(--color-card-hover)] transition-colors cursor-pointer h-full"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        'w-12 h-12 rounded-full border flex items-center justify-center overflow-hidden shrink-0',
                        accent.border,
                        colors.inputBg,
                      ].join(' ')}
                    >
                      {client.photo_url ? (
                        <img src={client.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className={accent.text} aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`text-base font-heading ${colors.text} truncate group-hover:text-theme-accent transition-colors`}>
                          {client.name}
                        </h3>
                        <ClientStatusChips client={client} />
                      </div>

                      <p className={`text-sm ${colors.textSecondary} font-mono flex items-center gap-2 mb-2`}>
                        <span className="truncate">
                          {client.phone ? formatPhone(client.phone, region as 'BR' | 'PT') : 'Sem telefone'}
                        </span>
                        {client.phone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(`https://wa.me/${client.phone!.replace(/\D/g, '')}`, '_blank');
                            }}
                            className="p-1 rounded-full hover:bg-[var(--color-success-bg)] transition-colors text-[var(--color-success)] min-h-[44px] min-w-[44px] inline-flex items-center justify-center -my-2"
                            title="WhatsApp"
                            aria-label={`WhatsApp de ${client.name}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </p>

                      <div className={`flex items-center justify-between gap-2 text-xs font-mono ${colors.textMuted}`}>
                        <span>
                          {totalVisits} visita{totalVisits !== 1 ? 's' : ''}
                          <span className="mx-1.5 opacity-40">·</span>
                          {lastLabel === 'Nunca' ? 'Ainda não veio' : `Última: ${lastLabel}`}
                        </span>
                        <span className="inline-flex items-center gap-2 shrink-0">
                          {client.birthdaySoon && (
                            <span
                              className={`${accent.text} inline-flex items-center gap-1`}
                              title="Aniversário nos próximos 7 dias"
                            >
                              <Cake className="w-3.5 h-3.5" aria-hidden="true" />
                              <span className="sr-only">Aniversário próximo</span>
                            </span>
                          )}
                          <ChevronRight
                            className={`w-4 h-4 ${colors.textMuted} group-hover:text-theme-accent group-hover:translate-x-0.5 transition-all`}
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Novo cliente"
        size="md"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} required />
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${colors.text}`} htmlFor="client-phone">
              Telefone
            </label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              defaultRegion={region as 'BR' | 'PT'}
              className="w-full"
            />
          </div>
          <Input
            label="E-mail (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Data de aniversário (opcional)"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${colors.text}`} htmlFor="client-photo">
              Foto (opcional)
            </label>
            <input
              id="client-photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className={[
                'w-full p-3 text-sm',
                radius.input,
                colors.text,
                colors.inputBg,
                `border ${colors.inputBorder}`,
              ].join(' ')}
            />
          </div>
          <Button type="submit" variant="primary" fullWidth loading={uploading}>
            {uploading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
