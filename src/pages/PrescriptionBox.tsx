import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/lib/firebase";
import { onValue, ref, set, remove } from "firebase/database";

interface Message {
  id: string;
  sender: "doctor" | "patient" | "gemini";
  type: "chat" | "prescription" | "buyLink";
  text: string;
  timestamp: number;
}

const generateId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const PrescriptionBox = ({
  role,
  patientId,
}: {
  role: "doctor" | "patient";
  patientId?: string;
}) => {
  const user = auth.currentUser;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [problemDiagnosis, setProblemDiagnosis] = useState("");
  const [medicineNames, setMedicineNames] = useState("");
  const [dosageInstructions, setDosageInstructions] = useState("");
  const [date, setDate] = useState("");
  const [hasDoctorSentFirst, setHasDoctorSentFirst] = useState(false);
  const [paymentClaimed, setPaymentClaimed] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);

  // Access environment variables
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_URL = import.meta.env.VITE_API_URL;

  // ✅ Listen to chat messages
  useEffect(() => {
    if (!user) return;
    const targetId = role === "doctor" ? patientId : user.uid;
    if (!targetId) return;
    const chatRef = ref(db, `prescriptions/${targetId}/messages`);
    const unsub = onValue(chatRef, (snap) => {
      const data: Record<string, Message> = snap.val() || {};
      const msgs: Message[] = Object.values(data);
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgs);
      if (msgs.length > 0) setHasDoctorSentFirst(true);
    });
    return () => unsub();
  }, [role, patientId, user]);

  // ✅ Listen to payment status
  useEffect(() => {
    if (!user) return;
    const targetId = role === "doctor" ? patientId : user.uid;
    if (!targetId) return;
    const paymentRef = ref(db, `prescriptions/${targetId}/payment_status`);
    const unsub = onValue(paymentRef, (snap) => {
      const data = snap.val() || { claimed: false, verified: false };
      setPaymentClaimed(data.claimed);
      setPaymentVerified(data.verified);
    });
    return () => unsub();
  }, [role, patientId, user]);

  // ✅ Show popup for doctor
  useEffect(() => {
    if (role === "doctor" && paymentClaimed && !paymentVerified) {
      setShowVerificationPopup(true);
    } else {
      setShowVerificationPopup(false);
    }
  }, [paymentClaimed, paymentVerified, role]);

  const saveMessage = async (msg: Message) => {
    const targetId = role === "doctor" ? patientId : user?.uid;
    if (!targetId) return;
    const chatRef = ref(db, `prescriptions/${targetId}/messages/${msg.id}`);
    await set(chatRef, msg);
  };

  const handleDeletePrescription = async (msgId: string) => {
    if (!user) return;
    const targetId = role === "doctor" ? patientId : user.uid;
    const chatRef = ref(db, `prescriptions/${targetId}/messages/${msgId}`);
    await remove(chatRef);
  };

  const handleClearChat = async () => {
    if (!user) return;
    const targetId = role === "doctor" ? patientId : user.uid;
    const chatRef = ref(db, `prescriptions/${targetId}/messages`);
    await remove(chatRef);
    setMessages([]);
  };

  const handleSendChat = async () => {
    if (!inputText.trim() || !user) return;
    const msg: Message = {
      id: generateId(),
      sender: role,
      type: "chat",
      text: inputText,
      timestamp: Date.now(),
    };
    await saveMessage(msg);
    setInputText("");
  };

  const fetchBuyLinks = async (medicines: string) => {
    // Check if environment variables are defined
    if (!API_KEY || !API_URL) {
      setMessages((prev) => [
        ...prev,
        { 
          id: generateId(),
          sender: "gemini",
          type: "buyLink",
          text: "⚠ Error: API key or URL is missing. Please check your environment configuration.",
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `⚠️ RULES:
1. Reply ONLY in **markdown clickable links**.
2. Each medicine → at least 2 pharmacy links (1mg, Netmeds, Apollo, PharmEasy).
3. If not found → general 1mg search.

Generate buy links for:
${medicines}`,
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (!text) {
        text = medicines
          .split(",")
          .map(
            (med) => `**${med.trim()}**  
- [Search on 1mg](https://www.1mg.com/search/all?name=${encodeURIComponent(
              med.trim()
            )})  
- [Search on Netmeds](https://www.netmeds.com/catalogsearch/result?q=${encodeURIComponent(
              med.trim()
            )})`
          )
          .join("\n\n");
      }

      const geminiMsg: Message = {
        id: generateId(),
        sender: "gemini",
        type: "buyLink",
        text,
        timestamp: Date.now(),
      };

      const targetId = role === "doctor" ? patientId : user?.uid;
      const chatRef = ref(
        db,
        `prescriptions/${targetId}/messages/${geminiMsg.id}`
      );
      await set(chatRef, geminiMsg);
    } catch (err) {
      console.error("Gemini fetch error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: "gemini",
          type: "buyLink",
          text: "⚠ Error fetching buy links from the API. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleSendPrescription = async () => {
    if (!problemDiagnosis || !medicineNames || !dosageInstructions || !date)
      return;
    if (!user || !patientId) return;

    const msg: Message = {
      id: generateId(),
      sender: "doctor",
      type: "prescription",
      text: `Diagnosis: ${problemDiagnosis}\nMedicines: ${medicineNames}\nDosage: ${dosageInstructions}\nNext Visit: ${date}`,
      timestamp: Date.now(),
    };

    const targetId = patientId;
    const chatRef = ref(db, `prescriptions/${targetId}/messages/${msg.id}`);
    await set(chatRef, msg);

    const paymentRef = ref(db, `prescriptions/${targetId}/payment_status`);
    await set(paymentRef, { claimed: false, verified: false });

    await fetchBuyLinks(medicineNames);

    setProblemDiagnosis("");
    setMedicineNames("");
    setDosageInstructions("");
    setDate("");
  };

  const handleConfirmPayment = async () => {
    if (!user) return;
    const targetId = user.uid;
    const paymentRef = ref(db, `prescriptions/${targetId}/payment_status`);
    await set(paymentRef, { claimed: true, verified: false });
  };

  const handleVerifyYes = async () => {
    if (!user || !patientId) return;
    const targetId = patientId;
    const paymentRef = ref(db, `prescriptions/${targetId}/payment_status`);
    await set(paymentRef, { claimed: true, verified: true });
    setShowVerificationPopup(false);
  };

  const handleVerifyNo = async () => {
    if (!user || !patientId) return;
    const targetId = patientId;
    const paymentRef = ref(db, `prescriptions/${targetId}/payment_status`);
    await set(paymentRef, { claimed: false, verified: false });
    setShowVerificationPopup(false);
  };

  const renderMarkdownLinks = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const match = line.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <p key={idx} className="text-blue-600 underline">
            <a href={match[2]} target="_blank" rel="noopener noreferrer">
              {match[1]}
            </a>
          </p>
        );
      }
      return <p key={idx}>{line}</p>;
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Chat Messages */}
      <div className="p-4 rounded-xl shadow-inner h-96 overflow-y-auto space-y-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
        {messages.length > 0 ? (
          messages.map((msg) => {
            const shouldBlur =
              role === "patient" && hasDoctorSentFirst && !paymentVerified;

            let alignment = "justify-start"; // doctor default
            if (msg.sender === "patient") alignment = "justify-end";
            if (msg.sender === "gemini") alignment = "justify-center";

            return (
              <div key={msg.id} className={`flex ${alignment}`}>
                <div
                  className={`relative p-3 rounded-lg max-w-xs shadow ${
                    msg.sender === "doctor"
                      ? "bg-blue-100/80 text-blue-900"
                      : msg.sender === "patient"
                      ? "bg-green-100/80 text-green-900"
                      : "bg-purple-100/80 text-purple-900"
                  }`}
                >
                  {/* Blur prescriptions AND buy links */}
                  <div
                    className={
                      shouldBlur &&
                      (msg.type === "prescription" || msg.type === "buyLink")
                        ? "blur-sm select-none"
                        : ""
                    }
                  >
                    {msg.type === "chat" && <p>{msg.text}</p>}
                    {msg.type === "prescription" && (
                      <div>
                        <p className="font-semibold">📋 Prescription</p>
                        <pre className="whitespace-pre-wrap text-sm">
                          {msg.text}
                        </pre>
                        {role === "doctor" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleDeletePrescription(msg.id)}
                          >
                            Delete Prescription
                          </Button>
                        )}
                      </div>
                    )}
                    {msg.type === "buyLink" && (
                      <div className="space-y-1 text-center">
                        <p className="font-semibold">🛒 Buy Links</p>
                        <div className="text-sm">
                          {renderMarkdownLinks(msg.text)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-sm">No messages yet.</p>
        )}
      </div>

      {/* Doctor verification popup */}
      {showVerificationPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-lg shadow-lg space-y-4">
            <p className="text-lg font-semibold">
              Verify if the patient has paid the fees?
            </p>
            <div className="flex space-x-4 justify-center">
              <Button
                onClick={handleVerifyYes}
                className="bg-green-600 text-white"
              >
                Yes
              </Button>
              <Button onClick={handleVerifyNo} variant="destructive">
                No
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor input area */}
      {role === "doctor" && (
        <div className="space-y-4">
          {/* Chat Input */}
          <div className="flex space-x-2">
            <Input
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <Button onClick={handleSendChat}>Send</Button>
          </div>

          {/* Prescription Form */}
          <div className="p-4 border rounded-lg bg-white/70 dark:bg-gray-900/70 backdrop-blur-md space-y-2">
            <h3 className="font-semibold">Send Prescription</h3>
            <Input
              placeholder="Problem / Diagnosis"
              value={problemDiagnosis}
              onChange={(e) => setProblemDiagnosis(e.target.value)}
            />
            <Input
              placeholder="Medicine(s)"
              value={medicineNames}
              onChange={(e) => setMedicineNames(e.target.value)}
            />
            <Textarea
              placeholder="Dosage Instructions"
              value={dosageInstructions}
              onChange={(e) => setDosageInstructions(e.target.value)}
            />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button
              onClick={handleSendPrescription}
              className="w-full bg-blue-600 text-white"
            >
              Send Prescription
            </Button>
          </div>

          {/* Clear Chat */}
          <Button
            variant="destructive"
            onClick={handleClearChat}
            className="w-full"
          >
            Clear Chat (Doctor)
          </Button>
        </div>
      )}

      {/* Patient input area */}
      {role === "patient" && (
        <div className="space-y-4">
          {hasDoctorSentFirst && !paymentVerified ? (
            <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-white/70 dark:bg-gray-900/70 backdrop-blur-md shadow">
              {paymentClaimed ? (
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Waiting for doctor to verify payment...
                </p>
              ) : (
                <>
                  <img
                    src="/upi.png"
                    alt="Payment QR"
                    className="w-56 h-56 rounded-lg shadow-md"
                  />
                  <Button onClick={handleConfirmPayment} className="w-40">
                    Confirm Payment
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Patient Chat Input */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <Button onClick={handleSendChat}>Send</Button>
              </div>
              <Button
                variant="destructive"
                onClick={handleClearChat}
                className="w-full"
              >
                Clear Chat (Patient)
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PrescriptionBox;