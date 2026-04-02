export type LeadFormCopy = {
  title: string;
  note: string;
  parentPlaceholder: string;
  phonePlaceholder: string;
  agePlaceholder: string;
  ageOptions: string[];
  regionPlaceholder: string;
  districtPlaceholder: string;
  submitText: string;
  consentText: string;
  ageRequiredError: string;
};

export type CourseCard = {
  title: string;
  description: string;
  bullets: string[];
};

export type StepItem = {
  title: string;
  description: string;
};

export type ReviewItem = {
  text: string;
  name: string;
  handle: string;
  avatar: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type LandingContent = {
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  heroChips: string[];
  heroPrimaryCta: string;
  heroTopCta: string;
  signalItems: string[];
  coursesTitle: string;
  coursesSubtitle: string;
  courses: CourseCard[];
  stepsTitle: string;
  stepsSubtitle: string;
  steps: StepItem[];
  reviewsTag: string;
  reviewsTitle: string;
  reviewsSubtitle: string;
  reviews: ReviewItem[];
  faqTitle: string;
  faq: FaqItem[];
  finalTitle: string;
  finalDescription: string;
  finalCta: string;
  floatingText: string;
  floatingCta: string;
  leadForm: LeadFormCopy;
};

export const DEFAULT_CONTENT: LandingContent = {
  heroBadge: "Robototexnika va Dasturlash 6-15 yosh",
  heroTitle: "Bolangiz 2 oy ichida birinchi robot yoki dastur loyihasini taqdim etadi.",
  heroDescription:
    "Robbit Akademiyasida bolalar faqat nazariya emas, amaliy natija oladi. Siz esa bepul sinov darsidan keyin eng mos guruh, jadval va narx bo'yicha aniq qaror qilasiz.",
  heroChips: ["2000+ faol o'quvchi", "8 yillik tajriba", "Kichik guruhlar", "Demo Day har 2 oyda"],
  heroPrimaryCta: "Bepul sinov darsiga yozilish",
  heroTopCta: "Dastur bilan tanishish",
  signalItems: ["Haftasiga 2 dars", "Amaliy loyiha asosida ta'lim", "Narx filialga qarab moslashadi"],
  coursesTitle: "Yoshga mos yo'nalishlar",
  coursesSubtitle: "Har bir bosqich bolalarning qiziqishi va qobiliyatiga mos tuzilgan. Yo'nalishlar oddiydan murakkabga qarab o'sadi.",
  courses: [
    {
      title: "Junior (6-8 yosh)",
      description: "Texnologiyaga birinchi qadam: mantiq, algoritmik fikrlash va oddiy robot yig'ish.",
      bullets: ["Scratch Jr va visual coding", "Lego asoslari", "Ijodiy mini-loyihalar"],
    },
    {
      title: "Kids (9-11 yosh)",
      description: "Robototexnika va dasturlashdan birini tanlab chuqurroq rivojlanish.",
      bullets: ["Spike va Arduino kirish", "Web va bot asoslari", "Portfolio loyihalar"],
    },
    {
      title: "Teens (12-15 yosh)",
      description: "Kelajak kasbiga yaqinlashish: real loyihalar, jamoa va taqdimot.",
      bullets: ["Python va IoT", "AI va avtomatlashtirish asoslari", "GitHub uchun loyiha tajribasi"],
    },
  ],
  stepsTitle: "Qanday boshlaysiz",
  stepsSubtitle: "Maksimal sodda jarayon: ro'yxatdan o'tishdan birinchi amaliy darsgacha.",
  steps: [
    { title: "Ariza qoldiring", description: "Ism va telefon yetarli. Operator eng yaqin filial va bo'sh guruhlarni tekshiradi." },
    { title: "Bepul sinov darsida qatnashing", description: "Bolangiz dars formatini ko'radi va qiziqishiga mos yo'nalishni tanlaydi." },
    { title: "Mos guruhga start bering", description: "Jadval, narx va o'quv rejasi tasdiqlanadi. Keyin muntazam darslar boshlanadi." },
  ],
  reviewsTag: "Ota-onalar fikri",
  reviewsTitle: "Ular nima deydi?",
  reviewsSubtitle: "Bu so'zlar Instagram sahifamizdan olingan - hech qanday o'zgartirishsiz.",
  reviews: [
    {
      text: "Dim zor meni bolom kun sanidi qachon yakshanba keladi qachon robbitga boraman deb yakshanba kuni ertalab 6 da uygonadi kech qomadikmi deb",
      name: "bekbergenovaoygul",
      handle: "@bekbergenovaoygul - Instagram",
      avatar: "B",
    },
    {
      text: "Manam robbitda 2025 yil avgustdan beri oqiyman ozgarishlar juda katta kelishlarini tavsiya qilaman",
      name: "ziyo.dullayev210",
      handle: "@ziyo.dullayev210 - Instagram",
      avatar: "Z",
    },
    {
      text: "Judoam zur Robbit akademiya, meni nevaram boradi. Malimlar judoam zur tushuntiradi",
      name: "mironshokhmokhinur",
      handle: "@mironshokhmokhinur - Instagram",
      avatar: "M",
    },
    {
      text: "Meni o'g'lim boryabdi 1oy bo'ldi qoyil uztozlarini odobi bir biridan chiroyli bolalarni xamma ustozlari sizlab murojat qilishadi dars esa juda qiziqarli bo'lyabdi. Raxmat Robbitga.",
      name: "_sarv1noz_94",
      handle: "@_sarv1noz_94 - Instagram",
      avatar: "S",
    },
  ],
  faqTitle: "Ko'p so'raladigan savollar",
  faq: [
    { question: "Tajriba bo'lmasa ham bo'ladimi?", answer: "Ha. Dastur noldan boshlab o'rgatadi. Har yosh uchun mos bosqich mavjud." },
    { question: "Sinov darsi pullikmi?", answer: "Yo'q. Birinchi dars bepul va majburiyatsiz. Maqsad - bola uchun mos yo'nalishni topish." },
    { question: "Dars jadvali qanday?", answer: "Odatda haftasiga 2 marotaba. Aniq vaqt filial va guruh bo'yicha tanlanadi." },
    { question: "Filiallar qayerlarda bor?", answer: "Toshkent va boshqa shahar/tumanlarda filiallar mavjud. Formadan so'ng sizga eng yaqin manzil aytiladi." },
  ],
  finalTitle: "Aprel guruhiga joy band qiling",
  finalDescription: "Bugun formani yuboring, administrator sizga dastur, narx va jadval bo'yicha qisqa konsultatsiya qiladi.",
  finalCta: "Dastur bilan tanishish",
  floatingText: "Bepul sinov darsi uchun joylar cheklangan",
  floatingCta: "Yozilish",
  leadForm: {
    title: "Sinov darsiga yozilish",
    note: "Formani to'ldiring. Administrator 15 daqiqa ichida bog'lanadi.",
    parentPlaceholder: "Ota-ona ismi",
    phonePlaceholder: "+998 XX XXX XX XX",
    agePlaceholder: "Farzandingiz yoshi",
    ageOptions: ["6-8 yosh", "9-11 yosh", "12-15 yosh"],
    regionPlaceholder: "Viloyat",
    districtPlaceholder: "Tuman yoki shahar",
    submitText: "Sinov darsiga yozilish",
    consentText: "Yuborish orqali sizga qo'ng'iroq qilishimizga rozilik bildirasiz.",
    ageRequiredError: "Bola yoshini tanlang",
  },
};
