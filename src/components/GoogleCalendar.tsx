import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, LogIn, LogOut, Plus } from "lucide-react";

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: {
      initTokenClient(config: { client_id: string; scope: string; callback: (response: { access_token?: string; error?: string }) => void }): { requestAccessToken(options?: { prompt?: string }): void };
    } } };
  }
}

type CalendarEvent = { id: string; summary: string; start?: { dateTime?: string; date?: string } };

export default function GoogleCalendar() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const tokenClient = useRef<{ requestAccessToken(options?: { prompt?: string }): void } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    document.head.appendChild(script);
    return () => { /* Keep the shared Google Identity Services script loaded. */ };
  }, [clientId]);

  const connect = () => {
    if (!clientId) { setStatus("Add VITE_GOOGLE_CLIENT_ID in Vercel to enable Google sign-in."); return; }
    const google = window.google?.accounts?.oauth2;
    if (!google) { setStatus("Google sign-in is still loading. Try again in a moment."); return; }
    tokenClient.current = google.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/calendar.events",
      callback: response => {
        if (response.error || !response.access_token) { setStatus("Google authorization was not completed."); return; }
        setToken(response.access_token);
        setStatus("Connected for this session");
      }
    });
    tokenClient.current.requestAccessToken({ prompt: "consent" });
  };

  const disconnect = () => { setToken(""); setStatus("Disconnected"); };

  const addReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !title.trim() || !when) return;
    setBusy(true);
    try {
      const start = new Date(when);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title.trim(),
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }, { method: "popup", minutes: 0 }] }
        })
      });
      if (!response.ok) {
        if (response.status === 401) { setToken(""); setStatus("Session expired. Connect Google again."); }
        else throw new Error("Google Calendar could not create that reminder.");
      } else {
        setTitle("");
        setWhen("");
        setStatus("Reminder added to your primary Google Calendar.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add the reminder.");
    } finally { setBusy(false); }
  };

  return <section className="setting-row google-calendar-setting">
    <div>
      <strong>Google Calendar</strong>
      <span>Connect your Google account and add UP reminders directly to your primary calendar.</span>
      <small>{status}. Access is requested only when you press Connect. UP keeps the access token in memory for this session, not local storage.</small>
    </div>
    <div className="setting-actions">
      {token ? <button className="outline-btn" onClick={disconnect}><LogOut size={14}/> Disconnect</button> : <button className="outline-btn" onClick={connect}><LogIn size={14}/> Sign in with Google</button>}
    </div>
    {token && <form className="google-reminder-form" onSubmit={addReminder}>
      <input className="field-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Reminder title" maxLength={120} required />
      <input className="field-input" type="datetime-local" value={when} onChange={event => setWhen(event.target.value)} required />
      <button className="primary-btn" type="submit" disabled={busy || !title.trim() || !when}><Plus size={14}/>{busy ? "Adding…" : "Add reminder"}</button>
    </form>}
  </section>;
}
