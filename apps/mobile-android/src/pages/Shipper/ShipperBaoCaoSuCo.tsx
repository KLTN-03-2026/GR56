import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import apiClient from '../../genaral/api';

const PRIMARY = '#EE4D2D';
const BG = '#F5F6F8';
const TEXT_DARK = '#1E293B';
const TEXT_MUTED = '#64748B';

const LOAI_SU_CO = [
    { key: 'app',     label: 'Lỗi ứng dụng',     icon: 'phone-portrait-outline' },
    { key: 'order',   label: 'Vấn đề đơn hàng',  icon: 'cube-outline' },
    { key: 'payment', label: 'Sự cố thanh toán',  icon: 'card-outline' },
    { key: 'other',   label: 'Sự cố khác',        icon: 'alert-circle-outline' },
];

const ShipperBaoCaoSuCo = ({ navigation }: any) => {
    const [tieu_de, setTieuDe]         = useState('');
    const [noi_dung, setNoiDung]       = useState('');
    const [id_don_hang, setIdDonHang]  = useState('');
    const [loai, setLoai]              = useState('');
    const [image, setImage]            = useState<any>(null);
    const [submitting, setSubmitting]  = useState(false);

    const chonAnh = () => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
            if (res.assets && res.assets[0]) {
                const asset = res.assets[0];
                if ((asset.fileSize ?? 0) > 10 * 1024 * 1024) {
                    Alert.alert('Lỗi', 'Kích thước ảnh không được vượt quá 10MB');
                    return;
                }
                setImage(asset);
            }
        });
    };

    const handleSubmit = async () => {
        if (!tieu_de.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề sự cố.');
        if (!noi_dung.trim()) return Alert.alert('Lỗi', 'Vui lòng mô tả chi tiết sự cố.');

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('tieu_de', tieu_de.trim());
            formData.append('noi_dung', noi_dung.trim());
            if (id_don_hang) formData.append('id_don_hang', id_don_hang);
            if (image) {
                formData.append('hinh_anh', {
                    uri: image.uri,
                    type: image.type || 'image/jpeg',
                    name: image.fileName || 'bao_cao.jpg',
                } as any);
            }

            const res = await apiClient.post('/shipper/reports/create', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data?.status) {
                Alert.alert('Thành công', res.data.message || 'Báo cáo đã được gửi!', [
                    { text: 'OK', onPress: () => { setTieuDe(''); setNoiDung(''); setIdDonHang(''); setLoai(''); setImage(null); } },
                ]);
            } else {
                Alert.alert('Thất bại', res.data?.message || 'Không thể gửi báo cáo.');
            }
        } catch (e: any) {
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại!');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Báo Cáo Sự Cố</Text>
                        <View style={{ width: 38 }} />
                    </View>

                    {/* Hero */}
                    <View style={styles.heroBox}>
                        <View style={styles.heroIcon}>
                            <Ionicons name="warning-outline" size={30} color="#FFF" />
                        </View>
                        <Text style={styles.heroTitle}>Hỗ trợ tài xế FoodBee</Text>
                        <Text style={styles.heroSub}>Chúng tôi sẽ phản hồi trong vòng 24h</Text>
                    </View>
                </SafeAreaView>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: wp('4%'), paddingBottom: hp('10%') }} showsVerticalScrollIndicator={false}>

                    {/* Loại sự cố chips */}
                    <Text style={styles.label}>Loại sự cố</Text>
                    <View style={styles.loaiRow}>
                        {LOAI_SU_CO.map(l => (
                            <TouchableOpacity key={l.key} onPress={() => setLoai(l.key)}
                                style={[styles.loaiChip, loai === l.key && styles.loaiChipActive]}>
                                <Ionicons name={l.icon as any} size={14} color={loai === l.key ? '#FFF' : TEXT_MUTED} />
                                <Text style={[styles.loaiText, loai === l.key && styles.loaiTextActive]}>{l.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Tiêu đề */}
                    <Text style={styles.label}>Tiêu đề sự cố <Text style={{ color: PRIMARY }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ví dụ: Lỗi ứng dụng, Tai nạn, Vấn đề đơn hàng..."
                        placeholderTextColor="#94A3B8"
                        value={tieu_de}
                        onChangeText={setTieuDe}
                    />

                    {/* Mã đơn hàng */}
                    <Text style={styles.label}>Mã đơn hàng (Nếu có)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập ID đơn hàng liên quan"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={id_don_hang}
                        onChangeText={setIdDonHang}
                    />

                    {/* Nội dung */}
                    <Text style={styles.label}>Chi tiết nội dung <Text style={{ color: PRIMARY }}>*</Text></Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        placeholder="Mô tả chi tiết sự cố bạn đang gặp phải..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        value={noi_dung}
                        onChangeText={setNoiDung}
                    />

                    {/* Hình ảnh */}
                    <Text style={styles.label}>Hình ảnh đính kèm (Nếu có)</Text>
                    {image ? (
                        <View style={styles.imgPreviewWrap}>
                            <Image source={{ uri: image.uri }} style={styles.imgPreview} />
                            <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImage(null)}>
                                <Ionicons name="close" size={14} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.uploadBox} onPress={chonAnh} activeOpacity={0.7}>
                            <Ionicons name="image-outline" size={36} color="#CBD5E1" />
                            <Text style={styles.uploadText}>Bấm để chọn ảnh</Text>
                            <Text style={styles.uploadSub}>Tối đa 10MB</Text>
                        </TouchableOpacity>
                    )}

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && { opacity: 0.65 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        {submitting
                            ? <ActivityIndicator color="#FFF" />
                            : <><Ionicons name="send-outline" size={18} color="#FFF" /><Text style={styles.submitText}>  Gửi Báo Cáo</Text></>
                        }
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    header: { backgroundColor: PRIMARY, paddingBottom: hp('3%') },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: wp('4%'), paddingTop: hp('1%') },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: wp('4.5%'), fontWeight: '700', color: '#FFF' },
    heroBox: { alignItems: 'center', paddingBottom: hp('2%'), paddingTop: hp('1.5%') },
    heroIcon: { width: wp('16%'), height: wp('16%'), borderRadius: wp('4%'), backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: hp('1.5%') },
    heroTitle: { fontSize: wp('5%'), fontWeight: '800', color: '#FFF', marginBottom: 4 },
    heroSub: { fontSize: wp('3%'), color: 'rgba(255,255,255,0.75)' },
    label: { fontSize: wp('3.5%'), fontWeight: '700', color: TEXT_DARK, marginBottom: hp('0.8%'), marginTop: hp('2%') },
    loaiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    loaiChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: wp('3%'), paddingVertical: hp('0.9%'), borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
    loaiChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
    loaiText: { fontSize: wp('3%'), fontWeight: '600', color: TEXT_MUTED },
    loaiTextActive: { color: '#FFF' },
    input: { backgroundColor: '#FFF', borderRadius: wp('3%'), borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'), fontSize: wp('3.8%'), color: TEXT_DARK },
    textarea: { height: hp('14%'), paddingTop: hp('1.5%') },
    imgPreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
    imgPreview: { width: wp('35%'), height: wp('35%'), borderRadius: wp('3%'), borderWidth: 1, borderColor: '#E2E8F0' },
    removeImgBtn: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
    uploadBox: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: wp('3%'), height: hp('14%'), justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#FAFAFA' },
    uploadText: { fontSize: wp('3.5%'), color: TEXT_MUTED, fontWeight: '500' },
    uploadSub: { fontSize: wp('2.8%'), color: '#CBD5E1' },
    submitBtn: { marginTop: hp('3%'), backgroundColor: PRIMARY, borderRadius: wp('3%'), paddingVertical: hp('1.8%'), flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: PRIMARY, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
    submitText: { color: '#FFF', fontSize: wp('4%'), fontWeight: '800' },
});

export default ShipperBaoCaoSuCo;
