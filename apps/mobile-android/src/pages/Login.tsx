import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Pressable,
  Alert,
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

const { width, height } = Dimensions.get("window");

GoogleSignin.configure({
  webClientId: "1012941706621-9tesdjalhnmb22e2golne8so022hlgvt.apps.googleusercontent.com",
  offlineAccess: true,
});

const Login = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };



  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut(); // Đảm bảo đăng xuất trước khi đăng nhập lại
      const userInfo: any = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken ?? userInfo.idToken;

      if (!idToken) {
        throw new Error("No ID Token returned");
      }

      if (!idToken) {
        showToast("Không lấy được Google Token", "error");
        setLoading(false);
        return;
      }

      const res = await apiClient.post("/khach-hang/dang-nhap-google", {
        credential: idToken, // ✅ backend nhận $request->credential
      });

      if (res.data && res.data.status === 1) {
        // API trả về 'key' thay vì 'token'
        const token = res.data.key;
        if (token) {
          await AsyncStorage.setItem('token', token);
        }
        await AsyncStorage.setItem('userRole', 'user');

        // Fetch user data
        let userData: any = { hoten: "Khách hàng", email: "" };
        try {
          const userResponse = await apiClient.get("/khach-hang/data-login");
          if (userResponse.data && userResponse.data.data) {
            userData = userResponse.data.data;
          } else if (userResponse.data && userResponse.data.khach_hang) {
            userData = userResponse.data.khach_hang;
          }
        } catch (e) {
          console.log("Error fetching user data:", e);
        }
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('isBothRole', "false"); // Google login tạm thời check như khách hàng thôi

        showToast(res.data.message || "Đăng nhập thành công!", "success");
        navigation.navigate("MainTabs");
      } else {
        showToast(res.data.message || "Đăng nhập Google thất bại", "error");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("[Google] User cancelled login");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showToast("Đang đăng nhập Google...", "info");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showToast("Google Play Services không khả dụng", "error");
      } else {
        // Log chi tiết lỗi để debug
        console.log("=== GOOGLE LOGIN ERROR ===");
        console.log("Code:", error.code);
        console.log("Message:", error.message);
        console.log("Full error:", JSON.stringify(error, null, 2));
        console.log("=========================");
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
      // 1. Try Customer Login first
      let isUser = false;
      let finalRole = "";
      let response: any = null;
      let lastError: any = null;

      try {
        const customerRes = await apiClient.post("/khach-hang/dang-nhap", {
          email: cleanEmail,
          password,
        });
        if (customerRes.data && customerRes.data.status === 1) {
          response = customerRes;
          isUser = true;
          finalRole = "user";
        } else {
          lastError = customerRes.data?.message || "Đăng nhập Khách hàng thất bại";
        }
      } catch (error: any) {
        lastError = error;
      }

      // 2. If Customer Login fails, Try Shipper Login
      if (!isUser) {
        try {
          const shipperRes = await apiClient.post("/shipper/dang-nhap", {
            email: cleanEmail,
            password,
          });
          if (shipperRes.data && shipperRes.data.status === 1) {
            response = shipperRes;
            isUser = false;
            finalRole = "shipper";
          } else {
            // Only overwrite error if shipper also explicitly failed with a message
            if (shipperRes.data?.message) {
              lastError = shipperRes.data.message;
            }
          }
        } catch (error: any) {
          lastError = error;
        }
      }

      if (response && response.data && response.data.status === 1) {
        console.log("Login Success Message:", response.data.message);

        // Check if user has both roles
        let isAlsoCustomer = isUser;
        let isAlsoShipper = !isUser;

        if (isUser) {
          try {
            const tempRes = await apiClient.post("/shipper/dang-nhap", { email: cleanEmail, password });
            if (tempRes?.data?.status === 1) {
              isAlsoShipper = true;
            }
          } catch (e) { }
        } else {
          // If they failed user login but passed shipper login, they might still be a customer who just entered the wrong password initially? 
          // Wait, if they failed customer login with this email/password, they are ONLY a shipper, UNLESS the user system is down.
          // BUT, if they just registered as a shipper with the SAME email and DIFFERENT password? 
          // Let's check Customer login just in case:
          try {
            const tempRes = await apiClient.post("/khach-hang/dang-nhap", { email: cleanEmail, password });
            if (tempRes?.data?.status === 1) {
              isAlsoCustomer = true;
            }
          } catch (e) { }
        }

        // Save credentials for fast switching
        await AsyncStorage.setItem('savedEmail', cleanEmail);
        await AsyncStorage.setItem('savedPassword', password);
        await AsyncStorage.setItem('isBothRole', (isAlsoCustomer && isAlsoShipper) ? "true" : "false");

        // Save user data to AsyncStorage
        const token = response.data.token;
        if (token) {
          await AsyncStorage.setItem('token', token);
        }
        await AsyncStorage.setItem('userRole', finalRole); // Save selected role

        let userData = null;

        if (isUser) {
          try {
            // Fetch real user data using the token
            const userResponse = await apiClient.get("/khach-hang/data-login");
            if (userResponse.data && userResponse.data.data) {
              userData = userResponse.data.data;
            } else if (userResponse.data && userResponse.data.khach_hang) {
              userData = userResponse.data.khach_hang;
            }
          } catch (e) {
            console.log("Error fetching user data:", e);
          }
        } else {
          // Shipper role provides data directly in login response
          userData = response.data.shipper;
        }

        // As a fallback
        if (!userData) {
          userData = {
            hoten: isUser ? "Khách hàng" : "Tài xế",
            email: cleanEmail
          };
        }
        await AsyncStorage.setItem('userData', JSON.stringify(userData));

        // Navigate to appropriate tabs
        if (isUser) {
          navigation.navigate("MainTabs");
        } else {
          navigation.navigate("ShipperTabs"); // Make sure ShipperTabs is mapped in App.tsx!
        }
      } else {
        // Neither login succeeded
        let errorMessage = "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.";
        if (lastError) {
          if (typeof lastError === "string") {
            errorMessage = lastError;
          } else if (lastError.response?.data) {
            if (lastError.response.data.errors) {
              const firstErrorKey = Object.keys(lastError.response.data.errors)[0];
              errorMessage = lastError.response.data.errors[firstErrorKey][0];
            } else if (lastError.response.data.message) {
              errorMessage = lastError.response.data.message;
            }
          } else if (lastError.message) {
            errorMessage = lastError.message;
          }
        }
        showToast(errorMessage, "error");
      }
    } catch (error: any) {
      console.log("Unexpected Login error:", error);
      showToast("Có lỗi xảy ra, vui lòng thử lại.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo pulse loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Animated.View
              style={[
                styles.logoWrapper,
                { transform: [{ scale: logoScale }, { scale: logoPulse }] },
              ]}
            >
              <View style={styles.logoGlow} />
              <Image
                source={require("../assets/images/logoFood.png")}
                style={styles.logoCircle}
              />
            </Animated.View>

            <Text style={styles.brandName}>FoodBee</Text>
            <Text style={styles.welcomeText}>Chào mừng trở lại! 👋</Text>
            <Text style={styles.subText}>Đăng nhập để khám phá món ngon quanh bạn</Text>
          </Animated.View>

          {/* ── Form Card ── */}
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email hoặc Số điện thoại</Text>
              <View style={styles.inputContainer}>
                <View style={styles.iconBg}>
                  <Ionicons name="mail-outline" size={18} color="#E63946" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
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
                  <Ionicons name="lock-closed-outline" size={18} color="#E63946" />
                </View>
                <TextInput
                  style={[styles.input, { paddingRight: wp("10%") }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="rgba(255,255,255,0.5)"
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
                    name="arrow-forward-circle-outline"
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

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
              <View style={styles.line} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: "https://www.google.com/favicon.ico" }}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <Image
                  source={{ uri: "https://www.facebook.com/favicon.ico" }}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
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
    backgroundColor: "#0F0F1A",
  },
  container: {
    flex: 1,
  },
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
    backgroundColor: "rgba(230, 57, 70, 0.08)",
    top: -wp("20%"),
    right: -wp("25%"),
  },
  bgCircle2: {
    position: "absolute",
    width: wp("60%"),
    height: wp("60%"),
    borderRadius: wp("30%"),
    backgroundColor: "rgba(100, 50, 200, 0.07)",
    bottom: hp("20%"),
    left: -wp("20%"),
  },
  bgCircle3: {
    position: "absolute",
    width: wp("40%"),
    height: wp("40%"),
    borderRadius: wp("20%"),
    backgroundColor: "rgba(230, 57, 70, 0.05)",
    bottom: hp("5%"),
    right: -wp("10%"),
  },

  // ── Header ──
  header: {
    alignItems: "center",
    paddingTop: hp("6%"),
    paddingBottom: hp("3%"),
    paddingHorizontal: wp("6%"),
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("2.5%"),
  },
  logoGlow: {
    position: "absolute",
    width: wp("24%"),
    height: wp("24%"),
    borderRadius: wp("12%"),
    backgroundColor: "rgba(230, 57, 70, 0.25)",
    transform: [{ scale: 1.5 }],
  },
  logoCircle: {
    width: wp("22%"),
    height: wp("22%"),
    borderRadius: wp("11%"),
    resizeMode: "contain",
    shadowColor: "#E63946",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  brandName: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: "#E63946",
    letterSpacing: 1.5,
    marginBottom: hp("1%"),
    textTransform: "uppercase",
  },
  welcomeText: {
    fontSize: wp("6.5%"),
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: hp("0.8%"),
    textAlign: "center",
  },
  subText: {
    fontSize: wp("3.5%"),
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: wp("5.5%"),
    paddingHorizontal: wp("4%"),
  },

  // ── Form Card ──
  card: {
    marginHorizontal: wp("5%"),
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: wp("6%"),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("3.5%"),
  },

  // ── Inputs ──
  inputGroup: {
    marginBottom: hp("2.2%"),
  },
  label: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    marginBottom: hp("0.8%"),
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: wp("3.5%"),
    paddingHorizontal: wp("3%"),
    height: hp("6.5%"),
  },
  iconBg: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    backgroundColor: "rgba(230, 57, 70, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp("2.5%"),
  },
  input: {
    flex: 1,
    fontSize: wp("3.8%"),
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  eyeIcon: {
    padding: wp("2%"),
  },

  // ── Forgot ──
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: hp("2.8%"),
  },
  forgotPassword: {
    color: "#E63946",
    fontSize: wp("3.2%"),
    fontWeight: "600",
  },

  // ── Login Button ──
  loginButton: {
    borderRadius: wp("3.5%"),
    marginBottom: hp("2.8%"),
    overflow: "hidden",
    backgroundColor: "#E63946",
    shadowColor: "#E63946",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  loginButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("1.9%"),
  },
  buttonDisabled: {
    opacity: 0.55,
  },
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
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    marginHorizontal: wp("3%"),
    color: "rgba(255,255,255,0.35)",
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
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: wp("3.5%"),
    paddingVertical: hp("1.6%"),
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: wp("1.5%"),
  },
  socialIcon: {
    width: wp("5%"),
    height: wp("5%"),
    borderRadius: wp("1%"),
  },
  socialText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
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
    color: "rgba(255,255,255,0.4)",
  },
  registerLink: {
    fontSize: wp("3.5%"),
    color: "#E63946",
    fontWeight: "bold",
  },
});

export default Login;