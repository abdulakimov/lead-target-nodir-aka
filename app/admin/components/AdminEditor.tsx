"use client";

import { useState } from "react";
import type { LandingContent } from "../../lib/content-schema";

type Props = {
  initialContent: LandingContent;
};

function getValueByPath(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null) return "";
    if (/^\d+$/.test(key)) {
      current = (current as unknown[])[Number(key)];
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }
  return typeof current === "string" ? current : "";
}

function setValueByPath<T extends Record<string, unknown>>(obj: T, path: string, value: string): T {
  const clone = structuredClone(obj) as Record<string, unknown>;
  const keys = path.split(".");
  let current: any = clone;

  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (/^\d+$/.test(key)) {
      current = current[Number(key)];
    } else {
      current = current[key];
    }
  }

  const last = keys[keys.length - 1];
  if (/^\d+$/.test(last)) {
    current[Number(last)] = value;
  } else {
    current[last] = value;
  }

  return clone as T;
}

export default function AdminEditor({ initialContent }: Props) {
  const [content, setContent] = useState<LandingContent>(initialContent);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isMultiline, setIsMultiline] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const startEdit = (path: string, multiline = false) => {
    setEditingPath(path);
    setDraft(getValueByPath(content as unknown as Record<string, unknown>, path));
    setIsMultiline(multiline);
  };

  const cancelEdit = () => {
    setEditingPath(null);
    setDraft("");
    setIsMultiline(false);
  };

  const applyEdit = () => {
    if (!editingPath) return;
    const value = draft.trim();
    if (!value) return;
    setContent((prev) => setValueByPath(prev as unknown as Record<string, unknown>, editingPath, value) as LandingContent);
    cancelEdit();
    setStatus("idle");
  };

  const saveAll = async () => {
    try {
      setStatus("saving");
      const response = await fetch("/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!response.ok) throw new Error("save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const EditableText = ({
    path,
    value,
    className,
    as = "span",
    multiline = false,
  }: {
    path: string;
    value: string;
    className?: string;
    as?: "span" | "p" | "h1" | "h2" | "h3" | "strong";
    multiline?: boolean;
  }) => {
    const Tag = as;

    return (
      <span className="admin-edit-wrap">
        <Tag className={className}>{value}</Tag>
        <button type="button" className="edit-pen" aria-label="Tahrirlash" onClick={() => startEdit(path, multiline)}>
          ✎
        </button>
      </span>
    );
  };

  return (
    <section className="admin-shell">
      <div className="admin-topbar">
        <h1>Landing Admin</h1>
        <form action="/admin/logout" method="post">
          <button type="submit" className="admin-ghost-btn">
            Logout
          </button>
        </form>
      </div>
      <p className="admin-sub">Asosiy UI 1:1 preview. Har bir text yonidagi qalamcha bilan o'zgartiring.</p>

      {status === "saved" && <p className="admin-ok">Saqlandi.</p>}
      {status === "error" && <p className="admin-err">Saqlashda xatolik bo'ldi.</p>}

      <div className="admin-live-preview">
        <section className="hero">
          <div className="container hero-grid">
            <article className="hero-copy">
              <EditableText path="heroBadge" value={content.heroBadge} className="eyebrow" />
              <EditableText path="heroTitle" value={content.heroTitle} as="h1" className="admin-h1" multiline />
              <EditableText path="heroDescription" value={content.heroDescription} as="p" className="hero-desc" multiline />

              <div className="proof-row" aria-label="Ishonch ko'rsatkichlari">
                {content.heroChips.map((chip, idx) => (
                  <EditableText key={`hero-chip-${idx}`} path={`heroChips.${idx}`} value={chip} className="proof-chip" />
                ))}
              </div>

              <EditableText path="heroPrimaryCta" value={content.heroPrimaryCta} className="cta admin-cta-mock" />

              <div className="admin-inline-strong">
                <strong>Header CTA:</strong>
                <EditableText path="heroTopCta" value={content.heroTopCta} />
              </div>
            </article>

            <aside className="lead-card">
              <EditableText path="leadForm.title" value={content.leadForm.title} as="h2" />
              <EditableText path="leadForm.note" value={content.leadForm.note} as="p" className="lead-note" />
              <div className="lead-form">
                <EditableText path="leadForm.parentPlaceholder" value={content.leadForm.parentPlaceholder} className="input admin-input-mock" />
                <EditableText path="leadForm.phonePlaceholder" value={content.leadForm.phonePlaceholder} className="input admin-input-mock" />
                <EditableText path="leadForm.agePlaceholder" value={content.leadForm.agePlaceholder} className="input admin-input-mock" />
                <EditableText path="leadForm.regionPlaceholder" value={content.leadForm.regionPlaceholder} className="input admin-input-mock" />
                <EditableText path="leadForm.districtPlaceholder" value={content.leadForm.districtPlaceholder} className="input admin-input-mock" />
                <EditableText path="leadForm.submitText" value={content.leadForm.submitText} className="cta cta-wide admin-cta-mock" />
                <EditableText path="leadForm.consentText" value={content.leadForm.consentText} as="p" className="micro" multiline />
              </div>
            </aside>
          </div>

          <div className="signal-bar">
            <div className="container signal-inner">
              {content.signalItems.map((item, idx) => (
                <EditableText key={`signal-${idx}`} path={`signalItems.${idx}`} value={item} className="signal-item" />
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <EditableText path="coursesTitle" value={content.coursesTitle} as="h2" className="section-title" multiline />
            <EditableText path="coursesSubtitle" value={content.coursesSubtitle} as="p" className="section-sub" multiline />
            <div className="cards">
              {content.courses.map((course, cIdx) => (
                <article className="card" key={`course-${cIdx}`}>
                  <EditableText path={`courses.${cIdx}.title`} value={course.title} as="h3" multiline />
                  <EditableText path={`courses.${cIdx}.description`} value={course.description} as="p" multiline />
                  <ul>
                    {course.bullets.map((bullet, bIdx) => (
                      <li key={`course-${cIdx}-bullet-${bIdx}`}>
                        <EditableText path={`courses.${cIdx}.bullets.${bIdx}`} value={bullet} multiline />
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <EditableText path="stepsTitle" value={content.stepsTitle} as="h2" className="section-title" multiline />
            <EditableText path="stepsSubtitle" value={content.stepsSubtitle} as="p" className="section-sub" multiline />
            <div className="steps">
              {content.steps.map((step, sIdx) => (
                <article className="step" key={`step-${sIdx}`}>
                  <EditableText path={`steps.${sIdx}.title`} value={step.title} as="h3" multiline />
                  <EditableText path={`steps.${sIdx}.description`} value={step.description} as="p" multiline />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section reviews-wrap">
          <div className="container">
            <EditableText path="reviewsTag" value={content.reviewsTag} className="reviews-tag" />
            <EditableText path="reviewsTitle" value={content.reviewsTitle} as="h2" className="section-title" multiline />
            <EditableText path="reviewsSubtitle" value={content.reviewsSubtitle} as="p" className="section-sub" multiline />
            <div className="reviews-grid">
              {content.reviews.map((review, rIdx) => (
                <article className="review-card" key={`review-${rIdx}`}>
                  <div className="review-mark">"</div>
                  <EditableText path={`reviews.${rIdx}.text`} value={review.text} as="p" className="review-text" multiline />
                  <div className="review-author">
                    <EditableText path={`reviews.${rIdx}.avatar`} value={review.avatar} className="review-avatar" />
                    <div>
                      <EditableText path={`reviews.${rIdx}.name`} value={review.name} className="review-name" />
                      <EditableText path={`reviews.${rIdx}.handle`} value={review.handle} className="review-handle" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <EditableText path="faqTitle" value={content.faqTitle} as="h2" className="section-title center" multiline />
            <div className="faq">
              {content.faq.map((item, fIdx) => (
                <details className="faq-item" key={`faq-${fIdx}`} open>
                  <summary className="faq-btn">
                    <EditableText path={`faq.${fIdx}.question`} value={item.question} multiline />
                    <span>+</span>
                  </summary>
                  <div className="faq-content open-content">
                    <EditableText path={`faq.${fIdx}.answer`} value={item.answer} multiline />
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final">
          <div className="container">
            <div className="final-box">
              <EditableText path="finalTitle" value={content.finalTitle} as="h2" multiline />
              <EditableText path="finalDescription" value={content.finalDescription} as="p" multiline />
              <EditableText path="finalCta" value={content.finalCta} className="cta admin-cta-mock" />
            </div>
          </div>
        </section>

        <div className="floating floating-force-show">
          <EditableText path="floatingText" value={content.floatingText} as="p" />
          <EditableText path="floatingCta" value={content.floatingCta} className="cta" />
        </div>
      </div>

      <div className="admin-actions">
        <button className="admin-save-btn" type="button" onClick={saveAll} disabled={status === "saving"}>
          {status === "saving" ? "Saqlanmoqda..." : "Save"}
        </button>
      </div>

      {editingPath && (
        <div className="admin-edit-pop">
          <div className="admin-edit-pop-card">
            <p className="admin-edit-path">{editingPath}</p>
            {isMultiline ? (
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} autoFocus />
            ) : (
              <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            )}
            <div className="admin-edit-pop-actions">
              <button type="button" onClick={applyEdit}>
                OK
              </button>
              <button type="button" onClick={cancelEdit}>
                Bekor
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
