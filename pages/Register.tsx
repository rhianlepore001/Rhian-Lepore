import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Check, Eye, EyeOff } from 'lucide-react';
import { useAuth, UserType, Region } from '../contexts/AuthContext';
import { PhoneInput } from '../components/PhoneInput';
import { validatePassword } from '../utils/passwordValidation';
import { AgenXLogo } from '../components/AgenXLogo';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<UserType>((searchParams.get('type') as UserType) || 'barber');
  const [region, setRegion] = useState<Region>('BR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const companyIdFromUrl = searchParams.get('company');
  const isInvitedStaff = !!companyIdFromUrl;
  const isBeauty = userType === 'beauty';
  const [ownerBusinessName, setOwnerBusinessName] = useState<string>('');

  useEffect(() => {
    const typeFromUrl = searchParams.get('type') as UserType;
    if (typeFromUrl && (typeFromUrl === 'barber' || typeFromUrl === 'beauty')) {
      setUserType(typeFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!companyIdFromUrl) return;
    supabase
      .rpc('get_company_for_invite', { p_company_id: companyIdFromUrl })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.user_type === 'barber' || row?.user_type === 'beauty') {
          setUserType(row.user_type as UserType);
        }
        if (row?.business_name) {
          setOwnerBusinessName(row.business_name);
        }
      });
  }, [companyIdFromUrl]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(', '));
      setLoading(false);
      return;
    }

    const { error } = await register({
      email,
      password,
      fullName,
      businessName,
      userType,
      region,
      phone,
      companyId: companyIdFromUrl || undefined
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (isInvitedStaff) {
        navigate('/staff-onboarding');
      } else {
        navigate('/onboarding');
      }
    }
  };

  const inputClass = isBeauty
    ? 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none transition-all bg-white/5 border border-white/10 focus:border-beauty-neon/50 focus:bg-white/8 font-sans'
    : 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none transition-all bg-black/30 border border-neutral-700/60 font-mono focus:border-accent-gold/60 focus:bg-black/50';

  const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isBeauty ? 'text-neutral-400' : 'text-neutral-500 font-mono'}`;

  const eyeBtn = 'absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1';

  const primaryBtn = `w-full h-12 rounded-xl font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 ${isBeauty
      ? 'bg-beauty-neon text-white hover:bg-beauty-neonHover shadow-[0_4px_20px_rgba(167,139,250,0.3)] hover:shadow-[0_6px_24px_rgba(167,139,250,0.45)]'
      : 'bg-accent-gold text-black hover:bg-accent-goldHover shadow-[0_4px_20px_rgba(194,155,64,0.25)] hover:shadow-[0_6px_24px_rgba(194,155,64,0.4)]'
    }`;

  const regionBtnClass = (active: boolean) =>
    `flex-1 py-3 text-xs font-semibold rounded-xl transition-all border cursor-pointer ${active
      ? isBeauty
        ? 'bg-beauty-neon/10 border-beauty-neon/80 text-white'
        : 'bg-accent-gold/10 border-accent-gold/80 text-accent-gold'
      : 'bg-white/[0.03] border-white/8 text-neutral-500 hover:border-white/15 hover:text-neutral-400'
    }`;

  // ─── STAFF CONVIDADO ──────────────────────────────────────────────────────
  if (isInvitedStaff) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}`}>
        <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] ${isBeauty ? 'bg-beauty-neon/[0.04]' : 'bg-accent-gold/[0.04]'} rounded-full blur-[120px] pointer-events-none`} />

        <div className="w-full max-w-md relative z-10">
          <div className="relative bg-[#1C1C1C] rounded-2xl border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden">

            <div className={`h-[2px] w-full ${isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40'}`} />

            <div className="p-8 space-y-6">
              <div>
                <AgenXLogo size={28} isBeauty={isBeauty} showText={true} />
                <h1 className="font-heading text-2xl uppercase text-white tracking-tight mt-5">
                  Você foi convidado
                </h1>
                <p className={`text-xs font-mono uppercase tracking-widest mt-1.5 ${isBeauty ? 'text-beauty-neon/50' : 'text-accent-gold/50'}`}>
                  {ownerBusinessName ? `Junte-se à equipe · ${ownerBusinessName}` : 'Crie sua conta para acessar a equipe'}
                </p>
              </div>

              {error && (
                <div role="alert" className="p-3.5 text-xs rounded-xl bg-red-500/8 border border-red-500/30 text-red-400 font-mono">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="staff-name" className={labelClass}>Nome completo</label>
                  <input id="staff-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="João Silva" />
                </div>

                <div>
                  <label htmlFor="staff-phone" className={labelClass}>WhatsApp</label>
                  <PhoneInput value={phone} onChange={setPhone} className={inputClass} />
                </div>

                <div>
                  <label htmlFor="staff-email" className={labelClass}>Email</label>
                  <input id="staff-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="contato@email.com" />
                </div>

                <div>
                  <label htmlFor="staff-password" className={labelClass}>Senha</label>
                  <div className="relative">
                    <input id="staff-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className={eyeBtn}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="staff-confirm" className={labelClass}>Confirmar senha</label>
                  <div className="relative">
                    <input id="staff-confirm" type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'} className={eyeBtn}>
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className={`${primaryBtn} mt-2`}>
                  {loading
                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <><Check size={14} /> Criar minha conta</>
                  }
                </button>

                <p className="text-center pt-5 border-t border-white/5 font-mono text-xs text-neutral-600 uppercase tracking-wider">
                  Já tem conta?{' '}
                  <Link to="/login" className={`font-bold transition-colors ${isBeauty ? 'text-beauty-neon/70 hover:text-beauty-neon' : 'text-accent-gold/70 hover:text-accent-gold'}`}>
                    Fazer login
                  </Link>
                </p>
              </form>
            </div>
          </div>

          <p className="text-center mt-6 font-mono text-xs text-white/15 uppercase tracking-[0.2em]">AgendiX · v2.0</p>
        </div>
      </div>
    );
  }

  // ─── REGISTRO COMPLETO ────────────────────────────────────────────────────
  const subtitle = isBeauty ? 'Seu salão configurado em minutos' : 'Sua barbearia pronta em minutos';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 py-10 relative overflow-hidden ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}`}>
      {isBeauty
        ? <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-beauty-neon/[0.05] rounded-full blur-[120px] pointer-events-none" />
        : <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-gold/[0.04] rounded-full blur-[120px] pointer-events-none" />
      }

      <div className="w-full max-w-2xl relative z-10">
        <div className={`relative overflow-hidden ${isBeauty
            ? 'rounded-3xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)]'
            : 'rounded-2xl border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.7)]'
          }`}>
          <div className={`h-[2px] w-full ${isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40'}`} />

          {/* Header */}
          <div className={`flex items-center justify-between px-8 py-5 border-b ${isBeauty ? 'bg-beauty-card/90 backdrop-blur-xl border-white/5' : 'bg-[#161616] border-white/5'
            }`}>
            <AgenXLogo size={30} isBeauty={isBeauty} showText={true} />
            <div className="text-right">
              <p className="font-heading text-sm text-white uppercase tracking-tight">Criar conta</p>
              <p className={`font-mono text-xs uppercase tracking-widest mt-0.5 ${isBeauty ? 'text-beauty-neon/40' : 'text-accent-gold/40'}`}>
                {subtitle}
              </p>
            </div>
          </div>

          {/* Corpo */}
          <div className={`px-8 py-8 md:px-10 ${isBeauty ? 'bg-beauty-card/80 backdrop-blur-xl' : 'bg-[#1C1C1C]'}`}>

            {error && (
              <div role="alert" className={`mb-6 p-3.5 text-xs rounded-xl border ${isBeauty ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-500/8 border-red-500/30 text-red-400 font-mono'
                }`}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-6">

              {/* Segmento — decisão principal, full-width acima do grid */}
              <div>
                <label className={labelClass}>Segmento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    data-testid="category-barber"
                    aria-pressed={userType === 'barber'}
                    type="button"
                    onClick={() => setUserType('barber')}
                    className={`flex items-center gap-3 px-5 py-4 rounded-xl transition-all border cursor-pointer ${userType === 'barber'
                        ? 'bg-accent-gold/10 border-accent-gold/80 text-accent-gold'
                        : 'bg-white/[0.03] border-white/8 text-neutral-500 hover:border-white/15 hover:text-neutral-400'
                      }`}
                  >
                    <AgenXLogo size={20} isBeauty={false} showText={false} />
                    <div className="text-left">
                      <p className="font-heading text-sm uppercase tracking-tight leading-none">Barbearia</p>
                      <p className="font-mono text-[10px] text-current opacity-50 mt-0.5">Barber shop</p>
                    </div>
                  </button>
                  <button
                    data-testid="category-beauty"
                    aria-pressed={userType === 'beauty'}
                    type="button"
                    onClick={() => setUserType('beauty')}
                    className={`flex items-center gap-3 px-5 py-4 rounded-xl transition-all border cursor-pointer ${userType === 'beauty'
                        ? 'bg-beauty-neon/10 border-beauty-neon/80 text-beauty-neon'
                        : 'bg-white/[0.03] border-white/8 text-neutral-500 hover:border-white/15 hover:text-neutral-400'
                      }`}
                  >
                    <AgenXLogo size={20} isBeauty={true} showText={false} />
                    <div className="text-left">
                      <p className="font-heading text-sm uppercase tracking-tight leading-none">Studio</p>
                      <p className="font-mono text-[10px] text-current opacity-50 mt-0.5">Beauty salon</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Grid 2 colunas com densidade equilibrada */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

                {/* Coluna 1: dados pessoais + região */}
                <div className="space-y-5">
                  <div>
                    <label htmlFor="reg-name" className={labelClass}>Seu nome</label>
                    <input id="reg-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="João Silva" />
                  </div>

                  <div>
                    <label htmlFor="reg-phone" className={labelClass}>WhatsApp</label>
                    <PhoneInput value={phone} onChange={setPhone} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Região e moeda</label>
                    <div className="flex gap-2">
                      <button type="button" aria-pressed={region === 'BR'} onClick={() => setRegion('BR')} className={regionBtnClass(region === 'BR')}>
                        Brasil · BRL
                      </button>
                      <button type="button" aria-pressed={region === 'PT'} onClick={() => setRegion('PT')} className={regionBtnClass(region === 'PT')}>
                        Portugal · EUR
                      </button>
                    </div>
                  </div>
                </div>

                {/* Coluna 2: dados do negócio + acesso */}
                <div className="space-y-5">
                  <div>
                    <label htmlFor="reg-business" className={labelClass}>Nome do negócio</label>
                    <input
                      id="reg-business"
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className={inputClass}
                      placeholder={isBeauty ? 'Studio Bella' : 'Barbearia Silva'}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-email" className={labelClass}>Email</label>
                    <input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="contato@empresa.com" />
                  </div>

                  <div>
                    <label htmlFor="reg-password" className={labelClass}>Senha</label>
                    <div className="relative">
                      <input id="reg-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className={eyeBtn}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmar senha full-width — campo de verificação merece espaço */}
              <div>
                <label htmlFor="reg-confirm" className={labelClass}>Confirmar senha</label>
                <div className="relative">
                  <input id="reg-confirm" type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'} className={eyeBtn}>
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2 space-y-4">
                <button type="submit" disabled={loading} className={primaryBtn}>
                  {loading
                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <><Check size={14} /> Finalizar cadastro</>
                  }
                </button>

                <p className="text-center font-mono text-xs text-neutral-600 uppercase tracking-widest">
                  Ao se cadastrar, você concorda com os{' '}
                  <a href="#" className="underline hover:text-neutral-300 transition-colors">Termos</a>
                  {' '}e{' '}
                  <a href="#" className="underline hover:text-neutral-300 transition-colors">Privacidade</a>
                </p>

                <p className="text-center border-t border-white/5 pt-5 font-mono text-xs text-neutral-600 uppercase tracking-wider">
                  Já tem conta?{' '}
                  <Link to="/login" className={`font-bold transition-colors ${isBeauty ? 'text-beauty-neon/70 hover:text-beauty-neon' : 'text-accent-gold/70 hover:text-accent-gold'}`}>
                    Fazer login
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center mt-6 font-mono text-xs text-white/15 uppercase tracking-[0.2em]">AgendiX · v2.0</p>
      </div>
    </div>
  );
};
