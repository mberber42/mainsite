export type Locale = 'tr' | 'en';

export interface HomeAction {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
}

export interface PreviewCard {
  label: string;
  title: string;
  description: string;
  meta: string;
}

export interface PathwayCard {
  title: string;
  description: string;
  status: string;
  href: string;
  index: string;
}

export interface HomeCopy {
  accessibility: {
    skipToContent: string;
    navigation: string;
    languageGroup: string;
    switchToTurkish: string;
    switchToEnglish: string;
    brandHome: string;
    socialLinks: string;
  };
  navigation: { label: string; href: string }[];
  hero: {
    eyebrow: string;
    availability: string;
    visualCaption: string;
    value: string;
    description: string;
    actions: HomeAction[];
  };
  pathways: {
    eyebrow: string;
    title: string;
    description: string;
    cards: PathwayCard[];
  };
  projects: {
    eyebrow: string;
    title: string;
    description: string;
    cards: PreviewCard[];
  };
  writing: {
    eyebrow: string;
    title: string;
    description: string;
    cards: PreviewCard[];
  };
  contact: {
    eyebrow: string;
    title: string;
    description: string;
    status: string;
  };
  socialPending: string;
  footerNote: string;
}

export const SITE_IDENTITY = {
  name: 'Mustafa BERBER',
  title: 'Full Stack Developer',
} as const;

export const SITE_CONFIG = {
  // Illustrative example only. Replace with the real site URL before launch.
  portfolioBaseUrl: 'https://portfolio.alanadi.com',
  socialLinks: [
    { platform: 'GitHub', href: null as string | null },
    { platform: 'LinkedIn', href: null as string | null },
    { platform: 'X', href: null as string | null },
  ],
} as const;

export const HOME_CONTENT: Record<Locale, HomeCopy> = {
  tr: {
    accessibility: {
      skipToContent: 'Ana içeriğe geç',
      navigation: 'Ana gezinme',
      languageGroup: 'Dil seçimi',
      switchToTurkish: 'Türkçe diline geç',
      switchToEnglish: 'İngilizce diline geç',
      brandHome: 'Mustafa BERBER ana sayfa',
      socialLinks: 'Sosyal bağlantılar',
    },
    navigation: [
      { label: 'Seçili işler', href: '#work' },
      { label: 'Hizmetler', href: '#explore' },
      { label: 'Blog & Lab', href: '#writing' },
    ],
    hero: {
      eyebrow: 'Tasarım, kod ve dijital ürünler',
      availability: 'Müsaitlik bilgisi güncellenecek',
      visualCaption: 'ODAKLI ÜRETİM',
      value: 'Dijital ürünleri, sağlam mühendislik ve düşünülmüş deneyimlerle hayata geçiriyorum.',
      description:
        'Fikirden çalışan ürüne uzanan süreçte; netlik, özen ve sürdürülebilirliği merkeze alan bir yaklaşım.',
      actions: [
        { label: 'Projeleri keşfet', href: '#work', kind: 'primary' },
        { label: 'Hizmetleri gör', href: '#explore', kind: 'secondary' },
        { label: 'İletişim alanına git', href: '#contact', kind: 'secondary' },
      ],
    },
    pathways: {
      eyebrow: 'Keşfet',
      title: 'Bir sonraki adımını seç.',
      description: 'Bu sayfadan portfolyonun farklı bölümlerine geç.',
      cards: [
        {
          title: 'Kariyerim & CV',
          description:
            'Özgeçmiş ve doğrulanmış deneyim içerikleri hazırlandığında burada yer alacak.',
          status: 'Faz 2 · hazırlanacak',
          href: '/hakkimda',
          index: '01',
        },
        {
          title: 'Hizmetler',
          description: 'Hizmet kapsamı ve çalışma şekli için ayrıntılar daha sonra eklenecek.',
          status: 'Faz 2 · hazırlanacak',
          href: '/hizmetler',
          index: '02',
        },
        {
          title: 'Blog & Lab',
          description: 'Yazılar ve deneysel çalışmalar doğrulanmış içerikle güncellenecek.',
          status: 'Faz 2 · hazırlanacak',
          href: '/blog',
          index: '03',
        },
      ],
    },
    projects: {
      eyebrow: 'Portfolyo',
      title: 'Öne çıkan işler',
      description:
        'Gerçek proje bilgileri eklenene kadar bu kartlar açıkça yer tutucu olarak gösterilir.',
      cards: [
        {
          label: 'Yer tutucu',
          title: 'Proje adı eklenecek',
          description:
            'Doğrulanmış proje özeti ve görselleri hazır olduğunda bu alan güncellenecek.',
          meta: 'İçerik bekleniyor',
        },
        {
          label: 'Yer tutucu',
          title: 'İkinci proje eklenecek',
          description:
            'Kişisel deneyim veya başarı iddiası içermez; gerçek içerikle değiştirilmelidir.',
          meta: 'İçerik bekleniyor',
        },
      ],
    },
    writing: {
      eyebrow: 'Notlar & deneyler',
      title: 'Blog & Lab',
      description: 'Yayınlanmış yazılar eklenene kadar örnek içerik gösterilmez.',
      cards: [
        {
          label: 'Yer tutucu',
          title: 'İlk yazı eklenecek',
          description:
            'Başlık ve özet, yayınlanmış gerçek bir içerik seçildiğinde buraya girilecek.',
          meta: 'Yazı bağlantısı bekleniyor',
        },
        {
          label: 'Yer tutucu',
          title: 'İlk Lab notu eklenecek',
          description: 'Deneysel çalışmalar ve açıklamaları daha sonraki bir fazda eklenecek.',
          meta: 'İçerik bekleniyor',
        },
      ],
    },
    contact: {
      eyebrow: 'İletişim',
      title: 'Birlikte neler yapabiliriz?',
      description: 'İletişim bilgileri henüz sağlanmadı; yayın öncesinde buraya eklenecek.',
      status: 'İletişim bilgisi eklenecek',
    },
    socialPending: 'Bağlantı eklenecek',
    footerNote: 'Gerçek içeriklerle güncellenmeye hazır, iki dilli bir portfolyo temeli.',
  },
  en: {
    accessibility: {
      skipToContent: 'Skip to main content',
      navigation: 'Primary navigation',
      languageGroup: 'Language selection',
      switchToTurkish: 'Switch language to Turkish',
      switchToEnglish: 'Switch language to English',
      brandHome: 'Mustafa BERBER home page',
      socialLinks: 'Social links',
    },
    navigation: [
      { label: 'Selected work', href: '#work' },
      { label: 'Services', href: '#explore' },
      { label: 'Blog & Lab', href: '#writing' },
    ],
    hero: {
      eyebrow: 'Design, code and digital products',
      availability: 'Availability status to be updated',
      visualCaption: 'BUILD WITH INTENT',
      value: 'I build digital products with thoughtful experiences and reliable engineering.',
      description:
        'From idea to working product, with a focus on clarity, care and long-term maintainability.',
      actions: [
        { label: 'Explore selected work', href: '#work', kind: 'primary' },
        { label: 'Explore services', href: '#explore', kind: 'secondary' },
        { label: 'Go to contact', href: '#contact', kind: 'secondary' },
      ],
    },
    pathways: {
      eyebrow: 'Explore',
      title: 'Choose where to go next.',
      description: 'Move from here to the different areas of the portfolio.',
      cards: [
        {
          title: 'Career & CV',
          description: 'This page will be filled with a verified résumé and experience details.',
          status: 'Phase 2 · planned',
          href: '/hakkimda',
          index: '01',
        },
        {
          title: 'Services',
          description: 'Service details and ways of working will be added in a later phase.',
          status: 'Phase 2 · planned',
          href: '/hizmetler',
          index: '02',
        },
        {
          title: 'Blog & Lab',
          description: 'Writing and experiments will be updated with verified content.',
          status: 'Phase 2 · planned',
          href: '/blog',
          index: '03',
        },
      ],
    },
    projects: {
      eyebrow: 'Portfolio',
      title: 'Selected work',
      description:
        'These cards are clearly marked placeholders until real project details are provided.',
      cards: [
        {
          label: 'Placeholder',
          title: 'Project title to be added',
          description:
            'This space will be updated when a verified project summary and visuals are ready.',
          meta: 'Content pending',
        },
        {
          label: 'Placeholder',
          title: 'Second project to be added',
          description:
            'No personal experience or outcome is claimed; replace with verified content.',
          meta: 'Content pending',
        },
      ],
    },
    writing: {
      eyebrow: 'Notes & experiments',
      title: 'Blog & Lab',
      description: 'No sample post is presented as a published article.',
      cards: [
        {
          label: 'Placeholder',
          title: 'First article to be added',
          description: 'A real published title and summary can be added here later.',
          meta: 'Article link pending',
        },
        {
          label: 'Placeholder',
          title: 'First Lab note to be added',
          description: 'Experiments and their descriptions are reserved for a later phase.',
          meta: 'Content pending',
        },
      ],
    },
    contact: {
      eyebrow: 'Contact',
      title: 'What could we build together?',
      description: 'Contact details have not been provided and will be added before launch.',
      status: 'Contact details to be added',
    },
    socialPending: 'Link to be added',
    footerNote: 'A bilingual portfolio foundation, ready for verified content.',
  },
};
