import React, { useMemo, useState, useEffect, useCallback } from "react";

interface OutbreakBoxProps {
  reports: Array<{ id: string; type?: string; location?: string | null; createdAt?: number }>;
}

type Aggregated = Record<string, Record<string, number>>; // city -> disease -> count

// Access environment variables
const API_KEY = import.meta.env.VITE_API_KEY;
const API_URL = import.meta.env.VITE_API_URL;
const POLLING_INTERVAL = parseInt(import.meta.env.VITE_POLLING_INTERVAL_MS || "600000", 10);

function groupLocal(reports: OutbreakBoxProps["reports"]): Aggregated {
  const agg: Aggregated = {};
  for (const r of reports) {
    const city = (r.location || "Unknown").toString().trim().toLowerCase();
    const disease = (r.type || "Unknown").toString().trim().toLowerCase();
    if (!agg[city]) agg[city] = {};
    agg[city][disease] = (agg[city][disease] || 0) + 1;
  }
  return agg;
}

const OutbreakBox: React.FC<OutbreakBoxProps> = ({ reports }) => {
  const [globalReports, setGlobalReports] = useState<Aggregated>({});
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const aggregatedLocal = useMemo(() => groupLocal(reports), [reports]);

  const fetchGlobalOutbreaks = useCallback(async () => {
    if (!API_KEY || !API_URL) {
      setError("API key or URL is missing. Please check your environment configuration.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Return ONLY valid JSON (no text, no commentary). 
                  Format: { "city": { "disease": count } }.
                  Example: { "delhi": { "flu": 12, "covid": 5 }, "mumbai": { "dengue": 7 } }
                  Now give me a summary of current disease outbreaks worldwide.`,
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
      console.log("API Response:", data);

      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textResponse) {
        try {
          const parsedData: Aggregated = JSON.parse(textResponse);
          if (typeof parsedData !== "object" || parsedData === null) {
            throw new Error("Invalid JSON structure: Expected an object.");
          }
          setGlobalReports(parsedData);
          setRetryCount(0);
        } catch (e) {
          const match = textResponse.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              const parsed: Aggregated = JSON.parse(match[0]);
              setGlobalReports(parsed);
              setRetryCount(0);
            } catch (e2) {
              throw new Error("Unable to parse Gemini API response as JSON.");
            }
          } else {
            throw new Error("Gemini API did not return JSON.");
          }
        }
      } else {
        throw new Error("Unexpected response format from Gemini API.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Fetch Error:", err);

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
        setError(`Retrying... Failed to fetch global outbreaks: ${errorMessage}`);
        setTimeout(fetchGlobalOutbreaks, 2000 * (retryCount + 1));
      } else {
        setError(`Failed to fetch global outbreaks after ${maxRetries} retries: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchGlobalOutbreaks();
    const interval = setInterval(fetchGlobalOutbreaks, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchGlobalOutbreaks]);

  const localEntries = useMemo(() => {
    const list = Object.entries(aggregatedLocal).map(([city, dis]) => ({
      city,
      diseases: Object.entries(dis).sort((a, b) => b[1] - a[1]),
      total: Object.values(dis).reduce((s, n) => s + n, 0),
    }));
    list.sort((a, b) => b.total - a.total);
    return list;
  }, [aggregatedLocal]);

  const globalEntries = useMemo(() => {
    const list = Object.entries(globalReports).map(([city, dis]) => ({
      city,
      diseases: Object.entries(dis).sort((a, b) => b[1] - a[1]),
      total: Object.values(dis).reduce((s, n) => s + n, 0),
    }));
    list.sort((a, b) => b.total - a.total);
    return list;
  }, [globalReports]);

  const handleScaleChange = (increment: number) => {
    setScale((prev) => Math.max(0.5, Math.min(prev + increment, 2)));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          Doctor's Outbreak Dashboard
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleScaleChange(-0.1)}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Zoom Out
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {(scale * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => handleScaleChange(0.1)}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Zoom In
          </button>
        </div>
      </div>

      <div
        className="grid md:grid-cols-2 gap-6"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {/* Local Reports */}
        <div className="space-y-4">
          <div className="grid gap-2 items-end">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Real-time outbreak summary from patient-submitted reports.
            </div>
          </div>
          {localEntries.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No patient reports yet.</p>
          )}
          <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
            {localEntries.map(({ city, diseases, total }) => (
              <div
                key={city}
                className="rounded-md border p-4 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize text-gray-800 dark:text-gray-100">
                    {city}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {total} cases
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {diseases.map(([name, count]) => (
                    <li key={name} className="flex items-center justify-between">
                      <span className="capitalize text-gray-700 dark:text-gray-300">{name}</span>
                      <span className="text-gray-500 dark:text-gray-400">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Global Reports */}
        <div className="space-y-4">
          <div className="grid gap-2 items-end">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Global outbreak summary (updated every {POLLING_INTERVAL / 60000} minutes via Gemini API).
            </div>
            {isLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading global data...</p>
            )}
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          </div>
          {globalEntries.length === 0 && !isLoading && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No global reports available.</p>
          )}
          <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
            {globalEntries.map(({ city, diseases, total }) => (
              <div
                key={city}
                className="rounded-md border p-4 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize text-gray-800 dark:text-gray-100">
                    {city}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {total} cases
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {diseases.map(([name, count]) => (
                    <li key={name} className="flex items-center justify-between">
                      <span className="capitalize text-gray-700 dark:text-gray-300">{name}</span>
                      <span className="text-gray-500 dark:text-gray-400">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutbreakBox;