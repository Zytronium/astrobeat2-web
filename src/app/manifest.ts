import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Astrobeat 2',
    short_name: 'Astrobeat',
    description: 'Astrobeat: Zytronium\'s Personal Music Player',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617', // match the theme
    theme_color: '#020617',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
