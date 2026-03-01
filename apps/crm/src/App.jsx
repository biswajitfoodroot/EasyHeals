import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import AgentProtectedRoute from './components/AgentProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import WhatsApp from './pages/WhatsApp';
import Agents from './pages/Agents';
import MasterData from './pages/MasterData';
import Invoices from './pages/Invoices';
import ArchivePage from './pages/Archive';
import Reports from './pages/Reports';
import UsersPage from './pages/Users';
import ClosedCases from './pages/ClosedCases';

// Agent Portal
import AgentLogin from './pages/AgentLogin';
import AgentDashboard from './pages/AgentDashboard';
import AgentLeadForm from './pages/AgentLeadForm';
import AgentLeadDetail from './pages/AgentLeadDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppLayout({ children }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', background: '#0F172A', color: '#fff', fontSize: '14px', fontWeight: 600 },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Agent Portal Routes */}
          <Route path="/agent/login" element={<AgentLogin />} />
          <Route element={<AgentProtectedRoute />}>
            <Route path="/agent/dashboard" element={<AgentDashboard />} />
            <Route path="/agent/leads/new" element={<AgentLeadForm />} />
            <Route path="/agent/leads/:id" element={<AgentLeadDetail />} />
          </Route>

          {/* CRM Routes (blocked for agents) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/leads" element={<AppLayout><Leads /></AppLayout>} />
            <Route path="/pipeline" element={<AppLayout><Pipeline /></AppLayout>} />
            <Route path="/whatsapp" element={<AppLayout><WhatsApp /></AppLayout>} />
            <Route path="/agents" element={<AppLayout><Agents /></AppLayout>} />
            <Route path="/masters" element={<AppLayout><MasterData /></AppLayout>} />
            <Route path="/invoices" element={<AppLayout><Invoices /></AppLayout>} />
            <Route path="/archive" element={<AppLayout><ArchivePage /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
            <Route path="/closed-cases" element={<AppLayout><ClosedCases /></AppLayout>} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute requiredRoles={['owner', 'admin']} />}>
            <Route path="/users" element={<AppLayout><UsersPage /></AppLayout>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

