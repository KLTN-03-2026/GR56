import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import {
  createNotificationChannels,
  requestNotificationPermission,
  notify,
} from "../../utils/localNotification";
import {
  StoredNotification,
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../../utils/notificationStore";

// ════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════
const COLORS = {
  PRIMARY: "#EE4D2D",
  PRIMARY_DARK: "#D43E22",
  TEXT_DARK: "#1A1A2E",
  TEXT_MEDIUM: "#4A4A68",
  TEXT_LIGHT: "#7B7B9A",
  TEXT_LIGHT_GRAY: "#A8A8C0",

  ORDER_BG: "#FFF4F2",
  ORDER_ICON: "#EE4D2D",
  ORDER_ACCENT: "#EE4D2D",

  PROMO_BG: "#FFFBF0",
  PROMO_ICON: "#F59E0B",
  PROMO_ACCENT: "#F59E0B",

  SYSTEM_BG: "#F0F7FF",
  SYSTEM_ICON: "#3B82F6",
  SYSTEM_ACCENT: "#3B82F6",

  BORDER: "#F0F0F5",
  SURFACE: "#FFFFFF",
  BG: "#F7F8FA",
};

type NotificationItem = StoredNotification;

interface NotificationProps {
  navigation: any;
}

const TABS = [
  { key: "all", label: "Tất cả", icon: "apps" },
  { key: "order", label: "Đơn hàng", icon: "bag-handle" },
  { key: "chat", label: "Tin nhắn", icon: "chatbubbles" },
  { key: "promotion", label: "Khuyến mãi", icon: "gift" },
  { key: "system", label: "Hệ thống", icon: "settings" },
] as const;

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
const Notification: React.FC<NotificationProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "order" | "chat" | "promotion" | "system">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({});

  const fetchNotifications = useCallback(async () => {
    const list = await loadNotifications();
    setNotifications(list);
  }, []);

  // Khởi tạo channels và xin quyền khi vào trang
  useEffect(() => {
    createNotificationChannels();
    requestNotificationPermission();
  }, []);

  // Load lại mỗi khi focus vào tab
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleSendNotification = (item: NotificationItem) => {
    notify[item.type === "promotion" ? "promotion" : item.type === "system" ? "system" : "order"](
      item.title,
      item.description
    );
  };

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.type === activeTab);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  };

  const handleDeleteNotification = async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    handleMarkAsRead(notification.id);
    if (notification.type === "order") {
      navigation.navigate("MainTabs", { screen: "Orders", params: { orderId: notification.id } });
    } else if (notification.type === "promotion") {
      navigation.navigate("MyVouchers");
    } else if (notification.type === "chat") {
      // Điều hướng tới trang chat với shipper
      if (notification.id_don_hang) {
        navigation.navigate("ChatWithShipper", {
          id_don_hang: notification.id_don_hang,
          name: notification.sender_name || "Shipper",
          avatar: notification.sender_avatar,
          ma_don_hang: notification.ma_don_hang,
          dia_chi: notification.dia_chi,
        });
      }
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "order":
        return { bg: COLORS.ORDER_BG, icon: COLORS.ORDER_ICON, accent: COLORS.ORDER_ACCENT };
      case "promotion":
        return { bg: COLORS.PROMO_BG, icon: COLORS.PROMO_ICON, accent: COLORS.PROMO_ACCENT };
      case "chat":
        return { bg: "#F0F7FF", icon: "#8B5CF6", accent: "#8B5CF6" };
      case "system":
        return { bg: COLORS.SYSTEM_BG, icon: COLORS.SYSTEM_ICON, accent: COLORS.SYSTEM_ACCENT };
      default:
        return { bg: "#FFFFFF", icon: COLORS.PRIMARY, accent: COLORS.PRIMARY };
    }
  };

  // ── Render Tab ──────────────────────────────────────────
  const renderTab = (tab: typeof TABS[number]) => {
    const isActive = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.75}
      >
        <Ionicons
          name={tab.icon}
          size={14}
          color={isActive ? "#FFFFFF" : COLORS.TEXT_LIGHT}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Render Notification Card ────────────────────────────
  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    if (!scaleAnims.current[item.id]) {
      scaleAnims.current[item.id] = new Animated.Value(1);
    }

    const config = getTypeConfig(item.type);

    const handlePressIn = () => {
      Animated.spring(scaleAnims.current[item.id], {
        toValue: 0.975,
        useNativeDriver: true,
        speed: 20,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnims.current[item.id], {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
      }).start();
      handleNotificationPress(item);
    };

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          { transform: [{ scale: scaleAnims.current[item.id] }] },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.notificationCard,
            !item.isRead && styles.notificationCardUnread,
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {/* Left accent bar */}
          <View style={[styles.accentBar, { backgroundColor: config.accent }]} />

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            <View style={[styles.iconInner, { backgroundColor: config.icon }]}>
              <Ionicons name={item.icon} size={20} color="#FFFFFF" />
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentWrapper}>
            {/* Badge + time row */}
            <View style={styles.metaRow}>
              <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                <Text style={[styles.typeBadgeText, { color: config.accent }]}>
                  {item.badgeLabel}
                </Text>
              </View>
              <Text style={styles.time}>{item.time}</Text>
            </View>

            {/* Title */}
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, item.isRead && styles.titleRead]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>

            {/* Description */}
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.sendNotifBtn}
              onPress={() => handleSendNotification(item)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="notifications-outline" size={18} color={config.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteNotification(item.id)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.TEXT_LIGHT_GRAY} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ── Render Empty State ──────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="notifications-off-outline" size={52} color={COLORS.PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
      <Text style={styles.emptyDesc}>
        Bạn sẽ nhận được thông báo về đơn hàng, khuyến mãi và cập nhật mới nhất tại đây
      </Text>
    </View>
  );

  // ── Render Section Header ───────────────────────────────
  const renderSectionHeader = () => {
    const unreadInTab = filteredNotifications.filter((n) => !n.isRead).length;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>
          {filteredNotifications.length} thông báo
          {unreadInTab > 0 && (
            <Text style={styles.sectionHeaderUnread}> • {unreadInTab} chưa đọc</Text>
          )}
        </Text>
      </View>
    );
  };

  // ════════════════════════════════════════════════════════
  // Main Render
  // ════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerAction}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.SURFACE} />
        </TouchableOpacity>

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
          <Ionicons
            name="checkmark-done"
            size={22}
            color={unreadCount > 0 ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
          />
        </TouchableOpacity>
      </View>

      {/* ── Content Area ── */}
      <View style={styles.contentArea}>
        {/* ── Tabs ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map(renderTab)}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {filteredNotifications.length === 0 ? (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.emptyListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.PRIMARY}
              colors={[COLORS.PRIMARY]}
            />
          }
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderSectionHeader}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.PRIMARY}
              colors={[COLORS.PRIMARY]}
            />
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
};

// ════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
  },

  // ── Content & Header ──
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.BG,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.6%"),
  },

  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: wp("3%"),
    gap: 8,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  headerAction: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  // ── Tabs ──
  tabsWrapper: {
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  tabsContent: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1%"),
    gap: wp("2%"),
  },

  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.6%"),
    borderRadius: 20,
    backgroundColor: COLORS.BG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },

  tabButtonActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.TEXT_LIGHT,
  },

  tabButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // ── List ──
  listContainer: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: wp("4%"),
    paddingBottom: hp("3%"),
  },

  emptyListContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: wp("5%"),
  },

  // ── Section Header ──
  sectionHeader: {
    paddingVertical: hp("1.2%"),
  },

  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.TEXT_LIGHT,
    letterSpacing: 0.2,
  },

  sectionHeaderUnread: {
    color: COLORS.PRIMARY,
    fontWeight: "700",
  },

  // ── Card ──
  cardWrapper: {
    marginBottom: hp("1%"),
  },

  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    paddingRight: wp("3%"),
    paddingVertical: hp("1.4%"),
  },

  notificationCardUnread: {
    shadowOpacity: 0.1,
    elevation: 4,
  },

  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginLeft: 0,
    marginRight: wp("3%"),
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp("3%"),
    flexShrink: 0,
  },

  iconInner: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  contentWrapper: {
    flex: 1,
    marginRight: wp("1%"),
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("0.4%"),
  },

  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  time: {
    fontSize: 11,
    color: COLORS.TEXT_LIGHT_GRAY,
    fontWeight: "500",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: hp("0.3%"),
  },

  title: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_DARK,
    flex: 1,
    lineHeight: 19,
  },

  titleRead: {
    fontWeight: "500",
    color: COLORS.TEXT_MEDIUM,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    marginLeft: wp("1.5%"),
    marginTop: 5,
    flexShrink: 0,
  },

  description: {
    fontSize: 12,
    color: COLORS.TEXT_LIGHT,
    lineHeight: 17,
    fontWeight: "400",
  },

  deleteBtn: {
    padding: wp("1%"),
    marginLeft: wp("1%"),
    flexShrink: 0,
    alignSelf: "flex-start",
    marginTop: 2,
  },

  cardActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    marginLeft: wp("1%"),
    alignSelf: "flex-start",
    marginTop: 2,
  },

  sendNotifBtn: {
    padding: wp("1%"),
    flexShrink: 0,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: "center",
    paddingHorizontal: wp("8%"),
  },

  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF0ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("2.5%"),
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.TEXT_DARK,
    marginBottom: hp("1%"),
    textAlign: "center",
  },

  emptyDesc: {
    fontSize: 13,
    color: COLORS.TEXT_LIGHT_GRAY,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default Notification;