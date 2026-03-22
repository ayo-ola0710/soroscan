"use client";
import { useState } from "react";

type APIKey = {
  id: string;
  key: string;
  createdAt: string;
};

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const random = Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `sk_live_${random}`;
}

export default function APIKeyManager() {
  const [keys, setKeys] = useState<APIKey[]>(() => {
    const saved = localStorage.getItem("apiKeys");
    return saved ? JSON.parse(saved) : [];
  });
  const [copied, setCopied] = useState<string | null>(null);

  // Commented out useEffect to avoid localStorage dependency
  // useEffect(() => {
  //   const saved = localStorage.getItem("apiKeys");
  //   if (saved) setKeys(JSON.parse(saved));
  // }, []);

  const saveKeys = (newKeys: APIKey[]) => {
    setKeys(newKeys);
    localStorage.setItem("apiKeys", JSON.stringify(newKeys));
  };

  const handleGenerate = () => {
    const newKey: APIKey = {
      id: Date.now().toString(),
      key: generateKey(),
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    saveKeys([...keys, newKey]);
  };

  const handleRevoke = (id: string) => {
    saveKeys(keys.filter((k) => k.id !== id));
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="border border-green-500/30 rounded p-4 mb-4">
      <h2 className="text-green-400 font-mono text-sm mb-3">[ API KEYS ]</h2>
      <button
        onClick={handleGenerate}
        className="mb-4 px-4 py-2 border border-green-400 rounded font-mono text-sm text-green-400 hover:bg-green-400/10 transition-colors"
      >
        + Generate New Key
      </button>
      {keys.length === 0 ? (
        <p className="font-mono text-sm text-green-700">No API keys yet.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 font-mono text-xs text-green-600 pb-1 border-b border-green-500/20">
            <span>KEY</span>
            <span>CREATED</span>
            <span>ACTIONS</span>
          </div>
          {keys.map((k) => (
            <div key={k.id} className="grid grid-cols-3 font-mono text-sm items-center">
              <span className="text-green-300 truncate pr-2">
                {k.key.slice(0, 16)}...
              </span>
              <span className="text-green-600 text-xs">{k.createdAt}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(k.key)}
                  className="text-xs text-green-400 hover:text-green-300 border border-green-500/30 px-2 py-1 rounded"
                >
                  {copied === k.key ? "✓" : "COPY"}
                </button>
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="text-xs text-red-500 hover:text-red-400 border border-red-500/30 px-2 py-1 rounded"
                >
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
