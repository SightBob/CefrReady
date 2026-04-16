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
    '@type': 'WebSite',
    name: 'CEFR Ready',
    alternateName: 'เตรียมสอบ CEFR ออนไลน์',
    url: 'https://cefrready.com',
    description: 'เตรียมพร้อมสอบ CEFR ด้วยข้อสอบ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ครอบคลุมระดับ A1 ถึง C2',
    inLanguage: ['th', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://cefrready.com/must-know?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

export function courseSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'CEFR Ready — ฝึกทำข้อสอบ CEFR ออนไลน์',
    description: 'ทดสอบและพัฒนาทักษะภาษาอังกฤษด้วยข้อสอบ CEFR ครอบคลุมระดับ A1 ถึง C2 ฟรี 100%',
    provider: {
      '@type': 'Organization',
      name: 'CEFR Ready',
      url: 'https://cefrready.com',
    },
    educationalLevel: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    teaches: ['English Grammar', 'English Listening', 'English Reading Comprehension'],
    isAccessibleForFree: true,
    availableLanguage: ['th', 'en'],
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT30M',
    },
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
      url: 'https://cefrready.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CEFR Ready',
      url: 'https://cefrready.com',
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    inLanguage: 'th',
    isAccessibleForFree: true,
  };
}
