/**
 * FloatingChatBubble.tsx
 *
 * Bong bóng chat nổi kiểu Messenger / Zalo
 * — kéo thả tự do trên màn hình
 * — hiện badge tổng tin chưa đọc
 * — bấm mở drawer danh sách cuộc hội thoại
 * — bấm vào 1 cuộc hội thoại → navigate ChatWithCustomer
 *
 * Cách dùng trong màn hình Shipper:
 *   <FloatingChatBubble navigation={navigation} orders={activeOrders} />
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  FlatList,
  StatusBar,
} from "react-native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../genaral/api";
import { getImageUrl } from "../utils/imageHelper";

const { width: SW, height: SH } = Dimensions.get("window");
const BUBBLE_SIZE = wp("15%");
const EDGE_PADDING = 12;
const ACCENT = "#1A73E8";
const ACCENT_DARK = "#1558B0";

// ─── Types ────────────────────────────────────────────────

interface Order {
  id: number;
  ma_don_hang: string;
  ten_nguoi_nhan: string;
  avatar?: string | null;
  dia_chi_khach?: string;
  [key: string]: any;
}

interface Conversation {
  id_don_hang: number;
  ma_don_hang: string;
  name: string;
  avatar: string | null;
  dia_chi: string;
  lastMsg: string;
  lastTime: string;
  unread: number;
}

// ─── Format time ──────────────────────────────────────────

const fmtTime = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ`;
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

// ─── Conversation Item ─────────────────────────────────────

const ConvItem = ({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={ci.row}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Avatar */}
        <View style={ci.avatarWrap}>
          <Image
            source={{ uri: getImageUrl(item.avatar) }}
            style={ci.avatar}
            defaultSource={require("../assets/images/slide1.png")}
          />
          <View style={ci.onlineDot} />
        </View>

        {/* Info */}
        <View style={ci.info}>
          <View style={ci.topRow}>
            <View style={ci.nameRow}>
              <Text style={ci.name} numberOfLines={1}>{item.name}</Text>
              <View style={ci.orderChip}>
                <Ionicons name="receipt-outline" size={10} color={ACCENT} />
                <Text style={ci.orderChipText}>{item.ma_don_hang}</Text>
              </View>
            </View>
            <Text style={ci.time}>{item.lastTime}</Text>
          </View>
          <View style={ci.bottomRow}>
            <Text
              style={[ci.lastMsg, item.unread > 0 && ci.lastMsgBold]}
              numberOfLines={1}
            >
              {item.lastMsg || "Chưa có tin nhắn"}
            </Text>
            {item.unread > 0 && (
              <View style={ci.badge}>
                <Text style={ci.badgeText}>
                  {item.unread > 9 ? "9+" : item.unread}
                </Text>
              </View>
            )}
          </View>
          <Text style={ci.address} numberOfLines={1}>
            <Ionicons name="location-outline" size={10} color="#94A3B8" /> {item.dia_chi}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ci = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.2%"),
    gap: wp("3%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFF",
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("6%"),
    backgroundColor: "#C8DEFF",
    borderWidth: 2,
    borderColor: "#EBF4FF",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: wp("2.8%"),
    height: wp("2.8%"),
    borderRadius: wp("1.4%"),
    backgroundColor: "#4ADE80",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  info: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8, gap: 6 },
  name: { fontSize: wp("3.8%"), fontWeight: "700", color: "#0F172A", flexShrink: 1 },
  orderChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF4FF",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
    flexShrink: 0,
  },
  orderChipText: { fontSize: wp("2.6%"), color: ACCENT, fontWeight: "600" },
  time: { fontSize: wp("2.8%"), color: "#94A3B8" },
  bottomRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 6 },
  lastMsg: { flex: 1, fontSize: wp("3.2%"), color: "#64748B" },
  lastMsgBold: { color: "#0F172A", fontWeight: "600" },
  badge: {
    backgroundColor: ACCENT,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, color: "#FFF", fontWeight: "700" },
  address: { fontSize: wp("2.8%"), color: "#94A3B8", marginTop: 2 },
});

// ─── Main Component ───────────────────────────────────────

interface Props {
  navigation: any;
  orders?: Order[];  // Danh sách đơn shipper đang giao (để list conversations)
}

const FloatingChatBubble = ({ navigation, orders = [] }: Props) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animation values ──────────────────────────────────
  const pan = useRef(new Animated.ValueXY({ x: SW - BUBBLE_SIZE - EDGE_PADDING, y: SH * 0.55 })).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const drawerY = useRef(new Animated.Value(SH)).current;
  const drawerOpacity = useRef(new Animated.Value(0)).current;

  // ── Pulse animation khi có tin chưa đọc ──────────────
  useEffect(() => {
    if (totalUnread > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [totalUnread]);

  // ── PanResponder — kéo thả bubble ────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,

      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(bubbleScale, { toValue: 0.9, useNativeDriver: false, tension: 200 }).start();
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        Animated.spring(bubbleScale, { toValue: 1, useNativeDriver: false, tension: 120 }).start();

        // Snap về cạnh gần nhất
        const currentX = (pan.x as any)._value;
        const snapX = currentX < SW / 2
          ? EDGE_PADDING
          : SW - BUBBLE_SIZE - EDGE_PADDING;

        // Clamp Y trong màn hình
        const currentY = (pan.y as any)._value;
        const clampedY = Math.max(
          EDGE_PADDING + 60,
          Math.min(currentY, SH - BUBBLE_SIZE - 100)
        );

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          useNativeDriver: false,
          tension: 60,
          friction: 7,
        }).start();

        // Nếu chưa drag nhiều → mở drawer
        if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
          openDrawer();
        }
      },
    })
  ).current;

  // ── Mở/đóng drawer ───────────────────────────────────
  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.timing(drawerOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerY, { toValue: SH, duration: 300, useNativeDriver: true }),
      Animated.timing(drawerOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  // ── Fetch conversations ───────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (orders.length === 0) return;

    try {
      // Gọi song song API chat cho từng đơn đang giao
      const results = await Promise.allSettled(
        orders.map((o) =>
          apiClient
            .get(`/shipper/chat/${o.id}/tin-nhan`)
            .then((res) => ({ order: o, data: res.data }))
        )
      );

      const convs: Conversation[] = [];
      let totalU = 0;

      results.forEach((r) => {
        if (r.status !== "fulfilled") return;
        const { order, data } = r.value;
        if (!data?.status) return;

        const msgs: any[] = data.data ?? [];
        if (msgs.length === 0) return; // Chưa có tin nhắn → không hiển thị

        const loaiToi: string = data.loai_toi ?? "shipper";

        const lastMsg = msgs[msgs.length - 1];
        const unread = msgs.filter(
          (m) => m.loai_nguoi_gui !== loaiToi && !m.da_doc
        ).length;
        totalU += unread;

        convs.push({
          id_don_hang: order.id,
          ma_don_hang: order.ma_don_hang,
          name: order.ten_nguoi_nhan,
          avatar: order.avatar ?? null,
          dia_chi: order.dia_chi_khach ?? "",
          lastMsg: lastMsg?.noi_dung ?? "",
          lastTime: lastMsg ? fmtTime(lastMsg.created_at) : "",
          unread,
        });
      });

      // Sort: unread trước, sau đó theo lastTime
      convs.sort((a, b) => b.unread - a.unread);
      setConversations(convs);
      setTotalUnread(totalU);
    } catch {
      // fallback: build từ orders không cần chat data
      const fallback: Conversation[] = orders.map((o) => ({
        id_don_hang: o.id,
        ma_don_hang: o.ma_don_hang,
        name: o.ten_nguoi_nhan,
        avatar: o.avatar ?? null,
        dia_chi: o.dia_chi_khach ?? "",
        lastMsg: "",
        lastTime: "",
        unread: 0,
      }));
      setConversations(fallback);
    }
  }, [orders]);

  useEffect(() => {
    fetchConversations();
    pollingRef.current = setInterval(fetchConversations, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchConversations]);

  // ── Navigate to chat ──────────────────────────────────
  const openChat = (conv: Conversation) => {
    closeDrawer();
    setTimeout(() => {
      navigation.navigate("ChatWithCustomer", {
        id_don_hang: conv.id_don_hang,
        name: conv.name,
        avatar: conv.avatar,
        ma_don_hang: conv.ma_don_hang,
        dia_chi: conv.dia_chi,
      });
    }, 300);
  };

  // Không hiện nếu không có đơn đang giao
  if (orders.length === 0) return null;

  return (
    <>
      {/* ── Pulse ring (tách riêng để tránh driver conflict) ── */}
      {totalUnread > 0 && (
        <Animated.View
          style={[
            s.pulseRing,
            { transform: [...pan.getTranslateTransform(), { scale: pulseAnim }] },
          ]}
          pointerEvents="none"
        />
      )}

      {/* ── Floating Bubble ── */}
      <Animated.View
        style={[
          s.bubbleContainer,
          { transform: [...pan.getTranslateTransform(), { scale: bubbleScale }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Bubble chính */}
        <View style={s.bubble}>
          <Ionicons name="chatbubbles" size={26} color="#FFF" />
        </View>

        {/* Badge số tin chưa đọc */}
        {totalUnread > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadText}>
              {totalUnread > 99 ? "99+" : totalUnread}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* ── Drawer Modal ── */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDrawer}
      >
        <Animated.View style={[s.backdrop, { opacity: drawerOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>

        <Animated.View
          style={[s.drawer, { transform: [{ translateY: drawerY }] }]}
        >
          {/* Handle bar */}
          <View style={s.drawerHandle} />

          {/* Header */}
          <View style={s.drawerHeader}>
            <View style={s.drawerHeaderLeft}>
              <View style={s.drawerIconWrap}>
                <Ionicons name="chatbubbles" size={20} color="#FFF" />
              </View>
              <View>
                <Text style={s.drawerTitle}>Tin nhắn khách hàng</Text>
                <Text style={s.drawerSub}>
                  {conversations.length} cuộc hội thoại
                  {totalUnread > 0 ? ` · ${totalUnread} chưa đọc` : ""}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={s.drawerClose} onPress={closeDrawer}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* List */}
          {conversations.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#CBD5E1" />
              <Text style={s.emptyText}>Chưa có tin nhắn nào</Text>
              <Text style={s.emptyHint}>Khi đang giao đơn, khách hàng có thể nhắn tin cho bạn tại đây</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => String(item.id_don_hang)}
              renderItem={({ item }) => (
                <ConvItem item={item} onPress={() => openChat(item)} />
              )}
              showsVerticalScrollIndicator={false}
              bounces={false}
            />
          )}
        </Animated.View>
      </Modal>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────

const s = StyleSheet.create({
  // Bubble
  bubbleContainer: {
    position: "absolute",
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    zIndex: 9999,
  },
  pulseRing: {
    position: "absolute",
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: ACCENT,
    opacity: 0.3,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    shadowColor: ACCENT_DARK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFF",
    elevation: 14,
  },
  unreadText: { fontSize: 10, color: "#FFF", fontWeight: "800" },

  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  // Drawer
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SH * 0.65,
    maxHeight: SH * 0.98,
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    overflow: "hidden",
  },
  drawerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  drawerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  drawerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTitle: {
    fontSize: wp("4%"),
    fontWeight: "800",
    color: "#0F172A",
  },
  drawerSub: {
    fontSize: wp("3%"),
    color: "#64748B",
    marginTop: 1,
  },
  drawerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingVertical: hp("5%"),
    paddingHorizontal: wp("8%"),
    gap: 8,
  },
  emptyText: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 8,
  },
  emptyHint: {
    fontSize: wp("3.2%"),
    color: "#CBD5E1",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default FloatingChatBubble;
