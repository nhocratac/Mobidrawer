import env from '@/utils/environment'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow:'/user/'
      // Disallow any private paths if needed
      // disallow: '/private/',
    },
    sitemap: `${env.NEXT_PUBLIC_FRONTEND_DOMAIN}/sitemap.xml`,
    // Optional: specify your host
     host: `${env.NEXT_PUBLIC_FRONTEND_DOMAIN}`
  }
}