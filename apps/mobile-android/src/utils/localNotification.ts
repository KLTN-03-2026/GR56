import notifee, {
  AndroidImportance,
  AndroidStyle,
  AuthorizationStatus,
} from "@notifee/react-native";

// ─── Channel IDs ────────────────────────────────────────
export const CHANNEL_ORDER  = "channel_order";
export const CHANNEL_PROMO  = "channel_promo";
export const CHANNEL_SYSTEM = "channel_system";
export const CHANNEL_CHAT   = "channel_chat";

// ─── Tạo các channel (gọi 1 lần khi app khởi động) ─────
export async function createNotificationChannels() {
  await notifee.createChannel({
    id: CHANNEL_ORDER,
    name: "Đơn hàng",
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: "default",
  });
  await notifee.createChannel({
    id: CHANNEL_CHAT,
    name: "Tin nhắn",
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: "default",
  });
  await notifee.createChannel({
    id: CHANNEL_PROMO,
    name: "Khuyến mãi",
    importance: AndroidImportance.DEFAULT,
    sound: "default",
  });
  await notifee.createChannel({
    id: CHANNEL_SYSTEM,
    name: "Hệ thống",
    importance: AndroidImportance.LOW,
  });
}

// ─── Xin quyền thông báo (Android 13+) ──────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

// ─── Kiểu thông báo khớp với NotificationItem ───────────
export type NotifType = "order" | "promotion" | "system" | "chat";

interface NotifPayload {
  title: string;
  description: string;
  type: NotifType;
  /** URL ảnh lớn (tuỳ chọn) */
  imageUrl?: string;
}

function getChannelByType(type: NotifType): string {
  switch (type) {
    case "order":     return CHANNEL_ORDER;
    case "chat":      return CHANNEL_CHAT;
    case "promotion": return CHANNEL_PROMO;
    default:          return CHANNEL_SYSTEM;
  }
}

function getBadgeLabel(type: NotifType): string {
  switch (type) {
    case "order":     return "Đơn hàng";
    case "chat":      return "Tin nhắn";
    case "promotion": return "Khuyến mãi";
    default:          return "Hệ thống";
  }
}

// ─── Gửi thông báo ra màn hình ngoài ───────────────────
export async function sendLocalNotification(payload: NotifPayload) {
  const { title, description, type, imageUrl } = payload;
  const channelId = getChannelByType(type);
  const badge = getBadgeLabel(type);

  await notifee.displayNotification({
    title: `<b>${title}</b>`,
    body: description,
    subtitle: badge,
    android: {
      channelId,
      smallIcon: "ic_launcher",
      color: type === "order" ? "#EE4D2D" : type === "promotion" ? "#F59E0B" : "#3B82F6",
      importance: AndroidImportance.HIGH,
      pressAction: { id: "default" },
      ...(imageUrl
        ? {
            style: {
              type: AndroidStyle.BIGPICTURE,
              picture: imageUrl,
              title: `<b>${title}</b>`,
              summary: description,
            },
          }
        : {
            style: {
              type: AndroidStyle.BIGTEXT,
              text: description,
            },
          }),
    },
    ios: {
      categoryId: type,
      sound: "default",
    },
  });
}

// ─── Shortcuts theo từng loại ────────────────────────────
export const notify = {
  order: (title: string, description: string) =>
    sendLocalNotification({ title, description, type: "order" }),

  chat: (title: string, description: string) =>
    sendLocalNotification({ title, description, type: "chat" }),

  promotion: (title: string, description: string) =>
    sendLocalNotification({ title, description, type: "promotion" }),

  system: (title: string, description: string) =>
    sendLocalNotification({ title, description, type: "system" }),
};
