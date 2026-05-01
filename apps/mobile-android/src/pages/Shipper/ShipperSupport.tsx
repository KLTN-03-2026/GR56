import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

const PRIMARY = "#8B5CF6";
const BACKGROUND = "#F9FAFB";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

const openUrl = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  } catch (error) {
    console.warn("Cannot open URL:", url, error);
  }
};

const ShipperSupport = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hỗ trợ tài xế</Text>
          <View style={{ width: wp("10%") }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Giúp tài xế đi đơn nhanh hơn</Text>
          <Text style={styles.introText}>
            Nếu bạn gặp vấn đề khi nhận đơn, giao hàng hoặc cần hỗ trợ kỹ thuật, FoodBee luôn sẵn sàng trợ giúp.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Liên hệ nhanh</Text>
          <TouchableOpacity
            style={styles.contactItem}
            activeOpacity={0.8}
            onPress={() => openUrl("tel:19001234")}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="call-outline" size={22} color="#fff" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Hotline hỗ trợ</Text>
              <Text style={styles.contactValue}>1900 1234</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            activeOpacity={0.8}
            onPress={() => openUrl("mailto:hotro@foodbee.io.vn")}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#22C55E" }]}>
              <Ionicons name="mail-outline" size={22} color="#fff" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email hỗ trợ</Text>
              <Text style={styles.contactValue}>hotro@foodbee.io.vn</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            activeOpacity={0.8}
            onPress={() => openUrl("https://zalo.me/19001234")}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#2D8CFF" }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Chat nhanh</Text>
              <Text style={styles.contactValue}>Zalo / Chat trực tiếp</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Hướng dẫn nhanh</Text>
          <View style={styles.helpItem}>
            <Text style={styles.helpTitle}>Cách nhận đơn hiệu quả</Text>
            <Text style={styles.helpText}>
              Luôn giữ trạng thái sẵn sàng, mở app liên tục và xác nhận đơn trong vòng 2 phút để tăng tỉ lệ nhận đơn.
            </Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpTitle}>Quy trình giao hàng</Text>
            <Text style={styles.helpText}>
              Kiểm tra địa chỉ, hỏi khách hàng nếu không rõ, chụp ảnh giao hàng nếu khách yêu cầu và cập nhật trạng thái trong app.
            </Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpTitle}>Xử lý sự cố</Text>
            <Text style={styles.helpText}>
              Nếu không thể giao hàng, hãy liên hệ hotline trước khi huỷ đơn và chờ phản hồi từ bộ phận tổng đài.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}> 
          <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Làm thế nào đổi mật khẩu tài xế?</Text>
            <Text style={styles.faqAnswer}>Vào mục Hồ sơ → Đổi mật khẩu, nhập mật khẩu hiện tại và mật khẩu mới.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Khi nào được thanh toán?</Text>
            <Text style={styles.faqAnswer}>Tiền thưởng sẽ được chuyển vào tài khoản trong vòng 24-48 giờ sau khi đơn hoàn thành.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Làm sao báo lỗi app?</Text>
            <Text style={styles.faqAnswer}>Gửi email chi tiết lỗi hoặc chụp màn hình và gửi cho tổng đài để bộ phận kỹ thuật hỗ trợ nhanh.</Text>
          </View>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>FoodBee tài xế luôn đồng hành cùng bạn. Nếu cần hỗ trợ thêm, gọi ngay hotline hoặc chat trực tiếp để được giải đáp nhanh.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  safeArea: {
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("2%"),
  },
  backButton: {
    width: wp("10%"),
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: wp("5%"),
    fontWeight: "700",
    color: TEXT_DARK,
  },
  body: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: wp("4%"),
    paddingBottom: hp("4%"),
  },
  introCard: {
    marginTop: hp("2%"),
    padding: wp("5%"),
    borderRadius: wp("4%"),
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  introTitle: {
    fontSize: wp("5.2%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: hp("1%"),
  },
  introText: {
    fontSize: wp("3.5%"),
    color: TEXT_MUTED,
    lineHeight: hp("2.7%"),
  },
  sectionCard: {
    marginTop: hp("2.5%"),
    borderRadius: wp("4%"),
    backgroundColor: "#FFF",
    overflow: "hidden",
    padding: wp("4%"),
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: hp("1.2%"),
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: wp("3%"),
    padding: wp("3.5%"),
    marginBottom: hp("1%") ,
  },
  contactIcon: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("3%"),
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp("3%"),
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: wp("3.5%"),
    fontWeight: "700",
    color: TEXT_DARK,
  },
  contactValue: {
    fontSize: wp("3.2%"),
    color: TEXT_MUTED,
    marginTop: hp("0.3%"),
  },
  helpItem: {
    marginBottom: hp("1.5%"),
  },
  helpTitle: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: hp("0.6%"),
  },
  helpText: {
    fontSize: wp("3.4%"),
    color: TEXT_MUTED,
    lineHeight: hp("2.6%"),
  },
  faqItem: {
    marginBottom: hp("1.2%"),
  },
  faqQuestion: {
    fontSize: wp("3.6%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: hp("0.5%"),
  },
  faqAnswer: {
    fontSize: wp("3.3%"),
    color: TEXT_MUTED,
    lineHeight: hp("2.4%"),
  },
  footerCard: {
    marginTop: hp("2.5%"),
    padding: wp("4%"),
    borderRadius: wp("4%"),
    backgroundColor: "#EEF2FF",
  },
  footerText: {
    color: TEXT_DARK,
    fontSize: wp("3.4%"),
    lineHeight: hp("2.6%"),
  },
});

export default ShipperSupport;
