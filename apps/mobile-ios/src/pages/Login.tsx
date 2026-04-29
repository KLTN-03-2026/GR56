import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { SafeAreaView } from "react-native-safe-area-context";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../genaral/api";
import LoadingModal from "../components/LoadingModal";
import ToastMessage from "../components/ToastMessage";

const { width } = Dimensions.get("window");

GoogleSignin.configure({
  webClientId: "1012941706621-9tesdjalhnmb22e2golne8so022hlgvt.apps.googleusercontent.com",
  iosClientId: "1012941706621-fsngvcbl4s0955qu9bstjkbe2lejttht.apps.googleusercontent.com",
  offlineAccess: true,
});

const Login = ({ navigation }: any) => {
  const [role, setRole] = useState<"customer" | "shipper">("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Tab indicator animation
  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchRole = (newRole: "customer" | "shipper") => {
    setRole(newRole);
    Animated.spring(tabAnim, {
      toValue: newRole === "customer" ? 0 : 1,
      tension: 80,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const userInfo: any = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken ?? userInfo.idToken;

      if (!idToken) {
        showToast("Không lấy được Google Token", "error");
        setLoading(false);
        return;
      }

      const res = await apiClient.post("/khach-hang/dang-nhap-google", {
        credential: idToken,
      });

      if (res.data && res.data.status === 1) {
        const token = res.data.key;
        if (token) await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('userRole', 'user');

        let userData: any = { hoten: "Khách hàng", email: "" };
        try {
          const userResponse = await apiClient.get("/khach-hang/data-login");
          if (userResponse.data?.data) userData = userResponse.data.data;
          else if (userResponse.data?.khach_hang) userData = userResponse.data.khach_hang;
        } catch (e) {}
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('isBothRole', "false");

        showToast(res.data.message || "Đăng nhập thành công!", "success");
        navigation.navigate("MainTabs");
      } else {
        showToast(res.data.message || "Đăng nhập Google thất bại", "error");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled
      } else {
        showToast(`Lỗi Google: ${error.code || error.message || "Không xác định"}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      showToast("Vui lòng nhập email và mật khẩu", "error");
      return;
    }

    setLoading(true);
    try {
      if (role === "customer") {
        // ── Customer login ──
        let isAlsoShipper = false;
        const customerRes = await apiClient.post("/khach-hang/dang-nhap", {
          email: cleanEmail, password,
        });

        if (customerRes.data?.status === 1) {
          const token = customerRes.data.token;
          if (token) await AsyncStorage.setItem('token', token);
          await AsyncStorage.setItem('userRole', 'user');
          await AsyncStorage.setItem('savedEmail', cleanEmail);
          await AsyncStorage.setItem('savedPassword', password);

          // Check if also shipper
          try {
            const s = await apiClient.post("/shipper/dang-nhap", { email: cleanEmail, password });
            if (s.data?.status === 1) isAlsoShipper = true;
          } catch (e) {}
          await AsyncStorage.setItem('isBothRole', isAlsoShipper ? "true" : "false");

          let userData: any = { hoten: "Khách hàng", email: cleanEmail };
          try {
            const ur = await apiClient.get("/khach-hang/data-login");
            if (ur.data?.data) userData = ur.data.data;
            else if (ur.data?.khach_hang) userData = ur.data.khach_hang;
          } catch (e) {}
          await AsyncStorage.setItem('userData', JSON.stringify(userData));

          showToast("Đăng nhập thành công!", "success");
          navigation.navigate("MainTabs");
        } else {
          showToast(customerRes.data?.message || "Email hoặc mật khẩu không đúng", "error");
        }
      } else {
        // ── Shipper login ──
        let isAlsoCustomer = false;
        const shipperRes = await apiClient.post("/shipper/dang-nhap", {
          email: cleanEmail, password,
        });

        if (shipperRes.data?.status === 1) {
          const token = shipperRes.data.token;
          if (token) await AsyncStorage.setItem('token', token);
          await AsyncStorage.setItem('userRole', 'shipper');
          await AsyncStorage.setItem('savedEmail', cleanEmail);
          await AsyncStorage.setItem('savedPassword', password);

          // Check if also customer
          try {
            const c = await apiClient.post("/khach-hang/dang-nhap", { email: cleanEmail, password });
            if (c.data?.status === 1) isAlsoCustomer = true;
          } catch (e) {}
          await AsyncStorage.setItem('isBothRole', isAlsoCustomer ? "true" : "false");

          const userData = shipperRes.data.shipper || { hoten: "Tài xế", email: cleanEmail };
          await AsyncStorage.setItem('userData', JSON.stringify(userData));

          showToast("Đăng nhập thành công!", "success");
          navigation.navigate("ShipperTabs");
        } else {
          showToast(shipperRes.data?.message || "Email hoặc mật khẩu không đúng", "error");
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "52%"],
  });

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

      {/* Decorative background circles */}
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
          {/* ── Header ── */}
          <Animated.View
            style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Animated.View
              style={[styles.logoWrapper, { transform: [{ scale: logoScale }, { scale: logoPulse }] }]}
            >
              <View style={styles.logoGlow} />
              <Image source={require("../assets/images/logoFood.png")} style={styles.logoCircle} />
            </Animated.View>

            <Text style={styles.brandName}>FOODBEE</Text>
            <Text style={styles.welcomeText}>Chào mừng trở lại! 👋</Text>
            <Text style={styles.subText}>
              {role === "customer"
                ? "Đăng nhập để khám phá món ngon quanh bạn"
                : "Đăng nhập để bắt đầu hành trình giao hàng"}
            </Text>
          </Animated.View>

          {/* ── Role Tab Switcher ── */}
          <Animated.View style={[styles.tabContainer, { opacity: fadeAnim }]}>
            <View style={styles.tabTrack}>
              <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => switchRole("customer")}
                activeOpacity={0.8}
              >
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
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => switchRole("shipper")}
                activeOpacity={0.8}
              >
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
          <Animated.View
            style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <View style={styles.iconBg}>
                  <Ionicons name="mail-outline" size={18} color="#FF6B00" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputContainer}>
                <View style={styles.iconBg}>
                  <Ionicons name="lock-closed-outline" size={18} color="#FF6B00" />
                </View>
                <TextInput
                  style={[styles.input, { paddingRight: wp("10%") }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="rgba(0,0,0,0.4)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotPassword}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.loginButtonInner}>
                {!loading && (
                  <Ionicons
                    name={role === "customer" ? "arrow-forward-circle-outline" : "bicycle-outline"}
                    size={22}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.loginButtonText}>
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Social (chỉ hiện cho Khách hàng) */}
            {role === "customer" && (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
                  <View style={styles.line} />
                </View>
                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin} activeOpacity={0.8}>
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
              <Text style={styles.footerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(role === "customer" ? "Register" : "ShipperRegister")}
              >
                <Text style={styles.registerLink}>Đăng ký ngay →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: hp("4%"),
  },

  // ── Decorative background ──
  bgCircle1: {
    position: "absolute",
    width: wp("80%"),
    height: wp("80%"),
    borderRadius: wp("40%"),
    backgroundColor: "rgba(255, 107, 0, 0.08)",
    top: -wp("20%"),
    right: -wp("25%"),
  },
  bgCircle2: {
    position: "absolute",
    width: wp("60%"),
    height: wp("60%"),
    borderRadius: wp("30%"),
    backgroundColor: "rgba(255, 150, 50, 0.06)",
    bottom: hp("20%"),
    left: -wp("20%"),
  },
  bgCircle3: {
    position: "absolute",
    width: wp("40%"),
    height: wp("40%"),
    borderRadius: wp("20%"),
    backgroundColor: "rgba(255, 107, 0, 0.05)",
    bottom: hp("5%"),
    right: -wp("10%"),
  },

  // ── Header ──
  header: {
    alignItems: "center",
    paddingTop: hp("5%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("6%"),
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("2%"),
  },
  logoGlow: {
    position: "absolute",
    width: wp("24%"),
    height: wp("24%"),
    borderRadius: wp("12%"),
    backgroundColor: "rgba(255, 107, 0, 0.2)",
    transform: [{ scale: 1.5 }],
  },
  logoCircle: {
    width: wp("22%"),
    height: wp("22%"),
    borderRadius: wp("11%"),
    resizeMode: "contain",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  brandName: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: "#FF6B00",
    letterSpacing: 1.5,
    marginBottom: hp("0.6%"),
    textTransform: "uppercase",
  },
  welcomeText: {
    fontSize: wp("6%"),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: hp("0.5%"),
    textAlign: "center",
  },
  subText: {
    fontSize: wp("3.5%"),
    color: "rgba(0,0,0,0.45)",
    textAlign: "center",
    lineHeight: wp("5.5%"),
    paddingHorizontal: wp("4%"),
  },

  // ── Role Tab Switcher ──
  tabContainer: {
    paddingHorizontal: wp("5%"),
    marginBottom: hp("2%"),
  },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: wp("3%"),
    padding: wp("1%"),
    height: hp("6%"),
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: wp("1%"),
    width: "46%",
    height: hp("5%") - wp("2%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2.5%"),
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: "rgba(0,0,0,0.4)",
  },
  tabTextActive: {
    color: "#FF6B00",
  },

  // ── Form Card ──
  card: {
    marginHorizontal: wp("5%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("6%"),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("3.5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // ── Inputs ──
  inputGroup: { marginBottom: hp("2.2%") },
  label: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: "rgba(0,0,0,0.6)",
    marginBottom: hp("0.8%"),
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: wp("3.5%"),
    paddingHorizontal: wp("3%"),
    height: hp("6.5%"),
  },
  iconBg: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: "rgba(255, 107, 0, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp("2.5%"),
  },
  input: {
    flex: 1,
    fontSize: wp("3.8%"),
    color: "#1A1A1A",
    letterSpacing: 0.2,
  },
  eyeIcon: { padding: wp("2%") },

  // ── Forgot ──
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: hp("2.8%"),
  },
  forgotPassword: {
    color: "#FF6B00",
    fontSize: wp("3.2%"),
    fontWeight: "600",
  },

  // ── Login Button ──
  loginButton: {
    borderRadius: wp("3.5%"),
    marginBottom: hp("2.8%"),
    overflow: "hidden",
    backgroundColor: "#FF6B00",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  loginButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("1.9%"),
  },
  buttonDisabled: { opacity: 0.55 },
  loginButtonText: {
    color: "#FFF",
    fontSize: wp("4%"),
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ── Divider ──
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("2.5%"),
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  dividerText: {
    marginHorizontal: wp("3%"),
    color: "rgba(0,0,0,0.35)",
    fontSize: wp("3%"),
    fontWeight: "500",
  },

  // ── Social ──
  socialButtons: {
    flexDirection: "row",
    gap: wp("3%"),
    marginBottom: hp("3%"),
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: wp("3.5%"),
    paddingVertical: hp("1.6%"),
    backgroundColor: "#FFFFFF",
    gap: wp("1.5%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIcon: {
    width: wp("5%"),
    height: wp("5%"),
    borderRadius: wp("1%"),
  },
  socialText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: "rgba(0,0,0,0.7)",
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: hp("0.5%"),
  },
  footerText: {
    fontSize: wp("3.5%"),
    color: "rgba(0,0,0,0.4)",
  },
  registerLink: {
    fontSize: wp("3.5%"),
    color: "#FF6B00",
    fontWeight: "bold",
  },
});

export default Login;