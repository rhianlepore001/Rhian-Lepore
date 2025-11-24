import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ClientCRM } from './pages/ClientCRM';
import { Finance } from './pages/Finance';
import { Marketing } from './pages/Marketing';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Agenda } from './pages/Agenda';
import { Clients } from './pages/Clients';
import { PublicBooking } from './pages/PublicBooking';
import { GeneralSettings } from './pages/settings/GeneralSettings';
import { PublicBookingSettings } from './pages/settings/PublicBookingSettings';
import { TeamSettings } from './pages/settings/TeamSettings';
import { ServiceSettings } from './pages/settings/ServiceSettings';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import { Placeholder } from './pages/Placeholder';

// Wrapper for authenticated routes that need the Sidebar/Header
const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

// Wrapper for authenticated routes that DO NOT need the Sidebar (like Onboarding)
const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Wrapper for settings routes that provides auth check and an Outlet for nested routes
const SettingsAuthWrapper = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public / Standalone Routes */}
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/book/:slug" element={<PublicBooking />} />
      <Route path="/onboarding" element={
        <RequireAuth>
          <OnboardingWizard />
        </RequireAuth>
      } />

      {/* Authenticated Routes with Main Layout */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/clientes/:id" element={<ClientCRM />} />
        <Route path="/financeiro" element={<Finance />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/relatorios" element={<Placeholder title="Relatórios" />} />
      </Route>

      {/* Authenticated Routes for Settings */}
      <Route path="/configuracoes" element={<SettingsAuthWrapper />}>
        <Route index element={<Navigate to="/configuracoes/geral" replace />} />
        <Route path="geral" element={<GeneralSettings />} />
        <Route path="agendamento" element={<PublicBookingSettings />} />
        <Route path="equipe" element={<TeamSettings />} />
        <Route path="servicos" element={<ServiceSettings />} />
        <Route path="notificacoes" element={<Placeholder title="Notificações" />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;