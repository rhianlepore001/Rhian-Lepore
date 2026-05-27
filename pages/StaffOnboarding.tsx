import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { CalendarCheck, Users, ArrowRight } from 'lucide-react';

export const StaffOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { companyId, fullName, markTutorialCompleted } = useAuth();
  const [businessName, setBusinessName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { accent, colors, classes } = useBrutalTheme();

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

  const firstName = fullName?.split(' ')[0];

  return (
    <div className={`relative min-h-screen ${colors.bg} ${colors.text} font-sans overflow-hidden flex items-center justify-center p-6 md:p-12`}>

      {/* Glow de fundo temático */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] opacity-20 pointer-events-none"
        style={{ background: accent.hex }}
      />

      {/* Card central */}
      <div className={`relative z-10 w-full max-w-md ${colors.card} border ${colors.border} rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] p-8 md:p-10`}>

        {/* Branding */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img
            src="/logo-agendix-icon.png"
            alt=""
            className="w-6 h-6 opacity-90"
            draggable={false}
          />
          <span className="font-heading text-base font-bold tracking-tight">AgendiX</span>
        </div>

        {/* Saudação */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
            {firstName ? `Olá, ${firstName}!` : 'Bem-vindo!'}
          </h1>

          {businessName ? (
            <p className="text-sm leading-relaxed text-muted-foreground max-w-[280px] mx-auto">
              Você foi adicionado à equipe da{' '}
              <span className={`${accent.text} font-semibold`}>{businessName}</span>.
              Tudo pronto para começar.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
              Sua conta foi criada. Tudo pronto para começar.
            </p>
          )}
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.bgDim}`}>
              <CalendarCheck className={`w-5 h-5 ${accent.text}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">Sua Agenda</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Atendimentos do dia, horários e clientes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.bgDim}`}>
              <Users className={`w-5 h-5 ${accent.text}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">Sua Equipe</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Acesso compartilhado com o restante da equipe
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={loading}
          className={`w-full py-4 font-bold rounded-xl transition-all duration-200
                     flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50
                     ${classes.buttonPrimary}`}
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

      {/* Footer fora do card */}
      <p className="absolute bottom-5 left-0 right-0 text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
        © {new Date().getFullYear()} AgendiX
      </p>

    </div>
  );
};
