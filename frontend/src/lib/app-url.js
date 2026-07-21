const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  || process.env.NEXT_PUBLIC_SITE_URL
  || (typeof window !== 'undefined' ? window.location.origin : 'https://myphotolife.vercel.app');

const APP_DOMAIN = (() => {
  try {
    return new URL(APP_URL).hostname;
  } catch {
    return 'myphotolife.vercel.app';
  }
})();

export function getAppUrl() {
  return APP_URL;
}

export function getPortfolioUrl(slug) {
  return `${APP_URL}/${slug}`;
}

export function getDomain() {
  return APP_DOMAIN;
}

export const APP_NAME = 'MyPhotoLife';
export const APP_TAGLINE = 'Portfólio Profissional para Fotógrafos';
