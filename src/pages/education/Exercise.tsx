import React, { useState } from "react";
import { SEO } from "@/components/SEO";

type MessageRole = "user" | "ai";

interface Message {
  role: MessageRole;
  text: string;
}

const Exercise: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "🤖 Hi there! Ask me about exercises for any health condition. Remember to always consult a doctor before starting new exercises.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Access environment variables
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_URL = import.meta.env.VITE_API_URL;

  // Function to clean up AI text formatting
  const formatText = (text: string) => {
    return text
      .replace(/\\\s*/g, "") // Remove bold asterisks
      .replace(/\\s/g, "• ") // Replace single asterisk with bullet point
      .replace(/\n\s*\n/g, "\n\n") // Keep paragraph spacing
      .trim();
  };

  const handleSend = async () => {
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
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a helpful medical fitness assistant. 
                    Suggest safe exercises for people based on their health conditions. 
                    Always remind them to consult a doctor. 
                    Format your answer in clean readable text without markdown stars or symbols. 
                    Now answer this: ${input.trim()}`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const aiRaw =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn’t generate an answer right now.";

      const aiFormatted = formatText(aiRaw);

      setMessages((prev) => [...prev, { role: "ai", text: aiFormatted }]);
    } catch (error) {
      console.error("Error:", error);
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
        title="Exercise Advisor"
        description="Safe exercises for your health condition"
        canonical="/education/exercise"
      />

      {/* Intro */}
      <div className="prose dark:prose-invert max-w-none mb-8 text-center">
        <h1 className="text-3xl font-bold">🏋‍♂ Exercise Advisor</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Discover safe exercises tailored to your health condition. Always consult a doctor before starting.
        </p>
      </div>

      {/* Educational Section */}
      <div className="max-w-3xl mx-auto prose dark:prose-invert mb-10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h2>Why Exercise Matters 💡</h2>
        <p>
          Regular physical activity improves both body and mind, boosting energy, mood, and overall health. 
          Tailored exercises can help manage specific conditions while promoting strength and well-being.
        </p>

        <h3>✅ Key Benefits of Exercise</h3>
        <ul>
          <li>Boosts energy and reduces fatigue.</li>
          <li>Improves mood and lowers stress.</li>
          <li>Strengthens muscles, bones, and joints.</li>
          <li>Helps manage weight and blood pressure.</li>
          <li>Supports better sleep and mental clarity.</li>
        </ul>

        <h3>⚠ Safety First</h3>
        <ul>
          <li>Always consult your doctor before starting new workouts, especially with health conditions.</li>
          <li>Start slowly and listen to your body to avoid injury.</li>
          <li>Use proper form to maximize benefits and minimize risks.</li>
        </ul>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          ⚠ Exercise can transform your health, but it’s critical to get professional advice for safety.
        </p>
      </div>

      {/* Chatbot */}
      <div className="max-w-xl mx-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-center">💬 Exercise Chat Assistant</h2>

        {/* Messages */}
        <div className="h-[450px] overflow-y-auto space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "ai" && (
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">
                  🤖
                </div>
              )}
              <div
                className={`px-4 py-2 rounded-2xl max-w-[75%] whitespace-pre-wrap shadow-sm ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
              {msg.role === "user" && (
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about exercises for your condition..."
            className="flex-1 border border-gray-300 dark:border-gray-600 bg-white text-black rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full font-semibold shadow-md disabled:opacity-50 transition"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
};

export default Exercise;