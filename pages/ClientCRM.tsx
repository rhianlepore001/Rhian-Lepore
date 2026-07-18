import { Card, Button } from '../components/ui';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


import { Star, Calendar, Phone, Mail, Sparkles, RefreshCcw, Scissors, ArrowLeft, Trash2, Edit2, Save, X, Tag, MessageCircle } from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';
import { useParams, useNavigate } from 'react-router-dom';
import { calculateNextVisitPrediction } from '../utils/tierSystem';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { formatPhone, formatCurrency } from '../utils/formatters';
import { generateReactivationMessage, getWhatsAppUrl } from '../utils/aiosCopywriter';
import { useAIOSDiagnostic } from '../hooks/useAIOSDiagnostic';
import { useSemanticMemory } from '../hooks/useSemanticMemory';
import { useToast } from '../components/ui/Toast';
import { AISemanticInsights } from '../components/AISemanticInsights';

export const ClientCRM: React.FC = () => {
const { id } = useParams<{ id: string }>();
  const { user, userType, region, businessName } = useAuth();
  const { accent, isBeauty } = useBrutalTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('R$');
  
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // AIOS Context
  const { aiosEnabled } = useAuth();
  const { diagnostic, logCampaignActivity } = useAIOSDiagnostic();
  const { saveMemory } = useSemanticMemory();
  const isAtRisk = diagnostic?.at_risk_clients.find(c => c.id === id);

  useEffect(() => {
    if (region === 'PT') {
      setCurrencySymbol('€');
    } else {
      setCurrencySymbol('R$');
    }
  }, [region]);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id || !user) return;
      try {
        // US-0309: 3 queries sequenciais → 1 RPC (get_client_profile)
        const { data, error } = await supabase
          .rpc('get_client_profile', { p_client_id: id })
          .single();

        if (error) throw error;
        if (!data) return;

        const { client: clientData, ltv, appointments_history, hair_history } = data as any;

        setNotes(clientData.notes || '');

        const appointmentsData = appointments_history || [];
        const totalVisits = appointmentsData.length;
        const lastVisit = appointmentsData[0]?.appointment_time
          ? new Date(appointmentsData[0].appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Nunca';
        const nextPrediction = calculateNextVisitPrediction(appointmentsData);

        setClient({
          ...clientData,
          lastVisit,
          totalVisits,
          nextPrediction,
          ltv,
          appointmentsHistory: appointmentsData.map((apt: any) => ({
            ...apt,
            professional_name: apt.professional_name,
            basePrice: apt.price
          })),
          hairHistory: (hair_history || []).map((h: any) => ({
            ...h,
            imageUrl: h.image_url,
          }))
        });

        setEditName(clientData.name);
        setEditPhone(clientData.phone || '');
        setEditEmail(clientData.email || '');
      } catch (error) {
        console.error('Error fetching client:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, user]);

  const handleSaveNotes = async () => {
    if (!client?.id) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ notes: notes })
        .eq('id', client.id)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      // Update local client state with new notes
      setClient({ ...client, notes: notes });
      showToast('Notas salvas com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error saving notes:', error);
      showToast('Não foi possível salvar as notas. Tente novamente.', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveSemanticNote = async () => {
    if (!client?.id || !notes.trim()) return;
    setSavingNotes(true);
    try {
      // 1. Save standard note
      const { error: dbError } = await supabase
        .from('clients')
        .update({ notes: notes })
        .eq('id', client.id)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      // 2. Save Semantic Memory (Embedding)
      await saveMemory(client.id, notes, 'preference');

      setClient({ ...client, notes: notes });
      showToast('Nota e Memória de IA salvas!', 'success');
    } catch (error: any) {
      console.error('Error saving semantic note:', error);
      showToast('Não foi possível salvar. Tente novamente.', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleWhatsAppClick = async () => {
    if (!client?.phone) {
      showToast('Cliente sem telefone cadastrado.', 'info');
      return;
    }

    let url = '';
    if (isAtRisk && aiosEnabled) {
      // ✅ AIOS 2.0: Log Campaign Activity for ROI Attribution
      await logCampaignActivity(
        client.id,
        isBeauty ? 'Beauty AI' : 'Barber AI',
        'reactivation_spark'
      );

      const message = generateReactivationMessage({
        name: client.name,
        businessName: businessName || 'nossa unidade',
        userType: userType,
        daysMissing: isAtRisk.days_since_last_visit
      });
      url = getWhatsAppUrl(client.phone, message);
    } else {
      url = getWhatsAppUrl(client.phone, '');
    }

    window.open(url, '_blank');
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.id) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: editName,
          phone: editPhone,
          email: editEmail
        })
        .eq('id', client.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setClient({ ...client, name: editName, phone: editPhone, email: editEmail });
      showToast('Cliente atualizado com sucesso!', 'success');
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error updating client:', error);
      showToast('Não foi possível atualizar o cliente. Tente novamente.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!client?.id) return;
    if (!confirm('Tem certeza que deseja desativar este cliente? O cliente não aparecerá mais na lista, mas o histórico financeiro será mantido.')) return;

    setDeleting(true);
    try {
      // Soft delete - mark client as inactive instead of deleting
      // This preserves financial records and appointment history
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', client.id)
        .eq('user_id', user.id);

      if (error) throw error;

      showToast('Cliente desativado com sucesso!', 'success');
      navigate('/clientes');
    } catch (error: any) {
      console.error('Error deactivating client:', error);
      showToast('Não foi possível desativar o cliente. Tente novamente.', 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-theme-text text-center p-10">Carregando dados do cliente...</div>;
  }

  if (!client) {
    return <div className="text-theme-text text-center p-10">Cliente não encontrado.</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/clientes')}
        className="flex items-center gap-2 text-theme-textSecondary hover:text-theme-text transition-colors mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-mono text-sm uppercase">Voltar para Clientes</span>
      </button>

      {/* Top Header Profile */}
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
          {/* Avatar & Tier */}
          <div className="flex flex-row md:flex-col items-center gap-4 w-full md:w-auto">
            <div className={`w-20 h-20 md:w-32 md:h-32 flex-shrink-0 rounded-none border-4 ${accent.border} shadow-heavy relative overflow-hidden group`}>
              {client.photo_url ? (
                <img src={client.photo_url} alt={client.name} className="w-full h-full object-cover grayscale contrast-125" />
              ) : (
                <img src="https://picsum.photos/id/1005/300/300" alt={client.name} className="w-full h-full object-cover grayscale contrast-125" />
              )}

              {/* Photo Upload Overlay */}
              <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${client.id}/${Date.now()}.${fileExt}`;

                      // Upload to Supabase
                      const { error: uploadError } = await supabase.storage
                        .from('client_photos')
                        .upload(fileName, file);

                      if (uploadError) throw uploadError;

                      // Get Public URL
                      const { data: { publicUrl } } = supabase.storage
                        .from('client_photos')
                        .getPublicUrl(fileName);

                      // Update Client Record
                      const { error: updateError } = await supabase
                        .from('clients')
                        .update({ photo_url: publicUrl })
                        .eq('id', client.id)
                        .eq('user_id', user.id);

                      if (updateError) throw updateError;

                      // Update Local State
                      setClient({ ...client, photo_url: publicUrl });
                      showToast('Foto atualizada com sucesso!', 'success');

                    } catch (error: any) {
                      console.error('Error uploading photo:', error);
                      showToast('Não foi possível atualizar a foto. Tente novamente.', 'error');
                    }
                  }}
                />
                <span className="text-white text-xs font-bold uppercase border border-white px-2 py-1">Alterar</span>
              </label>
            </div>
            <div className="flex flex-col justify-center md:items-center md:w-full">
              <div className={`flex gap-1 ${accent.text} mb-1`}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-3 h-3 md:w-4 md:h-4 ${i <= (client.rating || 0) ? 'fill-current' : 'fill-none'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-text-secondary md:hidden font-mono uppercase">Membro desde 2021</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 w-full mt-2 md:mt-0">
            <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-[var(--color-divider)] pb-4 mb-4 gap-4 md:gap-0">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-heading text-theme-text uppercase leading-none">{client.name}</h1>
                  <button onClick={() => setShowEditModal(true)} className="text-[var(--color-text-muted)] hover:text-theme-text transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 text-text-secondary font-mono text-xs md:text-sm">
                  <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> {client.email}</span>
                  <span className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {client.phone ? formatPhone(client.phone, region as any) : 'Sem telefone'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="border-red-900 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                  onClick={handleDeleteClient}
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`border-green-900/50 ${isBeauty ? 'text-green-400 hover:text-green-300 hover:bg-green-400/10' : 'text-green-600 hover:text-green-500 hover:bg-green-500/10'}`}
                  onClick={handleWhatsAppClick}
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button
                  variant="primary"
                  icon={<Scissors />}
                  size="sm"
                  className="flex-1 md:flex-none"
                  onClick={() => navigate(`/agenda?clientId=${client.id}`)}
                >
                  {isBeauty ? 'Novo Serviço' : 'Novo Corte'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-theme-surface p-3 border border-[var(--color-divider)]">
                <p className="text-xs md:text-xs text-theme-textSecondary uppercase">Última Visita</p>
                <p className="text-base md:text-lg font-bold text-theme-text">{client.lastVisit}</p>
              </div>
              <div className="bg-theme-surface p-3 border border-[var(--color-divider)]">
                <p className="text-xs md:text-xs text-theme-textSecondary uppercase">Total Visitas</p>
                <p className="text-base md:text-lg font-bold text-theme-text">{client.totalVisits}</p>
              </div>
              <div className="bg-theme-surface p-3 border border-[var(--color-divider)]">
                <p className="text-xs md:text-xs text-theme-textSecondary uppercase" title="Total gasto neste estabelecimento">Total Gasto</p>
                <p className="text-base md:text-lg font-bold text-theme-accent">
                  {formatCurrency(client.ltv || 0, region)}
                </p>
              </div>
              <div className="col-span-2 md:col-span-1 bg-theme-surface p-3 border border-[var(--color-accent-border)]">
                <p className="text-xs md:text-xs text-theme-accent uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Próxima Visita
                </p>
                <p className="text-base md:text-lg font-bold text-theme-text">{client.nextPrediction}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Visual History - Now using Real Appointments */}
      <Card title={isBeauty ? "Histórico de Visitas" : "Histórico de Cortes"}>
        {client.hairHistory.length === 0 && (!client.appointmentsHistory || client.appointmentsHistory.length === 0) ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <p className="text-sm">{isBeauty ? 'Nenhum registro ainda' : 'Nenhum registro de corte ainda'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <div className="flex gap-4 md:gap-6 min-w-max">
              {/* Show appointments history first (more relevant) */}
              {client.appointmentsHistory && client.appointmentsHistory.map((apt: any, index: number) => {
                // Calculate discount info
                const hasDiscount = apt.basePrice && apt.price < apt.basePrice;
                const discountPercentage = hasDiscount ? Math.round(((apt.basePrice - apt.price) / apt.basePrice) * 100) : 0;

                return (
                  <div key={apt.id} className="w-56 md:w-64 flex-shrink-0 group">
                    <div className="relative border-2 border-[var(--color-divider)] hover:border-[var(--color-accent-border)] transition-colors bg-theme-surface h-56 md:h-64 flex flex-col items-center justify-center p-4">
                      <Calendar className={`w-12 h-12 ${accent.text} mb-2 opacity-50`} />
                      <p className="text-theme-text font-bold font-heading text-lg text-center leading-tight mb-1">{apt.service}</p>
                      <p className="text-theme-textSecondary font-mono text-xs">{new Date(apt.appointment_time).toLocaleDateString('pt-BR')}</p>

                      <div className="absolute bottom-0 left-0 right-0 bg-theme-card p-3 border-t border-[var(--color-divider)]">
                        <p className="text-xs md:text-xs text-theme-textSecondary font-mono flex justify-between items-center">
                          <span>{apt.professional_name || 'Profissional'}</span>
                          <span className="flex items-center gap-2">
                            {hasDiscount && (
                              <span className="text-red-400 line-through text-xs">{currencySymbol} {apt.basePrice.toFixed(2)}</span>
                            )}
                            <span className="text-theme-text font-bold">{currencySymbol} {apt.price.toFixed(2)}</span>
                          </span>
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {index === 0 && (
                          <span className={`${accent.bg} text-[var(--color-bg)] text-xs font-bold px-2 py-1 uppercase`}>Último</span>
                        )}
                        {hasDiscount && (
                          <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Repeat Service Button for each card */}
                    <button
                      onClick={() => navigate(`/agenda?clientId=${client.id}&service=${encodeURIComponent(apt.service)}`)}
                      className={`w-full mt-3 bg-theme-surface ${accent.bgHover} hover:text-[var(--color-bg)] text-[var(--color-text)] py-2 font-mono text-xs uppercase tracking-wider border border-[var(--color-divider)] transition-colors flex items-center justify-center gap-2`}
                    >
                      <RefreshCcw className="w-3 h-3" /> {isBeauty ? 'Repetir Serviço' : 'Repetir Estilo'}
                    </button>
                  </div>
                );
              })}

              {/* Keep existing hair records for backward compatibility */}
              {client.hairHistory.map((record: any) => (
                <div key={record.id} className="w-56 md:w-64 flex-shrink-0 group">
                  <div className="relative border-2 border-[var(--color-divider)] hover:border-[var(--color-accent-border)] transition-colors">
                    <img src={record.imageUrl} alt="Cut" className="w-full h-56 md:h-64 object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 border-t border-neutral-600">
                      <p className="text-white font-bold font-heading text-sm md:text-base">{record.service}</p>
                      <p className="text-xs md:text-xs text-text-secondary font-mono">{new Date(record.date).toLocaleDateString('pt-BR')} • {record.barber}</p>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="bg-theme-surface text-theme-text text-xs font-bold px-2 py-1 uppercase border border-[var(--color-divider)]">Foto</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Notes & Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2 h-full">
          <Card title={isBeauty ? "Notas do Profissional" : "Notas do Barbeiro"} className="h-full">
            <textarea
              className="w-full h-40 bg-[var(--color-input-bg)] border-2 border-[var(--color-input-border)] p-4 text-theme-text placeholder:text-[var(--color-text-muted)] font-mono text-sm focus:outline-none focus:border-theme-accent resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite observações sobre o cliente..."
            />
            <div className="flex justify-end mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveSemanticNote}
                disabled={savingNotes}
              >
                {savingNotes ? 'Salvando...' : 'Salvar Observação'}
              </Button>
            </div>
          </Card>
        </div>

        {/* AI Insight Mini Card */}
        <Card
          className={`bg-gradient-to-br from-[var(--color-card)] to-[var(--color-bg)] overflow-hidden relative border-[var(--color-accent-border)] ${isBeauty ? 'shadow-neon-soft' : 'shadow-heavy'}`}
        >
          {isAtRisk ? (
            <div className="relative z-10">
              {/* ... existing code for at risk ... */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`flex items-center gap-2 ${accent.text} flex-1`}>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <h3 className="font-heading text-lg uppercase tracking-wider">Cliente Inativo</h3>
                </div>
                <span className="bg-[var(--color-accent-dim)] text-theme-accent border-theme-accent px-2 py-1 text-xs font-bold border uppercase tracking-widest">Sugestão de IA</span>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-theme-textSecondary leading-relaxed border-l-2 border-[var(--color-divider)] pl-3">
                  Detectamos que o valor médio por atendimento de <span className="text-theme-text font-bold">{client.name.split(' ')[0]}</span> é de <span className={`${accent.text} font-bold`}>{formatCurrency(isAtRisk.avg_ticket, region)}</span>, mas ele não retorna há <span className="text-theme-text font-bold">{isAtRisk.days_since_last_visit} dias</span>.
                </p>

                <div className="bg-theme-surface p-3 rounded border border-[var(--color-divider)]">
                  <p className="text-xs uppercase font-mono text-theme-textSecondary mb-1">Sugestão da IA:</p>
                  <p className="text-xs italic text-theme-textSecondary">&quot;Enviar mensagem de saudades e oferecer um horário prioritário para esta semana.&quot;</p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full shadow-lg"
                  onClick={handleWhatsAppClick}
                  icon={<MessageCircle className="w-4 h-4" />}
                >
                  Mandar Mensagem
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <AISemanticInsights clientId={client.id} clientName={client.name} />
            </div>
          )}

          {/* Subtle background icon */}
          <Sparkles className={`absolute -bottom-4 -right-4 w-24 h-24 opacity-5 ${accent.text}`} />
        </Card>
      </div>
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-overlay)] backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 relative transition-all bg-[var(--color-modal-bg)] border border-[var(--color-modal-border)]
              ${isBeauty
              ? 'rounded-2xl shadow-[0_0_20px_rgba(167,139,250,0.15)]'
              : 'rounded-xl shadow-brutal'}
          `}>
            <button
              onClick={() => setShowEditModal(false)}
              className={`absolute top-4 right-4 transition-colors text-[var(--color-text-muted)] hover:text-theme-text hover:bg-[var(--color-card-hover)]
                  ${isBeauty ? 'rounded-full p-1.5' : 'p-1'}
              `}
            >
              <X className="w-6 h-6" />
            </button>

            <div className={`mb-6 pb-4 border-[var(--color-modal-border)] ${isBeauty ? 'border-b' : 'border-b-2 border-dashed'}`}>
              <h3 className={`text-xl font-heading uppercase text-theme-text ${isBeauty ? 'tracking-normal' : 'tracking-wider'}`}>Editar Cliente</h3>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div>
                <label className={`block text-xs mb-1 text-theme-textSecondary ${isBeauty ? 'font-sans font-medium' : 'font-mono'}`}>Nome Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full p-3 transition-all bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-theme-text placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-theme-accent
                      ${isBeauty ? 'rounded-xl' : 'rounded-lg'}
                  `}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs mb-2 text-theme-textSecondary ${isBeauty ? 'font-sans font-medium' : 'font-mono'}`}>Telefone</label>
                <PhoneInput
                  value={editPhone}
                  onChange={setEditPhone}
                  defaultRegion={region as 'BR' | 'PT'}
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block text-xs mb-1 text-theme-textSecondary ${isBeauty ? 'font-sans font-medium' : 'font-mono'}`}>Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={`w-full p-3 transition-all bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-theme-text placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-theme-accent
                      ${isBeauty ? 'rounded-xl' : 'rounded-lg'}
                  `}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`flex-1 py-3 font-bold uppercase tracking-wider transition-colors text-theme-text border border-[var(--color-input-border)] hover:bg-[var(--color-card-hover)]
                      ${isBeauty ? 'bg-transparent rounded-xl' : 'bg-theme-surface rounded-lg'}
                  `}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className={`flex-1 py-3 font-bold uppercase tracking-wider transition-all disabled:opacity-50 bg-theme-accent text-[var(--color-bg)] hover:bg-theme-accentHover
                      ${isBeauty
                      ? 'rounded-xl shadow-[0_0_15px_rgba(167,139,250,0.3)]'
                      : 'rounded-lg border-2 border-black shadow-brutal-sm'}
                  `}
                >
                  {updating ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
