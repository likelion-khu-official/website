import type { MetadataRoute } from 'next';

const siteUrl = 'https://likelion-khu.com';
const isProduction = process.env.VERCEL_ENV === 'production';

export default function robots(): MetadataRoute.Robots {
  // noindex 헤더와 메타 태그를 크롤러가 읽을 수 있도록 stage에서도 크롤링 자체는 허용한다.
  // robots.txt로 차단하면 이미 발견된 URL이 noindex를 확인하지 못해 검색 결과에 남을 수 있다.
  if (!isProduction) {
    return {
      rules: {
        userAgent: '*',
        allow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/member/', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
