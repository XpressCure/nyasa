import { Eye, EyeOff } from "lucide-react";
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

function PasswordField({ label, value, onChange, autoComplete, visible, onToggle, hint }) {
  return (
    <label>
      {label}
      <span className="password-input-wrap">
        <input
          value={value}
          onChange={onChange}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength="8"
          maxLength="128"
          required
        />
        <button
          className="password-visibility-button"
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </span>
      {hint ? <small>{hint}</small> : null}
    </label>
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
  const [passwordMode, setPasswordMode] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function resetFollowUpFields() {
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setNeedsPhone(false);
    setPasswordMode(null);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await apiPost("/auth/login", {
        fullName: fullName.trim(),
        ...(needsPhone ? { phone: phone.trim() } : {}),
        ...(passwordMode ? { password } : {}),
        ...(passwordMode === "create" ? { confirmPassword } : {})
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
      if (apiError.code === "NEW_ACCOUNT_REQUIRED") {
        setNeedsPhone(true);
        setPasswordMode("create");
        setError("No Kul profile was found with this name. Create your Nyas account to join.");
      } else if (["LOGIN_PHONE_REQUIRED", "NAME_MATCH_AMBIGUOUS"].includes(apiError.code)) {
        setNeedsPhone(true);
        setPasswordMode(null);
        setError(apiError.code === "NAME_MATCH_AMBIGUOUS"
          ? "More than one similar Kul profile was found. Enter your registered phone number."
          : "Enter the phone number registered with your account.");
      } else if (["PROFILE_CLAIM_REQUIRED", "ACCOUNT_SETUP_REQUIRED", "PASSWORD_SETUP_REQUIRED"].includes(apiError.code)) {
        setNeedsPhone(true);
        setPasswordMode("create");
        setError(apiError.code === "PROFILE_CLAIM_REQUIRED"
          ? "Your family has already added you. Add your mobile number and create your private login."
          : "This profile has no login yet. Add your mobile number and create a password.");
      } else if (["PASSWORD_REQUIRED", "INVALID_CREDENTIALS", "LOGIN_TEMPORARILY_LOCKED"].includes(apiError.code)) {
        setPasswordMode("existing");
        setError(apiError.code === "PASSWORD_REQUIRED" ? "" : apiError.message);
      } else {
        setError(apiError.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const buttonLabel = busy
    ? "Please wait..."
    : passwordMode === "create"
      ? "Create password and enter"
      : passwordMode === "existing"
        ? "Sign in"
        : needsPhone
          ? "Continue"
          : "Find my profile";

  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="brand-mark">N</span>
        <h1>न्यास में स्वागत है</h1>
        <p>पहले अपना नाम लिखिए। न्यास केवल वही अगला विवरण पूछेगा जिसकी वास्तव में आवश्यकता है।</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              autoFocus
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                if (needsPhone || passwordMode) resetFollowUpFields();
              }}
              type="text"
              autoComplete="name"
              minLength="2"
              required
            />
          </label>

          {needsPhone ? (
            <label>
              Phone number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                minLength="6"
                required
              />
              <small>Needed only for a new name or when similar profiles exist.</small>
            </label>
          ) : null}

          {passwordMode ? (
            <PasswordField
              label={passwordMode === "create" ? "Create a password" : "Password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={passwordMode === "create" ? "new-password" : "current-password"}
              visible={passwordVisible}
              onToggle={() => setPasswordVisible((current) => !current)}
              hint={passwordMode === "create" ? "Use any 8 or more characters. A short phrase is easy to remember." : null}
            />
          ) : null}

          {passwordMode === "create" ? (
            <PasswordField
              label="Type it once more"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              visible={passwordVisible}
              onToggle={() => setPasswordVisible((current) => !current)}
            />
          ) : null}

          {passwordMode === "create" ? (
            <p className="login-progress-note">This is a one-time step. Your browser can remember the password for you.</p>
          ) : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>{buttonLabel}</button>
        </form>
      </section>
    </main>
  );
}
