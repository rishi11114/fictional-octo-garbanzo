import { useState } from "react";
import { SEO } from "@/components/SEO";

type MessageRole = "user" | "ai";

interface Message {
  role: MessageRole;
  text: string;
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiPayload = {
  contents: {
    parts: GeminiPart[];
  }[];
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: string | React.ReactNode;
}) => (
  <article className="prose prose-sm md:prose lg:prose-lg dark:prose-invert max-w-none mb-6">
    <h1 className="mb-4">{title}</h1>
    <div>{children}</div>
  </article>
);

export default function Nutrition() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hello! 🍎 I'm your nutrition advisor. Ask me about food, healthy diets, or upload a food photo for analysis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);

  // Access environment variables
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_URL = import.meta.env.VITE_API_URL;

  const cleanAndFormatAIText = (text: string) => {
    return text
      .replace(/[*_]+/g, "")
      .replace(/Disclaimer:.*/gi, "")
      .replace(/Important Considerations:.*/gi, "")
      .trim()
      .replace(/(Calories:)/gi, "\n\n🍽️ $1")
      .replace(/(Protein:)/gi, "\n\n💪 $1")
      .replace(/(Fat:)/gi, "\n\n🥑 $1")
      .replace(/(Carbohydrates:)/gi, "\n\n🍞 $1")
      .replace(/(Fiber:)/gi, "\n\n🌾 $1")
      .replace(/(Sugar:)/gi, "\n\n🍬 $1")
      .replace(/(Vitamins:)/gi, "\n\n💊 $1")
      .replace(/(Minerals:)/gi, "\n\n🧂 $1")
      .replace(/(Omega-3.*:)/gi, "\n\n🐟 $1");
  };

  const sendMessage = async () => {
    if (!input.trim() && !image) return;

    // Check if environment variables are defined
    if (!API_KEY || !API_URL) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠ Error: API key or URL is missing. Please check your environment configuration." },
      ]);
      setLoading(false);
      return;
    }

    // Add user message
    if (input.trim()) {
      setMessages((prev) => [...prev, { role: "user", text: input.trim() }]);
    } else if (image) {
      setMessages((prev) => [
        ...prev,
        { role: "user", text: `📷 Uploaded image: ${image.name}` },
      ]);
    }

    setInput("");
    setLoading(true);

    const fetchAIResponse = async (payload: GeminiPayload) => {
      try {
        const res = await fetch(`${API_URL}?key=${API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        const replyRaw =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Sorry, I couldn’t find an answer.";
        const reply = cleanAndFormatAIText(replyRaw);

        setMessages((prev) => [...prev, { role: "ai", text: reply }]);
      } catch (err) {
        console.error("Error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: "⚠ Error fetching response from the API. Please try again." },
        ]);
      } finally {
        setLoading(false);
        // 🔥 Do NOT clear image here
      }
    };

    if (!image) {
      const payload: GeminiPayload = {
        contents: [
          {
            parts: [
              {
                text: `You are a nutrition and healthy eating advisor. Provide a clean, concise, and sectioned nutritional breakdown with emojis for categories, without disclaimers. Question: ${input.trim()}`,
              },
            ],
          },
        ],
      };
      return fetchAIResponse(payload);
    }

    // Handle image upload
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(",")[1];
      const payload: GeminiPayload = {
        contents: [
          {
            parts: [
              {
                text:
                  input.trim() ||
                  "You are a nutrition and healthy eating advisor. Analyze the uploaded food image and give a clean, emoji-enhanced nutritional breakdown without disclaimers.",
              },
              {
                inlineData: {
                  mimeType: image.type,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      };
      fetchAIResponse(payload);
    };
    reader.readAsDataURL(image);
  };

  return (
    <main className="container py-10 max-w-3xl mx-auto">
      <SEO
        title="Nutrition Basics"
        description="Foundations of a balanced diet"
        canonical="/education/nutrition"
      />

      {/* Intro Sections */}
      <Section title="Nutrition Basics">
        Balanced plates emphasize whole grains, colorful vegetables, fruits,
        lean proteins, and healthy fats. Hydrate well and limit ultra-processed
        foods. Understanding macronutrients (proteins, fats, carbs) and
        micronutrients (vitamins, minerals) helps optimize your diet.
      </Section>

      <Section title="Nutrient Education">
        <ul className="list-disc ml-5">
          <li>
            <strong>Proteins:</strong> Essential for muscle repair, hormones,
            and enzymes.
          </li>
          <li>
            <strong>Carbohydrates:</strong> Primary energy source; choose whole
            grains and fibers.
          </li>
          <li>
            <strong>Fats:</strong> Important for brain health; prefer
            unsaturated fats.
          </li>
          <li>
            <strong>Vitamins:</strong> Support immune system, vision, and bone
            health.
          </li>
          <li>
            <strong>Minerals:</strong> Crucial for bones, teeth, and metabolism.
          </li>
          <li>
            <strong>Fiber:</strong> Supports digestion and healthy gut bacteria.
          </li>
          <li>
            <strong>Hydration:</strong> Essential for all bodily functions.
          </li>
        </ul>
      </Section>

      {/* Chatbox */}
      <div className="p-5 border rounded-xl bg-gray-50 dark:bg-gray-800 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Ask about Nutrition 🍏</h2>

        {/* Messages */}
        <div className="h-80 overflow-y-auto border p-3 bg-white dark:bg-gray-900 rounded-lg space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <span
                className={`px-4 py-2 rounded-2xl max-w-[75%] whitespace-pre-wrap text-sm md:text-base shadow-sm ${
                  m.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
          {loading && (
            <p className="text-center text-gray-500 text-sm">Analyzing...</p>
          )}
        </div>

        {/* Input + File Upload */}
        <div className="flex mt-4 gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask a question about nutrition..."
            className="flex-1 border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-black"
          />
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={(e) => e.target.files && setImage(e.target.files[0])}
            className="border p-2 rounded-lg bg-white text-black"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 text-white px-5 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>

        {/* Image Preview */}
        {image && (
          <div className="mt-3 flex items-center gap-3 bg-gray-200 dark:bg-gray-700 p-2 rounded-lg">
            <img
              src={URL.createObjectURL(image)}
              alt="preview"
              className="w-12 h-12 object-cover rounded"
            />
            <span className="text-sm text-gray-800 dark:text-gray-200">
              {image.name}
            </span>
            <button
              onClick={() => setImage(null)}
              className="ml-auto text-red-500 hover:text-red-700 text-sm"
            >
              ❌
            </button>
          </div>
        )}
      </div>
    </main>
  );
}