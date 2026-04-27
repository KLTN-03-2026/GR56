import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    StatusBar,
    Platform,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    FlatList,
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
import LoadingModal from "../../components/LoadingModal";
import CustomAlert, { AlertButton } from "../../components/CustomAlert";

const PRIMARY_COLOR = "#EE4D2D";
const BACKGROUND_COLOR = "#F5F6F8";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";

// ── Danh sách ngân hàng Việt Nam ──────────────────────────
const VN_BANKS = [
    { name: "Vietcombank",          fullName: "Ngân hàng TMCP Ngoại thương Việt Nam" },
    { name: "VietinBank",           fullName: "Ngân hàng TMCP Công thương Việt Nam" },
    { name: "BIDV",                  fullName: "Ngân hàng TMCP Đầu tư và Phát triển VN" },
    { name: "Agribank",             fullName: "Ngân hàng Nông nghiệp và PTNT Việt Nam" },
    { name: "MB Bank",              fullName: "Ngân hàng TMCP Quân đội" },
    { name: "Techcombank",          fullName: "Ngân hàng TMCP Kỹ thương Việt Nam" },
    { name: "ACB",                   fullName: "Ngân hàng TMCP Á Châu" },
    { name: "VPBank",               fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
    { name: "TPBank",               fullName: "Ngân hàng TMCP Tiên Phong" },
    { name: "Sacombank",            fullName: "Ngân hàng TMCP Sài Gòn Thương Tín" },
    { name: "HDBank",               fullName: "Ngân hàng TMCP Phát triển TP.HCM" },
    { name: "VIB",                   fullName: "Ngân hàng TMCP Quốc tế Việt Nam" },
    { name: "SHB",                   fullName: "Ngân hàng TMCP Sài Gòn – Hà Nội" },
    { name: "Eximbank",             fullName: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam" },
    { name: "MSB",                   fullName: "Ngân hàng TMCP Hàng Hải Việt Nam" },
    { name: "SeABank",              fullName: "Ngân hàng TMCP Đông Nam Á" },
    { name: "ABBANK",               fullName: "Ngân hàng TMCP An Bình" },
    { name: "LienVietPostBank",     fullName: "Ngân hàng TMCP Bưu điện Liên Việt" },
    { name: "OCB",                   fullName: "Ngân hàng TMCP Phương Đông" },
    { name: "Nam A Bank",           fullName: "Ngân hàng TMCP Nam Á" },
    { name: "PVcomBank",            fullName: "Ngân hàng TMCP Đại Chúng Việt Nam" },
    { name: "VietBank",             fullName: "Ngân hàng TMCP Việt Nam Thương Tín" },
    { name: "BVBank",               fullName: "Ngân hàng TMCP Bản Việt" },
    { name: "KienlongBank",         fullName: "Ngân hàng TMCP Kiên Long" },
    { name: "NCB",                   fullName: "Ngân hàng TMCP Quốc Dân" },
    { name: "GPBank",               fullName: "Ngân hàng TMCP Dầu khí Toàn Cầu" },
    { name: "CBBank",               fullName: "Ngân hàng Xây dựng Việt Nam" },
    { name: "OceanBank",            fullName: "Ngân hàng TMCP Đại Dương" },
    { name: "Cake by VPBank",       fullName: "Ngân hàng số Cake by VPBank" },
    { name: "Timo",                  fullName: "Ngân hàng số Timo" },
    { name: "Momo",                  fullName: "Ví điện tử MoMo" },
    { name: "ZaloPay",              fullName: "Ví điện tử ZaloPay" },
    { name: "VNPay",                fullName: "Ví điện tử VNPay" },
];

const Profile = ({ navigation }: any) => {
    const [user, setUser] = useState({
        name: "Người dùng",
        phone: "Đang cập nhật...",
        avatar: "https://i.pravatar.cc/150?img=11",
        shopeePay: "0đ",
        shopeeCoins: "0 Xu",
        vouchers: "0",
    });
    const [isBothRole, setIsBothRole] = useState(false);
    const [loadingSwitch, setLoadingSwitch] = useState(false);
    const [orderCounts, setOrderCounts] = useState<Record<number, number>>({ 0: 0, 12: 0, 3: 0, 4: 0 });

    // Đổi mật khẩu
    const [showChangePwModal, setShowChangePwModal] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [changingPw, setChangingPw] = useState(false);

    // Tài khoản ngân hàng hoàn tiền
    const [showBankModal, setShowBankModal] = useState(false);
    const [showAddBankForm, setShowAddBankForm] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<{
        id: number;
        ten_ngan_hang: string;
        so_tai_khoan: string;
        chu_tai_khoan: string;
        chi_nhanh?: string;
        is_default: number;
    }[]>([]);
    const [newBank, setNewBank] = useState({
        ten_ngan_hang: "",
        so_tai_khoan: "",
        chu_tai_khoan: "",
        chi_nhanh: "",
    });
    const [savingBank, setSavingBank] = useState(false);
    const [deletingBankId, setDeletingBankId] = useState<number | null>(null);
    const [showBankPicker, setShowBankPicker] = useState(false);
    const [bankPickerSearch, setBankPickerSearch] = useState("");

    // Custom Alert
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        type?: "success" | "error" | "warning" | "info" | "confirm";
        title: string;
        message?: string;
        buttons?: AlertButton[];
    }>({ visible: false, title: "" });

    const showAlert = (
        type: "success" | "error" | "warning" | "info" | "confirm",
        title: string,
        message?: string,
        buttons?: AlertButton[]
    ) => setAlertConfig({ visible: true, type, title, message, buttons });

    const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    // ── Hàm fetch dữ liệu từ AsyncStorage ──────────────────
    const loadUserFromStorage = async () => {
        try {
            const userDataString = await AsyncStorage.getItem("userData");
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                setUser(prevUser => ({
                    ...prevUser,
                    name: userData.hoten || userData.ho_ten || userData.ho_va_ten || userData.name || prevUser.name,
                    phone: userData.sodienthoai || userData.so_dien_thoai || userData.phone || prevUser.phone,
                    avatar: userData.hinh_anh || userData.anh_dai_dien || userData.avatar || userData.image || prevUser.avatar,
                }));
            }
            const bothRole = await AsyncStorage.getItem("isBothRole");
            if (bothRole === "true") {
                setIsBothRole(true);
            }
        } catch (error) {
            console.log("❌ Error loading user from storage:", error);
        }
    };

    // ── Hàm fetch từ API ──────────────────────────────────
    const fetchProfileAndCoins = async () => {
        try {
            const [profileRes, voucherRes] = await Promise.all([
                apiClient.get("/khach-hang/data-login"),
                apiClient.get("/khach-hang/voucher/cua-toi"),
            ]);

            const profileData = profileRes.data?.data;
            const voucherCount = Array.isArray(voucherRes.data?.data)
                ? voucherRes.data.data.length
                : 0;

            if (profileData) {
                setUser(prevUser => ({
                    ...prevUser,
                    shopeeCoins: `${profileData.diem_xu ?? 0} Xu`,
                    vouchers: String(voucherCount),
                }));
                console.log("✅ Profile data updated:", profileData);
            }
        } catch (error) {
            console.log("❌ Error fetching profile/vouchers:", error);
        }
    };

    // ── Hàm fetch số lượng đơn hàng ───────────────────────
    const fetchOrderCounts = async () => {
        try {
            const orderRes = await apiClient.get("/khach-hang/don-hang/data");
            const list: any[] = Array.isArray(orderRes.data?.data) ? orderRes.data.data : [];
            const tt = (o: any) => Number(o.tinh_trang);
            setOrderCounts({
                0:  list.filter((o) => tt(o) === 0).length,
                1:  list.filter((o: any) => Number(o.tinh_trang) === 1).length,
                2:  list.filter((o: any) => Number(o.tinh_trang) === 2).length,
                3:  list.filter((o) => tt(o) === 3).length,
                4:  list.filter((o) => tt(o) === 4 && !Number(o.da_danh_gia)).length,
            });
            console.log("✅ Order counts updated");
        } catch (error) {
            console.log("❌ Error fetching order counts:", error);
        }
    };

    // ── Initial load ──────────────────────────────────────
    useEffect(() => {
        const initializeData = async () => {
            console.log("🔄 Initializing profile data...");
            await loadUserFromStorage();
            await fetchProfileAndCoins();
            await fetchOrderCounts();
            await fetchBankInfo();
        };
        initializeData();
    }, []);

    // ── Refresh dữ liệu mỗi khi focus vào tab Profile ────────
    useFocusEffect(
        useCallback(() => {
            console.log("👁️ Profile tab focused - refreshing all data...");
            const refreshAllData = async () => {
                await loadUserFromStorage();
                await fetchProfileAndCoins();
                await fetchOrderCounts();
                console.log("✅ All data refreshed successfully");
            };
            refreshAllData();
        }, [])
    );

    const orderOptions = [
        { id: 0,  title: "Chờ xác nhận", icon: "wallet-outline",  tab: "Đã nhận" },
        { id: 12, title: "Chờ lấy hàng", icon: "cube-outline",    tab: "Đã nhận" },
        { id: 3,  title: "Đang giao",    icon: "car-outline",      tab: "Đang giao" },
        { id: 4,  title: "Đánh giá",     icon: "star-outline",     tab: "Đã giao" },
    ];

    const menuOptions = [
        { id: 1, title: "Địa chỉ nhận hàng", icon: "location-outline", color: "#3B82F6", onPress: () => navigation.navigate("AddressBook") },
        { id: 6, title: "Tài khoản hoàn tiền", icon: "card-outline", color: "#10B981", onPress: () => { setShowBankModal(true); setShowAddBankForm(false); } },
        { id: 5, title: "Đổi mật khẩu", icon: "key-outline", color: "#EE4D2D", onPress: () => setShowChangePwModal(true) },
        { id: 3, title: "Cập nhật ứng dụng", icon: "cloud-download-outline", color: "#10B981", onPress: () => navigation.navigate("AppUpdate") },
        { id: 4, title: "Trung tâm trợ giúp", icon: "help-circle-outline", color: "#8B5CF6", onPress: () => navigation.navigate("HelpCenter") },
    ];

    const handleLogout = async () => {
        await AsyncStorage.removeItem("userData");
        await AsyncStorage.removeItem("token");
        navigation.replace("Login");
    };

    // ── Tài khoản ngân hàng ───────────────────────────────
    const fetchBankInfo = async () => {
        try {
            const res = await apiClient.get("/khach-hang/tai-khoan-ngan-hang");
            if (res.data?.status) {
                setBankAccounts(res.data.data || []);
            }
        } catch {
            // chưa có TK → giữ danh sách rỗng
        }
    };

    const handleAddBank = async () => {
        if (!newBank.ten_ngan_hang.trim()) { showAlert("error", "Lỗi", "Vui lòng nhập tên ngân hàng."); return; }
        if (!newBank.so_tai_khoan.trim())  { showAlert("error", "Lỗi", "Vui lòng nhập số tài khoản."); return; }
        if (!newBank.chu_tai_khoan.trim()) { showAlert("error", "Lỗi", "Vui lòng nhập tên chủ tài khoản."); return; }
        setSavingBank(true);
        try {
            const res = await apiClient.post("/khach-hang/tai-khoan-ngan-hang", {
                ten_ngan_hang: newBank.ten_ngan_hang.trim(),
                so_tai_khoan: newBank.so_tai_khoan.trim(),
                chu_tai_khoan: newBank.chu_tai_khoan.trim().toUpperCase(),
                chi_nhanh: newBank.chi_nhanh.trim() || undefined,
            });
            if (res.data?.status) {
                await fetchBankInfo();
                setNewBank({ ten_ngan_hang: "", so_tai_khoan: "", chu_tai_khoan: "", chi_nhanh: "" });
                setShowAddBankForm(false);
                showAlert("success", "Thành công", "Thêm tài khoản ngân hàng thành công!");
            } else {
                showAlert("error", "Lỗi", res.data?.message || "Không thể thêm tài khoản.");
            }
        } catch (e: any) {
            showAlert("error", "Lỗi", e?.response?.data?.message || "Có lỗi xảy ra.");
        } finally {
            setSavingBank(false);
        }
    };

    const handleDeleteBank = (id: number) => {
        showAlert(
            "confirm",
            "Xóa tài khoản",
            "Bạn muốn xóa tài khoản ngân hàng này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingBankId(id);
                        try {
                            await apiClient.delete(`/khach-hang/tai-khoan-ngan-hang/${id}`);
                            await fetchBankInfo();
                        } catch {
                            showAlert("error", "Lỗi", "Không thể xóa tài khoản.");
                        } finally {
                            setDeletingBankId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleSetDefaultBank = async (id: number) => {
        try {
            const res = await apiClient.post(`/khach-hang/tai-khoan-ngan-hang/${id}/default`);
            if (res.data?.status) {
                await fetchBankInfo();
                showAlert("success", "Thành công", "Tài khoản đã được đặt làm mặc định.");
            }
        } catch {
            showAlert("error", "Lỗi", "Không thể đặt mặc định.");
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
            return;
        }
        setChangingPw(true);
        try {
            const res = await apiClient.post("/khach-hang/update-password", {
                old_password: oldPassword,
                password: newPassword,
                re_password: confirmPassword,
            });
            if (res.data && res.data.status === 1) {
                Alert.alert("Thành công", res.data.message || "Đổi mật khẩu thành công!");
                setShowChangePwModal(false);
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                Alert.alert("Thất bại", res.data?.message || "Không thể đổi mật khẩu.");
            }
        } catch (error: any) {
            const msg = error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.";
            Alert.alert("Lỗi", msg);
        } finally {
            setChangingPw(false);
        }
    };

    const handleSwitchToShipper = async () => {
        setLoadingSwitch(true);
        try {
            const email = await AsyncStorage.getItem("savedEmail");
            const password = await AsyncStorage.getItem("savedPassword");
            if (email && password) {
                const response = await apiClient.post("/shipper/dang-nhap", { email, password });
                if (response.data.status === 1) {
                    const token = response.data.token;
                    if (token) await AsyncStorage.setItem('token', token);
                    await AsyncStorage.setItem('userRole', 'shipper');
                    
                    let newUserData = response.data.shipper;
                    if (!newUserData) newUserData = { hoten: "Tài xế", email };
                    await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
                    
                    navigation.replace("ShipperTabs");
                } else {
                    Alert.alert("Thông báo", "Không thể chuyển đổi vai trò lúc này.");
                }
            } else {
                Alert.alert("Thông báo", "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
                handleLogout();
            }
        } catch (error) {
            console.log("Switch role error:", error);
            Alert.alert("Thông báo", "Có lỗi xảy ra khi chuyển đổi vai trò.");
        } finally {
            setLoadingSwitch(false);
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <LoadingModal visible={loadingSwitch} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{ paddingBottom: hp("10%") }}
            >
                {/* HEADER SECTION */}
                <View style={styles.headerBackground}>
                    <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
                        <View style={styles.headerTopRow}>
                            <View style={{ flex: 1 }} />

                            <View style={styles.headerActions}>
                                <TouchableOpacity style={styles.iconBtn}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn}>
                                    <Ionicons name="cart-outline" size={24} color="#FFF" />
                                    <View style={styles.cartBadge}>
                                        <Text style={styles.cartBadgeText}>2</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* USER INFO */}
                        <TouchableOpacity style={styles.userInfoContainer} activeOpacity={0.8} onPress={() => navigation.navigate("ProfileDetail")}>
                            <View style={styles.avatarOutline}>
                                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                            </View>
                            <View style={styles.userInfoText}>
                                <Text style={styles.userName}>{user.name}</Text>
                                <Text style={styles.userPhone}>{user.phone}</Text>
                                <View style={styles.memberBadge}>
                                    <Ionicons name="diamond" size={12} color="#F59E0B" />
                                    <Text style={styles.memberBadgeText}>Thành viên Bạc</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>

                {/* WALLET SUMMARY */}
                <View style={styles.walletContainer}>
                    <View style={styles.dividerVertical} />
                    <TouchableOpacity style={styles.walletItem}>
                        <View style={styles.coinCircle}>
                            <Ionicons name="logo-bitcoin" size={16} color="#FFF" />
                        </View>
                        <Text style={styles.walletValue}>{user.shopeeCoins}</Text>
                        <Text style={styles.walletLabel}>FoodBee Xu</Text>
                    </TouchableOpacity>
                    <View style={styles.dividerVertical} />
                    <TouchableOpacity style={styles.walletItem} onPress={() => navigation.navigate("MyVouchers")}>
                        <Ionicons name="ticket" size={24} color={PRIMARY_COLOR} />
                        <Text style={styles.walletValue}>{user.vouchers}</Text>
                        <Text style={styles.walletLabel}>Kho Voucher</Text>
                    </TouchableOpacity>
                </View>

                {/* MY ORDERS */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Đơn mua của tôi</Text>
                        <TouchableOpacity style={styles.seeAllRow} onPress={() => navigation.navigate("MainTabs", { screen: "Orders" })}>
                            <Text style={styles.seeAllText}>Xem lịch sử</Text>
                            <Ionicons name="chevron-forward" size={14} color={TEXT_MUTED} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.ordersGrid}>
                        {orderOptions.map((item) => {
                            const count = orderCounts[item.id] ?? 0;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.orderOption}
                                    onPress={() => navigation.navigate("MainTabs", { screen: "Orders", params: { initialTab: item.tab } })}
                                >
                                    <View style={styles.orderIconWrap}>
                                        <Ionicons name={item.icon} size={28} color={TEXT_DARK} />
                                        {count > 0 && (
                                            <View style={styles.orderCountBadge}>
                                                <Text style={styles.orderCountText}>
                                                    {count > 99 ? "99+" : count}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.orderOptionText}>{item.title}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* REGISTER AS SHIPPER BANNER OR SWITCH ROLE */}
                {isBothRole ? (
                    <TouchableOpacity style={styles.shipperBannerWrapper} activeOpacity={0.9} onPress={handleSwitchToShipper}>
                        <View style={[styles.shipperBannerContent, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
                            <View style={styles.shipperTextContent}>
                                <Text style={[styles.shipperPromoTitle, { color: '#0284C7' }]}>Giao diện Tài xế</Text>
                                <Text style={styles.shipperPromoSub}>Chuyển sang chế độ nhận đơn và giao hàng.</Text>
                                <View style={[styles.shipperRegBtn, { borderColor: '#0284C7' }]}>
                                    <Text style={[styles.shipperRegBtnText, { color: '#0284C7' }]}>Chuyển ngay</Text>
                                    <Ionicons name="swap-horizontal" size={14} color="#0284C7" />
                                </View>
                            </View>
                            <View style={styles.shipperIllustration}>
                                <Image
                                    source={{ uri: 'https://shopeefood.vn/assets/images/delivery-man.png' }}
                                    style={styles.shipperImageFallback}
                                    defaultSource={{ uri: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.shipperBannerWrapper} activeOpacity={0.9} onPress={() => navigation.navigate("ShipperRegister")}>
                        <View style={styles.shipperBannerContent}>
                            <View style={styles.shipperTextContent}>
                                <Text style={styles.shipperPromoTitle}>Hợp tác Tài xế FoodBee</Text>
                                <Text style={styles.shipperPromoSub}>Gia tăng thu nhập với thời gian linh hoạt. Đăng ký ngay hôm nay!</Text>
                                <View style={styles.shipperRegBtn}>
                                    <Text style={styles.shipperRegBtnText}>Đăng ký ngay</Text>
                                    <Ionicons name="arrow-forward" size={14} color={PRIMARY_COLOR} />
                                </View>
                            </View>
                            <View style={styles.shipperIllustration}>
                                <Image
                                    source={{ uri: 'https://shopeefood.vn/assets/images/delivery-man.png' }}
                                    style={styles.shipperImageFallback}
                                    defaultSource={{ uri: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* SETTINGS & UTILITIES MENU */}
                <View style={styles.sectionCard}>
                    <Text style={[styles.sectionTitle, { marginLeft: wp("4%"), marginTop: hp("1.5%"), marginBottom: hp("1%") }]}>
                        Tiện ích
                    </Text>
                    {menuOptions.map((menu, index) => (
                        <TouchableOpacity key={menu.id} style={styles.menuItem} onPress={menu.onPress}>
                            <View style={styles.menuIconWrap}>
                                <Ionicons name={menu.icon} size={20} color={menu.color} />
                            </View>
                            <Text style={styles.menuLabel}>{menu.title}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* LOGOUT BUTTON */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Đăng xuất</Text>
                </TouchableOpacity>

                {/* BANK MODAL */}
                <Modal
                    visible={showBankModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => { setShowBankModal(false); setShowAddBankForm(false); }}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalOverlay}
                    >
                        <View style={[styles.modalContainer, { maxHeight: '90%' }]}> 
                            <ScrollView contentContainerStyle={{ paddingBottom: hp("4%") }} showsVerticalScrollIndicator={false}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF0ED", justifyContent: "center", alignItems: "center" }}>
                                        <Ionicons name="card-outline" size={18} color={PRIMARY_COLOR} />
                                    </View>
                                    <Text style={styles.modalTitle}>Tài khoản ngân hàng</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setShowBankModal(false); setShowAddBankForm(false); }}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Banner */}
                            <View style={styles.bankInfoBanner}>
                                <Ionicons name="information-circle-outline" size={16} color={PRIMARY_COLOR} />
                                <Text style={styles.bankInfoBannerText}>
                                    Tài khoản mặc định sẽ nhận hoàn tiền khi đơn bị hủy sau thanh toán. Tối đa 5 tài khoản.
                                </Text>
                            </View>

                            {/* Danh sách TK đã lưu */}
                            {bankAccounts.map(acc => (
                                <View key={acc.id} style={styles.bankCard}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                            <Text style={styles.bankCardName}>{acc.ten_ngan_hang}</Text>
                                            {acc.is_default === 1 && (
                                                <View style={styles.defaultBadge}>
                                                    <Text style={styles.defaultBadgeText}>Mặc định</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.bankCardNo}>{acc.so_tai_khoan}</Text>
                                        <Text style={styles.bankCardOwner}>{acc.chu_tai_khoan}</Text>
                                        {!!acc.chi_nhanh && <Text style={styles.bankCardBranch}>{acc.chi_nhanh}</Text>}
                                    </View>
                                    <View style={{ gap: 6 }}>
                                        {acc.is_default !== 1 && (
                                            <TouchableOpacity
                                                style={styles.bankActionBtn}
                                                onPress={() => handleSetDefaultBank(acc.id)}
                                            >
                                                <Ionicons name="star-outline" size={16} color="#F59E0B" />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.bankActionBtn, { backgroundColor: "#FFF1F2" }]}
                                            onPress={() => handleDeleteBank(acc.id)}
                                            disabled={deletingBankId === acc.id}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {/* Chưa có TK nào */}
                            {bankAccounts.length === 0 && !showAddBankForm && (
                                <View style={{ alignItems: "center", paddingVertical: hp("2%") }}>
                                    <Ionicons name="wallet-outline" size={40} color="#CBD5E1" />
                                    <Text style={{ color: "#94A3B8", marginTop: 8, fontSize: wp("3.4%") }}>Chưa có tài khoản nào</Text>
                                </View>
                            )}

                            {/* Nút thêm mới */}
                            {bankAccounts.length < 5 && !showAddBankForm && (
                                <TouchableOpacity
                                    style={[styles.submitBtn, { backgroundColor: PRIMARY_COLOR, marginTop: hp("1.5%") }]}
                                    onPress={() => setShowAddBankForm(true)}
                                >
                                    <Text style={styles.submitBtnText}>+ Thêm tài khoản mới</Text>
                                </TouchableOpacity>
                            )}

                            {/* Form thêm mới */}
                            {showAddBankForm && (
                                <>
                                    <View style={[styles.bankInfoBanner, { backgroundColor: "#FFF5F3", borderColor: "#FECACA", marginTop: hp("1%") }]}>
                                        <Ionicons name="add-circle-outline" size={16} color={PRIMARY_COLOR} />
                                        <Text style={[styles.bankInfoBannerText, { color: PRIMARY_COLOR }]}>Nhập thông tin tài khoản mới</Text>
                                    </View>

                                    <Text style={styles.inputLabel}>Tên ngân hàng *</Text>
                                    <TouchableOpacity
                                        style={[styles.pwInputRow, { justifyContent: "space-between" }]}
                                        onPress={() => { setBankPickerSearch(""); setShowBankPicker(true); }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                            <Ionicons name="business-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                                            <Text style={[styles.pwInput, { color: newBank.ten_ngan_hang ? TEXT_DARK : "#94A3B8" }]}>
                                                {newBank.ten_ngan_hang || "Chọn ngân hàng..."}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                                    </TouchableOpacity>

                                    <Text style={styles.inputLabel}>Số tài khoản *</Text>
                                    <View style={styles.pwInputRow}>
                                        <Ionicons name="keypad-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={styles.pwInput}
                                            placeholder="Nhập số tài khoản"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="numeric"
                                            value={newBank.so_tai_khoan}
                                            onChangeText={v => setNewBank(p => ({ ...p, so_tai_khoan: v }))}
                                        />
                                    </View>

                                    <Text style={styles.inputLabel}>Tên chủ tài khoản *</Text>
                                    <View style={styles.pwInputRow}>
                                        <Ionicons name="person-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={styles.pwInput}
                                            placeholder="NGUYEN VAN A"
                                            placeholderTextColor="#94A3B8"
                                            autoCapitalize="characters"
                                            value={newBank.chu_tai_khoan}
                                            onChangeText={v => setNewBank(p => ({ ...p, chu_tai_khoan: v.toUpperCase() }))}
                                        />
                                    </View>

                                    <Text style={styles.inputLabel}>Chi nhánh (tùy chọn)</Text>
                                    <View style={styles.pwInputRow}>
                                        <Ionicons name="git-branch-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={styles.pwInput}
                                            placeholder="VD: Chi nhánh Đà Nẵng"
                                            placeholderTextColor="#94A3B8"
                                            value={newBank.chi_nhanh}
                                            onChangeText={v => setNewBank(p => ({ ...p, chi_nhanh: v }))}
                                        />
                                    </View>

                                    <View style={{ flexDirection: "row", gap: 8, marginTop: hp("2%") }}>
                                        <TouchableOpacity
                                            style={[styles.submitBtn, { flex: 1, backgroundColor: "#F1F5F9", marginTop: 0 }]}
                                            onPress={() => setShowAddBankForm(false)}
                                        >
                                            <Text style={[styles.submitBtnText, { color: "#64748B" }]}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.submitBtn, { flex: 2, backgroundColor: PRIMARY_COLOR, marginTop: 0, opacity: savingBank ? 0.6 : 1 }]}
                                            onPress={handleAddBank}
                                            disabled={savingBank}
                                        >
                                            <Text style={styles.submitBtnText}>{savingBank ? "Đang lưu..." : "Lưu tài khoản"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* BANK PICKER MODAL */}
                <Modal
                    visible={showBankPicker}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowBankPicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContainer, { maxHeight: "80%" }]}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
                                <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Tìm kiếm */}
                            <View style={[styles.pwInputRow, { marginBottom: hp("1%") }]}>
                                <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.pwInput}
                                    placeholder="Tìm ngân hàng..."
                                    placeholderTextColor="#94A3B8"
                                    value={bankPickerSearch}
                                    onChangeText={setBankPickerSearch}
                                    autoFocus
                                />
                                {bankPickerSearch.length > 0 && (
                                    <TouchableOpacity onPress={() => setBankPickerSearch("")}>
                                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Danh sách */}
                            <FlatList
                                data={VN_BANKS.filter(b =>
                                    b.name.toLowerCase().includes(bankPickerSearch.toLowerCase()) ||
                                    b.fullName.toLowerCase().includes(bankPickerSearch.toLowerCase())
                                )}
                                keyExtractor={item => item.name}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.bankPickerItem,
                                            newBank.ten_ngan_hang === item.name && styles.bankPickerItemActive,
                                        ]}
                                        onPress={() => {
                                            setNewBank(p => ({ ...p, ten_ngan_hang: item.name }));
                                            setShowBankPicker(false);
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <View style={styles.bankPickerIconWrap}>
                                            <Text style={styles.bankPickerIconText}>
                                                {item.name.charAt(0)}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.bankPickerName}>{item.name}</Text>
                                            <Text style={styles.bankPickerFullName} numberOfLines={1}>{item.fullName}</Text>
                                        </View>
                                        {newBank.ten_ngan_hang === item.name && (
                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>

                {/* CHANGE PASSWORD MODAL */}
                <Modal
                    visible={showChangePwModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowChangePwModal(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalOverlay}
                    >
                        <View style={styles.modalContainer}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                                <TouchableOpacity onPress={() => setShowChangePwModal(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Mật khẩu cũ */}
                            <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
                            <View style={styles.pwInputRow}>
                                <TextInput
                                    style={styles.pwInput}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showOld}
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                />
                                <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                                    <Ionicons name={showOld ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            {/* Mật khẩu mới */}
                            <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                            <View style={styles.pwInputRow}>
                                <TextInput
                                    style={styles.pwInput}
                                    placeholder="Tối thiểu 6 ký tự"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showNew}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                    <Ionicons name={showNew ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            {/* Xác nhận mật khẩu */}
                            <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
                            <View style={styles.pwInputRow}>
                                <TextInput
                                    style={styles.pwInput}
                                    placeholder="Nhập lại mật khẩu mới"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showConfirm}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                    <Ionicons name={showConfirm ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            {/* Submit */}
                            <TouchableOpacity
                                style={[styles.submitBtn, changingPw && { opacity: 0.6 }]}
                                onPress={handleChangePassword}
                                disabled={changingPw}
                            >
                                <Text style={styles.submitBtnText}>
                                    {changingPw ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

            </ScrollView>

            <CustomAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onDismiss={hideAlert}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
    },
    headerBackground: {
        backgroundColor: PRIMARY_COLOR,
        paddingBottom: hp("6%"),
        borderBottomLeftRadius: wp("6%"),
        borderBottomRightRadius: wp("6%"),
    },
    headerSafeArea: {
        paddingTop: Platform.OS === "android" ? hp("2%") : 0,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: wp("5%"),
        marginTop: hp("1.5%"),
    },
    headerTitle: {
        color: "#FFF",
        fontSize: wp("5%"),
        fontWeight: "700",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBtn: {
        marginLeft: wp("4%"),
        position: "relative",
    },
    cartBadge: {
        position: "absolute",
        top: -4,
        right: -6,
        backgroundColor: "#FFC107",
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: PRIMARY_COLOR,
    },
    cartBadgeText: {
        color: PRIMARY_COLOR,
        fontSize: wp("2.2%"),
        fontWeight: "800",
    },
    userInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: wp("5%"),
        marginTop: hp("3%"),
    },
    avatarOutline: {
        padding: 2,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: wp("10%"),
        marginRight: wp("4%"),
    },
    avatar: {
        width: wp("16%"),
        height: wp("16%"),
        borderRadius: wp("8%"),
        borderWidth: 2,
        borderColor: "#FFF",
    },
    userInfoText: {
        flex: 1,
    },
    userName: {
        fontSize: wp("4.5%"),
        fontWeight: "700",
        color: "#FFF",
        marginBottom: hp("0.3%"),
    },
    userPhone: {
        fontSize: wp("3.5%"),
        color: "rgba(255,255,255,0.8)",
        marginBottom: hp("0.8%"),
    },
    memberBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        alignSelf: "flex-start",
        paddingHorizontal: wp("2.5%"),
        paddingVertical: hp("0.3%"),
        borderRadius: wp("3%"),
    },
    memberBadgeText: {
        fontSize: wp("2.8%"),
        color: "#FFF",
        fontWeight: "600",
        marginLeft: wp("1%"),
    },
    walletContainer: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        marginHorizontal: wp("5%"),
        marginTop: hp("-3.5%"),
        borderRadius: wp("4%"),
        paddingVertical: hp("2%"),
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        alignItems: "center",
        justifyContent: "space-between",
    },
    walletItem: {
        flex: 1,
        alignItems: "center",
    },
    coinCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#F59E0B",
        justifyContent: "center",
        alignItems: "center",
    },
    walletValue: {
        fontSize: wp("3.5%"),
        fontWeight: "700",
        color: TEXT_DARK,
        marginTop: hp("0.8%"),
        marginBottom: hp("0.2%"),
    },
    walletLabel: {
        fontSize: wp("2.8%"),
        color: TEXT_MUTED,
    },
    dividerVertical: {
        width: 1,
        height: hp("5%"),
        backgroundColor: "#E2E8F0",
    },
    sectionCard: {
        backgroundColor: "#FFF",
        marginHorizontal: wp("5%"),
        marginTop: hp("2.5%"),
        borderRadius: wp("4%"),
        paddingBottom: hp("1%"),
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: wp("4%"),
        paddingTop: hp("2%"),
        paddingBottom: hp("1.5%"),
        borderBottomWidth: 1,
        borderBottomColor: "#F8FAFC",
    },
    sectionTitle: {
        fontSize: wp("4%"),
        fontWeight: "700",
        color: TEXT_DARK,
    },
    seeAllRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    seeAllText: {
        fontSize: wp("3.2%"),
        color: TEXT_MUTED,
        marginRight: 2,
    },
    ordersGrid: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: hp("2%"),
    },
    orderOption: {
        alignItems: "center",
    },
    orderIconWrap: {
        width: wp("12%"),
        height: wp("12%"),
        borderRadius: wp("6%"),
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: hp("0.8%"),
        position: "relative",
    },
    orderCountBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: PRIMARY_COLOR,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: "#FFF",
    },
    orderCountText: {
        color: "#FFF",
        fontSize: wp("2.4%"),
        fontWeight: "800",
        lineHeight: 14,
    },
    orderOptionText: {
        fontSize: wp("3%"),
        color: TEXT_MUTED,
        fontWeight: "500",
    },
    shipperBannerWrapper: {
        marginHorizontal: wp("5%"),
        marginTop: hp("2.5%"),
        borderRadius: wp("4%"),
        overflow: "hidden",
        elevation: 3,
        shadowColor: PRIMARY_COLOR,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
    },
    shipperBannerContent: {
        flexDirection: "row",
        backgroundColor: "#FEF2F2",
        padding: wp("4%"),
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: wp("4%"),
    },
    shipperTextContent: {
        flex: 1,
        marginRight: wp("3%"),
    },
    shipperPromoTitle: {
        fontSize: wp("4%"),
        fontWeight: "800",
        color: PRIMARY_COLOR,
        marginBottom: hp("0.5%"),
    },
    shipperPromoSub: {
        fontSize: wp("3%"),
        color: "#475569",
        lineHeight: 18,
        marginBottom: hp("1.5%"),
    },
    shipperRegBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        alignSelf: "flex-start",
        paddingHorizontal: wp("3%"),
        paddingVertical: hp("0.6%"),
        borderRadius: wp("4%"),
        borderWidth: 1,
        borderColor: PRIMARY_COLOR,
    },
    shipperRegBtnText: {
        fontSize: wp("3%"),
        color: PRIMARY_COLOR,
        fontWeight: "700",
        marginRight: wp("1%"),
    },
    shipperIllustration: {
        width: wp("20%"),
        height: wp("20%"),
        justifyContent: "center",
        alignItems: "center",
    },
    shipperImageFallback: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: hp("1.5%"),
        paddingHorizontal: wp("4%"),
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    menuIconWrap: {
        width: wp("8%"),
        height: wp("8%"),
        borderRadius: wp("4%"),
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp("3%"),
    },
    menuLabel: {
        flex: 1,
        fontSize: wp("3.8%"),
        color: TEXT_DARK,
        fontWeight: "500",
    },
    logoutBtn: {
        marginHorizontal: wp("5%"),
        marginTop: hp("3%"),
        backgroundColor: "#FFF",
        paddingVertical: hp("1.8%"),
        borderRadius: wp("4%"),
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    logoutBtnText: {
        color: PRIMARY_COLOR,
        fontSize: wp("4%"),
        fontWeight: "700",
    },
    // Change password modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: wp("6%"),
        borderTopRightRadius: wp("6%"),
        paddingHorizontal: wp("5%"),
        paddingTop: hp("2.5%"),
        paddingBottom: hp("5%"),
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: hp("2.5%"),
    },
    modalTitle: {
        fontSize: wp("4.5%"),
        fontWeight: "700",
        color: TEXT_DARK,
    },
    inputLabel: {
        fontSize: wp("3.2%"),
        fontWeight: "600",
        color: TEXT_MUTED,
        marginBottom: hp("0.8%"),
        marginTop: hp("1.5%"),
    },
    pwInputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: wp("3%"),
        paddingHorizontal: wp("3.5%"),
        height: hp("6%"),
        backgroundColor: "#F8FAFC",
    },
    pwInput: {
        flex: 1,
        fontSize: wp("3.8%"),
        color: TEXT_DARK,
    },
    submitBtn: {
        backgroundColor: PRIMARY_COLOR,
        borderRadius: wp("3%"),
        paddingVertical: hp("1.8%"),
        alignItems: "center",
        marginTop: hp("3%"),
    },
    submitBtnText: {
        color: "#FFF",
        fontSize: wp("4%"),
        fontWeight: "700",
    },
    // Bank info banner
    bankInfoBanner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "#EFF6FF",
        borderRadius: wp("3%"),
        padding: wp("3%"),
        marginBottom: hp("1%"),
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    bankInfoBannerText: {
        flex: 1,
        fontSize: wp("3.2%"),
        color: "#0369A1",
        lineHeight: 20,
    },
    // Bank account card
    bankCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: wp("3%"),
        padding: wp("3.5%"),
        marginTop: hp("1%"),
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 10,
    },
    bankCardName: {
        fontSize: wp("3.8%"),
        fontWeight: "700",
        color: TEXT_DARK,
    },
    bankCardNo: {
        fontSize: wp("3.5%"),
        color: TEXT_MUTED,
        letterSpacing: 1,
        marginTop: 2,
    },
    bankCardOwner: {
        fontSize: wp("3.2%"),
        color: TEXT_MUTED,
        marginTop: 1,
    },
    bankCardBranch: {
        fontSize: wp("3%"),
        color: "#94A3B8",
        marginTop: 1,
        fontStyle: "italic",
    },
    defaultBadge: {
        backgroundColor: "#DCFCE7",
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    defaultBadgeText: {
        fontSize: wp("2.6%"),
        color: "#16A34A",
        fontWeight: "700",
    },
    bankActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#FFFBEB",
        justifyContent: "center",
        alignItems: "center",
    },
    // Bank picker
    bankPickerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: hp("1.2%"),
        paddingHorizontal: wp("2%"),
        borderRadius: wp("2.5%"),
        marginBottom: 4,
        gap: 10,
    },
    bankPickerItemActive: {
        backgroundColor: "#F0FDF4",
    },
    bankPickerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EEF2FF",
        justifyContent: "center",
        alignItems: "center",
    },
    bankPickerIconText: {
        fontSize: wp("4%"),
        fontWeight: "800",
        color: "#4F46E5",
    },
    bankPickerName: {
        fontSize: wp("3.8%"),
        fontWeight: "700",
        color: TEXT_DARK,
    },
    bankPickerFullName: {
        fontSize: wp("3%"),
        color: TEXT_MUTED,
        marginTop: 1,
    },
});

export default Profile;