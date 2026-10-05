import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, LogOut, User as UserIcon, Settings, Compass, ArrowLeft, Scissors, Sparkles, Sun, Moon } from 'lucide-react';
import { BugReportButton } from './BugReportButton';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ProfileModal } from './ProfileModal';
import { useAppTour } from '../hooks/useAppTour';
import { useTheme } from '../contexts/ThemeContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useBusinessCopy } from '../hooks/useBusinessCopy';
import { useBusinessSettings } from '../hooks/useSettings';
import { resolveBusinessTimezone } from '../utils/businessTimezone';
import { NotificationPanel } from './NotificationPanel';
import { resolveHeaderBackTarget } from '../utils/headerBackTarget';

export const Header: React.FC = () => {
  const { businessName, fullName, logout, avatarUrl, isDev, setDevUserType, role, region } = useAuth();
  const { alerts, notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAlerts();
  const { data: businessSettings } = useBusinessSettings();
  const timeZone = resolveBusinessTimezone({ timezone: businessSettings?.timezone, region });
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
  const { accent, colors, status, isBeauty, isLight } = useBrutalTheme();
  const { segmentLabel, segmentLabelShort } = useBusinessCopy();
  const mobileBack = pathname !== '/' ? resolveHeaderBackTarget(pathname) : null;

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

  const unreadLabel = unreadCount === 1
    ? '1 notificação não lida'
    : `${unreadCount} notificações não lidas`;

  return (
    <>
      <header className={`fixed left-0 ${!isSettingsRoute ? 'md:left-64' : ''} right-0 z-30 transition-all duration-300
        ${colors.bg} backdrop-blur-xl border-b ${colors.divider}
      `}
        style={{ top: 'var(--header-top, 0)' }}
      >
        <div className="h-14 md:min-h-20 md:h-auto py-0 flex items-center justify-between gap-1.5 md:gap-2 px-4 md:px-8">

          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden">
            {isSettingsRoute ? (
              <Link to="/" className="flex items-center gap-3 group hover:opacity-90 transition-all ml-1 md:ml-0 min-w-0" title="Voltar ao início">
                <ArrowLeft className={`w-5 h-5 shrink-0 ${accent.text} opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-1`} />
                {/* Marca recortada e leve (96 px, ~6–16 KB) por modo de cor. O PNG antigo de 1024 px
                    tinha o desenho branco e deslocado + halo com blur: no claro virava um borrão. */}
                <img
                  src={isLight ? '/agendix-mark-light.png' : '/agendix-mark-dark.png'}
                  alt="AgendiX"
                  width={28}
                  height={28}
                  decoding="async"
                  className="h-7 w-7 shrink-0 object-contain"
                />
                <span className={`font-heading text-base font-bold tracking-tight leading-none ${colors.text}`}>AgendiX</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                {mobileBack && (
                  <Link
                    to={mobileBack.to}
                    data-testid="header-back"
                    className="md:hidden inline-flex items-center justify-center shrink-0 h-11 w-11 rounded-lg group hover:opacity-90 hover:bg-[var(--color-card-hover)] transition-all"
                    title={mobileBack.label}
                    aria-label={mobileBack.label}
                  >
                    <ArrowLeft className={`w-4 h-4 ${accent.text} opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-1`} />
                  </Link>
                )}
                <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0 w-full max-w-full">
                    <h1
                      className={`min-w-0 flex-1 font-heading text-sm sm:text-lg md:text-2xl ${colors.text} tracking-normal md:tracking-wide leading-none truncate whitespace-nowrap`}
                      title={businessName || 'GESTÃO'}
                    >
                      {businessName || 'GESTÃO'}
                    </h1>
                    <span
                      className="w-1.5 h-1.5 bg-[var(--color-success)] rounded-full animate-pulse shrink-0"
                      aria-label="Online"
                      title="Negócio ativo"
                    />
                  </div>
                  <p className={`text-xs font-mono mt-0.5 opacity-50 uppercase tracking-wide ${colors.textSecondary} truncate`}>
                    {segmentLabel}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Profile & Actions */}
          <div className="flex items-center gap-0.5 sm:gap-2 md:gap-6 shrink-0">
            {/* Dev Theme Switcher */}
            {isDev && (
              <button
                onClick={() => setDevUserType(isBeauty ? 'barber' : 'beauty')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono uppercase transition-all shadow-lg hover:scale-105 active:scale-95
                      ${isBeauty
                    ? 'bg-[var(--color-accent-dim)] text-theme-accent border border-[var(--color-accent-border)]'
                    : 'bg-[var(--color-accent-dim)] text-theme-accent border border-[var(--color-accent-border)]'}
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
              className="p-1.5 h-11 w-11 inline-flex items-center justify-center rounded-lg border border-transparent hover:border-[var(--color-divider)] hover:bg-theme-surface transition-colors relative overflow-hidden"
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
                  ? <Moon className={`w-4 h-4 md:w-5 md:h-5 ${accent.text}`} />
                  : <Sun className={`w-4 h-4 md:w-5 md:h-5 ${accent.text}`} />}
              </span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                id="header-notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 h-11 w-11 inline-flex items-center justify-center hover:bg-theme-surface rounded-lg border border-transparent hover:border-[var(--color-divider)] transition-colors"
                aria-label={unreadCount > 0 ? `Abrir notificações, ${unreadLabel}` : 'Abrir notificações'}
                title="Notificações"
              >
                <Bell className={`w-4 h-4 md:w-6 md:h-6 ${colors.text}`} />
                {unreadCount > 0 && (
                  <span
                    data-testid="notification-badge"
                    className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 ${accent.bg} rounded-full border-2 border-[var(--color-bg)] animate-pulse flex items-center justify-center text-xs font-mono font-bold text-[var(--color-on-accent)] leading-none`}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  alerts={alerts}
                  timeZone={timeZone}
                  onMarkRead={(id) => { void markNotificationRead(id); }}
                  onMarkAll={() => { void markAllNotificationsRead(); }}
                  onNavigate={(path) => {
                    navigate(path);
                    setShowNotifications(false);
                  }}
                />
              )}
            </div>

            <div className="hidden sm:block">
              <BugReportButton />
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                id="header-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label="Abrir menu do perfil"
                className={`inline-flex items-center justify-center gap-3 h-11 w-11 md:h-auto md:w-auto md:min-h-[44px] pl-0 md:pl-6 md:border-l-2 ${colors.divider} hover:opacity-80 transition-opacity`}
              >
                <div className="text-right hidden sm:block">
                  <p className={`text-sm font-bold ${colors.text} leading-tight`}>{fullName || 'Usuário'}</p>
                  <p className={`text-xs ${colors.textSecondary} font-mono leading-tight capitalize`}>{segmentLabelShort}</p>
                </div>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${colors.surface} border-2 ${colors.border} flex items-center justify-center overflow-hidden`}>
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
                    className={`w-full text-left px-4 py-3 text-sm ${colors.text} hover:bg-[var(--color-card-hover)] flex items-center gap-2`}
                  >
                    <UserIcon className="w-4 h-4" /> Meu Perfil
                  </button>
                  {role !== 'staff' && (
                    <button
                      onClick={() => { navigate('/configuracoes/geral'); setShowProfileMenu(false); }}
                      className={`w-full text-left px-4 py-3 text-sm ${colors.text} hover:bg-[var(--color-card-hover)] flex items-center gap-2`}
                    >
                      <Settings className="w-4 h-4" /> Configurações
                    </button>
                  )}
                  <div className={`border-t ${colors.divider} my-1`}></div>
                  <button
                    onClick={logout}
                    className={`w-full text-left px-4 py-3 text-sm ${status.danger} hover:bg-[var(--color-danger-bg)] flex items-center gap-2`}
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
