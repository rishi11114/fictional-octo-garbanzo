import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { auth, db, signInWithGoogle } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { push, ref, set } from "firebase/database";
import VideoCall from "@/components/VideoCall";

const Consult = () => {
  const pros = [
    { name: "Dr", spec: "General Physician" },
  ];

  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [selectedPro, setSelectedPro] = useState<{ name: string; spec: string } | null>(null);
  const displayName = useMemo(() => user?.displayName ?? user?.email ?? "Guest", [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  function randomRoomId(len = 10) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return (
      "healthhub-" +
      Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }

  const handleBook = async (pro: { name: string; spec: string }) => {
    try {
      if (!auth.currentUser) {
        await signInWithGoogle();
      }
      const room = randomRoomId();
      const bookingRef = push(ref(db, "bookings"));
      await set(bookingRef, {
        id: bookingRef.key,
        roomName: room,
        provider: pro,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || auth.currentUser?.email,
        createdAt: Date.now(),
        status: "booked",
      });
      setSelectedPro(pro);
      setRoomName(room);
      setBookingOpen(true);
      toast({ title: "Consult booked", description: "Your secure video room is ready. Doctor notified." });
    } catch (e: unknown) {
      let message = "Please try again.";
      if (e instanceof Error) {
        message = e.message;
      }
      toast({ title: "Booking failed", description: message });
    }
  };

  return (
    <main className="container py-10">
      <SEO
        title="Telemedicine & Virtual Consultation"
        description="Book online consultations with verified health professionals."
        canonical="/consult"
      />
      <h1 className="text-3xl font-bold mb-6">Telemedicine & Virtual Consultation</h1>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {user ? `Signed in as ${displayName}` : "Sign in to book a consult"}
        </p>
        <div className="flex gap-2">
          {!user ? (
            <Button variant="hero" onClick={() => signInWithGoogle()}>Sign in with Google</Button>
          ) : (
            <Button variant="outline" onClick={() => signOut(auth)}>Sign out</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pros.map((p) => (
          <article key={p.name} className="rounded-lg border p-6">
            <h3 className="font-medium">{p.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{p.spec}</p>
            <Button variant="hero" onClick={() => handleBook(p)}>Book consult</Button>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-lg border p-6 bg-gradient-to-r from-[hsl(var(--brand))]/10 to-[hsl(var(--brand-2))]/10">
        <p className="text-sm text-muted-foreground">
          Need immediate mental health support? After backend setup, we will connect verified hotlines and chat.
        </p>
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPro ? `Consult with ${selectedPro.name}` : "Consult"}
            </DialogTitle>
          </DialogHeader>
          {roomName && (
            <VideoCall roomName={roomName} displayName={displayName || undefined} />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Consult;
