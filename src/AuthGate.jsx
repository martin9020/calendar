import { useState } from "react";

const AUTH_USER = (import.meta.env.VITE_CALENDAR_AUTH_USER || "").trim();
const PASSWORD_HASH = (import.meta.env.VITE_CALENDAR_AUTH_PASSWORD_SHA256 || "")
  .trim()
  .toLowerCase();
const SESSION_KEY = "calendar-auth-unlocked-v1";

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isSessionUnlocked() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function saveUnlockedSession() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // If storage is blocked, keep the in-memory unlocked state only.
  }
}

export default function AuthGate({ children }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(() => !PASSWORD_HASH || isSessionUnlocked());

  if (!PASSWORD_HASH || unlocked) return children;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const userOk = !AUTH_USER || username.trim().toLowerCase() === AUTH_USER.toLowerCase();
      const passwordOk = (await sha256(password)) === PASSWORD_HASH;

      if (!userOk || !passwordOk) {
        setError("Wrong username or password.");
        return;
      }

      saveUnlockedSession();
      setUnlocked(true);
    } catch {
      setError("This browser cannot verify the password.");
    } finally {
      setBusy(false);
    }
  };

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

        {AUTH_USER && (
          <label style={{ display: "block", marginBottom: 12, fontWeight: "bold" }}>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              style={inputStyle}
            />
          </label>
        )}

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
