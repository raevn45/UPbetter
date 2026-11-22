import { useEffect, useRef, useState, type FormEvent } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { CalendarDays, LogIn, LogOut, Plus, UserRound } from "lucide-react";

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: {
      initTokenClient(config: { client_id: string; scope: string; callback: (response: { access_token?: string; error?: string }) => void }): { requestAccessToken(options?: { prompt?: string }): void };
    } } };
  }
}

type NativeGoogleAuth = { authorize(): Promise<{ accessToken: string; email?: string }> };
const NativeGoogleAuth = registerPlugin<NativeGoogleAuth>("UPGoogleAuth");

type AlarmToSync = {
  alarm: { id: string; label: string; repeatDays: number[]; timeZone: string; enabled: boolean };
  nextOccurrence: string | null;
};
const dayCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export default function GoogleCalendar({ alarms, onAccountChange }: { alarms: AlarmToSync[]; onAccountChange?: (account: { email: string; picture?: string } | null) => void }) {
  // Public Google OAuth Web client ID. Keep the env override for deployments with their own OAuth project.
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || "669883233575-b8qp2bv38e14gd3ls7l9hasof46qpt0i.apps.googleusercontent.com";
  const [token, setToken] = useState("");
  const [status, setStatus] = useState(clientId ? "Not connected" : "Google sign-in is not enabled in this UP deployment yet.");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPicture, setAccountPicture] = useState("");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const tokenClient = useRef<{ requestAccessToken(options?: { prompt?: string }): void } | null>(null);

  useEffect(() => { onAccountChange?.(token && accountEmail ? (accountPicture ? { email: accountEmail, picture: accountPicture } : { email: accountEmail }) : null); }, [token, accountEmail, accountPicture, onAccountChange]);

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

  useEffect(() => {
    if (!clientId || !scriptReady || !window.google?.accounts?.oauth2) return;
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
      callback: response => {
        if (response.error || !response.access_token) return;
        setToken(response.access_token);
        setStatus("Google signed in.");
        void fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + response.access_token } }).then(async response => { if (response.ok) { const profile = await response.json() as { email?: string; picture?: string }; setAccountEmail(profile.email || ""); setAccountPicture(profile.picture || ""); } }).catch(() => undefined);
      }
    });
    client.requestAccessToken({ prompt: "none" });
  }, [clientId, scriptReady]);
  const connect = async () => {
    if (Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("UPGoogleAuth")) {
      setStatus("Opening Google sign-in…");
      try {
        const result = await NativeGoogleAuth.authorize();
        setToken(result.accessToken);
        setAccountEmail(result.email || "");
        setStatus("Google signed in.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Google sign-in was not completed.");
      }
      return;
    }
    if (!clientId) {
      setStatus("Google sign-in is not enabled in this UP version yet.");
      return;
    }
    const google = window.google?.accounts?.oauth2;
    if (!google || !scriptReady) {
      setStatus("Google sign-in is still loading. Try again in a moment.");
      return;
    }
    tokenClient.current = google.initTokenClient({
      client_id: clientId,
      scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
      callback: response => {
        if (response.error || !response.access_token) {
          setStatus("Google authorization was not completed.");
          return;
        }
        setToken(response.access_token);
        void fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + response.access_token } }).then(async profileResponse => { if (!profileResponse.ok) return; const profile = await profileResponse.json() as { email?: string; picture?: string }; setAccountEmail(profile.email || ""); setAccountPicture(profile.picture || ""); }).catch(() => undefined);
        setStatus("Google signed in.");
      }
    });
    tokenClient.current.requestAccessToken({ prompt: "consent" });
  };

  const disconnect = () => { setToken(""); setAccountEmail(""); setAccountPicture(""); setStatus("Disconnected."); };

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
        if (lookup.status === 401) { setToken(""); setAccountEmail(""); setAccountPicture(""); setStatus("Google session expired. Sign in again."); return; }
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


  return <section className="setting-row google-calendar-setting">
    <div>
      <strong>Google account</strong>
      <span>Use your Google account to keep your calendar reminders in sync with UP.</span>
      <small>{token ? (accountEmail ? `Signed in as ${accountEmail}.` : "Google account connected.") : status}</small>
    </div>
    <div className="setting-actions">
      {token
        ? <button className="outline-btn" onClick={disconnect}><LogOut size={14}/> Sign out</button>
        : <button className="outline-btn google-connect-btn" onClick={connect}><UserRound size={14}/> Continue with Google</button>}
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
