import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onValue, push, ref, remove, set } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const storage = getStorage();

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

      // Store donor information with Gmail, transaction ID, and timestamp
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

  return (
    <div className="space-y-6">
      {role === "doctor" && (
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Create NGO Post</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder="Enter caption"
              />
            </div>
            <div>
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                placeholder="Enter UPI ID"
              />
            </div>
            <div>
              <Label htmlFor="image">Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handlePostSubmit}>Post</Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-2">NGO Posts</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {role === "patient"
            ? "View NGO/donation-related posts shared by doctors and contribute if you wish."
            : "Manage your NGO posts and verify donations."}
        </p>
        <div className="max-h-96 overflow-y-auto pr-2">
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="border rounded-lg p-4 shadow">
                <h4 className="font-semibold">{post.doctorName}</h4>
                <p>{post.caption}</p>
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="NGO post"
                    className="w-full max-h-96 object-contain rounded-lg my-2"
                  />
                )}
                {role === "patient" && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm font-medium">UPI ID: {post.upiId}</p>
                    <div>
                      <Label htmlFor={`transaction-${post.id}`}>Transaction ID</Label>
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
                      />
                    </div>
                    <div>
                      <Label htmlFor={`gmail-${post.id}`}>Gmail</Label>
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
                      />
                    </div>
                    <Button
                      onClick={() => handleTransactionSubmit(post.id)}
                      variant="hero"
                    >
                      Submit Transaction ID and Gmail
                    </Button>
                  </div>
                )}
                {role === "doctor" && post.doctorId === userId && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDeletePost(post.id)}
                    className="mt-2"
                  >
                    Delete Post
                  </Button>
                )}
              </div>
            ))}
            {posts.length === 0 && (
              <p className="text-muted-foreground text-sm">No posts in the hub yet.</p>
            )}
          </div>
        </div>
      </div>

      {role === "doctor" && (
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Pending Transaction Verifications</h3>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending transactions.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex justify-between items-center p-2 border-b"
                >
                  <span>
                    Gmail: {transaction.patientGmail} | Transaction ID: {transaction.transactionId} (Post:{" "}
                    {posts.find((p) => p.id === transaction.postId)?.caption || "Unknown"})
                  </span>
                  <div className="space-x-2">
                    <Button
                      onClick={() => handleApproveTransaction(transaction.id)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectTransaction(transaction.id)}
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
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Approved Donors</h3>
          {donors.length === 0 ? (
            <p className="text-muted-foreground text-sm">No approved donors yet.</p>
          ) : (
            <ul className="space-y-2">
              {donors.map((donor) => (
                <li
                  key={donor.id}
                  className="flex justify-between items-center p-2 border-b text-sm"
                >
                  <span>
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

export default CollaborativeHub;