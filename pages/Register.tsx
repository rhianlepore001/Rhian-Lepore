import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Screw } from '../components/Screw';
import { Check, Eye, EyeOff, Zap, Sparkles } from 'lucide-react';
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

  const isBeauty = userType === 'beauty';

  useEffect(() => {
    const typeFromUrl = searchParams.get('type') as UserType;
    if (typeFromUrl && (typeFromUrl === 'barber' || typeFromUrl === 'beauty')) {
      setUserType(typeFromUrl);
    }
  }, [searchParams]);

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
      phone
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-700
      ${isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main'}
    `}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {isBeauty ? (
          <>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-beauty-neon/5 rounded-full blur-[150px]"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-beauty-neon/5 rounded-full blur-[150px]"></div>
          </>
        ) : (
          <>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-gold/5 rounded-full blur-[150px]"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-gold/5 rounded-full blur-[150px]"></div>
          </>
        )}
      </div>

      <div className={`w-full max-w-2xl relative z-10 transition-all duration-500
        ${isBeauty ? 'bg-beauty-card/80 backdrop-blur-xl border border-white/10 shadow-soft rounded-3xl' : 'bg-brutal-card border-4 border-black shadow-heavy'}
      `}>

        {/* Header Branding */}
        <div className={`flex justify-center items-center py-6 border-b transition-all duration-500
          ${isBeauty ? 'border-white/5 bg-transparent' : 'border-black bg-black'}
        `}>
          <AgenXLogo size={40} isBeauty={isBeauty} showText={true} />
        </div>

        <form onSubmit={handleRegister} className="p-8 md:p-12">
          {!isBeauty && (
            <>
              <Screw className="top-[-10px] left-[-10px] text-neutral-800" />
              <Screw className="top-[-10px] right-[-10px] text-neutral-800" />
              <Screw className="bottom-[-10px] left-[-10px] text-neutral-800" />
              <Screw className="bottom-[-10px] right-[-10px] text-neutral-800" />
            </>
          )}

          <div className="mb-10 text-center">
            <h1 className={`font-heading text-3xl uppercase mb-2 ${isBeauty ? 'text-white' : 'text-white'}`}>Criar sua Conta</h1>
            <p className={`text-sm ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>
              Junte-se à elite da gestão inteligente.
            </p>
          </div>

          {error && (
            <div className={`mb-6 p-4 text-xs text-center border ${isBeauty ? 'bg-red-500/10 border-red-500/20 text-red-200 rounded-xl' : 'bg-red-500/10 border-red-500 text-red-500 font-mono'}`}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className={`text-[10px] uppercase font-bold tracking-widest ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>Domínio</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setUserType('barber')}
                    className={`flex flex-col items-center justify-center p-6 transition-all border-2
                      ${userType === 'barber'
                        ? 'bg-accent-gold/10 border-accent-gold text-accent-gold shadow-glow'
                        : 'bg-black/40 border-neutral-800 text-neutral-600 hover:border-neutral-700'}
                      ${isBeauty ? 'rounded-2xl' : ''}
                    `}
                  >
                    <AgenXLogo size={32} isBeauty={false} showText={false} className="mb-2" />
                    <span className="text-[10px] font-mono opacity-50 mb-1">UNIFIED</span>
                    <span className="font-heading font-bold tracking-tighter text-sm uppercase">Barber</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('beauty')}
                    className={`flex flex-col items-center justify-center p-6 transition-all border-2
                      ${userType === 'beauty'
                        ? 'bg-beauty-neon/10 border-beauty-neon text-beauty-neon shadow-neon'
                        : 'bg-black/40 border-neutral-800 text-neutral-600 hover:border-neutral-700'}
                      ${isBeauty ? 'rounded-2xl' : ''}
                    `}
                  >
                    <AgenXLogo size={32} isBeauty={true} showText={false} className="mb-2" />
                    <span className="text-[10px] font-mono opacity-50 mb-1">UNIFIED</span>
                    <span className="font-heading font-bold tracking-tighter text-sm uppercase">Beauty</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] uppercase font-bold tracking-widest ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>Região & Moeda</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRegion('BR')}
                    className={`p-4 text-xs font-bold transition-all border-2
                      ${region === 'BR'
                        ? (isBeauty ? 'bg-beauty-neon/10 border-beauty-neon text-white' : 'bg-accent-gold/10 border-accent-gold text-accent-gold')
                        : 'bg-black/20 border-neutral-800 text-neutral-600'}
                      ${isBeauty ? 'rounded-xl' : ''}
                    `}
                  >
                    BR BRASIL (BRL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegion('PT')}
                    className={`p-4 text-xs font-bold transition-all border-2
                      ${region === 'PT'
                        ? (isBeauty ? 'bg-beauty-neon/10 border-beauty-neon text-white' : 'bg-accent-gold/10 border-accent-gold text-accent-gold')
                        : 'bg-black/20 border-neutral-800 text-neutral-600'}
                      ${isBeauty ? 'rounded-xl' : ''}
                    `}
                  >
                    PT PORTUGAL (EUR)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold tracking-widest ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>Seu Nome</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full p-4 text-sm text-white focus:outline-none transition-all
                    ${isBeauty ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50' : 'bg-black/40 border-2 border-neutral-800 font-mono focus:border-accent-gold'}
                  `}
                  placeholder="EX: JOÃO SILVA"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold tracking-widest ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>Nome do Negócio</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={`w-full p-4 text-sm text-white focus:outline-none transition-all
                    ${isBeauty ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50' : 'bg-black/40 border-2 border-neutral-800 font-mono focus:border-accent-gold'}
                  `}
                  placeholder="EX: STUDIO GLOW"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold tracking-widest ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>WhatsApp</label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  className={`w-full p-4 text-sm text-white focus:outline-none transition-all
                    ${isBeauty ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50' : 'bg-black/40 border-2 border-neutral-800 font-mono focus:border-accent-gold'}
                  `}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold tracking-widest ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>Email Profissional</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full p-4 text-sm text-white focus:outline-none transition-all
                    ${isBeauty ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50' : 'bg-black/40 border-2 border-neutral-800 font-mono focus:border-accent-gold'}
                  `}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`text-[10px] uppercase font-bold tracking-widest ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full p-4 text-sm text-white focus:outline-none transition-all
                        ${isBeauty ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50' : 'bg-black/40 border-2 border-neutral-800 font-mono focus:border-accent-gold'}
                      `}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={`text-[10px] uppercase font-bold tracking-widest ${isBeauty ? 'text-neutral-400 font-sans' : 'text-neutral-500 font-mono'}`}>Confirmar</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full p-4 text-sm text-white focus:outline-none transition-all
                        ${isBeauty ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50' : 'bg-black/40 border-2 border-neutral-800 font-mono focus:border-accent-gold'}
                      `}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full p-5 font-heading text-xl uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50
                ${isBeauty
                  ? 'bg-beauty-neon text-white hover:shadow-neon rounded-2xl'
                  : 'bg-accent-gold text-black border-2 border-black shadow-heavy hover:translate-y-[-2px]'}
              `}
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isBeauty ? <Sparkles size={24} /> : <Zap size={24} fill="black" />}
                  Finalizar Cadastro
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-neutral-500 uppercase font-mono tracking-widest">
              Ao se cadastrar, você concorda com nossos <a href="#" className="underline">Termos</a> e <a href="#" className="underline">Privacidade</a>.
            </p>
          </div>

          <div className="text-center mt-12 pt-8 border-t border-white/5 font-mono text-xs">
            <span className="text-neutral-600 uppercase">Já possui uma conta? </span>
            <Link
              to="/login"
              className={`uppercase font-bold transition-all ${isBeauty ? 'text-beauty-neon hover:text-white' : 'text-accent-gold hover:text-white'}`}
            >
              Fazer Login
            </Link>
          </div>
        </form>
      </div>

      <div className="absolute bottom-6 text-[10px] text-white/20 font-mono uppercase tracking-[0.2em]">
        AgenX Management Flow • v2.0
      </div>
    </div>
  );
};