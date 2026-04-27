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

const PRIMARY_COLOR = "#EE4D2D";
const BACKGROUND_COLOR = "#F5F6F8";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";

const Profile = ({ navigation, route }: any) => {
    const [user, setUser] = useState({
        name: "Người dùng",
        phone: "Đang cập nhật...",
        avatar: "https://i.pravatar.cc/150?img=11",
        shopeePay: "0đ",
        shopeeCoins: "0 Xu",
        vouchers: "0",
        hang_thanh_vien: "Thành viên",
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

    // ── Tài khoản ngân hàng hoàn tiền ────────────────────────
    const [showBankModal, setShowBankModal] = useState(false);
    const [banks, setBanks] = useState<any[]>([]);
    const [showAddBankModal, setShowAddBankModal] = useState(false);
    const [addingBank, setAddingBank] = useState(false);
    const [newBank, setNewBank] = useState({
        ten_ngan_hang: "",
        so_tai_khoan: "",
        chu_tai_khoan: "",
        chi_nhanh: "",
    });
    const [showBankPicker, setShowBankPicker] = useState(false);

    const BANK_LIST = [
        "Vietcombank", "VietinBank", "BIDV", "Agribank", "MBBank",
        "Techcombank", "ACB", "VPBank", "HDBank", "TPBank",
        "Sacombank", "VIB", "OCB", "SHB", "MSB",
        "SeABank", "LienVietPostBank", "BacABank", "NCB", "PVcomBank",
        "Eximbank", "NamABank", "KienLongBank", "PGBank", "DongABank",
        "BaoVietBank", "BVBank", "PublicBank", "HSBC", "Standard Chartered",
        "Shinhan Bank", "Woori Bank", "UOB", "CIMB", "VietBank",
    ];

    const loadBanks = async () => {
        try {
            const res = await apiClient.get("/khach-hang/tai-khoan-ngan-hang");
            if (res.data?.status) setBanks(res.data.data || []);
        } catch (e) {
            console.log("❌ Error loading banks:", e);
        }
    };

    const handleAddBank = async () => {
        if (!newBank.ten_ngan_hang) return Alert.alert("Lỗi", "Vui lòng chọn ngân hàng.");
        if (!newBank.so_tai_khoan) return Alert.alert("Lỗi", "Vui lòng nhập số tài khoản.");
        if (!newBank.chu_tai_khoan) return Alert.alert("Lỗi", "Vui lòng nhập tên chủ tài khoản.");
        setAddingBank(true);
        try {
            const res = await apiClient.post("/khach-hang/tai-khoan-ngan-hang", {
                ...newBank,
                chu_tai_khoan: newBank.chu_tai_khoan.toUpperCase(),
            });
            if (res.data?.status) {
                Alert.alert("Thành công", res.data.message || "Thêm tài khoản thành công!");
                setShowAddBankModal(false);
                setNewBank({ ten_ngan_hang: "", so_tai_khoan: "", chu_tai_khoan: "", chi_nhanh: "" });
                loadBanks();
            } else {
                Alert.alert("Thất bại", res.data?.message || "Thêm thất bại!");
            }
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const msg = Object.values(errs).map((v: any) => v[0]).join("\n");
                Alert.alert("Lỗi", msg);
            } else {
                Alert.alert("Lỗi", err?.response?.data?.message || "Thêm tài khoản thất bại!");
            }
        } finally {
            setAddingBank(false);
        }
    };

    const handleDeleteBank = (id: number) => {
        Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa tài khoản ngân hàng này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa", style: "destructive",
                onPress: async () => {
                    try {
                        const res = await apiClient.delete(`/khach-hang/tai-khoan-ngan-hang/${id}`);
                        if (res.data?.status) {
                            Alert.alert("Thành công", "Đã xóa tài khoản ngân hàng.");
                            loadBanks();
                        } else Alert.alert("Thất bại", res.data?.message || "Xóa thất bại.");
                    } catch { Alert.alert("Lỗi", "Không thể xóa tài khoản."); }
                }
            }
        ]);
    };

    const handleSetDefaultBank = async (id: number) => {
        try {
            const res = await apiClient.post(`/khach-hang/tai-khoan-ngan-hang/${id}/default`);
            if (res.data?.status) {
                Alert.alert("Thành công", "Đã đặt làm tài khoản mặc định.");
                loadBanks();
            } else Alert.alert("Thất bại", res.data?.message || "Thất bại!");
        } catch { Alert.alert("Lỗi", "Không thể đặt mặc định."); }
    };

    // ── Hàm fetch dữ liệu từ AsyncStorage ──────────────────
    const loadUserFromStorage = async () => {
        try {
            const userDataString = await AsyncStorage.getItem("userData");
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                const sanitizeAvatar = (url: string) => {
                    if (!url) return "";
                    let uri = url.replace(/\\/g, '/');
                    if (uri.startsWith("http://localhost") || uri.startsWith("http://127.0.0.1")) return uri; // Local testing is fine
                    return uri.replace("be-foodbee.edu.vn", "be.foodbee.io.vn");
                };
                setUser(prevUser => ({
                    ...prevUser,
                    name: userData.hoten || userData.ho_ten || userData.ho_va_ten || userData.name || prevUser.name,
                    phone: userData.sodienthoai || userData.so_dien_thoai || userData.phone || prevUser.phone,
                    avatar: sanitizeAvatar(userData.hinh_anh || userData.anh_dai_dien || userData.avatar || userData.image || prevUser.avatar),
                    hang_thanh_vien: userData.hang_thanh_vien || prevUser.hang_thanh_vien,
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
                    hang_thanh_vien: profileData.hang_thanh_vien || "Thành viên",
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
            await loadBanks();
        };
        initializeData();
    }, []);

    // ── Xử lý params từ màn hình khác (như Orders redirect sang) ──
    useEffect(() => {
        if (route?.params?.tab === "bank") {
            loadBanks();
            setShowBankModal(true);
            // Xóa param để không tự động mở lại khi quay lại từ màn hình khác
            navigation.setParams({ tab: undefined });
        }
    }, [route?.params?.tab]);

    // ── Refresh dữ liệu mỗi khi focus vào tab Profile ────────
    useFocusEffect(
        useCallback(() => {
            console.log("👁️ Profile tab focused - refreshing all data...");
            const refreshAllData = async () => {
                await loadUserFromStorage();
                await fetchProfileAndCoins();
                await fetchOrderCounts();
                await loadBanks();
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
        { id: 6, title: "Tài khoản ngân hàng", icon: "card-outline", color: "#F59E0B", onPress: () => { loadBanks(); setShowBankModal(true); } },
        { id: 5, title: "Đổi mật khẩu", icon: "key-outline", color: "#EE4D2D", onPress: () => setShowChangePwModal(true) },
        { id: 3, title: "Cập nhật ứng dụng", icon: "cloud-download-outline", color: "#10B981", onPress: () => navigation.navigate("AppUpdate") },
        { id: 4, title: "Trung tâm trợ giúp", icon: "help-circle-outline", color: "#8B5CF6", onPress: () => navigation.navigate("HelpCenter") },
    ];

    const handleLogout = async () => {
        await AsyncStorage.removeItem("userData");
        await AsyncStorage.removeItem("token");
        navigation.replace("Login");
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

    const handleChatWithShipper = async () => {
        try {
            const res = await apiClient.get('/khach-hang/don-hang/data');
            if (res.data?.data) {
                const active = res.data.data.find((o: any) => o.tinh_trang === 3 && o.id_shipper);
                if (active) {
                    navigation.navigate("ChatWithShipper", {
                        id_don_hang: active.id,
                        ma_don_hang: active.ma_don_hang,
                        name: active.ho_va_ten_shipper || "Shipper",
                        avatar: null
                    });
                } else {
                    Alert.alert("Thông báo", "Bạn hiện không có đơn hàng nào đang được giao bởi Shipper.");
                }
            } else {
                Alert.alert("Thông báo", "Không tìm thấy dữ liệu đơn hàng.");
            }
        } catch (error) {
            console.log("Error fetching active order for chat:", error);
            Alert.alert("Thông báo", "Có lỗi xảy ra khi lấy thông tin đơn hàng đang giao.");
        }
    }

    const getTierConfig = (tier: string) => {
        switch (tier) {
            case 'Kim cương': return { icon: 'diamond', color: '#A78BFA' }; // Light Purple
            case 'Vàng': return { icon: 'star', color: '#FCD34D' }; // Light Gold
            case 'Bạc': return { icon: 'medal', color: '#E2E8F0' }; // Light Silver
            case 'Đồng': return { icon: 'ribbon', color: '#FDBA74' }; // Light Bronze
            default: return { icon: 'person', color: '#FFF' };
        }
    };
    const tierConfig = getTierConfig(user.hang_thanh_vien);

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
                                <TouchableOpacity style={styles.iconBtn} onPress={handleChatWithShipper}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("Cart")}>
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
                                    <Ionicons name={tierConfig.icon} size={12} color={tierConfig.color} />
                                    <Text style={[styles.memberBadgeText, { color: tierConfig.color === '#FFF' ? '#FFF' : tierConfig.color }]}>
                                        Hạng {user.hang_thanh_vien}
                                    </Text>
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
                        <TouchableOpacity style={styles.seeAllRow} onPress={() => navigation.navigate("Orders")}>
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
                                    onPress={() => navigation.navigate("Orders", { initialTab: item.tab })}
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

                {/* ── BANK ACCOUNT MODAL ─────────────────────────── */}
                <Modal
                    visible={showBankModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowBankModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContainer, { maxHeight: "85%" }]}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Tài khoản hoàn tiền</Text>
                                    <Text style={{ fontSize: wp("3%"), color: TEXT_MUTED, marginTop: 2 }}>
                                        Nhận hoàn tiền khi đơn bị hủy
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowBankModal(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Bank list */}
                            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                                {banks.length === 0 ? (
                                    <View style={styles.bankEmptyBox}>
                                        <Ionicons name="card-outline" size={48} color="#CBD5E1" />
                                        <Text style={styles.bankEmptyTitle}>Chưa có tài khoản ngân hàng</Text>
                                        <Text style={styles.bankEmptySubtitle}>
                                            Thêm tài khoản để nhận hoàn tiền tự động khi đơn bị hủy
                                        </Text>
                                        <View style={styles.bankWarningBox}>
                                            <Ionicons name="warning-outline" size={14} color="#D97706" />
                                            <Text style={styles.bankWarningText}>
                                                Chưa có tài khoản = không nhận được hoàn tiền tự động
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ paddingBottom: 8 }}>
                                        {banks.map((bank: any) => (
                                            <View
                                                key={bank.id}
                                                style={[
                                                    styles.bankCard,
                                                    bank.is_default == 1 && styles.bankCardDefault,
                                                ]}
                                            >
                                                <View style={styles.bankCardLeft}>
                                                    <View style={[
                                                        styles.bankIconCircle,
                                                        bank.is_default == 1 && { backgroundColor: "#FFF7ED" },
                                                    ]}>
                                                        <Ionicons
                                                            name="business-outline"
                                                            size={20}
                                                            color={bank.is_default == 1 ? PRIMARY_COLOR : "#94A3B8"}
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                                                            <Text style={styles.bankName}>{bank.ten_ngan_hang}</Text>
                                                            {bank.is_default == 1 && (
                                                                <View style={styles.defaultBadge}>
                                                                    <Text style={styles.defaultBadgeText}>Mặc định</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={styles.bankAccount}>
                                                            {bank.so_tai_khoan} — {bank.chu_tai_khoan}
                                                        </Text>
                                                        {!!bank.chi_nhanh && (
                                                            <Text style={styles.bankBranch}>{bank.chi_nhanh}</Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <View style={styles.bankCardActions}>
                                                    {bank.is_default != 1 && (
                                                        <TouchableOpacity
                                                            style={styles.setDefaultBtn}
                                                            onPress={() => handleSetDefaultBank(bank.id)}
                                                        >
                                                            <Text style={styles.setDefaultBtnText}>Mặc định</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    <TouchableOpacity
                                                        style={styles.deleteBankBtn}
                                                        onPress={() => handleDeleteBank(bank.id)}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                        <View style={styles.bankInfoBox}>
                                            <Ionicons name="information-circle-outline" size={14} color="#3B82F6" />
                                            <Text style={styles.bankInfoText}>
                                                Tiền hoàn sẽ được chuyển vào tài khoản{" "}
                                                <Text style={{ fontWeight: "700" }}>mặc định</Text>{" "}
                                                trong vài phút sau khi đơn bị hủy.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Add button */}
                            <TouchableOpacity
                                style={styles.addBankBtn}
                                onPress={() => {
                                    setNewBank({ ten_ngan_hang: "", so_tai_khoan: "", chu_tai_khoan: "", chi_nhanh: "" });
                                    setShowAddBankModal(true);
                                }}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                                <Text style={styles.addBankBtnText}>Thêm tài khoản</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* ── ADD BANK ACCOUNT MODAL ──────────────────────── */}
                <Modal
                    visible={showAddBankModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowAddBankModal(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalOverlay}
                    >
                        <View style={[styles.modalContainer, { maxHeight: "90%" }]}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Thêm tài khoản ngân hàng</Text>
                                    <Text style={{ fontSize: wp("3%"), color: TEXT_MUTED, marginTop: 2 }}>
                                        Dùng để nhận hoàn tiền tự động
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowAddBankModal(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Chọn ngân hàng */}
                                <Text style={styles.inputLabel}>
                                    Tên ngân hàng <Text style={{ color: PRIMARY_COLOR }}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.bankPickerBtn}
                                    onPress={() => setShowBankPicker(!showBankPicker)}
                                >
                                    <Text style={[
                                        styles.bankPickerText,
                                        !newBank.ten_ngan_hang && { color: "#94A3B8" }
                                    ]}>
                                        {newBank.ten_ngan_hang || "-- Chọn ngân hàng --"}
                                    </Text>
                                    <Ionicons
                                        name={showBankPicker ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color="#94A3B8"
                                    />
                                </TouchableOpacity>
                                {showBankPicker && (
                                    <View style={styles.bankDropdown}>
                                        <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                                            {BANK_LIST.map((b) => (
                                                <TouchableOpacity
                                                    key={b}
                                                    style={[
                                                        styles.bankDropdownItem,
                                                        newBank.ten_ngan_hang === b && styles.bankDropdownItemSelected,
                                                    ]}
                                                    onPress={() => {
                                                        setNewBank(prev => ({ ...prev, ten_ngan_hang: b }));
                                                        setShowBankPicker(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.bankDropdownItemText,
                                                        newBank.ten_ngan_hang === b && { color: PRIMARY_COLOR, fontWeight: "700" },
                                                    ]}>{b}</Text>
                                                    {newBank.ten_ngan_hang === b && (
                                                        <Ionicons name="checkmark" size={16} color={PRIMARY_COLOR} />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Số tài khoản */}
                                <Text style={styles.inputLabel}>
                                    Số tài khoản <Text style={{ color: PRIMARY_COLOR }}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.bankTextInput}
                                    placeholder="Nhập số tài khoản"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="number-pad"
                                    value={newBank.so_tai_khoan}
                                    onChangeText={v => setNewBank(p => ({ ...p, so_tai_khoan: v }))}
                                />

                                {/* Chủ tài khoản */}
                                <Text style={styles.inputLabel}>
                                    Chủ tài khoản <Text style={{ color: PRIMARY_COLOR }}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.bankTextInput}
                                    placeholder="NGUYEN VAN A (viết hoa không dấu)"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="characters"
                                    value={newBank.chu_tai_khoan}
                                    onChangeText={v => setNewBank(p => ({ ...p, chu_tai_khoan: v.toUpperCase() }))}
                                />

                                {/* Chi nhánh */}
                                <Text style={styles.inputLabel}>Chi nhánh (không bắt buộc)</Text>
                                <TextInput
                                    style={styles.bankTextInput}
                                    placeholder="VD: CN Đà Nẵng"
                                    placeholderTextColor="#94A3B8"
                                    value={newBank.chi_nhanh}
                                    onChangeText={v => setNewBank(p => ({ ...p, chi_nhanh: v }))}
                                />

                                {/* Warning */}
                                <View style={styles.addBankWarningBox}>
                                    <Ionicons name="warning-outline" size={14} color="#D97706" />
                                    <Text style={styles.bankWarningText}>
                                        Đảm bảo thông tin tài khoản chính xác. FoodBee không chịu trách nhiệm nếu thông tin sai.
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitBtn, addingBank && { opacity: 0.6 }]}
                                    onPress={handleAddBank}
                                    disabled={addingBank}
                                >
                                    <Text style={styles.submitBtnText}>
                                        {addingBank ? "Đang thêm..." : "Thêm tài khoản"}
                                    </Text>
                                </TouchableOpacity>
                                <View style={{ height: 20 }} />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

            </ScrollView>
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
        borderRadius: wp("10%"),
        marginRight: wp("4%"),
    },
    avatar: {
        width: wp("16%"),
        height: wp("16%"),
        borderRadius: wp("8%"),
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
    // ── Bank Account styles ───────────────────────────────
    bankEmptyBox: {
        alignItems: "center",
        paddingVertical: hp("4%"),
        paddingHorizontal: wp("5%"),
    },
    bankEmptyTitle: {
        fontSize: wp("4%"),
        fontWeight: "700",
        color: TEXT_DARK,
        marginTop: hp("1.5%"),
        marginBottom: hp("0.5%"),
    },
    bankEmptySubtitle: {
        fontSize: wp("3.2%"),
        color: TEXT_MUTED,
        textAlign: "center",
        marginBottom: hp("2%"),
    },
    bankWarningBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FFFBEB",
        borderWidth: 1,
        borderColor: "#FDE68A",
        borderRadius: wp("2.5%"),
        padding: wp("3%"),
        gap: 6,
        marginTop: hp("1%"),
    },
    bankWarningText: {
        flex: 1,
        fontSize: wp("2.8%"),
        color: "#92400E",
        lineHeight: 18,
    },
    bankCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F8FAFC",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: wp("3%"),
        padding: wp("3.5%"),
        marginBottom: hp("1.5%"),
    },
    bankCardDefault: {
        backgroundColor: "#FFF7ED",
        borderColor: "#FDBA74",
    },
    bankCardLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 10,
    },
    bankIconCircle: {
        width: wp("10%"),
        height: wp("10%"),
        borderRadius: wp("5%"),
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    bankName: {
        fontSize: wp("3.8%"),
        fontWeight: "700",
        color: TEXT_DARK,
        marginRight: 6,
    },
    defaultBadge: {
        backgroundColor: "#FEF3C7",
        borderRadius: 10,
        paddingHorizontal: wp("2%"),
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    defaultBadgeText: {
        fontSize: wp("2.5%"),
        color: "#D97706",
        fontWeight: "700",
    },
    bankAccount: {
        fontSize: wp("3.2%"),
        color: TEXT_MUTED,
        marginTop: 2,
    },
    bankBranch: {
        fontSize: wp("2.8%"),
        color: "#94A3B8",
        marginTop: 2,
    },
    bankCardActions: {
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        marginLeft: 8,
    },
    setDefaultBtn: {
        borderWidth: 1,
        borderColor: "#FDBA74",
        borderRadius: wp("2%"),
        paddingHorizontal: wp("2.5%"),
        paddingVertical: 4,
    },
    setDefaultBtnText: {
        fontSize: wp("2.8%"),
        color: "#D97706",
        fontWeight: "600",
    },
    deleteBankBtn: {
        width: wp("8%"),
        height: wp("8%"),
        borderRadius: wp("2%"),
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        justifyContent: "center",
        alignItems: "center",
    },
    bankInfoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        borderRadius: wp("2.5%"),
        padding: wp("3%"),
        gap: 6,
        marginTop: hp("1%"),
    },
    bankInfoText: {
        flex: 1,
        fontSize: wp("2.8%"),
        color: "#1D4ED8",
        lineHeight: 18,
    },
    addBankBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: wp("3%"),
        paddingVertical: hp("1.8%"),
        marginTop: hp("2%"),
    },
    addBankBtnText: {
        color: "#FFF",
        fontSize: wp("4%"),
        fontWeight: "700",
    },
    bankPickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: wp("3%"),
        paddingHorizontal: wp("3.5%"),
        height: hp("6%"),
        backgroundColor: "#F8FAFC",
        marginBottom: 4,
    },
    bankPickerText: {
        flex: 1,
        fontSize: wp("3.8%"),
        color: TEXT_DARK,
    },
    bankDropdown: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: wp("3%"),
        backgroundColor: "#FFF",
        marginBottom: hp("1%"),
        overflow: "hidden",
    },
    bankDropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.3%"),
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    bankDropdownItemSelected: {
        backgroundColor: "#FFF7ED",
    },
    bankDropdownItemText: {
        fontSize: wp("3.8%"),
        color: TEXT_DARK,
    },
    bankTextInput: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: wp("3%"),
        paddingHorizontal: wp("3.5%"),
        height: hp("6%"),
        backgroundColor: "#F8FAFC",
        fontSize: wp("3.8%"),
        color: TEXT_DARK,
    },
    addBankWarningBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FFFBEB",
        borderWidth: 1,
        borderColor: "#FDE68A",
        borderRadius: wp("2.5%"),
        padding: wp("3%"),
        gap: 6,
        marginTop: hp("2%"),
        marginBottom: hp("2%"),
    },
});

export default Profile;