import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Linking,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

// ════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════
const PRIMARY = "#EE4D2D";
const BG = "#F5F6F8";
const SURFACE = "#FFFFFF";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";
const TEXT_LIGHT = "#94A3B8";
const BORDER = "#E2E8F0";

// ════════════════════════════════════════════════════════
// Data
// ════════════════════════════════════════════════════════
interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ContactItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bg: string;
  onPress: () => void;
}

const FAQ_DATA: FaqItem[] = [
  // Đặt hàng
  {
    id: "1",
    category: "Đặt hàng",
    question: "Làm thế nào để đặt món ăn?",
    answer:
      "Chọn nhà hàng trên trang chủ → Chọn món ăn muốn đặt → Thêm vào giỏ hàng → Kiểm tra đơn hàng → Chọn địa chỉ giao và phương thức thanh toán → Xác nhận đặt hàng.",
  },
  {
    id: "2",
    category: "Đặt hàng",
    question: "Tôi có thể hủy đơn hàng không?",
    answer:
      "Bạn có thể hủy đơn khi đơn đang ở trạng thái \"Chờ xác nhận\" (trước khi shipper nhận). Vào mục Đơn hàng → Chọn đơn cần hủy → Nhấn Hủy đơn.",
  },
  {
    id: "3",
    category: "Đặt hàng",
    question: "Thời gian giao hàng mất bao lâu?",
    answer:
      "Thời gian giao hàng thường từ 20–45 phút tùy khoảng cách và điều kiện giao thông. Bạn có thể theo dõi vị trí shipper theo thời gian thực trong mục Đơn hàng.",
  },
  {
    id: "4",
    category: "Đặt hàng",
    question: "Đơn hàng của tôi ở đâu rồi?",
    answer:
      "Vào tab Đơn hàng → Chọn đơn hàng đang giao → Xem bản đồ theo dõi thời gian thực. Bạn cũng có thể nhắn tin trực tiếp với shipper trong phần đơn hàng.",
  },

  // Thanh toán
  {
    id: "5",
    category: "Thanh toán",
    question: "FoodBee hỗ trợ những phương thức thanh toán nào?",
    answer:
      "FoodBee hỗ trợ 2 phương thức: (1) Tiền mặt – thanh toán khi nhận hàng. (2) Chuyển khoản qua PayOS – thanh toán online an toàn, tiện lợi.",
  },
  {
    id: "6",
    category: "Thanh toán",
    question: "Tôi thanh toán online nhưng chưa thấy đơn được xác nhận?",
    answer:
      "Sau khi thanh toán PayOS thành công, hệ thống sẽ tự động xác nhận trong vòng 1–2 phút. Nếu quá 5 phút vẫn chưa thấy, vui lòng liên hệ hỗ trợ qua số hotline.",
  },
  {
    id: "7",
    category: "Thanh toán",
    question: "Tôi có được hoàn tiền khi hủy đơn không?",
    answer:
      "Nếu bạn đã thanh toán online và hủy đơn trước khi shipper nhận, khoản thanh toán sẽ được hoàn lại trong 3–5 ngày làm việc tùy ngân hàng.",
  },

  // Voucher & Xu
  {
    id: "8",
    category: "Voucher & Xu",
    question: "Mã giảm giá của tôi không dùng được?",
    answer:
      "Vui lòng kiểm tra: (1) Còn hạn sử dụng chưa. (2) Giá trị đơn hàng đã đạt mức tối thiểu chưa. (3) Voucher có áp dụng cho nhà hàng đang đặt không. Mỗi voucher chỉ dùng được 1 lần.",
  },
  {
    id: "9",
    category: "Voucher & Xu",
    question: "FoodBee Xu là gì? Dùng như thế nào?",
    answer:
      "FoodBee Xu là điểm thưởng tích lũy sau mỗi đơn hàng hoàn thành. Bạn có thể dùng Xu để giảm trực tiếp vào tổng tiền đơn hàng, 1 Xu = 1.000đ giảm giá.",
  },

  // Tài khoản
  {
    id: "10",
    category: "Tài khoản",
    question: "Làm thế nào để thay đổi địa chỉ giao hàng?",
    answer:
      "Vào tab Tôi → Địa chỉ nhận hàng → Thêm địa chỉ mới hoặc chỉnh sửa địa chỉ hiện tại. Khi đặt hàng, bạn có thể chọn địa chỉ từ danh sách đã lưu.",
  },
  {
    id: "11",
    category: "Tài khoản",
    question: "Tôi quên mật khẩu, phải làm sao?",
    answer:
      "Tại màn hình đăng nhập, nhấn \"Quên mật khẩu\" → Nhập email đăng ký → Làm theo hướng dẫn trong email để đặt lại mật khẩu.",
  },

  // Shipper
  {
    id: "12",
    category: "Trở thành Tài xế",
    question: "Làm thế nào để đăng ký làm tài xế FoodBee?",
    answer:
      "Vào tab Tôi → Hợp tác Tài xế FoodBee → Đăng ký ngay. Điền đầy đủ thông tin cá nhân và thông tin phương tiện. Sau khi duyệt, bạn có thể bắt đầu nhận đơn.",
  },
];

const CATEGORIES = ["Tất cả", "Đặt hàng", "Thanh toán", "Voucher & Xu", "Tài khoản", "Trở thành Tài xế"];

// ════════════════════════════════════════════════════════
// Accordion Item
// ════════════════════════════════════════════════════════
const AccordionItem = ({ item }: { item: FaqItem }) => {
  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;
  const animRotate = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toHeight = expanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(animHeight, { toValue: toHeight, duration: 220, useNativeDriver: false }),
      Animated.timing(animRotate, { toValue: toHeight, duration: 220, useNativeDriver: true }),
    ]).start();
    setExpanded(!expanded);
  };

  const rotate = animRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View style={faqStyles.item}>
      <TouchableOpacity style={faqStyles.question} onPress={toggle} activeOpacity={0.75}>
        <Text style={faqStyles.questionText}>{item.question}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={{
          maxHeight: animHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }),
          overflow: "hidden",
        }}
      >
        <View style={faqStyles.answer}>
          <Text style={faqStyles.answerText}>{item.answer}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const faqStyles = StyleSheet.create({
  item: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  question: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp("1.6%"),
    paddingHorizontal: wp("4%"),
    gap: 10,
  },
  questionText: {
    flex: 1,
    fontSize: wp("3.6%"),
    fontWeight: "600",
    color: TEXT_DARK,
    lineHeight: 22,
  },
  answer: {
    paddingHorizontal: wp("4%"),
    paddingBottom: hp("1.6%"),
  },
  answerText: {
    fontSize: wp("3.4%"),
    color: TEXT_MUTED,
    lineHeight: 21,
  },
});

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
const HelpCenter = ({ navigation }: any) => {
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");

  const contactItems: ContactItem[] = [
    {
      id: "chat",
      title: "Chat với hỗ trợ",
      subtitle: "Phản hồi trong vòng 5 phút",
      icon: "chatbubble-ellipses",
      color: "#EE4D2D",
      bg: "#FFF0ED",
      onPress: () => navigation.navigate("ChatBot"),
    },
    {
      id: "phone",
      title: "Gọi hotline",
      subtitle: "1900 xxxx – Miễn phí 24/7",
      icon: "call",
      color: "#10B981",
      bg: "#ECFDF5",
      onPress: () => Linking.openURL("tel:1900xxxx"),
    },
    {
      id: "email",
      title: "Gửi email",
      subtitle: "support@foodbee.vn",
      icon: "mail",
      color: "#3B82F6",
      bg: "#EFF6FF",
      onPress: () => Linking.openURL("mailto:support@foodbee.vn"),
    },
    {
      id: "facebook",
      title: "Facebook Fanpage",
      subtitle: "fb.com/foodbee.vn",
      icon: "logo-facebook",
      color: "#1877F2",
      bg: "#EFF6FF",
      onPress: () => Linking.openURL("https://facebook.com/foodbee.vn"),
    },
  ];

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchCat = activeCategory === "Tất cả" || item.category === activeCategory;
    const matchSearch =
      !searchText.trim() ||
      item.question.toLowerCase().includes(searchText.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.headerBg}>
        <SafeAreaView edges={["top"]} style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Trung tâm trợ giúp</Text>
              <Text style={styles.headerSub}>Chúng tôi luôn sẵn sàng hỗ trợ bạn</Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={TEXT_LIGHT} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm câu hỏi thường gặp..."
              placeholderTextColor={TEXT_LIGHT}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color={TEXT_LIGHT} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp("5%") }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Liên hệ nhanh ── */}
        {!searchText && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liên hệ hỗ trợ</Text>
            <View style={styles.contactGrid}>
              {contactItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.contactCard}
                  onPress={item.onPress}
                  activeOpacity={0.8}
                >
                  <View style={[styles.contactIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={styles.contactTitle}>{item.title}</Text>
                  <Text style={styles.contactSub} numberOfLines={1}>{item.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Category tabs ── */}
        {!searchText && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catList}
            style={styles.catScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── FAQ List ── */}
        <View style={styles.section}>
          {searchText ? (
            <Text style={styles.sectionTitle}>
              {filteredFaqs.length > 0
                ? `${filteredFaqs.length} kết quả cho "${searchText}"`
                : `Không tìm thấy kết quả cho "${searchText}"`}
            </Text>
          ) : (
            <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
          )}

          {filteredFaqs.length > 0 ? (
            <View style={styles.faqCard}>
              {filteredFaqs.map((item, idx) => (
                <AccordionItem key={item.id} item={item} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={TEXT_LIGHT} />
              <Text style={styles.emptyTitle}>Không tìm thấy</Text>
              <Text style={styles.emptyDesc}>
                Hãy thử từ khóa khác hoặc liên hệ trực tiếp với đội hỗ trợ của chúng tôi.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate("ChatBot")}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
                <Text style={styles.emptyBtnText}>Chat với hỗ trợ ngay</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Chưa tìm được? ── */}
        {!searchText && (
          <View style={[styles.section, { marginTop: 0 }]}>
            <View style={styles.stillHelpCard}>
              <Ionicons name="help-buoy-outline" size={32} color={PRIMARY} />
              <Text style={styles.stillHelpTitle}>Vẫn chưa tìm được câu trả lời?</Text>
              <Text style={styles.stillHelpDesc}>
                Đội hỗ trợ FoodBee luôn sẵn sàng giải đáp mọi thắc mắc của bạn 24/7.
              </Text>
              <TouchableOpacity
                style={styles.stillHelpBtn}
                onPress={() => navigation.navigate("ChatBot")}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
                <Text style={styles.stillHelpBtnText}>Chat với FoodBee Bot</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: hp("1%"),
  },
  headerSafe: {
    paddingTop: Platform.OS === "android" ? hp("1.5%") : 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1.5%"),
    paddingBottom: hp("1.5%"),
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: wp("4.8%"),
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: wp("3%"),
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginHorizontal: wp("4%"),
    marginBottom: hp("1.5%"),
    paddingHorizontal: wp("3.5%"),
    height: hp("5.5%"),
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: wp("3.5%"),
    color: TEXT_DARK,
  },

  // ── Section ──
  section: {
    marginTop: hp("2.5%"),
    paddingHorizontal: wp("4%"),
  },
  sectionTitle: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: hp("1.5%"),
  },

  // ── Contact Grid ──
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp("3%"),
  },
  contactCard: {
    width: (wp("100%") - wp("8%") - wp("3%")) / 2,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: wp("4%"),
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("1%"),
  },
  contactTitle: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 3,
  },
  contactSub: {
    fontSize: wp("2.9%"),
    color: TEXT_MUTED,
  },

  // ── Category tabs ──
  catScroll: {
    marginTop: hp("1%"),
  },
  catList: {
    paddingHorizontal: wp("4%"),
    gap: wp("2%"),
    paddingVertical: hp("0.5%"),
  },
  catChip: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.8%"),
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  catChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  catChipText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  catChipTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },

  // ── FAQ Card ──
  faqCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: "center",
    paddingVertical: hp("5%"),
    paddingHorizontal: wp("8%"),
  },
  emptyTitle: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: hp("1.5%"),
    marginBottom: hp("0.8%"),
  },
  emptyDesc: {
    fontSize: wp("3.3%"),
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: hp("2.5%"),
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.3%"),
    borderRadius: 12,
  },
  emptyBtnText: {
    color: "#FFF",
    fontSize: wp("3.5%"),
    fontWeight: "700",
  },

  // ── Still help card ──
  stillHelpCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: wp("5%"),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: hp("1%"),
  },
  stillHelpTitle: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: hp("1.2%"),
    marginBottom: hp("0.8%"),
    textAlign: "center",
  },
  stillHelpDesc: {
    fontSize: wp("3.3%"),
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: hp("2%"),
  },
  stillHelpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: wp("6%"),
    paddingVertical: hp("1.4%"),
    borderRadius: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  stillHelpBtnText: {
    color: "#FFF",
    fontSize: wp("3.6%"),
    fontWeight: "700",
  },
});

export default HelpCenter;
