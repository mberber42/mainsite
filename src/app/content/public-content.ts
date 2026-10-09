import type { Locale } from './home-content';

export interface LocalizedText {
  readonly tr: string;
  readonly en: string;
}

export interface ProfileEntry {
  readonly title: LocalizedText;
  readonly organization?: LocalizedText;
  readonly period?: LocalizedText;
  readonly description?: LocalizedText;
}

export interface ServicePlaceholder {
  readonly id: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly status: LocalizedText;
}

type CoverImageFields =
  | { readonly coverImage: string; readonly coverAlt: LocalizedText }
  | { readonly coverImage?: never; readonly coverAlt?: never };

export type BlogPost = {
  readonly slug: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly body: readonly LocalizedText[];
  readonly bodyMarkdown?: LocalizedText;
  readonly category?: LocalizedText;
  readonly tags?: readonly LocalizedText[];
  readonly publishedAt?: string;
  readonly readingMinutes?: number;
  readonly seoTitle?: LocalizedText;
  readonly seoDescription?: LocalizedText;
  readonly canonicalUrl?: string;
  readonly ogImage?: string;
} & CoverImageFields;

export type LabProject = {
  readonly slug: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly description: readonly LocalizedText[];
  readonly bodyMarkdown?: LocalizedText;
  readonly category?: LocalizedText;
  readonly tags?: readonly LocalizedText[];
  readonly seoTitle?: LocalizedText;
  readonly seoDescription?: LocalizedText;
  readonly links?: readonly { label: LocalizedText; href: string }[];
  readonly canonicalUrl?: string;
  readonly ogImage?: string;
} & CoverImageFields;

export const PROFILE_CONTENT = {
  biography: {
    tr: 'Doğrulanmış biyografi metni Mustafa tarafından sağlandığında burada yayımlanacak.',
    en: 'A verified biography will appear here once Mustafa provides the copy.',
  },
  experience: [] as readonly ProfileEntry[],
  expertise: [] as readonly LocalizedText[],
  cvUrl: null as string | null,
  socialLinks: [
    { label: 'GitHub', href: null as string | null },
    { label: 'LinkedIn', href: null as string | null },
    { label: 'X', href: null as string | null },
  ],
} as const;

export const SERVICE_PLACEHOLDERS: readonly ServicePlaceholder[] = [
  {
    id: 'service-one',
    title: { tr: 'Hizmet başlığı eklenecek', en: 'Service title to be added' },
    description: {
      tr: 'Gerçek hizmet tanımı ve kapsamı Mustafa tarafından doğrulandığında burada yer alacak.',
      en: 'A real service description and scope will be added here when verified by Mustafa.',
    },
    status: { tr: 'Açık yer tutucu', en: 'Explicit placeholder' },
  },
  {
    id: 'service-two',
    title: { tr: 'Hizmet başlığı eklenecek', en: 'Service title to be added' },
    description: {
      tr: 'Bu kart bir hizmet veya müsaitlik iddiası değildir; doğrulanmış içerik bekleniyor.',
      en: 'This card is not a service or availability claim; verified content is pending.',
    },
    status: { tr: 'Açık yer tutucu', en: 'Explicit placeholder' },
  },
  {
    id: 'service-three',
    title: { tr: 'Hizmet başlığı eklenecek', en: 'Service title to be added' },
    description: {
      tr: 'Fiyat, teslim süresi veya çalışma koşulu belirtilmez; içerik sonradan düzenlenebilir.',
      en: 'No price, delivery timeline, or working terms are claimed; content can be edited later.',
    },
    status: { tr: 'Açık yer tutucu', en: 'Explicit placeholder' },
  },
];

export const SERVICE_PROCESS_PLACEHOLDERS: readonly ServicePlaceholder[] = [
  {
    id: 'process-one',
    title: { tr: 'İlk adım eklenecek', en: 'First step to be added' },
    description: {
      tr: 'Gerçek çalışma süreci Mustafa tarafından sağlanana kadar bu bölüm yer tutucudur.',
      en: 'This section remains a placeholder until Mustafa provides the actual process.',
    },
    status: { tr: 'Yer tutucu', en: 'Placeholder' },
  },
  {
    id: 'process-two',
    title: { tr: 'Sonraki adım eklenecek', en: 'Next step to be added' },
    description: {
      tr: 'Burada doğrulanmamış çalışma yöntemi veya teslim sözü verilmez.',
      en: 'No unverified way of working or delivery promise is made here.',
    },
    status: { tr: 'Yer tutucu', en: 'Placeholder' },
  },
  {
    id: 'process-three',
    title: { tr: 'Kapanış adımı eklenecek', en: 'Closing step to be added' },
    description: {
      tr: 'Süreç ayrıntıları doğrulanınca merkezi içerik kaynağından güncellenebilir.',
      en: 'Once verified, process details can be updated in the central content source.',
    },
    status: { tr: 'Yer tutucu', en: 'Placeholder' },
  },
];

export const BLOG_POSTS: readonly BlogPost[] = [];
export const LAB_PROJECTS: readonly LabProject[] = [];

export interface PublicCopy {
  readonly accessibility: {
    readonly primaryNavigation: string;
    readonly socialNavigation: string;
  };
  readonly about: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly biographyTitle: string;
    readonly experienceTitle: string;
    readonly expertiseTitle: string;
    readonly cvTitle: string;
    readonly cvUnavailable: string;
    readonly experienceEmpty: string;
    readonly expertiseEmpty: string;
    readonly socialTitle: string;
    readonly socialUnavailable: string;
  };
  readonly services: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly cardsTitle: string;
    readonly processTitle: string;
    readonly faqTitle: string;
    readonly faqEmpty: string;
    readonly contactTitle: string;
    readonly contactBody: string;
    readonly contactCta: string;
  };
  readonly blog: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly detailsLabel: string;
    readonly categoryLabel: string;
    readonly tagsLabel: string;
    readonly readingTimeLabel: string;
    readonly backToList: string;
    readonly notFoundTitle: string;
    readonly notFoundBody: string;
  };
  readonly lab: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly detailsLabel: string;
    readonly categoryLabel: string;
    readonly tagsLabel: string;
    readonly backToList: string;
    readonly notFoundTitle: string;
    readonly notFoundBody: string;
    readonly projectLink: string;
  };
  readonly contact: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly nameLabel: string;
    readonly nameHint: string;
    readonly nameRequired: string;
    readonly emailLabel: string;
    readonly emailHint: string;
    readonly emailRequired: string;
    readonly emailInvalid: string;
    readonly messageLabel: string;
    readonly messageHint: string;
    readonly messageRequired: string;
    readonly sendButton: string;
    readonly sendingLabel: string;
    readonly submitError: string;
    readonly noSendTitle: string;
    readonly noSendBody: string;
    readonly validatedTitle: string;
    readonly validatedBody: string;
  };
  readonly notFound: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly homeLink: string;
  };
}

export const PUBLIC_COPY: Record<Locale, PublicCopy> = {
  tr: {
    accessibility: {
      primaryNavigation: 'Alt gezinme',
      socialNavigation: 'Sosyal bağlantılar',
    },
    about: {
      eyebrow: 'Profil',
      title: 'Hakkımda',
      description: 'Bu sayfa, doğrulanmış profil içeriği eklendiğinde güncellenecek.',
      biographyTitle: 'Kısa biyografi',
      experienceTitle: 'Deneyim',
      expertiseTitle: 'Teknolojiler ve uzmanlık alanları',
      cvTitle: 'Özgeçmiş',
      cvUnavailable: 'CV dosyası henüz sağlanmadı. İndirme bağlantısı gösterilmiyor.',
      experienceEmpty: 'Doğrulanmış deneyim bilgisi henüz eklenmedi.',
      expertiseEmpty: 'Teknoloji ve uzmanlık listesi henüz sağlanmadı.',
      socialTitle: 'Sosyal profiller',
      socialUnavailable: 'Doğrulanmış profil bağlantısı henüz sağlanmadı.',
    },
    services: {
      eyebrow: 'Hizmetler',
      title: 'Hizmetler',
      description:
        'Gerçek hizmet kapsamı ve çalışma koşulları sağlanana kadar kartlar açık yer tutucudur.',
      cardsTitle: 'Hizmet alanları',
      processTitle: 'Çalışma süreci',
      faqTitle: 'Sık sorulan sorular',
      faqEmpty: 'Doğrulanmış hizmet bilgisi olmadan soru-cevap yayımlanmıyor.',
      contactTitle: 'Bir konu hakkında konuşalım mı?',
      contactBody:
        'Gönderdiğiniz mesaj güvenli yönetim kutusunda saklanır ve yalnızca yönetici hesabıyla görüntülenir.',
      contactCta: 'İletişim sayfasına git',
    },
    blog: {
      eyebrow: 'Yazılar',
      title: 'Blog',
      description: 'Yalnızca doğrulanmış ve yayıma hazır yazılar burada listelenir.',
      emptyTitle: 'Henüz yayımlanmış yazı yok',
      emptyBody: 'Gerçek yazı içeriği eklendiğinde bu liste kendiliğinden güncellenir.',
      detailsLabel: 'Yazı içeriği',
      categoryLabel: 'Kategori',
      tagsLabel: 'Etiketler',
      readingTimeLabel: 'dakika okuma',
      backToList: 'Tüm yazılara dön',
      notFoundTitle: 'Bu yazı bulunamadı',
      notFoundBody: 'Bağlantı hatalı olabilir veya bu yazı yayımlanmamış olabilir.',
    },
    lab: {
      eyebrow: 'Deneyler',
      title: 'Lab',
      description: 'Yalnızca sağlanmış ve doğrulanmış deney/proje kayıtları burada gösterilir.',
      emptyTitle: 'Henüz Lab kaydı yok',
      emptyBody: 'Gerçek proje veya demo bilgisi eklendiğinde liste burada görünür.',
      detailsLabel: 'Proje açıklaması',
      categoryLabel: 'Kategori',
      tagsLabel: 'Etiketler',
      backToList: 'Lab listesine dön',
      notFoundTitle: 'Bu Lab kaydı bulunamadı',
      notFoundBody: 'Bağlantı hatalı olabilir veya bu kayıt henüz eklenmemiş olabilir.',
      projectLink: 'Projeyi aç',
    },
    contact: {
      eyebrow: 'İletişim',
      title: 'İletişim formu',
      description: 'Mesajınızı gönderin; yönetim ekibi size e-posta üzerinden dönüş yapabilir.',
      nameLabel: 'Adınız',
      nameHint: 'Adınızı yazın.',
      nameRequired: 'Ad alanı zorunludur.',
      emailLabel: 'E-posta adresiniz',
      emailHint: 'Geçerli bir e-posta biçimi kullanın.',
      emailRequired: 'E-posta alanı zorunludur.',
      emailInvalid: 'Geçerli bir e-posta adresi girin.',
      messageLabel: 'Mesajınız',
      messageHint: 'Mesaj metnini yazın.',
      messageRequired: 'Mesaj alanı zorunludur.',
      sendButton: 'Mesajı gönder',
      sendingLabel: 'Gönderiliyor…',
      submitError: 'Mesaj gönderilemedi. Lütfen biraz sonra tekrar deneyin.',
      noSendTitle: 'Güvenli mesaj kutusu',
      noSendBody:
        'Mesajlar aynı-origin API üzerinden doğrulanır ve yönetici panelinde erişilebilir şekilde saklanır.',
      validatedTitle: 'Mesajınız gönderildi',
      validatedBody: 'Mesajınız alındı ve yönetim panelindeki güvenli mesaj kutusuna kaydedildi.',
    },
    notFound: {
      eyebrow: '404 · Sayfa bulunamadı',
      title: 'Aradığınız sayfa burada değil.',
      description: 'Adres değişmiş, hatalı yazılmış veya içerik henüz eklenmemiş olabilir.',
      homeLink: 'Ana sayfaya dön',
    },
  },
  en: {
    accessibility: {
      primaryNavigation: 'Footer navigation',
      socialNavigation: 'Social links',
    },
    about: {
      eyebrow: 'Profile',
      title: 'About',
      description: 'This page will be updated when verified profile content is provided.',
      biographyTitle: 'Short biography',
      experienceTitle: 'Experience',
      expertiseTitle: 'Technologies and areas of expertise',
      cvTitle: 'Résumé',
      cvUnavailable: 'A résumé file has not been provided. No download link is shown.',
      experienceEmpty: 'No verified experience details have been added yet.',
      expertiseEmpty: 'A technology and expertise list has not been provided yet.',
      socialTitle: 'Social profiles',
      socialUnavailable: 'No verified profile link has been provided yet.',
    },
    services: {
      eyebrow: 'Services',
      title: 'Services',
      description:
        'Cards remain explicit placeholders until real service scope and terms are provided.',
      cardsTitle: 'Service areas',
      processTitle: 'Working process',
      faqTitle: 'Frequently asked questions',
      faqEmpty: 'No questions and answers are published without verified service details.',
      contactTitle: 'Would you like to discuss something?',
      contactBody:
        'Messages are stored in the secure admin inbox and can only be viewed by an administrator.',
      contactCta: 'Go to the contact page',
    },
    blog: {
      eyebrow: 'Writing',
      title: 'Blog',
      description: 'Only verified, publication-ready articles are listed here.',
      emptyTitle: 'No published articles yet',
      emptyBody: 'This list will update when real article content is added.',
      detailsLabel: 'Article content',
      categoryLabel: 'Category',
      tagsLabel: 'Tags',
      readingTimeLabel: 'min read',
      backToList: 'Back to all articles',
      notFoundTitle: 'Article not found',
      notFoundBody: 'The link may be incorrect or the article may not be published.',
    },
    lab: {
      eyebrow: 'Experiments',
      title: 'Lab',
      description: 'Only supplied and verified experiment or project records are shown here.',
      emptyTitle: 'No Lab entries yet',
      emptyBody: 'Real project or demo details will appear here when provided.',
      detailsLabel: 'Project description',
      categoryLabel: 'Category',
      tagsLabel: 'Tags',
      backToList: 'Back to the Lab list',
      notFoundTitle: 'Lab entry not found',
      notFoundBody: 'The link may be incorrect or this entry may not have been added yet.',
      projectLink: 'Open project',
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Contact form',
      description: 'Send a message; the site owner can respond to you by email.',
      nameLabel: 'Your name',
      nameHint: 'Enter your name.',
      nameRequired: 'Name is required.',
      emailLabel: 'Your email address',
      emailHint: 'Use a valid email format.',
      emailRequired: 'Email is required.',
      emailInvalid: 'Enter a valid email address.',
      messageLabel: 'Your message',
      messageHint: 'Enter your message.',
      messageRequired: 'Message is required.',
      sendButton: 'Send message',
      sendingLabel: 'Sending…',
      submitError: 'Your message could not be sent. Please try again in a moment.',
      noSendTitle: 'Secure message inbox',
      noSendBody:
        'Messages are validated by the same-origin API and stored in the admin panel inbox.',
      validatedTitle: 'Your message was sent',
      validatedBody: 'Your message was received and saved to the secure admin inbox.',
    },
    notFound: {
      eyebrow: '404 · Page not found',
      title: 'The page you are looking for is not here.',
      description:
        'The address may have changed, been mistyped, or the content may not have been added yet.',
      homeLink: 'Return to the home page',
    },
  },
};
