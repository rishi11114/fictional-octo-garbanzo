import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, handleRedirectResult } from "./lib/firebase"; // adjust path

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import SiteHeader from "./components/layout/SiteHeader";
import SiteFooter from "./components/layout/SiteFooter";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Report from "./pages/Report";
import Consult from "./pages/Consult";
import Education from "./pages/Education";
import Campaigns from "./pages/Campaigns";
import Feedback from "./pages/Feedback";
import Dashboard from "./pages/Dashboard";
import Nutrition from "./pages/education/Nutrition";
import Exercise from "./pages/education/Exercise";
import Hygiene from "./pages/education/Hygiene";
import Reproductive from "./pages/education/Reproductive";
import Mental from "./pages/education/Mental";
import NewCampaign from "./pages/NewCampaign"; // ✅ new page

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🌙 global dark/light mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    // Handle mobile Google sign-in redirect
    handleRedirectResult().then((redirectUser) => {
      if (redirectUser) {
        setUser(redirectUser);
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Apply theme globally
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [darkMode]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SiteHeader />
            <Routes>
              <Route
                path="/"
                element={<Index darkMode={darkMode} setDarkMode={setDarkMode} />}
              />
              <Route path="/report" element={<Report />} />
              <Route path="/consult" element={<Consult />} />
              <Route path="/education" element={<Education />} />
              <Route path="/education/nutrition" element={<Nutrition />} />
              <Route path="/education/exercise" element={<Exercise />} />
              <Route path="/education/hygiene" element={<Hygiene />} />
              <Route path="/education/reproductive" element={<Reproductive />} />
              <Route path="/education/mental" element={<Mental />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/new" element={<NewCampaign />} /> {/* ✅ new route */}
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SiteFooter />
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
