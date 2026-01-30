import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Screw } from '../components/Screw';
import { Scissors, Sparkles, Zap, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth, UserType, Region } from '../contexts/AuthContext';
import { PhoneInput } from '../components/PhoneInput';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [type, setType] = useState<UserType>('barber');
  const [region, setRegion] = useState<Region>('BR');

  // Read type from URL parameter
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'beauty' || typeParam === 'barber') {
      setType(typeParam as UserType);
    }
  }, [searchParams]);

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false); // NEW STATE

  // Dynamic Styles based on Type
  const isBarber = type === 'barber';

  const styles = {
    bg: isBarber ? 'bg-brutal-main' : 'bg-beauty-dark',
    cardBg: isBarber ? 'bg-brutal-card' : 'bg-beauty-card',
    accent: isBarber ? 'text-accent-gold' : 'text-beauty-neon',
    border: isBarber ? 'border-accent-gold' : 'border-beauty-neon',
    button: isBarber ? 'bg-accent-gold hover:bg-accent-goldHover text-black' : 'bg-beauty-neon hover:bg-beauty-neonHover text-black',
    screw: isBarber ? 'text-neutral-800' : 'text-beauty-silver',
    inputFocus: isBarber ? 'focus:border-accent-gold' : 'focus:border-beauty-neon focus:shadow-[0_0_10px_rgba(167,139,250,0.2)]',
    inputBg: isBarber ? 'bg-black/40' : 'bg-beauty-dark/50',
    inputBorder: isBarber ? 'border-neutral-800' : 'border-beauty-neon/20',
    inputRadius: isBarber ? 'rounded-none' : 'rounded-xl',
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            business_name: businessName,
            phone,
            region,
            type
          }
        }
      });

      if (error) throw error;

      // If auto-confirm is enabled, we can log them in directly or let the AuthContext handle the session change
      // For now, we'll try to login immediately if session is returned, otherwise ask to check email
      if (data.session) {
        navigate('/onboarding');
      } else {
        alert('Cadastro realizado! Verifique seu email para confirmar.');
        navigate('/login');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`h-screen ${styles.bg} relative overflow-y-auto transition-colors duration-700`}>

      {/* Background Atmosphere */}
      {!isBarber && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-beauty-neon/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-900/20 rounded-full blur-[100px]"></div>
        </div>
      )}
      {isBarber && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent-gold/5 to-transparent"></div>
        </div>
      )}

      <div className="flex items-center justify-center p-4 py-8">
        <div className={`w-full max-w-lg relative z-10 ${styles.cardBg} transition-all duration-500 my-8
          ${isBarber
            ? 'border-4 border-black shadow-heavy'
            : 'border border-beauty-neon/30 rounded-2xl shadow-[0_0_30px_rgba(167,139,250,0.15)] bg-gradient-to-br from-beauty-card to-beauty-dark'}`}>
          {/* Top Header Bar */}
          <div className={`p-4 flex justify-between items-center transition-all ${isBarber ? 'bg-black border-b-4 border-white/10' : 'bg-beauty-dark/40 border-b border-white/5 rounded-t-2xl'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isBarber ? 'bg-accent-gold animate-pulse' : 'bg-beauty-neon animate-pulse'}`}></div>
              <span className="font-mono text-xs text-neutral-400 tracking-widest">CONFIGURAÇÃO INICIAL</span>
            </div>
            <div className="font-mono text-xs text-neutral-500"></div> {/* Removed ID */}
          </div>

          {/* THE SWITCHES - CONTROL PANEL */}
          <div className="p-6 md:p-8 space-y-8">

            {/* Type Selector */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setType('barber')}
                className={`h-20 border-2 relative flex flex-col items-center justify-center gap-2 transition-all duration-300 ${isBarber
                  ? 'bg-neutral-900 border-accent-gold shadow-[inset_0_0_20px_rgba(194,155,64,0.2)]'
                  : 'bg-transparent border-neutral-800 opacity-50 hover:opacity-80'
                  }`}
              >
                <Scissors className={`w-6 h-6 ${isBarber ? 'text-accent-gold' : 'text-neutral-600'}`} />
                <span className={`font-heading uppercase tracking-widest ${isBarber ? 'text-white' : 'text-neutral-600'}`}>Barber OS</span>
                {isBarber && <div className="absolute top-2 right-2 w-2 h-2 bg-accent-gold rounded-full shadow-[0_0_10px_#C29B40]"></div>}
              </button>

              <button
                onClick={() => setType('beauty')}
                className={`h-20 border-2 relative flex flex-col items-center justify-center gap-2 transition-all duration-300 ${!isBarber
                  ? 'bg-neutral-900 border-beauty-neon shadow-[inset_0_0_20px_rgba(255,0,255,0.2)]'
                  : 'bg-transparent border-neutral-800 opacity-50 hover:opacity-80'
                  }`}
              >
                <Sparkles className={`w-6 h-6 ${!isBarber ? 'text-beauty-neon' : 'text-neutral-600'}`} />
                <span className={`font-heading uppercase tracking-widest ${!isBarber ? 'text-white' : 'text-neutral-600'}`}>Beauty OS</span>
                {!isBarber && <div className="absolute top-2 right-2 w-2 h-2 bg-beauty-neon rounded-full shadow-[0_0_10px_#FF00FF]"></div>}
              </button>
            </div>

            {/* Region Selector */}
            <div className="bg-black/30 p-1 flex justify-between items-center border border-white/5">
              <div className="flex-1 flex">
                <button
                  onClick={() => setRegion('BR')}
                  className={`flex-1 py-2 text-xs font-mono font-bold uppercase transition-all ${region === 'BR'
                    ? `${styles.bg} ${styles.accent} border border-white/10`
                    : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                >
                  🇧🇷 Brasil (BRL)
                </button>
                <button
                  onClick={() => setRegion('PT')}
                  className={`flex-1 py-2 text-xs font-mono font-bold uppercase transition-all ${region === 'PT'
                    ? `${styles.bg} ${styles.accent} border border-white/10`
                    : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                >
                  🇵🇹 Portugal (EUR)
                </button>
              </div>
            </div>

            {/* Dynamic Form */}
            <div className="space-y-4 relative">
              {/* Screws for visual anchor */}
              <Screw className={`top-[-10px] left-[-10px] ${styles.screw}`} />
              <Screw className={`top-[-10px] right-[-10px] ${styles.screw}`} />

              {error && (
                <div
                  role="alert"
                  className="bg-red-500/10 border border-red-500 text-red-500 p-3 text-xs font-mono text-center"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-neutral-500 ml-1">
                  {region === 'BR' ? 'Nome do Responsável' : 'Nome do Gerente'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full ${styles.inputBg} border-2 ${styles.inputBorder} ${styles.inputRadius} p-4 text-white font-mono text-sm focus:outline-none transition-all ${styles.inputFocus}`}
                  placeholder="SEU NOME COMPLETO"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-neutral-500 ml-1">
                  {type === 'barber' ? 'Nome da Barbearia' : (region === 'BR' ? 'Nome do Salão/Studio' : 'Nome do Salão/Espaço')}
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={`w-full ${styles.inputBg} border-2 ${styles.inputBorder} ${styles.inputRadius} p-4 text-white font-mono text-sm focus:outline-none transition-all ${styles.inputFocus}`}
                  placeholder={type === 'barber' ? "EX: CAVALHEIROS & NAVALHAS" : "EX: STUDIO GLOW"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-neutral-500 ml-1">
                    {region === 'BR' ? 'Celular / WhatsApp' : 'Telemóvel'}
                  </label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    defaultRegion={region}
                    forceTheme={type}
                    placeholder={region === 'BR' ? "(XX) 9XXXX-XXXX" : "+351 XXX XXX XXX"}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-neutral-500 ml-1">
                    Moeda Config
                  </label>
                  <div className={`w-full h-[54px] ${styles.inputBg} border-2 ${styles.inputBorder} ${styles.inputRadius} flex items-center px-4 text-neutral-400 font-mono text-sm`}>
                    {region === 'BR' ? 'R$ (Real)' : '€ (Euro)'}
                    <Check className="w-4 h-4 ml-auto opacity-50" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-neutral-500 ml-1">Email de Acesso</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full ${styles.inputBg} border-2 ${styles.inputBorder} ${styles.inputRadius} p-4 text-white font-mono text-sm focus:outline-none transition-all ${styles.inputFocus}`}
                  placeholder="admin@seudominio.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-neutral-500 ml-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} // Dynamic type
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full ${styles.inputBg} border-2 ${styles.inputBorder} ${styles.inputRadius} p-4 text-white font-mono text-sm focus:outline-none transition-all ${styles.inputFocus}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Submit */}
            <button
              onClick={handleRegister}
              disabled={loading}
              aria-busy={loading}
              className={`w-full ${styles.button} h-14 font-heading text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed
                ${isBarber
                  ? 'border-2 border-black shadow-heavy active:shadow-none active:translate-y-1'
                  : 'rounded-xl shadow-neon hover:shadow-neonStrong active:scale-95'}`}
            >
              {loading ? (
                <span className="animate-pulse flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  PROCESSANDO...
                </span>
              ) : (
                <>
                  <Zap className="w-5 h-5" fill="black" />
                  INICIAR SISTEMA
                </>
              )}
            </button>

            <div className="text-center space-y-2">
              <p className="text-neutral-500 text-xs font-mono">
                {/* Removed debug message */}
              </p>
              <Link to="/login" className={`text-xs font-bold font-mono uppercase ${styles.accent} border-b border-transparent hover:border-current transition-all`}>
                Já tenho conta // Login
              </Link>
            </div>

          </div>
        </div>

        {/* Visual Footer Text - REMOVED DEBUG TEXTS */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-[10px] text-neutral-700 font-mono uppercase tracking-[0.3em]">
            POWERED BY {type === 'barber' ? 'BARBER OS' : 'BEAUTY OS'}
          </p>
        </div>
      </div>
    </div>
  );
};