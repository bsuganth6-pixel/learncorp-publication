/**
 * Business details that were NOT supplied in the project spec, so none of the
 * values below are real. Replace every PLACEHOLDER before launch (see the
 * "Before launch" checklist in the README). Empty strings hide the matching
 * row/section instead of showing made-up information.
 */
export const siteConfig = {
  name: 'LearnCorp Publication',
  contact: {
    email: 'contact@example.com', // PLACEHOLDER
    phone: '+00 00000 00000', // PLACEHOLDER
    whatsapp: '', // digits only incl. country code (e.g. 919876543210); empty hides the row
    address: 'Your business address here', // PLACEHOLDER
    hours: 'Mon–Sat, 10:00 AM – 6:00 PM', // PLACEHOLDER
    mapEmbedUrl: '', // an https://www.openstreetmap.org/export/embed.html?... or Google Maps embed URL; empty hides the map
  },
  social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
  },
  about: {
    story:
      '[Placeholder] Tell your story here — when the company started, why, and what it has learned working with authors.',
    team: [] as { name: string; role: string }[], // empty hides "Our Team"
    achievements: [] as { value: string; label: string }[], // empty hides "Our Achievements"
  },
};
