import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL?.startsWith('http://localhost') 
    ? 'https://cefrready.com' 
    : (process.env.NEXTAUTH_URL || 'https://cefrready.com');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
