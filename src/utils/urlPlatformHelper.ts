export interface PlatformInfo {
  type: string;
  name: string;
  color: string;
  badgeBg: string;
  textColor: string;
  iconName: string;
}

export interface ExtractedLink {
  originalUrl: string;
  cleanUrl: string;
  href: string;
  platform: PlatformInfo;
}

export function detectPlatform(rawUrl: string): PlatformInfo {
  const url = rawUrl.toLowerCase();

  if (url.includes('instagram.com') || url.includes('instagr.am')) {
    return {
      type: 'instagram',
      name: 'Instagram',
      color: '#E1306C',
      badgeBg: 'bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white',
      textColor: 'text-pink-500',
      iconName: 'Instagram',
    };
  }

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return {
      type: 'youtube',
      name: 'YouTube',
      color: '#FF0000',
      badgeBg: 'bg-red-600 text-white',
      textColor: 'text-red-500',
      iconName: 'Youtube',
    };
  }

  if (url.includes('facebook.com') || url.includes('fb.me') || url.includes('fb.watch')) {
    return {
      type: 'facebook',
      name: 'Facebook',
      color: '#1877F2',
      badgeBg: 'bg-blue-600 text-white',
      textColor: 'text-blue-500',
      iconName: 'Facebook',
    };
  }

  if (url.includes('wa.me') || url.includes('whatsapp.com')) {
    return {
      type: 'whatsapp',
      name: 'WhatsApp',
      color: '#25D366',
      badgeBg: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-500',
      iconName: 'MessageCircle',
    };
  }

  if (url.includes('maps.google') || url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl')) {
    return {
      type: 'google_maps',
      name: 'Google Maps',
      color: '#4285F4',
      badgeBg: 'bg-gradient-to-tr from-blue-500 to-emerald-500 text-white',
      textColor: 'text-blue-500',
      iconName: 'MapPin',
    };
  }

  if (url.includes('g.page') || url.includes('search.google.com/local/writereview') || url.includes('google.com/search')) {
    return {
      type: 'google_review',
      name: 'Google Review',
      color: '#FBBC05',
      badgeBg: 'bg-amber-400 text-slate-900',
      textColor: 'text-amber-500',
      iconName: 'Star',
    };
  }

  if (url.includes('twitter.com') || url.includes('x.com')) {
    return {
      type: 'twitter',
      name: 'X (Twitter)',
      color: '#000000',
      badgeBg: 'bg-slate-900 text-white',
      textColor: 'text-slate-900 dark:text-white',
      iconName: 'Twitter',
    };
  }

  if (url.includes('linkedin.com')) {
    return {
      type: 'linkedin',
      name: 'LinkedIn',
      color: '#0A66C2',
      badgeBg: 'bg-blue-700 text-white',
      textColor: 'text-blue-600',
      iconName: 'Linkedin',
    };
  }

  if (url.includes('t.me') || url.includes('telegram.me')) {
    return {
      type: 'telegram',
      name: 'Telegram',
      color: '#229ED9',
      badgeBg: 'bg-sky-500 text-white',
      textColor: 'text-sky-500',
      iconName: 'Send',
    };
  }

  if (url.includes('spotify.com')) {
    return {
      type: 'spotify',
      name: 'Spotify',
      color: '#1DB954',
      badgeBg: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-500',
      iconName: 'Music',
    };
  }

  if (url.includes('zomato.com')) {
    return {
      type: 'zomato',
      name: 'Zomato',
      color: '#CB202D',
      badgeBg: 'bg-rose-600 text-white',
      textColor: 'text-rose-500',
      iconName: 'Utensils',
    };
  }

  if (url.includes('swiggy.com')) {
    return {
      type: 'swiggy',
      name: 'Swiggy',
      color: '#FC8019',
      badgeBg: 'bg-orange-600 text-white',
      textColor: 'text-orange-500',
      iconName: 'Utensils',
    };
  }

  // Format generic hostname (e.g. "menukit.in")
  let domainName = 'Website';
  try {
    const formatted = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(formatted);
    domainName = parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    domainName = 'Website';
  }

  return {
    type: 'website',
    name: domainName,
    color: '#6366F1',
    badgeBg: 'bg-indigo-600 text-white',
    textColor: 'text-indigo-500',
    iconName: 'Globe',
  };
}

export function extractUrlsAndCleanText(rawText?: string | null): { cleanText: string; links: ExtractedLink[] } {
  if (!rawText) {
    return { cleanText: '', links: [] };
  }

  // Comprehensive URL regex matching http, https, www, or popular TLD domains
  const urlRegex = /(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(?:com|in|org|net|co|io|app|ai|me|ly|link|site|store|page|tech|info|dev)(?:\/[^\s]*)?)/gi;

  const links: ExtractedLink[] = [];
  const seenHrefs = new Set<string>();

  // Find all matches
  const matches = rawText.match(urlRegex);
  if (matches) {
    matches.forEach((matched) => {
      let cleanUrl = matched;
      let trailing = '';
      const matchTrailing = cleanUrl.match(/[.,;:!?)]+$/);
      if (matchTrailing) {
        trailing = matchTrailing[0];
        cleanUrl = cleanUrl.slice(0, -trailing.length);
      }

      if (cleanUrl.length >= 4) {
        const href = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
          ? cleanUrl
          : `https://${cleanUrl}`;

        if (!seenHrefs.has(href)) {
          seenHrefs.add(href);
          links.push({
            originalUrl: matched,
            cleanUrl,
            href,
            platform: detectPlatform(cleanUrl),
          });
        }
      }
    });
  }

  // Remove URLs cleanly from rawText
  let cleanText = rawText.replace(urlRegex, '').replace(/https?:\/\/|www\./gi, '');

  // Clean up excessive blank lines & trim
  cleanText = cleanText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();

  return { cleanText, links };
}
