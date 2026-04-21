export const API_BASE_URL = 'http://localhost:5002/api';

export const getStoredAuthToken = () => localStorage.getItem('agrilink_token');

export const getServerStaticOrigin = () => 'http://localhost:5002';

/**
 * Resolves a full image URL from a path.
 * Handles:
 * 1. Absolute URLs (returns as-is)
 * 2. Client-side assets starting with /src/assets (returns as-is)
 * 3. Server-side uploads (prepends server origin)
 */
export const getFullImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) return '';
  if (
    imagePath.startsWith('http') ||
    imagePath.startsWith('blob:') ||
    imagePath.startsWith('data:') ||
    imagePath.length < 2
  ) {
    return imagePath;
  }

  // If it's a client-side asset path from sample data, return it as-is (relative to client)
  if (imagePath.startsWith('/src/assets')) return imagePath;

  const normalized = imagePath.replace(/\\/g, '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;

  const serverBase = getServerStaticOrigin();
  return `${serverBase}${withLeadingSlash}`;
};

/**
 * Handles responses with 401 or 403 status by clearing local auth data
 * and redirecting the user to the login page.
 */
export const handleAuthRejected = (status: number, navigateToLogin: () => void) => {
  if (status === 401 || status === 403) {
    localStorage.removeItem('agrilink_token');
    localStorage.removeItem('agrilink_isLoggedIn');
    localStorage.removeItem('agrilink_user');
    navigateToLogin();
  }
};
