import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { loadCurrentSession } from "../lib/session.js";

function clearStoredSession() {
  localStorage.removeItem("nyasa_token");
  localStorage.removeItem("nyasa_user");
  localStorage.removeItem("nyasa_family_id");
}

export function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem("nyasa_token");
  const familyId = localStorage.getItem("nyasa_family_id");
  const [status, setStatus] = useState(token && familyId ? "checking" : "signed_out");

  useEffect(() => {
    if (!token || !familyId) {
      setStatus("signed_out");
      return undefined;
    }

    let active = true;
    loadCurrentSession()
      .then((session) => {
        if (!active) return;
        if (session?.user && session?.member && session?.family) {
          setStatus("ready");
          return;
        }
        clearStoredSession();
        setStatus("signed_out");
      })
      .catch(() => {
        if (!active) return;
        clearStoredSession();
        setStatus("signed_out");
      });

    return () => {
      active = false;
    };
  }, [token, familyId]);

  if (status === "checking") {
    return (
      <main className="private-route-loading" aria-live="polite">
        <span className="brand-mark">N</span>
        <strong>Opening your Nyas workspace...</strong>
      </main>
    );
  }

  if (status !== "ready") {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
