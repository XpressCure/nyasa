import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api.js";

export function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Loading invitation...");

  useEffect(() => {
    async function loadInvite() {
      try {
        const response = await apiGet(`/invitations/preview/${token}`);
        setInvite(response.data);
        setFullName(response.data.invitedName || "");
        setEmail(response.data.invitedEmail || "");
        setPhone(response.data.invitedPhone || "");
        setMessage("");
      } catch (error) {
        setMessage(error.message);
      }
    }

    loadInvite();
  }, [token]);

  async function acceptInvite(event) {
    event.preventDefault();
    setMessage("");

    try {
      const login = await apiPost("/auth/login", {
        fullName,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        password,
        confirmPassword
      });
      localStorage.setItem("nyasa_token", login.data.token);
      localStorage.setItem("nyasa_user", JSON.stringify(login.data.user));

      const accepted = await apiPost("/invitations/accept", { token });
      localStorage.setItem("nyasa_family_id", accepted.data.family._id);
      navigate("/profile");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="brand-mark">N</span>
        <h1>Accept Invitation</h1>
        {invite ? (
          <p>
            Join {invite.family.name} as {invite.intendedRole.replace("_", " ")}.
          </p>
        ) : (
          <p>{message}</p>
        )}
        {invite ? (
          <form className="form-stack" onSubmit={acceptInvite}>
            <label>
              Full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label>
              Phone number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" />
            </label>
            <label>
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength="8" maxLength="128" autoComplete="new-password" required />
              <small>Use any 8 or more characters.</small>
            </label>
            <label>
              Type it once more
              <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength="8" maxLength="128" autoComplete="new-password" required />
            </label>
            {message ? <p className="form-error">{message}</p> : null}
            <button type="submit">Accept Invitation</button>
          </form>
        ) : null}
        <Link className="text-link" to="/login">
          Sign in instead
        </Link>
      </section>
    </main>
  );
}
