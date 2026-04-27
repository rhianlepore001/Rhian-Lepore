import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, LogOut, User as UserIcon, Settings, AlertTriangle, Compass, ArrowLeft, Scissors, Sparkles, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ProfileModal } from './ProfileModal';
import { useAppTour } from '../hooks/useAppTour';
import { useTheme } from '../contexts/ThemeContext';

export const Header: React.FC = () => {
  const { businessName, fullName, userType, logout, avatarUrl, isDev, setDevUserType, role } = useAuth();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { startTour } = useAppTour();
  const { mode, toggleMode } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isSettingsRoute = pathname.startsWith('/configuracoes');
  const isBeauty = userType === 'beauty';
  const accentColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const bgColor = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showNotifications || showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showProfileMenu]);

  // Fechar menus ao navegar
  useEffect(() => {
    setShowNotifications(false);
    setShowProfileMenu(false);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/clientes?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  const alertCount = alerts.length;

  return (
    <>
      <header className={`fixed left-0 ${!isSettingsRoute ? 'md:left-64' : ''} right-0 z-30 transition-all duration-300
        ${isBeauty
          ? 'bg-beauty-dark/40 backdrop-blur-2xl border-b border-white/5 shadow-promax-glass'
          : 'bg-brutal-main/40 backdrop-blur-2xl border-b border-white/5 shadow-promax-glass'}
      `}
        style={{ top: 'var(--header-top, 0)' }}
      >
        <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8">

          <div className="flex items-center gap-3">
            {isSettingsRoute ? (
              <Link to="/" className="flex items-center gap-3 group hover:opacity-90 transition-all ml-1 md:ml-0" title="Voltar ao Dashboard">
                <ArrowLeft className={`w-5 h-5 ${accentColor} opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-1`} />
                <div className="relative">
                  <div className={`absolute -inset-3 ${isBeauty ? 'bg-beauty-neon/20' : 'bg-accent-gold/20'} blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 rounded-full`} />
                  <div className="relative">
                    <img
                      src="/logo icon.png"
                      alt="AgendiX"
                      style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                {pathname !== '/' && (
                  <Link to="/" className="md:hidden flex items-center group hover:opacity-90 transition-all" title="Voltar ao Dashboard">
                    <ArrowLeft className={`w-5 h-5 ${accentColor} opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-1`} />
                  </Link>
                )}
                <div className="flex flex-col">
                  <h1 className="font-heading text-lg md:text-2xl text-white tracking-widest leading-none flex items-center gap-2">
                    {businessName || 'GESTÃO'}
                    <span
                      className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"
                      aria-label="Online"
                      title="Negócio ativo"
                    />
                  </h1>
                  <p className="text-[10px] md:text-xs font-mono mt-0.5 opacity-50 uppercase tracking-widest" style={{ color: 'inherit' }}>
                    {isBeauty ? 'Salão de Beleza' : 'Barbearia'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Center: Search (REMOVED) */}
          <div className="flex-1 hidden lg:block">
            {/* Espaço vazio para centralizar os elementos laterais, se necessário */}
          </div>

          {/* Right: Profile & Actions */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Dev Theme Switcher */}
            {isDev && (
              <button
                onClick={() => setDevUserType(isBeauty ? 'barber' : 'beauty')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono uppercase transition-all shadow-lg hover:scale-105 active:scale-95
                      ${isBeauty
                    ? 'bg-neutral-800 text-accent-gold border border-accent-gold/50'
                    : 'bg-beauty-dark text-beauty-neon border border-beauty-neon/50'}
                  `}
                title="Trocar Estilo (Modo DEV)"
              >
                {isBeauty ? <Scissors className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span className="hidden lg:inline">{isBeauty ? 'Viram Barber' : 'Virar Beauty'}</span>
              </button>
            )}

            {/* Tour Button (Temporariamente Oculto) */}
            {/*
            <button
              onClick={() => startTour('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono uppercase transition-colors
                    ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon hover:bg-beauty-neon/20' : 'bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20'}
                `}
            >
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">Tour</span>
            </button>
            */}

            {/* Theme Mode Toggle (Dark/Light) */}
            <button
              id="header-theme-toggle"
              onClick={toggleMode}
              aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={mode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              className={`p-2 rounded border border-transparent hover:border-neutral-700 transition-colors relative overflow-hidden
                ${isBeauty ? 'hover:bg-beauty-card' : 'hover:bg-neutral-800'}`}
              style={{ transition: 'background 0.2s' }}
            >
              <span
                style={{
                  display: 'block',
                  transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s',
                  transform: mode === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)',
                }}
              >
                {mode === 'dark'
                  ? <Moon className={`w-5 h-5 ${accentColor}`} />
                  : <Sun className={`w-5 h-5 ${accentColor}`} />}
              </span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                id="header-notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-neutral-800 rounded border border-transparent hover:border-neutral-700 transition-colors"
                aria-label="Abrir notificações"
                title="Notificações"
              >
                <Bell className="w-5 h-5 md:w-6 md:h-6 text-text-primary" />
                {alertCount > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 ${bgColor} rounded-full border-2 border-brutal-main animate-pulse flex items-center justify-center text-[9px] font-mono font-bold text-black leading-none`}
                  >
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className={`fixed inset-x-4 md:inset-auto md:absolute md:right-0 top-20 md:top-full mt-2 md:w-80 z-50 animate-in fade-in slide-in-from-top-2 shadow-promax-glass ring-1 ring-white/5
                ${isBeauty
                    ? 'bg-beauty-card border border-white/10 rounded-xl'
                    : 'bg-neutral-900 border border-white/10 rounded-xl'}
              `}>
                  <div className="p-3 border-b border-neutral-800 font-bold text-white uppercase text-xs tracking-wider">Avisos Importantes</div>
                  <div className="max-h-64 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <div className="p-4 text-center text-text-secondary text-xs">
                        <p className="text-sm">✅ Tudo certo!</p>
                        <p className="mt-1">Nenhum aviso no momento.</p>
                      </div>
                    ) : (
                      alerts.map(alert => (
                        <div
                          key={alert.id}
                          onClick={() => {
                            if (alert.actionPath) {
                              navigate(alert.actionPath);
                              setShowNotifications(false);
                            }
                          }}
                          className={`p-3 hover:bg-white/5 border-b border-neutral-800 last:border-0 cursor-pointer transition-colors group ${alert.actionPath ? '' : 'cursor-default'} ${alert.type === 'danger' ? 'border-l-2 border-l-red-500 pl-2' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-red-600' :
                              alert.type === 'warning' ? 'text-yellow-500' : 'text-green-500'
                              }`} />
                            <div className="flex-1">
                              <p className={`text-sm text-white ${alert.actionPath ? 'group-hover:text-accent-gold' : ''} transition-colors`}>
                                {alert.text}
                              </p>
                              <p className="text-xs text-text-secondary mt-1 uppercase tracking-wide">
                                {alert.type === 'danger' ? 'Urgente' : alert.type === 'warning' ? 'Atenção' : 'Info'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                id="header-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-0 md:pl-6 md:border-l-2 md:border-neutral-800 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-text-primary leading-tight">{fullName || 'Usuário'}</p>
                  <p className="text-xs text-text-secondary font-mono leading-tight capitalize">{userType === 'beauty' ? 'Beauty Professional' : 'Barber'}</p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-800 border-2 border-text-secondary flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-heading font-bold text-sm md:text-base ${
                      isBeauty
                        ? 'bg-gradient-to-br from-beauty-neon/20 to-beauty-neon/5 text-beauty-neon'
                        : 'bg-gradient-to-br from-accent-gold/20 to-accent-gold/5 text-accent-gold'
                    }`}>
                      {(fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </button>

              {showProfileMenu && (
                <div className={`absolute right-0 top-full mt-2 w-48 z-50 animate-in fade-in slide-in-from-top-2
                ${isBeauty
                    ? 'bg-beauty-card border border-white/10 rounded-xl shadow-soft'
                    : 'bg-neutral-900 border-2 border-neutral-700 shadow-heavy'}
              `}>
                  <button
                    onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4" /> Meu Perfil
                  </button>
                  {role !== 'staff' && (
                    <button
                      onClick={() => { navigate('/configuracoes/geral'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" /> Configurações
                    </button>
                  )}
                  <div className="border-t border-neutral-800 my-1"></div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </>
  );
};