import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";
import { getImageUrl, getShipperAvatarUrl } from "../../utils/imageHelper";
import CustomAlert, { AlertButton } from "../../components/CustomAlert";

// ════════════════ Constants ════════════════

const PRIMARY = "#EE4D2D";
const BG = "#F5F5F7";

const QUICK_TAGS = [
  "Đồ ăn ngon",
  "Đúng giờ",
  "Đóng gói cẩn thận",
  "Shipper thân thiện",
  "Đúng món",
  "Hương vị chuẩn",
  "Phần ăn đầy đủ",
  "Giá hợp lý",
];

// ════════════════ Types ════════════════

interface OrderItem {
  id: number;
  ten_mon_an: string;
  hinh_anh: string | null;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  ghi_chu: string;
}

interface RouteParams {
  orderId: number;
  madonHang: string;
  tenQuanAn: string;
  hinhAnhQuan: string | null;
  orderItems: OrderItem[];
  shipperName: string | null;
  shipperAvatar: string | null;
}

// ════════════════ Star Rating Component ════════════════

const StarRating = ({
  rating,
  onRate,
  size = wp("8%"),
}: {
  rating: number;
  onRate: (star: number) => void;
  size?: number;
}) => {
  const scales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const handlePress = (star: number) => {
    Animated.sequence([
      Animated.spring(scales[star - 1], {
        toValue: 1.4,
        useNativeDriver: true,
        speed: 40,
      }),
      Animated.spring(scales[star - 1], {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
      }),
    ]).start();
    onRate(star);
  };

  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => handlePress(star)} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: scales[star - 1] }] }}>
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={size}
              color={star <= rating ? "#F59E0B" : "#D1D5DB"}
            />
          </Animated.View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const starStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: wp("2%") },
});

const RATING_LABELS: Record<number, string> = {
  0: "Chọn đánh giá",
  1: "Rất tệ",
  2: "Tệ",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Tuyệt vời!",
};

// ════════════════ Main Component ════════════════

const FoodReview = ({ navigation, route }: any) => {
  const params: RouteParams = route.params;
  const {
    orderId,
    madonHang,
    tenQuanAn,
    hinhAnhQuan,
    orderItems,
    shipperName,
    shipperAvatar,
  } = params;

  const [foodRating, setFoodRating] = useState(0);
  const [shipperRating, setShipperRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [shipperComment, setShipperComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const shipperInputRef = useRef<any>(null);
  const commentInputRef = useRef<any>(null);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: "success" | "error" | "warning" | "info" | "confirm";
    title: string;
    message?: string;
    buttons: AlertButton[];
  }>({ type: "info", title: "", buttons: [] });

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

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (foodRating === 0) {
      showAlert("warning", "Chưa đánh giá", "Vui lòng chọn số sao đánh giá cho món ăn.");
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const nhanXetQuanAn = [
        ...selectedTags,
        ...(comment.trim() ? [comment.trim()] : []),
      ].join(", ") || null;

      const payload = {
        id_don_hang: orderId,
        sao_quan_an: foodRating,
        nhan_xet_quan_an: nhanXetQuanAn,
        sao_shipper: shipperRating || null,
        nhan_xet_shipper: shipperComment.trim() || null,
      };
      const res = await apiClient.post("/khach-hang/don-hang/danh-gia", payload);
      if (res.data?.status) {
        showAlert(
          "success",
          "Cảm ơn bạn!",
          "Đánh giá của bạn đã được ghi nhận.",
          [
            {
              text: "OK",
              style: "default",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        showAlert("error", "Lỗi", res.data?.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
      }
    } catch {
      showAlert("error", "Lỗi kết nối", "Không thể kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={wp("5.5%")} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá đơn hàng</Text>
        <View style={{ width: wp("9%") }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Order Code */}
          <Text style={styles.orderCode}>#{madonHang}</Text>

          {/* Restaurant Card */}
          <View style={styles.restaurantCard}>
            <Image
              source={{ uri: getImageUrl(hinhAnhQuan) }}
              style={styles.restaurantImage}
              resizeMode="cover"
            />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {tenQuanAn}
              </Text>
              <Text style={styles.restaurantSub}>
                {orderItems.length > 0
                  ? orderItems.map((i) => i.ten_mon_an).join(", ")
                  : ""}
              </Text>
            </View>
          </View>

          {/* Ordered Items */}
          {orderItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Món đã đặt</Text>
              {orderItems.map((item) => (
                <View key={item.id} style={styles.dishRow}>
                  <Image
                    source={{ uri: getImageUrl(item.hinh_anh) }}
                    style={styles.dishImage}
                    resizeMode="cover"
                  />
                  <View style={styles.dishInfo}>
                    <Text style={styles.dishName} numberOfLines={2}>
                      {item.ten_mon_an}
                    </Text>
                    <Text style={styles.dishQty}>x{item.so_luong}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Food Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chất lượng món ăn</Text>
            <View style={styles.ratingBlock}>
              <StarRating rating={foodRating} onRate={setFoodRating} />
              {foodRating > 0 && (
                <Text style={[styles.ratingLabel, { color: foodRating >= 4 ? "#10B981" : foodRating === 3 ? "#F59E0B" : "#EF4444" }]}>
                  {RATING_LABELS[foodRating]}
                </Text>
              )}
            </View>
          </View>

          {/* Quick Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Những điều bạn thích?</Text>
            <View style={styles.tagsContainer}>
              {QUICK_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, active && styles.tagActive]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.75}
                  >
                    {active && (
                      <Ionicons name="checkmark" size={wp("3.2%")} color={PRIMARY} style={{ marginRight: 3 }} />
                    )}
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comment nhà hàng */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nhận xét về món ăn (không bắt buộc)</Text>
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder="Chia sẻ trải nghiệm của bạn về món ăn..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
              onFocus={() => {
                setTimeout(() => {
                  commentInputRef.current?.measureLayout(
                    scrollRef.current as any,
                    (_x: number, y: number) => {
                      scrollRef.current?.scrollTo({ y: y - 20, animated: true });
                    },
                    () => {}
                  );
                }, 300);
              }}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* Shipper Rating */}
          {shipperName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Đánh giá tài xế</Text>
              <View style={styles.shipperRow}>
                <Image
                  source={{ uri: getShipperAvatarUrl(shipperAvatar) }}
                  style={styles.shipperAvatar}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shipperName}>{shipperName}</Text>
                  <StarRating rating={shipperRating} onRate={setShipperRating} size={wp("6%")} />
                  {shipperRating > 0 && (
                    <Text style={[styles.ratingLabelSm, { color: shipperRating >= 4 ? "#10B981" : shipperRating === 3 ? "#F59E0B" : "#EF4444" }]}>
                      {RATING_LABELS[shipperRating]}
                    </Text>
                  )}
                </View>
              </View>
              <TextInput
                ref={shipperInputRef}
                style={[styles.commentInput, { marginTop: hp("1.5%") }]}
                placeholder="Nhận xét về tài xế (không bắt buộc)..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={255}
                value={shipperComment}
                onChangeText={setShipperComment}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    shipperInputRef.current?.measureLayout(
                      scrollRef.current as any,
                      (_x: number, y: number) => {
                        scrollRef.current?.scrollTo({ y: y - 20, animated: true });
                      },
                      () => {}
                    );
                  }, 300);
                }}
              />
              <Text style={styles.charCount}>{shipperComment.length}/255</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (submitting || foodRating === 0) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={submitting || foodRating === 0}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Gửi đánh giá</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: hp("6%") }} />
        </ScrollView>
      </KeyboardAvoidingView>

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

// ════════════════ Styles ════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    width: wp("9%"),
    height: wp("9%"),
    borderRadius: wp("4.5%"),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F7",
  },
  headerTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: wp("4%"),
    paddingTop: hp("2%"),
  },

  orderCode: {
    fontSize: wp("3.2%"),
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: hp("1.5%"),
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // Restaurant
  restaurantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: wp("3.5%"),
    marginBottom: hp("1.5%"),
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  restaurantImage: {
    width: wp("14%"),
    height: wp("14%"),
    borderRadius: 10,
    marginRight: wp("3%"),
  },
  restaurantInfo: { flex: 1 },
  restaurantName: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  restaurantSub: {
    fontSize: wp("3%"),
    color: "#9CA3AF",
    lineHeight: 16,
  },

  // Section
  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: wp("4%"),
    marginBottom: hp("1.5%"),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: "#374151",
    marginBottom: hp("1.5%"),
  },

  // Dish row
  dishRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp("0.8%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dishImage: {
    width: wp("11%"),
    height: wp("11%"),
    borderRadius: 8,
    marginRight: wp("3%"),
  },
  dishInfo: { flex: 1 },
  dishName: {
    fontSize: wp("3.5%"),
    color: "#374151",
    fontWeight: "500",
    marginBottom: 2,
  },
  dishQty: {
    fontSize: wp("3%"),
    color: "#9CA3AF",
  },

  // Rating block
  ratingBlock: {
    alignItems: "center",
    gap: hp("1%"),
  },
  ratingLabel: {
    fontSize: wp("4%"),
    fontWeight: "700",
    marginTop: hp("0.5%"),
  },
  ratingLabelSm: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    marginTop: hp("0.5%"),
  },

  // Tags
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("2%"),
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("0.8%"),
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  tagActive: {
    borderColor: PRIMARY,
    backgroundColor: "#FFF0EE",
  },
  tagText: {
    fontSize: wp("3.2%"),
    color: "#6B7280",
    fontWeight: "500",
  },
  tagTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },

  // Shipper
  shipperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  shipperAvatar: {
    width: wp("13%"),
    height: wp("13%"),
    borderRadius: wp("6.5%"),
    borderWidth: 2,
    borderColor: "#F3F4F6",
  },
  shipperName: {
    fontSize: wp("3.8%"),
    fontWeight: "600",
    color: "#374151",
    marginBottom: hp("0.8%"),
  },

  // Comment
  commentInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: wp("3.5%"),
    minHeight: hp("12%"),
    fontSize: wp("3.5%"),
    color: "#374151",
    backgroundColor: "#FAFAFA",
  },
  charCount: {
    textAlign: "right",
    fontSize: wp("3%"),
    color: "#9CA3AF",
    marginTop: hp("0.5%"),
  },

  // Submit
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: hp("2%"),
    alignItems: "center",
    marginTop: hp("1%"),
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: "#FBBDAF",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: "#fff",
    fontSize: wp("4.2%"),
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export default FoodReview;
