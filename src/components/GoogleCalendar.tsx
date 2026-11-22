import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarDays, LogIn, LogOut, Plus } from "lucide-react";

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: {
      initTokenClient(config: { client_id: string; scope: string; callback: (response: { access_token?: string; error?: string }) => void }): { requestAccessToken(options?: { prompt?: string }): void };
    } } };
  }
}

type AlarmToSync = {
  alarm: { id: string; label: string; repeatDays: number[]; timeZone: string; enabled: boolean };
  nextOccurrence: string | null;
};
const dayCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export default function GoogleCalendar({ alarms }: { alarms: AlarmToSync[] }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const tokenClient = useRef<{ requestAccessToken(options?: { prompt?: string }): void } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    if (window.google?.accounts?.oauth2) { setScriptReady(true); return; }
    let script = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      document.head.appendChild(script);
    }
    const loaded = () => setScriptReady(true);
    script.addEventListener("load", loaded);
    if (window.google?.accounts?.oauth2) setScriptReady(true);
    return () => script?.removeEventListener("load", loaded);
  }, [clientId]);

  const connect = () => {
    if (!clientId) {
      setStatus("Google sign-in needs the UP publisher's OAuth client ID. It is not a personal API key.");
      return;
    }
    const google = window.google?.accounts?.oauth2;
    if (!google || !scriptReady) {
      setStatus("Google sign-in is still loading. Try again in a moment.");
      return;
    }
    tokenClient.current = google.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/calendar.events",
      callback: response => {
        if (response.error || !response.access_token) {
          setStatus("Google authorization was not completed.");
          return;
        }
        setToken(response.access_token);
        setStatus("Connected for this session.");
      }
    });
    tokenClient.current.requestAccessToken({ prompt: "consent" });
  };

  const syncAlarms = async () => {
    if (!token) return;
    const upcoming = alarms.filter(item => item.alarm.enabled && item.nextOccurrence);
    if (!upcoming.length) { setStatus("No enabled upcoming UP alarms to sync."); return; }
    setBusy(true);
    try {
      let synced = 0;
      for (const item of upcoming) {
        const start = new Date(item.nextOccurrence as string);
        const end = new Date(start.getTime() + 5 * 60 * 1000);
        const byDay = (item.alarm.repeatDays || []).slice().sort().map(day => dayCodes[day]).filter(Boolean);
        const body: Record<string, unknown> = {
          summary: "UP · " + (item.alarm.label || "Alarm"),
          description: "Synced from UP. Manage this alarm in the UP app.",
          start: { dateTime: start.toISOString(), timeZone: item.alarm.timeZone },
          end: { dateTime: end.toISOString(), timeZone: item.alarm.timeZone },
          reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }, { method: "popup", minutes: 0 }] },
          extendedProperties: { private: { upAlarmId: item.alarm.id } }
        };
        if (byDay.length) body.recurrence = ["RRULE:FREQ=WEEKLY;BYDAY=" + byDay.join(",")];
        const lookupUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=" + encodeURIComponent("upAlarmId=" + item.alarm.id) + "&singleEvents=false";
        const lookup = await fetch(lookupUrl, { headers: { Authorization: "Bearer " + token } });
        if (lookup.status === 401) { setToken(""); setStatus("Google session expired. Sign in again."); return; }
        if (!lookup.ok) throw new Error("Google Calendar could not check existing UP reminders.");
        const existing = await lookup.json() as { items?: Array<{ id: string }> };
        const eventId = existing.items?.[0]?.id;
        const url = eventId
          ? "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(eventId)
          : "https://www.googleapis.com/calendar/v3/calendars/primary/events";
        const response = await fetch(url, {
          method: eventId ? "PATCH" : "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (response.status === 401) { setToken(""); setStatus("Google session expired. Sign in again."); return; }
        if (!response.ok) throw new Error("Google Calendar could not sync " + item.alarm.label + ".");
        synced++;
      }
      setStatus(synced + " enabled UP alarm(s) synced to Google Calendar with popup reminders.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not sync UP alarms.");
    } finally { setBusy(false); }
  };

  const addReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !title.trim() || !when) return;
    setBusy(true);
    try {
      const start = new Date(when);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title.trim(),
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }, { method: "popup", minutes: 0 }] }
        })
      });
      if (response.status === 401) { setToken(""); setStatus("Google session expired. Sign in again."); return; }
      if (!response.ok) throw new Error("Google Calendar could not create that reminder.");
      setTitle("");
      setWhen("");
      setStatus("Reminder added to your primary Google Calendar.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add the reminder.");
    } finally { setBusy(false); }
  };

  const disconnect = () => { setToken(""); setStatus("Disconnected."); };

  return <section className="setting-row google-calendar-setting">
    <div>
      <strong>Google Calendar</strong>
      <span>Connect your Google account, sync UP alarms and create Calendar reminders.</span>
      <small>{status} Google access is requested only when you connect. The session token stays in memory. The app publisher must configure its OAuth client ID once.</small>
    </div>
    <div className="setting-actions">
      {token
        ? <button className="outline-btn" onClick={disconnect}><LogOut size={14}/> Disconnect</button>
        : <button className="outline-btn" onClick={connect}><LogIn size={14}/> Sign in with Google</button>}
    </div>
    {token && <>
      <div className="google-sync-alarm">
        <div><strong>UP alarm sync</strong><span>{alarms.filter(item => item.alarm.enabled && item.nextOccurrence).length} enabled alarm(s) ready. Re-sync after changing alarm times or repeat days.</span></div>
        <button className="outline-btn" type="button" onClick={() => void syncAlarms()} disabled={busy || !alarms.some(item => item.alarm.enabled && item.nextOccurrence)}><CalendarDays size={14}/>{busy ? "Syncing…" : "Sync UP alarms to Calendar"}</button>
      </div>
      <form className="google-reminder-form" onSubmit={addReminder}>
        <input className="field-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Reminder title" maxLength={120} required />
        <input className="field-input" type="datetime-local" value={when} onChange={event => setWhen(event.target.value)} required />
        <button className="primary-btn" type="submit" disabled={busy || !title.trim() || !when}><Plus size={14}/>{busy ? "Adding…" : "Add reminder"}</button>
      </form>
    </>}
  </section>;
}
