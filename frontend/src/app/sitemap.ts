import type { MetadataRoute } from 'next';

const siteUrl = 'https://likelion-khu.com';
const isProduction = process.env.VERCEL_ENV === 'production';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProduction) {
    return [];
  }

  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/projects`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/blog`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/members`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/faq`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/apply`, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
