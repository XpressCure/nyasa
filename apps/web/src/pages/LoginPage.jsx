import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api.js";

function hasProfileDetails(member) {
  if (!member) return false;

  const hasLocation = Boolean(member.placeOfResidence || member.city || member.state || member.country);
  const hasPhoto = Boolean(member.photoUrl || member.photoDocumentId);
  const hasFamilyLinks = Boolean(
    member.fatherMemberId ||
      member.motherMemberId ||
      member.spouseMemberId ||
      member.childMemberIds?.length ||
      member.childrenCount
  );

  return Boolean(
    member.gender &&
      member.dateOfBirth &&
      hasLocation &&
      hasPhoto &&
      (member.profession || member.bio || member.work?.currentPlace) &&
      hasFamilyLinks
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await apiPost("/auth/dev-login", {
        fullName,
        ...(needsPhone && phone.trim() ? { phone } : {}),
        ...(password ? { password } : {}),
        ...(needsPhone && password ? { confirmPassword } : {})
      });
      localStorage.setItem("nyasa_token", response.data.token);
      localStorage.setItem("nyasa_user", JSON.stringify(response.data.user));
      if (response.data.family?._id) {
        localStorage.setItem("nyasa_family_id", response.data.family._id);
      }
      const nextPath = searchParams.get("next");
      let defaultPath = "/profile";
      if (response.data.family?._id) {
        try {
          const memberResponse = await apiGet(`/members/family/${response.data.family._id}/me`);
          defaultPath = hasProfileDetails(memberResponse.data) ? "/dashboard" : "/profile";
        } catch {
          defaultPath = "/profile";
        }
      }
      const safeNextPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : defaultPath;
      navigate(safeNextPath);
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
          <label>
            {needsPhone ? "Create password" : "Password"}
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
            <small>
              {needsPhone
                ? "Use at least 8 characters with one letter and one number."
                : "Enter your password if this account is already secured."}
            </small>
          </label>
          {needsPhone && password ? (
            <label>
              Confirm password
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                minLength="8"
                required
              />
            </label>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit">{needsPhone && password ? "Create password and continue" : "Continue securely"}</button>
        </form>
      </section>
    </main>
  );
}
