import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://conversionops.in';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/demo`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
{ url: `${base}/legal/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/legal/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ];
}
