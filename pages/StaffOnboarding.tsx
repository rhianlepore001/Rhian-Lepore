import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AgenXLogo } from '../components/AgenXLogo';
import { Zap, CalendarCheck, Users } from 'lucide-react';

export const StaffOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { companyId, fullName, markTutorialCompleted } = useAuth();
  const [businessName, setBusinessName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    supabase
      .from('profiles')
      .select('business_name')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        if (data?.business_name) setBusinessName(data.business_name);
      });
  }, [companyId]);

  const handleStart = async () => {
    setLoading(true);
    await markTutorialCompleted();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-brutal-main">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-gold/3 rounded-full blur-[150px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="mb-8">
          <AgenXLogo size={40} isBeauty={false} showText={true} />
        </div>

        <div className="bg-brutal-card border-4 border-black shadow-heavy p-10">
          <Zap size={36} className="text-accent-gold mx-auto mb-6" fill="currentColor" />

          <h1 className="font-heading text-3xl uppercase text-white tracking-tight mb-2">
            Bem-vindo{fullName ? `, ${fullName.split(' ')[0]}` : ''}!
          </h1>

          {businessName ? (
            <p className="text-neutral-400 text-base mb-8 font-mono">
              Você agora faz parte da equipe de{' '}
              <span className="text-accent-gold font-bold">{businessName}</span>.
            </p>
          ) : (
            <p className="text-neutral-400 text-base mb-8 font-mono">
              Sua conta foi criada com sucesso.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-black/40 border-2 border-neutral-800 p-4 text-left">
              <CalendarCheck size={20} className="text-accent-gold mb-2" />
              <p className="text-white text-xs font-heading uppercase">Agenda</p>
              <p className="text-neutral-500 text-xs mt-0.5 font-mono">Seus horários do dia</p>
            </div>
            <div className="bg-black/40 border-2 border-neutral-800 p-4 text-left">
              <Users size={20} className="text-accent-gold mb-2" />
              <p className="text-white text-xs font-heading uppercase">Equipe</p>
              <p className="text-neutral-500 text-xs mt-0.5 font-mono">Conectado à equipe</p>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full p-4 font-heading text-lg uppercase tracking-widest bg-accent-gold text-black border-2 border-black shadow-heavy transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 hover:translate-y-[-2px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Zap size={20} fill="black" />
                Acessar minha agenda
              </>
            )}
          </button>
        </div>

        <p className="mt-8 text-[10px] text-white/20 font-mono uppercase tracking-[0.2em]">
          AgenX Management Flow • v2.0
        </p>
      </div>
    </div>
  );
};
