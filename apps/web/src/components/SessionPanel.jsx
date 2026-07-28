import { Home, LogIn, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadCurrentSession } from "../lib/session.js";

function formatRole(role) {
  return role ? role.replaceAll("_", " ") : "No role";
}

export function SessionPanel() {
  const navigate = useNavigate();
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

  function logout() {
    localStorage.removeItem("nyasa_token");
    localStorage.removeItem("nyasa_user");
    localStorage.removeItem("nyasa_family_id");
    setSession(null);
    navigate("/");
  }

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
      <div className="session-actions">
        <Link to="/">
          <Home size={14} />
          Home
        </Link>
        <button type="button" onClick={refreshSession}>
          <RefreshCw size={14} />
          Refresh
        </button>
        <button type="button" onClick={logout}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
}
