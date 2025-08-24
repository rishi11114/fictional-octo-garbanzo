import { useState } from "react";
import { SEO } from "@/components/SEO";

const Section = ({ title, children }: { title: string; children: string | React.ReactNode }) => (
  <article className="prose prose-sm md:prose lg:prose-lg dark:prose-invert max-w-none">
    <h1 className="mb-4">{title}</h1>
    <p>{children}</p>
  </article>
);

export default function Reproductive() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to history
    const updatedMessages = [...messages, { role: "user", text: input }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = updatedMessages
        .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
        .join("\n");

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC5EUft5tCs-H4eQqq1pxSZPVK9OlWEfXA",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a reproductive health advisor.
Answer only questions about sexual health, contraception, STI prevention, prenatal care, menstrual health, and respectful care.
If the question is unrelated, politely say: "I can only answer questions about reproductive health."

Maintain context of the ongoing conversation to provide relevant answers.

Conversation so far:
${conversationHistory}

New question: ${input}`
                  }
                ]
              }
            ]
          })
        }
      );

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn’t find an answer.";

      setMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "ai", text: "Error fetching response." }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <main className="container py-10">
      <SEO
        title="Reproductive Health"
        description="Safe, informed choices at every life stage"
        canonical="/education/reproductive"
      />
      <Section title="Reproductive Health">
        Reproductive health covers physical, mental, and social well-being related to the
        reproductive system at all life stages. This includes access to safe and effective
        contraception, prevention and treatment of sexually transmitted infections (STIs),
        healthy pregnancy and childbirth, menstrual health, and respectful healthcare practices.
        Understanding and protecting your reproductive health empowers informed, safe, and healthy
        life choices.
      </Section>

      {/* Chat UI */}
      <div className="mt-10 p-4 border rounded-lg bg-gray-100 dark:bg-gray-800">
        <h2 className="text-lg font-bold mb-3">Ask about Reproductive Health 💬</h2>

        <div className="h-60 overflow-y-auto border p-2 bg-white dark:bg-gray-900 rounded">
          {messages.map((m, i) => (
            <p key={i} className={m.role === "user" ? "text-blue-600" : "text-green-600"}>
              <strong>{m.role === "user" ? "You" : "AI"}:</strong> {m.text}
            </p>
          ))}
        </div>

        <div className="flex mt-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about reproductive health..."
            className="flex-1 border p-2 rounded-l"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}
