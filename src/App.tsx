import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Providers from "./pages/Providers";
import McpServers from "./pages/McpServers";
import Skills from "./pages/Skills";
import Prompts from "./pages/Prompts";
import Export from "./pages/Export";
import ImportPage from "./pages/Import";
import NotFound from "./pages/NotFound";
import CliGuide from "./pages/CliGuide";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/providers" replace />} />
                      <Route path="/providers" element={<Providers />} />
                      <Route path="/mcp" element={<McpServers />} />
                      <Route path="/skills" element={<Skills />} />
                      <Route path="/prompts" element={<Prompts />} />
                      <Route path="/export" element={<Export />} />
                      <Route path="/cli-guide" element={<CliGuide />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
