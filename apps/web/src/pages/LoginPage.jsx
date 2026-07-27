import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api.js";

export function LoginPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("Kumar Saurabh");
  const [email, setEmail] = useState("saurabh@example.com");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await apiPost("/auth/dev-login", { fullName, email });
      localStorage.setItem("nyasa_token", response.data.token);
      localStorage.setItem("nyasa_user", JSON.stringify(response.data.user));
      navigate("/");
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="brand-mark">N</span>
        <h1>Welcome to Nyasa</h1>
        <p>Sign in to manage your family treasury, missions, Sabha decisions, and legacy.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} type="text" />
          </label>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit">Continue</button>
        </form>
      </section>
    </main>
  );
}
