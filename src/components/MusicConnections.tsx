import { useEffect, useState } from "react";
import { Apple, Link2, LogIn, LogOut, Music2 } from "lucide-react";

declare global {
  interface Window {
    MusicKit?: {
      configure(options: { developerToken: string; app: { name: string; build: string } }): Promise<MusicKitInstance>;
      getInstance(): MusicKitInstance;
    };
  }
}
type MusicKitInstance = {
  authorize(): Promise<string>;
  unauthorize(): Promise<void>;
  isAuthorized: boolean;
};
const spotifyScopes = ["user-read-private", "user-read-email"].join(" ");
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

export default function MusicConnections() {
  const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
  const spotifyRedirect = (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) || (window.location.origin + window.location.pathname);
  const appleDeveloperToken = import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN as string | undefined;
  const [spotifyToken, setSpotifyToken] = useState("");
  const [spotifyStatus, setSpotifyStatus] = useState("Not connected");
  const [appleStatus, setAppleStatus] = useState("Not connected");
  const [appleReady, setAppleReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const returnedState = params.get("state");
    const expectedState = sessionStorage.getItem("up.spotify.oauth.state");
    const verifier = sessionStorage.getItem("up.spotify.pkce.verifier");
    if (code && returnedState && expectedState && returnedState === expectedState && verifier && spotifyClientId) {
      sessionStorage.removeItem("up.spotify.oauth.state");
      sessionStorage.removeItem("up.spotify.pkce.verifier");
      window.history.replaceState({}, document.title, window.location.pathname);
      void fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: spotifyClientId, grant_type: "authorization_code", code,
          redirect_uri: spotifyRedirect, code_verifier: verifier
        })
      }).then(async response => {
        const result = await response.json() as { access_token?: string; error?: string };
        if (!response.ok || !result.access_token) throw new Error(result.error || "Spotify authorisation failed.");
        setSpotifyToken(result.access_token);
        setSpotifyStatus("Connected for this session.");
      }).catch(error => setSpotifyStatus(error instanceof Error ? error.message : "Spotify connection failed."));
    }
  }, [spotifyClientId, spotifyRedirect]);

  useEffect(() => {
    if (!appleDeveloperToken) return;
    if (window.MusicKit) { setAppleReady(true); return; }
    let script = document.querySelector<HTMLScriptElement>('script[data-up-musickit]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
      script.async = true;
      script.dataset.upMusickit = "true";
      document.head.appendChild(script);
    }
    const loaded = () => setAppleReady(Boolean(window.MusicKit));
    script.addEventListener("load", loaded);
    return () => script?.removeEventListener("load", loaded);
  }, [appleDeveloperToken]);

  const connectSpotify = async () => {
    if (!spotifyClientId) { setSpotifyStatus("UP needs its publisher Spotify Client ID configured."); return; }
    try {
      const verifierBytes = crypto.getRandomValues(new Uint8Array(64));
      const verifier = b64url(verifierBytes);
      const challengeDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
      const challenge = b64url(new Uint8Array(challengeDigest));
      const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
      sessionStorage.setItem("up.spotify.pkce.verifier", verifier);
      sessionStorage.setItem("up.spotify.oauth.state", state);
      const url = new URL("https://accounts.spotify.com/authorize");
      url.search = new URLSearchParams({
        response_type: "code", client_id: spotifyClientId, scope: spotifyScopes,
        redirect_uri: spotifyRedirect, code_challenge_method: "S256",
        code_challenge: challenge, state
      }).toString();
      window.location.assign(url.toString());
    } catch {
      setSpotifyStatus("Could not start secure Spotify authorisation in this browser.");
    }
  };

  const disconnectSpotify = () => { setSpotifyToken(""); setSpotifyStatus("Disconnected."); };
  const connectApple = async () => {
    if (!appleDeveloperToken) { setAppleStatus("UP needs its publisher Apple Music developer token configured."); return; }
    if (!window.MusicKit || !appleReady) { setAppleStatus("Apple Music authorisation is still loading."); return; }
    setBusy(true);
    try {
      await window.MusicKit.configure({ developerToken: appleDeveloperToken, app: { name: "UP", build: "1.0.0" } });
      const music = window.MusicKit.getInstance();
      await music.authorize();
      setAppleStatus("Connected on this device.");
    } catch {
      setAppleStatus("Apple Music authorisation was cancelled or could not be completed.");
    } finally { setBusy(false); }
  };
  const disconnectApple = async () => {
    try { if (window.MusicKit?.getInstance().isAuthorized) await window.MusicKit.getInstance().unauthorize(); } catch { /* provider session may already be closed */ }
    setAppleStatus("Disconnected.");
  };

  return <section className="music-connections">
    <div className="setting-row music-provider-row">
      <div><strong><Music2 size={16}/> Spotify</strong><span>Connect your Spotify account. Spotify will ask you to approve UP.</span><small>{spotifyStatus} {spotifyToken ? "Access is held in memory and ends when this app session is cleared." : "Requires the UP publisher's Spotify Client ID and an approved redirect URI."}</small></div>
      {spotifyToken ? <button className="outline-btn" onClick={disconnectSpotify}><LogOut size={14}/> Disconnect</button> : <button className="outline-btn" onClick={() => void connectSpotify()}><LogIn size={14}/> Connect Spotify</button>}
    </div>
    <div className="setting-row music-provider-row">
      <div><strong><Apple size={16}/> Apple Music</strong><span>Connect your Apple Music account. Apple will ask you to approve access.</span><small>{appleStatus} {appleDeveloperToken ? "The developer token is supplied by UP." : "Requires the UP publisher's Apple Music developer token and MusicKit setup."}</small></div>
      {appleStatus.startsWith("Connected") ? <button className="outline-btn" onClick={() => void disconnectApple()}><LogOut size={14}/> Disconnect</button> : <button className="outline-btn" disabled={busy} onClick={() => void connectApple()}><Link2 size={14}/> {busy ? "Connecting…" : "Connect Apple Music"}</button>}
    </div>
    <p className="fine-print">UP only asks for the access needed to connect your account. You can disconnect at any time.</p>
  </section>;
}
