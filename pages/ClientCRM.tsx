
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Star, Calendar, Phone, Mail, Sparkles, RefreshCcw, Scissors, ArrowLeft, Trash2, Edit2, Save, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { calculateNextVisitPrediction } from '../utils/tierSystem';
import { useAuth } from '../contexts/AuthContext';

export const ClientCRM: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { userType } = useAuth();
  const isBeauty = userType === 'beauty';

  // Theme helpers
  const themeColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const themeBorder = isBeauty ? 'border-beauty-neon' : 'border-accent-gold';
  const themeBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
  const themeButtonHover = isBeauty ? 'hover:bg-beauty-neon hover:text-white' : 'hover:bg-accent-gold hover:text-black';
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) return;
      try {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();

        if (clientError) throw clientError;

        if (clientData) {
          setNotes(clientData.notes || '');

          // Fetch appointments for visit history
          const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('appointments')
            .select('*, team_members(name)')
            .eq('client_id', clientData.id)
            .eq('status', 'Completed')
            .order('appointment_time', { ascending: false });

          if (appointmentsError) throw appointmentsError;

          const totalVisits = appointmentsData?.length || 0;
          const lastVisit = appointmentsData?.[0]?.appointment_time
            ? new Date(appointmentsData[0].appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Nunca';
          const nextPrediction = calculateNextVisitPrediction(appointmentsData || []);

          // Fetch hair records
          const { data: historyData, error: historyError } = await supabase
            .from('hair_records')
            .select('*')
            .eq('client_id', clientData.id)
            .order('date', { ascending: false });

          if (historyError) throw historyError;

          setClient({
            ...clientData,
            lastVisit,
            totalVisits,
            nextPrediction,
            appointmentsHistory: appointmentsData?.map((apt: any) => ({
              ...apt,
              professional_name: apt.team_members?.name
            })) || [],
            hairHistory: historyData?.map((h: any) => ({
              ...h,
              imageUrl: h.image_url,
            })) || []
          });

          // Initialize edit form
          setEditName(clientData.name);
          setEditPhone(clientData.phone || '');
          setEditEmail(clientData.email || '');
        }
      } catch (error) {
        console.error('Error fetching client:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id]);

  const handleSaveNotes = async () => {
    if (!client?.id) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ notes })
        .eq('id', client.id);

      if (error) throw error;
      alert('Notas salvas com sucesso!');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erro ao salvar notas.');
    } finally {
      setSavingNotes(false);
    }
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
        .eq('id', client.id);

      if (error) throw error;

      setClient({ ...client, name: editName, phone: editPhone, email: editEmail });
      alert('Cliente atualizado com sucesso!');
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error updating client:', error);
      alert('Erro ao atualizar cliente: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!client?.id) return;
    if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação é irreversível e removerá todo o histórico.')) return;

    setDeleting(true);
    try {
      // Delete client (cascade should handle related records if configured, otherwise we might need manual deletion)
      // Assuming cascade is ON for appointments/hair_records in DB schema, or we just delete client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      alert('Cliente excluído com sucesso!');
      navigate('/clientes');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      alert('Erro ao excluir cliente: ' + error.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-white text-center p-10">Carregando dados do cliente...</div>;
  }

  if (!client) {
    return <div className="text-white text-center p-10">Cliente não encontrado.</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/clientes')}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-mono text-sm uppercase">Voltar para Clientes</span>
      </button>

      {/* Top Header Profile */}
      <BrutalCard className="overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
          {/* Avatar & Tier */}
          <div className="flex flex-row md:flex-col items-center gap-4 w-full md:w-auto">
            <div className={`w-20 h-20 md:w-32 md:h-32 flex-shrink-0 rounded-none border-4 ${themeBorder} shadow-heavy relative overflow-hidden group`}>
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
                        .eq('id', client.id);

                      if (updateError) throw updateError;

                      // Update Local State
                      setClient({ ...client, photo_url: publicUrl });
                      alert('Foto atualizada com sucesso!');

                    } catch (error: any) {
                      console.error('Error uploading photo:', error);
                      alert('Erro ao atualizar foto: ' + (error.message || 'Erro desconhecido'));
                    }
                  }}
                />
                <span className="text-white text-[10px] font-bold uppercase border border-white px-2 py-1">Alterar</span>
              </label>

              <div className={`absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 bg-black text-white text-[10px] md:text-xs font-bold px-2 py-1 border border-neutral-600 uppercase tracking-widest pointer-events-none`}>
                {client.totalVisits} VISITAS
              </div>
            </div>
            <div className="flex flex-col justify-center md:items-center md:w-full">
              <div className={`flex gap-1 ${themeColor} mb-1`}>
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
            <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-neutral-800 pb-4 mb-4 gap-4 md:gap-0">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-heading text-white uppercase leading-none">{client.name}</h1>
                  <button onClick={() => setShowEditModal(true)} className="text-neutral-500 hover:text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 text-text-secondary font-mono text-xs md:text-sm">
                  <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> {client.email}</span>
                  <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {client.phone}</span>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <BrutalButton
                  variant="ghost"
                  size="sm"
                  className="border-red-900 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                  onClick={handleDeleteClient}
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4" />
                </BrutalButton>
                <BrutalButton
                  variant="primary"
                  icon={<Scissors />}
                  size="sm"
                  className="flex-1 md:flex-none"
                  onClick={() => navigate(`/agenda?clientId=${client.id}`)}
                >
                  {isBeauty ? 'Novo Serviço' : 'Novo Corte'}
                </BrutalButton>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-neutral-900 p-3 border border-neutral-800">
                <p className="text-[10px] md:text-xs text-text-secondary uppercase">Última Visita</p>
                <p className="text-base md:text-lg font-bold text-white">{client.lastVisit}</p>
              </div>
              <div className="bg-neutral-900 p-3 border border-neutral-800">
                <p className="text-[10px] md:text-xs text-text-secondary uppercase">Total Visitas</p>
                <p className="text-base md:text-lg font-bold text-white">{client.totalVisits}</p>
              </div>
              <div className={`col-span-2 md:col-span-1 bg-neutral-900 p-3 border border-neutral-800 border-l-4 ${isBeauty ? 'border-l-beauty-neon' : 'border-l-yellow-500'}`}>
                <p className={`text-[10px] md:text-xs ${isBeauty ? 'text-beauty-neon' : 'text-yellow-500'} uppercase flex items-center gap-1`}>
                  <Sparkles className="w-3 h-3" /> Previsão Retorno
                </p>
                <p className="text-base md:text-lg font-bold text-white">{client.nextPrediction}</p>
              </div>
            </div>
          </div>
        </div>
      </BrutalCard>

      {/* Visual History - Now using Real Appointments */}
      <BrutalCard title={isBeauty ? "Histórico de Visitas" : "Histórico de Cortes"}>
        {client.hairHistory.length === 0 && (!client.appointmentsHistory || client.appointmentsHistory.length === 0) ? (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-sm">{isBeauty ? 'Nenhum registro ainda' : 'Nenhum registro de corte ainda'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <div className="flex gap-4 md:gap-6 min-w-max">
              {/* Show appointments history first (more relevant) */}
              {client.appointmentsHistory && client.appointmentsHistory.map((apt: any, index: number) => (
                <div key={apt.id} className="w-56 md:w-64 flex-shrink-0 group">
                  <div className={`relative border-2 border-neutral-700 hover:${themeBorder} transition-colors bg-neutral-900 h-56 md:h-64 flex flex-col items-center justify-center p-4`}>
                    <Calendar className={`w-12 h-12 ${themeColor} mb-2 opacity-50`} />
                    <p className="text-white font-bold font-heading text-lg text-center leading-tight mb-1">{apt.service}</p>
                    <p className="text-neutral-400 font-mono text-xs">{new Date(apt.appointment_time).toLocaleDateString('pt-BR')}</p>

                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 border-t border-neutral-600">
                      <p className="text-[10px] md:text-xs text-text-secondary font-mono flex justify-between">
                        <span>{apt.professional_name || 'Profissional'}</span>
                        <span className="text-white font-bold">R$ {apt.price}</span>
                      </p>
                    </div>
                    {index === 0 && (
                      <div className="absolute top-2 right-2">
                        <span className={`${themeBg} ${isBeauty ? 'text-white' : 'text-black'} text-[10px] font-bold px-2 py-1 uppercase`}>Último</span>
                      </div>
                    )}
                  </div>
                  {index === 0 && (
                    <button
                      onClick={() => navigate(`/agenda?clientId=${client.id}`)}
                      className={`w-full mt-3 bg-neutral-800 ${themeButtonHover} text-text-primary py-2 font-mono text-xs uppercase tracking-wider border border-black transition-colors flex items-center justify-center gap-2`}
                    >
                      <RefreshCcw className="w-3 h-3" /> {isBeauty ? 'Repetir Serviço' : 'Repetir Estilo'}
                    </button>
                  )}
                </div>
              ))}

              {/* Keep existing hair records for backward compatibility */}
              {client.hairHistory.map((record: any) => (
                <div key={record.id} className="w-56 md:w-64 flex-shrink-0 group">
                  <div className={`relative border-2 border-neutral-700 hover:${themeBorder} transition-colors`}>
                    <img src={record.imageUrl} alt="Cut" className="w-full h-56 md:h-64 object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 border-t border-neutral-600">
                      <p className="text-white font-bold font-heading text-sm md:text-base">{record.service}</p>
                      <p className="text-[10px] md:text-xs text-text-secondary font-mono">{new Date(record.date).toLocaleDateString('pt-BR')} • {record.barber}</p>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="bg-neutral-800 text-white text-[10px] font-bold px-2 py-1 uppercase border border-neutral-600">Foto</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </BrutalCard>

      {/* Notes & Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2 h-full">
          <BrutalCard title={isBeauty ? "Notas do Profissional" : "Notas do Barbeiro"} className="h-full">
            <textarea
              className={`w-full h-40 bg-neutral-900 border-2 border-neutral-800 p-4 text-text-primary font-mono text-sm focus:outline-none focus:${themeBorder} resize-none`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite observações sobre o cliente..."
            />
            <div className="flex justify-end mt-2">
              <BrutalButton
                variant="secondary"
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? 'Salvando...' : 'Salvar Notas'}
              </BrutalButton>
            </div>
          </BrutalCard>
        </div>

        {/* AI Insight Mini Card */}
        <BrutalCard className={`bg-gradient-to-br from-brutal-card to-neutral-900 ${isBeauty ? 'border-beauty-neon/30' : 'border-accent-gold/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-2 ${themeColor} flex-1`}>
              <Sparkles className="w-5 h-5" />
              <h3 className="font-heading text-lg uppercase">{isBeauty ? 'Beauty AI' : 'Barber AI'}</h3>
            </div>
            <span className={`${isBeauty ? 'bg-beauty-neon/20 text-beauty-neon border-beauty-neon' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500'} px-2 py-1 text-[8px] font-bold border uppercase`}>EM DESENVOLVIMENTO</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            O cliente {client.name.split(' ')[0]} costuma agendar às sextas-feiras antes das 18h.
            <br /><br />
            <strong>Sugestão:</strong> Enviar lembrete via WhatsApp na próxima terça-feira ofertando um horário às 17:30.
          </p>
          <div className="mt-6">
            <BrutalButton variant="ghost" size="sm" className="w-full border border-neutral-800">Gerar Ação</BrutalButton>
          </div>
        </BrutalCard>
      </div>
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-white/20 w-full max-w-md p-6 shadow-heavy relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-heading text-white mb-6 uppercase">Editar Cliente</h3>

            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-1">Telefone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-white outline-none"
                  placeholder="(XX) 9XXXX-XXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-white outline-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 font-bold uppercase tracking-wider bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className={`flex-1 py-3 font-bold uppercase tracking-wider ${isBeauty ? 'bg-beauty-neon text-black' : 'bg-accent-gold text-black'} hover:opacity-90 disabled:opacity-50`}
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
