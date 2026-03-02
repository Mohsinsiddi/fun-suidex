import { MetadataRoute } from 'next'
import { APP_BASE_URL } from '@/constants'

const baseUrl = APP_BASE_URL

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/pwa/', '/r/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
