import { CheckCircle2, Download, LockKeyhole, Settings, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import nyasaLogo from "../assets/nyasa-logo.png";

const apkUrl = "/downloads/nyas-family.apk";

export function DownloadAppPage() {
  return (
    <main className="download-app-page">
      <nav className="download-app-nav">
        <Link to="/" aria-label="Nyas home">
          <img src={nyasaLogo} alt="Nyas Trust" />
          <span><strong>Nyas</strong><small>Our family, connected</small></span>
        </Link>
        <Link to="/login">Already a member?</Link>
      </nav>

      <section className="download-app-hero">
        <div className="download-app-copy">
          <span className="download-app-kicker"><Smartphone size={18} /> Nyas for Android</span>
          <h1>Your family is now<br />one tap away.</h1>
          <p>Install the Nyas family app to complete your Parichay, explore the Kul Map, join Sankalp, and stay connected with everyone.</p>
          <a className="download-app-button" href={apkUrl} download>
            <Download size={22} /> Download Nyas App
          </a>
          <span className="download-app-version">Android 8 or newer · Direct family release</span>
        </div>

        <div className="download-phone-preview" aria-label="Nyas app preview">
          <div className="download-phone-top"><span /><span /></div>
          <img src={nyasaLogo} alt="" />
          <small>Namaste</small>
          <strong>Welcome to Nyas</strong>
          <div className="download-phone-actions">
            <span>Parichay</span><span>Kul Map</span><span>Sankalp</span><span>Kosh</span>
          </div>
          <div className="download-phone-note">Together, we preserve our roots and build what comes next.</div>
        </div>
      </section>

      <section className="download-install-band">
        <div className="download-install-heading">
          <span>Three simple steps</span>
          <h2>Install and join the family</h2>
        </div>
        <ol className="download-step-grid">
          <li><b>1</b><div><strong>Download</strong><span>Tap the download button above.</span></div></li>
          <li><b>2</b><div><strong>Allow installation</strong><span>If Android asks, allow installation from your browser.</span></div></li>
          <li><b>3</b><div><strong>Open and sign in</strong><span>Use your name, phone number, and Nyas password.</span></div></li>
        </ol>
      </section>

      <section className="download-trust-row">
        <span><LockKeyhole size={20} /> Private family workspace</span>
        <span><CheckCircle2 size={20} /> Official Nyas release</span>
        <span><Smartphone size={20} /> Designed for mobile</span>
      </section>

      <section className="download-help-band">
        <div className="download-help-copy">
          <span><ShieldCheck size={20} /> Installation help</span>
          <h2>Did Android block the installation?</h2>
          <p>This is Android's standard protection for apps shared outside the Play Store. The download is safe; permission must be given once to the browser used for downloading.</p>
          <p className="download-help-hindi">अगर फोन इंस्टॉल रोकता है, तो नीचे दिए गए अनुसार अपने ब्राउज़र को एक बार अनुमति दें।</p>
        </div>
        <div className="download-help-steps">
          <article>
            <Settings size={22} />
            <div><strong>Chrome / most Android phones</strong><span>Settings → Apps → Special app access → Install unknown apps → Chrome → Allow from this source.</span></div>
          </article>
          <article>
            <Smartphone size={22} />
            <div><strong>Samsung phones</strong><span>Settings → Security and privacy → More security settings → Install unknown apps → Chrome → Allow.</span></div>
          </article>
          <a className="download-app-button download-help-button" href={apkUrl} download>
            <Download size={20} /> Download again
          </a>
        </div>
      </section>

      <footer className="download-app-footer">
        <img src={nyasaLogo} alt="" />
        <p><strong>Nyas Trust</strong><br />Ek parivar. Ek vishwas. Ek virasat.</p>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </footer>
    </main>
  );
}
