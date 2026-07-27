import { useEffect, useState } from "react";
import { API_BASE_URL, apiGet } from "../lib/api.js";

export function ApiStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    apiGet("/health")
      .then(() => {
        if (active) setStatus("connected");
      })
      .catch(() => {
        if (active) setStatus("offline");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`api-status ${status}`}>
      <span>{status === "connected" ? "API connected" : status === "offline" ? "API offline" : "Checking API"}</span>
      <small>{API_BASE_URL}</small>
    </div>
  );
}
