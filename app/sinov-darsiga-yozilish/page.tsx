import Image from "next/image";
import LeadForm from "../components/LeadForm";
import { readLandingContent } from "../lib/content";
import "../page.css";

export default function TrialSignupPage() {
  const content = readLandingContent();

  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
          <a className="logo" href="/" aria-label="Robbit bosh sahifa">
            <Image className="site-logo" src="/robbit-logo.webp" alt="Robbit Akademiyasi" width={220} height={56} priority sizes="220px" />
          </a>
        </div>
      </header>

      <main className="form-page-main" id="top">
        <section className="section form-page-section" aria-label="Sinov darsiga yozilish formasi">
          <div className="container form-page-container">
            <LeadForm id="trial-signup-form" copy={content.leadForm} />
          </div>
        </section>
      </main>
    </>
  );
}
