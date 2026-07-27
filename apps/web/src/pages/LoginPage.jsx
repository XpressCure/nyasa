import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api.js";

export function LoginPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("Kumar Saurabh");
  const [phone, setPhone] = useState("9876543210");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await apiPost("/auth/dev-login", { fullName, phone });
      localStorage.setItem("nyasa_token", response.data.token);
      localStorage.setItem("nyasa_user", JSON.stringify(response.data.user));
      if (response.data.family?._id) {
        localStorage.setItem("nyasa_family_id", response.data.family._id);
      }
      navigate("/profile");
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="brand-mark">N</span>
        <h1>Welcome to Nyasa</h1>
        <p>Enter your name and phone number. After sign-in, complete your family bio.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} type="text" />
          </label>
          <label>
            Phone number
            <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit">Continue</button>
        </form>
      </section>
    </main>
  );
}
