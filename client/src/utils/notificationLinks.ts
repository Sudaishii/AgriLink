export const normalizeNotificationLink = (link?: string | null): string | null => {
  if (!link) return null;

  if (link === '/buyer/orders') {
    return '/profile?tab=history';
  }

  return link;
};

