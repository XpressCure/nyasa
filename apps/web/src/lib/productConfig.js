import nyasaLogo from "../assets/nyasa-logo.png";

function withFallback(value, fallback) {
  return value || fallback;
}

export const productConfig = {
  name: withFallback(process.env.NYAS_PRODUCT_NAME, "Nyas"),
  hindiName: withFallback(process.env.NYAS_PRODUCT_HINDI_NAME, "न्यास"),
  shortLabel: withFallback(process.env.NYAS_PRODUCT_SHORT_LABEL, "Family OS"),
  tagline: withFallback(process.env.NYAS_PRODUCT_TAGLINE, "One private digital home for every large family."),
  promiseLine: withFallback(process.env.NYAS_PRODUCT_PROMISE, "विरासत, विश्वास, निर्णय और योगदान - सब एक सुरक्षित डिजिटल न्यास में।"),
  logo: nyasaLogo,
  publicSummaryEndpoint: withFallback(process.env.NYAS_PUBLIC_SUMMARY_ENDPOINT, "/families/public/nyasa-summary"),
  demoMode: withFallback(process.env.NYAS_DEMO_MODE, "false") === "true"
};
