import { LogIn, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadCurrentSession } from "../lib/session.js";

function formatRole(role) {
  return role ? role.replaceAll("_", " ") : "No role";
}

export function SessionPanel() {
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  async function refreshSession() {
    setError("");
    try {
      const current = await loadCurrentSession();
      setSession(current);
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  useEffect(() => {
    refreshSession();
  }, []);

  if (!session?.user) {
    return (
      <div className="session-panel">
        <span>Not signed in</span>
        <Link to="/login">
          <LogIn size={14} />
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="session-panel">
      <div>
        <span>{session.user.fullName}</span>
        <strong>{formatRole(session.role)}</strong>
        <small>{session.family?.name || "No family selected"}</small>
      </div>
      {error ? <small className="session-error">{error}</small> : null}
      <button type="button" onClick={refreshSession}>
        <RefreshCw size={14} />
        Refresh
      </button>
    </div>
  );
}
