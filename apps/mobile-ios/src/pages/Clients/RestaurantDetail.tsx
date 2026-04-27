import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import {
  Text, View, ScrollView, StyleSheet, TextInput, TouchableOpacity, Image,
  FlatList, StatusBar, Platform, ActivityIndicator, Modal, Dimensions, Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import apiClient from "../../genaral/api";
import { getImageUrl } from "../../utils/imageHelper";
import ToastMessage from "../../components/ToastMessage";
import AddToCartModal from "../../components/AddToCartModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ════════════════════════════════════════════════════════
// THEME & CONSTANTS
// ════════════════════════════════════════════════════════
const COLORS = {
  PRIMARY: "#EE4D2D",
  PRIMARY_DARK: "#C94020",
  BG: "#F7F8FA",
  WHITE: "#FFFFFF",
  TEXT_PRIMARY: "#12192C",
  TEXT_SECONDARY: "#6B7280",
  TEXT_MUTED: "#9CA3AF",
  BORDER: "#EAECF0",
  SUCCESS: "#10B981",
  ERROR: "#EF4444",
  WARNING: "#F59E0B",
  CARD_SHADOW: "#0F172A",
};

const SPACING = { GUTTER: 16, PADDING: 20, GAP: 8 };
const HERO_IMAGE_HEIGHT = 260;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PAYMENT_METHODS = [
  {
    value: "1",
    label: "Tiền mặt",
    icon: "cash-outline",
    description: "Thanh toán khi nhận hàng",
  },
  {
    value: "2",
    label: "Chuyển khoản",
    icon: "qr-code-outline",
    description: "Qua cổng PayOS",
  },
];

// ════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════
interface RestaurantInfo {
  id: number;
  ten_quan_an: string;
  dia_chi: string;
  hinh_anh: string | null;
  gio_mo_cua: string;
  gio_dong_cua: string;
}

interface Dish {
  id: number;
  ten_mon_an: string;
  gia_ban: number;
  gia_khuyen_mai: number;
  hinh_anh: string | null;
  id_quan_an: number;
  sizes?: Array<{ id: number; ten_size: string; gia_them: number }>;
}

interface CartItem {
  id: number;
  id_mon_an: number;
  ten_mon_an: string;
  so_luong: number;
  don_gia: number;
  ghi_chu: string;
  thanh_tien: number;
}

interface Address {
  id: number;
  dia_chi: string;
  ten_quan_huyen: string;
  ten_tinh_thanh: string;
  ten_nguoi_nhan: string;
  so_dien_thoai: string;
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

interface ToastState {
  visible: boolean;
  message: string;
  type: "success" | "error" | "info";
}

// ════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════

/**
 * Format price to Vietnamese currency format
 * @example formatPrice(15000) => "15.000đ"
 */
const formatPrice = (price: number): string => {
  if (!price) return "0đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

/**
 * Calculate discount percentage
 * @example calcDiscount(100000, 80000) => 20
 */
const calculateDiscountPercentage = (original: number, discounted: number): number => {
  if (original <= 0 || discounted >= original) return 0;
  return Math.round(((original - discounted) / original) * 100);
};

/**
 * Check if restaurant is currently open
 */
const isRestaurantOpen = (openTime: string, closeTime: string): boolean => {
  if (!openTime || !closeTime) return false;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const current = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return openTime <= closeTime
    ? current >= openTime && current <= closeTime
    : current >= openTime || current <= closeTime;
};

// ════════════════════════════════════════════════════════
// CUSTOM HOOKS
// ════════════════════════════════════════════════════════

/**
 * Manage toast notifications
 */
const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  const show = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ visible: true, message, type });
    },
    []
  );

  const hide = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toast, show, hide };
};

/**
 * Manage cart state and operations
 */
const useCartLogic = (showToast: (msg: string, type?: any) => void) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.thanh_tien, 0),
    [cartItems]
  );
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.so_luong, 0),
    [cartItems]
  );

  const updateQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      if (quantity < 1) return;
      const item = cartItems.find((i) => i.id === itemId);
      if (!item) return;

      setCartItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, so_luong: quantity, thanh_tien: i.don_gia * quantity }
            : i
        )
      );

      try {
        const res = await apiClient.post("/khach-hang/don-dat-hang/update", {
          id: itemId,
          id_mon_an: item.id_mon_an,
          so_luong: quantity,
          ghi_chu: item.ghi_chu || "",
        });
        if (!res.data?.status) showToast("Cập nhật thất bại", "error");
      } catch {
        showToast("Cập nhật thất bại", "error");
      }
    },
    [cartItems, showToast]
  );

  const deleteItem = useCallback(
    async (itemId: number) => {
      setCartItems((prev) => prev.filter((i) => i.id !== itemId));
      showToast("Đã xóa khỏi giỏ hàng", "success");

      try {
        const res = await apiClient.post("/khach-hang/don-dat-hang/delete", {
          id: itemId,
        });
        if (!res.data?.status) showToast("Xóa thất bại", "error");
      } catch {
        showToast("Xóa thất bại", "error");
      }
    },
    [showToast]
  );

  return { cartItems, setCartItems, cartTotal, cartCount, updateQuantity, deleteItem };
};

/**
 * Manage voucher logic
 */
const useVoucherLogic = (restaurantId: number, showToast: (msg: string, type?: any) => void) => {
  const [voucher, setVoucher] = useState<VoucherState>({
    code: "",
    applied: false,
    info: null,
    discount: 0,
    applying: false,
  });
  const [suggestedVouchers, setSuggestedVouchers] = useState<Voucher[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  const applyVoucher = useCallback(async () => {
    if (!voucher.code) {
      showToast("Vui lòng nhập mã voucher", "error");
      return;
    }

    setVoucher((prev) => ({ ...prev, applying: true }));

    try {
      const res = await apiClient.post("/khach-hang/don-dat-hang/app-voucher", {
        ma_code: voucher.code,
        id_quan_an: restaurantId,
      });

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
      showToast(error.response?.data?.message || "Lỗi khi áp dụng voucher", "error");
    }
  }, [voucher.code, restaurantId, showToast]);

  const applySuggested = useCallback(
    async (v: Voucher) => {
      setVoucher((prev) => ({ ...prev, code: v.ma_code, applying: true }));

      try {
        const res = await apiClient.post("/khach-hang/don-dat-hang/app-voucher", {
          ma_code: v.ma_code,
          id_quan_an: restaurantId,
        });

        if (res.data?.status) {
          setVoucher({
            code: v.ma_code,
            applied: true,
            info: res.data.data.voucher,
            discount: res.data.data.so_tien_giam,
            applying: false,
          });
          setSuggestedVouchers([]);
          showToast(`Áp dụng ${v.ten_voucher} thành công!`, "success");
        } else {
          setVoucher((prev) => ({ ...prev, applying: false }));
          showToast(res.data?.message || "Không thể áp dụng voucher", "error");
        }
      } catch (error: any) {
        setVoucher((prev) => ({ ...prev, applying: false }));
        showToast(error.response?.data?.message || "Lỗi khi áp dụng voucher", "error");
      }
    },
    [restaurantId, showToast]
  );

  const remove = useCallback(() => {
    setVoucher({ code: "", applied: false, info: null, discount: 0, applying: false });
    showToast("Đã hủy voucher", "info");
  }, [showToast]);

  return {
    voucher,
    setVoucher,
    suggestedVouchers,
    setSuggestedVouchers,
    loadingSuggested,
    setLoadingSuggested,
    applyVoucher,
    applySuggested,
    remove,
  };
};

// ════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════

interface DishCardProps {
  dish: Dish;
  onAddToCart: (dishId: number) => void;
}

const DishCard = memo<DishCardProps>(({ dish, onAddToCart }) => {
  const imageUri = getImageUrl(dish.hinh_anh);
  const discount = calculateDiscountPercentage(dish.gia_ban, dish.gia_khuyen_mai);
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnimation, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  return (
    <Animated.View
      style={[
        s.dishCardContainer,
        { transform: [{ scale: scaleAnimation }] },
      ]}
    >
      <View style={s.dishImageWrapper}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.dishImage} />
        ) : (
          <View style={[s.dishImage, s.placeholderImage]}>
            <Ionicons
              name="fast-food-outline"
              size={28}
              color={COLORS.TEXT_MUTED}
            />
          </View>
        )}

        {discount > 0 && (
          <View style={s.discountBadge}>
            <Text style={s.discountBadgeText}>-{discount}%</Text>
          </View>
        )}
      </View>

      <View style={s.dishInfo}>
        <Text style={s.dishName} numberOfLines={2}>
          {dish.ten_mon_an}
        </Text>
        <View style={s.dishPriceRow}>
          <Text style={s.dishSalePrice}>
            {formatPrice(dish.gia_khuyen_mai)}
          </Text>
          {dish.gia_ban > dish.gia_khuyen_mai && (
            <Text style={s.dishOriginalPrice}>
              {formatPrice(dish.gia_ban)}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={s.addToCartButton}
        onPress={() => onAddToCart(dish.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="add" size={22} color={COLORS.WHITE} />
      </TouchableOpacity>
    </Animated.View>
  );
});

interface OrderItemProps {
  item: CartItem;
  onUpdateQuantity: (itemId: number, qty: number) => void;
  onDelete: (itemId: number) => void;
}

const OrderItem = memo<OrderItemProps>(
  ({ item, onUpdateQuantity, onDelete }) => (
    <View style={s.orderItemContainer}>
      <View style={{ flex: 1 }}>
        <Text style={s.orderItemName} numberOfLines={1}>
          {item.ten_mon_an}
        </Text>
        {item.ghi_chu && (
          <Text style={s.orderItemNote} numberOfLines={1}>
            {item.ghi_chu}
          </Text>
        )}
        <Text style={s.orderItemPrice}>{formatPrice(item.thanh_tien)}</Text>
      </View>

      <View style={s.quantityControls}>
        <TouchableOpacity
          style={s.quantityButton}
          onPress={() =>
            item.so_luong > 1 &&
            onUpdateQuantity(item.id, item.so_luong - 1)
          }
        >
          <Ionicons name="remove" size={14} color={COLORS.WHITE} />
        </TouchableOpacity>

        <Text style={s.quantityText}>{item.so_luong}</Text>

        <TouchableOpacity
          style={s.quantityButton}
          onPress={() => onUpdateQuantity(item.id, item.so_luong + 1)}
        >
          <Ionicons name="add" size={14} color={COLORS.WHITE} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={14} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>
    </View>
  )
);

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════

interface RestaurantDetailProps {
  navigation: any;
  route: any;
}

const RestaurantDetail = ({ navigation, route }: RestaurantDetailProps) => {
  const restaurantId = route.params?.id || 0;
  const insets = useSafeAreaInsets();

  // State
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [userInfo, setUserInfo] = useState({ diem_xu: 0 });
  const [loading, setLoading] = useState(true);
  const [shippingFeeLoading, setShippingFeeLoading] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [shippingDistance, setShippingDistance] = useState<number>(0);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"1" | "2">("1");
  const [useXuPoints, setUseXuPoints] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addNote, setAddNote] = useState("");
  const [dishSizes, setDishSizes] = useState<any[]>([]);
  const [dishToppings, setDishToppings] = useState<any[]>([]);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedToppingIds, setSelectedToppingIds] = useState<number[]>([]);

  // Hooks
  const { toast, show: showToast, hide: hideToast } = useToast();
  const {
    cartItems,
    setCartItems,
    cartTotal,
    cartCount,
    updateQuantity,
    deleteItem,
  } = useCartLogic(showToast);
  const {
    voucher,
    setVoucher,
    suggestedVouchers,
    setSuggestedVouchers,
    loadingSuggested,
    setLoadingSuggested,
    applyVoucher,
    applySuggested,
    remove: removeVoucher,
  } = useVoucherLogic(restaurantId, showToast);

  // Animations
  const heroSlideAnimation = useRef(new Animated.Value(-20)).current;
  const heroFadeAnimation = useRef(new Animated.Value(0)).current;

  // Computed
  const restaurantOpen = useMemo(
    () =>
      restaurantInfo
        ? isRestaurantOpen(restaurantInfo.gio_mo_cua, restaurantInfo.gio_dong_cua)
        : false,
    [restaurantInfo]
  );

  const xuAvailable = useMemo(
    () =>
      Math.min(
        userInfo.diem_xu || 0,
        Math.max(0, cartTotal + shippingFee - voucher.discount)
      ),
    [userInfo.diem_xu, cartTotal, shippingFee, voucher.discount]
  );

  const xuUsed = useMemo(() => (useXuPoints ? xuAvailable : 0), [useXuPoints, xuAvailable]);

  const finalTotal = useMemo(
    () => Math.max(0, cartTotal + shippingFee - voucher.discount - xuUsed),
    [cartTotal, shippingFee, voucher.discount, xuUsed]
  );

  // Effects
  useEffect(() => {
    loadUser();
    loadRestaurantData();
    startHeroAnimation();
  }, [restaurantId]);

  useEffect(() => {
    if (showCheckoutModal && !voucher.applied) {
      loadSuggestedVouchers();
    }
  }, [showCheckoutModal, voucher.applied]);

  useEffect(() => {
    if (selectedAddressId && showCheckoutModal) {
      calculateShippingFee(selectedAddressId);
    }
  }, [selectedAddressId, showCheckoutModal]);

  // Event Handlers
  const loadRestaurantData = useCallback(async () => {
    try {
      const res = await apiClient.get(
        `/khach-hang/don-dat-hang/${restaurantId}`
      );
      if (res.data?.status) {
        setRestaurantInfo(res.data.quan_an);
        setDishes(res.data.mon_an || []);
        setDishToppings(res.data.toppings || []);
        setCartItems(res.data.gio_hang || []);
        setAddresses(res.data.dia_chi_khach || []);

        if (res.data.dia_chi_khach?.length > 0) {
          setSelectedAddressId(res.data.dia_chi_khach[0].id);
        }

        await AsyncStorage.setItem(
          "last_restaurant_id",
          String(restaurantId)
        );
      }
    } catch {
      showToast("Không thể tải dữ liệu. Vui lòng thử lại!", "error");
    } finally {
      setLoading(false);
    }
  }, [restaurantId, showToast]);

  const loadUser = useCallback(async () => {
    try {
      const res = await apiClient.get("/khach-hang/data-login");
      if (res.data?.status) {
        setUserInfo(res.data.data);
      }
    } catch {}
  }, []);

  const loadSuggestedVouchers = useCallback(async () => {
    if (!restaurantId || cartTotal <= 0) return;

    setLoadingSuggested(true);
    try {
      const res = await apiClient.get("/khach-hang/voucher/de-xuat", {
        params: { id_quan_an: restaurantId, tong_tien: cartTotal },
      });
      if (res.data?.status) {
        setSuggestedVouchers(res.data.data || []);
      }
    } catch {}
    finally {
      setLoadingSuggested(false);
    }
  }, [restaurantId, cartTotal]);

  const calculateShippingFee = useCallback(async (addressId: number) => {
    if (!addressId || !restaurantId) {
      setShippingFee(0);
      setShippingDistance(0);
      return;
    }

    setShippingFeeLoading(true);
    try {
      const res = await apiClient.post(
        "/khach-hang/don-dat-hang/phi-ship",
        {
          id_quan_an: restaurantId,
          id_dia_chi_khach: addressId,
        }
      );

      if (res.data?.status) {
        setShippingFee(res.data.phi_ship || 0);
        setShippingDistance(res.data.khoang_cach || 0);
      } else {
        setShippingFee(0);
      }
    } catch {
      setShippingFee(0);
    } finally {
      setShippingFeeLoading(false);
    }
  }, [restaurantId]);

  const startHeroAnimation = () => {
    Animated.parallel([
      Animated.timing(heroFadeAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(heroSlideAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddToCart = useCallback((dishId: number) => {
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish) {
      showToast("Không tìm thấy món ăn!", "error");
      return;
    }

    setSelectedDish(dish);
    setAddQuantity(1);
    setAddNote("");
    setSelectedSizeId(null);
    setSelectedToppingIds([]);
    setDishSizes(dish.sizes || []);
    setShowAddToCartModal(true);
  }, [dishes, showToast]);

  const handleConfirmAddToCart = useCallback(async () => {
    if (!selectedDish) return;

    try {
      const sizePrice =
        dishSizes.find((s) => s.id === selectedSizeId)?.gia_them || 0;
      const toppingPrice = selectedToppingIds.reduce((sum, tid) => {
        const t = dishToppings.find((t) => t.id === tid);
        return sum + (t?.gia || 0);
      }, 0);

      const basePrice = selectedDish.gia_khuyen_mai + sizePrice + toppingPrice;
      const sizeName =
        dishSizes.find((s) => s.id === selectedSizeId)?.ten_size || null;

      let finalNote = addNote;
      if (selectedToppingIds.length > 0) {
        const names = selectedToppingIds
          .map((id) => dishToppings.find((t) => t.id === id)?.ten_topping || "")
          .filter(Boolean)
          .join(", ");
        finalNote = addNote
          ? `${addNote} | Toppings: ${names}`
          : `Toppings: ${names}`;
      }

      const response = await apiClient.post(
        "/khach-hang/don-dat-hang/create",
        {
          id: selectedDish.id,
          so_luong: addQuantity,
          don_gia: basePrice,
          ghi_chu: finalNote,
          id_size: selectedSizeId || null,
          ten_size: sizeName || null,
          topping_ids:
            selectedToppingIds.length > 0 ? selectedToppingIds : null,
        }
      );

      if (response.data?.status) {
        showToast(response.data.message || "Đã thêm vào giỏ hàng ✓", "success");
        setShowAddToCartModal(false);

        setCartItems((prev) => {
          const existingIndex = prev.findIndex(
            (i) =>
              i.id_mon_an === selectedDish.id && i.ghi_chu === finalNote
          );

          if (existingIndex >= 0 && !selectedSizeId) {
            return prev.map((item, i) =>
              i === existingIndex
                ? {
                    ...item,
                    so_luong: item.so_luong + addQuantity,
                    thanh_tien: item.don_gia * (item.so_luong + addQuantity),
                  }
                : item
            );
          }

          const newItem: CartItem = {
            id: response.data.id ?? Date.now(),
            id_mon_an: selectedDish.id,
            ten_mon_an: selectedDish.ten_mon_an,
            so_luong: addQuantity,
            don_gia: basePrice,
            ghi_chu: finalNote,
            thanh_tien: basePrice * addQuantity,
          };

          return [...prev, newItem];
        });
      } else {
        showToast(
          response.data?.message || "Lỗi khi thêm vào giỏ hàng!",
          "error"
        );
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Lỗi khi thêm vào giỏ hàng!",
        "error"
      );
    }
  }, [
    selectedDish,
    addQuantity,
    addNote,
    dishSizes,
    selectedSizeId,
    dishToppings,
    selectedToppingIds,
    showToast,
  ]);

  const handleCancelAddToCart = useCallback(() => {
    setShowAddToCartModal(false);
    setSelectedDish(null);
    setAddQuantity(1);
    setAddNote("");
    setSelectedSizeId(null);
    setSelectedToppingIds([]);
    setDishSizes([]);
  }, []);

  const handlePlaceOrder = useCallback(
    async (method: "1" | "2") => {
      if (submitting) return;
      setSubmitting(true);

      if (cartItems.length === 0) {
        showToast("Giỏ hàng trống", "error");
        setSubmitting(false);
        return;
      }

      if (!selectedAddressId) {
        showToast("Vui lòng chọn địa chỉ giao hàng", "error");
        setSubmitting(false);
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

        if (useXuPoints && xuUsed > 0) {
          url +=
            (url.includes("?") ? "&" : "?") + `su_dung_xu=${xuUsed}`;
        }

        const res = await apiClient.get(url);

        if (res.data?.status) {
          showToast(res.data.message, "success");
          setCartItems([]);
          setShowCheckoutModal(false);

          if (method === "1") {
            navigation.navigate("MainTabs", { screen: "Orders" });
          } else {
            const orderId =
              res.data?.id_don_hang ?? res.data?.don_hang?.id;
            navigation.navigate(
              orderId ? "PayOSPayment" : "MainTabs",
              orderId
                ? { id_don_hang: orderId }
                : { screen: "Orders" }
            );
          }
        } else {
          showToast("Hệ thống bị lỗi, vui lòng thử lại!", "error");
        }
      } catch (error: any) {
        const errors = error.response?.data?.errors;
        if (errors) {
          Object.values(errors).forEach((e: any) =>
            showToast(e[0], "error")
          );
        } else {
          showToast("Đặt hàng thất bại", "error");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      cartItems,
      selectedAddressId,
      restaurantId,
      voucher,
      useXuPoints,
      xuUsed,
      showToast,
      navigation,
      submitting,
    ]
  );

  // Loading
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={s.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  // Render
  return (
    <View style={s.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero Section */}
        <View style={s.heroContainer}>
          <Animated.View
            style={{
              opacity: heroFadeAnimation,
              transform: [{ translateY: heroSlideAnimation }],
              flex: 1,
            }}
          >
            {restaurantInfo?.hinh_anh ? (
              <Image
                source={{ uri: getImageUrl(restaurantInfo.hinh_anh) }}
                style={s.heroImage}
              />
            ) : (
              <View style={[s.heroImage, s.placeholderImage]}>
                <Ionicons
                  name="storefront-outline"
                  size={60}
                  color={COLORS.TEXT_MUTED}
                />
              </View>
            )}
          </Animated.View>

          {/* Hero Buttons */}
          <SafeAreaView edges={["top"]} style={s.heroButtonsContainer}>
            <TouchableOpacity
              style={s.heroButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={COLORS.WHITE}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.heroButton}
              onPress={() => navigation.navigate("Cart")}
            >
              <Ionicons
                name="cart-outline"
                size={21}
                color={COLORS.WHITE}
              />
              {cartCount > 0 && (
                <View style={s.heroBadge}>
                  <Text style={s.heroBadgeText}>
                    {cartCount > 99 ? "99+" : cartCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </SafeAreaView>

          {/* Restaurant Info Panel */}
          <View style={s.restaurantInfoPanel}>
            <View style={s.restaurantInfoContent}>
              {/* Status & Rating */}
              <View style={s.restaurantHeaderRow}>
                <View
                  style={[
                    s.statusBadge,
                    {
                      backgroundColor: restaurantOpen
                        ? COLORS.SUCCESS
                        : COLORS.ERROR,
                    },
                  ]}
                >
                  <View style={s.statusIndicator} />
                  <Text style={s.statusText}>
                    {restaurantOpen ? "Đang mở cửa" : "Đã đóng cửa"}
                  </Text>
                </View>

                <View style={s.ratingContainer}>
                  {[...Array(4)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name="star"
                      size={12}
                      color="#FFC107"
                    />
                  ))}
                  <Ionicons name="star-half" size={12} color="#FFC107" />
                  <Text style={s.ratingText}>4.5</Text>
                </View>
              </View>

              {/* Name */}
              <Text style={s.restaurantName} numberOfLines={2}>
                {restaurantInfo?.ten_quan_an}
              </Text>

              {/* Address */}
              <View style={s.addressRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={COLORS.TEXT_MUTED}
                />
                <Text style={s.addressText} numberOfLines={2}>
                  {restaurantInfo?.dia_chi}
                </Text>
              </View>

              {/* Hours */}
              <View style={s.hoursRow}>
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={COLORS.TEXT_MUTED}
                />
                <Text style={s.hoursText}>
                  {restaurantInfo?.gio_mo_cua} –{" "}
                  {restaurantInfo?.gio_dong_cua}
                </Text>
                <View style={s.deliveryTimeBadge}>
                  <Ionicons
                    name="bicycle-outline"
                    size={12}
                    color={COLORS.PRIMARY}
                  />
                  <Text style={s.deliveryTimeText}>
                    30–45 phút
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Section */}
        <View style={s.menuSection}>
          <View style={s.menuHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Ionicons name="restaurant-outline" size={18} color={COLORS.TEXT_PRIMARY} />
              <Text style={s.menuTitle}>Thực Đơn</Text>
            </View>
            <Text style={s.menuCount}>{dishes.length} món</Text>
          </View>

          {dishes.length > 0 ? (
            <FlatList
              data={dishes}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <DishCard
                  dish={item}
                  onAddToCart={handleAddToCart}
                />
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: 12 }} />
              )}
            />
          ) : (
            <View style={s.emptyMenuContainer}>
              <Ionicons
                name="restaurant-outline"
                size={48}
                color={COLORS.TEXT_MUTED}
              />
              <Text style={s.emptyText}>
                Quán chưa có món ăn
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            height: cartItems.length > 0
              ? 80 + insets.bottom + 16
              : 40,
          }}
        />
      </ScrollView>

      {/* Cart Footer */}
      {cartItems.length > 0 && (
        <View
          style={[
            s.cartFooter,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          <View style={s.cartInfoContainer}>
            <View style={s.cartIconBadgeContainer}>
              <Ionicons
                name="cart"
                size={18}
                color={COLORS.WHITE}
              />
              <View style={s.cartCountBadge}>
                <Text style={s.cartCountText}>{cartCount}</Text>
              </View>
            </View>
            <View>
              <Text style={s.cartLabel}>
                {cartItems.length} loại món
              </Text>
              <Text style={s.cartTotal}>
                {formatPrice(cartTotal)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.checkoutButton}
            onPress={() => {
              setUseXuPoints(false);
              setShowCheckoutModal(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={s.checkoutButtonText}>Đặt hàng</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={COLORS.WHITE}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Checkout Modal */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <SafeAreaView style={s.checkoutModal}>
          <View style={s.checkoutHeader}>
            <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
              <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={s.checkoutTitle}>Xác nhận đơn hàng</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.checkoutContent}>
            {/* Order Items */}
            <View style={s.checkoutSection}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="cube-outline" size={15} color={COLORS.PRIMARY} />
                <Text style={s.sectionTitle}>Đơn hàng ({cartItems.length} món)</Text>
              </View>
              <View style={{ gap: 8 }}>
                {cartItems.map((item) => (
                  <View key={item.id} style={s.checkoutItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{item.ten_mon_an}</Text>
                      {item.ghi_chu && (
                        <Text style={s.itemNote}>{item.ghi_chu}</Text>
                      )}
                      <Text style={s.itemQty}>x{item.so_luong}</Text>
                    </View>
                    <Text style={s.itemPrice}>{formatPrice(item.thanh_tien)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Address Selection */}
            <View style={s.checkoutSection}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="location-outline" size={15} color={COLORS.PRIMARY} />
                <Text style={s.sectionTitle}>Địa chỉ giao hàng</Text>
                <TouchableOpacity
                  style={s.addAddressBtn}
                  onPress={() => { setShowCheckoutModal(false); navigation.navigate("AddressBook"); }}
                >
                  <Ionicons name="add" size={13} color={COLORS.PRIMARY} />
                  <Text style={s.addAddressTxt}>Thêm địa chỉ</Text>
                </TouchableOpacity>
              </View>
              {addresses.length > 0 ? (
                <FlatList
                  data={addresses}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        s.addressOption,
                        selectedAddressId === item.id && s.addressOptionSelected,
                      ]}
                      onPress={() => setSelectedAddressId(item.id)}
                    >
                      <View style={s.addressRadio}>
                        {selectedAddressId === item.id && (
                          <View style={s.addressRadioInner} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.addressName}>{item.ten_nguoi_nhan}</Text>
                        <Text style={s.addressDetail}>{item.dia_chi}</Text>
                        <Text style={s.addressPhone}>{item.so_dien_thoai}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <Text style={s.noAddressText}>Chưa có địa chỉ nào</Text>
              )}
            </View>

            {/* Shipping Fee */}
            {shippingFeeLoading ? (
              <View style={s.checkoutSection}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              </View>
            ) : shippingFee > 0 ? (
              <View style={s.checkoutSection}>
                <View style={s.feeRow}>
                  <Text style={s.feeLabel}>Phí giao hàng ({shippingDistance.toFixed(1)} km)</Text>
                  <Text style={s.feeValue}>{formatPrice(shippingFee)}</Text>
                </View>
              </View>
            ) : null}

            {/* Voucher */}
            <View style={s.checkoutSection}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="gift-outline" size={15} color={COLORS.PRIMARY} />
                <Text style={s.sectionTitle}>Voucher & Khuyến mãi</Text>
              </View>
              {voucher.applied && voucher.info ? (
                <View style={s.voucherApplied}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.voucherName}>{voucher.info.ten_voucher}</Text>
                    <Text style={s.voucherCode}>{voucher.info.ma_code}</Text>
                  </View>
                  <Text style={s.voucherDiscount}>-{formatPrice(voucher.discount)}</Text>
                  <TouchableOpacity
                    style={{ paddingLeft: 12 }}
                    onPress={removeVoucher}
                  >
                    <Ionicons name="close" size={20} color={COLORS.ERROR} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={s.voucherInput}>
                    <TextInput
                      style={s.voucherTextField}
                      placeholder="Nhập mã voucher"
                      placeholderTextColor={COLORS.TEXT_MUTED}
                      value={voucher.code}
                      onChangeText={(text) =>
                        setVoucher((prev) => ({ ...prev, code: text }))
                      }
                      editable={!voucher.applying}
                    />
                    <TouchableOpacity
                      style={[
                        s.applyButton,
                        voucher.applying && { opacity: 0.6 },
                      ]}
                      onPress={applyVoucher}
                      disabled={voucher.applying}
                    >
                      {voucher.applying ? (
                        <ActivityIndicator size="small" color={COLORS.WHITE} />
                      ) : (
                        <Text style={s.applyButtonText}>Áp dụng</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {suggestedVouchers.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={s.suggestedTitle}>Voucher gợi ý</Text>
                      {loadingSuggested ? (
                        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                      ) : (
                        <FlatList
                          data={suggestedVouchers}
                          scrollEnabled={false}
                          keyExtractor={(v) => v.id.toString()}
                          renderItem={({ item: v }) => (
                            <TouchableOpacity
                              style={s.suggestedVoucher}
                              onPress={() => applySuggested(v)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={s.suggestedName}>{v.ten_voucher}</Text>
                                <Text style={s.suggestedCode}>{v.ma_code}</Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={16}
                                color={COLORS.TEXT_MUTED}
                              />
                            </TouchableOpacity>
                          )}
                        />
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* XU Points */}
            {userInfo.diem_xu > 0 && (
              <View style={s.checkoutSection}>
                <View style={s.xuRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.xuLabel}>Sử dụng XU ({xuAvailable} XU)</Text>
                    <Text style={s.xuInfo}>Giảm {formatPrice(xuUsed)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.xuSwitch, useXuPoints && s.xuSwitchOn]}
                    onPress={() => setUseXuPoints(!useXuPoints)}
                  >
                    <View
                      style={[
                        s.xuSwitchButton,
                        useXuPoints && s.xuSwitchButtonOn,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Payment Method */}
            <View style={s.checkoutSection}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="card-outline" size={15} color={COLORS.PRIMARY} />
                <Text style={s.sectionTitle}>Phương thức thanh toán</Text>
              </View>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    s.paymentOption,
                    paymentMethod === method.value && s.paymentOptionSelected,
                  ]}
                  onPress={() => setPaymentMethod(method.value as "1" | "2")}
                >
                  <View style={s.paymentRadio}>
                    {paymentMethod === method.value && (
                      <View style={s.paymentRadioInner} />
                    )}
                  </View>
                  <Ionicons
                    name={method.icon}
                    size={20}
                    color={COLORS.PRIMARY}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.paymentLabel}>{method.label}</Text>
                    <Text style={s.paymentDesc}>{method.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price Summary */}
            <View style={s.checkoutSection}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Tạm tính</Text>
                <Text style={s.summaryValue}>{formatPrice(cartTotal)}</Text>
              </View>
              {shippingFee > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Phí giao hàng</Text>
                  <Text style={s.summaryValue}>{formatPrice(shippingFee)}</Text>
                </View>
              )}
              {voucher.discount > 0 && (
                <View style={[s.summaryRow, { marginTop: 8 }]}>
                  <Text style={[s.summaryLabel, { color: COLORS.SUCCESS }]}>
                    Giảm giá
                  </Text>
                  <Text style={[s.summaryValue, { color: COLORS.SUCCESS }]}>
                    -{formatPrice(voucher.discount)}
                  </Text>
                </View>
              )}
              {xuUsed > 0 && (
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: COLORS.SUCCESS }]}>
                    Trừ XU
                  </Text>
                  <Text style={[s.summaryValue, { color: COLORS.SUCCESS }]}>
                    -{formatPrice(xuUsed)}
                  </Text>
                </View>
              )}
              <View
                style={[
                  s.summaryRow,
                  {
                    borderTopWidth: 1,
                    borderTopColor: COLORS.BORDER,
                    paddingTop: 12,
                    marginTop: 12,
                  },
                ]}
              >
                <Text style={s.totalLabel}>Tổng cộng</Text>
                <Text style={s.totalValue}>{formatPrice(finalTotal)}</Text>
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Checkout Button */}
          <View style={[s.checkoutFooter, { paddingBottom: (insets.bottom || 0) + SPACING.GUTTER }]}>
            <TouchableOpacity
              style={[s.checkoutConfirmButton, submitting && { opacity: 0.6 }]}
              onPress={() => handlePlaceOrder(paymentMethod)}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <>
                  <Text style={s.checkoutConfirmText}>Đặt hàng</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={COLORS.WHITE}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add To Cart Modal */}
      <AddToCartModal
        visible={showAddToCartModal}
        dish={selectedDish}
        quantity={addQuantity}
        onQuantityChange={setAddQuantity}
        note={addNote}
        onNoteChange={setAddNote}
        onConfirm={handleConfirmAddToCart}
        onOrder={handleConfirmAddToCart}
        onCancel={handleCancelAddToCart}
        sizes={dishSizes}
        toppings={dishToppings}
        selectedSizeId={selectedSizeId}
        onSizeChange={setSelectedSizeId}
        selectedToppingIds={selectedToppingIds}
        onToppingChange={setSelectedToppingIds}
      />

      {/* Toast */}
      {toast.visible && (
        <ToastMessage
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      )}
    </View>
  );
};

// ════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.BG },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.BG,
    gap: 12,
  },
  loadingText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    fontWeight: "500",
  },

  /* Hero */
  heroContainer: {
    height: HERO_IMAGE_HEIGHT + 120,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: HERO_IMAGE_HEIGHT,
    resizeMode: "cover",
  },
  heroButtonsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.GUTTER,
    paddingTop: Platform.OS === "android" ? 8 : 4,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.WHITE,
  },
  heroBadgeText: { fontSize: 8, fontWeight: "900", color: COLORS.WHITE },

  /* Restaurant Info */
  restaurantInfoPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 6,
    shadowColor: COLORS.CARD_SHADOW,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  restaurantInfoContent: {
    paddingHorizontal: SPACING.PADDING,
    paddingVertical: SPACING.GUTTER,
    gap: 6,
  },
  restaurantHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  statusText: { color: COLORS.WHITE, fontSize: 11, fontWeight: "700" },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 3,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  addressText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    flex: 1,
    lineHeight: 17,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  hoursText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: "600",
  },
  deliveryTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  deliveryTimeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },

  /* Menu */
  menuSection: {
    backgroundColor: COLORS.BG,
    paddingHorizontal: SPACING.PADDING,
    paddingTop: 20,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  menuCount: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontWeight: "600",
  },
  emptyMenuContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.TEXT_MUTED,
    fontWeight: "500",
  },

  /* Dish Card */
  dishCardContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: COLORS.CARD_SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    alignItems: "center",
  },
  dishImageWrapper: { position: "relative" },
  dishImage: { width: 110, height: 90, resizeMode: "cover" },
  discountBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: "900",
  },
  dishInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 5 },
  dishName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 17,
  },
  dishPriceRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  dishSalePrice: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.PRIMARY,
  },
  dishOriginalPrice: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    textDecorationLine: "line-through",
  },
  addToCartButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 3,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  /* Order Item */
  orderItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: "#FAFBFC",
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  orderItemNote: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    fontStyle: "italic",
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.PRIMARY,
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    minWidth: 22,
    textAlign: "center",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.ERROR,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },

  /* Cart Footer */
  cartFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.GUTTER,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.BORDER,
    elevation: 12,
    shadowColor: COLORS.CARD_SHADOW,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cartInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cartIconBadgeContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cartCountBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.WARNING,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.WHITE,
  },
  cartCountText: { fontSize: 9, fontWeight: "900", color: COLORS.WHITE },
  cartLabel: { fontSize: 11, color: COLORS.TEXT_MUTED, fontWeight: "500" },
  cartTotal: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.PRIMARY,
    letterSpacing: -0.2,
  },
  checkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  checkoutButtonText: { color: COLORS.WHITE, fontSize: 14, fontWeight: "800" },

  /* Modal */
  modalPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Checkout Modal */
  checkoutModal: {
    flex: 1,
    backgroundColor: COLORS.BG,
  },
  checkoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.PADDING,
    paddingVertical: SPACING.GUTTER,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.BORDER,
  },
  checkoutTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
  },
  checkoutContent: {
    flex: 1,
    paddingHorizontal: SPACING.PADDING,
    paddingVertical: SPACING.GUTTER,
  },
  checkoutSection: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: SPACING.PADDING,
    marginBottom: SPACING.GUTTER,
    elevation: 2,
    shadowColor: COLORS.CARD_SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    letterSpacing: -0.2,
  },
  addAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    backgroundColor: "#FEF2F2",
  },
  addAddressTxt: {
    fontSize: 11,
    color: COLORS.PRIMARY,
    fontWeight: "700",
  },
  checkoutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FAFBFC",
    borderRadius: 12,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  itemNote: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  itemQty: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    fontWeight: "600",
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.PRIMARY,
  },

  /* Address Options */
  addressOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    backgroundColor: COLORS.WHITE,
  },
  addressOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: "#FEF2F2",
  },
  addressRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
  },
  addressName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  addressDetail: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  addressPhone: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  noAddressText: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: "center",
    paddingVertical: 20,
  },

  /* Fee Rows */
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: "600",
  },
  feeValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },

  /* Voucher */
  voucherApplied: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  voucherName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  voucherCode: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
  voucherDiscount: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.SUCCESS,
  },
  voucherInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voucherTextField: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.TEXT_PRIMARY,
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
  },
  applyButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.WHITE,
  },
  suggestedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  suggestedVoucher: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
  },
  suggestedName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  suggestedCode: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },

  /* XU Points */
  xuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  xuLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  xuInfo: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  xuSwitch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.BORDER,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  xuSwitchOn: {
    backgroundColor: COLORS.SUCCESS,
    alignItems: "flex-end",
  },
  xuSwitchButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.WHITE,
  },
  xuSwitchButtonOn: {
    backgroundColor: COLORS.WHITE,
  },

  /* Payment Options */
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    backgroundColor: COLORS.WHITE,
  },
  paymentOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: "#FEF2F2",
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  paymentDesc: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },

  /* Summary */
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.PRIMARY,
    letterSpacing: -0.3,
  },

  /* Checkout Footer */
  checkoutFooter: {
    paddingHorizontal: SPACING.PADDING,
    paddingVertical: SPACING.GUTTER,
    backgroundColor: COLORS.WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.BORDER,
    paddingBottom: SPACING.GUTTER,
  },
  checkoutConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    paddingVertical: 14,
    elevation: 3,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  checkoutConfirmText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.WHITE,
    letterSpacing: -0.2,
  },

  /* Utilities */
  placeholderImage: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default RestaurantDetail;
