type AppBadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export type BadgeAvailability = "ready" | "permission-required" | "permission-denied" | "unsupported" | "browser";

export function getBadgeAvailability({
  standalone,
  badgeApiAvailable,
  notificationsAvailable,
  notificationPermission,
}: {
  standalone: boolean;
  badgeApiAvailable: boolean;
  notificationsAvailable: boolean;
  notificationPermission: NotificationPermission | "unsupported";
}): BadgeAvailability {
  if (!standalone) return "browser";
  if (!badgeApiAvailable || !notificationsAvailable) return "unsupported";
  if (notificationPermission === "granted") return "ready";
  if (notificationPermission === "denied") return "permission-denied";
  return "permission-required";
}

export function countUnreadMessages(messageIds: string[], readMessageIds: string[]) {
  const readIds = new Set(readMessageIds);
  return messageIds.filter((messageId) => !readIds.has(messageId)).length;
}

export function unreadMessageIds(
  messages: Array<{ id: string; author_id: string }>,
  readMessageIds: string[],
  userId: string,
) {
  const readIds = new Set(readMessageIds);
  return messages
    .filter((message) => message.author_id !== userId && !readIds.has(message.id))
    .map((message) => message.id);
}

export async function syncAppBadge(unreadCount: number) {
  if (typeof navigator === "undefined") return;

  const badgeNavigator = navigator as AppBadgeNavigator;
  try {
    if (unreadCount > 0 && typeof badgeNavigator.setAppBadge === "function") {
      await badgeNavigator.setAppBadge(unreadCount);
      console.info("[GoodTimes badge] Badge bijgewerkt", { unreadCount });
    } else if (unreadCount === 0 && typeof badgeNavigator.clearAppBadge === "function") {
      await badgeNavigator.clearAppBadge();
      console.info("[GoodTimes badge] Badge gewist");
    } else {
      console.info("[GoodTimes badge] Badging API niet beschikbaar op dit apparaat of buiten standalone-modus");
    }
  } catch (error) {
    console.error("[GoodTimes badge] Badge kon niet worden bijgewerkt", { unreadCount, error });
  }
}

export async function clearAppBadge() {
  if (typeof navigator === "undefined") return;

  const badgeNavigator = navigator as AppBadgeNavigator;
  try {
    if (typeof badgeNavigator.clearAppBadge === "function") await badgeNavigator.clearAppBadge();
  } catch (error) {
    console.error("[GoodTimes badge] Badge kon bij uitloggen niet worden gewist", error);
  }
}
