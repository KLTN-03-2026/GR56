import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    Platform,
    StatusBar,
    ActivityIndicator,
    Animated,
    Alert,
    KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";

const PRIMARY = "#EE4D2D";
const PRIMARY_LIGHT = "#FFF0EE";
const BG = "#F5F6F8";
const DARK = "#1E293B";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const SURFACE = "#FFFFFF";

// ──────────────────────────────────────────────────────────
// Toast mini
// ──────────────────────────────────────────────────────────
const Toast = ({ message, type }: { message: string; type: "success" | "error" }) => {
    const slideY = useRef(new Animated.Value(-80)).current;
    useEffect(() => {
        Animated.sequence([
            Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
            Animated.delay(2200),
            Animated.timing(slideY, { toValue: -80, duration: 300, useNativeDriver: true }),
        ]).start();
    }, []);
    const bg = type === "success" ? "#10B981" : "#EF4444";
    return (
        <Animated.View style={[toast.wrap, { backgroundColor: bg, transform: [{ translateY: slideY }] }]}>
            <Ionicons name={type === "success" ? "checkmark-circle" : "close-circle"} size={18} color="#FFF" />
            <Text style={toast.txt}>{message}</Text>
        </Animated.View>
    );
};
const toast = StyleSheet.create({
    wrap: { position: "absolute", top: 16, left: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, zIndex: 999, elevation: 20, shadowColor: "#000", shadowOpacity: 0.18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
    txt: { color: "#FFF", fontSize: 14, fontWeight: "600", flex: 1 },
});

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
const ProfileDetail = ({ navigation }: any) => {
    const [user, setUser] = useState({
        name: "",
        phone: "",
        email: "",
        cccd: "",
        birthday: "",
        avatar: "",
    });

    const [pendingAvatar, setPendingAvatar] = useState<{ uri: string; name: string; type: string } | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [toastKey, setToastKey] = useState(0);
    const originalPhone = useRef("");
    const scrollRef = useRef<ScrollView>(null);
    const cccdInputRef = useRef<any>(null);
    const bdInputRef = useRef<any>(null);

    const showToast = (text: string, type: "success" | "error") => {
        setToastMsg({ text, type });
        setToastKey(k => k + 1);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const str = await AsyncStorage.getItem("userData");
                if (!str) return;
                const d = JSON.parse(str);
                const rawBd = d.ngay_sinh || d.birthday || d.ngaysinh || "";
                let birthday = rawBd;
                if (rawBd && rawBd.includes("-")) {
                    const parts = rawBd.split("-");
                    if (parts.length === 3) birthday = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                const phone = d.so_dien_thoai || d.phone || "";
                originalPhone.current = phone;
                setUser({
                    name: d.ho_va_ten || d.ho_ten || d.name || "",
                    phone,
                    email: d.email || "",
                    cccd: d.cccd || d.can_cuoc_cong_dan || "",
                    birthday,
                    avatar: d.anh_dai_dien || d.hinh_anh || d.avatar || "",
                });
            } catch { }
        };
        load();
    }, []);

    const handlePickAvatar = async () => {
        try {
            const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
            if (!result.didCancel && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.uri) {
                    setUser(prev => ({ ...prev, avatar: asset.uri! }));
                    setPendingAvatar({
                        uri: asset.uri,
                        name: asset.fileName || `avatar_${Date.now()}.jpg`,
                        type: asset.type || "image/jpeg",
                    });
                }
            }
        } catch {
            showToast("Không thể chọn ảnh", "error");
        }
    };

    const uploadAvatar = async (): Promise<string | null> => {
        if (!pendingAvatar) return null;
        setSavingAvatar(true);
        try {
            const form = new FormData();
            form.append("avatar", { uri: pendingAvatar.uri, name: pendingAvatar.name, type: pendingAvatar.type } as any);
            const res = await apiClient.post("/khach-hang/update-avatar", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.data?.status) {
                setPendingAvatar(null);
                return res.data?.avatar_url || null;
            } else {
                throw new Error(res.data?.message || "Upload thất bại");
            }
        } catch (err: any) {
            showToast(err?.response?.data?.message || "Không thể cập nhật ảnh đại diện", "error");
            return null;
        } finally {
            setSavingAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user.name.trim()) { showToast("Họ và tên không được để trống", "error"); return; }
        if (user.name.trim().length < 10) { showToast("Họ và tên phải có ít nhất 10 ký tự", "error"); return; }
        if (user.name.trim().length > 50) { showToast("Họ và tên không được quá 50 ký tự", "error"); return; }

        const cleanPhone = user.phone.replace(/\D/g, "");
        if (cleanPhone.length === 0) { showToast("Số điện thoại không được để trống", "error"); return; }
        if (cleanPhone.length !== 10) { showToast("Số điện thoại phải có 10 chữ số", "error"); return; }
        if (!cleanPhone.startsWith("0")) { showToast("Số điện thoại phải bắt đầu bằng 0", "error"); return; }

        if (!user.cccd || user.cccd.trim() === "") { showToast("CCCD / CMND không được để trống", "error"); return; }
        const cleanCCCD = user.cccd.replace(/\D/g, "");
        if (cleanCCCD.length !== 12) { showToast("CCCD phải có 12 chữ số", "error"); return; }
        if (!user.birthday || user.birthday.trim() === "") { showToast("Ngày sinh không được để trống", "error"); return; }

        setSavingProfile(true);
        try {
            let avatarToSend = user.avatar;
            if (pendingAvatar) {
                const newAvatarUrl = await uploadAvatar();
                if (newAvatarUrl) avatarToSend = newAvatarUrl;
            }
            let ngay_sinh = "";
            if (user.birthday) {
                const parts = user.birthday.split("/");
                if (parts.length === 3) ngay_sinh = `${parts[2]}-${parts[1]}-${parts[0]}`;
                else ngay_sinh = user.birthday;
            }
            const originalPhoneClean = originalPhone.current.replace(/\D/g, "");
            const payload: any = {
                ho_va_ten: user.name.trim(),
                so_dien_thoai: cleanPhone,
                so_dien_thoai_cu: originalPhoneClean,
                email: user.email.trim(),
                ngay_sinh: ngay_sinh,
                cccd: cleanCCCD,
                avatar: avatarToSend,
            };
            const res = await apiClient.post("/khach-hang/update-profile", payload);
            if (res.data?.status === 1 || res.data?.status === true) {
                const str = await AsyncStorage.getItem("userData");
                if (str) {
                    const old = JSON.parse(str);
                    await AsyncStorage.setItem("userData", JSON.stringify({
                        ...old,
                        ho_va_ten: user.name.trim(),
                        so_dien_thoai: cleanPhone,
                        email: user.email.trim(),
                        ngay_sinh: ngay_sinh || old.ngay_sinh,
                        cccd: cleanCCCD,
                        anh_dai_dien: avatarToSend,
                        avatar: avatarToSend,
                    }));
                    originalPhone.current = cleanPhone;
                }
                showToast("Cập nhật hồ sơ thành công!", "success");
            } else {
                throw new Error(res.data?.message || "Cập nhật thất bại");
            }
        } catch (err: any) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const errorMessages = Object.entries(err.response.data.errors)
                    .map(([_, messages]: [string, any]) => Array.isArray(messages) ? messages[0] : messages)
                    .join("\n");
                showToast(errorMessages, "error");
            } else {
                showToast(err?.response?.data?.message || err?.message || "Có lỗi xảy ra", "error");
            }
        } finally {
            setSavingProfile(false);
        }
    };

    const avatarUri = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "U")}&background=EE4D2D&color=fff&size=200`;

    return (
        <View style={st.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            {toastMsg && <Toast key={toastKey} message={toastMsg.text} type={toastMsg.type} />}

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: hp("6%") }}
                    bounces={false}
                >
                    {/* ── HEADER + AVATAR ── */}
                    <View style={st.headerBlock}>
                        <SafeAreaView edges={["top"]}>
                            <View style={st.headerRow}>
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    style={st.backBtn}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="chevron-back" size={26} color="#FFF" />
                                </TouchableOpacity>
                                <Text style={st.headerTitle}>Hồ sơ cá nhân</Text>
                                <TouchableOpacity
                                    onPress={handleSaveProfile}
                                    style={st.saveBtn}
                                    disabled={savingProfile}
                                >
                                    {savingProfile
                                        ? <ActivityIndicator size="small" color="#FFF" />
                                        : <Text style={st.saveBtnTxt}>Lưu</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>

                        {/* Avatar */}
                        <View style={st.avatarSection}>
                            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} style={st.avatarWrap}>
                                {savingAvatar ? (
                                    <View style={[st.avatar, st.avatarLoading]}>
                                        <ActivityIndicator size="large" color={PRIMARY} />
                                    </View>
                                ) : (
                                    <Image source={{ uri: avatarUri }} style={st.avatar} />
                                )}
                                <View style={st.cameraBtn}>
                                    <Ionicons name="camera" size={15} color="#FFF" />
                                </View>
                            </TouchableOpacity>
                            <Text style={st.avatarName}>{user.name || "Người dùng"}</Text>
                            <View style={st.memberBadge}>
                                <Ionicons name="star" size={11} color="#F59E0B" />
                                <Text style={st.memberTxt}>Thành viên Bạc</Text>
                            </View>
                            {pendingAvatar && (
                                <View style={st.pendingBadge}>
                                    <Ionicons name="cloud-upload-outline" size={13} color="#F59E0B" />
                                    <Text style={st.pendingTxt}>Ảnh chưa lưu</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ── FORM CARD ── */}
                    <View style={st.card}>
                        {/* Tiêu đề section */}
                        <View style={st.sectionHeader}>
                            <View style={st.sectionIconWrap}>
                                <Ionicons name="person" size={15} color={PRIMARY} />
                            </View>
                            <Text style={st.sectionTitle}>Thông tin cá nhân</Text>
                        </View>

                        <Field
                            label="Họ và tên"
                            icon="person-outline"
                            value={user.name}
                            onChangeText={v => setUser(p => ({ ...p, name: v }))}
                            placeholder="Nhập họ và tên (ít nhất 10 ký tự)"
                        />
                        <Field
                            label="Số điện thoại"
                            icon="call-outline"
                            value={user.phone}
                            onChangeText={v => {
                                const cleaned = v.replace(/\D/g, "").slice(0, 10);
                                setUser(p => ({ ...p, phone: cleaned }));
                            }}
                            placeholder="0xxx xxx xxx"
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                        <Field
                            label="Ngày sinh"
                            icon="calendar-outline"
                            value={user.birthday}
                            inputRef={bdInputRef}
                            onChangeText={v => {
                                const cleaned = v.replace(/[^0-9]/g, "");
                                let fmt = cleaned;
                                if (cleaned.length >= 3 && cleaned.length <= 4) fmt = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
                                else if (cleaned.length >= 5) fmt = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4) + "/" + cleaned.slice(4, 8);
                                setUser(p => ({ ...p, birthday: fmt }));
                            }}
                            placeholder="DD / MM / YYYY"
                            keyboardType="number-pad"
                            maxLength={10}
                            onFocus={() => {
                                setTimeout(() => {
                                    bdInputRef.current?.measureLayout(scrollRef.current as any,
                                        (_x: number, y: number) => { scrollRef.current?.scrollTo({ y: y - 40, animated: true }); }, () => { });
                                }, 300);
                            }}
                        />
                        <Field
                            label="CCCD / CMND"
                            icon="card-outline"
                            value={user.cccd}
                            inputRef={cccdInputRef}
                            onChangeText={v => {
                                const cleaned = v.replace(/\D/g, "").slice(0, 12);
                                setUser(p => ({ ...p, cccd: cleaned }));
                            }}
                            placeholder="12 chữ số"
                            keyboardType="number-pad"
                            maxLength={12}
                            onFocus={() => {
                                setTimeout(() => {
                                    cccdInputRef.current?.measureLayout(scrollRef.current as any,
                                        (_x: number, y: number) => { scrollRef.current?.scrollTo({ y: y - 40, animated: true }); }, () => { });
                                }, 300);
                            }}
                        />

                        {/* Divider */}
                        <View style={st.divider} />

                        {/* Email readonly */}
                        <View style={st.sectionHeader}>
                            <View style={[st.sectionIconWrap, { backgroundColor: "#EFF6FF" }]}>
                                <Ionicons name="mail" size={15} color="#3B82F6" />
                            </View>
                            <Text style={st.sectionTitle}>Thông tin tài khoản</Text>
                        </View>
                        <View style={st.fieldWrap}>
                            <Text style={st.label}>Email</Text>
                            <View style={[st.inputRow, st.inputDisabled]}>
                                <Ionicons name="mail-outline" size={18} color="#94A3B8" style={st.icon} />
                                <Text style={st.disabledTxt} numberOfLines={1}>{user.email || "Chưa cập nhật"}</Text>
                                <View style={st.lockBadge}>
                                    <Ionicons name="lock-closed" size={11} color="#94A3B8" />
                                    <Text style={st.lockTxt}>Không đổi được</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── SAVE BUTTON ── */}
                    <TouchableOpacity
                        style={[st.saveFooterBtn, savingProfile && { opacity: 0.65 }]}
                        onPress={handleSaveProfile}
                        disabled={savingProfile}
                        activeOpacity={0.85}
                    >
                        {savingProfile ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                                <Text style={st.saveFooterTxt}>Lưu thay đổi</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

// ── Reusable Field ─────────────────────────────────────────
const Field = ({
    label, icon, value, onChangeText, placeholder, keyboardType, maxLength, inputRef, onFocus,
}: {
    label: string; icon: string; value: string;
    onChangeText: (v: string) => void; placeholder?: string;
    keyboardType?: any; maxLength?: number;
    inputRef?: any; onFocus?: () => void;
}) => (
    <View style={st.fieldWrap}>
        <Text style={st.label}>{label}</Text>
        <View style={st.inputRow}>
            <Ionicons name={icon as any} size={18} color={MUTED} style={st.icon} />
            <TextInput
                ref={inputRef}
                style={st.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#C0CCDA"
                keyboardType={keyboardType}
                maxLength={maxLength}
                onFocus={onFocus}
            />
        </View>
    </View>
);

// ── Styles ─────────────────────────────────────────────────
const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },

    // HEADER BLOCK
    headerBlock: {
        backgroundColor: PRIMARY,
        paddingBottom: hp("4%"),
        borderBottomLeftRadius: wp("8%"),
        borderBottomRightRadius: wp("8%"),
        elevation: 6,
        shadowColor: PRIMARY,
        shadowOffset: { 
            width: 0, 
            height: 6 
        },
        shadowOpacity: 0.35,
        shadowRadius: 12,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: wp("4%"),
        paddingTop: Platform.OS === "android" ? hp("1%") : 0,
        paddingBottom: hp("1%"),
    },
    backBtn: {
        width: 38, height: 38,
        borderRadius: 19,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { 
        fontSize: wp("4.5%"), 
        fontWeight: "700", 
        color: "#FFF" 
    },
    saveBtn: {
        backgroundColor: "rgba(255,255,255,0.25)",
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("0.8%"),
        borderRadius: 20,
        minWidth: 58,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.4)",
    },
    saveBtnTxt: { 
        color: "#FFF", 
        fontSize: wp("3.8%"), 
        fontWeight: "700" 
    },

    // AVATAR
    avatarSection: { 
        alignItems: "center", 
        paddingTop: hp("2%"), 
        paddingBottom: hp("1%") 
    },
    avatarWrap: { 
        position: "relative", 
        marginBottom: hp("1.5%") 
    },
    avatar: {
        width: wp("24%"), 
        height: wp("24%"), 
        borderRadius: wp("12%"),
        borderWidth: 3.5, 
        borderColor: "rgba(255,255,255,0.9)",
        backgroundColor: "#FFE4DB",
        elevation: 8,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { 
            width: 0, 
            height: 4 
        },
        shadowRadius: 8,
    },
    avatarLoading: { 
        justifyContent: "center", 
        alignItems: "center", 
        backgroundColor: "#FFE4DB" 
    },
    cameraBtn: {
        position: "absolute", 
        bottom: 0, 
        right: 0,
        backgroundColor: DARK,
        width: wp("8%"), 
        height: wp("8%"), 
        borderRadius: wp("4%"),
        justifyContent: "center", 
        alignItems: "center",
        borderWidth: 2, 
        borderColor: "#FFF",
        elevation: 8,
        zIndex: 10,
    },
    avatarName: { 
        fontSize: wp("5%"), 
        fontWeight: "800", 
        color: "#FFF", 
        marginBottom: 4 
    },
    memberBadge: {
        flexDirection: "row", 
        alignItems: "center", 
        gap: 4,
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: wp("3%"), 
        paddingVertical: hp("0.4%"),
        borderRadius: 20,
    },
    memberTxt: { 
        fontSize: wp("3%"), 
        color: "#FFF", 
        fontWeight: "600" 
    },
    pendingBadge: {
        flexDirection: "row", 
        alignItems: "center", 
        gap: 4,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: wp("3%"), 
        paddingVertical: hp("0.4%"),
        borderRadius: 20, 
        marginTop: hp("1%"),
    },
    pendingTxt: { 
        fontSize: wp("3%"), 
        color: "#92400E", 
        fontWeight: "600" 
    },

    // CARD
    card: {
        backgroundColor: SURFACE,
        marginHorizontal: wp("5%"),
        marginTop: hp("-1.5%"),
        borderRadius: wp("5%"),
        paddingHorizontal: wp("5%"),
        paddingVertical: hp("2.5%"),
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { 
            width: 0, 
            height: 4 
        },
        shadowRadius: 12,
        marginBottom: hp("2%"),
    },
    sectionHeader: {
        flexDirection: "row", 
        alignItems: "center",
        gap: wp("2%"),
        marginBottom: hp("2%"),
    },
    sectionIconWrap: {
        width: wp("8%"), 
        height: wp("8%"), 
        borderRadius: wp("4%"),
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: "center", 
        alignItems: "center",
    },
    sectionTitle: { 
        fontSize: wp("4%"), 
        fontWeight: "700", 
        color: DARK 
    },
    divider: {
        height: 1, 
        backgroundColor: BORDER,
        marginVertical: hp("2%"),
        marginHorizontal: -wp("5%"),
    },

    // FIELD
    fieldWrap: { 
        marginBottom: hp("2%") 
    },
    label: {
        fontSize: wp("3.2%"), 
        fontWeight: "700", 
        color: MUTED,
        marginBottom: hp("0.8%"),
        textTransform: "uppercase", 
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: "row", 
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: wp("3%"),
        paddingHorizontal: wp("4%"), 
        height: hp("6.5%"),
        borderWidth: 1.5, 
        borderColor: BORDER,
    },
    icon: { 
        marginRight: wp("2.5%") 
    },
    input: { 
        flex: 1, 
        fontSize: wp("4%"), 
        color: DARK, 
        fontWeight: "500" },
    inputDisabled: { backgroundColor: "#F0F4F8", borderColor: "#E2E8F0" },
    disabledTxt: { flex: 1, fontSize: wp("3.8%"), color: "#94A3B8", fontWeight: "500" },
    lockBadge: {
        flexDirection: "row", alignItems: "center", gap: 3,
        backgroundColor: "#E2E8F0",
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 10,
    },
    lockTxt: { fontSize: wp("2.5%"), color: "#64748B", fontWeight: "600" },

    // SAVE BUTTON
    saveFooterBtn: {
        backgroundColor: PRIMARY,
        marginHorizontal: wp("5%"),
        paddingVertical: hp("2%"),
        borderRadius: wp("4%"),
        alignItems: "center", justifyContent: "center",
        flexDirection: "row", gap: 8,
        elevation: 6,
        shadowColor: PRIMARY,
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
    },
    saveFooterTxt: { color: "#FFF", fontSize: wp("4.2%"), fontWeight: "800", letterSpacing: 0.3 },
});

export default ProfileDetail;
