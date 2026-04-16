const BASE_URL = 'https://cefr-ready.vercel.app';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ── Pre-built schema helpers ────────────────────────────────────────────

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        name: 'CEFR Ready',
        alternateName: ['เตรียมสอบ CEFR ออนไลน์', 'ข้อสอบ CEFR มทส'],
        url: BASE_URL,
        description: 'เตรียมพร้อมสอบ CEFR ด้วยข้อสอบ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ครอบคลุมระดับ A1 ถึง C2 ฟรี 100%',
        inLanguage: ['th', 'en'],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/must-know?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'CEFR Ready',
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/opengraph-image.png`,
          width: 1200,
          height: 630,
        },
        description: 'แพลตฟอร์มฝึกทำข้อสอบภาษาอังกฤษมาตรฐาน CEFR สำหรับนักศึกษาไทย ฟรี 100%',
        foundingDate: '2024',
        sameAs: [],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          availableLanguage: ['Thai', 'English'],
        },
      },
    ],
  };
}

export function courseSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'CEFR Ready — ฝึกทำข้อสอบ CEFR ออนไลน์',
    description: 'ทดสอบและพัฒนาทักษะภาษาอังกฤษด้วยข้อสอบ CEFR ครอบคลุมระดับ A1 ถึง C2 ฟรี 100% มี 4 ประเภท: Focus on Form, Focus on Meaning, Form & Meaning, Listening พร้อมคำอธิบายทุกข้อ',
    provider: {
      '@type': 'Organization',
      name: 'CEFR Ready',
      url: BASE_URL,
    },
    url: BASE_URL,
    courseCode: 'CEFR-ALL',
    educationalLevel: 'A1, A2, B1, B2, C1, C2',
    teaches: [
      'English Grammar (Focus on Form)',
      'English Vocabulary (Focus on Meaning)',
      'Reading Comprehension with Grammar and Vocabulary (Form & Meaning)',
      'English Listening Comprehension',
    ],
    isAccessibleForFree: true,
    inLanguage: ['th', 'en'],
    numberOfCredits: 0,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'THB',
      availability: 'https://schema.org/InStock',
      category: 'Free',
    },
    hasCourseInstance: [
      {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: 'PT30M',
        name: 'Focus on Form',
        description: 'ข้อสอบไวยากรณ์ภาษาอังกฤษ 30 ข้อ ระดับ A1-C2',
      },
      {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: 'PT30M',
        name: 'Focus on Meaning',
        description: 'ข้อสอบคำศัพท์ภาษาอังกฤษ 30 ข้อ ระดับ A1-C2',
      },
      {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: 'PT30M',
        name: 'Form & Meaning',
        description: 'ข้อสอบเติมคำในบทความ 30 ข้อ ระดับ A1-C2',
      },
      {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: 'PT30M',
        name: 'Listening',
        description: 'ข้อสอบฟังภาษาอังกฤษ 30 ข้อ ระดับ A1-C2',
      },
    ],
    image: `${BASE_URL}/opengraph-image.png`,
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function articleSchema(article: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  tags?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url,
    author: {
      '@type': 'Organization',
      name: 'CEFR Ready',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'CEFR Ready',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/opengraph-image.png`,
      },
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    inLanguage: 'th',
    isAccessibleForFree: true,
    keywords: article.tags?.join(', '),
    about: {
      '@type': 'Thing',
      name: 'CEFR English Proficiency',
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'CEFR Ready',
      url: BASE_URL,
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function educationalTestSchema(opts: {
  name: string;
  description: string;
  url: string;
  questionCount: number;
  cefrLevel?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    about: {
      '@type': 'Thing',
      name: 'CEFR English Proficiency Test',
    },
    educationalLevel: opts.cefrLevel ?? 'A1-C2',
    isAccessibleForFree: true,
    provider: {
      '@type': 'Organization',
      name: 'CEFR Ready',
      url: BASE_URL,
    },
    numberOfQuestions: opts.questionCount,
    assesses: 'English Language Proficiency',
    inLanguage: 'en',
    typicalAgeRange: '15-30',
  };
}
