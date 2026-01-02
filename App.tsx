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
import { CommissionsSettings } from './pages/settings/CommissionsSettings';
import { SubscriptionSettings } from './pages/settings/SubscriptionSettings';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { Reports } from './pages/Reports';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertsProvider } from './contexts/AlertsContext';
import { PublicClientProvider } from './contexts/PublicClientContext';
import { ProfessionalPortfolio } from './pages/ProfessionalPortfolio';

import { Placeholder } from './pages/Placeholder';
import { ForgotPassword } from './pages/ForgotPassword';
import { UpdatePassword } from './pages/UpdatePassword';

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
    if (window.location.hash.includes('update-password')) {
      return <Outlet />;
    }
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

const AppRoutes: React.FC = () => {
  // Detect if user arrived with recovery tokens and redirect to update-password
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
      // Extract the tokens and redirect to update-password while preserving them
      const tokenPart = hash.substring(hash.indexOf('access_token'));
      window.location.hash = '/update-password?' + tokenPart;
    }
  }, []);

  return (
    <Routes>
      {/* Public / Standalone Routes */}
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/book/:slug" element={<PublicBooking />} />
      <Route path="/pro/:slug" element={<ProfessionalPortfolio />} />
      <Route path="/onboarding" element={
        <RequireAuth>
          <OnboardingWizard />
        </RequireAuth>
      } />

      {/* Authenticated Routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/clientes/:id" element={<ClientCRM />} />
        <Route path="/financeiro" element={<Finance />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/relatorios" element={<Reports />} />

        {/* Settings Routes */}
        <Route path="/configuracoes" element={<Navigate to="/configuracoes/geral" replace />} />
        <Route path="/configuracoes/geral" element={<GeneralSettings />} />
        <Route path="/configuracoes/agendamento" element={<PublicBookingSettings />} />
        <Route path="/configuracoes/equipe" element={<TeamSettings />} />
        <Route path="/configuracoes/servicos" element={<ServiceSettings />} />
        <Route path="/configuracoes/comissoes" element={<CommissionsSettings />} />
        <Route path="/configuracoes/assinatura" element={<SubscriptionSettings />} />
        <Route path="/configuracoes/notificacoes" element={<Placeholder title="Notificações" />} />
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
        <PublicClientProvider>
          <AlertsProvider>
            <AppRoutes />
          </AlertsProvider>
        </PublicClientProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
