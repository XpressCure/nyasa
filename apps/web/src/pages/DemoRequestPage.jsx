import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { productConfig } from "../lib/productConfig.js";

const defaultForm = {
  name: "",
  phone: "",
  email: "",
  familyType: "Large joint family",
  memberRange: "50-100",
  need: ""
};

const demoChecklist = [
  "Understand family size, branches, cities, and decision makers.",
  "Show Parichay, Kul Map, Kosh, Sankalp, Sabha voting, and document flow.",
  "Explain the 7-day Family Digitalization Camp.",
  `Recommend Starter, Legacy, or ${productConfig.name} Trust plan.`
];

export function DemoRequestPage() {
  const [form, setForm] = useState(defaultForm);
  const [submitted, setSubmitted] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitDemoRequest(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="demo-request-page">
      <section className="demo-request-shell">
        <div className="demo-request-intro">
          <Link className="home-secondary" to="/">
            <ArrowLeft size={18} />
            Back to {productConfig.name}
          </Link>
          <img src={productConfig.logo} alt={`${productConfig.name} logo`} />
          <span>Product demo</span>
          <h1>Request a guided {productConfig.name} walkthrough.</h1>
          <p>
            Share basic details about the family or trust. The first conversation should focus on whether {productConfig.name} can organize Parichay, Kul Map, Kosh,
            Sankalp, documents, and family governance for your use case.
          </p>
          <div className="demo-checklist">
            {demoChecklist.map((item) => (
              <div key={item}>
                <CheckCircle2 size={18} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <form className="demo-request-form" onSubmit={submitDemoRequest}>
          <h2>Family / trust details</h2>
          <label>
            Your name
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Name" required />
          </label>
          <label>
            Phone number
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="Phone" required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="Email" />
          </label>
          <label>
            Family / trust type
            <select value={form.familyType} onChange={(event) => updateField("familyType", event.target.value)}>
              <option>Large joint family</option>
              <option>Ancestral property family</option>
              <option>Private family trust</option>
              <option>Family business</option>
              <option>NRI-linked family</option>
            </select>
          </label>
          <label>
            Expected members
            <select value={form.memberRange} onChange={(event) => updateField("memberRange", event.target.value)}>
              <option>50-100</option>
              <option>100-200</option>
              <option>200-500</option>
              <option>500+</option>
            </select>
          </label>
          <label className="wide-field">
            What do you want {productConfig.name} to solve first?
            <textarea value={form.need} onChange={(event) => updateField("need", event.target.value)} placeholder="Family tree, Kosh, documents, Sankalp, voting, property records..." rows={5} />
          </label>
          <button type="submit">
            <Send size={18} />
            Prepare demo note
          </button>
          {submitted ? (
            <div className="success-message">
              <strong>Demo note prepared.</strong>
              <span>
                Next step: connect this form to CRM/email. For now, use these details to schedule a call with {form.name || "the prospect"}.
              </span>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
