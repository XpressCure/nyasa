import React from "react";

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Nyasa render error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-error-page">
          <section className="content-band app-error-panel">
            <h1>न्यास में screen error आया</h1>
            <p>The app is still running, but this page could not render.</p>
            <pre>{this.state.error.message}</pre>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
