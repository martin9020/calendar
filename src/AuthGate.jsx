import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const AUTH_USERS = {
  martin: ["martinizvorov@gmail.com"],
  toma: ["martinizvorov+toma@gmail.com"]
};

export default function AuthGate({ children }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCheckingSession(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setCheckingSession(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) return <LoginShell title="Checking access..." />;

  if (!isSupabaseConfigured) {
    return <LoginShell title="Access is not configured." />;
  }

  if (session) return children;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const login = username.trim().toLowerCase();
      const emails = AUTH_USERS[login] || [];

      if (!emails.length) {
        setError("Wrong username or password.");
        return;
      }

      const authPassword = login === "toma"
        ? `${password.toLowerCase()}${password.toLowerCase()}`
        : password;

      for (const email of emails) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: authPassword
        });

        if (!signInError && data.session) {
          setSession(data.session);
          return;
        }
      }

      setError("Wrong username or password.");
    } catch {
      setError("Cannot sign in right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <LoginShell>
      <form onSubmit={submit} style={{
        width: "100%",
        maxWidth: 380,
        background: "#faf7f2",
        borderRadius: 18,
        padding: 24,
        boxShadow: "0 24px 70px rgba(0,0,0,0.32)",
        boxSizing: "border-box"
      }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 25, color: "#1a3d24" }}>
          Private reservations
        </h1>
        <p style={{ margin: "0 0 20px", color: "#665847", lineHeight: 1.45 }}>
          Enter the access details to open the reservation calendar.
        </p>

        <label style={{ display: "block", marginBottom: 12, fontWeight: "bold" }}>
          Username
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 16, fontWeight: "bold" }}>
          Password
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />
        </label>

        {error && (
          <div style={{
            marginBottom: 14,
            color: "#8f241c",
            background: "#fde8e5",
            borderRadius: 10,
            padding: "9px 11px",
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        <button
          disabled={busy}
          type="submit"
          style={{
            width: "100%",
            border: 0,
            borderRadius: 11,
            padding: "12px 16px",
            background: busy ? "#78927f" : "#2c5f3a",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 16,
            cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit"
          }}
        >
          {busy ? "Checking..." : "Open calendar"}
        </button>
      </form>
    </LoginShell>
  );
}

function LoginShell({ title, children }) {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      background: "linear-gradient(135deg,#15351f,#2c5f3a)",
      color: "#2a2118",
      fontFamily: "Georgia, serif",
      boxSizing: "border-box"
    }}>
      {children || (
        <div style={{
          width: "100%",
          maxWidth: 380,
          background: "#faf7f2",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 24px 70px rgba(0,0,0,0.32)",
          boxSizing: "border-box",
          color: "#1a3d24",
          fontWeight: "bold"
        }}>
          {title}
        </div>
      )}
    </main>
  );
}

const inputStyle = {
  width: "100%",
  display: "block",
  marginTop: 6,
  padding: "12px",
  borderRadius: 10,
  border: "2px solid #d4e0d4",
  boxSizing: "border-box",
  fontSize: 16,
  background: "#fff",
  color: "#2a2118"
};
