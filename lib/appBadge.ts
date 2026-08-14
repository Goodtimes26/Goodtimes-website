type AppBadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function countUnreadMessages(messageIds: string[], readMessageIds: string[]) {
  const readIds = new Set(readMessageIds);
  return messageIds.filter((messageId) => !readIds.has(messageId)).length;
}

export async function syncAppBadge(unreadCount: number) {
  if (typeof navigator === "undefined") return;

  const badgeNavigator = navigator as AppBadgeNavigator;
  try {
    if (unreadCount > 0 && typeof badgeNavigator.setAppBadge === "function") {
      await badgeNavigator.setAppBadge(unreadCount);
    } else if (unreadCount === 0 && typeof badgeNavigator.clearAppBadge === "function") {
      await badgeNavigator.clearAppBadge();
    }
  } catch {
    // Badging is progressive enhancement: unsupported or denied badges must never disrupt the Band-app.
  }
}

export async function clearAppBadge() {
  if (typeof navigator === "undefined") return;

  const badgeNavigator = navigator as AppBadgeNavigator;
  try {
    if (typeof badgeNavigator.clearAppBadge === "function") await badgeNavigator.clearAppBadge();
  } catch {
    // Ignore unavailable/denied Badging API implementations.
  }
}
