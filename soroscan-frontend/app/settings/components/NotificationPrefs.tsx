"use client";
import { useState } from "react";

type Prefs = {
  email: boolean;
  inApp: boolean;
  webhook: boolean;
  webhookUrl: string;
};

export default function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Prefs>({
    email: true,
    inApp: true,
    webhook: false,
    webhookUrl: "",
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof Omit<Prefs, "webhookUrl">) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("notificationPrefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="border border-green-500/30 rounded p-4 mb-4">
      <h2 className="text-green-400 font-mono text-sm mb-3">[ NOTIFICATIONS ]</h2>
      <div className="space-y-3">
        {([
          { key: "email", label: "Email Notifications" },
          { key: "inApp", label: "In-App Notifications" },
          { key: "webhook", label: "Webhook" },
        ] as const).map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="font-mono text-sm text-green-300">{label}</span>
            <button
              onClick={() => toggle(key)}
              className={`w-12 h-6 rounded-full border transition-colors font-mono text-xs ${
                prefs[key]
                  ? "border-green-400 bg-green-400/20 text-green-400"
                  : "border-green-500/30 text-green-700"
              }`}
            >
              {prefs[key] ? "ON" : "OFF"}
            </button>
          </div>
        ))}
        {prefs.webhook && (
          <input
            type="text"
            placeholder="https://your-webhook-url.com"
            value={prefs.webhookUrl}
            onChange={(e) => setPrefs((p) => ({ ...p, webhookUrl: e.target.value }))}
            className="w-full bg-transparent border border-green-500/30 rounded px-3 py-2 font-mono text-sm text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
          />
        )}
        <button
          onClick={handleSave}
          className="w-full py-2 border border-green-500/30 rounded font-mono text-sm text-green-400 hover:border-green-400 hover:bg-green-400/10 transition-colors"
        >
          {saved ? "✓ SAVED" : "SAVE PREFERENCES"}
        </button>
      </div>
    </div>
  );
}
