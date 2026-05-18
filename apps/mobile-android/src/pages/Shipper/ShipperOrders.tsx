import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  StatusBar,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import InlineDeliveryMap from "../../components/InlineDeliveryMap";
import DeliveryMapModal from "../../components/DeliveryMapModal";
import FloatingChatBubble from "../../components/FloatingChatBubble";
import { connectEcho } from "../../config/echo";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../../genaral/api";

// ════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════
const PRIMARY = "#EE4D2D";
const PRIMARY_DARK = "#C62828";
const BG = "#F5F6F8";
const SURFACE = "#FFFFFF";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";
const TEXT_LIGHT = "#94A3B8";
const BORDER = "#E2E8F0";

// ── Status config (theo tinh_trang từ server) ───────────
const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string; icon: string }> = {
  0: { label: "Chờ nhận", color: "#F59E0B", bg: "#FFFBEB", icon: "time-outline" },
  1: { label: "Đã nhận", color: "#3B82F6", bg: "#EFF6FF", icon: "bag-check-outline" },
  2: { label: "Quán đang làm", color: "#F97316", bg: "#FFF7ED", icon: "restaurant-outline" },
  3: { label: "Đang giao", color: "#8B5CF6", bg: "#F5F3FF", icon: "bicycle-outline" },
  4: { label: "Đã giao", color: "#10B981", bg: "#ECFDF5", icon: "checkmark-circle-outline" },
  5: { label: "Đã hủy", color: "#EF4444", bg: "#FEF2F2", icon: "close-circle-outline" },
};

// ── Tabs ────────────────────────────────────────────────
const TABS = [
  { key: "nhan_don", label: "Nhận đơn", icon: "time" },
  { key: "dang_giao", label: "Đang giao", icon: "bicycle" },
  { key: "lich_su", label: "Lịch sử", icon: "checkmark-circle" },
  { key: "da_huy", label: "Đơn huỷ", icon: "close-circle" },
] as const;

// ── Types ────────────────────────────────────────────────
interface OrderItem {
  ten_mon_an: string;
  so_luong: number;
  don_gia: number;
}

interface Order {
  id: number;
  ma_don_hang: string;
  tinh_trang: number;       // 0=chờ nhận, 1=đã nhận, 2=đang giao, 3=đã giao,
  activeTab: "nhan_don" | "dang_giao" | "lich_su" | "da_huy";
  is_thanh_toan: number;
  phuong_thuc_thanh_toan: number; // 1=tiền mặt, 2=chuyển khoản
  ten_quan_an: string;
  hinh_anh: string | null;
  dia_chi_quan: string;
  ten_nguoi_nhan: string;
  sdt_nguoi_nhan?: string;
  so_dien_thoai?: string; // Tên field từ BE (don_hangs.*)
  avatar: string | null;
  dia_chi_khach: string;
  ten_quan_huyen: string;
  ten_tinh_thanh: string;
  // Tọa độ quán ăn (từ chi-tiet-mon-an API)
  restaurant_lat?: number | null;
  restaurant_lng?: number | null;
  // Tọa độ khách hàng (từ chi-tiet-mon-an API)
  customer_lat?: number | null;
  customer_lng?: number | null;
  tong_tien: number;
  phi_ship: number;
  tien_hang?: number;
  gio_tao_don?: string;
  created_at: string;
  items?: OrderItem[];
  // Thời gian chờ nhận đơn (từ DispatchCandidateEvent, mặc định 60s)
  expires_in?: number;
  // Thời điểm đơn đến tay shipper (ms timestamp) — dùng để tính đúng remaining khi mở detail
  arrivedAt?: number;
}

// ════════════════════════════════════════════════════════
// Custom Confirm Modal
// ════════════════════════════════════════════════════════
interface ModalConfig {
  visible: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  infoOnly?: boolean;
}

const MODAL_HIDDEN: ModalConfig = {
  visible: false,
  icon: "",
  iconColor: "",
  iconBg: "",
  title: "",
  message: "",
  confirmLabel: "",
  confirmColor: "",
  onConfirm: () => { },
};

const CustomModal = ({ config, onDismiss }: { config: ModalConfig; onDismiss: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [config.visible]);

  return (
    <Modal
      transparent
      visible={config.visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View style={[mStyles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View style={[mStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Icon */}
          <View style={[mStyles.iconWrap, { backgroundColor: config.iconBg }]}>
            <Ionicons name={config.icon as any} size={36} color={config.iconColor} />
          </View>

          {/* Text */}
          <Text style={mStyles.title}>{config.title}</Text>
          <Text style={mStyles.message}>{config.message}</Text>

          {/* Buttons */}
          {config.infoOnly ? (
            <TouchableOpacity
              style={[mStyles.btn, { flex: 0, width: "100%", backgroundColor: config.confirmColor }]}
              onPress={() => { config.onConfirm(); onDismiss(); }}
              activeOpacity={0.85}
            >
              <Text style={mStyles.btnText}>{config.confirmLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View style={mStyles.btnRow}>
              <TouchableOpacity
                style={[mStyles.btn, mStyles.btnCancel]}
                onPress={() => { config.onCancel?.(); onDismiss(); }}
                activeOpacity={0.8}
              >
                <Text style={mStyles.btnCancelText}>{config.cancelLabel ?? "Huỷ"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mStyles.btn, { backgroundColor: config.confirmColor }]}
                onPress={() => { config.onConfirm(); onDismiss(); }}
                activeOpacity={0.85}
              >
                <Text style={mStyles.btnText}>{config.confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const mStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("8%"),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: wp("6%"),
    paddingVertical: hp("3%"),
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("2%"),
  },
  title: {
    fontSize: wp("4.8%"),
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: hp("1%"),
    letterSpacing: 0.2,
  },
  message: {
    fontSize: wp("3.5%"),
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: hp("2.5%"),
  },
  btnRow: {
    flexDirection: "row",
    gap: wp("3%"),
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: hp("1.6%"),
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: "#F1F5F9",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: wp("3.8%"),
    fontWeight: "700",
  },
  btnCancelText: {
    color: "#64748B",
    fontSize: wp("3.8%"),
    fontWeight: "600",
  },
});

// ════════════════════════════════════════════════════════
// Countdown Timer Component (dynamic seconds from event)
// ════════════════════════════════════════════════════════

const CountdownTimer = ({ expiresIn = 60, arrivedAt, onExpire }: { expiresIn?: number; arrivedAt?: number; onExpire: () => void }) => {
  // Tính remaining đúng dựa vào thời điểm đơn đến — tránh reset khi mở/đóng panel
  const calcRemaining = () => {
    if (arrivedAt) {
      const elapsed = (Date.now() - arrivedAt) / 1000;
      return Math.max(0, Math.round(expiresIn - elapsed));
    }
    return expiresIn;
  };
  const [secondsLeft, setSecondsLeft] = useState(calcRemaining);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const expiredRef = useRef(false);

  // Chạy thanh progress animation dựa theo remaining thực
  useEffect(() => {
    const remaining = calcRemaining();
    const ratio = expiresIn > 0 ? remaining / expiresIn : 0;
    progressAnim.setValue(ratio);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: remaining * 1000,
      useNativeDriver: false,
    }).start();
  }, [arrivedAt, expiresIn]);

  // Đếm ngược mỗi giây
  useEffect(() => {
    const initial = calcRemaining();
    setSecondsLeft(initial);
    expiredRef.current = false;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          if (!expiredRef.current) {
            expiredRef.current = true;
            // Không gọi onExpire ở đây nữa vì parent đã tự cascade
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [arrivedAt, expiresIn]);

  // Pulse khi còn < 60s
  useEffect(() => {
    if (secondsLeft === 60) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [secondsLeft === 60]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft <= 60;
  const timerColor = isUrgent ? "#EF4444" : "#F59E0B";

  return (
    <Animated.View style={[styles.countdownWrap, { transform: [{ scale: pulseAnim }] }]}>
      {/* Label + time */}
      <View style={styles.countdownTop}>
        <Ionicons name="timer-outline" size={15} color={timerColor} />
        <Text style={[styles.countdownLabel, { color: timerColor }]}>
          {isUrgent ? "⚠️ Sắp hết thời gian!" : "Thời gian xác nhận"}
        </Text>
        <Text style={[styles.countdownValue, { color: timerColor }]}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.countdownTrack}>
        <Animated.View
          style={[
            styles.countdownFill,
            {
              backgroundColor: timerColor,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <Text style={styles.countdownHint}>
        Không xác nhận trong {mins > 0 ? `${mins} phút ${secs}s` : `${secs}s`} → chuyển shipper khác
      </Text>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════
// Order Detail Modal-like Card
// ════════════════════════════════════════════════════════
const OrderDetailPanel = ({
  order,
  onClose,
  onAcceptOrder,
  onDeclineOrder,
  onCompleteDelivery,
  onChat,
}: {
  order: Order;
  onClose: () => void;
  onAcceptOrder: (id: number) => void;
  onDeclineOrder: (id: number) => void;
  onCompleteDelivery: (id: number) => void;
  onChat?: () => void;
}) => {
  const cfg = STATUS_CONFIG[order.tinh_trang] ?? STATUS_CONFIG[0];
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [localItems, setLocalItems] = useState<OrderItem[]>(order.items ?? []);
  const [fullOrder, setFullOrder] = useState<Order>(order);
  const [showMap, setShowMap] = useState(false);
  const [showMapToRestaurant, setShowMapToRestaurant] = useState(false);
  const [shipperCoord, setShipperCoord] = useState<[number, number] | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 4,
    }).start();
    // Fetch items
    apiClient.post("/shipper/don-hang/chi-tiet-mon-an", { id: order.id })
      .then((res) => {
        const items = res.data?.data ?? [];
        if (items.length > 0) setLocalItems(items);

        // Cập nhật thông tin đơn hàng đầy đủ (bao gồm so_dien_thoai từ BE)
        if (res.data?.don_hang) {
          setFullOrder(prev => ({ ...prev, ...res.data.don_hang }));
        }
      })
      .catch(() => { });
  }, []);

  // Tracking GPS shipper real-time khi tinh_trang >= 1 (shipper đã nhận đơn)
  React.useEffect(() => {
    if (!fullOrder.id || fullOrder.tinh_trang < 1) {
      setShipperCoord(null);
      return;
    }
    let echoInstance: any = null;

    const fetchTracking = async () => {
      try {
        const res = await apiClient.post("/shipper/don-hang/theo-doi", { id: fullOrder.id });
        if (res.data?.status && res.data?.order) {
          const { shipper_lat, shipper_lng } = res.data.order;
          if (shipper_lat && shipper_lng) {
            setShipperCoord([parseFloat(shipper_lng), parseFloat(shipper_lat)]);
          }
        }
      } catch (_) { }
    };
    fetchTracking();

    connectEcho().then((echo: any) => {
      echoInstance = echo;
      echo.private(`order.${fullOrder.id}`)
        .listen(".shipper.location.updated", (data: any) => {
          if (data?.lat && data?.lng) {
            setShipperCoord([parseFloat(data.lng), parseFloat(data.lat)]);
          }
        });
    }).catch(() => { });

    return () => {
      if (echoInstance) echoInstance.leave(`order.${fullOrder.id}`);
    };
  }, [fullOrder.id, fullOrder.tinh_trang]);

  const formatMoney = (v: number) => v.toLocaleString("vi-VN") + "đ";
  const deliveryAddr = [order.dia_chi_khach, order.ten_quan_huyen, order.ten_tinh_thanh]
    .filter(Boolean).join(", ");
  const payLabel = order.phuong_thuc_thanh_toan === 1 ? "💵 Tiền mặt" : "💳 Chuyển khoản";

  return (
    <Animated.View style={[styles.detailPanel, { transform: [{ translateY: slideAnim }] }]}>
      {/* Panel Header */}
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.detailTitle}>#{order.ma_don_hang}</Text>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Restaurant → Customer */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Hành trình giao</Text>
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: "#F59E0B" }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Lấy hàng tại quán</Text>
              <Text style={styles.addressText}>{order.ten_quan_an}</Text>
              <Text style={[styles.addressText, { fontSize: wp("3%"), color: TEXT_MUTED }]}>
                {order.dia_chi_quan}
              </Text>
            </View>
          </View>
          <View style={styles.addressDotLine} />
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: PRIMARY }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Giao đến</Text>
              <Text style={styles.addressText}>{order.ten_nguoi_nhan}</Text>
              <Text style={[styles.addressText, { fontSize: wp("3%"), color: TEXT_MUTED }]}>
                {deliveryAddr}
              </Text>
            </View>
          </View>
        </View>

        {/* Recipient Detail */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Chi tiết người nhận</Text>
          <View style={styles.recipientCard}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientAvatarText}>
                {order.ten_nguoi_nhan?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{fullOrder.ten_nguoi_nhan}</Text>
              {(fullOrder.so_dien_thoai || fullOrder.sdt_nguoi_nhan) ? (
                <View style={styles.recipientPhoneRow}>
                  {/* @ts-ignore */}
                  <Ionicons name="call-outline" size={14} color={PRIMARY} />
                  <Text style={styles.recipientPhone}>{fullOrder.so_dien_thoai || fullOrder.sdt_nguoi_nhan}</Text>
                  {/* Nút copy */}
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString((fullOrder.so_dien_thoai || fullOrder.sdt_nguoi_nhan)!);
                      Alert.alert('', 'Đã sao chép số điện thoại!');
                    }}
                    style={{ marginLeft: 8, padding: 4, backgroundColor: '#FFF0ED', borderRadius: 6 }}
                  >
                    {/* @ts-ignore */}
                    <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                  </TouchableOpacity>
                  {/* Nút gọi */}
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${fullOrder.so_dien_thoai || fullOrder.sdt_nguoi_nhan}`)}
                    style={{ marginLeft: 4, padding: 4, backgroundColor: '#ECFDF5', borderRadius: 6 }}
                  >
                    {/* @ts-ignore */}
                    <Ionicons name="call" size={13} color="#10B981" />
                  </TouchableOpacity>
                  {/* Nút chat */}
                  {onChat && order.activeTab === "dang_giao" && (
                    <TouchableOpacity
                      onPress={onChat}
                      style={{ marginLeft: 4, padding: 4, backgroundColor: '#EFF6FF', borderRadius: 6 }}
                    >
                      {/* @ts-ignore */}
                      <Ionicons name="chatbubble-ellipses" size={13} color="#3B82F6" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.recipientAddressBox}>
            {/* @ts-ignore */}
            <Ionicons name="location-outline" size={16} color={PRIMARY} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientAddressLabel}>Địa chỉ giao hàng</Text>
              <Text style={styles.recipientAddressText}>{deliveryAddr}</Text>
            </View>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Thanh toán</Text>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Tổng đơn hàng</Text>
            <Text style={styles.payValue}>{formatMoney(order.tong_tien)}</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Phí ship</Text>
            <Text style={styles.payValue}>{formatMoney(order.phi_ship)}</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Hình thức</Text>
            <Text style={styles.payValue}>{payLabel}</Text>
          </View>
          <View style={[styles.payRow, styles.payRowEarning]}>
            <Text style={styles.earningLabel}>Thu nhập của bạn</Text>
            <Text style={styles.earningValue}>{formatMoney(order.phi_ship)}</Text>
          </View>
        </View>

        {/* Items */}
        {localItems.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Món ăn</Text>
            {localItems.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemQtyBadge}>
                  <Text style={styles.itemQtyText}>{item.so_luong}x</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>{item.ten_mon_an}</Text>
                <Text style={styles.itemPrice}>
                  {(item.don_gia * item.so_luong).toLocaleString("vi-VN")}đ
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Time */}
        <View style={[styles.detailSection, { borderBottomWidth: 0, paddingBottom: hp("1%") }]}>
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={14} color={TEXT_MUTED} />
            <Text style={styles.timeChipText}>
              {order.gio_tao_don
                ? `Đặt lúc ${order.gio_tao_don}`
                : `Đặt: ${new Date(order.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
              }
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Nút hành động cố định dưới panel ── */}
      {order.activeTab === "nhan_don" && (
        <View style={[styles.detailActions, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          <CountdownTimer
            expiresIn={order.expires_in ?? 60}
            arrivedAt={order.arrivedAt}
            onExpire={() => { /* cascade handled by parent global effect */ }}
          />
          <View style={{ flexDirection: "row", gap: wp("2%"), marginTop: hp("1%") }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#F1F5F9", flex: 1 }]}
              onPress={() => onDeclineOrder(order.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={20} color={TEXT_MUTED} />
              <Text style={[styles.actionBtnText, { color: TEXT_MUTED }]}>Từ chối</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: PRIMARY, flex: 2 }]}
              onPress={() => onAcceptOrder(order.id)}
              activeOpacity={0.85}
            >
              <Ionicons name="bag-check-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Nhận đơn này</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {order.activeTab === "dang_giao" && (
        <View style={[styles.detailActions, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          {/* Nút xem bản đồ trong app */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#3B82F6", marginBottom: 10 }]}
            onPress={() => setShowMap(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Xem bản đồ giao hàng</Text>
          </TouchableOpacity>

          {/* tinh_trang 1,2,3: nút chỉ đường đến quán ăn */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#F97316", marginBottom: 10 }]}
            onPress={() => setShowMapToRestaurant(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Chỉ đường đến quán ăn</Text>
          </TouchableOpacity>

          {/* tinh_trang 1: Đã nhận — đi lấy hàng tại quán */}
          {order.tinh_trang === 1 && (
            <View style={[styles.actionBtn, { backgroundColor: "#F1F5F9" }]}>
              <Ionicons name="bag-check-outline" size={20} color={TEXT_MUTED} />
              <Text style={[styles.actionBtnText, { color: TEXT_MUTED }]}>
                Đang đến lấy hàng tại quán...
              </Text>
            </View>
          )}
          {/* tinh_trang 2: Quán đang làm — chờ tại quán */}
          {order.tinh_trang === 2 && (
            <View style={[styles.actionBtn, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="restaurant-outline" size={20} color="#F97316" />
              <Text style={[styles.actionBtnText, { color: "#F97316" }]}>
                Quán đang chuẩn bị món...
              </Text>
            </View>
          )}
          {/* tinh_trang 3: Đang giao — nhấn hoàn thành khi đã giao xong */}
          {order.tinh_trang === 3 && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
              onPress={() => onCompleteDelivery(order.id)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Hoàn thành giao hàng</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Map Modal - đến khách hàng */}
      <DeliveryMapModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        mode="shipper_delivery"
        destAddress={deliveryAddr}
        destName={order.ten_nguoi_nhan}
        destCoord={
          fullOrder.customer_lat && fullOrder.customer_lng
            ? [fullOrder.customer_lng, fullOrder.customer_lat]
            : null
        }
        restaurantCoord={
          fullOrder.restaurant_lat && fullOrder.restaurant_lng
            ? [fullOrder.restaurant_lng, fullOrder.restaurant_lat]
            : null
        }
        shipperCoord={shipperCoord}
      />

      {/* Map Modal - đến quán ăn */}
      <DeliveryMapModal
        visible={showMapToRestaurant}
        onClose={() => setShowMapToRestaurant(false)}
        mode="shipper_delivery"
        destAddress={order.dia_chi_quan}
        destName={order.ten_quan_an}
        destCoord={
          fullOrder.restaurant_lat && fullOrder.restaurant_lng
            ? [fullOrder.restaurant_lng, fullOrder.restaurant_lat]
            : null
        }
        shipperCoord={shipperCoord}
      />
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
const ShipperOrders = ({ navigation, route }: any) => {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>("nhan_don");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [todayEarning, setTodayEarning] = useState(0);
  const [todayDelivered, setTodayDelivered] = useState(0);
  const [modalCfg, setModalCfg] = useState<ModalConfig>(MODAL_HIDDEN);
  const dismissModal = () => setModalCfg(MODAL_HIDDEN);
  // ── Online / Offline toggle ──
  const [isOpen, setIsOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const toggleAnim = useRef(new Animated.Value(0)).current;

  // Load is_open từ userData
  useEffect(() => {
    AsyncStorage.getItem("userData").then((str) => {
      if (!str) return;
      const d = JSON.parse(str);
      const val = d.is_open === true || d.is_open === 1;
      setIsOpen(val);
      Animated.timing(toggleAnim, { toValue: val ? 1 : 0, duration: 0, useNativeDriver: false }).start();
    }).catch(() => { });
  }, []);

  const handleToggleOnline = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await apiClient.post("/shipper/toggle-status", {});
      if (res.data?.status === 1) {
        const newVal = res.data.is_open === true || res.data.is_open === 1;
        setIsOpen(newVal);
        Animated.spring(toggleAnim, { toValue: newVal ? 1 : 0, useNativeDriver: false, speed: 20, bounciness: 4 }).start();
        // Sync AsyncStorage
        const str = await AsyncStorage.getItem("userData");
        if (str) {
          const d = JSON.parse(str);
          await AsyncStorage.setItem("userData", JSON.stringify({ ...d, is_open: newVal }));
        }
      } else {
        Alert.alert("Không thể thay đổi", res.data?.message ?? "Vui lòng thử lại.");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
      // Xoá param để tránh trigger lại nếu tab đổi
      navigation.setParams({ initialTab: undefined });
    }
  }, [route?.params?.initialTab, navigation]);

  // ── Chụp ảnh xác nhận giao hàng ──
  const [photoModal, setPhotoModal] = useState<{ visible: boolean; orderId: number | null }>({
    visible: false, orderId: null,
  });
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);

  const filteredOrders =
    activeTab === "nhan_don" ? availableOrders :
      activeTab === "dang_giao" ? activeOrders :
        activeTab === "da_huy" ? cancelledOrders :
          historyOrders;

  const countByTab = (key: string) =>
    key === "nhan_don" ? availableOrders.length :
      key === "dang_giao" ? activeOrders.length :
        key === "da_huy" ? cancelledOrders.length :
          historyOrders.length;

  // Helper: địa chỉ đầy đủ
  const fullAddress = (o: any) =>
    [o.dia_chi_khach, o.ten_quan_huyen, o.ten_tinh_thanh]
      .filter(Boolean)
      .join(", ");

  useEffect(() => {
    const earned = historyOrders
      .filter((o) => o.tinh_trang === 4)
      .reduce((sum, o) => sum + (o.phi_ship ?? 0), 0);
    setTodayEarning(earned);
    setTodayDelivered(historyOrders.filter((o) => o.tinh_trang === 4).length);
  }, [historyOrders]);

  const fetchOrders = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        // API mới LEFT JOIN - đơn chatbot không bị drop
        apiClient.get("/shipper/don-hang/cho-nhan"),
        apiClient.get("/shipper/don-hang/dang-giao-chi-tiet"),
      ]);

      // Tab Nhận đơn — tinh_trang=0, chưa có shipper
      if (r1.data?.list_don_hang_co_the_nhan) {
        const now = Date.now();
        setAvailableOrders((prev) => {
          const prevMap: Record<number, Order> = {};
          prev.forEach(o => { prevMap[o.id] = o; });
          return r1.data.list_don_hang_co_the_nhan.map((o: any): Order => ({
            ...o,
            tinh_trang: 0,
            activeTab: "nhan_don",
            // Giữ arrivedAt cũ nếu đã có (tránh reset timer khi polling)
            arrivedAt: prevMap[o.id]?.arrivedAt ?? now,
          }));
        });
      }

      // Tab Đang giao — tinh_trang 1, 2, 3
      if (r2.data?.data) {
        setActiveOrders(
          r2.data.data.map((o: any): Order => ({
            ...o,
            activeTab: "dang_giao",
          }))
        );
      }

      // Tab Lịch sử — tinh_trang 4
      if (r2.data?.list_don_hang_hoan_thanh) {
        setHistoryOrders(
          r2.data.list_don_hang_hoan_thanh.map((o: any): Order => ({
            ...o,
            activeTab: "lich_su",
          }))
        );
      }

      // Tab Đơn huỷ — tinh_trang 5
      if (r2.data?.list_don_hang_da_huy) {
        setCancelledOrders(
          r2.data.list_don_hang_da_huy.map((o: any): Order => ({
            ...o,
            activeTab: "da_huy",
          }))
        );
      }
    } catch {
      // giữ state rỗng, user có thể kéo xuống refresh
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Real-time: Echo listener cho đơn broadcast từ Dispatcher ──
  useEffect(() => {
    let isMounted = true;
    let channelRef: any = null;

    const setupEcho = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("userData");
        if (!userDataStr || !isMounted) return;
        const userData = JSON.parse(userDataStr);
        const shipperId = userData.id;
        if (!shipperId) return;

        const echo = await connectEcho();
        if (!isMounted) return;

        // Channel riêng cho shipper — nhận broadcast đơn từ DispatcherService
        channelRef = echo.private(`shipper.${shipperId}`);

        channelRef.listen(".dispatch.candidate", (data: any) => {
          if (!isMounted) return;
          const order = data.order || data;
          if (!order?.id) return;

          // Thêm vào danh sách nhận đơn nếu chưa có (dùng expires_in từ BE)
          const expiresIn = order.expires_in ?? data.expires_in ?? 60;
          setAvailableOrders((prev) => {
            if (prev.some((o) => o.id === order.id)) return prev;
            return [
              {
                ...order,
                tinh_trang: 0,
                activeTab: "nhan_don",
                expires_in: expiresIn,
                arrivedAt: Date.now(), // ghi nhận thời điểm đơn đến
              },
              ...prev,
            ];
          });

          // Thông báo cho shipper
          DeviceEventEmitter.emit("DISPATCH_NEW_ORDER", {
            order_id: order.id,
            ma_don_hang: order.ma_don_hang,
            phi_ship: order.phi_ship,
          });
        });

        // Khi có shipper khác nhận đơn (broadcast huỷ) → xoá đơn + đóng panel
        channelRef.listen(".dispatch.cancelled", (data: any) => {
          if (!isMounted) return;
          const orderId = Number(data?.order_id || data?.id);
          if (!orderId) return;
          setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
          setSelectedOrder((prev) => (prev?.id === orderId ? null : prev));
        });

        // Đơn bị hủy (admin hủy hoặc auto_cancel)
        channelRef.listen(".don-hang.da-huy", (data: any) => {
          if (!isMounted) return;
          const id = Number(data?.id || data?.order_id);
          if (!id) return;
          // Xóa khỏi active orders (đang giao)
          setActiveOrders((prev) => prev.filter((o) => o.id !== id));
          // Chuyển vào cancelled orders
          const cancelled = data;
          setCancelledOrders((prev) => {
            if (prev.some((o) => o.id === id)) return prev;
            return [{ ...cancelled, tinh_trang: 5, activeTab: "da_huy" }, ...prev];
          });
        });

        // Đơn hoàn thành — chuyển từ active → lịch sử
        channelRef.listen(".don-hang.hoan-thanh", (data: any) => {
          if (!isMounted) return;
          const id = Number(data?.id || data?.order_id);
          if (!id) return;
          setActiveOrders((prev) => {
            const completed = prev.find((o) => o.id === id);
            if (completed) {
              setHistoryOrders((h) => {
                if (h.some((x) => x.id === id)) return h;
                return [{ ...completed, tinh_trang: 4, activeTab: "lich_su" }, ...h];
              });
            }
            return prev.filter((o) => o.id !== id);
          });
        });

        // Quán đang chế biến — tinh_trang = 2
        channelRef.listen(".don-hang.dang-lam", (data: any) => {
          if (!isMounted) return;
          const dh = data?.don_hang || data || {};
          const id = Number(dh?.id || dh?.order_id || data?.id);
          if (!id) return;
          setActiveOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], tinh_trang: 2 };
              return updated;
            }
            return prev;
          });
          DeviceEventEmitter.emit("ORDER_STATUS_CHANGED", { order_id: id, tinh_trang: 2 });
        });

        // Quán chuẩn bị xong — tinh_trang = 3
        channelRef.listen(".don-hang.da-xong", (data: any) => {
          if (!isMounted) return;
          const dh = data?.don_hang || data || {};
          const id = Number(dh?.id || dh?.order_id || data?.id);
          if (!id) return;
          setActiveOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], tinh_trang: 3 };
              return updated;
            }
            return prev;
          });
          DeviceEventEmitter.emit("ORDER_STATUS_CHANGED", { order_id: id, tinh_trang: 3 });
        });

      } catch (err) {
        console.log("[Echo] ShipperOrders setup error:", err);
      }
    };

    setupEcho();
    return () => {
      isMounted = false;
      if (channelRef) {
        try { channelRef.stopListening(".dispatch.candidate"); } catch { }
        try { channelRef.stopListening(".dispatch.cancelled"); } catch { }
        try { channelRef.stopListening(".don-hang.da-huy"); } catch { }
        try { channelRef.stopListening(".don-hang.hoan-thanh"); } catch { }
        try { channelRef.stopListening(".don-hang.dang-lam"); } catch { }
        try { channelRef.stopListening(".don-hang.da-xong"); } catch { }
      }
    };
  }, []);

  // ── Auto-polling 15 giây + lắng nghe event khi có đơn mới từ App.tsx ──
  useEffect(() => {
    const interval = setInterval(() => { fetchOrders(); }, 15000);

    const sub1 = DeviceEventEmitter.addListener('NEW_SHIPPER_ORDER', () => { fetchOrders(); });

    // ── Global countdown: chạy ngầm để cascade đúng giờ dù panel có mở hay không ──
    const cascadeInterval = setInterval(async () => {
      setAvailableOrders((prev) => {
        const now = Date.now();
        const expired = prev.filter((o) => {
          if (!o.arrivedAt) return false;
          const elapsed = (now - o.arrivedAt) / 1000;
          return elapsed >= (o.expires_in ?? 60);
        });
        if (expired.length === 0) return prev;
        // Gọi cascade API + đóng panel cho từng đơn hết giờ
        expired.forEach((o) => {
          apiClient.post("/shipper/don-hang/cascade-next", { id: o.id }).catch(() => { });
          setSelectedOrder((sel) => (sel?.id === o.id ? null : sel));
        });
        return prev.filter((o) => !expired.some((e) => e.id === o.id));
      });
    }, 1000);

    const sub2 = { remove: () => { } }; // cascade now handled by global interval

    return () => {
      clearInterval(interval);
      clearInterval(cascadeInterval);
      sub1.remove();
      sub2.remove();
    };
  }, [fetchOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  // Nhận đơn → POST /shipper/don-hang/nhan-don
  const handleAcceptOrder = (id: number) => {
    // 1. Đóng Modal chi tiết đơn hàng trước (Fix lỗi iOS không cho phép mở 2 Modal cùng lúc)
    setSelectedOrder(null);

    // 2. Đợi Modal cũ đóng xong rồi mới mở Modal xác nhận
    setTimeout(() => {
      setModalCfg({
        visible: true,
        icon: "bag-check",
        iconColor: PRIMARY,
        iconBg: "#FFF0ED",
        title: "Nhận đơn hàng này?",
        message: "Bạn sẽ chịu trách nhiệm giao đơn hàng này. Xác nhận để tiếp tục!",
        confirmLabel: "Nhận đơn",
        confirmColor: PRIMARY,
        cancelLabel: "Thôi, để sau",
        onConfirm: async () => {
          try {
            const res = await apiClient.post("/shipper/don-hang/nhan-don", { id });
            if (res.data?.status === 1) {
              setSelectedOrder(null);
              await fetchOrders();
              setModalCfg({
                visible: true,
                icon: "checkmark-circle",
                iconColor: "#10B981",
                iconBg: "#ECFDF5",
                title: "Đã nhận đơn!",
                message: res.data.message ?? "Đơn hàng được chuyển sang mục Đang giao.",
                confirmLabel: "OK",
                confirmColor: "#10B981",
                infoOnly: true,
                onConfirm: () => setActiveTab("dang_giao"),
              });
            } else {
              const msg: string = res.data?.message ?? "";
              const isInsufficientBalance =
                res.data?.can_nop_tien === true ||
                msg.includes("số dư") ||
                msg.includes("so du") ||
                msg.includes("không đủ") ||
                msg.includes("khong du") ||
                res.data?.error_type === "insufficient_balance";
              if (isInsufficientBalance) {
                setModalCfg({
                  visible: true,
                  icon: "wallet-outline",
                  iconColor: "#EF4444",
                  iconBg: "#FEF2F2",
                  title: "Số dư không đủ!",
                  message: msg || "Số dư tài khoản của bạn không đủ để đặt cọc cho đơn này. Vui lòng nạp thêm để tiếp tục nhận đơn.",
                  confirmLabel: "Đã hiểu",
                  confirmColor: "#EF4444",
                  infoOnly: true,
                  onConfirm: () => { },
                });
              } else {
                setModalCfg({
                  visible: true,
                  icon: "warning",
                  iconColor: "#F59E0B",
                  iconBg: "#FFFBEB",
                  title: "Không thể nhận",
                  message: msg || "Đơn hàng đã có người nhận rồi.",
                  confirmLabel: "Hiểu rồi",
                  confirmColor: "#F59E0B",
                  infoOnly: true,
                  onConfirm: () => fetchOrders(),
                });
              }
            }
          } catch {
            setModalCfg({
              visible: true,
              icon: "alert-circle",
              iconColor: "#EF4444",
              iconBg: "#FEF2F2",
              title: "Lỗi kết nối",
              message: "Không thể nhận đơn lúc này. Vui lòng thử lại.",
              confirmLabel: "OK",
              confirmColor: "#EF4444",
              infoOnly: true,
              onConfirm: () => { },
            });
          }
        },
      });
    }, 300);
  };

  // Từ chối đơn → POST /shipper/don-hang/tu-choi → cascade
  const handleDeclineOrder = (id: number) => {
    setSelectedOrder(null);
    setTimeout(() => {
      setModalCfg({
        visible: true,
        icon: "arrow-forward-circle",
        iconColor: "#64748B",
        iconBg: "#F1F5F9",
        title: "Từ chối nhận đơn?",
        message: "Đơn sẽ được chuyển cho shipper gần khu vực đó. Bạn có chắc?",
        confirmLabel: "Từ chối",
        confirmColor: "#64748B",
        cancelLabel: "Giữ đơn",
        onConfirm: async () => {
          try {
            const res = await apiClient.post("/shipper/don-hang/tu-choi", { id });
            if (res.data?.status === 1) {
              setAvailableOrders((prev) => prev.filter((o) => o.id !== id));
              await fetchOrders();
              setModalCfg({
                visible: true,
                icon: "checkmark-circle",
                iconColor: "#10B981",
                iconBg: "#ECFDF5",
                title: "Đã từ chối",
                message: res.data.message ?? "Đơn sẽ được chuyển cho shipper khác.",
                confirmLabel: "OK",
                confirmColor: "#10B981",
                infoOnly: true,
                onConfirm: () => { },
              });
            } else {
              setModalCfg({
                visible: true,
                icon: "warning",
                iconColor: "#F59E0B",
                iconBg: "#FFFBEB",
                title: "Không thể từ chối",
                message: res.data?.message ?? "Có lỗi xảy ra.",
                confirmLabel: "OK",
                confirmColor: "#F59E0B",
                infoOnly: true,
                onConfirm: () => fetchOrders(),
              });
            }
          } catch {
            setModalCfg({
              visible: true,
              icon: "alert-circle",
              iconColor: "#EF4444",
              iconBg: "#FEF2F2",
              title: "Lỗi kết nối",
              message: "Không thể từ chối đơn lúc này.",
              confirmLabel: "OK",
              confirmColor: "#EF4444",
              infoOnly: true,
              onConfirm: () => { },
            });
          }
        },
      });
    }, 300);
  };

  // Hoàn thành giao hàng → yêu cầu chụp ảnh xác nhận trước
  const handleCompleteDelivery = (id: number) => {
    setSelectedOrder(null);
    setTimeout(() => {
      setCapturedPhoto(null);
      setPhotoModal({ visible: true, orderId: id });
    }, 300);
  };

  const handleTakePhoto = () => {
    launchCamera(
      { mediaType: "photo", quality: 0.7, saveToPhotos: false, cameraType: "back" },
      (res) => {
        if (res.didCancel) return;

        // Nếu lỗi camera (vd: trên Simulator), cho phép chọn từ thư viện
        if (res.errorCode === 'camera_unavailable') {
          Alert.alert(
            "Lỗi Camera",
            "Thiết bị không hỗ trợ Camera (hoặc đang dùng giả lập). Bạn có muốn chọn ảnh từ thư viện không?",
            [
              { text: "Hủy", style: "cancel" },
              {
                text: "Chọn ảnh",
                onPress: () => {
                  launchImageLibrary({ mediaType: "photo", quality: 0.7 }, (libRes) => {
                    if (!libRes.didCancel && !libRes.errorCode) {
                      const uri = libRes.assets?.[0]?.uri;
                      if (uri) setCapturedPhoto(uri);
                    }
                  });
                }
              }
            ]
          );
          return;
        }

        if (res.errorCode) {
          Alert.alert("Lỗi", "Không thể mở camera: " + res.errorMessage);
          return;
        }

        const uri = res.assets?.[0]?.uri;
        if (uri) setCapturedPhoto(uri);
      }
    );
  };

  const handleSubmitDelivery = async () => {
    if (!capturedPhoto || !photoModal.orderId) return;
    setSubmittingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("id", String(photoModal.orderId));
      formData.append("anh_giao_hang", {
        uri: capturedPhoto,
        type: "image/jpeg",
        name: `delivery_${photoModal.orderId}_${Date.now()}.jpg`,
      } as any);

      await apiClient.post("/shipper/don-hang/hoan-thanh", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPhotoModal({ visible: false, orderId: null });
      setCapturedPhoto(null);
      setSelectedOrder(null);
      await fetchOrders();
      setActiveTab("lich_su");
    } catch {
      setModalCfg({
        visible: true,
        icon: "alert-circle",
        iconColor: "#EF4444",
        iconBg: "#FEF2F2",
        title: "Lỗi",
        message: "Không thể hoàn thành đơn. Vui lòng thử lại.",
        confirmLabel: "OK",
        confirmColor: "#EF4444",
        infoOnly: true,
        onConfirm: () => { },
      });
    } finally {
      setSubmittingPhoto(false);
    }
  };

  // ── Render Tab ──────────────────────────────────────────────────
  const renderTab = (tab: typeof TABS[number]) => {
    const isActive = activeTab === tab.key;
    const tabTinh: Record<string, number> = { nhan_don: 0, dang_giao: 2, lich_su: 3 };
    const cfg = STATUS_CONFIG[tabTinh[tab.key] ?? 0];
    const count = countByTab(tab.key);
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, isActive && { borderBottomColor: PRIMARY, borderBottomWidth: 2 }]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={tab.icon as any}
          size={16}
          color={isActive ? PRIMARY : TEXT_LIGHT}
        />
        <Text style={[styles.tabText, isActive && { color: PRIMARY, fontWeight: "700" }]}>
          {tab.label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: isActive ? PRIMARY : cfg.color }]}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Render Order Card ────────────────────────────────────
  const renderOrderCard = ({ item }: { item: Order }) => {
    const cfg = STATUS_CONFIG[item.tinh_trang] ?? STATUS_CONFIG[0];
    const deliveryAddr = [item.dia_chi_khach, item.ten_quan_huyen]
      .filter(Boolean).join(", ");
    const timeStr = item.gio_tao_don ||
      new Date(item.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedOrder(item)}
        activeOpacity={0.88}
      >
        {/* Left accent */}
        <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />

        <View style={styles.cardBody}>
          {/* Top row */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardOrderId}>#{item.ma_don_hang}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Mini countdown cho đơn chờ nhận */}
              {item.activeTab === 'nhan_don' && item.arrivedAt != null && (() => {
                const remaining = Math.max(0, Math.round((item.expires_in ?? 60) - (Date.now() - item.arrivedAt!) / 1000));
                const isUrgent = remaining <= 60;
                const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
                const ss = String(remaining % 60).padStart(2, '0');
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: isUrgent ? '#FEF2F2' : '#FFFBEB', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Ionicons name="timer-outline" size={11} color={isUrgent ? '#EF4444' : '#F59E0B'} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isUrgent ? '#EF4444' : '#F59E0B' }}>{mm}:{ss}</Text>
                  </View>
                );
              })()}
              <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>
          </View>

          {/* Restaurant */}
          <View style={styles.cardRow}>
            <Ionicons name="storefront-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.cardRowText} numberOfLines={1}>{item.ten_quan_an}</Text>
            <Text style={styles.cardTime}>{timeStr}</Text>
          </View>

          {/* Destination */}
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={16} color={PRIMARY} />
            <Text style={styles.cardRowText} numberOfLines={1}>
              {item.ten_nguoi_nhan} • {deliveryAddr}
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.cardEarningChip}>
              <Ionicons name="wallet-outline" size={13} color={PRIMARY} />
              <Text style={styles.cardEarningText}>+{item.phi_ship.toLocaleString("vi-VN")}đ</Text>
            </View>
            <Text style={styles.cardTotal}>{item.tong_tien.toLocaleString("vi-VN")}đ</Text>
            {item.phuong_thuc_thanh_toan === 1 ? (
              <View style={styles.cashBadge}>
                <Text style={styles.cashBadgeText}>Tiền mặt</Text>
              </View>
            ) : (
              <View style={[styles.cashBadge, { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" }]}>
                <Text style={[styles.cashBadgeText, { color: "#3B82F6" }]}>CK</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={TEXT_LIGHT} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render Empty ─────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="receipt-outline" size={44} color={PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>Không có đơn hàng</Text>
      <Text style={styles.emptyDesc}>
        Các đơn hàng mới sẽ xuất hiện ở đây. Kéo xuống để làm mới.
      </Text>
    </View>
  );

  // ════════════════════════════════════════════════════════
  // Main Render
  // ════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.headerBg}>
        <SafeAreaView edges={["top"]} style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerGreeting}>Đơn hàng hôm nay</Text>
              <Text style={styles.headerDate}>
                {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {/* ── Online Toggle ── */}
              <TouchableOpacity
                onPress={handleToggleOnline}
                disabled={toggling}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isOpen ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.15)",
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  gap: 6,
                }}
              >
                {/* Switch track */}
                <Animated.View
                  style={{
                    width: 38,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: toggleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["#94A3B8", "#10B981"],
                    }),
                    justifyContent: "center",
                    paddingHorizontal: 2,
                  }}
                >
                  <Animated.View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: "#FFF",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 3,
                      transform: [{
                        translateX: toggleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 16],
                        }),
                      }],
                    }}
                  />
                </Animated.View>
                <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>
                  {toggling ? "..." : isOpen ? "Online" : "Offline"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={handleRefresh}>
                <Ionicons name="refresh-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayDelivered}</Text>
              <Text style={styles.statLabel}>Đã giao</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{countByTab("dang_giao")}</Text>
              <Text style={styles.statLabel}>Đang giao</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayEarning.toLocaleString("vi-VN")}đ</Text>
              <Text style={styles.statLabel}>Thu nhập</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(renderTab)}
        </ScrollView>
      </View>

      {/* ── Orders List ── */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderCard}
        contentContainerStyle={[
          styles.listContent,
          filteredOrders.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      />

      {/* ── Order Detail Panel ── */}
      <Modal
        transparent
        visible={!!selectedOrder}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayBackdrop}
            onPress={() => setSelectedOrder(null)}
            activeOpacity={1}
          />
          {selectedOrder && (
            <OrderDetailPanel
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onAcceptOrder={handleAcceptOrder}
              onDeclineOrder={handleDeclineOrder}
              onCompleteDelivery={handleCompleteDelivery}
              onChat={() => {
                setSelectedOrder(null);
                navigation.navigate("ChatWithCustomer", {
                  id_don_hang: selectedOrder.id,
                  name: selectedOrder.ten_nguoi_nhan || "Khách hàng",
                  avatar: selectedOrder.avatar,
                  ma_don_hang: selectedOrder.ma_don_hang,
                  dia_chi: selectedOrder.dia_chi_khach || "",
                });
              }}
            />
          )}
        </View>
      </Modal>

      {/* ── Custom Modal ── */}
      <CustomModal config={modalCfg} onDismiss={dismissModal} />

      {/* ── Modal chụp ảnh xác nhận giao hàng ── */}
      <Modal
        visible={photoModal.visible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => { if (!submittingPhoto) { setPhotoModal({ visible: false, orderId: null }); setCapturedPhoto(null); } }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalBox}>
            {/* Header */}
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Xác nhận giao hàng</Text>
              <TouchableOpacity
                onPress={() => { setPhotoModal({ visible: false, orderId: null }); setCapturedPhoto(null); }}
                disabled={submittingPhoto}
              >
                <Ionicons name="close" size={24} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <Text style={styles.photoModalDesc}>
              Chụp ảnh bàn giao hàng cho khách hoặc ảnh đặt hàng tại cửa để xác nhận giao thành công.
            </Text>

            {/* Vùng ảnh */}
            <TouchableOpacity style={styles.photoBox} onPress={handleTakePhoto} activeOpacity={0.8}>
              {capturedPhoto ? (
                <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={48} color="#94A3B8" />
                  <Text style={styles.photoPlaceholderText}>Nhấn để chụp ảnh</Text>
                </View>
              )}
            </TouchableOpacity>

            {capturedPhoto && (
              <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto}>
                <Ionicons name="refresh-outline" size={16} color={PRIMARY} />
                <Text style={styles.retakeBtnText}>Chụp lại</Text>
              </TouchableOpacity>
            )}

            {/* Nút hoàn thành */}
            <TouchableOpacity
              style={[styles.confirmDeliveryBtn, (!capturedPhoto || submittingPhoto) && { opacity: 0.5 }]}
              onPress={handleSubmitDelivery}
              disabled={!capturedPhoto || submittingPhoto}
              activeOpacity={0.85}
            >
              {submittingPhoto ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={20} color="#FFF" />
                  <Text style={styles.confirmDeliveryBtnText}>Hoàn tất giao hàng</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Floating Chat Bubble ── */}
      <FloatingChatBubble navigation={navigation} orders={activeOrders} />
    </View>
  );
};

// ════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──
  headerBg: {
    backgroundColor: PRIMARY,
  },
  headerSafe: {
    paddingTop: Platform.OS === "android" ? hp("1.5%") : 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("5%"),
    paddingTop: hp("1.5%"),
    paddingBottom: hp("1%"),
  },
  headerGreeting: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  headerDate: {
    fontSize: wp("3.2%"),
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
    textTransform: "capitalize",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: wp("5%"),
    marginBottom: hp("1.8%"),
    borderRadius: 12,
    paddingVertical: hp("1.2%"),
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: wp("3.8%"), fontWeight: "800", color: "#FFF" },
  statLabel: { fontSize: wp("2.8%"), color: "rgba(255,255,255,0.75)", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.3)" },

  // ── Tab Bar ──
  tabBar: {
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  tabBarContent: {
    paddingHorizontal: wp("2%"),
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1.4%"),
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: TEXT_LIGHT,
  },
  tabBadge: {
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },

  // ── List ──
  listContent: {
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1.5%"),
    paddingBottom: hp("3%"),
  },

  // ── Card ──
  card: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 16,
    marginBottom: hp("1.2%"),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: {
    width: 4,
    borderRadius: 2,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1.4%"),
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("0.8%"),
  },
  cardOrderId: {
    fontSize: wp("4%"),
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: 0.3,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: hp("0.5%"),
  },
  cardRowText: {
    flex: 1,
    fontSize: wp("3.3%"),
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  cardTime: {
    fontSize: wp("3%"),
    color: TEXT_LIGHT,
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("0.8%"),
    gap: 8,
  },
  cardEarningChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0ED",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  cardEarningText: {
    fontSize: wp("3%"),
    color: PRIMARY,
    fontWeight: "700",
  },
  cardTotal: {
    flex: 1,
    fontSize: wp("3.5%"),
    color: TEXT_DARK,
    fontWeight: "700",
    textAlign: "right",
  },
  cashBadge: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cashBadgeText: {
    fontSize: 10,
    color: "#B45309",
    fontWeight: "700",
  },

  // ── Recipient ──
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: hp("1.2%"),
  },
  recipientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  recipientAvatarText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
  },
  recipientName: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  recipientPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  recipientPhone: {
    fontSize: wp("3.5%"),
    color: PRIMARY,
    fontWeight: "600",
  },
  recipientAddressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: BG,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  recipientAddressLabel: {
    fontSize: wp("2.9%"),
    color: TEXT_LIGHT,
    fontWeight: "600",
    marginBottom: 3,
  },
  recipientAddressText: {
    fontSize: wp("3.5%"),
    color: TEXT_DARK,
    lineHeight: 20,
    fontWeight: "500",
  },

  // Status pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Empty State ──
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("10%"),
    paddingTop: hp("5%"),
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFF0ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("2%"),
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: hp("1%"),
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: wp("3.3%"),
    color: TEXT_LIGHT,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Detail Panel / Overlay ──
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  detailPanel: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: hp("88%"),
    paddingHorizontal: wp("5%"),
    paddingBottom: hp("2%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: hp("2%"),
    paddingBottom: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  detailTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
  },

  // Detail sections
  detailSection: {
    paddingVertical: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  detailSectionTitle: {
    fontSize: wp("3.2%"),
    fontWeight: "700",
    color: TEXT_LIGHT,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: hp("1%"),
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: hp("0.6%"),
  },
  detailRowText: {
    fontSize: wp("3.8%"),
    color: TEXT_DARK,
    fontWeight: "500",
  },

  // Address
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: hp("0.5%"),
  },
  addressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  addressDotLine: {
    width: 2,
    height: hp("2%"),
    backgroundColor: BORDER,
    marginLeft: 4,
    marginVertical: 2,
  },
  addressLabel: {
    fontSize: wp("2.9%"),
    color: TEXT_LIGHT,
    fontWeight: "600",
    marginBottom: 2,
  },
  addressText: {
    fontSize: wp("3.5%"),
    color: TEXT_DARK,
    fontWeight: "500",
    lineHeight: 19,
  },

  // Items
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("0.8%"),
    gap: 8,
  },
  itemQtyBadge: {
    backgroundColor: BG,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  itemQtyText: { fontSize: 11, fontWeight: "700", color: TEXT_DARK },
  itemName: { flex: 1, fontSize: wp("3.4%"), color: TEXT_DARK, fontWeight: "500" },
  itemPrice: { fontSize: wp("3.4%"), color: TEXT_MUTED, fontWeight: "600" },

  // Payment
  payRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp("0.6%"),
  },
  payLabel: { fontSize: wp("3.5%"), color: TEXT_MUTED },
  payValue: { fontSize: wp("3.5%"), color: TEXT_DARK, fontWeight: "600" },
  payRowEarning: {
    marginTop: hp("0.6%"),
    paddingTop: hp("0.8%"),
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  earningLabel: { fontSize: wp("3.8%"), fontWeight: "700", color: TEXT_DARK },
  earningValue: { fontSize: wp("4%"), fontWeight: "800", color: PRIMARY },

  // Note
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: wp("3.3%"), color: TEXT_MUTED, lineHeight: 18 },

  // Time chips
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeChipText: { fontSize: wp("3%"), color: TEXT_MUTED, fontWeight: "500" },

  // Actions
  detailActions: {
    marginTop: hp("2%"),
    gap: hp("1%"),
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: hp("1.7%"),
    gap: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBtnText: {
    color: "#FFF",
    fontSize: wp("4%"),
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // ── Countdown ──
  countdownWrap: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: wp("3.5%"),
    marginTop: hp("1%"),
    marginBottom: hp("0.5%"),
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  countdownTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: hp("0.8%"),
  },
  countdownLabel: {
    flex: 1,
    fontSize: wp("3.2%"),
    fontWeight: "700",
  },
  countdownValue: {
    fontSize: wp("4.5%"),
    fontWeight: "900",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  countdownTrack: {
    height: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: hp("0.6%"),
  },
  countdownFill: {
    height: "100%",
    borderRadius: 3,
  },
  countdownHint: {
    fontSize: wp("2.8%"),
    color: TEXT_MUTED,
    fontWeight: "500",
  },

  // ── Photo confirmation modal ──
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  photoModalBox: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: wp("5%"),
    paddingTop: hp("2.5%"),
    paddingBottom: hp("5%"),
  },
  photoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("1%"),
  },
  photoModalTitle: {
    fontSize: wp("4.8%"),
    fontWeight: "800",
    color: TEXT_DARK,
  },
  photoModalDesc: {
    fontSize: wp("3.4%"),
    color: TEXT_MUTED,
    lineHeight: 20,
    marginBottom: hp("2%"),
  },
  photoBox: {
    width: "100%",
    height: hp("28%"),
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: "dashed",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  photoPlaceholderText: {
    fontSize: wp("3.8%"),
    color: TEXT_LIGHT,
    fontWeight: "600",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: hp("1.2%"),
  },
  retakeBtnText: {
    fontSize: wp("3.5%"),
    color: PRIMARY,
    fontWeight: "600",
  },
  confirmDeliveryBtn: {
    marginTop: hp("2%"),
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: hp("1.8%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmDeliveryBtnText: {
    color: "#FFF",
    fontSize: wp("4%"),
    fontWeight: "700",
  },
});

export default ShipperOrders;
