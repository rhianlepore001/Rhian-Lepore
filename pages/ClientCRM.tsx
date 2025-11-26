
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Star, Calendar, Phone, Mail, Sparkles, RefreshCcw, Scissors, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { calculateTier, getTierConfig, calculateNextVisitPrediction } from '../utils/tierSystem';

export const ClientCRM: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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
            .select('*')
            .eq('client_id', clientData.id)
            .eq('status', 'Completed')
            .order('appointment_time', { ascending: false });

          if (appointmentsError) throw appointmentsError;

          const totalVisits = appointmentsData?.length || 0;
          const lastVisit = appointmentsData?.[0]?.appointment_time
            ? new Date(appointmentsData[0].appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Nunca';
          const nextPrediction = calculateNextVisitPrediction(appointmentsData || []);
          const calculatedTier = calculateTier(totalVisits);

          // Fetch hair records
          const { data: historyData, error: historyError } = await supabase
            .from('hair_records')
            .select('*')
            .eq('client_id', clientData.id)
            .order('date', { ascending: false });

          if (historyError) throw historyError;

          setClient({
            ...clientData,
            loyaltyTier: calculatedTier,
            lastVisit,
            totalVisits,
            nextPrediction,
            hairHistory: historyData?.map((h: any) => ({
              ...h,
              imageUrl: h.image_url,
            })) || []
          });
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
            <div className="w-20 h-20 md:w-32 md:h-32 flex-shrink-0 rounded-none border-4 border-accent-gold shadow-heavy relative overflow-hidden">
              {client.photo_url ? (
                <img src={client.photo_url} alt={client.name} className="w-full h-full object-cover grayscale contrast-125" />
              ) : (
                <img src="https://picsum.photos/id/1005/300/300" alt={client.name} className="w-full h-full object-cover grayscale contrast-125" />
              )}
              <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 bg-black text-accent-gold text-[10px] md:text-xs font-bold px-2 py-1 border border-accent-gold uppercase tracking-widest">
                {client.loyaltyTier}
              </div>
            </div>
            <div className="flex flex-col justify-center md:items-center md:w-full">
              <div className="flex gap-1 text-accent-gold mb-1">
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
                <h1 className="text-2xl md:text-3xl font-heading text-white uppercase leading-none">{client.name}</h1>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 text-text-secondary font-mono text-xs md:text-sm">
                  <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> {client.email}</span>
                  <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {client.phone}</span>
                </div>
              </div>
              <BrutalButton variant="primary" icon={<Scissors />} size="sm" className="w-full md:w-auto">Novo Corte</BrutalButton>
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
              <div className="col-span-2 md:col-span-1 bg-neutral-900 p-3 border border-neutral-800 border-l-4 border-l-yellow-500">
                <p className="text-[10px] md:text-xs text-yellow-500 uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Previsão Retorno
                  <span className="ml-auto bg-yellow-500/20 text-yellow-500 px-2 py-0.5 text-[8px] font-bold border border-yellow-500">EM DESENVOLVIMENTO</span>
                </p>
                <p className="text-base md:text-lg font-bold text-white">{client.nextPrediction}</p>
              </div>
            </div>
          </div>
        </div>
      </BrutalCard>

      {/* Visual Hair History */}
      <BrutalCard title="Histórico Visual de Cortes">
        {client.hairHistory.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-sm">Nenhum registro de corte ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <div className="flex gap-4 md:gap-6 min-w-max">
              {client.hairHistory.map((record: any, index: number) => (
                <div key={record.id} className="w-56 md:w-64 flex-shrink-0 group">
                  <div className="relative border-2 border-neutral-700 hover:border-accent-gold transition-colors">
                    <img src={record.imageUrl} alt="Cut" className="w-full h-56 md:h-64 object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 border-t border-neutral-600">
                      <p className="text-white font-bold font-heading text-sm md:text-base">{record.service}</p>
                      <p className="text-[10px] md:text-xs text-text-secondary font-mono">{new Date(record.date).toLocaleDateString('pt-BR')} • {record.barber}</p>
                    </div>
                    {index === 0 && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-accent-gold text-black text-[10px] font-bold px-2 py-1 uppercase">Atual</span>
                      </div>
                    )}
                  </div>
                  {index === 0 && (
                    <button className="w-full mt-3 bg-neutral-800 hover:bg-accent-gold hover:text-black text-text-primary py-2 font-mono text-xs uppercase tracking-wider border border-black transition-colors flex items-center justify-center gap-2">
                      <RefreshCcw className="w-3 h-3" /> Repetir Estilo
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </BrutalCard>

      {/* Notes & Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2 h-full">
          <BrutalCard title="Notas do Barbeiro" className="h-full">
            <textarea
              className="w-full h-40 bg-neutral-900 border-2 border-neutral-800 p-4 text-text-primary font-mono text-sm focus:outline-none focus:border-accent-gold resize-none"
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
        <BrutalCard className="bg-gradient-to-br from-brutal-card to-neutral-900 border-accent-gold/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 text-accent-gold flex-1">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-heading text-lg uppercase">Barber AI</h3>
            </div>
            <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 text-[8px] font-bold border border-yellow-500 uppercase">EM DESENVOLVIMENTO</span>
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
    </div>
  );
};
