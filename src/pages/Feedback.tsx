import { SEO } from "@/components/SEO";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { push, ref, set } from "firebase/database";

const DOCTOR_EMAIL = "pandeyrishi983@gmail.com";

const Feedback = () => {
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const service = String(fd.get("service"));
    const rating = Number(fd.get("rating"));
    const comments = String(fd.get("comments"));

    try {
      const r = push(ref(db, "feedback"));
      const payload = {
        id: r.key,
        service,
        rating,
        comments,
        userId: auth.currentUser?.uid ?? null,
        createdAt: Date.now(),
      };
      await set(r, payload);

      // Best-effort email via user's client
      const subject = encodeURIComponent(`Feedback for ${service} (${rating}/5)`);
      const body = encodeURIComponent(`${comments}\n\nFrom: ${auth.currentUser?.displayName || auth.currentUser?.email || "Guest"}`);
      window.open(`mailto:${DOCTOR_EMAIL}?subject=${subject}&body=${body}`, "_blank");

      toast({ title: "Thanks!", description: "Feedback shared with the doctor." });
      (e.target as HTMLFormElement).reset();
    } catch (e: any) {
      toast({ title: "Submit failed", description: e?.message ?? "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container py-10">
      <SEO
        title="Feedback & Referral"
        description="Rate services, refer others, and escalate emergency cases."
        canonical="/feedback"
      />
      <h1 className="text-3xl font-bold mb-6">Feedback & Referral</h1>
      <form onSubmit={onSubmit} className="rounded-lg border p-6 grid gap-4 max-w-2xl">
        <div>
          <Label htmlFor="service">Service / Facility</Label>
          <Input id="service" name="service" placeholder="e.g., Community Clinic A" required />
        </div>
        <div>
          <Label htmlFor="rating">Rating (1-5)</Label>
          <Input id="rating" name="rating" type="number" min={1} max={5} required />
        </div>
        <div>
          <Label htmlFor="comments">Comments / Referral details</Label>
          <Textarea id="comments" name="comments" placeholder="Share your experience or referral info" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">Escalate</Button>
          <Button type="submit" variant="hero" disabled={loading}>{loading ? "Submitting..." : "Submit"}</Button>
        </div>
      </form>
    </main>
  );
};

export default Feedback;
