import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertsProvider } from './contexts/AlertsContext';
import { PublicClientProvider } from './contexts/PublicClientContext';
import { GuidedModeProvider } from './contexts/GuidedModeContext';
import { StandaloneWizardPointer } from './components/onboarding/StandaloneWizardPointer';
import { DynamicBranding } from './components/DynamicBranding';
import { AIAssistantChat } from './components/AIAssistantChat';
import { ActivationBanner } from './components/onboarding/ActivationBanner';


// Lazy Load Pages
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const ClientCRM = React.lazy(() => import('./pages/ClientCRM').then(module => ({ default: module.ClientCRM })));
const Finance = React.lazy(() => import('./pages/Finance').then(module => ({ default: module.Finance })));
const Marketing = React.lazy(() => import('./pages/Marketing').then(module => ({ default: module.Marketing })));
const Register = React.lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const Login = React.lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Agenda = React.lazy(() => import('./pages/Agenda').then(module => ({ default: module.Agenda })));
const Clients = React.lazy(() => import('./pages/Clients').then(module => ({ default: module.Clients })));
const PublicBooking = React.lazy(() => import('./pages/PublicBooking').then(module => ({ default: module.PublicBooking })));
const GeneralSettings = React.lazy(() => import('./pages/settings/GeneralSettings').then(module => ({ default: module.GeneralSettings })));
const PublicBookingSettings = React.lazy(() => import('./pages/settings/PublicBookingSettings').then(module => ({ default: module.PublicBookingSettings })));
const TeamSettings = React.lazy(() => import('./pages/settings/TeamSettings').then(module => ({ default: module.TeamSettings })));
const ServiceSettings = React.lazy(() => import('./pages/settings/ServiceSettings').then(module => ({ default: module.ServiceSettings })));
const CommissionsSettings = React.lazy(() => import('./pages/settings/CommissionsSettings').then(module => ({ default: module.CommissionsSettings })));
const SubscriptionSettings = React.lazy(() => import('./pages/settings/SubscriptionSettings').then(module => ({ default: module.SubscriptionSettings })));
const AuditLogs = React.lazy(() => import('./pages/settings/AuditLogs').then(module => ({ default: module.AuditLogs })));
const RecycleBin = React.lazy(() => import('./pages/settings/RecycleBin').then(module => ({ default: module.RecycleBin })));
const SecuritySettings = React.lazy(() => import('./pages/settings/SecuritySettings').then(module => ({ default: module.SecuritySettings })));
const SystemLogs = React.lazy(() => import('./pages/settings/SystemLogs').then(module => ({ default: module.SystemLogs })));
const OnboardingWizard = React.lazy(() => import('./pages/OnboardingWizard').then(module => ({ default: module.OnboardingWizard })));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const Reports = React.lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const ProfessionalPortfolio = React.lazy(() => import('./pages/ProfessionalPortfolio').then(module => ({ default: module.ProfessionalPortfolio })));
const QueueJoin = React.lazy(() => import('./pages/QueueJoin').then(module => ({ default: module.QueueJoin })));
const QueueStatus = React.lazy(() => import('./pages/QueueStatus').then(module => ({ default: module.QueueStatus })));
const QueueManagement = React.lazy(() => import('./pages/QueueManagement').then(module => ({ default: module.QueueManagement })));
const ClientArea = React.lazy(() => import('./pages/ClientArea').then(module => ({ default: module.ClientArea })));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const UpdatePassword = React.lazy(() => import('./pages/UpdatePassword').then(module => ({ default: module.UpdatePassword })));
const Placeholder = React.lazy(() => import('./pages/Placeholder').then(module => ({ default: module.Placeholder })));

const LoadingFull = () => (
  <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
  </div>
);

// Wrapper for authenticated routes that need the Sidebar/Header
const ProtectedLayout = () => {
  const { isAuthenticated, loading, tutorialCompleted } = useAuth();

  if (loading) {
    return <LoadingFull />;
  }

  if (!isAuthenticated) {
    if (window.location.hash.includes('update-password')) {
      return <Outlet />;
    }
    return <Navigate to="/login" replace />;
  }

  // Redireciona para onboarding se não completou o setup inicial
  if (!tutorialCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Layout>
      <Suspense fallback={<LoadingFull />}>
        <Outlet />
      </Suspense>
      <AIAssistantChat />
    </Layout>
  );
};

// Wrapper for authenticated routes that DO NOT need the Sidebar (like Onboarding)
const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingFull />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Guard para rotas exclusivas do dono: redireciona staff para /
const OwnerRouteGuard = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) return <LoadingFull />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'staff') return <Navigate to="/" replace />;

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
    <Suspense fallback={<LoadingFull />}>
      <Routes>
        {/* Public / Standalone Routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/book/:slug" element={<PublicBooking />} />
        <Route path="/queue/:slug" element={<QueueJoin />} />
        <Route path="/queue-status/:id" element={<QueueStatus />} />
        <Route path="/pro/:slug" element={<ProfessionalPortfolio />} />
        <Route path="/minha-area/:slug" element={<ClientArea />} />
        <Route path="/onboarding-wizard" element={
          <RequireAuth>
            <OnboardingWizard />
          </RequireAuth>
        } />
        <Route path="/onboarding" element={
          <RequireAuth>
            <Suspense fallback={<LoadingFull />}>
              <Onboarding />
            </Suspense>
          </RequireAuth>
        } />

        {/* Authenticated Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/fila" element={<OwnerRouteGuard><QueueManagement /></OwnerRouteGuard>} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientCRM />} />
          <Route path="/financeiro" element={<Finance />} />
          <Route path="/marketing" element={<OwnerRouteGuard><Marketing /></OwnerRouteGuard>} />
          <Route path="/insights" element={<OwnerRouteGuard><Reports /></OwnerRouteGuard>} />

          {/* Settings Routes */}
          <Route path="/configuracoes" element={<OwnerRouteGuard><Navigate to="/configuracoes/geral" replace /></OwnerRouteGuard>} />
          <Route path="/configuracoes/geral" element={<OwnerRouteGuard><GeneralSettings /></OwnerRouteGuard>} />
          <Route path="/configuracoes/agendamento" element={<OwnerRouteGuard><PublicBookingSettings /></OwnerRouteGuard>} />
          <Route path="/configuracoes/equipe" element={<OwnerRouteGuard><TeamSettings /></OwnerRouteGuard>} />
          <Route path="/configuracoes/servicos" element={<ServiceSettings />} />
          <Route path="/configuracoes/comissoes" element={<OwnerRouteGuard><CommissionsSettings /></OwnerRouteGuard>} />
          <Route path="/configuracoes/assinatura" element={<OwnerRouteGuard><SubscriptionSettings /></OwnerRouteGuard>} />
          <Route path="/configuracoes/auditoria" element={<OwnerRouteGuard><AuditLogs /></OwnerRouteGuard>} />
          <Route path="/configuracoes/lixeira" element={<OwnerRouteGuard><RecycleBin /></OwnerRouteGuard>} />
          <Route path="/configuracoes/seguranca" element={<OwnerRouteGuard><SecuritySettings /></OwnerRouteGuard>} />
          <Route path="/configuracoes/erros" element={<OwnerRouteGuard><SystemLogs /></OwnerRouteGuard>} />
          <Route path="/configuracoes/notificacoes" element={<OwnerRouteGuard><Placeholder title="Notificações" /></OwnerRouteGuard>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  React.useEffect(() => {
    // Detectar hardware limitado e desativar animações infinitas
    const isLowEndDevice = navigator.hardwareConcurrency <= 4;
    // Aplicar classe no root para override de animações
    if (isLowEndDevice) {
      document.documentElement.classList.add('low-end-device');
    }
  }, []);

  return (
    <HashRouter>
      <AuthProvider>
        <DynamicBranding />
        <PublicClientProvider>
          <AlertsProvider>
            <GuidedModeProvider>
              <AppRoutes />
              <StandaloneWizardPointer />
              <ActivationBanner />
            </GuidedModeProvider>
          </AlertsProvider>
        </PublicClientProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
