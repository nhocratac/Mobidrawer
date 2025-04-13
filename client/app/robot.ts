import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Disallow any private paths if needed
      // disallow: '/private/',
    },
    sitemap: 'https://mobidrawer.id.vn/sitemap.xml',
    // Optional: specify your host
    // host: 'https://uit-mobidrawer.vercel.app'
  }
}