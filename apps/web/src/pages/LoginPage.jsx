import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api.js";

export function LoginPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await apiPost("/auth/dev-login", {
        fullName,
        ...(needsPhone && phone.trim() ? { phone } : {})
      });
      localStorage.setItem("nyasa_token", response.data.token);
      localStorage.setItem("nyasa_user", JSON.stringify(response.data.user));
      if (response.data.family?._id) {
        localStorage.setItem("nyasa_family_id", response.data.family._id);
      }
      navigate("/profile");
    } catch (apiError) {
      if (apiError.code === "LOGIN_PHONE_REQUIRED") {
        setNeedsPhone(true);
      }
      setError(apiError.message);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="brand-mark">N</span>
        <h1>न्यास में स्वागत है</h1>
        <p>अपना नाम लिखिए। अगर न्यास को एक साफ परिवार प्रोफाइल मिलती है, तो वह सीधे खुल जाएगी।</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Full name
            <input autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} type="text" />
          </label>
          {needsPhone ? (
            <label>
              Phone number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" />
              <small>Needed only when the name is new or more than one profile matches.</small>
            </label>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit">Continue</button>
        </form>
      </section>
    </main>
  );
}
