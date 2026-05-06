import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, LogOut, User as UserIcon, Settings, AlertTriangle, Compass, ArrowLeft, Scissors, Sparkles, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ProfileModal } from './ProfileModal';
import { useAppTour } from '../hooks/useAppTour';
import { useTheme } from '../contexts/ThemeContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

export const Header: React.FC = () => {
  const { businessName, fullName, logout, avatarUrl, isDev, setDevUserType, role } = useAuth();
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
  const { accent, colors, isBeauty } = useBrutalTheme();

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
        ${colors.bg}/40 backdrop-blur-2xl border-b ${colors.divider} shadow-promax-glass
      `}
        style={{ top: 'var(--header-top, 0)' }}
      >
        <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8">

          <div className="flex items-center gap-3">
            {isSettingsRoute ? (
              <Link to="/" className="flex items-center gap-3 group hover:opacity-90 transition-all ml-1 md:ml-0" title="Voltar ao Dashboard">
                <ArrowLeft className={`w-5 h-5 ${accent.text} opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-1`} />
                <div className="relative">
                  <div className={`absolute -inset-3 ${accent.bgDim} blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 rounded-full`} />
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
                    <ArrowLeft className={`w-5 h-5 ${accent.text} opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-1`} />
                  </Link>
                )}
                <div className="flex flex-col">
                  <h1 className={`font-heading text-lg md:text-2xl ${colors.text} tracking-widest leading-none flex items-center gap-2`}>
                    {businessName || 'GESTÃO'}
                    <span
                      className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"
                      aria-label="Online"
                      title="Negócio ativo"
                    />
                  </h1>
                  <p className={`text-xs md:text-xs font-mono mt-0.5 opacity-50 uppercase tracking-widest ${colors.textSecondary}`}>
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
                    ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/50'
                    : 'bg-beauty-neon/20 text-beauty-neon border border-beauty-neon/50'}
                  `}
                title="Trocar Estilo (Modo DEV)"
              >
                {isBeauty ? <Scissors className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span className="hidden lg:inline">{isBeauty ? 'Virar Barber' : 'Virar Beauty'}</span>
              </button>
            )}

            {/* Theme Mode Toggle (Dark/Light) */}
            <button
              id="header-theme-toggle"
              onClick={toggleMode}
              aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={mode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              className={`p-2 rounded border border-transparent hover:border-neutral-700 transition-colors relative overflow-hidden
                ${colors.card} hover:${colors.surface}`}
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
                  ? <Moon className={`w-5 h-5 ${accent.text}`} />
                  : <Sun className={`w-5 h-5 ${accent.text}`} />}
              </span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                id="header-notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 hover:${colors.surface} rounded border border-transparent hover:border-neutral-700 transition-colors`}
                aria-label="Abrir notificações"
                title="Notificações"
              >
                <Bell className={`w-5 h-5 md:w-6 md:h-6 ${colors.text}`} />
                {alertCount > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 ${accent.bg} rounded-full border-2 ${colors.bg} animate-pulse flex items-center justify-center text-[9px] font-mono font-bold text-black leading-none`}
                  >
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className={`fixed inset-x-4 md:inset-auto md:absolute md:right-0 top-20 md:top-full mt-2 md:w-80 z-50 animate-in fade-in slide-in-from-top-2 shadow-promax-glass ring-1 ring-white/5
                ${colors.card} border ${colors.border} rounded-xl
              `}>
                  <div className={`p-3 border-b ${colors.divider} font-bold ${colors.text} uppercase text-xs tracking-wider`}>Avisos Importantes</div>
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
                          className={`p-3 hover:bg-white/5 border-b ${colors.divider} last:border-0 cursor-pointer transition-colors group ${alert.actionPath ? '' : 'cursor-default'} ${alert.type === 'danger' ? 'border-l-2 border-l-red-500 pl-2' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-red-600' :
                              alert.type === 'warning' ? 'text-yellow-500' : 'text-green-500'
                              }`} />
                            <div className="flex-1">
                              <p className={`text-sm ${colors.text} ${alert.actionPath ? `group-hover:${accent.text}` : ''} transition-colors`}>
                                {alert.text}
                              </p>
                              <p className={`text-xs ${colors.textSecondary} mt-1 uppercase tracking-wide`}>
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
                className={`flex items-center gap-3 pl-0 md:pl-6 md:border-l-2 ${colors.divider} hover:opacity-80 transition-opacity`}
              >
                <div className="text-right hidden sm:block">
                  <p className={`text-sm font-bold ${colors.text} leading-tight`}>{fullName || 'Usuário'}</p>
                  <p className={`text-xs ${colors.textSecondary} font-mono leading-tight capitalize`}>{isBeauty ? 'Beauty Professional' : 'Barber'}</p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-800 border-2 border-text-secondary flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-heading font-bold text-sm md:text-base ${accent.bgDim} ${accent.text}`}>
                      {(fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </button>

              {showProfileMenu && (
                <div className={`absolute right-0 top-full mt-2 w-48 z-50 animate-in fade-in slide-in-from-top-2
                ${colors.card} border ${colors.border} rounded-xl shadow-promax-glass
              `}>
                  <button
                    onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm ${colors.text} hover:bg-white/10 flex items-center gap-2`}
                  >
                    <UserIcon className="w-4 h-4" /> Meu Perfil
                  </button>
                  {role !== 'staff' && (
                    <button
                      onClick={() => { navigate('/configuracoes/geral'); setShowProfileMenu(false); }}
                      className={`w-full text-left px-4 py-3 text-sm ${colors.text} hover:bg-white/10 flex items-center gap-2`}
                    >
                      <Settings className="w-4 h-4" /> Configurações
                    </button>
                  )}
                  <div className={`border-t ${colors.divider} my-1`}></div>
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
