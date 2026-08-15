/**
 * Full i18n coverage: Header, Footer, Home (Hero/Goals/Active+Completed
 * previews), /cases/active + /cases/completed, campaign detail pages, About,
 * Terms, Contact (both forms), and loading/theme-toggle chrome.
 *
 * Deliberately NOT translated anywhere: live campaign data (titles,
 * descriptions, donor/relation text, platform names) — that's real Arabic
 * content sourced from campaigns.ts / the live sync, not app UI chrome.
 *
 * The Qur'anic verses in OpeningVerse keep their Arabic text completely
 * unchanged in both locales; only in English mode is a Sahih International
 * translation rendered underneath (see OpeningVerse.tsx) — the Arabic verse
 * string itself is never translated or replaced.
 */

const ar = {
  nav: {
    home: "الرئيسية",
    activeCases: "الحالات النشطة",
    completedCases: "الحالات المكتملة",
    about: "عن غرسة",
    terms: "الشروط والأحكام",
    contact: "تواصل معنا",
    donateNow: "تبرع الآن",
    openMenu: "فتح القائمة",
    devBadgeLabel: "قيد التطوير",
    devBadgeTooltip: "الموقع لا يزال قيد التطوير وقد تتغير بعض المزايا.",
    switchLanguage: "تبديل اللغة",
    logoAlt: "غرسة",
    themeToggle: "تبديل الوضع الداكن والفاتح",
  },
  ui: {
    loading: "جاري التحميل",
  },
  footer: {
    description: "دليل يعرض حملات تبرع موثوقة من جهات رسمية، ويحوّلك مباشرة للتبرع عبر منصة الجهة الرسمية.",
    quickLinksHeading: "روابط سريعة",
    whyHeading: "لماذا غرسة؟",
    whyItems: [
      "حملات من المجتمع",
      "روابط رسمية موثوقة",
      "تبرع مباشر عبر المنصة الرسمية",
      "مراجعة قبل النشر",
    ],
    contactHeading: "تواصل معنا",
    contactTextBefore: "إذا كان لديك استفسار، اقتراح، أو ترغب في إضافة حملة، يسعدنا التواصل معك عبر",
    contactLinkLabel: "صفحة التواصل",
    copyright: (year: number) => `© ${year} غرسة. جميع الحقوق محفوظة.`,
  },
  hero: {
    pill: "نافذتك لحملات المجتمع",
    titleLine1: "صَدَقَةٌ تُهْدَى... وَأَجْرٌ",
    titleLine2: "لَا يَـنـــــــــــــــــــــــقَطِعُ",
    description:
      "دليل يجمع حملات التبرع الخاصة بالمجتمع من منصات رسمية موثوقة، ويأخذك مباشرة لإتمام تبرعك، لتكون صدقة جارية لمن سبقونا إلى الله.",
    browseCases: "تصفح الحالات",
    completedCases: "الحالات المكتملة",
    totalCampaigns: "عدد جميع الحملات",
    activeCompletion: (percent: number) => `إجمالي اكتمال الحالات النشطة: ${percent}٪`,
    notEnoughData: "لا توجد بيانات كافية بعد",
    completedLabel: "الحالات المكتملة",
    activeLabel: "الحالات النشطة",
  },
  goals: {
    heading: "أهداف غرسة",
    items: [
      {
        title: "تخليد الأثر بالصدقة",
        description: "إتاحة الفرصة ليستمر أثر الخير من خلال الوصول إلى الحملات الرسمية، والمساهمة في صدقة جارية لمن يحتاجها.",
      },
      {
        title: "جمع حملات المجتمع",
        description: "جمع الحملات الرسمية الخاصة بأفراد المجتمع في مكان واحد، لتسهيل الوصول إليها ومشاركتها ودعمها عبر منصاتها الرسمية.",
      },
      {
        title: "اجعل نيتك أوسع",
        description: "حتى لو تبرعت لحالة معينة، فانوِ أن يشمل الأجر جميع المسلمين، الأحياء منهم ومن سبقنا من أهلنا وأحبتنا.",
      },
      {
        title: "إحياء روح التكافل",
        description: "تعزيز ثقافة الصدقة والتعاون بين أفراد المجتمع، وتذكير الجميع بأن أبسط مساهمة قد تكون سببًا في أجرٍ عظيم.",
      },
      {
        title: "لا تنسوهم بدعائكم",
        description: "إن لم تستطع التبرع أو نشر الحملة، فلا تنسَ الدعاء لأصحابها وللمستفيدين، فالدعاء صدقة لا تكلف شيئًا.",
      },
    ],
  },
  cases: {
    activeHeading: "الحالات النشطة",
    completedHeading: "الحالات المكتملة",
    activeDescription: "حالاتٌ تحتاج إلى صدقاتكم ودعائكم، فكل تبرعٍ ودعوةٍ تُحدث أثرًا يبقى.",
    completedDescription: "حالاتٌ اكتملت بفضل الله ثم بفضلكم الطيب، فلا تنسوهم جميعًا من صالح دعائكم.",
    countLabel: (count: number) => `عدد الحالات: ${count}`,
    viewAllActive: "عرض جميع الحالات النشطة",
    viewAllCompleted: "عرض جميع الحالات المكتملة",
    emptyActiveTitle: "لا توجد حالات نشطة حاليًا",
    emptyActiveMessage: "سيتم عرض الحالات النشطة هنا بمجرد إضافتها.",
    emptyCompletedTitle: "لا توجد حالات مكتملة بعد",
    emptyCompletedMessage: "سيتم عرض الحالات المكتملة هنا بمجرد توفرها.",
  },
  campaignCard: {
    status: {
      active: "نشطة",
      completed: "مكتملة",
      closed: "مغلقة",
    },
    progressLabel: (percent: number) => `نسبة الإنجاز: ${percent}٪`,
    donateButton: "التبرع عبر المنصة الرسمية",
  },
  almostThere: {
    heading: "اقتربت...",
    description: "حالات اقتربت من الاكتمال، وقد تصنع مساهمتك الفرق الأخير.",
    closestLabel: "الأقرب للاكتمال",
    percentComplete: (percent: number) => `${percent}٪ مكتملة`,
    percentRemaining: (percent: number) => `تبقّى ${percent}٪`,
    copyShortLink: "نسخ الرابط المختصر",
    shortLinkCopied: "تم نسخ الرابط",
  },
  randomCase: {
    ariaLabel: "اختيار حالة عشوائية",
    title: "دع غرسة تختار",
    description: "اختر عشوائيًا من بين الحالات النشطة، فكل مساهمةٍ تزرع أثرًا يبقى.",
  },
  about: {
    heading: "عن غرسة",
    paragraphs: [
      "غرسة مشروع غير ربحي يعمل كوسيط بين مجتمع البثوث ومنصات التبرع الموثوقة، بهدف تسهيل الوصول إلى الحملات الخيرية الرسمية بطريقة منظمة وآمنة.",
      "تقتصر الحالات المعروضة في غرسة على الحملات التي يشاركها أفراد من داخل مجتمع البثوث، لتُجمع في مكان واحد يسهل اكتشافها ودعمها، مع توجيه التبرع مباشرة إلى منصتها الرسمية.",
      "لا يستقبل غرسة التبرعات بشكل مباشر، بل يربط المستخدم بالحملات المنشورة على المنصات الرسمية المعتمدة.",
    ],
    termsLinkLabel: "اطلع على الشروط والأحكام ←",
    developedBy: "تم تطوير مشروع غرسة انطلاقًا من فكرة تهدف إلى خدمة مجتمع البثوث وتسهيل الوصول إلى حملاته الخيرية الرسمية.",
    coupletLine1: "تَفنى العبادُ ولا تَفنى صنائعُهم",
    coupletLine2: "فاصنعْ لنفسِك ما يَحلو به الأثر",
  },
  terms: {
    heading: "الشروط والأحكام",
    requirementsHeading: "شروط إضافة حالة",
    requirementsIntro: "لضمان جودة وموثوقية الحالات المنشورة، يجب استيفاء الشروط التالية قبل إرسال طلب إضافة حالة.",
    requirements: [
      "أن تكون الحملة منشورة على منصة تبرعات موثوقة، ويفضل أن تكون معتمدة داخل المملكة العربية السعودية.",
      "أن يكون رابط التبرع رابطًا رسميًا وصحيحًا وغير مختصر أو معدل.",
      "أن يكون صاحب الصلة بالمستفيد أو المستفيد نفسه من الأشخاص المعروفين داخل مجتمع البثوث.",
      "أن تكون جميع المعلومات المقدمة صحيحة وواضحة.",
      "يحق لإدارة غرسة رفض أي طلب لا يستوفي الشروط أو يحتوي على معلومات غير مكتملة.",
      "قد يتم التواصل مع مقدم الطلب عند الحاجة للتحقق من بعض المعلومات.",
      "لا يضمن إرسال الطلب قبول الحالة، فجميع الطلبات تخضع للمراجعة قبل نشرها.",
      "يحق لإدارة غرسة تعديل أو إزالة أي حالة إذا تبين وجود معلومات غير صحيحة أو مخالفة لهذه الشروط.",
    ],
    notice: "غرسة منصة تعريفية وغير ربحية، ولا تستقبل أو تحفظ أي مبالغ مالية. جميع عمليات التبرع تتم مباشرة عبر المنصة الرسمية الخاصة بالحملة.",
    backLinkLabel: "← تعرف على غرسة",
  },
  contact: {
    pageHeading: "تواصل معنا",
    pageDescription: "اختر نوع طلبك أدناه وسنتواصل معك في أقرب وقت ممكن.",
    tabs: {
      campaign: {
        title: "طلب إضافة حالة",
        description: "لأصحاب حملات التبرع الرسمية الراغبين بإضافة حالتهم إلى دليل غرسة.",
      },
      other: {
        title: "تواصل معنا",
        description: "للأسئلة، الاقتراحات، الإبلاغ عن مشكلة، أو أي استفسار يتعلق بغرسة.",
      },
    },
    campaignForm: {
      heading: "طلب إضافة حالة",
      subheading: "يرجى تزويدنا بالمعلومات التالية.",
      name: { label: "الاسم", helper: "اسم صاحب الصلة بالمستفيد", placeholder: "مثال: تركي" },
      username: {
        label: "اسم المستخدم",
        helper: "اسم المستخدم المعروف به داخل مجتمع البثوث.",
        placeholder: "مثال: 1TURKI",
      },
      relationship: {
        label: "نوع الصلة",
        helper: "وضّح نوع صلتك بالمستفيد (مثل: قريب المستفيد أو أحد أفراد عائلته).",
        placeholder: "مثال: قريب المستفيد",
      },
      campaignUrl: {
        label: "رابط الحالة",
        helper:
          "الصق رابط حملة التبرع الرسمية من المنصة (مثل إحسان). يجب أن تكون هذه هي الحملة التي ترغب بعرضها في غرسة، حتى لو كانت لأحد أقاربك أو لشخص آخر.",
      },
      email: {
        label: "البريد الإلكتروني (اختياري)",
        helper: "اختياري، أضف بريدك الإلكتروني إذا كنت ترغب في متابعة الطلب أو تلقي تحديثات عنه.",
        placeholder: "example@email.com",
      },
      notes: {
        label: "ملاحظات إضافية (اختياري)",
        helper: "أي تفاصيل إضافية ترغب بإخبارنا بها.",
        placeholder: "مثال: أي تفاصيل تودّ إضافتها حول الحالة",
      },
      disclaimer: "يرجى التأكد من فهم البيانات المدخلة وصحتها قبل الإرسال، علمًا بأنها ستخضع للمراجعة قبل اعتمادها.",
      submit: "إرسال",
      submitting: "جارٍ الإرسال...",
      submittedNotice: "تم استلام طلبك بنجاح، وسيتم مراجعته من قِبل فريق غرسة.",
    },
    otherForm: {
      heading: "تواصل معنا",
      subheading: "يرجى تزويدنا بالمعلومات التالية.",
      name: { label: "الاسم", helper: "الاسم الذي تود أن نتواصل معك به.", placeholder: "مثال: تركي" },
      email: {
        label: "البريد الإلكتروني",
        helper: "أضف بريدك الإلكتروني إذا كنت ترغب في متابعة الطلب أو تلقي تحديثات عنه.",
        placeholder: "example@email.com",
      },
      message: {
        label: "الرسالة",
        helper: "اكتب استفسارك أو اقتراحك أو ملاحظتك بشكل واضح.",
        placeholder: "مثال: أود الاستفسار عن شروط إضافة حالة، أو لدي اقتراح لتحسين الموقع.",
      },
      submit: "إرسال",
      submitting: "جارٍ الإرسال...",
      submittedNotice: "تم استلام رسالتك بنجاح، وسنتواصل معك إذا لزم الأمر.",
    },
  },
  campaignDetail: {
    backLinkActive: "← العودة إلى الحالات النشطة",
    backLinkCompleted: "← العودة إلى الحالات المكتملة",
    donateDisclaimer: "جميع التبرعات تتم عبر الجهة الرسمية، ولا يستقبل موقع غرسة أي أموال.",
    copyLink: "نسخ رابط الحالة",
    linkCopied: "تم نسخ الرابط",
    transition: {
      title: "اجعل نيتك أوسع",
      description:
        "حتى لو تبرعت لحالة معينة، فانوِ أن يشمل الأجر جميع المسلمين، الأحياء منهم ومن سبقنا من أهلنا وأحبتنا.",
    },
  },
};

type Translations = typeof ar;

const en = {
  nav: {
    home: "Home",
    activeCases: "Active Campaigns",
    completedCases: "Completed Campaigns",
    about: "About Gharsah",
    terms: "Terms & Conditions",
    contact: "Contact Us",
    donateNow: "Donate Now",
    openMenu: "Open menu",
    devBadgeLabel: "In development",
    devBadgeTooltip: "The site is still under development — some features may change.",
    switchLanguage: "Switch language",
    logoAlt: "Gharsah",
    themeToggle: "Toggle dark and light mode",
  },
  ui: {
    loading: "Loading",
  },
  footer: {
    description: "A directory of trusted donation campaigns from official platforms, taking you straight to the official page to donate.",
    quickLinksHeading: "Quick Links",
    whyHeading: "Why Gharsah?",
    whyItems: [
      "Campaigns from the community",
      "Trusted official links",
      "Donate directly via the official platform",
      "Reviewed before publishing",
    ],
    contactHeading: "Contact Us",
    contactTextBefore: "Have a question or suggestion, or want to add a campaign? We'd love to hear from you via",
    contactLinkLabel: "the contact page",
    copyright: (year: number) => `© ${year} Gharsah. All rights reserved.`,
  },
  hero: {
    pill: "Your window into community campaigns",
    titleLine1: "A Charity That's Given... A Reward",
    titleLine2: "That Never Ends",
    description:
      "A directory bringing together the community's donation campaigns from trusted official platforms — taking you straight through to complete your donation, an ongoing charity for those who've gone before us.",
    browseCases: "Browse Campaigns",
    completedCases: "Completed Campaigns",
    totalCampaigns: "Total campaigns",
    activeCompletion: (percent: number) => `Overall progress of active campaigns: ${percent}%`,
    notEnoughData: "Not enough data yet",
    completedLabel: "Completed",
    activeLabel: "Active",
  },
  goals: {
    heading: "Gharsah's Goals",
    items: [
      {
        title: "Immortalizing Impact Through Charity",
        description: "Making it possible for good to keep giving — by reaching official campaigns and contributing to ongoing charity for those who need it.",
      },
      {
        title: "Bringing Community Campaigns Together",
        description: "Gathering the community's official campaigns in one place, making them easier to find, share, and support through their official platforms.",
      },
      {
        title: "Widen Your Intention",
        description: "Even when you give to one specific case, intend for the reward to reach every deceased Muslim, and those who came before us from our own family and loved ones.",
      },
      {
        title: "Reviving the Spirit of Solidarity",
        description: "Fostering a culture of giving and cooperation within the community — and a reminder that even the simplest contribution can lead to a great reward.",
      },
      {
        title: "Prayer Is Charity",
        description: "Can't donate or share the campaign? Don't forget to pray for its owners and beneficiaries — prayer is a charity that costs nothing.",
      },
    ],
  },
  cases: {
    activeHeading: "Active Campaigns",
    completedHeading: "Completed Campaigns",
    activeDescription: "Cases in need of your charity and prayers — every donation and every prayer can leave a lasting impact.",
    completedDescription: "Cases completed by God's grace, then by your kindness — don't forget them all in your good prayers.",
    countLabel: (count: number) => `Number of campaigns: ${count}`,
    viewAllActive: "View All Active Campaigns",
    viewAllCompleted: "View All Completed Campaigns",
    emptyActiveTitle: "No active campaigns right now",
    emptyActiveMessage: "Active campaigns will appear here once added.",
    emptyCompletedTitle: "No completed campaigns yet",
    emptyCompletedMessage: "Completed campaigns will appear here once available.",
  },
  campaignCard: {
    status: {
      active: "Active",
      completed: "Completed",
      closed: "Closed",
    },
    progressLabel: (percent: number) => `Progress: ${percent}%`,
    donateButton: "Donate via Official Platform",
  },
  almostThere: {
    heading: "Almost There",
    description: "Cases nearing completion — your contribution could make the final difference.",
    closestLabel: "Closest to complete",
    percentComplete: (percent: number) => `${percent}% complete`,
    percentRemaining: (percent: number) => `${percent}% left`,
    copyShortLink: "Copy short link",
    shortLinkCopied: "Link copied",
  },
  randomCase: {
    ariaLabel: "Pick a random campaign",
    title: "Let Gharsah Choose",
    description: "A random pick from the active campaigns — every contribution plants a lasting impact.",
  },
  about: {
    heading: "About Gharsah",
    paragraphs: [
      "Gharsah is a non-profit initiative that connects the Buthooth community with trusted donation platforms, making it simple and secure to reach official charitable campaigns.",
      "The campaigns featured on Gharsah are shared by members of the Buthooth community themselves, brought together in one place so they're easier to discover, share, and support — with every donation routed straight to the campaign's official platform.",
      "Gharsah never collects donations directly. It simply connects you to campaigns published on trusted, official platforms.",
    ],
    termsLinkLabel: "View Terms & Conditions →",
    developedBy: "Gharsah was built around a simple idea: to serve the Buthooth community and make it easier to reach its official charitable campaigns.",
    coupletLine1: "People pass away, but their good deeds remain —",
    coupletLine2: "so leave behind a legacy that lasts.",
  },
  terms: {
    heading: "Terms & Conditions",
    requirementsHeading: "Requirements for Adding a Campaign",
    requirementsIntro:
      "To keep every campaign on Gharsah reliable and trustworthy, please make sure the following requirements are met before submitting a request.",
    requirements: [
      "The campaign must be published on a trusted donation platform, preferably one licensed within Saudi Arabia.",
      "The donation link must be the official, unaltered URL — not shortened or modified.",
      "The person submitting the request, or the beneficiary, must be recognized within the Buthooth community.",
      "All information provided must be accurate and clearly stated.",
      "Gharsah's team reserves the right to decline any request that doesn't meet these requirements or is missing information.",
      "We may reach out to the person who submitted the request to verify certain details.",
      "Submitting a request doesn't guarantee approval — every request is reviewed before it's published.",
      "Gharsah's team reserves the right to edit or remove any campaign found to contain inaccurate information or to violate these terms.",
    ],
    notice:
      "Gharsah is an informational, non-profit platform — it never receives or holds any funds. Every donation is made directly through the campaign's official platform.",
    backLinkLabel: "← About Gharsah",
  },
  contact: {
    pageHeading: "Contact Us",
    pageDescription: "Choose the option below that fits your request, and we'll get back to you as soon as we can.",
    tabs: {
      campaign: {
        title: "Request to Add a Campaign",
        description: "For owners of official donation campaigns who'd like to add their case to the Gharsah directory.",
      },
      other: {
        title: "Contact Us",
        description: "For questions, suggestions, reporting an issue, or anything else about Gharsah.",
      },
    },
    campaignForm: {
      heading: "Request to Add a Campaign",
      subheading: "Please share the following details with us.",
      name: { label: "Name", helper: "Your name, as the person connected to the beneficiary.", placeholder: "e.g. Turki" },
      username: {
        label: "Username",
        helper: "The username you're known by within the Buthooth community.",
        placeholder: "e.g. 1TURKI",
      },
      relationship: {
        label: "Relationship",
        helper: "Describe your relationship to the beneficiary (e.g. a relative or family member).",
        placeholder: "e.g. Relative of the beneficiary",
      },
      campaignUrl: {
        label: "Campaign Link",
        helper:
          "Paste the official campaign link from the platform (e.g. Ehsan). This should be the exact campaign you'd like featured on Gharsah, even if it belongs to a relative or someone else.",
      },
      email: {
        label: "Email (optional)",
        helper: "Optional — add your email if you'd like to follow up on your request or receive updates.",
        placeholder: "example@email.com",
      },
      notes: {
        label: "Additional Notes (optional)",
        helper: "Anything else you'd like us to know.",
        placeholder: "e.g. Any extra details about the campaign",
      },
      disclaimer: "Please make sure the information you've entered is accurate before submitting — every request is reviewed before approval.",
      submit: "Send",
      submitting: "Sending...",
      submittedNotice: "Your request was received successfully and will be reviewed by the Gharsah team.",
    },
    otherForm: {
      heading: "Contact Us",
      subheading: "Please share the following details with us.",
      name: { label: "Name", helper: "The name you'd like us to use when we reach out.", placeholder: "e.g. Turki" },
      email: {
        label: "Email (optional)",
        helper: "Add your email if you'd like to follow up or receive updates.",
        placeholder: "example@email.com",
      },
      message: {
        label: "Message",
        helper: "Write your question, suggestion, or feedback clearly.",
        placeholder: "e.g. I have a question about the requirements for adding a campaign, or a suggestion to improve the site.",
      },
      submit: "Send",
      submitting: "Sending...",
      submittedNotice: "Your message was received successfully — we'll get back to you if needed.",
    },
  },
  campaignDetail: {
    backLinkActive: "← Back to Active Campaigns",
    backLinkCompleted: "← Back to Completed Campaigns",
    donateDisclaimer: "All donations are made directly through the official organization — Gharsah does not receive any funds.",
    copyLink: "Copy Case Link",
    linkCopied: "Link copied",
    transition: {
      title: "Widen Your Intention",
      description:
        "Even when you give to one particular case, intend for the reward to reach all Muslims — those living among us, and those who came before us from our own family and loved ones.",
    },
  },
} satisfies Translations;

export type Locale = "ar" | "en";

export const translations: Record<Locale, Translations> = { ar, en };
