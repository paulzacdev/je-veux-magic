import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import LanguageSelect from "./pages/LanguageSelect";
import Dashboard from "./pages/Dashboard";
import Gospel from "./pages/Gospel";
import Meditations from "./pages/Meditations";
import Prayers from "./pages/Prayers";
import Virtues from "./pages/Virtues";
import Chatbot from "./pages/Chatbot";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">✝</div>;
  if (!session) return <Navigate to="/auth" replace />;
  // First-time user: show language selector
  if (profile && !profile.preferred_language) return <Navigate to="/language" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/language" element={<ProtectedRoute><LanguageSelect /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/gospel" element={<ProtectedRoute><Gospel /></ProtectedRoute>} />
            <Route path="/meditations" element={<ProtectedRoute><Meditations /></ProtectedRoute>} />
            <Route path="/prayers" element={<ProtectedRoute><Prayers /></ProtectedRoute>} />
            <Route path="/virtues" element={<ProtectedRoute><Virtues /></ProtectedRoute>} />
            <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
