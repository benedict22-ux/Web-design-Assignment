import CryptoJS from 'crypto-js';

/**
 * Generates a Gravatar URL from an email address
 * @param email - The email address to generate Gravatar URL for
 * @param size - The size of the avatar (default: 200)
 * @param defaultImage - The default image type if no Gravatar exists (default: 'mp' for mystery person)
 * @returns The Gravatar URL
 */
export function getGravatarUrl(
  email: string | null | undefined,
  size: number = 200,
  defaultImage: string = 'mp'
): string {
  if (!email) {
    return `https://www.gravatar.com/avatar/?s=${size}&d=${defaultImage}`;
  }

  // Create MD5 hash of the email
  const trimmedEmail = email.trim().toLowerCase();
  const md5Hash = CryptoJS.MD5(trimmedEmail).toString();
  
  return `https://www.gravatar.com/avatar/${md5Hash}?s=${size}&d=${defaultImage}`;
}
