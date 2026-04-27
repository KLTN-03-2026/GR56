import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
// @ts-ignore
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { payosAPI } from '../../genaral/api';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
type PaymentStatus = 'idle' | 'success' | 'failed' | 'processing';

// ═══════════════════════════════════════════
// Screen
// ═══════════════════════════════════════════
const PayOSPayment = ({ navigation, route }: any) => {
  const { id_don_hang } = route.params as { id_don_hang: number };

  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');

  // Đảm bảo chỉ xử lý kết quả 1 lần
  const handledRef = useRef(false);

  useEffect(() => {
    fetchLink();
  }, []);

  // ── Lấy checkout URL từ backend ──
  const fetchLink = async () => {
    try {
      setInitialLoading(true);
      const res = await payosAPI.taoLink(id_don_hang);
      if (res.data?.status) {
        if (res.data.is_paid) {
          // Đơn đã được thanh toán trước đó (webhook đã chạy)
          setPaymentStatus('success');
        } else if (res.data.checkout_url) {
          setCheckoutUrl(res.data.checkout_url);
        } else {
          Alert.alert('Lỗi', 'Không thể lấy link thanh toán');
          navigation.goBack();
        }
      } else {
        Alert.alert('Lỗi', res.data?.message || 'Không thể tạo link thanh toán');
        navigation.goBack();
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
  };

  // ── Xác nhận thanh toán qua S2S ──
  const confirmPayment = useCallback(
    async (isSuccess: boolean) => {
      if (!isSuccess) {
        setPaymentStatus('failed');
        return;
      }
      if (confirming) return;
      try {
        setConfirming(true);
        const res = await payosAPI.xacNhanS2S(id_don_hang);
        setPaymentStatus(res.data?.status ? 'success' : 'processing');
      } catch {
        setPaymentStatus('processing');
      } finally {
        setConfirming(false);
      }
    },
    [id_don_hang, confirming],
  );

  // ── Phát hiện kết quả qua URL redirect ──
  const handleUrlChange = useCallback(
    (url: string) => {
      if (!url || handledRef.current) return;
      // PayOS trả về: ...?status=PAID&cancel=false&orderCode=...
      //              ...?status=CANCELLED&cancel=true&orderCode=...
      if (
        url.includes('status=PAID') ||
        (url.includes('cancel=false') && url.includes('orderCode'))
      ) {
        handledRef.current = true;
        confirmPayment(true);
      } else if (
        url.includes('status=CANCELLED') ||
        url.includes('cancel=true')
      ) {
        handledRef.current = true;
        confirmPayment(false);
      }
    },
    [confirmPayment],
  );

  // ── Nút đóng / thoát ──
  const handleClose = () => {
    if (paymentStatus === 'success') {
      navigation.navigate('MainTabs', { screen: 'Orders' });
      return;
    }
    Alert.alert(
      'Thoát thanh toán',
      'Đơn hàng vẫn đang chờ thanh toán. Bạn có thể thanh toán lại từ trang Đơn hàng.',
      [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Thoát',
          style: 'destructive',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Orders' }),
        },
      ],
    );
  };

  // ════════════════════════ Render states ════════════════════════

  if (initialLoading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#EE4D2D" />
        <Text style={s.loadingText}>Đang tạo liên kết thanh toán...</Text>
      </SafeAreaView>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <SafeAreaView style={s.resultScreen}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        <Text style={s.resultTitle}>Thanh toán thành công!</Text>
        <Text style={s.resultSub}>Đơn hàng của bạn đã được xác nhận.</Text>
        <TouchableOpacity
          style={s.resultBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Orders' })}
        >
          <Text style={s.resultBtnText}>Xem đơn hàng</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <SafeAreaView style={s.resultScreen}>
        <Ionicons name="close-circle" size={80} color="#EF4444" />
        <Text style={s.resultTitle}>Thanh toán đã huỷ</Text>
        <Text style={s.resultSub}>Bạn có thể thử lại từ trang Đơn hàng.</Text>
        <TouchableOpacity
          style={s.resultBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Orders' })}
        >
          <Text style={s.resultBtnText}>Về trang đơn hàng</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <SafeAreaView style={s.resultScreen}>
        <Ionicons name="time-outline" size={80} color="#F59E0B" />
        <Text style={s.resultTitle}>Đang xử lý thanh toán</Text>
        <Text style={s.resultSub}>
          Hệ thống đang xác nhận giao dịch của bạn.{'\n'}
          Vui lòng kiểm tra lại trong trang Đơn hàng.
        </Text>
        <TouchableOpacity
          style={[s.resultBtn, confirming && s.resultBtnDisabled]}
          onPress={() => {
            handledRef.current = false;
            confirmPayment(true);
          }}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.resultBtnText}>Thử lại xác nhận</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.resultBtn, s.resultBtnOutline, { marginTop: hp('1.5%') }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Orders' })}
        >
          <Text style={[s.resultBtnText, { color: '#EE4D2D' }]}>
            Về trang đơn hàng
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ════════════════════════ WebView ════════════════════════
  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Thanh toán PayOS</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* WebView */}
      <View style={s.webViewWrap}>
        {webViewLoading && (
          <View style={s.webViewSpinner}>
            <ActivityIndicator size="large" color="#EE4D2D" />
            <Text style={s.loadingText}>Đang tải trang thanh toán...</Text>
          </View>
        )}
        {!!checkoutUrl && (
          <WebView
            source={{ uri: checkoutUrl }}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            onNavigationStateChange={navState => handleUrlChange(navState.url)}
            onShouldStartLoadWithRequest={req => {
              handleUrlChange(req.url);
              return true;
            }}
            style={s.webView}
          />
        )}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        {confirming ? (
          <View style={s.footerLoading}>
            <ActivityIndicator size="small" color="#EE4D2D" />
            <Text style={s.footerLoadingText}>Đang xác nhận thanh toán...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => {
              if (handledRef.current) return;
              handledRef.current = true;
              confirmPayment(true);
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={s.doneBtnText}>Tôi đã thanh toán xong</Text>
          </TouchableOpacity>
        )}
        <Text style={s.footerNote}>
          Sau khi chuyển khoản thành công trên app ngân hàng, nhấn xác nhận bên trên
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  closeBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: wp('4.2%'), fontWeight: '700', color: '#0F172A' },

  // WebView
  webViewWrap: { flex: 1 },
  webView: { flex: 1 },
  webViewSpinner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },

  // Footer
  footer: {
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('2%'),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EE4D2D',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('8%'),
    borderRadius: wp('3%'),
    gap: 6,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: wp('3.5%') },
  footerNote: {
    marginTop: hp('1%'),
    fontSize: wp('2.8%'),
    color: '#94A3B8',
    textAlign: 'center',
  },
  footerLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLoadingText: { color: '#EE4D2D', fontSize: wp('3.2%') },

  // Result screens
  resultScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: wp('8%'),
  },
  resultTitle: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#0F172A',
    marginTop: hp('2%'),
    textAlign: 'center',
  },
  resultSub: {
    fontSize: wp('3.5%'),
    color: '#64748B',
    marginTop: hp('1%'),
    textAlign: 'center',
    lineHeight: 22,
  },
  resultBtn: {
    marginTop: hp('3%'),
    backgroundColor: '#EE4D2D',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('10%'),
    borderRadius: wp('3%'),
  },
  resultBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EE4D2D',
  },
  resultBtnDisabled: { opacity: 0.6 },
  resultBtnText: { color: '#fff', fontWeight: '700', fontSize: wp('3.5%') },
});

export default PayOSPayment;
