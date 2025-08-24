import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { onChildAdded, onValue, ref, remove, push, set } from "firebase/database";
import VideoCall from "@/components/VideoCall";
import OutbreakBox from "@/components/OutbreakBox";
import PrescriptionBox from "@/pages/PrescriptionBox";
import { useToast } from "@/hooks/use-toast";
import Chat from "@/components/Chat";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DOCTOR_EMAIL = [
  "pandeyrishi983@gmail.com",
  "gourav.das.ece26@heritageit.edu.in",
  "gargi.majumder.ece26@heritageit.edu.in",
  "swaraj.kumarmaity.ece26@heritageit.edu.in",
];

interface Booking {
  id: string;
  userName?: string;
  status: "booked" | "completed" | "cancelled";
  createdAt: number;
  roomName: string;
  userId?: string;
}

interface Report {
  id: string;
  type: string;
  location?: string | null;
  createdAt: number;
}

interface Feedback {
  id: string;
  service: string;
  rating: number;
  comments: string;
  createdAt: number;
}

interface HubPost {
  id: string;
  caption: string;
  imageUrl: string;
  doctorId: string;
  doctorName: string;
  upiId: string;
  createdAt: number;
  donations?: Record<string, boolean>;
}

interface Transaction {
  id: string;
  postId: string;
  transactionId: string;
  patientGmail: string;
  status: "pending" | "approved" | "rejected";
  patientId: string;
  createdAt: number;
}

interface Donor {
  id: string;
  patientGmail: string;
  postId: string;
  transactionId: string;
  createdAt: number;
}

const CollaborativeHub: React.FC<{ role: "patient" | "doctor" }> = ({ role }) => {
  const [posts, setPosts] = useState<HubPost[]>([]);
  const [newCaption, setNewCaption] = useState("");
  const [newUpiId, setNewUpiId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [transactionIdInput, setTransactionIdInput] = useState<Record<string, string>>({});
  const [gmailInput, setGmailInput] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const userId = auth.currentUser?.uid || "";
  const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Unknown";

  // Access environment variable for ImgBB API key
  const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

  // Fetch posts, transactions, and donors from Firebase Realtime Database
  useEffect(() => {
    const hubRef = ref(db, "collaborativeHub");
    const unsubscribePosts = onValue(hubRef, (snapshot) => {
      const data = snapshot.val() as Record<string, HubPost> | null;
      const postsData: HubPost[] = data
        ? Object.entries(data).map(([id, post]) => ({
            id,
            ...post,
          }))
        : [];
      setPosts(postsData.sort((a, b) => b.createdAt - a.createdAt));
      console.log("Fetched posts:", postsData); // Debug log
    });

    const transactionsRef = ref(db, "transactions");
    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val() as Record<string, Transaction> | null;
      const transactionsData: Transaction[] = data
        ? Object.entries(data)
            .map(([id, transaction]) => ({
              id,
              ...transaction,
            }))
            .filter((t) => t.status === "pending")
        : [];
      setTransactions(transactionsData);
      console.log("Fetched transactions:", transactionsData); // Debug log
    });

    const donorsRef = ref(db, "collaborativeHub/donors");
    const unsubscribeDonors = onValue(donorsRef, (snapshot) => {
      const data = snapshot.val() as Record<string, Donor> | null;
      const donorsData: Donor[] = data
        ? Object.entries(data).map(([id, donor]) => ({
            id,
            ...donor,
          }))
        : [];
      setDonors(donorsData.sort((a, b) => b.createdAt - a.createdAt));
      console.log("Fetched donors:", donorsData); // Debug log
    });

    return () => {
      unsubscribePosts();
      unsubscribeTransactions();
      if (role === "doctor") unsubscribeDonors();
    };
  }, [role]);

  // Handle image upload to ImgBB
  const uploadImage = async (file: File): Promise<string> => {
    // Check if environment variable is defined
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
    formData.append("key", IMGBB_API_KEY);

    try {
      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        return data.data.url; // Returns the image URL
      } else {
        throw new Error(data.error.message || "Failed to upload image");
      }
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

  // Handle post submission (Doctor)
  const handlePostSubmit = async () => {
    if (!newCaption || !newUpiId || !imageFile) {
      toast({
        title: "Error",
        description: "Please fill all fields and select an image.",
        variant: "destructive",
      });
      return;
    }

    try {
      const imageUrl = await uploadImage(imageFile);
      const postsRef = ref(db, "collaborativeHub");
      const newPostRef = push(postsRef);
      await set(newPostRef, {
        caption: newCaption,
        upiId: newUpiId,
        imageUrl,
        doctorId: userId,
        doctorName: userName,
        createdAt: Date.now(),
      });
      setNewCaption("");
      setNewUpiId("");
      setImageFile(null);
      toast({
        title: "Success",
        description: "Post created successfully.",
      });
    } catch (error) {
      console.error("Error posting:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Try again.",
        variant: "destructive",
      });
    }
  };

  // Handle transaction ID and Gmail submission (Patient)
  const handleTransactionSubmit = async (postId: string) => {
    const transactionIdValue = transactionIdInput[postId] || "";
    const gmailValue = gmailInput[postId] || "";
    if (!transactionIdValue || !gmailValue) {
      toast({
        title: "Error",
        description: "Please enter both Transaction ID and Gmail.",
        variant: "destructive",
      });
      return;
    }

    try {
      const transactionsRef = ref(db, "transactions");
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        postId,
        transactionId: transactionIdValue,
        patientGmail: gmailValue,
        status: "pending",
        patientId: userId,
        createdAt: Date.now(),
      });
      const donationRef = ref(db, `collaborativeHub/${postId}/donations/${userId}`);
      await set(donationRef, true);
      setTransactionIdInput((prev) => ({ ...prev, [postId]: "" }));
      setGmailInput((prev) => ({ ...prev, [postId]: "" }));
      toast({
        title: "Success",
        description: "Transaction ID and Gmail submitted for verification.",
      });
    } catch (error) {
      console.error("Error submitting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to submit transaction ID and Gmail.",
        variant: "destructive",
      });
    }
  };

  // Handle transaction approval (Doctor)
  const handleApproveTransaction = async (transactionId: string) => {
    try {
      const transaction = transactions.find((t) => t.id === transactionId);
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      const transactionRef = ref(db, `transactions/${transactionId}`);
      await set(transactionRef, {
        ...transaction,
        status: "approved",
      });

      const donorRef = push(ref(db, "collaborativeHub/donors"));
      await set(donorRef, {
        patientGmail: transaction.patientGmail,
        postId: transaction.postId,
        transactionId: transaction.transactionId,
        createdAt: Date.now(),
      });

      setTransactions(transactions.filter((t) => t.id !== transactionId));
      toast({
        title: "Success",
        description: "Transaction approved and donor recorded.",
      });
    } catch (error) {
      console.error("Error approving transaction:", error);
      toast({
        title: "Error",
        description: "Failed to approve transaction.",
        variant: "destructive",
      });
    }
  };

  // Handle transaction rejection (Doctor)
  const handleRejectTransaction = async (transactionId: string) => {
    try {
      const transactionRef = ref(db, `transactions/${transactionId}`);
      await remove(transactionRef);
      setTransactions(transactions.filter((t) => t.id !== transactionId));
      toast({
        title: "Success",
        description: "Transaction rejected.",
      });
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to reject transaction.",
        variant: "destructive",
      });
    }
  };

  // Handle post deletion (Doctor)
  const handleDeletePost = async (postId: string) => {
    try {
      const postRef = ref(db, `collaborativeHub/${postId}`);
      await remove(postRef);
      setPosts(posts.filter((post) => post.id !== postId));
      toast({
        title: "Success",
        description: "Post deleted.",
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "Failed to delete post.",
        variant: "destructive",
      });
    }
  };

  // Handle clearing all donors
  const handleClearDonors = async () => {
    try {
      const donorsRef = ref(db, "collaborativeHub/donors");
      await remove(donorsRef);
      setDonors([]);
      toast({
        title: "Success",
        description: "Approved donors list cleared.",
      });
    } catch (error) {
      console.error("Error clearing donors:", error);
      toast({
        title: "Error",
        description: "Failed to clear approved donors.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {role === "doctor" && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
          <h3 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Create NGO Post</h3>
          <div className="space-y-2">
            <div>
              <Label htmlFor="caption" className="text-gray-700 dark:text-gray-300">Caption</Label>
              <Input
                id="caption"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder="Enter caption"
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="upiId" className="text-gray-700 dark:text-gray-300">UPI ID</Label>
              <Input
                id="upiId"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                placeholder="Enter UPI ID"
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="image" className="text-gray-700 dark:text-gray-300">Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <Button onClick={handlePostSubmit} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              Post
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">NGO Posts</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {role === "patient"
            ? "View NGO/donation-related posts shared by doctors and contribute if you wish."
            : "Manage your NGO posts and verify donations."}
        </p>
        <div className="max-h-72 overflow-y-auto pr-2">
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 shadow-sm">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{post.doctorName}</h4>
                <p className="text-gray-700 dark:text-gray-300">{post.caption}</p>
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="NGO post"
                    className="w-full max-h-48 object-contain rounded-lg my-1"
                  />
                )}
                {role === "patient" && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">UPI ID: {post.upiId}</p>
                    <div>
                      <Label htmlFor={`transaction-${post.id}`} className="text-gray-700 dark:text-gray-300">Transaction ID</Label>
                      <Input
                        id={`transaction-${post.id}`}
                        value={transactionIdInput[post.id] || ""}
                        onChange={(e) =>
                          setTransactionIdInput((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter Transaction ID"
                        className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`gmail-${post.id}`} className="text-gray-700 dark:text-gray-300">Gmail</Label>
                      <Input
                        id={`gmail-${post.id}`}
                        value={gmailInput[post.id] || ""}
                        onChange={(e) =>
                          setGmailInput((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter your Gmail"
                        className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <Button
                      onClick={() => handleTransactionSubmit(post.id)}
                      variant="hero"
                      className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Submit Transaction ID and Gmail
                    </Button>
                  </div>
                )}
                {role === "doctor" && post.doctorId === userId && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDeletePost(post.id)}
                    className="mt-1 bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  >
                    Delete Post
                  </Button>
                )}
              </div>
            ))}
            {posts.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">No posts in the hub yet.</p>
            )}
          </div>
        </div>
      </div>

      {role === "doctor" && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
          <h3 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Pending Transaction Verifications</h3>
          {transactions.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm">No pending transactions.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex flex-col p-2 border-b border-gray-300 dark:border-gray-700"
                >
                  <span className="mb-1 text-gray-700 dark:text-gray-300">
                    Gmail: {transaction.patientGmail} | Transaction ID: {transaction.transactionId} (Post:{" "}
                    {posts.find((p) => p.id === transaction.postId)?.caption || "Unknown"})
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleApproveTransaction(transaction.id)}
                      className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-400 dark:hover:bg-green-500"
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectTransaction(transaction.id)}
                      className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                      ✗ Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {role === "doctor" && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
          <h3 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Approved Donors</h3>
          <div className="flex justify-end mb-1">
            <Button variant="destructive" onClick={handleClearDonors} size="sm" className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600">
              Clear Data
            </Button>
          </div>
          {donors.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm">No approved donors yet.</p>
          ) : (
            <ul className="space-y-2">
              {donors.map((donor) => (
                <li
                  key={donor.id}
                  className="flex justify-between items-center p-2 border-b border-gray-300 dark:border-gray-700 text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    Donor: {donor.patientGmail} | Transaction ID: {donor.transactionId} | Approved: {new Date(donor.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const DoctorDashboard = () => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [waiting, setWaiting] = useState<Booking[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [room, setRoom] = useState<string | null>(null);
  const [chatRoom, setChatRoom] = useState<string | null>(null);
  const [prescriptionPatient, setPrescriptionPatient] = useState<string | null>(null);
  const { toast } = useToast();

  const displayName = useMemo(() => user?.displayName ?? user?.email ?? "Doctor", [user]);

  const isDoctor = useMemo(
    () => DOCTOR_EMAIL.includes(user?.email?.toLowerCase() || ""),
    [user?.email]
  );

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  // Listen for new bookings
  useEffect(() => {
    const bRef = ref(db, "bookings");
    const unsubAdded = onChildAdded(bRef, (snap) => {
      const val = snap.val() as Booking;
      if (val?.status === "booked") {
        toast({
          title: "New patient waiting",
          description: `${val.userName || "Patient"} is ready to join.`,
        });
        setWaiting((prev) => [val, ...prev].slice(0, 50));
      }
    });

    const unsubAll = onValue(bRef, (snap) => {
      const arr = Object.entries(snap.val() || {}).map(([id, data]) => ({
        ...(data as Booking),
        id,
      }));
      setWaiting(
        arr
          .filter((b) => b.status === "booked")
          .sort((a, b) => b.createdAt - a.createdAt)
      );
    });

    return () => {
      unsubAdded();
      unsubAll();
    };
  }, [toast]);

  // Reports list
  useEffect(() => {
    const rRef = ref(db, "reports");
    const unsub = onValue(rRef, (snap) => {
      const arr = Object.entries(snap.val() || {}).map(([id, data]) => ({
        ...(data as Report),
        id,
      }));
      setReports(arr.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsub();
  }, []);

  // Delete booking
  const handleDeleteBooking = async (id: string) => {
    try {
      await remove(ref(db, `bookings/${id}`));
      toast({ title: "Booking removed", description: "The waiting call has been cleared." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not delete booking." });
    }
  };

  return (
    <main className="container py-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SEO
        title="Doctor Dashboard"
        description="See waiting calls, outbreak reports, prescriptions, feedback, and collaborative hub."
        canonical="/dashboard"
      />
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Hello, {displayName}</h1>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Waiting video calls</h2>
          <ul className="space-y-2">
            {waiting.map((w) => (
              <li key={w.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate text-gray-700 dark:text-gray-300">
                  {w.userName || "Patient"} – {new Date(w.createdAt).toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setChatRoom(w.roomName)} className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Open Chat
                  </Button>
                  <Button size="sm" variant="hero" onClick={() => setRoom(w.roomName)} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                    Join
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPrescriptionPatient(w.userId || null)}
                    className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Prescription
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteBooking(w.id)}
                    className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  >
                    ❌
                  </Button>
                </div>
              </li>
            ))}
            {waiting.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">No calls waiting.</p>
            )}
          </ul>
        </article>

        <article className="rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Outbreak Summary</h2>
          <OutbreakBox reports={reports} />
        </article>
      </section>

      {/* Submitted Reports with Scroll */}
      <section className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
        <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Submitted reports</h2>
        <div className="max-h-64 overflow-y-auto pr-2">
          <ul className="divide-y divide-gray-300 dark:divide-gray-700">
            {reports.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{r.type}</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {new Date(r.createdAt).toLocaleString()} – {r.location || "Unknown"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remove(ref(db, `reports/${r.id}`))}
                  className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Delete
                </Button>
              </li>
            ))}
            {reports.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">No reports yet.</p>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
        <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Feedback</h2>
        <DoctorFeedbackList />
      </section>

      {prescriptionPatient && (
        <section className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Send Prescription</h2>
          <PrescriptionBox role="doctor" patientId={prescriptionPatient} />
        </section>
      )}

      {room && (
        <div className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <VideoCall roomName={room} displayName={displayName || undefined} />
        </div>
      )}

      {chatRoom && (
        <div className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <Chat
            roomId={chatRoom}
            currentUserId={user?.uid || "anon"}
            displayName={displayName || undefined}
          />
        </div>
      )}

      <section className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
        <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Collaborative Hub</h2>
        <CollaborativeHub role="doctor" />
      </section>
    </main>
  );
};

function DoctorFeedbackList() {
  const [items, setItems] = useState<Feedback[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fRef = ref(db, "feedback");
    const unsub = onValue(fRef, (snap) => {
      const arr = Object.entries(snap.val() || {}).map(([id, data]) => ({
        ...(data as Feedback),
        id,
      }));
      setItems(arr.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsub();
  }, []);

  const handleDeleteFeedback = async (id: string) => {
    try {
      await remove(ref(db, `feedback/${id}`));
      toast({ title: "Feedback removed", description: "The feedback has been deleted." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not delete feedback." });
    }
  };

  return (
    <ul className="space-y-2">
      {items.map((f) => (
        <li key={f.id} className="rounded-md border border-gray-300 dark:border-gray-700 p-3 text-sm flex justify-between items-start bg-white dark:bg-gray-900">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {f.service} – {f.rating}/5
            </div>
            <div className="text-gray-600 dark:text-gray-400">{f.comments}</div>
            <div className="text-gray-600 dark:text-gray-400">{new Date(f.createdAt).toLocaleString()}</div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="ml-2 bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            onClick={() => handleDeleteFeedback(f.id)}
          >
            ✕
          </Button>
        </li>
      ))}
      {items.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400 text-sm">No feedback yet.</p>
      )}
    </ul>
  );
}

export default DoctorDashboard;