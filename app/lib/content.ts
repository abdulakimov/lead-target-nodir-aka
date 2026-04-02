import fs from "node:fs";
import path from "node:path";
import { DEFAULT_CONTENT, type LandingContent } from "./content-schema";

const CONTENT_PATH = path.join(process.cwd(), "data", "landing-content.json");

const asString = (value: unknown, fallback: string): string => (typeof value === "string" && value.trim() ? value.trim() : fallback);
const asStringArray = (value: unknown, fallback: string[], max = 20): string[] => {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).slice(0, max);
  return normalized.length > 0 ? normalized : fallback;
};

function sanitizeContent(input: Partial<LandingContent>): LandingContent {
  return {
    heroBadge: asString(input.heroBadge, DEFAULT_CONTENT.heroBadge),
    heroTitle: asString(input.heroTitle, DEFAULT_CONTENT.heroTitle),
    heroDescription: asString(input.heroDescription, DEFAULT_CONTENT.heroDescription),
    heroChips: asStringArray(input.heroChips, DEFAULT_CONTENT.heroChips, 8),
    heroPrimaryCta: asString(input.heroPrimaryCta, DEFAULT_CONTENT.heroPrimaryCta),
    heroTopCta: asString(input.heroTopCta, DEFAULT_CONTENT.heroTopCta),
    signalItems: asStringArray(input.signalItems, DEFAULT_CONTENT.signalItems, 6),
    coursesTitle: asString(input.coursesTitle, DEFAULT_CONTENT.coursesTitle),
    coursesSubtitle: asString(input.coursesSubtitle, DEFAULT_CONTENT.coursesSubtitle),
    courses: (input.courses ?? DEFAULT_CONTENT.courses).map((card, index) => ({
      title: asString(card?.title, DEFAULT_CONTENT.courses[index]?.title ?? DEFAULT_CONTENT.courses[0].title),
      description: asString(card?.description, DEFAULT_CONTENT.courses[index]?.description ?? DEFAULT_CONTENT.courses[0].description),
      bullets: asStringArray(card?.bullets, DEFAULT_CONTENT.courses[index]?.bullets ?? DEFAULT_CONTENT.courses[0].bullets, 8),
    })),
    stepsTitle: asString(input.stepsTitle, DEFAULT_CONTENT.stepsTitle),
    stepsSubtitle: asString(input.stepsSubtitle, DEFAULT_CONTENT.stepsSubtitle),
    steps: (input.steps ?? DEFAULT_CONTENT.steps).map((step, index) => ({
      title: asString(step?.title, DEFAULT_CONTENT.steps[index]?.title ?? DEFAULT_CONTENT.steps[0].title),
      description: asString(step?.description, DEFAULT_CONTENT.steps[index]?.description ?? DEFAULT_CONTENT.steps[0].description),
    })),
    reviewsTag: asString(input.reviewsTag, DEFAULT_CONTENT.reviewsTag),
    reviewsTitle: asString(input.reviewsTitle, DEFAULT_CONTENT.reviewsTitle),
    reviewsSubtitle: asString(input.reviewsSubtitle, DEFAULT_CONTENT.reviewsSubtitle),
    reviews: (input.reviews ?? DEFAULT_CONTENT.reviews).map((review, index) => ({
      text: asString(review?.text, DEFAULT_CONTENT.reviews[index]?.text ?? DEFAULT_CONTENT.reviews[0].text),
      name: asString(review?.name, DEFAULT_CONTENT.reviews[index]?.name ?? DEFAULT_CONTENT.reviews[0].name),
      handle: asString(review?.handle, DEFAULT_CONTENT.reviews[index]?.handle ?? DEFAULT_CONTENT.reviews[0].handle),
      avatar: asString(review?.avatar, DEFAULT_CONTENT.reviews[index]?.avatar ?? DEFAULT_CONTENT.reviews[0].avatar).slice(0, 1),
    })),
    faqTitle: asString(input.faqTitle, DEFAULT_CONTENT.faqTitle),
    faq: (input.faq ?? DEFAULT_CONTENT.faq).map((item, index) => ({
      question: asString(item?.question, DEFAULT_CONTENT.faq[index]?.question ?? DEFAULT_CONTENT.faq[0].question),
      answer: asString(item?.answer, DEFAULT_CONTENT.faq[index]?.answer ?? DEFAULT_CONTENT.faq[0].answer),
    })),
    finalTitle: asString(input.finalTitle, DEFAULT_CONTENT.finalTitle),
    finalDescription: asString(input.finalDescription, DEFAULT_CONTENT.finalDescription),
    finalCta: asString(input.finalCta, DEFAULT_CONTENT.finalCta),
    floatingText: asString(input.floatingText, DEFAULT_CONTENT.floatingText),
    floatingCta: asString(input.floatingCta, DEFAULT_CONTENT.floatingCta),
    leadForm: {
      title: asString(input.leadForm?.title, DEFAULT_CONTENT.leadForm.title),
      note: asString(input.leadForm?.note, DEFAULT_CONTENT.leadForm.note),
      parentPlaceholder: asString(input.leadForm?.parentPlaceholder, DEFAULT_CONTENT.leadForm.parentPlaceholder),
      phonePlaceholder: asString(input.leadForm?.phonePlaceholder, DEFAULT_CONTENT.leadForm.phonePlaceholder),
      agePlaceholder: asString(input.leadForm?.agePlaceholder, DEFAULT_CONTENT.leadForm.agePlaceholder),
      ageOptions: asStringArray(input.leadForm?.ageOptions, DEFAULT_CONTENT.leadForm.ageOptions, 6),
      regionPlaceholder: asString(input.leadForm?.regionPlaceholder, DEFAULT_CONTENT.leadForm.regionPlaceholder),
      districtPlaceholder: asString(input.leadForm?.districtPlaceholder, DEFAULT_CONTENT.leadForm.districtPlaceholder),
      submitText: asString(input.leadForm?.submitText, DEFAULT_CONTENT.leadForm.submitText),
      consentText: asString(input.leadForm?.consentText, DEFAULT_CONTENT.leadForm.consentText),
      ageRequiredError: asString(input.leadForm?.ageRequiredError, DEFAULT_CONTENT.leadForm.ageRequiredError),
    },
  };
}

export type { LandingContent };
export { DEFAULT_CONTENT };

export function readLandingContent(): LandingContent {
  try {
    if (!fs.existsSync(CONTENT_PATH)) return DEFAULT_CONTENT;
    const raw = fs.readFileSync(CONTENT_PATH, "utf-8");
    return sanitizeContent(JSON.parse(raw) as Partial<LandingContent>);
  } catch {
    return DEFAULT_CONTENT;
  }
}

export function saveLandingContent(input: Partial<LandingContent>): LandingContent {
  const content = sanitizeContent(input);
  fs.mkdirSync(path.dirname(CONTENT_PATH), { recursive: true });
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2), "utf-8");
  return content;
}
