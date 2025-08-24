import React, { useState } from "react";
import { SEO } from "@/components/SEO";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function Hygiene() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "👋 Hi! I’m your hygiene assistant. Ask me anything about hygiene and sanitation 🧼" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Access environment variables
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_URL = import.meta.env.VITE_API_URL;

  // Clean formatting for AI text
  const formatText = (text: string) => {
    return text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "• ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();
  };

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
                  text: `You are a hygiene and sanitation expert. 
Only answer questions related to hygiene, sanitation, cleanliness, or preventing the spread of disease. 
If the question is unrelated, politely say: "I can only answer questions about hygiene."
Format your answer in clean readable text without markdown stars.
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
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn’t find an answer.";

      setMessages((prev) => [...prev, { role: "ai", text: formatText(reply) }]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠ Error fetching response from the API." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container py-10">
      <SEO
        title="Hygiene & Sanitation"
        description="Habits that protect you and your community"
        canonical="/education/hygiene"
      />

      {/* Intro */}
      <div className="prose dark:prose-invert max-w-none mb-8 text-center">
        <h1 className="text-3xl font-bold">🧼 Hygiene & Sanitation</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Wash hands for 20 seconds, treat water safely, separate raw/cooked foods, and keep living spaces clean.
        </p>
      </div>

      {/* Educational Section */}
      <div className="max-w-3xl mx-auto prose dark:prose-invert mb-10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h2>Why Hygiene Matters 💡</h2>
        <p>
          Good hygiene isn’t just about staying clean—it’s about protecting yourself, your family, and your community 
          from preventable diseases. Simple daily actions can greatly reduce the spread of bacteria and viruses.
        </p>

        <h3>👐 Hand Hygiene</h3>
        <ul>
          <li>Wash hands with soap and water for at least 20 seconds, especially before eating and after using the toilet.</li>
          <li>Use alcohol-based hand sanitizer when soap and water are not available.</li>
          <li>Avoid touching your eyes, nose, and mouth with unwashed hands.</li>
        </ul>

        <h3>🥗 Food Safety</h3>
        <ul>
          <li>Always separate raw and cooked foods to prevent cross-contamination.</li>
          <li>Wash fruits and vegetables thoroughly before eating.</li>
          <li>Cook meat, poultry, and seafood to safe internal temperatures.</li>
        </ul>

        <h3>💧 Safe Water</h3>
        <ul>
          <li>Drink only clean, safe water—boil or filter when necessary.</li>
          <li>Store water in clean, covered containers.</li>
          <li>Avoid using untreated water for cooking or brushing teeth.</li>
        </ul>

        <h3>🏠 Environmental Hygiene</h3>
        <ul>
          <li>Dispose of waste properly to avoid attracting pests and spreading disease.</li>
          <li>Keep living areas well-ventilated and free of dampness.</li>
          <li>Regularly clean frequently touched surfaces like doorknobs, phones, and light switches.</li>
        </ul>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          ⚠ Good hygiene practices protect against diarrhea, respiratory infections, and skin diseases. 
          Everyone has a role in maintaining community health.
        </p>
      </div>

      {/* Chatbot */}
      <div className="max-w-xl mx-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-center">💬 Hygiene Chat Assistant</h2>

        {/* Messages */}
        <div className="h-[450px] overflow-y-auto space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "ai" && (
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">
                  🤖
                </div>
              )}
              <div
                className={`px-4 py-2 rounded-2xl max-w-[75%] whitespace-pre-wrap shadow-sm ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                }`}
              >
                {m.text}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white text-sm font-bold">
                  👤
                </div>
              )}
            </div>
          ))}
          {loading && (
            <p className="text-center text-gray-500 text-sm animate-pulse">🤔 Thinking...</p>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Type your hygiene question..."
            className="flex-1 border border-gray-300 dark:border-gray-600 bg-white text-black rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full font-semibold shadow-md disabled:opacity-50 transition"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}