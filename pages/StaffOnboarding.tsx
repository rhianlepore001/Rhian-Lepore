import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AgenXLogo } from '../components/AgenXLogo';
import { CalendarCheck, Users, ArrowRight, Scissors } from 'lucide-react';

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

  const isBeauty = true; // Temporary or derived from context if needed, but semantic tokens like text-primary handle it.
  const firstName = fullName?.split(' ')[0];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-8 flex justify-center">
          <AgenXLogo size={36} isBeauty={false} showText={true} />
        </div>

        <div className="bg-card border border-border shadow-lg rounded-2xl p-8 md:p-10 relative overflow-hidden">
          {/* Saudação */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Scissors size={28} className="text-primary" />
            </div>

            <h1 className="font-heading text-3xl text-foreground tracking-tight mb-3 font-bold">
              {firstName ? `Olá, ${firstName}!` : 'Bem-vindo!'}
            </h1>

            {businessName ? (
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px] mx-auto">
                Você foi adicionado à equipe da{' '}
                <span className="text-primary font-bold">{businessName}</span>.
                <br />
                Tudo pronto para começar.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
                Sua conta foi criada. Tudo pronto para começar.
              </p>
            )}
          </div>

          {/* O que você vai encontrar */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl border border-border transition-colors hover:bg-muted/60">
              <div className="p-2 bg-background rounded-lg border border-border shadow-sm flex-shrink-0">
                <CalendarCheck size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-foreground text-sm font-semibold">Sua Agenda</p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">Atendimentos do dia, horários e clientes</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl border border-border transition-colors hover:bg-muted/60">
              <div className="p-2 bg-background rounded-lg border border-border shadow-sm flex-shrink-0">
                <Users size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-foreground text-sm font-semibold">Sua Equipe</p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">Acesso compartilhado com o restante da equipe</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all duration-200 
                       flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(var(--primary),0.39)] 
                       hover:shadow-[0_6px_20px_rgba(var(--primary),0.23)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Acessar minha agenda
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
