import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2025-04-12T15:45:47.418Z') // fixed date cho khớp file XML bạn đã gửi.

  return [
    { url: 'https://uit-mobidrawer.vercel.app/Security', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/HelpCenter', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/register', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/Events', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/Pricing', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/test', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/Enterprise', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/Blog', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app', lastModified, changeFrequency: 'daily', priority: 1 },
    { url: 'https://uit-mobidrawer.vercel.app/login', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/Contact', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/Integration', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/UseCase', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/Feature', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/user', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/user/my-blogs/published', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/LandingPage', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/user/post', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/Team', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/user/my-blogs/draft', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/user/store', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/user/recent', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://uit-mobidrawer.vercel.app/user/dashboard', lastModified, changeFrequency: 'daily', priority: 0.7 },
  ]
}
