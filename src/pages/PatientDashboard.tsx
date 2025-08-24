import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useState } from "react";
import { auth, db, signInWithGoogle } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  onValue,
  push,
  query,
  ref,
  orderByChild,
  equalTo,
  set,
  remove,
} from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import VideoCall from "@/components/VideoCall";
import Chat from "@/components/Chat";
import { useToast } from "@/hooks/use-toast";
import PrescriptionBox from "@/pages/PrescriptionBox";

// Interface for bookings
interface Booking {
  id: string;
  roomName: string;
  userId?: string;
  userName?: string;
  createdAt: number;
  status?: "booked" | "completed" | "cancelled";
  provider?: { name?: string; spec?: string };
}

// Interface for reports
interface Report {
  id: string;
  type: string;
  location?: string | null;
  userId?: string;
  createdAt: number;
}

// Interface for Collaborative Hub posts
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

// Interface for Transactions
interface Transaction {
  id: string;
  postId: string;
  transactionId: string;
  patientGmail: string;
  status: "pending" | "approved" | "rejected";
  patientId: string;
  createdAt: number;
}

const CollaborativeHub: React.FC<{ role: "patient" | "doctor" }> = ({ role }) => {
  const [posts, setPosts] = useState<HubPost[]>([]);
  const [newCaption, setNewCaption] = useState("");
  const [newUpiId, setNewUpiId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionIdInput, setTransactionIdInput] = useState("");
  const [gmailInput, setGmailInput] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const { toast } = useToast();
  const userId = auth.currentUser?.uid || "";
  const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Unknown";
  const storage = getStorage();

  // Fetch posts and transactions from Firebase Realtime Database
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
            .filter((t) => t.status === "pending" || t.status === "approved" && t.patientId === userId)
        : [];
      setTransactions(transactionsData);
      console.log("Fetched transactions:", transactionsData); // Debug log
    });

    return () => {
      unsubscribePosts();
      if (role === "doctor") unsubscribeTransactions();
    };
  }, [role, userId]); // Added userId to dependency array

  // Handle image upload to Firebase Storage
  const uploadImage = async (file: File): Promise<string> => {
    const fileRef = storageRef(storage, `ngo-images/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
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

  // Handle transaction ID submission (Patient)
  const handleTransactionSubmit = async () => {
    if (!selectedPostId || !transactionIdInput || !gmailInput) {
      toast({
        title: "Error",
        description: "Please select a post and enter both Transaction ID and Gmail.",
        variant: "destructive",
      });
      return;
    }

    try {
      const transactionsRef = ref(db, "transactions");
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        postId: selectedPostId,
        transactionId: transactionIdInput,
        patientGmail: gmailInput,
        status: "pending",
        patientId: userId,
        createdAt: Date.now(),
      });
      const donationRef = ref(db, `collaborativeHub/${selectedPostId}/donations/${userId}`);
      await set(donationRef, true);
      setTransactionIdInput("");
      setGmailInput("");
      setSelectedPostId(null);
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
      const transactionRef = ref(db, `transactions/${transactionId}`);
      await set(transactionRef, {
        ...transactions.find((t) => t.id === transactionId),
        status: "approved",
      });
      setTransactions(transactions.filter((t) => t.id !== transactionId));
      toast({
        title: "Success",
        description: "Transaction approved.",
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
            {posts.map((post) => {
              const userTransaction = transactions.find(
                (t) => t.postId === post.id && t.patientId === userId && t.status === "approved"
              );
              return (
                <div key={post.id} className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 shadow-sm">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{post.doctorName}</h4>
                  <p className="text-gray-700 dark:text-gray-300 overflow-wrap-break-word max-h-16 overflow-y-auto pr-2">{post.caption}</p>
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="NGO post"
                      className="w-full max-h-48 object-contain rounded-lg my-1"
                    />
                  )}
                  {role === "patient" && (
                    <>
                      {post.upiId && (
                        <p className="text-sm font-medium mt-1 text-gray-600 dark:text-gray-400">UPI ID: {post.upiId}</p>
                      )}
                      {userTransaction ? (
                        <p className="text-green-600 mt-1">Thanks for your donation!</p>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setSelectedPostId(post.id)}
                          className="mt-1 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                          disabled={selectedPostId === post.id}
                        >
                          Select for Donation
                        </Button>
                      )}
                    </>
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
              );
            })}
            {posts.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">No posts in the hub yet.</p>
            )}
          </div>
        </div>
      </div>

      {role === "patient" && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
          <h3 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Submit Donation Details</h3>
          <div className="space-y-2">
            <div>
              <Label htmlFor="transaction" className="text-gray-700 dark:text-gray-300">Transaction ID</Label>
              <Input
                id="transaction"
                value={transactionIdInput}
                onChange={(e) => setTransactionIdInput(e.target.value)}
                placeholder="Enter Transaction ID"
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="gmail" className="text-gray-700 dark:text-gray-300">Gmail</Label>
              <Input
                id="gmail"
                value={gmailInput}
                onChange={(e) => setGmailInput(e.target.value)}
                placeholder="Enter your Gmail"
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <Button onClick={handleTransactionSubmit} variant="hero" className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              DONATE
            </Button>
          </div>
        </div>
      )}

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
                  className="flex justify-between items-center p-2 border-b border-gray-300 dark:border-gray-700"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    Transaction ID: {transaction.transactionId} (Post:{" "}
                    {posts.find((p) => p.id === transaction.postId)?.caption || "Unknown"}) | Gmail: {transaction.patientGmail}
                  </span>
                  <div className="space-x-2">
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
    </div>
  );
};

const PatientDashboard = () => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [room, setRoom] = useState<string | null>(null);
  const [chatRoom, setChatRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const displayName = useMemo(
    () => user?.displayName ?? user?.email ?? "Guest",
    [user]
  );
  const { toast } = useToast();

  // Handle authentication state
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  // Fetch bookings and reports
  useEffect(() => {
    if (!user?.uid) {
      setMyBookings([]);
      setMyReports([]);
      return;
    }

    const bRef = query(ref(db, "bookings"), orderByChild("userId"), equalTo(user.uid));
    const rRef = query(ref(db, "reports"), orderByChild("userId"), equalTo(user.uid));

    const unsub1 = onValue(bRef, (snap) => {
      const entries = Object.entries(snap.val() || {}) as [string, Booking][];
      const arr = entries.map(([id, data]) => ({ ...data, id }));
      setMyBookings(arr.sort((a, b) => b.createdAt - a.createdAt));
    });

    const unsub2 = onValue(rRef, (snap) => {
      const entries = Object.entries(snap.val() || {}) as [string, Report][];
      const arr = entries.map(([id, data]) => ({ ...data, id }));
      setMyReports(arr.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user?.uid]);

  // Create a quick consultation room
  const quickRoom = async () => {
    if (!user?.uid) {
      toast({ title: "Sign in first", description: "Please sign in to create a booking." });
      return;
    }

    const id = crypto.randomUUID();
    const newRef = push(ref(db, "bookings"));
    const booking: Booking = {
      id: newRef.key ?? id,
      roomName: `hh-${id}`,
      userId: user.uid,
      userName: displayName,
      createdAt: Date.now(),
      status: "booked",
      provider: { name: "Dr. Narayan", spec: "General Physician" },
    };
    await set(newRef, booking);
    toast({ title: "Booking created", description: `Room ${booking.roomName} created.` });
  };

  // Delete a booking
  const deleteBooking = async (id: string) => {
    try {
      await remove(ref(db, `bookings/${id}`));
      toast({ title: "Booking removed", description: "Your booking was deleted." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not delete booking." });
    }
  };

  // Delete a report
  const deleteReport = async (id: string) => {
    try {
      await remove(ref(db, `reports/${id}`));
      toast({ title: "Report removed", description: "Your report was deleted." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not delete report." });
    }
  };

  // Submit a symptom or outbreak report
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid) {
      toast({ title: "Sign in first", description: "Please sign in to submit a report." });
      return;
    }

    const fd = new FormData(e.currentTarget);
    const type = String(fd.get("type")).trim();
    const location = String(fd.get("location")).trim();
    if (!type || !location) {
      toast({ title: "Invalid input", description: "Please fill in both fields." });
      return;
    }

    setLoading(true);
    try {
      const r = push(ref(db, "reports"));
      const data = { id: r.key, type, location, userId: user.uid, createdAt: Date.now() };
      await set(r, data);
      toast({ title: "Report submitted", description: "Thanks for helping track outbreaks." });
      (e.target as HTMLFormElement).reset();
    } catch (e: unknown) {
      toast({ title: "Failed to submit", description: e instanceof Error ? e.message : "Please try again" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container py-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SEO title="Patient Dashboard" description="Book consults, view your reports, sessions, and prescriptions." canonical="/dashboard" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Welcome, {displayName}</h1>
        <div className="flex gap-2">
          {!user ? (
            <Button variant="hero" onClick={() => signInWithGoogle()} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              Link Google account
            </Button>
          ) : (
            <Button variant="outline" onClick={() => signOut(auth)} className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              Sign out
            </Button>
          )}
        </div>
      </div>

      {/* Collaborative Hub Section - Rendered only once */}
      <section className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800" key="collaborative-hub-section">
        <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Collaborative Hub</h2>
        <CollaborativeHub role="patient" />
      </section>

      <section className="grid gap-6 md:grid-cols-2 mt-8">
        <article className="rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <h2 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Book a consultation</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Start a virtual consult with a verified professional.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="hero" onClick={() => (window.location.href = "/consult")} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Book consult</Button>
            <Button variant="outline" onClick={quickRoom} className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Quick room</Button>
          </div>
        </article>

        <article className="rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <h2 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Learn & prevent</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"><a href="/education/nutrition">Nutrition Basics</a></Button>
            <Button asChild variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"><a href="/education/exercise">Everyday Exercise</a></Button>
            <Button asChild variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"><a href="/education/hygiene">Hygiene & Sanitation</a></Button>
            <Button asChild variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"><a href="/education/mental">Mental Well-Being</a></Button>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
        <h2 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Report symptoms or outbreak</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your report helps doctors track outbreaks.
        </p>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="type" className="text-gray-700 dark:text-gray-300">Case Type</Label>
            <Input id="type" name="type" placeholder="e.g., Dengue, Malaria, Anxiety" required className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <Label htmlFor="location" className="text-gray-700 dark:text-gray-300">City / Area</Label>
            <Input id="location" name="location" placeholder="e.g., Kolkata" required className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="hero" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              {loading ? "Submitting..." : "Submit report"}
            </Button>
          </div>
        </form>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">My bookings</h3>
          <ul className="space-y-2">
            {myBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate text-gray-700 dark:text-gray-300">{new Date(b.createdAt).toLocaleString()} – Room {b.roomName}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setChatRoom(b.roomName)} className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Chat</Button>
                  <Button size="sm" variant="hero" onClick={() => setRoom(b.roomName)} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Join</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteBooking(b.id)} className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600">Cancel</Button>
                </div>
              </li>
            ))}
            {myBookings.length === 0 && <p className="text-gray-600 dark:text-gray-400 text-sm">No bookings yet.</p>}
          </ul>
        </article>

        <article className="rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">My reports</h3>
          <ul className="space-y-2">
            {myReports.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm gap-2">
                <span className="text-gray-700 dark:text-gray-300">{new Date(r.createdAt).toLocaleString()} – {r.type} @ {r.location || "Unknown"}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => deleteReport(r.id)} className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Delete</Button>
                </div>
              </li>
            ))}
            {myReports.length === 0 && <p className="text-gray-600 dark:text-gray-400 text-sm">No reports yet.</p>}
          </ul>
        </article>
      </section>

      <section className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
        <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">My Prescriptions</h2>
        <PrescriptionBox role="patient" />
      </section>

      {room && (
        <div className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 relative bg-gray-50 dark:bg-gray-800">
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            onClick={() => setRoom(null)}
          >
            ✕
          </Button>
          <VideoCall roomName={room} displayName={displayName || undefined} />
        </div>
      )}

      {chatRoom && (
        <div className="mt-8 rounded-lg border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <Chat roomId={chatRoom} currentUserId={user?.uid || "anon"} displayName={displayName || undefined} />
        </div>
      )}
    </main>
  );
};

export default PatientDashboard;