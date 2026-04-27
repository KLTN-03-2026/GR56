import React, { useState, useCallback, useMemo, memo, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import apiClient from "../../genaral/api";
import { getImageUrl } from "../../utils/imageHelper";
import ToastMessage from "../../components/ToastMessage";
import { SafeAreaView } from "react-native-safe-area-context";

// ════════════════════════════════════════════════════════
// Constants & Types
// ════════════════════════════════════════════════════════

const COLORS = { PRIMARY: "#EE4D2D", BG: "#F5F5F7" };

interface CartItem {
  id: number;
  id_mon_an: number;
  ten_mon_an: string;
  so_luong: number;
  don_gia: number;
  ghi_chu: string;
  thanh_tien: number;
  hinh_anh?: string;
  id_quan_an?: number;
}

interface Toast {
  visible: boolean;
  message: string;
  type: "success" | "error" | "info";
}

interface Voucher {
  id: number;
  ma_code: string;
  ten_voucher: string;
  loai_giam: number;
  so_giam_gia: number;
  so_tien_toi_da?: number;
  don_hang_toi_thieu: number;
  thoi_gian_ket_thuc: string;
  is_system?: boolean;
}

interface VoucherState {
  code: string;
  applied: boolean;
  info: Voucher | null;
  discount: number;
  applying: boolean;
}

interface Address {
  id: number;
  dia_chi: string;
  ten_quan_huyen: string;
  ten_tinh_thanh: string;
  ten_nguoi_nhan: string;
  so_dien_thoai: string;
}

interface UserInfo {
  diem_xu?: number;
}

interface PaymentMethod {
  value: "1" | "2";
  label: string;
  icon: string;
}

// ════════════════════════════════════════════════════════
// Utilities
// ════════════════════════════════════════════════════════

const formatPrice = (price: number): string => {
  if (!price) return "0đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

// ════════════════════════════════════════════════════════
// Sub-Components
// ════════════════════════════════════════════════════════

interface CartItemCardProps {
  item: CartItem;
  isSelected: boolean;
  onToggleSelect: (itemId: number) => void;
  onUpdateQuantity: (itemId: number, newQuantity: number) => void;
  onDelete: (itemId: number) => void;
  onAddNote?: (itemId: number, note: string) => void;
  onViewDetails?: (item: CartItem) => void;
}

const CartItemCard = memo<CartItemCardProps>(
  ({ item, isSelected, onToggleSelect, onUpdateQuantity, onDelete, onViewDetails }) => (
    <TouchableOpacity 
      style={s.cartItem}
      onPress={() => onViewDetails?.(item)}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <TouchableOpacity
        style={s.itemCheckbox}
        onPress={() => onToggleSelect(item.id)}
      >
        <View style={[s.checkbox, isSelected && s.checkboxActive]}>
          {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
        </View>
      </TouchableOpacity>

      {/* Product Image */}
      <Image
        source={{ uri: getImageUrl(item.hinh_anh) }}
        style={s.itemImage}
      />

      {/* Product Info */}
      <View style={s.itemInfo}>
        <Text style={s.itemName} numberOfLines={2}>
          {item.ten_mon_an}
        </Text>
        <Text style={s.itemPrice}>{formatPrice(item.don_gia)}</Text>
        {item.ghi_chu && (
          <Text style={s.itemNote} numberOfLines={1}>
            📝 {item.ghi_chu}
          </Text>
        )}
      </View>

      {/* Controls */}
      <View style={s.itemControls}>
        <View style={s.quantityControl}>
          <TouchableOpacity
            style={[s.qtyBtn, item.so_luong === 1 && s.qtyBtnDisabled]}
            onPress={() => {
              if (item.so_luong > 1) onUpdateQuantity(item.id, item.so_luong - 1);
            }}
            disabled={item.so_luong === 1}
          >
            <Ionicons name="remove" size={14} color="white" />
          </TouchableOpacity>

          <Text style={s.qtyText}>{item.so_luong}</Text>

          <TouchableOpacity
            style={s.qtyBtn}
            onPress={() => onUpdateQuantity(item.id, item.so_luong + 1)}
          >
            <Ionicons name="add" size={14} color="white" />
          </TouchableOpacity>
        </View>

        <View style={s.priceDelete}>
          <Text style={s.totalPrice}>{formatPrice(item.thanh_tien)}</Text>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => onDelete(item.id)}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
);

// ════════════════════════════════════════════════════════
// Product Detail Modal Component
// ════════════════════════════════════════════════════════

interface ProductDetailModalProps {
  visible: boolean;
  item: CartItem | null;
  onClose: () => void;
}

const ProductDetailModal = memo<ProductDetailModalProps>(
  ({ visible, item, onClose }) => {
    if (!item) return null;

    // Parse ghi_chu để lấy thông tin size, topping
    const parseNotes = (notes: string) => {
      const result = { size: "", toppings: [] as string[] };
      if (!notes) return result;

      const parts = notes.split("|");
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (trimmed.startsWith("Size:")) {
          result.size = trimmed.replace("Size:", "").trim();
        } else if (trimmed.startsWith("Toppings:")) {
          const toppingStr = trimmed.replace("Toppings:", "").trim();
          result.toppings = toppingStr.split(",").map((t) => t.trim()).filter(t => t);
        }
      });
      return result;
    };

    const parsedNotes = parseNotes(item.ghi_chu);

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={s.detailModalOverlay}>
          <View style={s.detailModalContainer}>
            {/* Header */}
            <View style={s.detailModalHeader}>
              <Text style={s.detailModalTitle}>Chi tiết sản phẩm</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={s.detailModalBody} showsVerticalScrollIndicator={false}>
              {/* Product Image */}
              <Image
                source={{ uri: getImageUrl(item.hinh_anh) }}
                style={s.detailProductImage}
              />

              {/* Product Info */}
              <View style={s.detailSection}>
                <Text style={s.detailProductName}>{item.ten_mon_an}</Text>
                <View style={s.detailPriceRow}>
                  <Text style={s.detailPrice}>{formatPrice(item.don_gia)}</Text>
                  <View style={s.detailQuantityBadge}>
                    <Text style={s.detailQuantityText}>x{item.so_luong}</Text>
                  </View>
                </View>
              </View>

              {/* Size Info */}
              {parsedNotes.size && (
                <View style={s.detailSection}>
                  <Text style={s.detailSectionTitle}>Kích cỡ</Text>
                  <View style={s.detailSizeBox}>
                    <Text style={s.detailSizeText}>{parsedNotes.size}</Text>
                  </View>
                </View>
              )}

              {/* Toppings Info */}
              {parsedNotes.toppings.length > 0 && (
                <View style={s.detailSection}>
                  <Text style={s.detailSectionTitle}>Topping</Text>
                  <View style={s.detailToppingsList}>
                    {parsedNotes.toppings.map((topping, index) => (
                      <View key={index} style={s.detailToppingItem}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
                        <Text style={s.detailToppingName}>{topping}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Cost Breakdown */}
              <View style={s.detailSection}>
                <Text style={s.detailSectionTitle}>Chi tiết giá</Text>
                <View style={s.detailCostBreakdown}>
                  <View style={s.detailCostRow}>
                    <Text style={s.detailCostLabel}>Giá gốc:</Text>
                    <Text style={s.detailCostValue}>{formatPrice(item.don_gia)}</Text>
                  </View>
                  <View style={s.detailCostRow}>
                    <Text style={s.detailCostLabel}>Số lượng:</Text>
                    <Text style={s.detailCostValue}>{item.so_luong}</Text>
                  </View>
                  <View style={[s.detailCostRow, s.detailCostRowTotal]}>
                    <Text style={s.detailCostLabelTotal}>Thành tiền:</Text>
                    <Text style={s.detailCostValueTotal}>{formatPrice(item.thanh_tien)}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Close Button */}
            <View style={s.detailModalFooter}>
              <TouchableOpacity style={s.detailCloseBtn} onPress={onClose}>
                <Text style={s.detailCloseBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
);

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════

const Cart = ({ navigation }: any) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>({
    visible: false,
    message: "",
    type: "success",
  });

  // Product Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number>(0);
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [paymentMethod, setPaymentMethod] = useState<"1" | "2">("1");
  const [useXuPoints, setUseXuPoints] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);

  const [voucher, setVoucher] = useState<VoucherState>({
    code: "",
    applied: false,
    info: null,
    discount: 0,
    applying: false,
  });

  const [suggestedVouchers, setSuggestedVouchers] = useState<Voucher[]>([]);
  const [loadingSuggestedVouchers, setLoadingSuggestedVouchers] = useState(false);

  console.log("🟢 Cart render - showCheckoutModal:", showCheckoutModal);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Toast Helper
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ visible: true, message, type });
    },
    []
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Computed Values
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const totalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.thanh_tien, 0),
    [cartItems]
  );

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.so_luong, 0),
    [cartItems]
  );

  // Tổng tiền và số lượng của các món đã chọn
  const selectedTotal = useMemo(
    () => cartItems
      .filter(item => selectedIds.has(item.id))
      .reduce((sum, item) => sum + item.thanh_tien, 0),
    [cartItems, selectedIds]
  );

  const selectedCount = useMemo(
    () => cartItems.filter(item => selectedIds.has(item.id)).length,
    [cartItems, selectedIds]
  );

  const isAllSelected = cartItems.length > 0 && selectedCount === cartItems.length;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Computed Values (Checkout)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const xuPointsAvailable = useMemo(
    () => Math.min(userInfo.diem_xu || 0, Math.max(0, selectedTotal + shippingFee - voucher.discount)),
    [userInfo.diem_xu, selectedTotal, shippingFee, voucher.discount]
  );

  const xuPointsUsed = useMemo(
    () => (useXuPoints ? xuPointsAvailable : 0),
    [useXuPoints, xuPointsAvailable]
  );

  const finalTotal = useMemo(
    () => Math.max(0, selectedTotal + shippingFee - voucher.discount - xuPointsUsed),
    [selectedTotal, shippingFee, voucher.discount, xuPointsUsed]
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Data Loading
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      // Đọc restaurantId đã lưu từ lần dùng RestaurantDetail gần nhất
      const savedId = await AsyncStorage.getItem("last_restaurant_id");
      setRestaurantId(savedId);

      if (!savedId) {
        setCartItems([]);
        return;
      }

      const res = await apiClient.get(`/khach-hang/don-dat-hang/${savedId}`);

      console.log("loadCart API response:", JSON.stringify(res.data));

      if (res.data?.status) {
        const items = res.data.gio_hang || [];
        const dishes = res.data.mon_an || [];
        const processedItems = items.map((item: any) => {
          const dish = dishes.find((d: any) => d.id === item.id_mon_an);
          return {
            ...item,
            id_quan_an: Number(savedId),
            hinh_anh: dish?.hinh_anh ?? item.hinh_anh ?? null,
            thanh_tien: item.thanh_tien || item.don_gia * item.so_luong,
          };
        });
        setCartItems(processedItems);
        // Mặc định chọn tất cả khi load
        setSelectedIds(new Set(processedItems.map((i: CartItem) => i.id)));
      } else {
        console.log("loadCart: status false, message:", res.data?.message);
        setCartItems([]);
      }
    } catch (error) {
      console.log("Load cart error:", error);
      showToast("Không thể tải giỏ hàng!", "error");
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Ref để biết có cần mở lại modal không khi quay lại
  const reopenModalRef = React.useRef(false);

  // Mỗi khi Cart lấy lại focus
  useFocusEffect(
    useCallback(() => {
      loadCart();
      // Nếu từ AddressBook quay về → mở lại modal (modal open sẽ tự load địa chỉ)
      if (reopenModalRef.current) {
        reopenModalRef.current = false;
        setShowCheckoutModal(true);
      }
    }, [loadCart, setShowCheckoutModal])
  );

  // Mỗi khi modal checkout MỞ LÊN: load lại danh sách địa chỉ mới nhất
  useEffect(() => {
    if (showCheckoutModal) {
      loadAddresses();
    }
  }, [showCheckoutModal, loadAddresses]);

  // Cập nhật phí giao hàng khi chọn địa chỉ (gọi API thật)
  useEffect(() => {
    if (!selectedAddressId || !restaurantId) {
      setShippingFee(0);
      return;
    }
    const fetchShipping = async () => {
      try {
        const res = await apiClient.post("/khach-hang/don-dat-hang/phi-ship", {
          id_quan_an: Number(restaurantId),
          id_dia_chi_khach: selectedAddressId,
        });
        if (res.data?.status) {
          setShippingFee(res.data.phi_ship || 0);
        } else {
          setShippingFee(0);
        }
      } catch {
        setShippingFee(0);
      }
    };
    fetchShipping();
  }, [selectedAddressId, restaurantId]);

  // Load địa chỉ của người dùng
  const loadAddresses = useCallback(async () => {
    try {
      const res = await apiClient.get("/khach-hang/dia-chi/data");
      if (res.data?.status && res.data?.data) {
        const list: Address[] = res.data.data;
        setAddresses(list);
        // Nếu địa chỉ đang chọn không còn tồn tại (bị xóa) → reset về địa chỉ đầu tiên hoặc 0
        setSelectedAddressId(prev => {
          const stillExists = list.some(a => a.id === prev);
          if (stillExists) return prev;
          return list.length > 0 ? list[0].id : 0;
        });
      } else {
        setAddresses([]);
        setSelectedAddressId(0);
      }
    } catch (error) {
      console.log("Load addresses error:", error);
    }
  }, []);

  // Load thông tin người dùng
  const loadUserInfo = useCallback(async () => {
    try {
      const res = await apiClient.get("/khach-hang/data-login");
      if (res.data?.status && res.data?.data) {
        setUserInfo(res.data.data);
      }
    } catch (error) {
      console.log("Load user info error:", error);
    }
  }, []);

  // Load voucher được đề xuất
  const loadSuggestedVouchers = useCallback(async () => {
    if (!restaurantId || selectedTotal <= 0) return;

    setLoadingSuggestedVouchers(true);
    try {
      const res = await apiClient.get("/khach-hang/voucher/de-xuat", {
        params: {
          id_quan_an: restaurantId,
          tong_tien: selectedTotal,
        },
      });

      if (res.data?.status && res.data?.data) {
        setSuggestedVouchers(res.data.data || []);
      }
    } catch (error) {
      console.log("Load suggested vouchers error:", error);
    } finally {
      setLoadingSuggestedVouchers(false);
    }
  }, [restaurantId, selectedTotal]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Cart Operations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Toggle chọn 1 món
  const toggleSelect = useCallback((itemId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }, []);

  // Chọn / bỏ chọn tất cả
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cartItems.map(i => i.id)));
    }
  }, [isAllSelected, cartItems]);

  const updateQuantity = useCallback(
    async (itemId: number, newQuantity: number) => {
      if (newQuantity < 1) return;

      // Tìm item cần update
      const item = cartItems.find((i) => i.id === itemId);
      if (!item) return;

      // Cập nhật UI ngay lập tức
      const updatedItems = cartItems.map((i) =>
        i.id === itemId
          ? {
              ...i,
              so_luong: newQuantity,
              thanh_tien: i.don_gia * newQuantity,
            }
          : i
      );
      setCartItems(updatedItems);

      // Gọi API để lưu trên server
      try {
        const response = await apiClient.post(
          "/khach-hang/don-dat-hang/update",
          {
            id: item.id,
            id_mon_an: item.id_mon_an,
            so_luong: newQuantity,
            ghi_chu: item.ghi_chu || "",
          }
        );

        if (!response.data?.status) {
          // Nếu API fail, reload lại
          loadCart();
          showToast("Cập nhật thất bại, đang tải lại...", "error");
        }
      } catch (error: any) {
        console.log("Update quantity error:", error);
        loadCart();
        showToast(error.response?.data?.message || "Cập nhật thất bại!", "error");
      }
    },
    [cartItems, loadCart, showToast]
  );

  const deleteItem = useCallback(
    async (itemId: number) => {
      // Xóa từ UI ngay lập tức
      setCartItems((prev) => prev.filter((i) => i.id !== itemId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(itemId); return next; });
      showToast("Đã xóa khỏi giỏ hàng", "success");

      // Gọi API để xóa trên server
      try {
        const response = await apiClient.post(
          "/khach-hang/don-dat-hang/delete",
          {
            id: itemId
          }
        );

        if (!response.data?.status) {
          // Nếu API fail, reload lại
          loadCart();
        }
      } catch (error: any) {
        console.log("Delete item error:", error);
        loadCart();
      }
    },
    [cartItems, loadCart, showToast]
  );

  const clearCart = useCallback(async () => {
    if (cartItems.length === 0) return;

    try {
      // Xóa tất cả items
      const deletePromises = cartItems.map((item) =>
        apiClient.post("/khach-hang/don-dat-hang/delete", {
          id: item.id
        })
      );

      await Promise.all(deletePromises);
      setCartItems([]);
      showToast("Đã xóa toàn bộ giỏ hàng", "success");
    } catch (error: any) {
      console.log("Clear cart error:", error);
      showToast("Lỗi khi xóa giỏ hàng!", "error");
    }
  }, [cartItems, showToast]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Voucher Operations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const applyVoucher = useCallback(async () => {
    if (!voucher.code) {
      showToast("Vui lòng nhập mã voucher", "error");
      return;
    }

    setVoucher((prev) => ({ ...prev, applying: true }));

    try {
      const res = await apiClient.post(
        "/khach-hang/don-dat-hang/app-voucher",
        {
          ma_code: voucher.code,
          id_quan_an: restaurantId,
        }
      );

      if (res.data?.status) {
        setVoucher((prev) => ({
          ...prev,
          applied: true,
          info: res.data.data.voucher,
          discount: res.data.data.so_tien_giam,
          applying: false,
        }));
        showToast("Áp dụng voucher thành công!", "success");
      } else {
        setVoucher((prev) => ({ ...prev, applying: false }));
        showToast(res.data?.message || "Không thể áp dụng voucher", "error");
      }
    } catch (error: any) {
      setVoucher((prev) => ({ ...prev, applying: false }));
      const errorMsg = error.response?.data?.message || "Lỗi khi áp dụng voucher";
      showToast(errorMsg, "error");
    }
  }, [voucher.code, restaurantId, showToast]);

  const applySuggestedVoucher = useCallback(
    async (suggestedVoucher: Voucher) => {
      setVoucher((prev) => ({
        ...prev,
        code: suggestedVoucher.ma_code,
        applying: true,
      }));

      try {
        const res = await apiClient.post(
          "/khach-hang/don-dat-hang/app-voucher",
          {
            ma_code: suggestedVoucher.ma_code,
            id_quan_an: restaurantId,
          }
        );

        if (res.data?.status) {
          setVoucher({
            code: suggestedVoucher.ma_code,
            applied: true,
            info: res.data.data.voucher || suggestedVoucher,
            discount: res.data.data.so_tien_giam || 0,
            applying: false,
          });
          setSuggestedVouchers([]);
          showToast(
            `Áp dụng voucher ${suggestedVoucher.ten_voucher} thành công!`,
            "success"
          );
        } else {
          setVoucher((prev) => ({ ...prev, applying: false }));
          showToast(res.data?.message || "Không thể áp dụng voucher", "error");
        }
      } catch (error: any) {
        setVoucher((prev) => ({ ...prev, applying: false }));
        const errorMsg = error.response?.data?.message || "Lỗi khi áp dụng voucher";
        showToast(errorMsg, "error");
      }
    },
    [restaurantId, showToast]
  );

  const removeVoucher = useCallback(() => {
    setVoucher({
      code: "",
      applied: false,
      info: null,
      discount: 0,
      applying: false,
    });
    showToast("Đã hủy voucher", "info");
  }, [showToast]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Order Placement
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const placeOrder = useCallback(
    async (method: "1" | "2") => {
      if (selectedIds.size === 0) {
        showToast("Vui lòng chọn ít nhất một sản phẩm", "error");
        return;
      }

      if (!selectedAddressId) {
        showToast("Vui lòng chọn địa chỉ giao hàng", "error");
        return;
      }

      try {
        const endpoint =
          method === "1"
            ? "/khach-hang/xac-nhan-dat-hang-tien-mat"
            : "/khach-hang/xac-nhan-dat-hang";

        let url = `${endpoint}/${restaurantId}/${selectedAddressId}`;

        if (voucher.applied && voucher.info) {
          url += `?id_voucher=${voucher.info.id}`;
        }
        if (useXuPoints && xuPointsUsed > 0) {
          url += (url.includes("?") ? "&" : "?") + `su_dung_xu=${xuPointsUsed}`;
        }

        const res = await apiClient.get(url);

        if (res.data?.status) {
          showToast(res.data.message || "Đặt hàng thành công!", "success");
          setCartItems([]);
          setShowCheckoutModal(false);
          setSelectedIds(new Set());
          setVoucher({
            code: "",
            applied: false,
            info: null,
            discount: 0,
            applying: false,
          });
          setUseXuPoints(false);
          
          if (method === "1") {
            navigation.navigate("MainTabs", { screen: "Orders" });
          }
        } else {
          showToast("Hệ thống bị lỗi, vui lòng thử lại!", "error");
        }
      } catch (error: any) {
        const errors = error.response?.data?.errors;
        if (errors) {
          Object.values(errors).forEach((err: any) => {
            showToast(err[0], "error");
          });
        } else {
          showToast("Đặt hàng thất bại", "error");
        }
      }
    },
    [selectedIds.size, selectedAddressId, restaurantId, voucher.applied, voucher.info, useXuPoints, xuPointsUsed, showToast, navigation]
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Render: Loading
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={s.loadingText}>Đang tải giỏ hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Render: Main
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <>
      <SafeAreaView style={s.root}>
        <StatusBar backgroundColor={COLORS.PRIMARY} barStyle="light-content" />

        {/* Header */}
        <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Giỏ Hàng</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Empty Cart */}
      {cartItems.length === 0 ? (
        <ScrollView
          style={s.emptyContainer}
          contentContainerStyle={s.emptyContent}
        >
          <Ionicons name="cart" size={80} color="#E2E8F0" />
          <Text style={s.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={s.emptySubtitle}>
            Thêm những món ăn yêu thích vào giỏ hàng
          </Text>
          <TouchableOpacity
            style={s.continueButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={16} color="white" />
            <Text style={s.continuButtonText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          {/* Cart Items List */}
          <ScrollView style={s.listContainer}>
            <View style={s.itemsSection}>
              <View style={s.sectionHeader}>
                <TouchableOpacity
                  style={s.selectAllRow}
                  onPress={toggleSelectAll}
                >
                  <View style={[s.checkbox, isAllSelected && s.checkboxActive]}>
                    {isAllSelected && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                  <Text style={s.selectAllText}>
                    {isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"} ({totalItems} sản phẩm)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearCart}>
                  <Text style={s.clearText}>Xóa tất cả</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={cartItems}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <CartItemCard
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={toggleSelect}
                    onUpdateQuantity={updateQuantity}
                    onDelete={deleteItem}
                    onViewDetails={(cartItem) => {
                      setSelectedItem(cartItem);
                      setShowDetailModal(true);
                    }}
                  />
                )}
                ItemSeparatorComponent={() => <View style={s.separator} />}
              />
            </View>
          </ScrollView>

          {/* Summary & Checkout */}
          <View style={s.footer}>
            {/* Price Summary */}
            <View style={s.summary}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Đã chọn ({selectedCount} món):</Text>
                <Text style={s.summaryValue}>{formatPrice(selectedTotal)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Phí giao hàng:</Text>
                <Text style={s.summaryValue}>Tính sau</Text>
              </View>
              <View style={s.divider} />
              <View style={s.summaryRow}>
                <Text style={s.totalLabel}>Tổng thanh toán:</Text>
                <Text style={s.totalValue}>{formatPrice(selectedTotal)}</Text>
              </View>
            </View>

            {/* Checkout Button */}
            <TouchableOpacity
              style={s.checkoutBtn}
              onPress={() => {
                if (selectedIds.size === 0) {
                  showToast("Vui lòng chọn ít nhất một sản phẩm", "error");
                  return;
                }
                loadUserInfo();
                loadSuggestedVouchers();
                setUseXuPoints(false);
                setShowCheckoutModal(true); // useEffect sẽ tự gọi loadAddresses()
              }}
            >
              <Text style={s.checkoutBtnText}>Đặt hàng ngay</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Toast */}
      {toast.visible && (
        <ToastMessage
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        visible={showDetailModal}
        item={selectedItem}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
      />
    </SafeAreaView>

    {/* Checkout Modal */}
    <Modal
      visible={showCheckoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chi tiết đơn hàng</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {/* Address Selection */}
              <View style={s.modalSection}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={s.modalSectionTitle}>Địa chỉ nhận hàng</Text>
                  <TouchableOpacity
                    onPress={() => {
                      reopenModalRef.current = true;
                      setShowCheckoutModal(false);
                      navigation.navigate("AddressBook");
                    }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                  >
                    <Ionicons name="location-outline" size={16} color={COLORS.PRIMARY} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.PRIMARY }}>Quản lý địa chỉ</Text>
                  </TouchableOpacity>
                </View>
                {addresses.length > 0 ? (
                  <View style={s.addressSelect}>
                    {addresses.map((addr) => (
                      <TouchableOpacity
                        key={addr.id}
                        style={[s.addressOption, selectedAddressId === addr.id && s.addressOptionActive]}
                        onPress={() => setSelectedAddressId(addr.id)}
                      >
                        <Ionicons
                          name={selectedAddressId === addr.id ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={selectedAddressId === addr.id ? COLORS.PRIMARY : "#CCC"}
                        />
                        <View style={s.addressInfo}>
                          <Text style={s.addressName}>{addr.ten_nguoi_nhan}</Text>
                          <Text style={s.addressContact}>{addr.so_dien_thoai}</Text>
                          <Text style={s.addressContact} numberOfLines={2}>
                            {addr.dia_chi}, {addr.ten_quan_huyen}, {addr.ten_tinh_thanh}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={s.noDataText}>Chưa có địa chỉ nhận hàng</Text>
                )}
              </View>

              {/* Order Items */}
              <View style={s.modalSection}>
                <Text style={s.modalSectionTitle}>Chi tiết món ăn</Text>
                <FlatList
                  data={Array.from(cartItems).filter(item => selectedIds.has(item.id))}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={s.orderItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.orderItemName}>{item.ten_mon_an}</Text>
                        <Text style={s.orderItemPrice}>{formatPrice(item.thanh_tien)}</Text>
                      </View>
                      <Text style={s.orderItemQty}>x{item.so_luong}</Text>
                    </View>
                  )}
                />
              </View>

              {/* Voucher Section */}
              <View style={s.modalSection}>
                <Text style={s.modalSectionTitle}>Mã giảm giá</Text>
                {!voucher.applied ? (
                  <View style={s.voucherInput}>
                    <Ionicons name="pricetag" size={16} color={COLORS.PRIMARY} />
                    <TextInput
                      style={s.voucherInputField}
                      placeholder="Nhập mã giảm giá"
                      value={voucher.code}
                      onChangeText={(text) => setVoucher((prev) => ({ ...prev, code: text }))}
                      editable={!voucher.applied}
                    />
                    <TouchableOpacity
                      style={[s.voucherButton, voucher.applying && { opacity: 0.6 }]}
                      onPress={applyVoucher}
                      disabled={voucher.applying}
                    >
                      <Text style={s.voucherButtonText}>
                        {voucher.applying ? "..." : "Áp dụng"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[s.voucherApplied, { backgroundColor: "#ECFDF5" }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.voucherAppliedName}>{voucher.info?.ten_voucher}</Text>
                      <Text style={s.voucherAppliedDiscount}>
                        Tiết kiệm {formatPrice(voucher.discount)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={removeVoucher}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Suggested Vouchers */}
              {!voucher.applied && suggestedVouchers.length > 0 && (
                <View style={s.suggestedVouchersContainer}>
                  <Text style={s.modalSectionTitle}>💡 Gợi ý cho bạn</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestedVouchersList}>
                    {suggestedVouchers.map((sv, index) => {
                      const discountText =
                        sv.loai_giam === 1
                          ? `${sv.so_giam_gia}%`
                          : formatPrice(sv.so_giam_gia);

                      return (
                        <TouchableOpacity
                          key={index}
                          style={s.suggestedVoucherCard}
                          onPress={() => applySuggestedVoucher(sv)}
                          activeOpacity={0.7}
                        >
                          <View style={s.suggestedVoucherBadge}>
                            <Text style={s.suggestedVoucherDiscount}>{discountText}</Text>
                          </View>
                          <View style={s.suggestedVoucherInfo}>
                            <Text style={s.suggestedVoucherName} numberOfLines={2}>
                              {sv.ten_voucher}
                            </Text>
                            <Text style={s.suggestedVoucherCode}>{sv.ma_code}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Xu Section */}
              <View style={s.modalSection}>
                <View style={s.xuRow}>
                  <Ionicons name="gift" size={16} color="#F59E0B" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.xuTitle}>FoodBeeq Xu</Text>
                    <Text style={s.xuAvailable}>
                      Có sẵn: {userInfo?.diem_xu || 0} xu (≈ {formatPrice(userInfo?.diem_xu || 0)})
                    </Text>
                    {useXuPoints && xuPointsUsed > 0 && (
                      <Text style={s.xuUsing}>
                        Sẽ trừ: {formatPrice(xuPointsUsed)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={s.xuToggle}
                    onPress={() => setUseXuPoints(!useXuPoints)}
                    disabled={(userInfo?.diem_xu || 0) === 0}
                  >
                    <Ionicons
                      name={useXuPoints ? "radio-button-on" : "radio-button-off"}
                      size={26}
                      color={
                        (userInfo?.diem_xu || 0) === 0
                          ? "#CBD5E1"
                          : useXuPoints
                          ? COLORS.PRIMARY
                          : "#CCC"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Method */}
              <View style={s.modalSection}>
                <Text style={s.modalSectionTitle}>Phương thức thanh toán</Text>
                <View style={s.paymentOptions}>
                  <TouchableOpacity
                    style={[s.paymentOption, paymentMethod === "1" && s.paymentOptionActive]}
                    onPress={() => setPaymentMethod("1")}
                  >
                    <Ionicons
                      name="cash"
                      size={18}
                      color={paymentMethod === "1" ? COLORS.PRIMARY : "#CCC"}
                    />
                    <Text style={s.paymentLabel}>Tiền mặt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.paymentOption, paymentMethod === "2" && s.paymentOptionActive]}
                    onPress={() => setPaymentMethod("2")}
                  >
                    <Ionicons
                      name="qr-code"
                      size={18}
                      color={paymentMethod === "2" ? COLORS.PRIMARY : "#CCC"}
                    />
                    <Text style={s.paymentLabel}>Chuyển khoản</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Order Summary */}
              <View style={s.orderSummary}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Tạm tính</Text>
                  <Text style={s.summaryValue}>{formatPrice(selectedTotal)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Phí giao hàng</Text>
                  <Text style={s.summaryValue}>{formatPrice(shippingFee)}</Text>
                </View>
                {voucher.discount > 0 && (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Giảm giá voucher</Text>
                    <Text style={[s.summaryValue, { color: "#10B981" }]}>
                      -{formatPrice(voucher.discount)}
                    </Text>
                  </View>
                )}
                {xuPointsUsed > 0 && (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Trừ Xu</Text>
                    <Text style={[s.summaryValue, { color: "#10B981" }]}>
                      -{formatPrice(xuPointsUsed)}
                    </Text>
                  </View>
                )}
                <View style={[s.summaryRow, s.totalRow]}>
                  <Text style={s.totalLabel}>Tổng thanh toán</Text>
                  <Text style={s.totalValue}>{formatPrice(finalTotal)}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={s.modalFooter}>
              <TouchableOpacity
                style={s.cancelButton}
                onPress={() => setShowCheckoutModal(false)}
              >
                <Text style={s.cancelButtonText}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmButton}
                onPress={() => {
                  placeOrder(paymentMethod);
                }}
              >
                <Text style={s.confirmButtonText}>Đặt hàng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.BG,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Header ━━━━━━━━━━━━━━━━

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.3,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Loading ━━━━━━━━━━━━━━━━

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Empty State ━━━━━━━━━━━━━━━━

  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: "row",
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    elevation: 2,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  continuButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.2,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ List ━━━━━━━━━━━━━━━━

  listContainer: {
    flex: 1,
  },
  itemsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Cart Item ━━━━━━━━━━━━━━━━

  cartItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 10,
  },
  itemCheckbox: {
    paddingVertical: 8,
  },
  itemImage: {
    width: 90,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    resizeMode: "cover",
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 16,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.PRIMARY,
    letterSpacing: 0.2,
  },
  itemNote: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
  },

  itemControls: {
    gap: 10,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnDisabled: {
    backgroundColor: "#CBD5E1",
    opacity: 0.5,
  },
  qtyText: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },

  priceDelete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  totalPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.PRIMARY,
    minWidth: 50,
    textAlign: "right",
    letterSpacing: 0.2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },

  separator: {
    height: 10,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Footer ━━━━━━━━━━━━━━━━

  footer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 14,
  },

  summary: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.2,
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 2,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.PRIMARY,
    letterSpacing: 0.3,
  },

  checkoutBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 3,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.2,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Modal ━━━━━━━━━━━━━━━━

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "92%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // Address
  addressSelect: {
    gap: 12,
  },
  addressOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  addressOptionActive: {
    backgroundColor: "#ECFDF5",
    borderColor: COLORS.PRIMARY,
  },
  addressInfo: {
    flex: 1,
    gap: 4,
  },
  addressName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  addressContact: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  noDataText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 12,
  },

  // Order Items
  orderItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.PRIMARY,
    marginTop: 4,
  },
  orderItemQty: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  // Voucher
  voucherInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  voucherInputField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: "#0F172A",
  },
  voucherButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  voucherButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  voucherApplied: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  voucherAppliedName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  voucherAppliedDiscount: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
    marginTop: 2,
  },

  // Suggested Vouchers
  suggestedVouchersContainer: {
    marginBottom: 20,
  },
  suggestedVouchersList: {
    gap: 10,
  },
  suggestedVoucherCard: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FEDBA8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginRight: 10,
    minWidth: 160,
    gap: 10,
    alignItems: "center",
  },
  suggestedVoucherBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  suggestedVoucherDiscount: {
    fontSize: 12,
    fontWeight: "900",
    color: "white",
  },
  suggestedVoucherInfo: {
    flex: 1,
    gap: 2,
  },
  suggestedVoucherName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  suggestedVoucherCode: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  suggestedVoucherMinimum: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },

  // Xu Points
  xuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  xuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  xuAvailable: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  xuUsing: {
    fontSize: 11,
    color: "#F59E0B",
    fontWeight: "600",
    marginTop: 2,
  },
  xuToggle: {
    paddingVertical: 8,
  },

  // Payment Options
  paymentOptions: {
    flexDirection: "row",
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  paymentOptionActive: {
    backgroundColor: "#ECFDF5",
    borderColor: COLORS.PRIMARY,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },

  // Order Summary
  orderSummary: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 20,
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  // Modal Footer
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.2,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.2,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Detail Modal ━━━━━━━━━━━━━━━━

  detailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  detailModalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "85%",
    overflow: "hidden",
  },
  detailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  detailModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  detailModalBody: {
    flex: 1,
  },

  detailProductImage: {
    width: "100%",
    height: 280,
    backgroundColor: "#F1F5F9",
    resizeMode: "cover",
  },

  detailSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  detailProductName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  detailPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  detailPrice: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.PRIMARY,
    letterSpacing: 0.3,
  },

  detailQuantityBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },

  detailQuantityText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },

  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  detailSizeBox: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },

  detailSizeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  detailToppingsList: {
    gap: 10,
  },

  detailToppingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
  },

  detailToppingName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },

  detailCostBreakdown: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },

  detailCostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  detailCostLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  detailCostValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  detailCostRowTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  detailCostLabelTotal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.1,
  },

  detailCostValueTotal: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.PRIMARY,
    letterSpacing: 0.2,
  },

  detailModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  detailCloseBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  detailCloseBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.2,
  },
});

export default Cart;
