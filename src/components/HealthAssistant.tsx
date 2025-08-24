// src/components/HealthAssistant.tsx
import React, { useState } from "react";
import { Send, Bot } from "lucide-react";

// ✅ Load from .env (Vite requires VITE_ prefix)
const API_KEY = import.meta.env.VITE_API_KEY as string;
const API_URL = import.meta.env.VITE_API_URL as string;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const HealthAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hello! I'm your Health Hub Assistant. I can give wellness & exercise tips, or guide you on how to use different features like booking a consult, reporting an outbreak, or joining a campaign.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Knowledge base for platform guide ---
  const guideResponses: Record<string, string> = {
    consult:
      "💻 To book a doctor consultation, go to **Consultation Page (/consult)**. There you can choose a doctor and start a video call.",
    donation:
      "🤝 You can explore NGO and doctor donation posts in the **Collaborative Hub (/dashboard)**. Just click 'Donate' on the post you want to support.",
    campaign:
      "🩸 In the **Campaign Hub (/campaigns)** doctors post health drives like blood donation camps or wellness programs. You can view active campaigns and participate.",
    report:
      "📢 To report an outbreak or symptoms, go to the **Report Page (/report)** or your patient dashboard. Fill in case type and location — doctors will see it in real time.",
    education:
      "📚 Want to learn? Visit the **Education Page (/education)** for multilingual modules on Nutrition, Exercise, Hygiene, Reproductive Health, and Mental Well-being.",
    prescription:
      "💊 Your prescriptions are available in the **Dashboard (/dashboard)** under 'My Prescriptions'. Doctors will send them after consultations.",
    feedback:
      "📝 To share feedback, head to the **Feedback Page (/feedback)** and rate your experience. This helps improve the system.",
  };

  const formatAIText = (text: string) => {
    const clean = text.replace(/\*\*/g, "").trim();
    const parts = clean.split(/\n+/).filter((p) => p.trim() !== "");
    return parts.join("\n\n");
  };

  const checkGuideResponse = (query: string): string | null => {
    const q = query.toLowerCase();
    if (q.includes("consult")) return guideResponses.consult;
    if (q.includes("donate") || q.includes("ngo"))
      return guideResponses.donation;
    if (q.includes("campaign") || q.includes("blood"))
      return guideResponses.campaign;
    if (q.includes("report") || q.includes("outbreak"))
      return guideResponses.report;
    if (q.includes("education") || q.includes("learn"))
      return guideResponses.education;
    if (q.includes("prescription") || q.includes("medicine"))
      return guideResponses.prescription;
    if (q.includes("feedback")) return guideResponses.feedback;
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // --- Check static guide response first ---
    const guideReply = checkGuideResponse(input);
    if (guideReply) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: guideReply },
      ]);
      setLoading(false);
      return;
    }

    try {
      const contents = [
        {
          role: "user",
          parts: [
            {
              text: `You are both:
1. A professional medical & fitness assistant.
2. A guide for the Health Hub platform.

Rules:
- If the user asks about health conditions/exercises → Answer in this exact structured format (no markdown):
Overview of the condition/question:
[One short, clear paragraph]

Recommended exercises:
[List safe exercises or say "Avoid exercise"]

Cautions / when to seek a doctor:
[List warning signs and situations]

- If the user asks about navigation/features of Health Hub → explain clearly where to find the requested feature (consultation, report, donation, campaign, prescription, education, feedback).`,
            },
          ],
        },
        ...updatedMessages.map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
      ];

      const res = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      const data = await res.json();
      const rawReply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't process that.";
      const aiReply = formatAIText(rawReply);

      setMessages((prev) => [...prev, { role: "assistant", content: aiReply }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Error: Unable to reach AI service." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto flex flex-col h-[600px] rounded-2xl shadow-2xl overflow-hidden 
      bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex items-center gap-2 shadow-md">
        <div className="relative">
          <Bot className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="font-semibold text-lg">Health Hub Assistant</h2>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 dark:bg-gray-800/40">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-md whitespace-pre-line animate-fadeIn 
            ${
              m.role === "user"
                ? "ml-auto bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-none"
                : "mr-auto bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-bl-none"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* Input box */}
      <div className="p-3 border-t bg-white/70 dark:bg-gray-900/50 flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-full px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 
          bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          placeholder="💬 Ask about health OR how to use Health Hub..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:scale-105 transition-transform 
          text-white px-5 py-2 rounded-full shadow-lg disabled:opacity-50"
        >
          {loading ? "..." : <Send size={18} />}
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
        *AI wellness & platform guide — not a substitute for professional medical advice.*
      </p>

      {/* Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
        `}
      </style>
    </div>
  );
};

export default HealthAssistant;
