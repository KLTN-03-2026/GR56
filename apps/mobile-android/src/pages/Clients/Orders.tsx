import React, { useState, useCallback, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";
import { getImageUrl, getShipperAvatarUrl } from "../../utils/imageHelper";
import CustomAlert, { AlertButton } from "../../components/CustomAlert";
import InlineDeliveryMap from "../../components/InlineDeliveryMap";
import { createEcho } from "../../config/echo";

// ════════════════ Types ════════════════

interface Order {
  id: number;
  ma_don_hang: string;
  created_at: string;
  tien_hang: number;
  phi_ship: number;
  tong_tien: number;
  is_thanh_toan: number;
  tinh_trang: number;
  da_danh_gia: number;
  ten_quan_an: string;
  hinh_anh_quan: string | null;
  dia_chi_quan: string;
  ho_va_ten_shipper: string | null;
  sdt_shipper: string | null;
  dia_chi: string;
  ten_nguoi_nhan: string;
  so_dien_thoai: string;
  hinh_anh_mon_an: string | null;
  so_mon: number;
  payos_payment_link_id?: string | null;
}

interface OrderDetail {
  id: number;
  ma_don_hang: string;
  tien_hang: number;
  phi_ship: number;
  tong_tien: number;
  is_thanh_toan: number;
  tinh_trang: number;
  ten_quan_an: string;
  hinh_anh_quan: string | null;
  dia_chi_quan: string;
  sdt_quan: string;
  id_shipper: number | null;
  ho_va_ten_shipper: string | null;
  sdt_shipper: string | null;
  hinh_anh_shipper: string | null;
  dia_chi: string;
  ten_quan_huyen: string;
  ten_tinh_thanh: string;
  ten_nguoi_nhan: string;
  sdt_nguoi_nhan: string;
  ma_code: string | null;
  ten_voucher: string | null;
  so_giam_gia: number | null;
  da_danh_gia: number;
  created_at: string;
  toa_do_x?: number | null;  // longitude địa chỉ khách
  toa_do_y?: number | null;  // latitude địa chỉ khách
  payos_payment_link_id?: string | null;
}

interface OrderItem {
  id: number;
  ten_mon_an: string;
  hinh_anh: string | null;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  ghi_chu: string;
}

// ════════════════ Constants ════════════════

const COLORS = { PRIMARY: "#EE4D2D" };
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const STATUS_MAP: Record<number, { label: string; color: string; bg: string; tab: string }> = {
  0: { label: "Chờ xác nhận",  color: "#F59E0B", bg: "#FEF3C7", tab: "Đang giao" }, // chưa có shipper
  1: { label: "Đã nhận",        color: "#3B82F6", bg: "#EFF6FF", tab: "Đang giao" }, // shipper đã nhận
  2: { label: "Quán đang làm",  color: "#8B5CF6", bg: "#F5F3FF", tab: "Đang giao" }, // quán đang nấu
  3: { label: "Đang giao",      color: "#F97316", bg: "#FFF7ED", tab: "Đang giao" }, // shipper đang giao
  4: { label: "Đã giao",        color: "#10B981", bg: "#ECFDF5", tab: "Đã Giao"  }, // hoàn thành
};

const formatPrice = (price: number): string => {
  if (!price) return "0đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
};

// ════════════════ Component ════════════════

const Orders = ({ navigation, route }: any) => {
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab ?? "Đã nhận");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [shipperCoord, setShipperCoord] = useState<[number, number] | null>(null);

  // Custom Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: "success" | "error" | "warning" | "info" | "confirm";
    title: string;
    message?: string;
    buttons: AlertButton[];
  }>({
    type: "confirm",
    title: "",
    buttons: [],
  });



  const showAlert = (
    type: "success" | "error" | "warning" | "info" | "confirm",
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => {
    setAlertConfig({
      type,
      title,
      message,
      buttons: buttons || [{ text: "OK", style: "default" }],
    });
    setAlertVisible(true);
  };

  const tabs = ["Đã nhận", "Đang giao", "Đã giao"];

  // ── Load danh sách đơn hàng ──
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/khach-hang/don-hang/data");
      if (res.data?.status) {
        setOrders(res.data.data || []);
      }
    } catch (error) {
      console.log("Load orders error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  // ── Load chi tiết đơn hàng ──
  const loadOrderDetail = useCallback(async (orderId: number) => {
    try {
      setLoadingDetail(true);
      setOrderDetail(null);
      setOrderItems([]);
      const res = await apiClient.post("/khach-hang/don-hang/data-chi-tiet", { id: orderId });
      if (res.data?.status) {
        setOrderDetail(res.data.don_hang);
        setOrderItems(res.data.chi_tiet_mon_an || []);
      }
    } catch (error) {
      console.log("Load order detail error:", error);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Silent refresh — không reset state, dùng cho polling
  const silentRefreshDetail = useCallback(async (orderId: number) => {
    try {
      const res = await apiClient.post("/khach-hang/don-hang/data-chi-tiet", { id: orderId });
      if (res.data?.status) {
        setOrderDetail(res.data.don_hang);
        setOrderItems(res.data.chi_tiet_mon_an || []);
        // Sync tinh_trang vào danh sách để badge cũng cập nhật
        setOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, tinh_trang: res.data.don_hang.tinh_trang } : o)
        );
      }
    } catch (_) {}
  }, []);

  // ── Xử lý Reorder ──
  const handleReorder = useCallback(async (orderId: number) => {
    try {
      showAlert("info", "", "Đang xử lý...", [{text: "OK", style: "cancel"}]);
      const res = await apiClient.post("/khach-hang/don-hang/reorder", { id: orderId });
      if (res.data?.status) {
        showAlert("success", "Thành công", res.data.message, [
          {text: "OK", style: "default", onPress: () => {
            setOrderDetail(null);
            setOrderItems([]);
            navigation.navigate("RestaurantDetail", { id: res.data.id_quan_an });
          }}
        ]);
      } else {
        showAlert("error", "Thất bại", res.data?.message || "Không thể đặt lại đơn hàng", [{text: "OK", style: "cancel"}]);
      }
    } catch (error: any) {
      showAlert("error", "Lỗi", error.response?.data?.message || "Có lỗi xảy ra", [{text: "OK", style: "cancel"}]);
    }
  }, [showAlert, navigation]);

  // ── Xử lý Yêu cầu hủy đơn ──
  const handleCancelRequest = useCallback(async (orderId: number) => {
    showAlert(
      "confirm",
      "Yêu cầu hủy đơn",
      "Bạn có chắc muốn gửi yêu cầu hủy đơn này đến admin? Chúng tôi sẽ xem xét và phản hồi sớm nhất.",
      [
        { text: "Không", style: "cancel" },
        {
          text: "Gửi yêu cầu",
          style: "default",
          onPress: async () => {
            try {
              const res = await apiClient.post("/khach-hang/don-hang/yeu-cau-huy", { id: orderId });
              if (res.data?.status) {
                showAlert("success", "Đã gửi yêu cầu", res.data.message || "Yêu cầu hủy đơn đã được gửi đến admin. Chúng tôi sẽ liên hệ bạn sớm.", [
                  { text: "OK", style: "default" },
                ]);
              } else {
                showAlert("error", "Thất bại", res.data?.message || "Không thể gửi yêu cầu hủy đơn.", [{ text: "OK", style: "cancel" }]);
              }
            } catch (error: any) {
              showAlert("error", "Lỗi", error.response?.data?.message || "Có lỗi xảy ra khi gửi yêu cầu.", [{ text: "OK", style: "cancel" }]);
            }
          },
        },
      ]
    );
  }, [showAlert]);

  // Polling 5s khi đang xem detail của đơn chưa hoàn thành (0-3)
  // → tự động hiện thông tin shipper khi shipper nhận đơn
  React.useEffect(() => {
    if (!orderDetail || orderDetail.tinh_trang > 3) return;
    const intervalId = setInterval(() => silentRefreshDetail(orderDetail.id), 5000);
    return () => clearInterval(intervalId);
  }, [orderDetail?.id, orderDetail?.tinh_trang, silentRefreshDetail]);

  // Tracking GPS shipper real-time khi tinh_trang === 3
  React.useEffect(() => {
    if (!orderDetail || orderDetail.tinh_trang !== 3) {
      setShipperCoord(null);
      return;
    }
    let echoInstance: any = null;

    // Gọi API lần đầu để lấy vị trí shipper
    const fetchTracking = async () => {
      try {
        const res = await apiClient.post("/khach-hang/theo-doi-don-hang", { id: orderDetail.id });
        if (res.data?.status && res.data?.order) {
          const { shipper_lat, shipper_lng } = res.data.order;
          if (shipper_lat && shipper_lng) {
            setShipperCoord([parseFloat(shipper_lng), parseFloat(shipper_lat)]);
          }
        }
      } catch (_) {}
    };
    fetchTracking();

    // WebSocket real-time cập nhật vị trí shipper
    createEcho().then((echo) => {
      echoInstance = echo;
      echo.private(`order.${orderDetail.id}`)
        .listen(".shipper.location.updated", (data: any) => {
          if (data?.lat && data?.lng) {
            setShipperCoord([parseFloat(data.lng), parseFloat(data.lat)]);
          }
        });
    }).catch(() => {});

    return () => {
      if (echoInstance) echoInstance.leave(`order.${orderDetail.id}`);
    };
  }, [orderDetail?.id, orderDetail?.tinh_trang]);

  

  const getFilteredOrders = () => {
    if (activeTab === "Đã nhận")   return orders.filter((o) => o.tinh_trang <= 2);
    if (activeTab === "Đang giao") return orders.filter((o) => o.tinh_trang === 3);
    if (activeTab === "Đã giao")   return orders.filter((o) => o.tinh_trang === 4);
    return [];
  };

  const getStatusInfo = (tinh_trang: number) =>
    STATUS_MAP[tinh_trang] || { label: "Không xác định", color: "#94A3B8", bg: "#F1F5F9", tab: "Lịch sử" };

  // ── Card đơn hàng ──
  const renderOrderCard = ({ item }: { item: Order }) => {
    const statusInfo = getStatusInfo(item.tinh_trang);
    return (
      <View style={styles.orderCard}>
        <View style={styles.cardHeader}>
          <Image source={{ uri: getImageUrl(item.hinh_anh_quan) }} style={styles.orderImage} />
          <View style={styles.orderHeaderInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.orderName} numberOfLines={1}>{item.ten_quan_an}</Text>
              <View style={[styles.statusBadgeCard, { backgroundColor: statusInfo.bg }]}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
            </View>
            <Text style={styles.orderLocation} numberOfLines={1}>
              {item.so_mon} món • {item.dia_chi}
            </Text>
            <View style={styles.priceTimeRow}>
              <Text style={styles.price}>{formatPrice(item.tong_tien)}</Text>
              <Text style={styles.time}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {item.tinh_trang <= 3 ? (
            // 0=chờ, 1=đã nhận, 2=quán đang làm, 3=đang giao → theo dõi đơn
            <>
              {item.payos_payment_link_id && item.is_thanh_toan === 0 && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() =>
                    navigation.navigate("PayOSPayment", { id_don_hang: item.id })
                  }
                >
                  <Text style={styles.primaryButtonText}>Thanh toán</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.detailButton, item.payos_payment_link_id && item.is_thanh_toan === 0 ? { flex: 1 } : null]}
                onPress={() => loadOrderDetail(item.id)}
              >
                <Text style={styles.detailButtonText}>Theo dõi đơn hàng</Text>
              </TouchableOpacity>
              {item.tinh_trang <= 2 && (
                <TouchableOpacity
                  style={styles.cancelRequestButton}
                  onPress={() => handleCancelRequest(item.id)}
                >
                  <Ionicons name="close-circle-outline" size={13} color="#EE4D2D" />
                  <Text style={styles.cancelRequestButtonText}>Hủy đơn</Text>
                </TouchableOpacity>
              )}
            </>
          ) : item.da_danh_gia ? (
            // 4=đã giao + đã đánh giá
            <>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => loadOrderDetail(item.id)}>
                <Text style={styles.secondaryButtonText}>Xem chi tiết</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => handleReorder(item.id)}>
                <Text style={styles.primaryButtonText}>Đặt lại</Text>
              </TouchableOpacity>
            </>
          ) : (
            // 4=đã giao + chưa đánh giá
            <>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => loadOrderDetail(item.id)}
              >
                <Text style={styles.secondaryButtonText}>Đánh giá</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => handleReorder(item.id)}>
                <Text style={styles.primaryButtonText}>Đặt lại</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // ── Chi tiết đơn hàng ──
  const renderDetail = () => {
    if (loadingDetail) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={{ marginTop: 12, color: "#94A3B8", fontSize: 14 }}>Đang tải...</Text>
        </View>
      );
    }
    if (!orderDetail) return null;

    const statusInfo = getStatusInfo(orderDetail.tinh_trang);

    return (
      <View style={styles.detailContainer}>
        {/* Map nhúng trực tiếp theo trạng thái */}
        <View style={styles.mapSection}>
          <TouchableOpacity
            style={styles.mapBackButton}
            onPress={() => { setOrderDetail(null); setOrderItems([]); }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          {(() => {
            const tt = orderDetail.tinh_trang;
            const custAddr = `${orderDetail.dia_chi}, ${orderDetail.ten_quan_huyen}, ${orderDetail.ten_tinh_thanh}`;
            // toa_do_x = longitude (kinh độ), toa_do_y = latitude (vĩ độ)
            // Map nhận [lng, lat] → đúng thứ tự
            const _lng = Number(orderDetail.toa_do_x);
            const _lat = Number(orderDetail.toa_do_y);
            const custCoord: [number, number] | null =
              _lng && _lat ? [_lng, _lat] : null;
            console.log('[MAP] khách:', custCoord, '| địa chỉ:', custAddr);
            if (tt <= 2) {
              // 0=chờ nhận, 1=đã nhận, 2=quán đang làm → hiện quán + khách
              return (
                <InlineDeliveryMap
                  mode="dual_address"
                  destAddress={orderDetail.dia_chi_quan}
                  destName={orderDetail.ten_quan_an}
                  secondAddress={custAddr}
                  secondName={orderDetail.ten_nguoi_nhan}
                  secondCoord={custCoord}
                />
              );
            } else if (tt === 3) {
              // Đang giao → shipper GPS thật (từ API tracking + WebSocket)
              return (
                <InlineDeliveryMap
                  mode="shipper_to_customer"
                  destAddress={orderDetail.dia_chi_quan}
                  destName={orderDetail.ten_quan_an}
                  shipperCoord={shipperCoord}
                  shipperName={orderDetail.ho_va_ten_shipper || 'Shipper'}
                  secondAddress={custAddr}
                  secondName={orderDetail.ten_nguoi_nhan}
                  secondCoord={custCoord}
                />
              );
            } else {
              // 4=đã giao → static overview quán & khách
              return (
                <InlineDeliveryMap
                  mode="dual_address"
                  destAddress={orderDetail.dia_chi_quan}
                  destName={orderDetail.ten_quan_an}
                  secondAddress={custAddr}
                  secondName={orderDetail.ten_nguoi_nhan}
                  secondCoord={custCoord}
                />
              );
            }
          })()}
        </View>

        <ScrollView style={styles.detailSheet} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderCode}>{orderDetail.ma_don_hang}</Text>
              <Text style={styles.orderNameDetail}>{orderDetail.ten_quan_an}</Text>
            </View>
            <View style={[styles.statusBadgeContainer, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusBadge, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          {/* Tracking (0=chờ nhận → 3=đang giao) */}
          {orderDetail.tinh_trang <= 3 && (
            <View style={styles.deliverySectionContainer}>
              <Text style={styles.deliveryTitle}>Theo dõi đơn đặt hàng</Text>
              <View style={styles.timeEstimate}>
                <Text style={styles.timeLabel}>Ngày đặt: {formatDate(orderDetail.created_at)}</Text>
              </View>
              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  {[
                    { label: "Chờ nhận",  step: 0 },
                    { label: "Đã nhận",   step: 1 },
                    { label: "Đang làm",  step: 2 },
                    { label: "Đang giao", step: 3 },
                  ].map((s, idx, arr) => (
                    <React.Fragment key={s.step}>
                      <View style={styles.statusItem}>
                        <View style={orderDetail.tinh_trang >= s.step ? styles.statusDotActive : styles.statusDot}>
                          {orderDetail.tinh_trang >= s.step && <Ionicons name="checkmark" size={12} color="#FFF" />}
                        </View>
                        <Text style={styles.statusLabel}>{s.label}</Text>
                      </View>
                      {idx < arr.length - 1 && (
                        <View style={[styles.statusLine, { backgroundColor: orderDetail.tinh_trang > s.step ? COLORS.PRIMARY : "#E2E8F0" }]} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Shipper — hiện khi đã có shipper nhận đơn (tinh_trang >= 1) */}
          {orderDetail.tinh_trang >= 1 && orderDetail.tinh_trang <= 3 &&
            (!!orderDetail.id_shipper || !!orderDetail.ho_va_ten_shipper || !!orderDetail.sdt_shipper) && (
            <View style={styles.shipperSection}>
              <View style={styles.shipperHeader}>
                <Image source={{ uri: getShipperAvatarUrl(orderDetail.hinh_anh_shipper) }} style={styles.shipperAvatar} />
                <View style={styles.shipperInfo}>
                  <Text style={styles.shipperName}>{orderDetail.ho_va_ten_shipper || "Shipper"}</Text>
                  <Text style={styles.phone}>{orderDetail.sdt_shipper}</Text>
                </View>
                <View style={styles.shipperActions}>
                  <TouchableOpacity
                    style={styles.actionButton1}
                    onPress={() =>
                      navigation.navigate("ChatWithShipper", {
                        id_don_hang: orderDetail.id,
                        name: orderDetail.ho_va_ten_shipper,
                        avatar: orderDetail.hinh_anh_shipper,
                        ma_don_hang: orderDetail.ma_don_hang,
                      })
                    }
                  >
                    <Ionicons name="chatbox-ellipses" size={18} color={COLORS.PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      showAlert("info", "Gọi shipper", `Bạn muốn gọi cho ${orderDetail.ho_va_ten_shipper}?\n${orderDetail.sdt_shipper}`, [
                        { text: "Hủy", style: "cancel" },
                        { text: "Gọi ngay", style: "default" },
                      ])
                    }
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Địa chỉ nhận */}
          <View style={styles.orderSection}>
            <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
            <View style={[styles.storeInfoSection, { marginTop: 8 }]}>
              <Ionicons name="location" size={20} color={COLORS.PRIMARY} style={{ marginRight: 10 }} />
              <View style={styles.storeDetails}>
                <Text style={styles.storeName}>{orderDetail.ten_nguoi_nhan}</Text>
                <Text style={styles.storeLocation}>{orderDetail.sdt_nguoi_nhan}</Text>
                <Text style={styles.storeLocation} numberOfLines={2}>
                  {orderDetail.dia_chi}, {orderDetail.ten_quan_huyen}, {orderDetail.ten_tinh_thanh}
                </Text>
              </View>
            </View>
          </View>

          {/* Món ăn */}
          <View style={styles.orderSection}>
            <View style={styles.orderHeaderRow}>
              <Text style={styles.sectionTitle}>Chi tiết đơn hàng</Text>
              <Text style={styles.orderCode}>{orderDetail.ma_don_hang}</Text>
            </View>

            <View style={styles.storeInfoSection}>
              <Image source={{ uri: getImageUrl(orderDetail.hinh_anh_quan) }} style={styles.storeImage} />
              <View style={styles.storeDetails}>
                <Text style={styles.storeName}>{orderDetail.ten_quan_an}</Text>
                <Text style={styles.storeLocation} numberOfLines={1}>{orderDetail.dia_chi_quan}</Text>
              </View>
            </View>

            <View style={styles.itemsContainer}>
              {orderItems.map((item) => (
                <View key={item.id} style={styles.orderItem}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemQty}>{item.so_luong}x</Text>
                    <Text style={styles.itemName} numberOfLines={1}>{item.ten_mon_an}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{formatPrice(item.thanh_tien)}</Text>
                </View>
              ))}
            </View>

            {/* Tổng tiền */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tạm tính</Text>
                <Text style={styles.totalPrice}>{formatPrice(orderDetail.tien_hang)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Phí giao hàng</Text>
                <Text style={styles.totalPrice}>{formatPrice(orderDetail.phi_ship)}</Text>
              </View>
              {orderDetail.ten_voucher && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Voucher ({orderDetail.ma_code})</Text>
                  <Text style={[styles.totalPrice, { color: "#10B981" }]}>
                    -{formatPrice(orderDetail.so_giam_gia || 0)}
                  </Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Tổng thanh toán</Text>
                <Text style={styles.grandTotalPrice}>{formatPrice(orderDetail.tong_tien)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Thanh toán</Text>
                <Text style={styles.totalPrice}>
                  {orderDetail.payos_payment_link_id
                    ? orderDetail.is_thanh_toan === 1
                      ? 'Chuyển khoản (đã thanh toán)'
                      : 'Chuyển khoản (chờ thanh toán)'
                    : 'Tiền mặt'}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.supportButton}>
              <Ionicons name="help-circle-outline" size={18} color="#666" />
              <Text style={styles.supportButtonText} numberOfLines={1}>Hỗ trợ</Text>
            </TouchableOpacity>
            {orderDetail.tinh_trang <= 2 && (
              <TouchableOpacity
                style={[styles.cancelRequestButtonDetail, { flex: 1 }]}
                onPress={() => handleCancelRequest(orderDetail.id)}
              >
                <Ionicons name="close-circle-outline" size={15} color="#EE4D2D" />
                <Text style={styles.cancelRequestButtonDetailText}>Yêu cầu hủy đơn</Text>
              </TouchableOpacity>
            )}
            {orderDetail.payos_payment_link_id && orderDetail.is_thanh_toan === 0 && orderDetail.tinh_trang <= 3 && (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, paddingVertical: hp("1.5%") }]}
                onPress={() => {
                  setOrderDetail(null);
                  setOrderItems([]);
                  navigation.navigate("PayOSPayment", { id_don_hang: orderDetail.id });
                }}
              >
                <Text style={styles.primaryButtonText}>Thanh toán ngay</Text>
              </TouchableOpacity>
            )}
            {orderDetail.tinh_trang === 4 && !orderDetail.da_danh_gia && (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, paddingVertical: hp("1.5%") }]}
                onPress={() =>
                  navigation.navigate("FoodReview", {
                    orderId: orderDetail.id,
                    madonHang: orderDetail.ma_don_hang,
                    tenQuanAn: orderDetail.ten_quan_an,
                    hinhAnhQuan: orderDetail.hinh_anh_quan,
                    orderItems: orderItems,
                    shipperName: orderDetail.ho_va_ten_shipper,
                    shipperAvatar: orderDetail.hinh_anh_shipper,
                  })
                }
              >
                <Text style={styles.primaryButtonText}>Đánh giá ngay</Text>
              </TouchableOpacity>
            )}
            {orderDetail.tinh_trang === 4 && (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, paddingVertical: hp("1.5%") }]}
                onPress={() => handleReorder(orderDetail.id)}
              >
                <Text style={styles.primaryButtonText}>Đặt lại</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  };

  // ── Render chính ──
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {orderDetail || loadingDetail ? (
        renderDetail()
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: wp("6%") }} />
            <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
            <View style={{ width: wp("6%") }} />
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Danh sách */}
          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={{ marginTop: 12, color: "#94A3B8", fontSize: 14 }}>Đang tải đơn hàng...</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredOrders()}
              renderItem={renderOrderCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 60 }}>
                  <Ionicons name="receipt-outline" size={60} color="#E2E8F0" />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 12 }}>
                    Không có đơn hàng
                  </Text>
                  <Text style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
                    {activeTab === "Đã nhận"
                      ? "Bạn chưa có đơn hàng nào đang chờ xử lý"
                      : activeTab === "Đang giao"
                      ? "Không có đơn nào đang trên đường giao"
                      : "Chưa có đơn hàng nào được giao xong"}
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertVisible(false)}
      />


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  detailContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  mapSection: {
    position: "relative",
    height: hp("50%"),
    backgroundColor: "#F5F5F5",
  },
  mapBackButton: {
    position: "absolute",
    top: hp("2%"),
    left: wp("4%"),
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  detailSheet: {
    flex: 1,
    marginTop: hp("-8%"),
    backgroundColor: "#FFF",
    borderTopLeftRadius: wp("5%"),
    borderTopRightRadius: wp("5%"),
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1.5%"),
    paddingBottom: hp("8%"),
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: hp("1%"),
    marginBottom: hp("1.5%"),
  },
  orderCode: {
    fontSize: wp("2.8%"),
    color: "#999",
    fontWeight: "500",
  },
  orderNameDetail: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: "#333",
    marginTop: hp("0.3%"),
  },
  statusBadgeContainer: {
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.5%"),
    backgroundColor: "#E63946",
    borderRadius: wp("2%"),
  },
  statusBadge: {
    fontSize: wp("3%"),
    fontWeight: "600",
    color: "#FFF",
  },
  statusBadgeCard: {
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("0.3%"),
    borderRadius: wp("1.5%"),
  },
  deliverySection: {
    marginHorizontal: wp("4%"),
    marginBottom: hp("2%"),
    paddingVertical: hp("1.5%"),
  },
  deliverySectionContainer: {
    marginHorizontal: wp("4%"),
    marginBottom: hp("2%"),
    paddingVertical: hp("1.5%"),
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("2%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  detailTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "600",
    color: "#333",
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("1.5%"),
  },
  deliveryTitle: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#333",
  },
  timeEstimate: {
    marginBottom: hp("2%"),
    paddingBottom: hp("2%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  timeLabel: {
    fontSize: wp("3%"),
    color: "#999",
    marginBottom: hp("0.5%"),
  },
  timeValue: {
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    color: "#333",
  },
  statusTabs: {
    flexDirection: "row",
    gap: wp("2%"),
    marginBottom: hp("2%"),
  },
  statusTab: {
    flex: 1,
    paddingVertical: hp("1%"),
    borderRadius: wp("2%"),
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTabActive: {
    backgroundColor: "#FFE8EC",
  },
  statusTabText: {
    fontSize: wp("2.5%"),
    color: "#999",
    fontWeight: "500",
  },
  statusTabTextActive: {
    color: "#E63946",
    fontWeight: "600",
  },
  statusContainer: {
    marginBottom: hp("2%"),
    paddingVertical: hp("1.5%"),
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusItem: {
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: wp("4%"),
    height: wp("4%"),
    borderRadius: wp("2%"),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("0.5%"),
  },
  statusDotActive: {
    width: wp("4%"),
    height: wp("4%"),
    borderRadius: wp("2%"),
    backgroundColor: "#E63946",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("0.5%"),
  },
  statusDotInner: {
    width: wp("1.5%"),
    height: wp("1.5%"),
    borderRadius: wp("0.75%"),
    backgroundColor: "#E63946",
  },
  statusLabel: {
    fontSize: wp("2.3%"),
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  statusLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E63946",
    marginHorizontal: wp("0.5%"),
    marginBottom: hp("2%"),
  },
  statusMessage: {
    fontSize: wp("3%"),
    color: "#666",
    lineHeight: hp("2%"),
  },
  shipperSection: {
    marginHorizontal: wp("4%"),
    marginBottom: hp("2%"),
    borderRadius: wp("3%"),
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    padding: wp("4%"),
  },
  shipperHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: hp("2%"),
  },
  shipperAvatar: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("6%"),
    marginRight: wp("3%"),
  },
  shipperInfo: {
    flex: 1,
  },
  shipperName: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#333",
    marginBottom: hp("0.5%"),
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("0.5%"),
  },
  rating: {
    fontSize: wp("3%"),
    color: "#333",
    marginLeft: wp("1%"),
    fontWeight: "500",
  },
  vehicle: {
    fontSize: wp("3%"),
    color: "#666",
  },
  phone: {
    fontSize: wp("3%"),
    color: "#999",
  },
  shipperActions: {
    flexDirection: "row",
    gap: wp("1%"),
    marginTop: hp("1.5%"),
  },
  actionButton: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: "#E63946",
    borderWidth: 1,
    borderColor: "#E63946",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton1: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: "#ffffffff",
    borderWidth: 1,
    borderColor: "#E63946",
    alignItems: "center",
    justifyContent: "center",
  },
  orderSection: {
    marginHorizontal: wp("4%"),
    marginBottom: hp("2%"),
  },
  orderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("1.5%"),
  },
  sectionTitle: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#333",
    marginBottom: hp("0.5%"),
  },
  storeInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: wp("3%"),
    backgroundColor: "#FFF",
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: hp("1.5%"),
  },
  storeImage: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("10%"),
    marginRight: wp("3%"),
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: "#333",
    marginBottom: hp("0.3%"),
  },
  storeLocation: {
    fontSize: wp("2.8%"),
    color: "#666",
  },
  itemsContainer: {
    borderRadius: wp("3%"),
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("3%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemQty: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: "#333",
    marginRight: wp("2%"),
  },
  itemName: {
    fontSize: wp("3%"),
    color: "#666",
    flex: 1,
  },
  itemPrice: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: "#333",
  },
  totalSection: {
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("3%"),
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: hp("0.4%"),
  },
  totalLabel: {
    fontSize: wp("3.5%"),
    fontWeight: "500",
    color: "#555",
  },
  totalPrice: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: "#333",
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginTop: hp("0.5%"),
    paddingTop: hp("1%"),
  },
  grandTotalLabel: {
    fontSize: wp("4%"),
    fontWeight: "800",
    color: "#0F172A",
  },
  grandTotalPrice: {
    fontSize: wp("4.5%"),
    fontWeight: "900",
    color: "#EE4D2D",
  },
  actionSection: {
    paddingHorizontal: wp("4%"),
    marginBottom: hp("3%"),
    gap: wp("2%"),
    flexDirection: "row",
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("3%"),
    borderRadius: wp("3%"),
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
    gap: wp("1.5%"),
  },
  supportButtonText: {
    fontSize: wp("3.2%"),
    color: "#666",
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flex: 1,
  },
  cancelButtonText: {
    fontSize: wp("3.5%"),
    color: "#333",
    fontWeight: "600",
  },
  // Nút yêu cầu hủy đơn — trên card
  cancelRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("1%"),
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("2.5%"),
    borderRadius: wp("3%"),
    borderWidth: 1.5,
    borderColor: "#EE4D2D",
    backgroundColor: "#FFF5F5",
  },
  cancelRequestButtonText: {
    fontSize: wp("2.8%"),
    color: "#EE4D2D",
    fontWeight: "700",
  },
  // Nút yêu cầu hủy đơn — trong detail view
  cancelRequestButtonDetail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("1.5%"),
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
    borderWidth: 1.5,
    borderColor: "#EE4D2D",
    backgroundColor: "#FFF5F5",
  },
  cancelRequestButtonDetailText: {
    fontSize: wp("3.2%"),
    color: "#EE4D2D",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("2%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "600",
    color: "#333",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingHorizontal: wp("4%"),
  },
  tab: {
    flex: 1,
    paddingVertical: hp("1.5%"),
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#E63946",
  },
  tabText: {
    fontSize: wp("3.5%"),
    color: "#999",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#E63946",
    fontWeight: "600",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    height: hp("0.5%"),
    width: "100%",
    backgroundColor: "#E63946",
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("2%"),
  },
  orderCard: {
    backgroundColor: "#FFF",
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: "#F0F0F0",
    padding: wp("3%"),
    marginBottom: hp("2%"),
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: hp("1.5%"),
  },
  orderImage: {
    width: wp("16%"),
    height: wp("16%"),
    borderRadius: wp("2%"),
    resizeMode: "cover",
    marginRight: wp("3%"),
  },
  orderHeaderInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: hp("0.5%"),
  },
  orderName: {
    fontSize: wp("3.8%"),
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: wp("2%"),
  },
  completedBadge: {
    backgroundColor: "#E8F5E9",
  },
  pendingBadge: {
    backgroundColor: "#FFE8EC",
  },
  statusText: {
    fontSize: wp("2.5%"),
    fontWeight: "600",
  },
  completedText: {
    color: "#4CAF50",
  },
  pendingText: {
    color: "#E63946",
  },
  orderLocation: {
    fontSize: wp("2.8%"),
    color: "#999",
    lineHeight: hp("1.8%"),
    marginBottom: hp("0.8%"),
  },
  priceTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: wp("3.8%"),
    fontWeight: "600",
    color: "#333",
  },
  time: {
    fontSize: wp("2.8%"),
    color: "#999",
  },
  cardFooter: {
    flexDirection: "row",
    gap: wp("2%"),
    marginTop: hp("1.5%"),
    paddingTop: hp("1.5%"),
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: hp("1.2%"),
    borderRadius: wp("3%"),
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  secondaryButtonText: {
    fontSize: wp("3.2%"),
    color: "#1E293B",
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    paddingVertical: hp("1.2%"),
    borderRadius: wp("3%"),
    backgroundColor: "#EE4D2D",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#EE4D2D",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  primaryButtonText: {
    fontSize: wp("3.2%"),
    color: "#FFF",
    fontWeight: "700",
  },
  detailButton: {
    flex: 1,
    paddingVertical: hp("1.2%"),
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: "#D0D0D0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9F9F9",
  },
  detailButtonText: {
    fontSize: wp("3.2%"),
    color: "#333",
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    gap: wp("2%"),
  },
  filterButton: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.8%"),
    borderRadius: wp("6%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  filterButtonActive: {
    backgroundColor: "#E63946",
    borderColor: "#E63946",
  },
  filterButtonText: {
    fontSize: wp("3.2%"),
    color: "#333",
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#FFF",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingVertical: hp("1%"),
    paddingBottom: hp("2%"),
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("0.5%"),
  },
  activeNavItem: {
    borderRadius: wp("2%"),
  },
  navText: {
    fontSize: wp("2.5%"),
    color: "#999",
    marginTop: hp("0.5%"),
    fontWeight: "500",
  },
  activeNavText: {
    color: "#E63946",
  },
});

export default Orders;