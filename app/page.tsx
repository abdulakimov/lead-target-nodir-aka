import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";
import { readLandingContent } from "./lib/content";
import "./page.css";

export default function Page() {
  noStore();
  const content = readLandingContent();

  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
          <a className="logo" href="#top" aria-label="Robbit bosh sahifa">
            <Image className="site-logo" src="/robbit-logo.webp" alt="Robbit Akademiyasi" width={220} height={56} priority sizes="220px" />
          </a>
          <a className="cta desktop-cta" href="/sinov-darsiga-yozilish">
            {content.heroTopCta}
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="container hero-grid hero-grid-single">
            <article className="hero-copy">
              <span className="eyebrow">{content.heroBadge}</span>
              <h1>{content.heroTitle}</h1>
              <p>{content.heroDescription}</p>
              <div className="proof-row" aria-label="Ishonch ko'rsatkichlari">
                {content.heroChips.map((chip, idx) => (
                  <span className="proof-chip" key={`${chip}-${idx}`}>
                    {chip}
                  </span>
                ))}
              </div>
              <a className="cta" href="/sinov-darsiga-yozilish">
                {content.heroPrimaryCta}
              </a>
            </article>
          </div>

          <div className="signal-bar">
            <div className="container signal-inner">
              {content.signalItems.map((item, idx) => (
                <span className="signal-item" key={`${item}-${idx}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section deferred-section">
          <div className="container">
            <h2 className="section-title">{content.coursesTitle}</h2>
            <p className="section-sub">{content.coursesSubtitle}</p>
            <div className="cards">
              {content.courses.map((course, idx) => (
                <article className="card" key={`${course.title}-${idx}`}>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <ul>
                    {course.bullets.map((bullet, bIdx) => (
                      <li key={`${bullet}-${bIdx}`}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section deferred-section">
          <div className="container">
            <h2 className="section-title">{content.stepsTitle}</h2>
            <p className="section-sub">{content.stepsSubtitle}</p>
            <div className="steps">
              {content.steps.map((step, idx) => (
                <article className="step" key={`${step.title}-${idx}`}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section reviews-wrap deferred-section">
          <div className="container">
            <span className="reviews-tag">{content.reviewsTag}</span>
            <h2 className="section-title">{content.reviewsTitle}</h2>
            <p className="section-sub">{content.reviewsSubtitle}</p>
            <div className="reviews-grid">
              {content.reviews.map((review, idx) => (
                <article className="review-card" key={`${review.name}-${idx}`}>
                  <div className="review-mark">"</div>
                  <p className="review-text">{review.text}</p>
                  <div className="review-author">
                    <div className="review-avatar">{review.avatar}</div>
                    <div>
                      <div className="review-name">{review.name}</div>
                      <div className="review-handle">{review.handle}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section deferred-section">
          <div className="container">
            <h2 className="section-title center">{content.faqTitle}</h2>
            <div className="faq">
              {content.faq.map((item, idx) => (
                <details className="faq-item" key={`${item.question}-${idx}`}>
                  <summary className="faq-btn">
                    {item.question} <span>+</span>
                  </summary>
                  <div className="faq-content">{item.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final deferred-section">
          <div className="container">
            <div className="final-box">
              <h2>{content.finalTitle}</h2>
              <p>{content.finalDescription}</p>
              <a className="cta" href="/sinov-darsiga-yozilish">
                {content.finalCta}
              </a>
            </div>
          </div>
        </section>
      </main>

      <div className="floating">
        <p>{content.floatingText}</p>
        <a className="cta" href="/sinov-darsiga-yozilish">
          {content.floatingCta}
        </a>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (() => {
              const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','lead_id','id'];
              const current = new URLSearchParams(window.location.search);
              const tracked = new URLSearchParams();
              for (const key of keys) {
                const value = current.get(key);
                if (value) tracked.set(key, value);
              }
              if (!tracked.toString()) return;

              document.querySelectorAll('a[href="/sinov-darsiga-yozilish"]').forEach((link) => {
                try {
                  const url = new URL(link.getAttribute('href') || '', window.location.origin);
                  tracked.forEach((value, key) => {
                    if (!url.searchParams.get(key)) url.searchParams.set(key, value);
                  });
                  link.setAttribute('href', url.pathname + '?' + url.searchParams.toString());
                } catch {}
              });
            })();
          `,
        }}
      />
    </>
  );
}
