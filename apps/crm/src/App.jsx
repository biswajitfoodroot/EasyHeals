import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

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
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
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
