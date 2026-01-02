import React, { useState } from 'react';
import { Bell, Search, Menu, LogOut, User as UserIcon, Settings, AlertTriangle, BookOpen, ArrowLeft } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProfileModal } from './ProfileModal';
import { TutorialOverlay } from './TutorialOverlay';
import { useSubscription } from '../hooks/useSubscription';

export const Header: React.FC = () => {
  const { toggleSidebar } = useUI();
  const { businessName, fullName, userType, logout, avatarUrl, markTutorialCompleted } = useAuth();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false); // NEW STATE

  const isSettingsRoute = pathname.startsWith('/configuracoes');
  const isBeauty = userType === 'beauty';
  const accentColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const bgColor = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

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
          ? 'bg-beauty-dark/80 backdrop-blur-md border-b border-white/5 shadow-sm'
          : 'bg-brutal-main border-b-4 border-brutal-border shadow-lg'}
      `}
        style={{ top: 'var(--header-top, 0)' }}
      >
        <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8">

          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile Menu Button / Back Arrow */}
            {isSettingsRoute ? (
              <button
                onClick={() => navigate('/')}
                className={`md:hidden p-2 -ml-2 ${accentColor} hover:bg-neutral-800 border-2 border-transparent hover:border-neutral-700 transition-colors`}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className={`md:hidden p-2 -ml-2 ${accentColor} hover:bg-neutral-800 border-2 border-transparent hover:border-neutral-700 transition-colors`}
              >
                <Menu className="w-6 h-6" />
              </button>
            )}

            {/* Left: Shop Info */}
            <div className="flex flex-col justify-center h-full">
              <h2 className={`font-heading text-lg md:text-xl ${accentColor} uppercase tracking-wide truncate max-w-[120px] sm:max-w-[180px] md:max-w-none leading-tight`}>
                {businessName || 'Seu Negócio'}
              </h2>
              <p className="text-xs text-text-secondary font-mono hidden md:block leading-none mt-1">
                {isBeauty ? 'Realçando sua beleza natural' : 'Pronto para mais um dia de arte e cortes impecáveis?'}
              </p>
            </div>
          </div>

          {/* Center: Search (REMOVED) */}
          <div className="flex-1 hidden lg:block">
            {/* Espaço vazio para centralizar os elementos laterais, se necessário */}
          </div>

          {/* Right: Profile & Actions */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Tutorial Button */}
            <button
              onClick={() => setShowTutorialModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono uppercase transition-colors
                    ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon hover:bg-beauty-neon/20' : 'bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20'}
                `}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Tutorial</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-neutral-800 rounded border border-transparent hover:border-neutral-700 transition-colors"
              >
                <Bell className="w-5 h-5 md:w-6 md:h-6 text-text-primary" />
                {alertCount > 0 && (
                  <span className={`absolute top-1 right-1 w-2 h-2 md:w-3 md:h-3 ${bgColor} rounded-full border-2 border-brutal-main`}></span>
                )}
              </button>

              {showNotifications && (
                <div className={`absolute right-0 top-full mt-2 w-80 z-50 animate-in fade-in slide-in-from-top-2
                ${isBeauty
                    ? 'bg-beauty-card border border-white/10 rounded-xl shadow-soft'
                    : 'bg-neutral-900 border-2 border-neutral-700 shadow-heavy'}
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
                          className={`p-3 hover:bg-white/5 border-b border-neutral-800 last:border-0 cursor-pointer transition-colors group ${alert.actionPath ? '' : 'cursor-default'}`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-red-600' :
                              alert.type === 'warning' ? 'text-yellow-500' : 'text-green-500'
                              }`} />
                            <div className="flex-1">
                              <p className={`text-sm text-white ${alert.actionPath ? 'group-hover:text-accent-gold' : ''} transition-colors`}>
                                {alert.text}
                              </p>
                              <p className="text-[10px] text-text-secondary mt-1 uppercase tracking-wide">
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
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-0 md:pl-6 md:border-l-2 md:border-neutral-800 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-text-primary leading-tight">{fullName || 'Usuário'}</p>
                  <p className="text-[10px] md:text-xs text-text-secondary font-mono leading-tight capitalize">{userType === 'beauty' ? 'Beauty Professional' : 'Barber'}</p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-800 border-2 border-text-secondary flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://ui-avatars.com/api/?name=${fullName || 'User'}&background=random`} alt="User" className="w-full h-full object-cover" />
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
                  <button
                    onClick={() => { navigate('/configuracoes/geral'); setShowProfileMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Configurações
                  </button>
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
      {showTutorialModal && <TutorialOverlay onComplete={() => { setShowTutorialModal(false); markTutorialCompleted(); }} />}
    </>
  );
};