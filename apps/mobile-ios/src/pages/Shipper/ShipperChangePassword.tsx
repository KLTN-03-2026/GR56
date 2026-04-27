import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
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
import CustomAlert, { AlertButton } from "../../components/CustomAlert";

const PRIMARY = "#EE4D2D";
const PRIMARY_DARK = "#C73D20";
const BG = "#F5F6F8";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";
const BORDER = "#E2E8F0";

// ─── PasswordInput Component ──────────────────────────────

const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  show,
  onToggleShow,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggleShow: () => void;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      <Ionicons name="lock-closed-outline" size={18} color={PRIMARY} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        secureTextEntry={!show}
        autoCapitalize="none"
      />
      <TouchableOpacity
        onPress={onToggleShow}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={show ? "eye-off-outline" : "eye-outline"}
          size={20}
          color={TEXT_MUTED}
        />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Main Component ───────────────────────────────────────

const ShipperChangePassword = ({ navigation }: any) => {
  const [form, setForm] = useState({
    old_password: "",
    password: "",
    re_password: "",
  });
  const [show, setShow] = useState({
    old_password: false,
    password: false,
    re_password: false,
  });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
    type: "info",
    title: "",
  });

  const showAlert = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => setAlert({ visible: true, type, title, message, buttons });

  const hideAlert = () => setAlert((p) => ({ ...p, visible: false }));

  // ── Validate ──────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.old_password.trim()) return "Mật khẩu cũ không được để trống.";
    if (form.old_password.length < 6) return "Mật khẩu cũ phải có ít nhất 6 ký tự.";
    if (!form.password.trim()) return "Mật khẩu mới không được để trống.";
    if (form.password.length < 6) return "Mật khẩu mới phải có ít nhất 6 ký tự.";
    if (!form.re_password.trim()) return "Nhập lại mật khẩu không được để trống.";
    if (form.password !== form.re_password) return "Nhập lại mật khẩu không khớp.";
    if (form.password === form.old_password) return "Mật khẩu mới phải khác mật khẩu cũ.";
    return null;
  };

  // ── Gửi API ───────────────────────────────────────────
  const handleSave = async () => {
    const err = validate();
    if (err) {
      showAlert("warning", "Thông báo", err);
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.post("/shipper/update-password", {
        old_password: form.old_password,
        password: form.password,
        re_password: form.re_password,
      });

      if (res.data?.status === 1) {
        showAlert("success", "Thành công", res.data?.message ?? "Mật khẩu đã được cập nhật.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        showAlert("warning", "Thông báo", res.data?.message ?? "Cập nhật không thành công.");
      }
    } catch (e: any) {
      const errors = e?.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors)[0];
        showAlert(
          "error",
          "Lỗi",
          Array.isArray(firstError) ? (firstError[0] as string) : String(firstError)
        );
      } else {
        showAlert(
          "error",
          "Lỗi",
          e?.response?.data?.message ?? "Không thể kết nối máy chủ. Vui lòng thử lại."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor={PRIMARY_DARK} barStyle="light-content" />

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={hideAlert}
        dismissOnBackdrop={false}
      />

      {/* Header */}
      <View style={styles.headerBg}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
            <TouchableOpacity
              style={styles.saveHeaderBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.75}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveHeaderBtnText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* Icon minh họa */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={40} color={PRIMARY} />
          </View>
          <Text style={styles.iconTitle}>Bảo mật tài khoản</Text>
          <Text style={styles.iconSub}>
            Mật khẩu mới phải có ít nhất 6 ký tự và khác mật khẩu cũ.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={18} color={PRIMARY} />
            <Text style={styles.sectionTitle}>Thay đổi mật khẩu</Text>
          </View>

          <PasswordInput
            label="Mật khẩu hiện tại *"
            value={form.old_password}
            onChangeText={(v) => setForm((p) => ({ ...p, old_password: v }))}
            placeholder="Nhập mật khẩu hiện tại"
            show={show.old_password}
            onToggleShow={() => setShow((p) => ({ ...p, old_password: !p.old_password }))}
          />

          <View style={styles.divider} />

          <PasswordInput
            label="Mật khẩu mới *"
            value={form.password}
            onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
            placeholder="Nhập mật khẩu mới"
            show={show.password}
            onToggleShow={() => setShow((p) => ({ ...p, password: !p.password }))}
          />

          <PasswordInput
            label="Nhập lại mật khẩu mới *"
            value={form.re_password}
            onChangeText={(v) => setForm((p) => ({ ...p, re_password: v }))}
            placeholder="Nhập lại mật khẩu mới"
            show={show.re_password}
            onToggleShow={() => setShow((p) => ({ ...p, re_password: !p.re_password }))}
          />

          {/* Thanh độ mạnh mật khẩu */}
          {form.password.length > 0 && (
            <PasswordStrength password={form.password} />
          )}
        </View>

        {/* Nút lưu */}
        <TouchableOpacity
          style={[styles.saveBottomBtn, saving && styles.saveBottomBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.saveBottomBtnText}>Cập nhật mật khẩu</Text>
            </>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Password Strength Indicator ─────────────────────────

const PasswordStrength = ({ password }: { password: string }) => {
  const getStrength = (): { level: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: "Yếu", color: "#EF4444" };
    if (score === 2) return { level: 2, label: "Trung bình", color: "#F59E0B" };
    if (score === 3) return { level: 3, label: "Mạnh", color: "#10B981" };
    return { level: 4, label: "Rất mạnh", color: "#059669" };
  };

  const { level, label, color } = getStrength();

  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              { backgroundColor: i <= level ? color : "#E2E8F0" },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  headerBg: {
    backgroundColor: PRIMARY,
    paddingBottom: hp("1.5%"),
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1%"),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: "#FFF",
  },
  saveHeaderBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.7%"),
    borderRadius: 20,
    minWidth: 56,
    alignItems: "center",
  },
  saveHeaderBtnText: { color: "#FFF", fontWeight: "700", fontSize: wp("3.5%") },

  scrollContent: { paddingBottom: hp("5%") },

  iconSection: {
    alignItems: "center",
    paddingVertical: hp("3.5%"),
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconCircle: {
    width: wp("20%"),
    height: wp("20%"),
    borderRadius: wp("10%"),
    backgroundColor: "#FFF0ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FECDC4",
  },
  iconTitle: {
    marginTop: hp("1.5%"),
    fontSize: wp("4.5%"),
    fontWeight: "700",
    color: TEXT_DARK,
  },
  iconSub: {
    marginTop: hp("0.6%"),
    fontSize: wp("3.2%"),
    color: TEXT_MUTED,
    textAlign: "center",
    paddingHorizontal: wp("8%"),
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#FFF",
    marginHorizontal: wp("4%"),
    marginTop: hp("2%"),
    borderRadius: 16,
    padding: wp("4%"),
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: hp("2%"),
    paddingBottom: hp("1%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: TEXT_DARK,
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: hp("1.5%"),
  },

  inputGroup: { marginBottom: hp("1.8%") },
  label: {
    fontSize: wp("3.4%"),
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: hp("0.6%"),
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: wp("3%"),
    height: hp("6%"),
  },
  inputIcon: { marginRight: wp("2%") },
  input: {
    flex: 1,
    fontSize: wp("3.8%"),
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: hp("0.5%"),
    marginBottom: hp("0.5%"),
  },
  strengthBars: { flexDirection: "row", gap: 5, flex: 1 },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    minWidth: wp("16%"),
    textAlign: "right",
  },

  saveBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    marginHorizontal: wp("4%"),
    marginTop: hp("3%"),
    borderRadius: 14,
    paddingVertical: hp("1.8%"),
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: PRIMARY,
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  saveBottomBtnDisabled: { backgroundColor: "#CBD5E1" },
  saveBottomBtnText: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: "#FFF",
  },
});

export default ShipperChangePassword;
