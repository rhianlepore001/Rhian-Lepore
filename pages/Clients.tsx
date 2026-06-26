import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/Logger';
import { PhoneInput } from '../components/PhoneInput';
import { Plus, Search, User, Users, Star, ChevronRight, MessageCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import {
  Card,
  Button,
  EmptyState,
  Input,
  Modal,
  SkeletonCard,
  PageHeader,
} from '../components/ui';
import { formatPhone } from '../utils/formatters';
import { calcLoyaltyTier, createClient, syncPublicClientsToCrm } from '../services/crm';

export const Clients: React.FC = () => {
  const { user, region, companyId } = useAuth();
  const { colors, accent, radius } = useBrutalTheme();
  const effectiveUserId = companyId ?? user?.id;
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [origin, setOrigin] = useState<'Novo' | 'Recente' | 'Antigo'>('Novo');
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<'Todos' | 'VIP' | 'Inativo' | 'Novos'>('Todos');

  const fetchClients = async () => {
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

      if (data) {
        const clientIds = data.map((c) => c.id);

        const { data: appointmentCounts, error: countError } = await supabase
          .from('appointments')
          .select('client_id')
          .in('client_id', clientIds)
          .eq('status', 'Completed')
          .eq('user_id', effectiveUserId);

        if (!countError && appointmentCounts) {
          const visitCounts: Record<string, number> = {};
          appointmentCounts.forEach((apt) => {
            visitCounts[apt.client_id] = (visitCounts[apt.client_id] || 0) + 1;
          });

          setClients(
            data.map((client) => ({
              ...client,
              actual_visits: visitCounts[client.id] || 0,
              loyalty_tier: calcLoyaltyTier(visitCounts[client.id] || 0),
            }))
          );
        } else {
          setClients(data);
        }
      }
    } catch (error) {
      logger.error('Error fetching clients', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchClients();
  }, []);

  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch) {
      setSearchTerm(querySearch);
    }
  }, [searchParams]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone && !email) {
      alert('Informe pelo menos um contato (telefone ou e-mail).');
      return;
    }

    setUploading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuário não autenticado');

      let photoUrl = null;

      if (photo) {
        try {
          const fileExt = photo.name.split('.').pop();
          const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('client_photos')
            .upload(fileName, photo);

          if (uploadError) {
            logger.error('Photo upload error', uploadError);
            alert('Aviso: Não foi possível fazer upload da foto. O cliente será criado sem foto.');
          } else {
            const {
              data: { publicUrl },
            } = supabase.storage.from('client_photos').getPublicUrl(fileName);
            photoUrl = publicUrl;
          }
        } catch (photoError) {
          logger.error('Photo upload exception', photoError);
          alert('Aviso: Erro ao fazer upload da foto. O cliente será criado sem foto.');
        }
      }

      await createClient({
        companyId: effectiveUserId || authUser.id,
        name,
        email,
        phone,
        photoUrl,
        origin,
      });

      setShowModal(false);
      setName('');
      setEmail('');
      setPhone('');
      setOrigin('Novo');
      setPhoto(null);
      await fetchClients();
    } catch (error: unknown) {
      logger.error('Error creating client', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao criar cliente: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm);

    const totalV = client.actual_visits ?? client.total_visits ?? 0;

    let matchesFilter = true;
    if (filterType === 'VIP') matchesFilter = totalV >= 5;
    if (filterType === 'Inativo') matchesFilter = totalV === 0;
    if (filterType === 'Novos') matchesFilter = totalV > 0 && totalV < 5;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 relative">
      <PageHeader
        title="Clientes"
        action={
          <Button variant="primary" icon={<Plus />} onClick={() => setShowModal(true)}>
            Adicionar cliente
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
        <div className="flex gap-2 self-start md:self-stretch overflow-x-auto pb-2 md:pb-0 hide-scrollbar w-full md:w-auto">
          {(['Todos', 'VIP', 'Novos', 'Inativo'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={[
                'px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap min-h-[44px]',
                radius.button,
                filterType === type
                  ? `${accent.bg} text-[var(--color-bg)]`
                  : `${colors.surface} ${colors.textSecondary} hover:bg-[var(--color-card-hover)]`,
              ].join(' ')}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              title="Seus clientes aparecem aqui. Cadastre o primeiro ou importe da agenda."
              action={
                <Button variant="primary" size="md" icon={<Plus />} onClick={() => setShowModal(true)}>
                  Adicionar cliente
                </Button>
              }
            />
          </div>
        ) : (
          filteredClients.map((client) => {
            const rating = client.rating || 0;
            const totalVisits = client.actual_visits ?? client.total_visits ?? 0;

            return (
              <Link key={client.id} to={`/clientes/${client.id}`}>
                <Card variant="outlined" className="hover:bg-[var(--color-card-hover)] transition-colors cursor-pointer group h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={[
                        'w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden',
                        accent.border,
                        colors.inputBg,
                      ].join(' ')}
                    >
                      {client.photo_url ? (
                        <img src={client.photo_url} alt={client.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className={accent.text} />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {totalVisits >= 5 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${accent.bg} text-[var(--color-bg)]`}>
                          VIP
                        </span>
                      )}
                      <span className={`text-xs font-mono ${colors.textSecondary}`}>
                        {totalVisits} visita{totalVisits !== 1 ? 's' : ''}
                      </span>
                      {rating > 0 && (
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i <= rating ? `${accent.text} fill-current` : colors.textMuted}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-heading ${colors.text} mb-1 group-hover:${accent.text} transition-colors`}>
                        {client.name}
                      </h3>
                      <p className={`text-sm ${colors.textSecondary} font-mono flex items-center gap-2`}>
                        {client.phone ? formatPhone(client.phone, region as 'BR' | 'PT') : 'Sem telefone'}
                        {client.phone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`, '_blank');
                            }}
                            className="p-1 rounded-full hover:bg-green-500/10 transition-colors text-green-500"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${colors.textMuted} group-hover:${accent.text} group-hover:translate-x-1 transition-all`} />
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo cliente" size="md">
        <form onSubmit={handleCreateClient} className="space-y-4">
          <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} required />
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${colors.text}`}>Telefone</label>
            <PhoneInput value={phone} onChange={setPhone} defaultRegion={region as 'BR' | 'PT'} className="w-full" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${colors.text}`}>Origem do cliente</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Novo', 'Recente', 'Antigo'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setOrigin(opt)}
                  className={[
                    'p-2 text-xs font-semibold transition-all min-h-[44px]',
                    radius.button,
                    origin === opt
                      ? `${accent.bgDim} border ${accent.border} ${accent.text}`
                      : `${colors.inputBg} border ${colors.inputBorder} ${colors.textSecondary}`,
                  ].join(' ')}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="E-mail (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${colors.text}`}>Foto (opcional)</label>
            <input
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
