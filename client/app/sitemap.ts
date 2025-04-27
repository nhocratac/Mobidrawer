import blogAPIs from "@/api/blogAPI";
import { MetadataRoute } from "next";

type Blog = {
  id: string;
  slug: string;
  updatedAt?: string;
  createdAt: string;
}

const now = new Date().toISOString();

const staticUrls: MetadataRoute.Sitemap = [
  { url: "https://mobidrawer.id.vn", lastModified: now, changeFrequency: "daily", priority: 1 },
  { url: "https://mobidrawer.id.vn/Blog", lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  { url: "https://mobidrawer.id.vn/Security", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/HelpCenter", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/register", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/Events", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/Pricing", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/test", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/Enterprise", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/login", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/Contact", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/Integration", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/UseCase", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/Feature", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/user", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/user/my-blogs/published", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/LandingPage", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/user/post", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/Team", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/user/my-blogs/draft", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/user/store", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/user/recent", lastModified: now, changeFrequency: "daily", priority: 0.7 },
  { url: "https://mobidrawer.id.vn/user/dashboard", lastModified: now, changeFrequency: "daily", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs: Blog[] = await blogAPIs.getAllBlogsForSitemap();
  console.log("blogs", blogs.length);
  const blogUrls: MetadataRoute.Sitemap = blogs.map((blog) => ({
    url: `https://mobidrawer.id.vn/Blog/${blog.slug}?id=${blog.id}`,
    lastModified:now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticUrls, ...blogUrls];
}
