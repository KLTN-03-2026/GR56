import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";
import { getImageUrl } from "../../utils/imageHelper";
import CustomAlert, { AlertButton } from "../../components/CustomAlert";

const PRIMARY = "#EE4D2D";
const PRIMARY_DARK = "#C73D20";
const BG = "#F5F6F8";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";
const BORDER = "#E2E8F0";

// ─── InputRow Component ───────────────────────────────────

const InputRow = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  editable = true,
  secureTextEntry = false,
  rightElement,
}: {
  label: string;
  icon: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
  editable?: boolean;
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrapper, !editable && styles.inputWrapperDisabled]}>
      <Ionicons
        name={icon}
        size={18}
        color={editable ? PRIMARY : TEXT_MUTED}
        style={styles.inputIcon}
      />
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Chua cap nhat"}
        placeholderTextColor="#CBD5E1"
        keyboardType={keyboardType ?? "default"}
        maxLength={maxLength}
        editable={editable}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
      {rightElement}
    </View>
  </View>
);

// ─── Main Component ───────────────────────────────────────

const ShipperProfileDetail = ({ navigation }: any) => {
  const [form, setForm] = useState({
    ho_va_ten: "",
    so_dien_thoai: "",
    cccd: "",
    dia_chi: "",
  });
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
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

  // ── Load du lieu tu AsyncStorage ──────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem("userData");
        if (!raw) return;
        const d = JSON.parse(raw);
        setForm({
          ho_va_ten: d.ho_va_ten || d.ho_ten || d.hoten || d.name || "",
          so_dien_thoai: d.so_dien_thoai || d.sodienthoai || d.phone || "",
          cccd: d.cccd || d.can_cuoc_cong_dan || "",
          dia_chi: d.dia_chi || d.diachi || "",
        });
        setEmail(d.email || "");
        setAvatar(d.hinh_anh || d.anh_dai_dien || d.avatar || "");
      } catch (e) {
        console.log("Load shipper info error:", e);
      }
    };
    load();
  }, []);

  // ── Validate ──────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.ho_va_ten.trim()) return "Họ và tên không được để trống.";
    if (!form.so_dien_thoai.trim()) return "Số điện thoại không được để trống.";
    if (form.so_dien_thoai.replace(/\D/g, "").length !== 10)
      return "Số điện thoại phải có đúng 10 chữ số.";
    if (!form.cccd.trim()) return "Căn cước công dân không được để trống.";
    if (form.cccd.length !== 12) return "Căn cước công dân phải có đúng 12 chữ số.";
    if (!form.dia_chi.trim()) return "Địa chỉ không được để trống.";
    return null;
  };

  // ── Luu ───────────────────────────────────────────────
  const handleSave = async () => {
    const err = validate();
    if (err) {
      showAlert("warning", "Thông báo", err);
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.post("/shipper/update-profile", {
        ho_va_ten: form.ho_va_ten.trim(),
        so_dien_thoai: form.so_dien_thoai.trim(),
        cccd: form.cccd.trim(),
        dia_chi: form.dia_chi.trim(),
      });

      if (res.data?.status === 1) {
        const raw = await AsyncStorage.getItem("userData");
        const current = raw ? JSON.parse(raw) : {};
        await AsyncStorage.setItem(
          "userData",
          JSON.stringify({
            ...current,
            ho_va_ten: form.ho_va_ten.trim(),
            ho_ten: form.ho_va_ten.trim(),
            so_dien_thoai: form.so_dien_thoai.trim(),
            cccd: form.cccd.trim(),
            dia_chi: form.dia_chi.trim(),
          })
        );
        showAlert("success", "Thành công", res.data?.message ?? "Thông tin đã được cập nhật.", [
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
        showAlert("error", "Lỗi", e?.response?.data?.message ?? "Không thể kết nối máy chủ.");
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
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cập nhật hồ sơ</Text>
            <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSave} disabled={saving} activeOpacity={0.75}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveHeaderBtnText}>Lưu</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Image
            source={{ uri: getImageUrl(avatar) }}
            style={styles.avatar}
            defaultSource={require("../../assets/images/slide1.png")}
          />
          <Text style={styles.avatarName}>{form.ho_va_ten || "Tài xế"}</Text>
          <Text style={styles.avatarEmail}>{email}</Text>
        </View>

        {/* Thông tin cá nhân */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={PRIMARY} />
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          </View>

          <InputRow
            label="Họ và tên *"
            icon="person-outline"
            value={form.ho_va_ten}
            onChangeText={(v) => setForm((p) => ({ ...p, ho_va_ten: v }))}
            placeholder="Nhập họ và tên"
          />

          <InputRow
            label="Số điện thoại *"
            icon="call-outline"
            value={form.so_dien_thoai}
            onChangeText={(v) => setForm((p) => ({ ...p, so_dien_thoai: v }))}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="10 chữ số"
          />

          <InputRow
            label="Căn cước công dân *"
            icon="card-outline"
            value={form.cccd}
            onChangeText={(v) => setForm((p) => ({ ...p, cccd: v }))}
            keyboardType="number-pad"
            maxLength={12}
            placeholder="12 chữ số"
          />

          <InputRow
            label="Địa chỉ *"
            icon="location-outline"
            value={form.dia_chi}
            onChangeText={(v) => setForm((p) => ({ ...p, dia_chi: v }))}
            placeholder="Nhập địa chỉ của bạn"
          />

          <InputRow
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={() => {}}
            editable={false}
            placeholder="Không thể thay đổi"
          />
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
              <Text style={styles.saveBottomBtnText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
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

  avatarSection: {
    alignItems: "center",
    paddingVertical: hp("3%"),
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  avatar: {
    width: wp("22%"),
    height: wp("22%"),
    borderRadius: wp("11%"),
    backgroundColor: "#F1F5F9",
    borderWidth: 3,
    borderColor: PRIMARY,
  },
  avatarName: {
    marginTop: hp("1.2%"),
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: TEXT_DARK,
  },
  avatarEmail: {
    marginTop: hp("0.4%"),
    fontSize: wp("3.2%"),
    color: TEXT_MUTED,
  },

  card: {
    backgroundColor: "#FFF",
    marginHorizontal: wp("4%"),
    marginTop: hp("2%"),
    borderRadius: 16,
    padding: wp("4%"),
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: hp("1.5%"),
    paddingBottom: hp("1%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: TEXT_DARK,
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
  inputWrapperDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  inputIcon: { marginRight: wp("2%") },
  input: {
    flex: 1,
    fontSize: wp("3.8%"),
    color: TEXT_DARK,
    paddingVertical: 0,
  },
  inputDisabled: { color: TEXT_MUTED },

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
      ios: { shadowColor: PRIMARY, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    }),
  },
  saveBottomBtnDisabled: { backgroundColor: "#CBD5E1" },
  saveBottomBtnText: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: "#FFF",
  },
});

export default ShipperProfileDetail;
