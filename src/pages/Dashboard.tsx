import { SEO } from "@/components/SEO";
import DoctorDashboard from "./DoctorDashboard";
import PatientDashboard from "./PatientDashboard";
import { auth, signInWithGoogle, authReady } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// ✅ List of doctor emails
const DOCTOR_EMAILS = [
  "pandeyrishi983@gmail.com",
  "gourav.das.ece26@heritageit.edu.in",
  "gargi.majumder.ece26@heritageit.edu.in",
  "swaraj.kumarmaity.ece26@heritageit.edu.in",
];

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until Firebase Auth is ready
    authReady
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        });
        return unsubscribe;
      })
      .catch((err) => {
        console.error("Auth initialization error:", err);
        setLoading(false);
      });
  }, []);

  // ✅ Fix: use .includes instead of ===
  const isDoctor = useMemo(
    () => DOCTOR_EMAILS.includes(user?.email?.toLowerCase() || ""),
    [user?.email]
  );

  if (loading) {
    return <div className="container py-10">Loading...</div>;
  }

  if (!user) {
    return (
      <main className="container py-10">
        <SEO
          title="Collaborative Hub Dashboard"
          description="Sign in to access your Collaborative Hub dashboard."
          canonical="/dashboard"
        />
        <h1 className="text-3xl font-bold mb-4">Collaborative Hub</h1>
        <p className="text-muted-foreground mb-4">
          Sign in with Google to access the Collaborative Hub and your personalized dashboard.
        </p>
        <Button variant="hero" onClick={() => signInWithGoogle()}>
          Sign in with Google
        </Button>
      </main>
    );
  }

  // ✅ If user signed in → send to proper dashboard
  return (
    <main className="container py-10">
      <SEO
        title="Collaborative Hub Dashboard"
        description="Access your Collaborative Hub dashboard."
        canonical="/dashboard"
      />
      {isDoctor ? <DoctorDashboard /> : <PatientDashboard />}
    </main>
  );
};

export default Dashboard;
