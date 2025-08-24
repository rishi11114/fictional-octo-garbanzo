import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { ref as dbRef, onValue, push, set, remove, get } from "firebase/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  title: string;
  description: string;
  date?: string | null;
  createdBy: string;
  createdAt: number;
  participants?: Record<string, { email: string }>;
  imageUrl?: string;
}

export default function Campaigns() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDate, setNewDate] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Access ImgBB API key from environment variables
  const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Fetch campaigns from Realtime DB
  useEffect(() => {
    const campaignsRef = dbRef(db, "campaigns");
    const unsub = onValue(campaignsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const arr: Campaign[] = Object.entries(data).map(([id, val]) => ({
        id,
        ...(val as Omit<Campaign, "id">),
      }));
      setCampaigns(arr.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsub();
  }, []);

  // Upload image to ImgBB
  const uploadToImgBB = async (file: File): Promise<string> => {
    // Validate API key
    if (!IMGBB_API_KEY) {
      toast({
        title: "Error",
        description: "ImgBB API key is missing. Please check your environment configuration.",
        variant: "destructive",
      });
      throw new Error("ImgBB API key is missing");
    }

    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "ImgBB upload failed");
      }
      return result.data.url;
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Doctor: Create new campaign
  const handleCreateCampaign = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a campaign." });
      return;
    }
    if (!newTitle || !newDescription) {
      toast({ title: "Error", description: "Title and description are required." });
      return;
    }

    setLoading(true);
    let imageUrl: string | undefined;

    try {
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadToImgBB(imageFile);
        setUploading(false);
      }

      const campaignsRef = dbRef(db, "campaigns");
      const newCampaignRef = push(campaignsRef);
      await set(newCampaignRef, {
        title: newTitle,
        description: newDescription,
        date: newDate || null,
        createdBy: user.uid,
        createdAt: Date.now(),
        imageUrl: imageUrl || null,
      });

      toast({ title: "Success", description: "Campaign posted!" });
      setNewTitle("");
      setNewDescription("");
      setNewDate("");
      setImageFile(null);
    } catch (err) {
      console.error("Error creating campaign:", err);
      toast({ title: "Error", description: "Failed to post campaign." });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Patient: Participate in campaign
  const handleParticipate = async (campaign: Campaign) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to participate." });
      return;
    }
    try {
      const participantRef = dbRef(db, `campaigns/${campaign.id}/participants/${user.uid}`);
      await set(participantRef, { email: user.email || "Unknown" });
      toast({ title: "Registered", description: "You are now participating!" });
    } catch (err) {
      console.error("Error participating in campaign:", err);
      toast({ title: "Error", description: "Failed to participate." });
    }
  };

  // Doctor: Delete campaign
  const handleDeleteCampaign = async (campaign: Campaign) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to delete a campaign." });
      return;
    }
    try {
      const campaignRef = dbRef(db, `campaigns/${campaign.id}`);
      await remove(campaignRef);
      toast({ title: "Deleted", description: "Campaign has been deleted." });
    } catch (err) {
      console.error("Error deleting campaign:", err);
      toast({ title: "Error", description: "Failed to delete campaign." });
    }
  };

  const isDoctor = user?.email === "pandeyrishi983@gmail.com";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Campaigns</h1>

      {/* Doctor: Create new campaign */}
      {isDoctor && (
        <section className="border rounded p-6 shadow-md bg-white dark:bg-gray-900 space-y-4">
          <h2 className="font-semibold text-xl">Post New Campaign</h2>

          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="border p-2 w-full rounded bg-white dark:bg-gray-800 dark:text-white"
          />
          <textarea
            placeholder="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="border p-2 w-full rounded bg-white dark:bg-gray-800 dark:text-white"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="border p-2 w-full rounded bg-white dark:bg-gray-800 dark:text-white"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full"
          />
          {imageFile && (
            <div className="mt-2">
              <p className="text-sm">Selected file: {imageFile.name}</p>
              <img
                src={URL.createObjectURL(imageFile)}
                alt="preview"
                className="mt-2 w-40 h-40 object-cover rounded"
              />
            </div>
          )}

          <Button onClick={handleCreateCampaign} disabled={loading || uploading}>
            {loading || uploading ? "Posting..." : "Post Campaign"}
          </Button>
        </section>
      )}

      {/* Campaign list */}
      <section className="space-y-4">
        <h2 className="font-semibold text-xl mb-2">Active Campaigns</h2>
        <ul className="space-y-4">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="border rounded p-4 flex flex-col md:flex-row md:justify-between md:items-center shadow-sm bg-white dark:bg-gray-900 dark:text-white"
            >
              <div className="mb-2 md:mb-0 space-y-1">
                <h3 className="font-medium text-lg">{c.title}</h3>
                <p>{c.description}</p>
                {c.date && <p className="text-sm text-muted-foreground">Date: {c.date}</p>}
                {c.imageUrl && (
                  <img
                    src={c.imageUrl}
                    alt="campaign"
                    className="mt-2 w-48 h-48 object-cover rounded"
                  />
                )}
                <p className="text-sm text-muted-foreground">
                  Posted by: {c.createdBy === user?.uid ? "You" : c.createdBy}
                </p>
                <p className="text-sm text-muted-foreground">
                  Participants: {c.participants ? Object.keys(c.participants).length : 0}
                </p>

                {/* Doctor: See registered users */}
                {isDoctor && c.participants && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold">Registered Users:</p>
                    <ul className="list-disc list-inside text-sm">
                      {Object.entries(c.participants).map(([id, p]) => (
                        <li key={id}>{p.email}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Patient: See your participation */}
                {!isDoctor && c.participants?.[user?.uid || ""] && (
                  <p className="text-sm text-green-600">
                    ✅ You are participating as {user?.email}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {/* Patient: Participate button */}
                {!isDoctor && (
                  <Button
                    size="sm"
                    variant="hero"
                    onClick={() => handleParticipate(c)}
                    disabled={c.participants?.[user?.uid || ""] !== undefined}
                  >
                    {c.participants?.[user?.uid || ""] ? "Registered" : "Participate"}
                  </Button>
                )}

                {/* Doctor: Delete button */}
                {isDoctor && c.createdBy === user?.uid && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCampaign(c)}
                  >
                    Delete Campaign
                  </Button>
                )}
              </div>
            </li>
          ))}
          {campaigns.length === 0 && (
            <p className="text-muted-foreground text-sm">No campaigns available.</p>
          )}
        </ul>
      </section>
    </div>
  );
}