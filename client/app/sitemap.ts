import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2025-04-12T15:45:47.418Z') // fixed date cho khớp file XML bạn đã gửi.

  return [
    { url: 'https://mobidrawer.id.vn/Security', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/HelpCenter', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/register', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/Events', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/Pricing', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/test', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/Enterprise', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/Blog', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn', lastModified, changeFrequency: 'daily', priority: 1 },
    { url: 'https://mobidrawer.id.vn/login', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/Contact', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/Integration', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/UseCase', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/Feature', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/user', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/user/my-blogs/published', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/LandingPage', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/user/post', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/Team', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/user/my-blogs/draft', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/user/store', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/user/recent', lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mobidrawer.id.vn/user/dashboard', lastModified, changeFrequency: 'daily', priority: 0.7 },
  ]
}
