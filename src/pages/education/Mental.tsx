import { useState } from "react";
import { SEO } from "@/components/SEO";

type MessageRole = "user" | "ai";

interface Message {
  role: MessageRole;
  text: string;
}

const Section = ({ title, children }: { title: string; children: string | React.ReactNode }) => (
  <article className="prose prose-sm md:prose lg:prose-lg dark:prose-invert max-w-none mb-6">
    <h1 className="mb-4">{title}</h1>
    <div>{children}</div>
  </article>
);

export default function Mental() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hello! 👋 I'm here to support you with mental well-being advice. Ask me anything related to emotional health, stress, or mindfulness." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Access environment variables
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_URL = import.meta.env.VITE_API_URL;

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Check if environment variables are defined
    if (!API_KEY || !API_URL) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠ Error: API key or URL is missing. Please check your environment configuration." },
      ]);
      return;
    }

    // Add user message
    setMessages((prev) => [...prev, { role: "user", text: input.trim() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a mental health and well-being advisor. 
Only answer questions related to emotional health, stress management, mindfulness, healthy routines, or coping strategies. 
If the question is unrelated, politely say: "I can only answer questions about mental well-being." 
Provide clear, calm, and supportive advice without markdown formatting. 
Question: ${input.trim()}`
                }
              ]
            }
          ]
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn’t find an answer.";

      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠ Error fetching response from the API. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container py-10 max-w-3xl mx-auto">
      <SEO
        title="Mental Well-Being"
        description="Practical tools for emotional health"
        canonical="/education/mental"
      />

      {/* Intro Section */}
      <Section title="Mental Well-Being 💚">
        <p>
          Mental well-being is just as important as physical health. Taking care of your mind helps
          you handle stress, build resilience, and enjoy daily life more fully.
        </p>
        <ul>
          <li>🧘 Practice mindfulness or meditation daily.</li>
          <li>😴 Sleep 7–9 hours each night for proper rest.</li>
          <li>🤝 Connect with friends, family, or support groups.</li>
          <li>🏃 Stay active — even light walks can improve your mood.</li>
          <li>📖 Journaling can help release stress and organize thoughts.</li>
          <li>🩺 If distress persists, seek help from a qualified professional.</li>
        </ul>
      </Section>

      {/* Chat Section */}
      <div className="p-5 border rounded-xl bg-gray-50 dark:bg-gray-800 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Ask about Mental Well-Being 💬</h2>

        {/* Messages */}
        <div className="h-80 overflow-y-auto border p-3 bg-white dark:bg-gray-900 rounded-lg space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <span
                className={`px-4 py-2 rounded-2xl max-w-[75%] whitespace-pre-wrap text-sm md:text-base shadow-sm ${
                  m.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
          {loading && <p className="text-center text-gray-500 text-sm">Thinking...</p>}
        </div>

        {/* Input */}
        <div className="flex mt-4">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask a question about mental well-being..."
            className="flex-1 border p-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 text-white px-5 py-3 rounded-r-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}