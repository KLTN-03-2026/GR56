import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../genaral/api";
import LoadingModal from "../components/LoadingModal";
import ToastMessage from "../components/ToastMessage";

// ── Đặt ngoài Register để tránh re-mount mỗi lần render (mất focus input) ──
const InputField = ({
  label, iconName, placeholder, value, onChangeText,
  keyboardType = "default", secureTextEntry = false,
  rightElement, styles, maxLength,
}: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <View style={styles.iconBg}>
        <Ionicons name={iconName} size={18} color="#FF6B00" />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(0,0,0,0.3)"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        maxLength={maxLength}
      />
      {rightElement}
    </View>
  </View>
);

const Register = ({ navigation }: any) => {
  const [role, setRole] = useState<"customer" | "shipper">("customer");

  // Customer fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Shipper extra fields
  const [cccd, setCccd] = useState("");

  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchRole = (newRole: "customer" | "shipper") => {
    setRole(newRole);
    Animated.spring(tabAnim, {
      toValue: newRole === "customer" ? 0 : 1,
      tension: 80,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "52%"],
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleDobChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length >= 3 && cleaned.length <= 4) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    } else if (cleaned.length >= 5) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4) + "/" + cleaned.slice(4, 8);
    }
    setDob(formatted);
  };

  const handleCustomerRegister = async () => {
    if (!fullName || !email || !phone || !dob || !password || !confirmPassword) {
      showToast("Vui lòng điền đầy đủ thông tin", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Mật khẩu không khớp", "error");
      return;
    }
    if (!agreeTerms) {
      showToast("Vui lòng đồng ý với điều khoản và chính sách", "error");
      return;
    }

    setLoading(true);
    try {
      let formattedDob = dob;
      if (dob.includes('/')) {
        const [day, month, year] = dob.split('/');
        formattedDob = `${year}-${month}-${day}`;
      }

      const response = await apiClient.post("/khach-hang/dang-ky", {
        ho_va_ten: fullName,
        email,
        so_dien_thoai: phone,
        ngay_sinh: formattedDob,
        password,
        agreeTerms,
      });

      if (response.data.status === 1) {
        showToast(response.data.message || "Đăng ký thành công", "success");
        setTimeout(() => navigation.navigate("Login"), 1500);
      } else {
        showToast(response.data.message || "Đăng ký thất bại", "error");
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Có lỗi xảy ra, vui lòng thử lại.";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleShipperRegister = async () => {
    if (!fullName || !email || !phone || !cccd || !password) {
      showToast("Vui lòng điền đầy đủ thông tin", "error");
      return;
    }
    if (cccd.length !== 12) {
      showToast("CCCD phải đủ 12 số", "error");
      return;
    }
    if (!agreeTerms) {
      showToast("Vui lòng đồng ý với điều khoản và chính sách", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/shipper/dang-ky", {
        ho_va_ten: fullName,
        email,
        so_dien_thoai: phone,
        cccd,
        password,
      });

      if (response.data.status === 1) {
        showToast(response.data.message || "Đăng ký thành công! Vui lòng đăng nhập.", "success");
        setTimeout(() => navigation.navigate("Login"), 1500);
      } else {
        showToast(response.data.message || "Đăng ký thất bại", "error");
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Có lỗi xảy ra, vui lòng thử lại.";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LoadingModal visible={loading} />
      <ToastMessage
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Top nav ── */}
          <Animated.View style={[styles.topNav, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Đăng ký</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* ── Header ── */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Image source={require("../assets/images/logoFood.png")} style={styles.logoImg} />
            <Text style={styles.brandName}>FOODBEE</Text>
            <Text style={styles.welcomeText}>
              {role === "customer" ? "Tạo tài khoản mới ✨" : "Trở thành Shipper 🛵"}
            </Text>
            <Text style={styles.subText}>
              {role === "customer"
                ? "Điền thông tin bên dưới để bắt đầu hành trình ăn uống"
                : "Đăng ký để giao hàng và gia tăng thu nhập cùng FOODBEE"}
            </Text>
          </Animated.View>

          {/* ── Role Tab Switcher ── */}
          <Animated.View style={[styles.tabContainer, { opacity: fadeAnim }]}>
            <View style={styles.tabTrack}>
              <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
              <TouchableOpacity style={styles.tabBtn} onPress={() => switchRole("customer")} activeOpacity={0.8}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={role === "customer" ? "#FF6B00" : "rgba(0,0,0,0.4)"}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, role === "customer" && styles.tabTextActive]}>
                  Khách hàng
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabBtn} onPress={() => switchRole("shipper")} activeOpacity={0.8}>
                <Ionicons
                  name="bicycle-outline"
                  size={16}
                  color={role === "shipper" ? "#FF6B00" : "rgba(0,0,0,0.4)"}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, role === "shipper" && styles.tabTextActive]}>
                  Shipper
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Form Card ── */}
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Họ tên */}
            <InputField
              label="Họ và tên đầy đủ"
              iconName="person-outline"
              placeholder="Nhập họ tên của bạn"
              value={fullName}
              onChangeText={setFullName}
              styles={styles}
            />

            {/* Email */}
            <InputField
              label="Email"
              iconName="mail-outline"
              placeholder="example@gmail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              styles={styles}
            />

            {/* Số điện thoại */}
            <InputField
              label="Số điện thoại"
              iconName="call-outline"
              placeholder="09 xx xxx xxx"
              value={phone}
              onChangeText={(text: string) => setPhone(text.replace(/[^0-9]/g, ""))}
              keyboardType="phone-pad"
              maxLength={10}
              styles={styles}
            />

            {/* Ngày sinh - chỉ cho Khách hàng */}
            {role === "customer" && (
              <InputField
                label="Ngày sinh"
                iconName="calendar-outline"
                placeholder="DD/MM/YYYY"
                value={dob}
                onChangeText={handleDobChange}
                keyboardType="numeric"
                styles={styles}
              />
            )}

            {/* CCCD - chỉ cho Shipper */}
            {role === "shipper" && (
              <InputField
                label="Căn cước công dân (CCCD)"
                iconName="card-outline"
                placeholder="Nhập 12 số định danh"
                value={cccd}
                onChangeText={(text: string) => setCccd(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={12}
                styles={styles}
              />
            )}

            {/* Mật khẩu */}
            <InputField
              label="Mật khẩu"
              iconName="lock-closed-outline"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              styles={styles}
              rightElement={
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="rgba(0,0,0,0.4)"
                  />
                </TouchableOpacity>
              }
            />

            {/* Xác nhận mật khẩu - chỉ Khách hàng */}
            {role === "customer" && (
              <InputField
                label="Xác nhận mật khẩu"
                iconName="shield-checkmark-outline"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                styles={styles}
                rightElement={
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="rgba(0,0,0,0.4)"
                    />
                  </TouchableOpacity>
                }
              />
            )}

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Pressable
                style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </Pressable>
              <Text style={styles.termsText}>
                Tôi đồng ý với{" "}
                <Text style={styles.termsLink}>Điều khoản và điều kiện</Text> và{" "}
                <Text style={styles.termsLink}>Chính sách bảo mật</Text>
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.buttonDisabled]}
              onPress={role === "customer" ? handleCustomerRegister : handleShipperRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.registerButtonInner}>
                {!loading && (
                  <Ionicons
                    name={role === "customer" ? "person-add-outline" : "bicycle-outline"}
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.registerButtonText}>
                  {loading
                    ? "Đang đăng ký..."
                    : role === "customer" ? "Đăng ký" : "Đăng ký Shipper"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Social - chỉ cho Khách hàng */}
            {role === "customer" && (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>Hoặc đăng ký với</Text>
                  <View style={styles.line} />
                </View>
                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                    <Image source={{ uri: "https://www.google.com/favicon.ico" }} style={styles.socialIcon} />
                    <Text style={styles.socialText}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                    <Image source={{ uri: "https://www.facebook.com/favicon.ico" }} style={styles.socialIcon} />
                    <Text style={styles.socialText}>Facebook</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Đăng nhập →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: hp("5%") },

  bgCircle1: {
    position: "absolute", width: wp("80%"), height: wp("80%"),
    borderRadius: wp("40%"), backgroundColor: "rgba(255, 107, 0, 0.08)",
    top: -wp("20%"), right: -wp("25%"),
  },
  bgCircle2: {
    position: "absolute", width: wp("60%"), height: wp("60%"),
    borderRadius: wp("30%"), backgroundColor: "rgba(255, 150, 50, 0.06)",
    bottom: hp("30%"), left: -wp("20%"),
  },
  bgCircle3: {
    position: "absolute", width: wp("40%"), height: wp("40%"),
    borderRadius: wp("20%"), backgroundColor: "rgba(255, 107, 0, 0.05)",
    bottom: hp("5%"), right: -wp("10%"),
  },

  // ── Top Nav ──
  topNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: wp("4%"), paddingTop: hp("1.5%"), paddingBottom: hp("0.5%"),
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)", borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)", justifyContent: "center", alignItems: "center",
  },
  navTitle: { fontSize: wp("4.2%"), fontWeight: "700", color: "#1A1A1A", letterSpacing: 0.3 },

  // ── Header ──
  header: {
    alignItems: "center", paddingTop: hp("1.5%"),
    paddingBottom: hp("2%"), paddingHorizontal: wp("6%"),
  },
  logoImg: {
    width: wp("16%"), height: wp("16%"), borderRadius: wp("8%"),
    resizeMode: "contain", marginBottom: hp("1%"),
  },
  brandName: {
    fontSize: wp("4.5%"), fontWeight: "800", color: "#FF6B00",
    letterSpacing: 1.2, marginBottom: hp("0.5%"),
  },
  welcomeText: {
    fontSize: wp("5.5%"), fontWeight: "700", color: "#1A1A1A",
    marginBottom: hp("0.5%"), textAlign: "center",
  },
  subText: {
    fontSize: wp("3.3%"), color: "rgba(0,0,0,0.42)", textAlign: "center",
    lineHeight: wp("5%"), paddingHorizontal: wp("4%"),
  },

  // ── Tab Switcher ──
  tabContainer: { paddingHorizontal: wp("5%"), marginBottom: hp("2%") },
  tabTrack: {
    flexDirection: "row", backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: wp("3%"), padding: wp("1%"), height: hp("6%"), position: "relative",
  },
  tabIndicator: {
    position: "absolute", top: wp("1%"), width: "46%",
    height: hp("5%") - wp("2%"), backgroundColor: "#FFFFFF",
    borderRadius: wp("2.5%"), shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15,
    shadowRadius: 6, elevation: 3,
  },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", zIndex: 1 },
  tabText: { fontSize: wp("3.5%"), fontWeight: "600", color: "rgba(0,0,0,0.4)" },
  tabTextActive: { color: "#FF6B00" },

  // ── Form Card ──
  card: {
    marginHorizontal: wp("5%"), backgroundColor: "#FFFFFF",
    borderRadius: wp("6%"), borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: wp("5%"), paddingVertical: hp("3%"),
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },

  // ── Inputs ──
  inputGroup: { marginBottom: hp("2%") },
  label: {
    fontSize: wp("3.2%"), fontWeight: "600", color: "rgba(0,0,0,0.6)",
    marginBottom: hp("0.7%"), letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderRadius: wp("3.5%"),
    paddingHorizontal: wp("3%"), height: hp("6.2%"),
  },
  iconBg: {
    width: wp("7.5%"), height: wp("7.5%"), borderRadius: wp("3.75%"),
    backgroundColor: "rgba(255, 107, 0, 0.12)", justifyContent: "center",
    alignItems: "center", marginRight: wp("2.5%"),
  },
  input: { flex: 1, fontSize: wp("3.7%"), color: "#1A1A1A", letterSpacing: 0.2 },
  eyeIcon: { padding: wp("2%") },

  // ── Terms ──
  termsContainer: {
    flexDirection: "row", alignItems: "center",
    marginBottom: hp("2.5%"), gap: wp("3%"),
  },
  checkbox: {
    width: wp("5.5%"), height: wp("5.5%"), borderRadius: wp("1.5%"),
    borderWidth: 1.5, borderColor: "rgba(0,0,0,0.25)",
    backgroundColor: "rgba(0,0,0,0.04)", justifyContent: "center", alignItems: "center",
  },
  checkboxChecked: { backgroundColor: "#FF6B00", borderColor: "#FF6B00" },
  termsText: { fontSize: wp("3%"), color: "rgba(0,0,0,0.45)", flex: 1, lineHeight: hp("2.2%") },
  termsLink: { color: "#FF6B00", fontWeight: "600" },

  // ── Register Button ──
  registerButton: {
    borderRadius: wp("3.5%"), marginBottom: hp("2.8%"),
    backgroundColor: "#FF6B00", shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4,
    shadowRadius: 12, elevation: 10,
  },
  registerButtonInner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingVertical: hp("1.9%"),
  },
  buttonDisabled: { opacity: 0.55 },
  registerButtonText: { color: "#FFF", fontSize: wp("4%"), fontWeight: "700", letterSpacing: 0.5 },

  // ── Divider ──
  divider: { flexDirection: "row", alignItems: "center", marginBottom: hp("2.5%") },
  line: { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.1)" },
  dividerText: {
    marginHorizontal: wp("3%"), color: "rgba(0,0,0,0.35)",
    fontSize: wp("3%"), fontWeight: "500",
  },

  // ── Social ──
  socialButtons: { flexDirection: "row", gap: wp("3%"), marginBottom: hp("3%") },
  socialButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", borderRadius: wp("3.5%"),
    paddingVertical: hp("1.6%"), backgroundColor: "#FFFFFF", gap: wp("1.5%"),
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  socialIcon: { width: wp("5%"), height: wp("5%"), borderRadius: wp("1%") },
  socialText: { fontSize: wp("3.5%"), fontWeight: "600", color: "rgba(0,0,0,0.7)" },

  // ── Footer ──
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: wp("3.5%"), color: "rgba(0,0,0,0.4)" },
  loginLink: { fontSize: wp("3.5%"), color: "#FF6B00", fontWeight: "700" },
});

export default Register;