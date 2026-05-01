import AsyncStorage from "@react-native-async-storage/async-storage";

const STORE_KEY = "local_notifications_v1";
const MAX_ITEMS = 60;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface StoredNotification {
  id: string;
  type: "order" | "promotion" | "system" | "chat";
  title: string;
  description: string;
  icon: string;
  time: string;
  isRead: boolean;
  badgeLabel: string;
  createdAt: number;
  // Thông tin cho tin nhắn (chat)
  id_don_hang?: number;
  id_shipper?: number;
  sender_name?: string;
  sender_avatar?: string;
  dia_chi?: string;
  ma_don_hang?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export const formatTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return `${Math.floor(days / 7)} tuần trước`;
};

// ── API ───────────────────────────────────────────────────────────────────────
export const loadNotifications = async (): Promise<StoredNotification[]> => {
  try {
    const str = await AsyncStorage.getItem(STORE_KEY);
    if (!str) return [];
    const list: StoredNotification[] = JSON.parse(str);
    return list.map((n) => ({ ...n, time: formatTimeAgo(n.createdAt) }));
  } catch {
    return [];
  }
};

export const saveNotification = async (
  item: Pick<StoredNotification, "type" | "title" | "description" | "icon" | "badgeLabel"> & 
    Partial<Pick<StoredNotification, "id_don_hang" | "id_shipper" | "sender_name" | "sender_avatar" | "dia_chi" | "ma_don_hang">>
): Promise<void> => {
  try {
    const now = Date.now();
    const newItem: StoredNotification = {
      ...item,
      id: `notif_${now}_${Math.random().toString(36).slice(2, 7)}`,
      time: "Vừa xong",
      isRead: false,
      createdAt: now,
    };
    const current = await loadNotifications();
    const updated = [newItem, ...current].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
  } catch {}
};

export const markNotificationRead = async (id: string): Promise<void> => {
  try {
    const list = await loadNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
  } catch {}
};

export const markAllNotificationsRead = async (): Promise<void> => {
  try {
    const list = await loadNotifications();
    const updated = list.map((n) => ({ ...n, isRead: true }));
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
  } catch {}
};

export const deleteNotification = async (id: string): Promise<void> => {
  try {
    const list = await loadNotifications();
    const updated = list.filter((n) => n.id !== id);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
  } catch {}
};
