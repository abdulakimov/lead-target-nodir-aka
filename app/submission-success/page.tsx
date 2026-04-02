import Image from "next/image";
import "../page.css";

export default function SubmissionSuccessPage() {
  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
          <a className="logo" href="/" aria-label="Robbit bosh sahifa">
            <Image className="site-logo" src="/robbit-logo.webp" alt="Robbit Akademiyasi" width={220} height={56} priority sizes="220px" />
          </a>
        </div>
      </header>

      <main className="form-page-main">
        <section className="section form-page-section">
          <div className="container form-page-container">
            <article className="lead-card success-card">
              <h2>Forma muvaffaqiyatli jo&apos;natildi.</h2>
              <p className="lead-note">
                Tez orada menejerlarimiz sizga <strong className="no-wrap">+998 78 777 3 777</strong> raqamidan aloqaga chiqishadi.
              </p>
              <a className="cta cta-wide" href="https://t.me/robbituz" target="_blank" rel="noreferrer">
                Telegram kanalga o&apos;tish
              </a>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
