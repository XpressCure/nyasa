export function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel">
        <span className="brand-mark">N</span>
        <h1>Welcome to Nyasa</h1>
        <p>Sign in to manage your family treasury, missions, Sabha decisions, and legacy.</p>
        <form className="form-stack">
          <label>
            Phone or email
            <input type="text" placeholder="you@example.com" />
          </label>
          <button type="button">Continue</button>
        </form>
      </section>
    </main>
  );
}
