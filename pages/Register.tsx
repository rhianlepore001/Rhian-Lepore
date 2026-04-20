import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Screw } from '../components/Screw';
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

  // Busca tema e nome do estabelecimento que convidou o colaborador
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

  // ─── Classes reutilizáveis ────────────────────────────────────────────────
  const inputClass = isBeauty
    ? 'w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all bg-white/5 border border-white/10 focus:border-beauty-neon/50 focus:bg-white/8 font-sans'
    : 'w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all bg-black/30 border border-neutral-700/60 font-mono focus:border-accent-gold/60 focus:bg-black/50';

  const labelClass = `text-xs font-semibold uppercase tracking-wider ${isBeauty ? 'text-neutral-400' : 'text-neutral-500 font-mono'}`;

  const segmentBtnClass = (active: boolean, variant: 'barber' | 'beauty') => {
    const base = 'flex flex-col items-center justify-center p-4 rounded-xl transition-all border cursor-pointer';
    if (active) {
      return variant === 'barber'
        ? `${base} bg-accent-gold/10 border-accent-gold/80 text-accent-gold`
        : `${base} bg-beauty-neon/10 border-beauty-neon/80 text-beauty-neon`;
    }
    return `${base} bg-white/[0.03] border-white/8 text-neutral-500 hover:border-white/15 hover:text-neutral-400`;
  };

  const regionBtnClass = (active: boolean) => {
    const base = 'flex-1 py-3 text-xs font-semibold rounded-xl transition-all border cursor-pointer';
    if (active) {
      return isBeauty
        ? `${base} bg-beauty-neon/10 border-beauty-neon/80 text-white`
        : `${base} bg-accent-gold/10 border-accent-gold/80 text-accent-gold`;
    }
    return `${base} bg-white/[0.03] border-white/8 text-neutral-500 hover:border-white/15 hover:text-neutral-400`;
  };

  // ─── STAFF CONVIDADO ──────────────────────────────────────────────────────
  if (isInvitedStaff) {
    const inviteAccent = isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40';
    const inviteBtnClass = isBeauty
      ? 'bg-beauty-neon text-white hover:bg-beauty-neonHover shadow-[0_4px_20px_rgba(167,139,250,0.3)]'
      : 'bg-accent-gold text-black hover:bg-accent-goldHover shadow-[0_4px_20px_rgba(194,155,64,0.25)]';
    const inviteInputClass = isBeauty
      ? 'w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all bg-white/5 border border-white/10 focus:border-beauty-neon/50 font-sans'
      : 'w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all bg-black/30 border border-neutral-700/60 font-mono focus:border-accent-gold/60';

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}`}>
        <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] ${isBeauty ? 'bg-beauty-neon/[0.04]' : 'bg-accent-gold/[0.04]'} rounded-full blur-[120px] pointer-events-none`} />

        <div className={`w-full max-w-md relative z-10 bg-[#1C1C1C] rounded-2xl border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden`}>
          {!isBeauty && <Screw className="top-[-10px] left-[-10px] text-neutral-800" />}
          {!isBeauty && <Screw className="top-[-10px] right-[-10px] text-neutral-800" />}
          {!isBeauty && <Screw className="bottom-[-10px] left-[-10px] text-neutral-800" />}
          {!isBeauty && <Screw className="bottom-[-10px] right-[-10px] text-neutral-800" />}

          {/* Accent top */}
          <div className={`h-[2px] ${inviteAccent} w-full`} />

          <div className="p-8 space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <AgenXLogo size={28} isBeauty={isBeauty} showText={true} />
            </div>

            <div>
              <h1 className="font-heading text-2xl uppercase text-white tracking-tight">
                Você foi convidado
              </h1>
              <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mt-1">
                {ownerBusinessName ? `Junte-se à equipe de ${ownerBusinessName}` : 'Crie sua conta para acessar a agenda da equipe'}
              </p>
            </div>

            {error && (
              <div role="alert" className="p-3.5 text-xs rounded-xl bg-red-500/8 border border-red-500/30 text-red-400 font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="staff-name" className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono">
                  Nome completo
                </label>
                <input
                  id="staff-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inviteInputClass}
                  placeholder="João Silva"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="staff-phone" className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono">
                  WhatsApp
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  className={inviteInputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="staff-email" className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono">
                  Email
                </label>
                <input
                  id="staff-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inviteInputClass}
                  placeholder="contato@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="staff-password" className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono">Senha</label>
                  <div className="relative">
                    <input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inviteInputClass}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="staff-confirm" className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono">Confirmar</label>
                  <div className="relative">
                    <input
                      id="staff-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inviteInputClass}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1">
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-2 h-12 rounded-xl font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 ${inviteBtnClass}`}
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <><Check size={15} /> Criar minha conta</>
                }
              </button>

              <div className="text-center pt-4 border-t border-white/5 font-mono text-xs">
                <span className="text-neutral-600 uppercase tracking-wider">Já tem conta? </span>
                <Link to="/login" className="uppercase tracking-wider font-bold text-accent-gold/70 hover:text-accent-gold transition-colors">
                  Fazer login
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="absolute bottom-5 font-mono text-xs text-white/15 uppercase tracking-[0.2em]">
          AgenX • v2.0
        </div>
      </div>
    );
  }

  // ─── REGISTRO COMPLETO ────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 py-10 relative overflow-hidden
      ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}
    `}>
      {isBeauty
        ? <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-beauty-neon/[0.05] rounded-full blur-[120px] pointer-events-none" />
        : <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-gold/[0.04] rounded-full blur-[120px] pointer-events-none" />
      }

      <div className={`w-full max-w-3xl relative z-10 overflow-hidden
        ${isBeauty
          ? 'rounded-3xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)]'
          : 'rounded-2xl border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.7)]'}
      `}>

        {/* Accent top line */}
        <div className={`h-[2px] w-full ${isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40'}`} />

        {/* Header */}
        <div className={`flex items-center justify-between px-8 py-5 border-b
          ${isBeauty ? 'bg-beauty-card/90 backdrop-blur-xl border-white/5' : 'bg-[#161616] border-white/5'}
        `}>
          <AgenXLogo size={30} isBeauty={isBeauty} showText={true} />
          <div className="text-right">
            <p className="font-heading text-sm text-white uppercase tracking-tight">Criar conta</p>
            <p className={`font-mono text-xs uppercase tracking-widest mt-0.5
              ${isBeauty ? 'text-beauty-silver/30' : 'text-neutral-600'}
            `}>
              Configure seu espaço de trabalho
            </p>
          </div>
        </div>

        {/* Corpo do formulário */}
        <form onSubmit={handleRegister} className={`p-8 md:p-10 relative
          ${isBeauty ? 'bg-beauty-card/80 backdrop-blur-xl' : 'bg-[#1C1C1C]'}
        `}>
          {!isBeauty && (
            <>
              <Screw className="top-[-10px] left-[-10px] text-neutral-800" />
              <Screw className="top-[-10px] right-[-10px] text-neutral-800" />
              <Screw className="bottom-[-10px] left-[-10px] text-neutral-800" />
              <Screw className="bottom-[-10px] right-[-10px] text-neutral-800" />
            </>
          )}

          {error && (
            <div role="alert" className={`mb-6 p-3.5 text-xs rounded-xl border
              ${isBeauty
                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                : 'bg-red-500/8 border-red-500/30 text-red-400 font-mono'}
            `}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* ── Coluna 1 ── */}
            <div className="space-y-5">

              {/* Segmento */}
              <div className="space-y-2">
                <label className={labelClass}>Segmento</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    data-testid="category-barber"
                    aria-label="Barbearia"
                    aria-pressed={userType === 'barber'}
                    type="button"
                    onClick={() => setUserType('barber')}
                    className={segmentBtnClass(userType === 'barber', 'barber')}
                  >
                    <AgenXLogo size={26} isBeauty={false} showText={false} className="mb-2" />
                    <span className="font-heading text-sm uppercase tracking-tight">Barber</span>
                  </button>
                  <button
                    data-testid="category-beauty"
                    aria-label="Salão de Beleza"
                    aria-pressed={userType === 'beauty'}
                    type="button"
                    onClick={() => setUserType('beauty')}
                    className={segmentBtnClass(userType === 'beauty', 'beauty')}
                  >
                    <AgenXLogo size={26} isBeauty={true} showText={false} className="mb-2" />
                    <span className="font-heading text-sm uppercase tracking-tight">Beauty</span>
                  </button>
                </div>
              </div>

              {/* Região */}
              <div className="space-y-2">
                <label className={labelClass}>Região &amp; moeda</label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    aria-pressed={region === 'BR'}
                    onClick={() => setRegion('BR')}
                    className={regionBtnClass(region === 'BR')}
                  >
                    <span className="block font-mono text-xs tracking-widest opacity-40 mb-0.5">BR</span>
                    Brasil · BRL
                  </button>
                  <button
                    type="button"
                    aria-pressed={region === 'PT'}
                    onClick={() => setRegion('PT')}
                    className={regionBtnClass(region === 'PT')}
                  >
                    <span className="block font-mono text-xs tracking-widest opacity-40 mb-0.5">PT</span>
                    Portugal · EUR
                  </button>
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <label htmlFor="reg-name" className={labelClass}>Seu nome</label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  placeholder="João Silva"
                />
              </div>

            </div>

            {/* ── Coluna 2 ── */}
            <div className="space-y-5">

              <div className="space-y-1.5">
                <label htmlFor="reg-business" className={labelClass}>Nome do negócio</label>
                <input
                  id="reg-business"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={inputClass}
                  placeholder="Barbearia Silva"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-phone" className={labelClass}>WhatsApp</label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-email" className={labelClass}>Email profissional</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="reg-password" className={labelClass}>Senha</label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="reg-confirm" className={labelClass}>Confirmar</label>
                  <div className="relative">
                    <input
                      id="reg-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1">
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-xl font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40
                ${isBeauty
                  ? 'bg-beauty-neon text-white hover:bg-beauty-neonHover shadow-[0_4px_20px_rgba(167,139,250,0.3)] hover:shadow-[0_6px_24px_rgba(167,139,250,0.45)]'
                  : 'bg-accent-gold text-black hover:bg-accent-goldHover shadow-[0_4px_20px_rgba(194,155,64,0.25)] hover:shadow-[0_6px_24px_rgba(194,155,64,0.4)]'}
              `}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <><Check size={15} /> Finalizar cadastro</>
              }
            </button>

            <p className="text-center font-mono text-xs text-neutral-600 uppercase tracking-widest">
              Ao se cadastrar, você concorda com os{' '}
              <a href="#" className="underline hover:text-neutral-300 transition-colors">Termos</a>
              {' '}e{' '}
              <a href="#" className="underline hover:text-neutral-300 transition-colors">Privacidade</a>
            </p>
          </div>

          <div className="text-center mt-7 pt-6 border-t border-white/5 font-mono text-xs">
            <span className="text-neutral-600 uppercase tracking-wider">Já tem conta? </span>
            <Link
              to="/login"
              className={`uppercase tracking-wider font-bold transition-colors
                ${isBeauty ? 'text-beauty-neon/70 hover:text-beauty-neon' : 'text-accent-gold/70 hover:text-accent-gold'}
              `}
            >
              Fazer login
            </Link>
          </div>
        </form>
      </div>

      <div className="absolute bottom-5 font-mono text-xs text-white/15 uppercase tracking-[0.2em]">
        AgenX • v2.0
      </div>
    </div>
  );
};
