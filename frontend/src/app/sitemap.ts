import type { MetadataRoute } from 'next';

const siteUrl = 'https://likelion-khu.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/projects`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/blog`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/members`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/activities`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/recruit`, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
