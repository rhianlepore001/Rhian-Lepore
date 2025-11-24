import React, { useState, useEffect } from 'react';
import { Bell, Search, Menu, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ProfileModal } from './ProfileModal';

export const Header: React.FC = () => {
  const { toggleSidebar } = useUI();
  const { businessName, fullName, userType, logout } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isBeauty = userType === 'beauty';
  const accentColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const bgColor = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

  // Fetch Notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setNotifications(data);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/clientes?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className={`fixed top-0 left-0 md:left-64 right-0 h-16 md:h-20 z-30 flex items-center justify-between px-4 md:px-8 transition-all duration-300
        ${isBeauty
          ? 'bg-beauty-dark/80 backdrop-blur-md border-b border-white/5 shadow-sm'
          : 'bg-brutal-main border-b-4 border-brutal-border shadow-lg'}
      `}>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleSidebar}
            className={`md:hidden p-2 -ml-2 ${accentColor} hover:bg-neutral-800 border-2 border-transparent hover:border-neutral-700 transition-colors`}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Left: Shop Info */}
          <div className="flex flex-col justify-center h-full">
            <h2 className={`font-heading text-lg md:text-xl ${accentColor} uppercase tracking-wide truncate max-w-[180px] md:max-w-none leading-tight`}>
              {businessName || 'Seu Negócio'}
            </h2>
            <p className="text-xs text-text-secondary font-mono hidden md:block leading-none mt-1">
              {isBeauty ? 'Realçando sua beleza natural' : 'Pronto para mais um dia de arte e cortes impecáveis?'}
            </p>
          </div>
        </div>

        {/* Center: Search (Hidden on Mobile) */}
        <form onSubmit={handleSearch} className={`hidden lg:flex items-center px-4 py-2 w-96 transition-colors
            ${isBeauty
            ? 'bg-white/5 border border-white/10 rounded-full focus-within:bg-white/10 focus-within:border-beauty-neon/50'
            : 'bg-brutal-card border-2 border-neutral-800 focus-within:border-white'}
        `}>
          <Search className="w-4 h-4 text-text-secondary mr-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente..."
            className="bg-transparent border-none outline-none text-text-primary text-sm font-mono w-full placeholder-neutral-600"
          />
        </form>

        {/* Right: Profile & Actions */}
        <div className="flex items-center gap-3 md:gap-6">

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-neutral-800 rounded border border-transparent hover:border-neutral-700 transition-colors"
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6 text-text-primary" />
              {unreadCount > 0 && (
                <span className={`absolute top-1 right-1 w-2 h-2 md:w-3 md:h-3 ${bgColor} rounded-full border-2 border-brutal-main`}></span>
              )}
            </button>

            {showNotifications && (
              <div className={`absolute right-0 top-full mt-2 w-80 z-50 animate-in fade-in slide-in-from-top-2
                ${isBeauty
                  ? 'bg-beauty-card border border-white/10 rounded-xl shadow-soft'
                  : 'bg-neutral-900 border-2 border-neutral-700 shadow-heavy'}
              `}>
                <div className="p-3 border-b border-neutral-800 font-bold text-white uppercase text-xs tracking-wider">Notificações</div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary text-xs">Nenhuma notificação.</div>
                  ) : (
                    notifications.map(n => {
                      // Determine link based on content keywords
                      let link = '/dashboard';
                      const text = (n.title + n.message).toLowerCase();

                      if (text.includes('bem-vindo') || text.includes('perfil')) link = '/ajustes';
                      else if (text.includes('cliente') || text.includes('dica')) link = '/clientes';
                      else if (text.includes('agendamento') || text.includes('agenda')) link = '/agenda';
                      else if (text.includes('serviço')) link = '/servicos';
                      else if (text.includes('equipe')) link = '/equipe';
                      else if (text.includes('financeiro') || text.includes('meta')) link = '/financeiro';

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            navigate(link);
                            setShowNotifications(false);
                          }}
                          className="p-3 hover:bg-white/5 border-b border-neutral-800 last:border-0 cursor-pointer transition-colors group"
                        >
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-white mb-1 group-hover:text-accent-gold transition-colors">{n.title}</p>
                            {/* Optional: Add an arrow icon here if desired */}
                          </div>
                          <p className="text-xs text-text-secondary">{n.message}</p>
                        </div>
                      );
                    })
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
                <img src={`https://ui-avatars.com/api/?name=${fullName || 'User'}&background=random`} alt="User" className="w-full h-full object-cover" />
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
                  onClick={() => { navigate('/ajustes'); setShowProfileMenu(false); }}
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
      </header>

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </>
  );
};
