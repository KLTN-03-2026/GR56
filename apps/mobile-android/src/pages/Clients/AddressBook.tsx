import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Platform,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import CustomAlert, { AlertButton } from "../../components/CustomAlert";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import Geolocation from "react-native-geolocation-service";
import LocationPickerModal from "../../components/LocationPickerModal";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";
import { requestLocationPermission } from "../../utils/location";

const PRIMARY = "#EE4D2D";
const BG = "#F8FAFC";
const DARK = "#1E293B";
const MUTED = "#64748B";

interface DiaChi {
    id: number;
    ten_nguoi_nhan: string;
    so_dien_thoai: string;
    dia_chi: string;
    id_quan_huyen: number;
    ten_quan_huyen?: string;
    ten_tinh_thanh?: string;
    toa_do_x?: number | null;
    toa_do_y?: number | null;
}
interface TinhThanh { id: number; ten_tinh_thanh: string; }
interface QuanHuyen { id: number; ten_quan_huyen: string; }

const EMPTY_FORM = { ten_nguoi_nhan: "", so_dien_thoai: "", dia_chi: "", id_quan_huyen: 0 };

const AddressBook = ({ navigation }: any) => {
    const [addresses, setAddresses] = useState<DiaChi[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

    // Tỉnh thành
    const [tinhThanhs, setTinhThanhs] = useState<TinhThanh[]>([]);
    const [selectedProvince, setSelectedProvince] = useState<TinhThanh | null>(null);
    const [showProvincePicker, setShowProvincePicker] = useState(false);
    const [provinceSearch, setProvinceSearch] = useState("");

    // Quận huyện
    const [quanHuyens, setQuanHuyens] = useState<QuanHuyen[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState<QuanHuyen | null>(null);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);
    const [districtSearch, setDistrictSearch] = useState("");
    const [loadingDistricts, setLoadingDistricts] = useState(false);

    // Form
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [manualCoord, setManualCoord] = useState<{ lng: number; lat: number } | null>(null);
    const [gettingGPS, setGettingGPS] = useState(false);
    const [mapPickerVisible, setMapPickerVisible] = useState(false);

    // ── Fetch ──────────────────────────────────────────
    const fetchAddresses = async () => {
        try {
            const res = await apiClient.get("/khach-hang/dia-chi/data");
            if (res.data?.status === 1) setAddresses(res.data.data || []);
        } catch (e) { console.log("fetchAddresses error:", e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const fetchTinhThanhs = async () => {
        try {
            const res = await apiClient.get("/khach-hang/tinh-thanh/data");
            setTinhThanhs(res.data?.data || []);
        } catch (e) { console.log("fetchTinhThanh error:", e); }
    };

    const fetchQuanHuyenByTinh = async (id_tinh_thanh: number) => {
        setLoadingDistricts(true);
        setQuanHuyens([]);
        setSelectedDistrict(null);
        setForm(prev => ({ ...prev, id_quan_huyen: 0 }));
        try {
            const res = await apiClient.post("/khach-hang/quan-huyen/data", { id_tinh_thanh });
            setQuanHuyens(res.data?.data || []);
        } catch (e) { console.log("fetchQuanHuyen error:", e); }
        finally { setLoadingDistricts(false); }
    };

    useEffect(() => { fetchAddresses(); fetchTinhThanhs(); }, []);

    const onRefresh = useCallback(() => { setRefreshing(true); fetchAddresses(); }, []);

    // ── Modal handlers ──────────────────────────────────
    const openAddModal = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setSelectedProvince(null);
        setSelectedDistrict(null);
        setQuanHuyens([]);
        setManualCoord(null);
        setShowModal(true);
    };

    const openEditModal = async (addr: DiaChi) => {
        setEditingId(addr.id);
        setForm({
            ten_nguoi_nhan: addr.ten_nguoi_nhan || "",
            so_dien_thoai: addr.so_dien_thoai || "",
            dia_chi: addr.dia_chi || "",
            id_quan_huyen: addr.id_quan_huyen || 0,
        });

        // Pre-select province by name from address data
        let province: TinhThanh | null = null;
        if (addr.ten_tinh_thanh) {
            // Try to find from already loaded list
            let list = tinhThanhs;
            if (list.length === 0) {
                const res = await apiClient.get("/khach-hang/tinh-thanh/data");
                list = res.data?.data || [];
                setTinhThanhs(list);
            }
            province = list.find((t) =>
                t.ten_tinh_thanh === addr.ten_tinh_thanh
            ) || null;
        }
        setSelectedProvince(province);

        // Pre-load districts for that province
        if (province) {
            const res = await apiClient.post("/khach-hang/quan-huyen/data", { id_tinh_thanh: province.id });
            const districts: QuanHuyen[] = res.data?.data || [];
            setQuanHuyens(districts);
            const district = districts.find((q) => q.id === addr.id_quan_huyen);
            setSelectedDistrict(district || (addr.ten_quan_huyen ? { id: addr.id_quan_huyen, ten_quan_huyen: addr.ten_quan_huyen } : null));
        }
        // Pre-fill tọa độ nếu địa chỉ đã có — không cần ghim lại khi chỉ sửa tên/SĐT
        setManualCoord(
            addr.toa_do_x && addr.toa_do_y
                ? { lng: Number(addr.toa_do_x), lat: Number(addr.toa_do_y) }
                : null
        );
        setShowModal(true);
    };

    // ── Lấy GPS hiện tại ─────────────────────────────────
    const handleGetGPS = async () => {
        setGettingGPS(true);
        try {
            const granted = await requestLocationPermission();
            if (!granted) {
                showAlert("error", "Lỗi", "Không có quyền truy cập vị trí.");
                setGettingGPS(false);
                return;
            }
            Geolocation.getCurrentPosition(
                (pos) => {
                    setManualCoord({ lng: pos.coords.longitude, lat: pos.coords.latitude });
                    setGettingGPS(false);
                    showAlert("success", "Đã lấy vị trí GPS", "✅ Vị trí chính xác đã được ghi nhận. Nhấn Lưu để hoàn tất.");
                },
                () => {
                    showAlert("error", "Không lấy được GPS", "Hãy bật GPS và thử lại.");
                    setGettingGPS(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } catch {
            setGettingGPS(false);
        }
    };

    // ── Submit ──────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.ten_nguoi_nhan.trim() || !form.so_dien_thoai.trim() || !form.dia_chi.trim()) {
            showAlert("error", "Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc."); return;
        }
        if (!selectedProvince) { showAlert("error", "Lỗi", "Vui lòng chọn Tỉnh / Thành phố."); return; }
        if (!form.id_quan_huyen) { showAlert("error", "Lỗi", "Vui lòng chọn Quận / Huyện."); return; }

        // Yêu cầu ghim tọa độ trước khi lưu
        if (!manualCoord) {
            setMapPickerVisible(true);
            return;
        }

        setSubmitting(true);
        try {
            const endpoint = editingId ? "/khach-hang/dia-chi/update" : "/khach-hang/dia-chi/create";
            const payload = editingId
                ? { id: editingId, ...form, toa_do_x: manualCoord.lng, toa_do_y: manualCoord.lat }
                : { ...form, toa_do_x: manualCoord.lng, toa_do_y: manualCoord.lat };
            const res = await apiClient.post(endpoint, payload);

            if (res.data?.status === 1) {
                setShowModal(false);
                setManualCoord(null);
                fetchAddresses();
                showAlert("success", "Thành công", res.data.message || "Đã lưu địa chỉ");
            } else {
                showAlert("error", "Lỗi", res.data?.message || "Có lỗi xảy ra.");
            }
        } catch (error: any) {
            const errors = error?.response?.data?.errors;
            if (errors) {
                const key = Object.keys(errors)[0];
                showAlert("error", "Lỗi", errors[key][0]);
            } else {
                showAlert("error", "Lỗi", error?.response?.data?.message || "Có lỗi xảy ra.");
            }
        } finally { setSubmitting(false); }
    };

    const handleDelete = (id: number) => {
        showAlert("confirm", "Xác nhận", "Bạn muốn xoá địa chỉ này?", [
            { text: "Huỷ", style: "cancel" },
            {
                text: "Xoá", style: "destructive",
                onPress: async () => {
                    try {
                        const res = await apiClient.post("/khach-hang/dia-chi/delete", { id });
                        if (res.data?.status === 1) fetchAddresses();
                        else showAlert("error", "Lỗi", res.data?.message || "Không thể xoá.");
                    } catch { showAlert("error", "Lỗi", "Không thể xoá địa chỉ."); }
                },
            },
        ]);
    };

    // ── Filtered lists ──────────────────────────────────
    const filteredProvinces = tinhThanhs.filter(t =>
        t.ten_tinh_thanh.toLowerCase().includes(provinceSearch.toLowerCase())
    );
    const filteredDistricts = quanHuyens.filter(q =>
        q.ten_quan_huyen.toLowerCase().includes(districtSearch.toLowerCase())
    );

    // ── Render card ──────────────────────────────────────
    const renderItem = ({ item }: { item: DiaChi }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                    <Ionicons name="person-circle" size={20} color={PRIMARY} />
                    <Text style={styles.cardName}>{item.ten_nguoi_nhan}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                        <Ionicons name="create-outline" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color={MUTED} />
                <Text style={styles.infoText}>{item.so_dien_thoai}</Text>
            </View>
            <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color={MUTED} />
                <Text style={styles.infoText} numberOfLines={2}>
                    {[item.dia_chi, item.ten_quan_huyen, item.ten_tinh_thanh].filter(Boolean).join(", ")}
                </Text>
            </View>
            {/* Indicator tọa độ */}
            <View style={styles.coordBadge}>
                <Ionicons
                    name={item.toa_do_x && item.toa_do_y ? "pin" : "warning-outline"}
                    size={12}
                    color={item.toa_do_x && item.toa_do_y ? "#10B981" : "#F59E0B"}
                />
                <Text style={[
                    styles.coordBadgeText,
                    { color: item.toa_do_x && item.toa_do_y ? "#10B981" : "#F59E0B" }
                ]}>
                    {item.toa_do_x && item.toa_do_y ? "Đã có tọa độ bản đồ" : "Chưa có tọa độ — cần chỉnh sửa để ghim"}
                </Text>
            </View>
        </View>
    );

    // ── Picker Modal helper ──────────────────────────────
    const PickerModal = ({
        visible, title, data, selectedId, search, onSearch, onSelect, onClose, loading: isLoading,
    }: {
        visible: boolean; title: string;
        data: { id: number; label: string }[];
        selectedId?: number; search: string;
        onSearch: (v: string) => void;
        onSelect: (item: { id: number; label: string }) => void;
        onClose: () => void; loading?: boolean;
    }) => (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.pickerBox}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={MUTED} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchRow}>
                        <Ionicons name="search-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                        <TextInput style={styles.textInput} value={search} onChangeText={onSearch}
                            placeholder={`Tìm ${title.toLowerCase()}...`} placeholderTextColor="#94A3B8" autoFocus />
                    </View>
                    {isLoading ? (
                        <ActivityIndicator color={PRIMARY} style={{ marginTop: hp("5%") }} />
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={(item) => item.id.toString()}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.pickerItem, selectedId === item.id && styles.pickerItemSelected]}
                                    onPress={() => { onSelect(item); onClose(); }}
                                >
                                    <Text style={[styles.pickerItemText, selectedId === item.id && { color: PRIMARY, fontWeight: "700" }]}>
                                        {item.label}
                                    </Text>
                                    {selectedId === item.id && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={{ textAlign: "center", color: MUTED, marginTop: hp("5%") }}>Không tìm thấy kết quả</Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );

    // ── Main render ──────────────────────────────────────
    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor={PRIMARY} barStyle="light-content" />

            <View style={styles.headerBg}>
                <SafeAreaView edges={["top"]} style={styles.safeArea}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Địa chỉ nhận hàng</Text>
                        <TouchableOpacity onPress={openAddModal} style={styles.addIconBtn}>
                            <Ionicons name="add" size={28} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : addresses.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="location-outline" size={72} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>Chưa có địa chỉ nào</Text>
                    <Text style={styles.emptySubtitle}>Thêm địa chỉ nhận hàng để đặt đồ nhanh hơn</Text>
                    <TouchableOpacity style={styles.addFirstBtn} onPress={openAddModal}>
                        <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                        <Text style={styles.addFirstBtnText}>Thêm địa chỉ mới</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={addresses}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />}
                    ListFooterComponent={
                        <TouchableOpacity style={styles.addMoreBtn} onPress={openAddModal}>
                            <Ionicons name="add-circle-outline" size={22} color={PRIMARY} />
                            <Text style={styles.addMoreText}>Thêm địa chỉ mới</Text>
                        </TouchableOpacity>
                    }
                />
            )}

            {/* ADD / EDIT MODAL */}
            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingId ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={MUTED} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: hp("8%") }}>
                            {/* Tên người nhận */}
                            <Text style={styles.fieldLabel}>Tên người nhận *</Text>
                            <View style={styles.fieldRow}>
                                <Ionicons name="person-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                                <TextInput style={styles.textInput} value={form.ten_nguoi_nhan}
                                    onChangeText={(v) => setForm({ ...form, ten_nguoi_nhan: v })}
                                    placeholder="Nguyễn Văn A" placeholderTextColor="#94A3B8" />
                            </View>

                            {/* SĐT */}
                            <Text style={styles.fieldLabel}>Số điện thoại *</Text>
                            <View style={styles.fieldRow}>
                                <Ionicons name="call-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                                <TextInput style={styles.textInput} value={form.so_dien_thoai}
                                    onChangeText={(v) => setForm({ ...form, so_dien_thoai: v })}
                                    placeholder="0912345678" placeholderTextColor="#94A3B8"
                                    keyboardType="phone-pad" maxLength={10} />
                            </View>

                            {/* Tỉnh / Thành phố */}
                            <Text style={styles.fieldLabel}>Tỉnh / Thành phố *</Text>
                            <TouchableOpacity
                                style={[styles.fieldRow, { justifyContent: "space-between" }]}
                                onPress={() => { setProvinceSearch(""); setShowProvincePicker(true); }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                    <Ionicons name="business-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                                    <Text style={[styles.textInput, !selectedProvince && { color: "#94A3B8" }]}>
                                        {selectedProvince ? selectedProvince.ten_tinh_thanh : "Chọn tỉnh / thành phố"}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={18} color={MUTED} />
                            </TouchableOpacity>

                            {/* Quận / Huyện */}
                            <Text style={styles.fieldLabel}>Quận / Huyện *</Text>
                            <TouchableOpacity
                                style={[styles.fieldRow, { justifyContent: "space-between" }, !selectedProvince && { opacity: 0.5 }]}
                                onPress={() => {
                                    if (!selectedProvince) { showAlert("warning", "Chú ý", "Vui lòng chọn Tỉnh / Thành phố trước."); return; }
                                    setDistrictSearch(""); setShowDistrictPicker(true);
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                    <Ionicons name="map-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                                    <Text style={[styles.textInput, !selectedDistrict && { color: "#94A3B8" }]}>
                                        {selectedDistrict ? selectedDistrict.ten_quan_huyen : "Chọn quận / huyện"}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={18} color={MUTED} />
                            </TouchableOpacity>

                            {/* Địa chỉ cụ thể */}
                            <Text style={styles.fieldLabel}>Địa chỉ cụ thể * (tối thiểu 10 ký tự)</Text>
                            <View style={styles.fieldRow}>
                                <Ionicons name="home-outline" size={18} color={MUTED} style={styles.fieldIcon} />
                                <TextInput style={styles.textInput} value={form.dia_chi}
                                    onChangeText={(v) => { setForm({ ...form, dia_chi: v }); setManualCoord(null); }}
                                    placeholder="Số nhà, tên đường..." placeholderTextColor="#94A3B8" maxLength={255} />
                            </View>

                            {/* Coord action buttons */}
                            {manualCoord && (
                                <View style={styles.coordConfirmedBanner}>
                                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                    <Text style={styles.coordConfirmedText}>✅ Đã ghim tọa độ chính xác</Text>
                                    <TouchableOpacity onPress={() => setManualCoord(null)}>
                                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            )}
                            <View style={styles.coordBtnRow}>
                                {/* Map Picker button */}
                                <TouchableOpacity
                                    style={styles.mapPickBtn}
                                    onPress={() => setMapPickerVisible(true)}
                                >
                                    <Ionicons name="map-outline" size={16} color="#FFF" />
                                    <Text style={styles.coordBtnText}>🗺️ Ghim trên bản đồ</Text>
                                </TouchableOpacity>
                                {/* GPS button */}
                                <TouchableOpacity
                                    style={styles.gpsSmallBtn}
                                    onPress={handleGetGPS}
                                    disabled={gettingGPS}
                                >
                                    {gettingGPS ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Ionicons name="locate-outline" size={16} color="#FFF" />
                                    )}
                                    <Text style={styles.coordBtnText}>{gettingGPS ? "GPS..." : "📍 GPS"}</Text>
                                </TouchableOpacity>
                            </View>
                            {!manualCoord && (
                                <Text style={styles.gpsHint}>⚠️ Bắt buộc ghim vị trí trước khi lưu. Dùng "Ghim bản đồ" để tìm từ xa, hoặc "GPS" khi đứng tại địa chỉ.</Text>
                            )}

                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && { opacity: 0.6 }, !manualCoord && { backgroundColor: "#94A3B8" }]}
                                onPress={handleSubmit} disabled={submitting}
                            >
                                <Text style={styles.submitBtnText}>
                                    {submitting ? "Đang lưu..." : !manualCoord ? "📍 Ghim vị trí để tiếp tục" : editingId ? "Cập nhật" : "Lưu địa chỉ"}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* PROVINCE PICKER */}
            <PickerModal
                visible={showProvincePicker}
                title="Tỉnh / Thành phố"
                data={filteredProvinces.map(t => ({ id: t.id, label: t.ten_tinh_thanh }))}
                selectedId={selectedProvince?.id}
                search={provinceSearch}
                onSearch={setProvinceSearch}
                onSelect={(item) => {
                    const province = tinhThanhs.find(t => t.id === item.id)!;
                    setSelectedProvince(province);
                    fetchQuanHuyenByTinh(province.id);
                }}
                onClose={() => setShowProvincePicker(false)}
            />

            {/* DISTRICT PICKER */}
            <PickerModal
                visible={showDistrictPicker}
                title="Quận / Huyện"
                data={filteredDistricts.map(q => ({ id: q.id, label: q.ten_quan_huyen }))}
                selectedId={selectedDistrict?.id}
                search={districtSearch}
                onSearch={setDistrictSearch}
                onSelect={(item) => {
                    const district = quanHuyens.find(q => q.id === item.id)!;
                    setSelectedDistrict(district);
                    setForm(prev => ({ ...prev, id_quan_huyen: district.id }));
                }}
                onClose={() => setShowDistrictPicker(false)}
                loading={loadingDistricts}
            />

            {/* MAP PICKER */}
            <LocationPickerModal
                visible={mapPickerVisible}
                initialAddress={
                    [form.dia_chi, selectedDistrict?.ten_quan_huyen, selectedProvince?.ten_tinh_thanh]
                        .filter(Boolean).join(", ")
                }
                onConfirm={(coord, _addr) => {
                    setManualCoord(coord);
                    setMapPickerVisible(false);
                }}
                onClose={() => setMapPickerVisible(false)}
            />

            {/* CUSTOM ALERT */}
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
    container: { flex: 1, backgroundColor: BG },
    headerBg: {
        backgroundColor: PRIMARY,
        paddingBottom: hp("2%"),
        borderBottomLeftRadius: wp("6%"),
        borderBottomRightRadius: wp("6%"),
    },
    safeArea: { paddingTop: Platform.OS === "android" ? hp("2%") : 0 },
    headerRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: wp("4%"), marginTop: hp("1%"),
    },
    backBtn: { padding: wp("1%") },
    addIconBtn: { padding: wp("1%") },
    headerTitle: { fontSize: wp("5%"), fontWeight: "700", color: "#FFF" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: hp("10%") },
    emptyTitle: { fontSize: wp("4.8%"), fontWeight: "700", color: DARK, marginTop: hp("2%") },
    emptySubtitle: { fontSize: wp("3.5%"), color: MUTED, marginTop: hp("1%"), textAlign: "center", paddingHorizontal: wp("10%") },
    addFirstBtn: {
        marginTop: hp("3%"), flexDirection: "row", alignItems: "center",
        backgroundColor: PRIMARY, paddingHorizontal: wp("6%"), paddingVertical: hp("1.5%"),
        borderRadius: wp("6%"), gap: 8,
    },
    addFirstBtnText: { color: "#FFF", fontWeight: "700", fontSize: wp("4%") },
    listContent: { paddingHorizontal: wp("5%"), paddingTop: hp("3%"), paddingBottom: hp("5%") },
    card: {
        backgroundColor: "#FFF", borderRadius: wp("4%"), padding: wp("4%"), marginBottom: hp("2%"),
        elevation: 3, shadowColor: "#000", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp("1%") },
    nameRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 6 },
    cardName: { fontSize: wp("4%"), fontWeight: "700", color: DARK },
    actions: { flexDirection: "row", gap: 4 },
    actionBtn: { padding: 6 },
    infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: hp("0.5%") },
    infoText: { flex: 1, fontSize: wp("3.5%"), color: MUTED, lineHeight: 20 },
    addMoreBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        paddingVertical: hp("2%"), borderWidth: 1.5, borderColor: PRIMARY,
        borderRadius: wp("4%"), borderStyle: "dashed", marginTop: hp("1%"),
    },
    addMoreText: { color: PRIMARY, fontWeight: "700", fontSize: wp("3.8%") },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalBox: {
        backgroundColor: "#FFF", borderTopLeftRadius: wp("6%"), borderTopRightRadius: wp("6%"),
        paddingHorizontal: wp("5%"), paddingTop: hp("2.5%"), maxHeight: "92%",
    },
    pickerBox: {
        backgroundColor: "#FFF", borderTopLeftRadius: wp("6%"), borderTopRightRadius: wp("6%"),
        paddingHorizontal: wp("5%"), paddingTop: hp("2.5%"), paddingBottom: hp("5%"), height: "80%",
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp("2%") },
    modalTitle: { fontSize: wp("4.5%"), fontWeight: "700", color: DARK },
    fieldLabel: { fontSize: wp("3.2%"), fontWeight: "600", color: MUTED, marginBottom: hp("0.8%"), marginTop: hp("1.8%") },
    fieldRow: {
        flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9",
        borderRadius: wp("3%"), paddingHorizontal: wp("3.5%"), height: hp("6%"),
        borderWidth: 1, borderColor: "#E2E8F0",
    },
    searchRow: {
        flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9",
        borderRadius: wp("3%"), paddingHorizontal: wp("3.5%"), height: hp("6%"),
        borderWidth: 1, borderColor: "#E2E8F0", marginBottom: hp("1.5%"),
    },
    fieldIcon: { marginRight: wp("2%") },
    textInput: { flex: 1, fontSize: wp("3.8%"), color: DARK },
    submitBtn: {
        backgroundColor: PRIMARY, borderRadius: wp("3%"), paddingVertical: hp("1.8%"),
        alignItems: "center", marginTop: hp("3%"), marginBottom: hp("1%"),
    },
    submitBtnText: { color: "#FFF", fontSize: wp("4%"), fontWeight: "700" },
    gpsHint: {
        fontSize: wp("3.2%"), color: "#F59E0B", marginTop: 6, marginBottom: 4,
        fontStyle: "italic", paddingHorizontal: 2,
    },
    coordBtnRow: {
        flexDirection: "row", gap: 8, marginTop: hp("1.5%"),
    },
    mapPickBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, backgroundColor: PRIMARY, borderRadius: wp("2.5%"),
        paddingVertical: hp("1.4%"),
    },
    gpsSmallBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, backgroundColor: "#3B82F6", borderRadius: wp("2.5%"),
        paddingVertical: hp("1.4%"), paddingHorizontal: wp("3%"),
    },
    coordBtnText: { color: "#FFF", fontSize: wp("3.4%"), fontWeight: "700" },
    coordConfirmedBanner: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#ECFDF5", borderRadius: wp("2.5%"),
        padding: 8, marginTop: hp("1.5%"),
        borderWidth: 1, borderColor: "#6EE7B7",
    },
    coordConfirmedText: { flex: 1, fontSize: wp("3.4%"), color: "#065F46", fontWeight: "600" },
    coordBadge: {
        flexDirection: "row", alignItems: "center", gap: 4, marginTop: hp("0.8%"),
    },
    coordBadgeText: { fontSize: wp("3%"), fontWeight: "600" },
    pickerItem: {
        flexDirection: "row", alignItems: "center", paddingVertical: hp("1.5%"),
        paddingHorizontal: wp("2%"), borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
    },
    pickerItemSelected: { backgroundColor: "#FFF5F5" },
    pickerItemText: { flex: 1, fontSize: wp("3.8%"), color: DARK },
});

export default AddressBook;
