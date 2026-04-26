import React, { useState, useEffect } from "react";
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

const PRIMARY_COLOR = "#EE4D2D"; // Orange color for Shipper side
const BACKGROUND_COLOR = "#F5F6F8";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";

// ════════════ Review Types & Mock Data ════════════
interface Review {
    id: string;
    ten_khach: string;
    so_sao: number;
    binh_luan: string;
    ngay: string;
    ma_don_hang: string;
    avatar_khach_hang?: string;
}

const MOCK_REVIEWS: Review[] = [
    { id: "1", ten_khach: "Nguyễn Văn An",  so_sao: 5, binh_luan: "Shipper giao hàng rất nhanh, thái độ nhiệt tình. Sẽ ủng hộ tiếp!",   ngay: "19/03/2026", ma_don_hang: "DH001" },
    { id: "2", ten_khach: "Trần Thị Bích",  so_sao: 5, binh_luan: "Giao đúng giờ, hàng còn nóng. Cảm ơn shipper rất nhiều!",             ngay: "19/03/2026", ma_don_hang: "DH002" },
    { id: "3", ten_khach: "Lê Minh Châu",   so_sao: 4, binh_luan: "Giao hàng ổn, hơi trễ 5 phút nhưng shipper có xin lỗi.",              ngay: "18/03/2026", ma_don_hang: "DH003" },
    { id: "4", ten_khach: "Hoàng Thị Hà",   so_sao: 5, binh_luan: "Rất hài lòng! Shipper chủ động liên hệ khi gần đến nơi.",             ngay: "18/03/2026", ma_don_hang: "DH005" },
    { id: "5", ten_khach: "Vũ Thanh Long",   so_sao: 3, binh_luan: "Shipper giao hàng bình thường, không có gì đặc biệt.",                ngay: "17/03/2026", ma_don_hang: "DH006" },
    { id: "6", ten_khach: "Đinh Thị Mai",    so_sao: 5, binh_luan: "Tuyệt vời! Shipper rất lịch sự và đồ ăn còn nóng hổi khi nhận.",     ngay: "17/03/2026", ma_don_hang: "DH007" },
    { id: "7", ten_khach: "Bùi Văn Nam",     so_sao: 4, binh_luan: "Giao nhanh, đóng gói cẩn thận.",                                      ngay: "16/03/2026", ma_don_hang: "DH008" },
];

const ShipperProfile = ({ navigation }: any) => {
    const [user, setUser] = useState({
        name: "Tài xế",
        phone: "Đang cập nhật...",
        avatar: "https://thichtrangtri.com/wp-content/uploads/2025/05/Hinh-anh-con-bo-9-1-269x300.jpg",
        rating: "5.0",
        totalTrips: "0",
        earnings: "0đ",
    });
    const [isBothRole, setIsBothRole] = useState(false);
    const [loadingSwitch, setLoadingSwitch] = useState(false);
    const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
    const [showAllReviews, setShowAllReviews] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userDataString = await AsyncStorage.getItem("userData");
                if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    setUser(prevUser => ({
                        ...prevUser,
                        name: userData.hoten || userData.ho_ten || userData.ho_va_ten || userData.name || prevUser.name,
                        phone: userData.sodienthoai || userData.so_dien_thoai || userData.phone || prevUser.phone,
                        avatar: userData.hinh_anh || userData.anh_dai_dien || userData.avatar || userData.image || "https://thichtrangtri.com/wp-content/uploads/2025/05/Hinh-anh-con-bo-9-1-269x300.jpg",
                    }));
                }
                const bothRole = await AsyncStorage.getItem("isBothRole");
                if (bothRole === "true") setIsBothRole(true);
            } catch (error) {
                console.log("Error fetching user data:", error);
            }
        };
        const fetchStats = async () => {
            try {
                const today = new Date();
                const pad = (n: number) => String(n).padStart(2, "0");
                const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

                const userDataString = await AsyncStorage.getItem("userData");
                const userData = userDataString ? JSON.parse(userDataString) : {};
                const idShipper = userData.id;

                const [balRes, statsRes] = await Promise.allSettled([
                    apiClient.get("/wallet/chi-tiet", {
                        params: { loai_vi: "shipper", id_chu_vi: idShipper },
                    }),
                    apiClient.post("/shipper/don-hang/thong-ke", {
                        day_begin: toDate(firstDay),
                        day_end: toDate(today),
                    }),
                ]);

                setUser(prev => {
                    const next = { ...prev };
                    if (balRes.status === "fulfilled" && balRes.value.data?.status) {
                        const soDu: number = balRes.value.data.data?.vi?.so_du ?? 0;
                        next.earnings = new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                        }).format(soDu);
                    }
                    if (statsRes.status === "fulfilled" && statsRes.value.data?.data) {
                        const completed = (statsRes.value.data.data as any[]).filter(
                            (t: any) => t.tinh_trang === 4
                        );
                        next.totalTrips = String(completed.length);
                    }
                    return next;
                });
            } catch (error) {
                console.log("Error fetching shipper stats:", error);
            }
        };
        const fetchReviews = async () => {
            try {
                const res = await apiClient.get("/shipper/danh-gia");
                if (res.data?.status === 1 && res.data?.danh_sach) {
                    // Map dữ liệu từ API sang format component
                    const mappedReviews = res.data.danh_sach.map((item: any) => ({
                        id: String(item.id),
                        ten_khach: item.ten_khach_hang || "Khách hàng",
                        so_sao: item.sao_shipper || 0,
                        binh_luan: item.nhan_xet_shipper || "",
                        ngay: item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : "",
                        ma_don_hang: item.ma_don_hang || "",
                        avatar_khach_hang: item.avatar_khach_hang,
                    }));
                    setReviews(mappedReviews);
                    setUser(prev => ({
                        ...prev,
                        rating: String(res.data.trung_binh_sao || 0),
                    }));
                }
            } catch (error) {
                console.log("Error fetching reviews:", error);
                // giữ mock data
            }
        };
        fetchUserData();
        fetchReviews();
        fetchStats();
    }, []);

    const menuOptions = [
        { id: 1, title: "Lịch sử chuyến xe", icon: "time-outline", color: "#3B82F6" },
        { id: 3, title: "Cập nhật ứng dụng", icon: "flame-outline", color: "#F59E0B" },
        { id: 4, title: "Hỗ trợ tài xế", icon: "headset-outline", color: "#8B5CF6" },
    ];

    const handleLogout = async () => {
        await AsyncStorage.removeItem("userData");
        await AsyncStorage.removeItem("token");
        navigation.replace("Login");
    }

    const handleSwitchToClient = async () => {
        setLoadingSwitch(true);
        try {
            const email = await AsyncStorage.getItem("savedEmail");
            const password = await AsyncStorage.getItem("savedPassword");
            if (email && password) {
                const response = await apiClient.post("/khach-hang/dang-nhap", { email, password });
                if (response.data.status === 1) {
                    const token = response.data.token;
                    if (token) await AsyncStorage.setItem('token', token);
                    await AsyncStorage.setItem('userRole', 'user');
                    
                    let newUserData = response.data.data || response.data.khach_hang;
                    if (!newUserData) {
                        try {
                            // Fetch real user data using the token
                            const userResponse = await apiClient.get("/khach-hang/data-login");
                            if (userResponse.data && userResponse.data.data) {
                                newUserData = userResponse.data.data;
                            } else if (userResponse.data && userResponse.data.khach_hang) {
                                newUserData = userResponse.data.khach_hang;
                            }
                        } catch (e) {
                            console.log("Error fetching user data on switch:", e);
                        }
                    }

                    if (!newUserData) newUserData = { hoten: "Khách hàng", email };
                    await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
                    
                    navigation.replace("MainTabs");
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
                                    <Ionicons name="notifications-outline" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* USER INFO */}
                        <TouchableOpacity
                            style={styles.userInfoContainer}
                            onPress={() => navigation.navigate("ShipperProfileDetail")}
                            activeOpacity={0.85}
                        >
                            <View style={styles.avatarOutline}>
                                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                            </View>
                            <View style={styles.userInfoText}>
                                <Text style={styles.userName}>{user.name}</Text>
                                <Text style={styles.userPhone}>{user.phone}</Text>
                                <View style={styles.memberBadge}>
                                    <Ionicons name="star" size={12} color="#F59E0B" />
                                    <Text style={styles.memberBadgeText}>{user.rating} Đánh giá</Text>
                                </View>
                            </View>
                            <View style={styles.editProfileChip}>
                                <Ionicons name="create-outline" size={14} color="#FFF" />
                                <Text style={styles.editProfileChipText}>Chỉnh sửa</Text>
                            </View>
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>

                {/* STATS SUMMARY */}
                <View style={styles.walletContainer}>
                    <View style={styles.walletItem}>
                        <Ionicons name="map" size={24} color="#3B82F6" />
                        <Text style={styles.walletValue}>{user.totalTrips}</Text>
                        <Text style={styles.walletLabel}>Chuyến đi</Text>
                    </View>
                    <View style={styles.dividerVertical} />
                    <View style={styles.walletItem}>
                        <Ionicons name="wallet" size={24} color="#10B981" />
                        <Text style={styles.walletValue}>{user.earnings}</Text>
                        <Text style={styles.walletLabel}>Số Dư </Text>
                    </View>
                    <View style={styles.dividerVertical} />
                    <View style={styles.walletItem}>
                        <Ionicons name="trophy" size={24} color="#F59E0B" />
                        <Text style={styles.walletValue}>Bạc</Text>
                        <Text style={styles.walletLabel}>Hạng</Text>
                    </View>
                </View>

                {/* NẠP TIỀN BUTTON */}
                <TouchableOpacity
                    style={styles.topUpBanner}
                    onPress={() => navigation.navigate("ShipperTopUp")}
                    activeOpacity={0.85}
                >
                    <View style={styles.topUpLeft}>
                        <View style={styles.topUpIconWrap}>
                            <Ionicons name="add-circle" size={26} color={PRIMARY_COLOR} />
                        </View>
                        <View>
                            <Text style={styles.topUpTitle}>Nạp tiền</Text>
                            <Text style={styles.topUpSub}>Chuyển khoản – xử lý nhanh 5–15 phút</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>

                {/* SWITCH ROLE BANNER */}
                {isBothRole && (
                    <TouchableOpacity style={styles.shipperBannerWrapper} activeOpacity={0.9} onPress={handleSwitchToClient}>
                        <View style={[styles.shipperBannerContent, { backgroundColor: '#FFEDD5', borderColor: '#FDBA74' }]}>
                            <View style={styles.shipperTextContent}>
                                <Text style={[styles.shipperPromoTitle, { color: '#C2410C' }]}>Giao diện Khách hàng</Text>
                                <Text style={styles.shipperPromoSub}>Chuyển sang chế độ xem và đặt đồ ăn dễ dàng hơn.</Text>
                                <View style={[styles.shipperRegBtn, { borderColor: '#C2410C' }]}>
                                    <Text style={[styles.shipperRegBtnText, { color: '#C2410C' }]}>Chuyển ngay</Text>
                                    <Ionicons name="swap-horizontal" size={14} color="#C2410C" />
                                </View>
                            </View>
                            <View style={styles.shipperIllustration}>
                                <Image
                                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
                                    style={styles.shipperImageFallback}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* ════ REVIEW HISTORY ════ */}
                {(() => {
                    const avgRating = reviews.length
                        ? reviews.reduce((s, r) => s + r.so_sao, 0) / reviews.length
                        : 0;
                    const starCounts = [5, 4, 3, 2, 1].map(star => ({
                        star,
                        count: reviews.filter(r => r.so_sao === star).length,
                    }));
                    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

                    return (
                        <View style={styles.sectionCard}>
                            {/* Header */}
                            <View style={styles.reviewHeader}>
                                <Text style={styles.sectionTitle}>Đánh giá từ khách hàng</Text>
                                <View style={styles.reviewCountBadge}>
                                    <Text style={styles.reviewCountText}>{reviews.length}</Text>
                                </View>
                            </View>

                            {/* Rating Summary */}
                            <View style={styles.ratingSummary}>
                                {/* Big number */}
                                <View style={styles.ratingBig}>
                                    <Text style={styles.ratingBigNum}>{avgRating.toFixed(1)}</Text>
                                    <View style={styles.ratingBigStars}>
                                        {[1,2,3,4,5].map(s => (
                                            <Ionicons
                                                key={s}
                                                name={s <= Math.round(avgRating) ? "star" : "star-outline"}
                                                size={14}
                                                color="#F59E0B"
                                            />
                                        ))}
                                    </View>
                                    <Text style={styles.ratingBigSub}>{reviews.length} đánh giá</Text>
                                </View>

                                {/* Star breakdown */}
                                <View style={styles.ratingBreakdown}>
                                    {starCounts.map(({ star, count }) => {
                                        const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                                        return (
                                            <View key={star} style={styles.barRow}>
                                                <Text style={styles.barLabel}>{star}</Text>
                                                <Ionicons name="star" size={10} color="#F59E0B" />
                                                <View style={styles.barTrack}>
                                                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                                                </View>
                                                <Text style={styles.barCount}>{count}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Review List */}
                            <View style={styles.reviewDivider} />
                            {displayedReviews.map((review, idx) => (
                                <View key={review.id} style={[
                                    styles.reviewItem,
                                    idx < displayedReviews.length - 1 && styles.reviewItemBorder,
                                ]}>
                                    {/* Avatar + name */}
                                    <View style={styles.reviewTop}>
                                        <View style={styles.reviewAvatar}>
                                            <Text style={styles.reviewAvatarText}>
                                                {review.ten_khach.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.reviewName}>{review.ten_khach}</Text>
                                            <View style={styles.reviewMeta}>
                                                {/* Stars */}
                                                <View style={styles.reviewStars}>
                                                    {[1,2,3,4,5].map(s => (
                                                        <Ionicons
                                                            key={s}
                                                            name={s <= review.so_sao ? "star" : "star-outline"}
                                                            size={12}
                                                            color="#F59E0B"
                                                        />
                                                    ))}
                                                </View>
                                                <Text style={styles.reviewDate}>{review.ngay}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.reviewOrderId}>#{review.ma_don_hang}</Text>
                                    </View>
                                    {/* Comment */}
                                    {!!review.binh_luan && (
                                        <Text style={styles.reviewComment}>{review.binh_luan}</Text>
                                    )}
                                </View>
                            ))}

                            {/* Show more / less */}
                            {reviews.length > 3 && (
                                <TouchableOpacity
                                    style={styles.showMoreBtn}
                                    onPress={() => setShowAllReviews(v => !v)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.showMoreText}>
                                        {showAllReviews ? "Thu gọn" : `Xem thêm ${reviews.length - 3} đánh giá`}
                                    </Text>
                                    <Ionicons
                                        name={showAllReviews ? "chevron-up" : "chevron-down"}
                                        size={14}
                                        color={PRIMARY_COLOR}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })()}

                {/* SETTINGS & UTILITIES MENU */}
                <View style={styles.sectionCard}>
                    <Text style={[styles.sectionTitle, { marginLeft: wp("4%"), marginTop: hp("1.5%"), marginBottom: hp("1%") }]}>
                        Công cụ & Tiện ích
                    </Text>
                    {menuOptions.map((menu, index) => (
                        <TouchableOpacity key={menu.id} style={styles.menuItem}>
                            <View style={styles.menuIconWrap}>
                                <Ionicons name={menu.icon} size={20} color={menu.color} />
                            </View>
                            <Text style={styles.menuLabel}>{menu.title}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate("ShipperChangePassword")}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.menuIconWrap, { backgroundColor: "#FFF0ED" }]}>
                            <Ionicons name="key-outline" size={20} color={PRIMARY_COLOR} />
                        </View>
                        <Text style={styles.menuLabel}>Đổi mật khẩu</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                {/* LOGOUT BUTTON */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Đăng xuất</Text>
                </TouchableOpacity>

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
    editProfileChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.22)",
        borderRadius: 20,
        paddingHorizontal: wp("2.5%"),
        paddingVertical: hp("0.5%"),
        gap: 4,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.4)",
    },
    editProfileChipText: {
        fontSize: wp("3%"),
        color: "#FFF",
        fontWeight: "600",
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
    sectionTitle: {
        fontSize: wp("4%"),
        fontWeight: "700",
        color: TEXT_DARK,
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
        padding: wp("4%"),
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderRadius: wp("4%"),
    },
    shipperTextContent: {
        flex: 1,
        marginRight: wp("3%"),
    },
    shipperPromoTitle: {
        fontSize: wp("4%"),
        fontWeight: "800",
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
    },
    shipperRegBtnText: {
        fontSize: wp("3%"),
        fontWeight: "700",
        marginRight: wp("1%"),
    },
    shipperIllustration: {
        width: wp("18%"),
        height: wp("18%"),
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
        color: "#EE4D2D",
        fontSize: wp("4%"),
        fontWeight: "700",
    },
    // Nạp tiền banner
    topUpBanner: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        backgroundColor: "#FFF5F3",
        marginHorizontal: wp("5%"),
        marginTop: hp("2%"),
        borderRadius: wp("4%"),
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.8%"),
        borderWidth: 1.5,
        borderColor: "#FECACA",
        elevation: 2,
        shadowColor: PRIMARY_COLOR,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    topUpLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: wp("3%") },
    topUpIconWrap: {
        width: wp("10%"),
        height: wp("10%"),
        borderRadius: wp("5%"),
        backgroundColor: "#FFEDD5",
        justifyContent: "center" as const,
        alignItems: "center" as const,
    },
    topUpTitle: { fontSize: wp("4%"), fontWeight: "800" as const, color: PRIMARY_COLOR },
    topUpSub: { fontSize: wp("3%"), color: TEXT_MUTED, marginTop: 2 },
    reviewHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: wp("4%"),
        paddingTop: hp("1.5%"),
        paddingBottom: hp("1%"),
        gap: 8,
    },
    reviewCountBadge: {
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 10,
        minWidth: 22,
        height: 22,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
    },
    reviewCountText: {
        color: "#FFF",
        fontSize: 11,
        fontWeight: "700",
    },
    ratingSummary: {
        flexDirection: "row",
        paddingHorizontal: wp("4%"),
        paddingBottom: hp("1.5%"),
        gap: wp("4%"),
        alignItems: "center",
    },
    ratingBig: {
        alignItems: "center",
        minWidth: wp("18%"),
    },
    ratingBigNum: {
        fontSize: wp("10%"),
        fontWeight: "900",
        color: TEXT_DARK,
        lineHeight: wp("12%"),
    },
    ratingBigStars: {
        flexDirection: "row",
        gap: 2,
        marginVertical: 3,
    },
    ratingBigSub: {
        fontSize: wp("2.8%"),
        color: TEXT_MUTED,
        fontWeight: "500",
    },
    ratingBreakdown: {
        flex: 1,
        gap: 5,
    },
    barRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    barLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: TEXT_DARK,
        width: 10,
        textAlign: "right",
    },
    barTrack: {
        flex: 1,
        height: 6,
        backgroundColor: "#F1F5F9",
        borderRadius: 3,
        overflow: "hidden",
    },
    barFill: {
        height: "100%",
        backgroundColor: "#F59E0B",
        borderRadius: 3,
    },
    barCount: {
        fontSize: 10,
        color: TEXT_MUTED,
        width: 16,
        textAlign: "right",
        fontWeight: "600",
    },
    reviewDivider: {
        height: 1,
        backgroundColor: "#F1F5F9",
        marginHorizontal: wp("4%"),
        marginBottom: hp("1%"),
    },
    reviewItem: {
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.2%"),
    },
    reviewItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    reviewTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: wp("3%"),
        marginBottom: hp("0.6%"),
    },
    reviewAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: PRIMARY_COLOR,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    reviewAvatarText: {
        color: "#FFF",
        fontWeight: "800",
        fontSize: 14,
    },
    reviewName: {
        fontSize: wp("3.5%"),
        fontWeight: "700",
        color: TEXT_DARK,
        marginBottom: 3,
    },
    reviewMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    reviewStars: {
        flexDirection: "row",
        gap: 2,
    },
    reviewDate: {
        fontSize: wp("2.8%"),
        color: TEXT_MUTED,
        fontWeight: "500",
    },
    reviewOrderId: {
        fontSize: wp("2.8%"),
        color: TEXT_MUTED,
        fontWeight: "600",
        alignSelf: "flex-start",
        marginTop: 2,
    },
    reviewComment: {
        fontSize: wp("3.3%"),
        color: "#475569",
        lineHeight: 19,
        paddingLeft: wp("11%"),
        fontStyle: "italic",
    },
    showMoreBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: hp("1.3%"),
        gap: 5,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        marginTop: hp("0.5%"),
    },
    showMoreText: {
        fontSize: wp("3.3%"),
        color: PRIMARY_COLOR,
        fontWeight: "700",
    },
});

export default ShipperProfile;
