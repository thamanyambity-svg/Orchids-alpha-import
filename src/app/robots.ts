import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://alpha-import.com'

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/admin/', '/api/'], // Protect private areas
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
