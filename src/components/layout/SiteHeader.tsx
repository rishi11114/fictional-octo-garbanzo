import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const navItems = [
  { to: "/dashboard", label: "Report" },
  { to: "/consult", label: "Consult" },
  { to: "/education", label: "Education" },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/feedback", label: "Feedback" },
];

const SiteHeader = () => {
  const [user, setUser] = useState(auth.currentUser);
  const navigate = useNavigate();
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand-2))]"></div>
          <span className="font-semibold">Health Hub</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              <Button variant="outline" onClick={() => signOut(auth)}>Sign out</Button>
            </>
          ) : (
            <Button variant="hero" onClick={() => signInWithGoogle()}>Link Google account</Button>
          )}
        
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
