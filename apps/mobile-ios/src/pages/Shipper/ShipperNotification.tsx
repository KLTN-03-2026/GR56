import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import apiClient from "../../genaral/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import {
  StoredNotification,
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  formatTimeAgo,
} from "../../utils/notificationStore";

const COLORS = {
  PRIMARY: "#EE4D2D",
  TEXT_DARK: "#1A1A2E",
  TEXT_MEDIUM: "#4A4A68",
  TEXT_LIGHT: "#7B7B9A",
  TEXT_LIGHT_GRAY: "#A8A8C0",
  ORDER_BG: "#FFF4F2",
  ORDER_ICON: "#EE4D2D",
  ORDER_ACCENT: "#EE4D2D",
  SYSTEM_BG: "#F0F7FF",
  SYSTEM_ICON: "#3B82F6",
  SYSTEM_ACCENT: "#3B82F6",
  BORDER: "#F0F0F5",
  SURFACE: "#FFFFFF",
  BG: "#F7F8FA",
};

type NotificationItem = StoredNotification;

const TABS = [
  { key: "all", label: "Tất cả", icon: "apps" },
  { key: "order", label: "Đơn hàng", icon: "bag-handle" },
  { key: "system", label: "Hệ thống", icon: "settings" },
] as const;

const ShipperNotification: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "order" | "system">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({});

  const fetchNotifications = useCallback(async () => {
    try {
      const localList = await loadNotifications();

      const res = await apiClient.get("/notifications");
      if (res.data && res.data.status) {
        const serverData = res.data.data || [];
        const serverMapped: NotificationItem[] = serverData.map((item: any) => {
          const d = item.data || {};
          const isCancel = d.loai === "order_cancelled" || d.type === "order_cancelled";
          const isBroadcast = d.type === "broadcast";

          let type: "order" | "promotion" | "system" = "system";
          if (isCancel || d.ma_don_hang || d.type === "refund_success") {
            type = "order";
          } else if (isBroadcast) {
            type = "system";
          }

          let icon = "settings";
          if (type === "order") icon = "bag-handle";
          else if (isBroadcast && d.loai === "news") icon = "newspaper";
          else if (isBroadcast && d.loai === "event") icon = "megaphone";

          let badgeLabel = "Hệ thống";
          if (type === "order") badgeLabel = "Đơn hàng";
          else if (isBroadcast) {
            if (d.loai === "event") badgeLabel = "Sự kiện";
            else if (d.loai === "news") badgeLabel = "Tin tức";
          }

          return {
            id: String(item.id),
            type,
            title: d.title || "Thông báo mới",
            description: d.message || d.description || "",
            icon,
            time: item.created_at ? formatTimeAgo(new Date(item.created_at).getTime()) : "Vừa xong",
            isRead: !!item.read_at,
            badgeLabel,
            link: d.link || "",
            createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
          };
        });

        const serverIds = new Set(serverMapped.map((n) => n.id));
        const localOnly = localList.filter((n) => !serverIds.has(n.id));
        const merged = [...serverMapped, ...localOnly].sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(merged);
      } else {
        setNotifications(localList);
      }
    } catch (err: any) {
      const localList = await loadNotifications();
      setNotifications(localList);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener("NEW_NOTIFICATION", fetchNotifications);
    const sub2 = DeviceEventEmitter.addListener("NEW_SHIPPER_ORDER", fetchNotifications);
    return () => { sub.remove(); sub2.remove(); };
  }, [fetchNotifications]);

  const filteredNotifications =
    activeTab === "all" ? notifications : notifications.filter((n) => n.type === activeTab);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.post("/notifications/mark-read", { id });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      await markNotificationRead(id);
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post("/notifications/mark-read", { id: null });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await markAllNotificationsRead();
    } catch {}
  };

  const handleDeleteNotification = async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    handleMarkAsRead(item.id);
    if (item.type === "order") {
      navigation.navigate("Orders");
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "order":
        return { bg: COLORS.ORDER_BG, icon: COLORS.ORDER_ICON, accent: COLORS.ORDER_ACCENT };
      case "system":
        return { bg: COLORS.SYSTEM_BG, icon: COLORS.SYSTEM_ICON, accent: COLORS.SYSTEM_ACCENT };
      default:
        return { bg: "#FFFFFF", icon: COLORS.PRIMARY, accent: COLORS.PRIMARY };
    }
  };

  const renderTab = (tab: typeof TABS[number]) => {
    const isActive = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={() => setActiveTab(tab.key as any)}
        activeOpacity={0.75}
      >
        <Ionicons name={tab.icon} size={14} color={isActive ? "#FFFFFF" : COLORS.TEXT_LIGHT} style={{ marginRight: 4 }} />
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    if (!scaleAnims.current[item.id]) {
      scaleAnims.current[item.id] = new Animated.Value(1);
    }
    const config = getTypeConfig(item.type);

    const handlePressIn = () => {
      Animated.spring(scaleAnims.current[item.id], { toValue: 0.975, useNativeDriver: true, speed: 20 }).start();
    };
    const handlePressOut = () => {
      Animated.spring(scaleAnims.current[item.id], { toValue: 1, useNativeDriver: true, speed: 20 }).start();
      handleNotificationPress(item);
    };

    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnims.current[item.id] }] }]}>
        <TouchableOpacity
          style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View style={[styles.accentBar, { backgroundColor: config.accent }]} />
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            <View style={[styles.iconInner, { backgroundColor: config.icon }]}>
              <Ionicons name={item.icon} size={20} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.contentWrapper}>
            <View style={styles.metaRow}>
              <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                <Text style={[styles.typeBadgeText, { color: config.accent }]}>{item.badgeLabel}</Text>
              </View>
              <Text style={styles.time}>{item.time}</Text>
            </View>
            <View style={styles.titleRow}>
              <Text style={[styles.title, item.isRead && styles.titleRead]} numberOfLines={2}>{item.title}</Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteNotification(item.id)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.TEXT_LIGHT_GRAY} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="notifications-off-outline" size={52} color={COLORS.PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
      <Text style={styles.emptyDesc}>Bạn sẽ nhận được thông báo về đơn hàng mới, trạng thái đơn và cập nhật hệ thống tại đây</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount} mới</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          style={styles.headerAction}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          disabled={unreadCount === 0}
        >
          <Ionicons name="checkmark-done" size={22} color={unreadCount > 0 ? "#FFFFFF" : "rgba(255,255,255,0.4)"} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
            {TABS.map(renderTab)}
          </ScrollView>
        </View>

        {filteredNotifications.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.emptyListContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.PRIMARY} colors={[COLORS.PRIMARY]} />}
          >
            {renderEmptyState()}
          </ScrollView>
        ) : (
          <FlatList
            data={filteredNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.PRIMARY} colors={[COLORS.PRIMARY]} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.PRIMARY },
  contentArea: { flex: 1, backgroundColor: COLORS.BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.6%"),
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 19, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
  headerBadge: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  headerBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  headerAction: { width: 36, height: 36, justifyContent: "center", alignItems: "center", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)" },
  tabsWrapper: { backgroundColor: COLORS.SURFACE, borderBottomWidth: 1, borderBottomColor: COLORS.BORDER },
  tabsContent: { paddingHorizontal: wp("4%"), paddingVertical: hp("1%"), gap: wp("2%") },
  tabButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: wp("3.5%"), paddingVertical: hp("0.6%"), borderRadius: 20, backgroundColor: COLORS.BG, borderWidth: 1, borderColor: COLORS.BORDER },
  tabButtonActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  tabButtonText: { fontSize: 12, fontWeight: "600", color: COLORS.TEXT_LIGHT },
  tabButtonTextActive: { color: "#FFFFFF", fontWeight: "700" },
  listContent: { paddingHorizontal: wp("4%"), paddingBottom: hp("3%"), paddingTop: hp("1%") },
  emptyListContent: { flex: 1, justifyContent: "center", paddingHorizontal: wp("5%") },
  cardWrapper: { marginBottom: hp("1%") },
  notificationCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.SURFACE, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, paddingRight: wp("3%"), paddingVertical: hp("1.4%") },
  notificationCardUnread: { shadowOpacity: 0.1, elevation: 4 },
  accentBar: { width: 4, alignSelf: "stretch", borderRadius: 2, marginRight: wp("3%") },
  iconContainer: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: wp("3%") },
  iconInner: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  contentWrapper: { flex: 1, marginRight: wp("1%") },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: hp("0.4%") },
  typeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  time: { fontSize: 11, color: COLORS.TEXT_LIGHT_GRAY, fontWeight: "500" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: hp("0.3%") },
  title: { fontSize: 13, fontWeight: "700", color: COLORS.TEXT_DARK, flex: 1, lineHeight: 19 },
  titleRead: { fontWeight: "500", color: COLORS.TEXT_MEDIUM },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.PRIMARY, marginLeft: 6, marginTop: 4 },
  description: { fontSize: 12, color: COLORS.TEXT_LIGHT, lineHeight: 17 },
  deleteBtn: { padding: 4 },
  emptyState: { alignItems: "center" },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.ORDER_BG, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.TEXT_DARK, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: COLORS.TEXT_LIGHT, textAlign: "center", lineHeight: 20 },
});

export default ShipperNotification;
