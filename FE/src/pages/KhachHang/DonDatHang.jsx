import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

/* ─── Helpers ─── */
const isOpenNow = (moVao, dongVao) => {
  if (!moVao || !dongVao) return false;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const cur = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return moVao <= dongVao ? (cur >= moVao && cur <= dongVao) : (cur >= moVao || cur <= dongVao);
};

const Stars = ({ value }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(s => (
      <i key={s} className={`fa-star text-sm ${s <= Math.round(value) ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-300'}`} />
    ))}
  </div>
);

/* ─── Topping Modal ─── */
function ToppingModal({ mon, toppings, onClose, onConfirm }) {
  const [selected, setSelected] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);

  const sizes = mon?.sizes || [];
  const hasSizes = sizes.length > 0;

  const toggleTop = t => setSelected(s => s.some(x => x.id === t.id) ? s.filter(x => x.id !== t.id) : [...s, t]);

  const handleConfirm = () => {
    if (hasSizes && !selectedSize) {
      toast.error('Vui lòng chọn size!');
      return;
    }
    onConfirm(selected, selectedSize);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 bg-yellow-400 rounded-t-3xl flex items-center justify-between">
          <h3 className="font-bold text-yellow-900"><i className="fa-solid fa-plus-circle mr-2" />Tùy chọn cho "{mon?.ten_mon_an}"</h3>
          <button onClick={onClose} className="text-yellow-900/60 hover:text-yellow-900"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {/* SIZES */}
          {hasSizes && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-800">Chọn Size</h4>
                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Bắt buộc</span>
              </div>
              <div className="space-y-2">
                {sizes.map((s, idx) => (
                  <label key={idx} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedSize?.id === s.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="size" className="w-4 h-4 accent-orange-500" checked={selectedSize?.id === s.id} onChange={() => setSelectedSize(s)} />
                      <span className="font-semibold text-sm">Size {s.ten_size}</span>
                    </div>
                    {s.gia_cong_them > 0 && <span className="text-gray-500 text-xs font-bold px-2 py-1 bg-white border border-gray-200 rounded-full">{Number(s.gia_cong_them)?.toLocaleString()}đ</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TOPPINGS */}
          <div>
            <h4 className="font-bold text-gray-800 mb-3">Thêm Topping <span className="text-gray-400 font-normal text-xs">(Không bắt buộc)</span></h4>
            {toppings.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed rounded-xl"><i className="fa-solid fa-info-circle mb-2 block" />Quán này chưa có topping</div>
            ) : (
              <div className="space-y-2">
                {toppings.map((t, i) => (
                  <label key={i} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selected.some(x => x.id === t.id) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 accent-yellow-400" checked={selected.some(x => x.id === t.id)} onChange={() => toggleTop(t)} />
                      <div>
                        <div className="font-semibold text-sm">{t.ten_topping}</div>
                        {t.mo_ta && <div className="text-xs text-gray-400">{t.mo_ta}</div>}
                      </div>
                    </div>
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">+{t.gia?.toLocaleString()}đ</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t flex gap-3 justify-end bg-gray-50 rounded-b-3xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 transition-colors">Bỏ qua</button>
          <button onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl bg-yellow-400 text-yellow-900 font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2">
            <i className="fa-solid fa-cart-plus" />Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Payment Confirm Modal ─── */
function ConfirmModal({ orderData, onClose, onConfirm }) {
  if (!orderData) return null;
  const { idDonHang, listGioHang, tongTien, phiShip, soTienGiamVoucher, tienGiamXu, tongCuoi, diaChi } = orderData;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 p-5 rounded-t-3xl flex items-center justify-between z-10" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
          <h3 className="font-bold text-white text-lg"><i className="fa-solid fa-receipt mr-2" />Chi tiết đơn hàng</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-5">
          {/* Items */}
          <div className="space-y-2 mb-4">
            {listGioHang.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-700">
                  {item.ten_mon_an} {item.ten_size && <span className="font-bold text-gray-500">(Size {item.ten_size})</span>} × {item.so_luong}
                </span>
                <span className="font-semibold">{formatVND(item.thanh_tien)}</span>
              </div>
            ))}
          </div>
          {/* Summary */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Tạm tính</span><span>{formatVND(tongTien)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Phí ship</span><span>{formatVND(phiShip)}</span></div>
            {soTienGiamVoucher > 0 && <div className="flex justify-between text-green-600"><span><i className="fa-solid fa-tag mr-1" />Voucher</span><span>-{formatVND(soTienGiamVoucher)}</span></div>}
            {tienGiamXu > 0 && <div className="flex justify-between text-green-600"><span><i className="fa-solid fa-coins text-yellow-500 mr-1" />Xu</span><span>-{formatVND(tienGiamXu)}</span></div>}
            <div className="flex justify-between items-center p-3 rounded-xl text-white font-bold text-base mt-2" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              <span>Tổng thanh toán</span><span>{formatVND(tongCuoi)}</span>
            </div>
          </div>
          {/* QR */}
          <div className="mt-4 text-center p-4 bg-gray-50 rounded-2xl">
            <img src={`https://img.vietqr.io/image/MB-0394425076-qr_only.png?amount=${tongCuoi}&addInfo=DZ${idDonHang}`}
              alt="QR" className="w-44 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Quét mã để thanh toán</p>
            <h4 className="font-bold text-purple-600 text-lg">Mã Đơn: DZ{idDonHang}</h4>
            <div className="text-2xl font-black text-red-500">{formatVND(tongCuoi)}</div>
          </div>
          {/* Address */}
          {diaChi && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="font-semibold text-sm text-blue-800 mb-1"><i className="fa-solid fa-map-pin mr-2" />Địa chỉ nhận hàng</div>
              <div className="text-sm text-blue-700">{diaChi.dia_chi}</div>
              <div className="text-xs text-blue-500">{diaChi.ten_nguoi_nhan} - {diaChi.so_dien_thoai}</div>
            </div>
          )}
          <button onClick={onConfirm}
            className="w-full mt-4 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors">
            <i className="fa-solid fa-check-circle mr-2" />Hoàn thành
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function DonDatHang() {
  const { id_quan } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();

  const [quanAn, setQuanAn] = useState({});
  const [monAnList, setMonAnList] = useState([]);
  const [gioHang, setGioHang] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [diaChiList, setDiaChiList] = useState([]);
  const [userInfo, setUserInfo] = useState({});
  const [tongTien, setTongTien] = useState(0);
  const [phiShip, setPhiShip] = useState(0);
  const [idDiaChi, setIdDiaChi] = useState('');
  const [activeTab, setActiveTab] = useState('menu');
  const [searchMon, setSearchMon] = useState('');
  const [thongKe, setThongKe] = useState({ total_reviews: 0, average_stars: 0 });
  const [danhGia, setDanhGia] = useState([]);

  // Topping modal
  const [showTopping, setShowTopping] = useState(false);
  const [monDangChon, setMonDangChon] = useState(null);

  // Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [voucherInfo, setVoucherInfo] = useState(null);
  const [soTienGiamVoucher, setSoTienGiamVoucher] = useState(0);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [deXuatVouchers, setDeXuatVouchers] = useState([]);

  // Xu
  const [suDungXu, setSuDungXu] = useState(false);

  // Payment
  const [phuongThuc, setPhuongThuc] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Computed
  const tienQuyDoiXu = useMemo(() => {
    const xu = userInfo?.diem_xu || 0;
    const max = Math.max(0, tongTien + phiShip - soTienGiamVoucher);
    return Math.min(xu, max);
  }, [userInfo, tongTien, phiShip, soTienGiamVoucher]);

  const tienGiamXu = suDungXu ? tienQuyDoiXu : 0;
  const tongCuoi = Math.max(0, tongTien + phiShip - soTienGiamVoucher - tienGiamXu);

  const monAnFiltered = useMemo(() =>
    monAnList.filter(m => m.ten_mon_an?.toLowerCase().includes(searchMon.toLowerCase())),
    [monAnList, searchMon]
  );

  useEffect(() => {
    loadData();
    loadUserInfo();
    loadThongKe();
    loadDanhGia();
  }, [id_quan]);

  // Re-fetch voucher suggestions whenever the total changes
  useEffect(() => {
    if (tongTien > 0 && !voucherApplied) {
      loadDeXuatVoucher(tongTien);
    }
  }, [tongTien]);


  const loadData = async () => {
    try {
      const res = await api.get(`/api/khach-hang/don-dat-hang/${id_quan}`);
      if (res.data.status) {
        setQuanAn(res.data.quan_an || {});
        setMonAnList(res.data.mon_an || []);
        setToppings(res.data.toppings || []);
        setGioHang(res.data.gio_hang || []);
        setTongTien(res.data.tong_tien || 0);
        setDiaChiList(res.data.dia_chi_khach || []);
        // Removed auto-selection of first address to force user choice
        setIdDiaChi('');
        setPhiShip(0);

        // Nếu không có địa chỉ → chuyển sang Profile để thêm, rồi tự quay về
        if ((res.data.dia_chi_khach || []).length === 0) {
          const returnUrl = location.pathname;
          toast('Bạn chưa có địa chỉ nhận hàng. Vui lòng thêm địa chỉ!', { icon: '📍', duration: 3000 });
          navigate(`/khach-hang/profile?tab=address&returnUrl=${encodeURIComponent(returnUrl)}`);
          return;
        }

        // Kiểm tra voucher khi load lại data
        if (voucherApplied && voucherInfo) {
          if ((res.data.tong_tien || 0) < (voucherInfo.don_hang_toi_thieu || 0)) {
            removeVoucher();
            toast.error(`Voucher "${voucherInfo.ma_code}" đã bị gỡ do đơn hàng không đủ ${formatVND(voucherInfo.don_hang_toi_thieu)}`);
          }
        }
      } else {
        navigate('/');
      }
    } catch { toast.error('Không thể tải thông tin quán!'); }
  };

  const loadUserInfo = async () => {
    try {
      const res = await api.get('/api/khach-hang/data-login');
      if (res.data.status) setUserInfo(res.data.data);
    } catch {}
  };

  const loadThongKe = async () => {
    try {
      const res = await api.get(`/api/khach-hang/quan-an/thong-ke-danh-gia/${id_quan}`);
      if (res.data.status) setThongKe(res.data.data);
    } catch {}
  };

  const loadDanhGia = async () => {
    try {
      const res = await api.get(`/api/khach-hang/quan-an/danh-gia/${id_quan}`);
      if (res.data.status) setDanhGia(res.data.data || []);
    } catch {}
  };

  const loadDeXuatVoucher = async (tong) => {
    if (tong <= 0 || voucherApplied) return;
    try {
      const res = await api.get('/api/khach-hang/voucher/de-xuat', { params: { id_quan_an: id_quan, tong_tien: tong } });
      if (res.data.status) setDeXuatVouchers(res.data.data || []);
    } catch {}
  };

  const openToppingModal = (mon) => { setMonDangChon(mon); setShowTopping(true); };

  const themGioHang = async (idMon, ghiChu = '', donGia = null, selectedSize = null) => {
    try {
      const payload = { id: idMon, ghi_chu: ghiChu, don_gia: donGia };
      if (selectedSize) {
        payload.id_size = selectedSize.id;
        payload.ten_size = selectedSize.ten_size;
      }
      const res = await api.post('/api/khach-hang/don-dat-hang/create', payload);
      if (res.data.status) {
        toast.success(res.data.message);
        const fresh = await api.get(`/api/khach-hang/don-dat-hang/${id_quan}`);
        if (fresh.data.status) {
          setGioHang(fresh.data.gio_hang || []);
          setTongTien(fresh.data.tong_tien || 0);
          loadDeXuatVoucher(fresh.data.tong_tien || 0);
          // Phát tín hiệu cập nhật Navbar
          window.dispatchEvent(new CustomEvent('cart-updated'));
          // Kiểm tra xem voucher có còn hợp lệ không nếu đã áp dụng
          if (voucherApplied && voucherInfo) {
            if (fresh.data.tong_tien < (voucherInfo.don_hang_toi_thieu || 0)) {
              removeVoucher();
              toast.error(`Voucher đã bị hủy vì đơn hàng dưới ${formatVND(voucherInfo.don_hang_toi_thieu)}`);
            }
          }
        }
      } else toast.error(res.data.message);
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
      else toast.error('Lỗi thêm giỏ hàng!');
    }
  };

  const xacNhanTopping = (sel, selectedSize) => {
    const tongGia = sel.reduce((t, item) => t + item.gia, 0);
    const donGiaMon = (monDangChon.gia_khuyen_mai > 0 ? monDangChon.gia_khuyen_mai : monDangChon.gia_ban);
    
    // Giá cơ bản = giá món + phụ thu size (nếu có chọn size)
    const basePrice = selectedSize ? donGiaMon + Number(selectedSize.gia_cong_them) : donGiaMon;
    
    // Lưu lại chuỗi toppings riêng biệt
    const ghiChu = sel.length > 0 ? `[Topping] ${sel.map(t => t.ten_topping).join(', ')}` : '';
    
    // Tổng giá cuối cùng = Giá Size (hoặc món) + Toppings
    const finalPrice = basePrice + tongGia;
    
    setShowTopping(false);
    themGioHang(monDangChon.id, ghiChu, finalPrice, selectedSize);
  };
  
  // Hàm Helper để tách phần Topping khỏi Ghi chú
  const parseGhiChu = (raw) => {
    if (!raw) return { tops: '', note: '' };
    const sep = ' - Ghi chú: ';
    if (raw.includes(sep)) {
      const parts = raw.split(sep);
      const tops = parts[0] === '[Không topping]' ? '' : parts[0];
      return { tops: tops.replace('[Topping] ', ''), note: parts.slice(1).join(sep) };
    }
    // Nếu chưa có Ghi chú, giả định tuỳ chọn cũ là topping hoàn toàn nếu bắt đầu với [Topping] hoặc là chuỗi
    if (raw.startsWith('[Topping] ')) return { tops: raw.replace('[Topping] ', ''), note: '' };
    // Tuỳ chỉnh cũ ko có [Topping]
    return { tops: raw, note: '' };
  };

  const updateGioHang = async (item) => {
    try {
      const res = await api.post('/api/khach-hang/don-dat-hang/update', item);
      if (res.data.status) {
        const fresh = await api.get(`/api/khach-hang/don-dat-hang/${id_quan}`);
        if (fresh.data.status) {
          setGioHang(fresh.data.gio_hang || []);
          setTongTien(fresh.data.tong_tien || 0);
          loadDeXuatVoucher(fresh.data.tong_tien || 0);
          // Phát tín hiệu cập nhật Navbar
          window.dispatchEvent(new CustomEvent('cart-updated'));

          // Kiểm tra voucher
          if (voucherApplied && voucherInfo) {
            if (fresh.data.tong_tien < (voucherInfo.don_hang_toi_thieu || 0)) {
              removeVoucher();
              toast.error(`Voucher "${voucherInfo.ma_code}" đã bị gỡ do đơn hàng không đủ ${formatVND(voucherInfo.don_hang_toi_thieu)}`);
            }
          }
        }
      } else toast.error(res.data.message);
    } catch {}
  };

  const xoaGioHang = async (item) => {
    try {
      const res = await api.post('/api/khach-hang/don-dat-hang/delete', item);
      if (res.data.status) { 
        toast.success(res.data.message); 
        // Phát tín hiệu cập nhật Navbar
        window.dispatchEvent(new CustomEvent('cart-updated'));
        loadData(); 
      }
    } catch {}
  };

  const tinhPhiShip = async (idDC) => {
    if (!idDC) return;
    try {
      const res = await api.post('/api/khach-hang/don-dat-hang/phi-ship', { id_quan_an: id_quan, id_dia_chi_khach: idDC });
      if (res.data.status) setPhiShip(res.data.phi_ship || 0);
    } catch {}
  };

  const applyVoucher = async (codeToApply = '') => {
    const code = codeToApply || voucherCode;
    if (!code) { toast.error('Vui lòng nhập mã voucher!'); return; }
    setApplyingVoucher(true);
    if (codeToApply) setVoucherCode(codeToApply); // ensure UI updates if called with arg
    try {
      const res = await api.post('/api/khach-hang/don-dat-hang/app-voucher', { ma_code: code, id_quan_an: id_quan });
      if (res.data.status) {
        setVoucherApplied(true);
        setVoucherInfo(res.data.data.voucher);
        setSoTienGiamVoucher(res.data.data.so_tien_giam);
        toast.success(res.data.message);
      } else toast.error(res.data.message);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Lỗi áp dụng voucher!');
    } finally { setApplyingVoucher(false); }
  };

  const removeVoucher = () => {
    setVoucherCode(''); setVoucherApplied(false); setVoucherInfo(null); setSoTienGiamVoucher(0);
    toast('Đã hủy voucher');
  };

  const buildUrl = (base) => {
    let url = base;
    if (voucherApplied && voucherInfo) url += `?id_voucher=${voucherInfo.id}`;
    if (suDungXu && tienGiamXu > 0) url += (url.includes('?') ? '&' : '?') + `su_dung_xu=${tienGiamXu}`;
    return url;
  };

  const xacNhanDatHang = async (type) => {
    if (!idDiaChi) { toast.error('Vui lòng chọn địa chỉ nhận hàng!'); return; }
    if (gioHang.length === 0) { toast.error('Giỏ hàng trống!'); return; }
    const endpoint = type === 'cash'
      ? buildUrl(`/api/khach-hang/xac-nhan-dat-hang-tien-mat/${id_quan}/${idDiaChi}`)
      : buildUrl(`/api/khach-hang/xac-nhan-dat-hang/${id_quan}/${idDiaChi}`);
    try {
      const res = await api.get(endpoint);
      if (res.data.status) {
        toast.success(res.data.message);
        // Phát tín hiệu CLEAR GIỎ HÀNG trên Navbar
        window.dispatchEvent(new CustomEvent('cart-updated'));
        if (type === 'cash') {
          navigate('/khach-hang/don-hang', { state: { tab: '' } }); // → Quay về tab "Tất cả"
        } else {
          // Gọi API lấy link PayOS và văng qua trang Checkout v2 đẳng cấp ngay lập tức
          toast.loading('Đang chuyển hướng sang cổng thanh toán thông minh PayOS...', { id: 'go_payos' });
          try {
            const payosRes = await api.post(`/api/payos/tao-link/${res.data.id_don_hang}`);
            toast.dismiss('go_payos');
            if (payosRes.data.status && payosRes.data.checkout_url) {
              window.location.href = payosRes.data.checkout_url;
            } else {
              toast.error('Gặp sự cố khi kết nối PayOS. Bạn có thể thử thanh toán lại trong Lịch sử Đơn Hàng!');
              navigate('/khach-hang/don-hang', { state: { tab: '' } });
            }
          } catch (e) {
            toast.dismiss('go_payos');
            toast.error('Lỗi khi tải kết nối PayOS, hệ thống đã lưu đơn hàng cho bạn dưới dạng Chờ Thanh Toán!');
            navigate('/khach-hang/don-hang', { state: { tab: '' } });
          }
        }
      } else toast.error('Hệ thống lỗi, vui lòng thử lại!');
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
      else toast.error('Đặt hàng thất bại!');
    }
  };

  const hoànThanh = async () => {
    try {
      await api.get('/api/transaction');
      toast.success('Cảm ơn bạn đã đặt hàng!');
      navigate('/khach-hang/don-hang');
    } catch { navigate('/khach-hang/don-hang'); }
  };

  const openNow = isOpenNow(quanAn.gio_mo_cua, quanAn.gio_dong_cua);

  const formatDT = dt => {
    if (!dt) return '';
    const d = new Date(dt);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Modals */}
      {showTopping && <ToppingModal mon={monDangChon} toppings={toppings} onClose={() => setShowTopping(false)} onConfirm={xacNhanTopping} />}
      {showModal && <ConfirmModal orderData={modalData} onClose={() => setShowModal(false)} onConfirm={hoànThanh} />}

      {/* Restaurant Hero */}
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-2 h-64 md:h-auto overflow-hidden">
              <img src={quanAn.hinh_anh} alt={quanAn.ten_quan_an} className="w-full h-full object-cover" />
            </div>
            <div className="md:col-span-3 p-6 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{quanAn.ten_quan_an}</h1>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <i className="fa-solid fa-location-dot text-red-500" />
                    <span>{quanAn.dia_chi}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={thongKe.average_stars} />
                    <span className="text-sm text-gray-500">{thongKe.total_reviews} đánh giá | {thongKe.average_stars}/5 sao</span>
                  </div>
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${openNow ? 'text-green-500' : 'text-red-500'}`}>
                    <i className="fa-solid fa-circle text-xs" />{openNow ? 'Đang mở cửa' : 'Đã đóng cửa'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div><i className="fa-regular fa-clock mr-2 text-orange-400" />{quanAn.gio_mo_cua} – {quanAn.gio_dong_cua}</div>
                  <div><i className="fa-solid fa-circle-dollar-to-slot mr-2 text-orange-400" />20.000 – 100.000đ</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex gap-4 text-sm text-gray-500">
                <div><span className="font-bold text-gray-700 block">PHÍ DỊCH VỤ</span><span className="text-green-600 font-semibold">0.0%</span></div>
                <div className="h-10 w-px bg-gray-200" />
                <div><span className="font-bold text-gray-700 block">DỊCH VỤ BỞI</span><span className="text-gradient font-semibold">FoodBee</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="flex gap-3">
          {[
            { key: 'menu', icon: 'fa-utensils', label: 'Thực đơn' },
            { key: 'reviews', icon: 'fa-star', label: `Đánh giá (${thongKe.total_reviews})` },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === t.key ? 'text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              style={activeTab === t.key ? { background: 'linear-gradient(135deg, #ff6b35, #f7931e)' } : {}}>
              <i className={`fa-solid ${t.icon}`} />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Tab */}
      {activeTab === 'menu' && (
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-6">
          {/* Left: Menu */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-lg font-bold text-red-500 mb-4"><i className="fa-solid fa-utensils mr-2" />THỰC ĐƠN</h3>

              {/* Search */}
              <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchMon} onChange={e => setSearchMon(e.target.value)}
                  placeholder="Tìm kiếm món ăn..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>

              {/* Food list */}
              <div className="space-y-3">
                {monAnFiltered.map((m, i) => (
                  <div key={i} className="flex gap-3 p-3 border border-gray-100 rounded-xl hover:shadow-md transition-all duration-200">
                    <img src={m.hinh_anh} alt={m.ten_mon_an} className="w-24 h-20 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 mb-1 truncate">{m.ten_mon_an}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        {m.gia_khuyen_mai > 0 && m.gia_khuyen_mai < m.gia_ban && (
                          <span className="text-xs text-gray-400 line-through">{m.gia_ban?.toLocaleString()}đ</span>
                        )}
                        <span className="text-red-500 font-bold">{(m.gia_khuyen_mai || m.gia_ban)?.toLocaleString()}đ</span>
                      </div>
                    </div>
                    <button onClick={() => openToppingModal(m)}
                      className="self-center w-9 h-9 rounded-full border-2 border-blue-400 text-blue-500 font-bold hover:bg-blue-500 hover:text-white transition-colors flex-shrink-0 flex items-center justify-center">+</button>
                  </div>
                ))}
                {monAnFiltered.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-bowl-food text-4xl mb-3 block" />
                    <p>Không tìm thấy món ăn</p>
                  </div>
                )}
              </div>

              {/* Toppings available */}
              {toppings.length > 0 && (
                <div className="mt-5 pt-4 border-t">
                  <h5 className="font-bold text-yellow-600 mb-3 text-sm"><i className="fa-solid fa-star mr-1" />Topping có sẵn</h5>
                  <div className="flex flex-wrap gap-2">
                    {toppings.map((t, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-50 border border-yellow-300 text-yellow-800">
                        {t.ten_topping} <span className="text-red-500 ml-1">+{t.gia?.toLocaleString()}đ</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-20">
              <div className="px-5 py-4 text-white font-bold text-base" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <i className="fa-solid fa-shopping-cart mr-2" />Đơn Hàng Đang Đặt {gioHang.length > 0 && `(${gioHang.length} món)`}
              </div>

              <div className="p-4 space-y-3 max-h-56 overflow-y-auto">
                {gioHang.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <i className="fa-solid fa-cart-shopping text-4xl mb-3 block" />Giỏ hàng trống
                  </div>
                ) : gioHang.map((item, i) => {
                  const { tops, note } = parseGhiChu(item.ghi_chu);
                  return (
                  <div key={i} className="flex flex-col gap-2 border-b border-gray-100 pb-3 pt-1">
                    <div className="grid grid-cols-12 gap-2 items-center text-sm">
                      <div className="col-span-4 font-semibold text-gray-800 truncate" title={item.ten_mon_an}>
                        {item.ten_mon_an}
                        {item.ten_size && <div className="text-xs text-orange-500 font-bold tracking-tight">Size {item.ten_size}</div>}
                      </div>
                      <input type="number" value={item.so_luong} min={1}
                        onChange={e => {
                          const qty = Math.max(1, +e.target.value || 1);
                          setGioHang(g => g.map((x,j) => j===i ? {...x, so_luong: qty, thanh_tien: qty * x.don_gia} : x));
                          setTongTien(prev => {
                            const updated = gioHang.map((x,j) => j===i ? qty * x.don_gia : x.thanh_tien);
                            return updated.reduce((s, v) => s + v, 0);
                          });
                        }}
                        onBlur={() => updateGioHang(item)}
                        className="col-span-2 text-center w-full border border-gray-300 rounded-lg py-1 text-sm bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200" />
                      <div className="col-span-2 text-right text-gray-500 text-xs">{formatVND(item.don_gia)}</div>
                      <div className="col-span-2 font-bold text-right text-xs text-red-500">{formatVND(item.thanh_tien)}</div>
                      <button onClick={() => xoaGioHang(item)} className="col-span-1 text-red-400 hover:text-red-600 flex items-center justify-end text-sm transition-colors">
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                    <div>
                      {tops && (
                        <div className="text-xs text-gray-500 mb-1.5 px-1 truncate flex items-center gap-1.5" title={tops}>
                          <span className="font-semibold px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">Topping</span> 
                          {tops}
                        </div>
                      )}
                      <input type="text" value={note} placeholder="Ghi chú thêm (vd: ít đá, không hành...)"
                        onChange={e => {
                          const newNote = e.target.value;
                          const t = tops ? `[Topping] ${tops}` : '[Không topping]';
                          const newGhiChu = newNote ? `${t} - Ghi chú: ${newNote}` : (tops ? `[Topping] ${tops}` : '');
                          setGioHang(g => g.map((x,j) => j===i ? {...x, ghi_chu: newGhiChu} : x));
                        }}
                        onBlur={() => updateGioHang(item)}
                        title="Bạn có thể sửa hoặc thêm ghi chú yêu cầu quán chuẩn bị"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-gray-50 focus:bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all placeholder-gray-400" />
                    </div>
                  </div>
                )})}
              </div>

              <div className="p-4 border-t border-gray-100 space-y-3">
                {/* Address select */}
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Địa chỉ nhận hàng</label>
                  <select value={idDiaChi} onChange={e => { setIdDiaChi(e.target.value); tinhPhiShip(e.target.value); }}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400">
                    <option value="">-- Chọn địa chỉ --</option>
                    {diaChiList.map((dc, i) => (
                      <option key={i} value={dc.id}>{dc.dia_chi}, {dc.ten_quan_huyen}, {dc.ten_tinh_thanh} - {dc.ten_nguoi_nhan} - {dc.so_dien_thoai}</option>
                    ))}
                  </select>
                  {phiShip > 0 && idDiaChi && (
                    <div className="flex justify-between text-sm mt-1.5 p-2 bg-blue-50 rounded-lg text-blue-700 font-bold border border-blue-100 animate-pulse-subtle">
                      <span className="flex items-center gap-1.5"><i className="fa-solid fa-truck-fast text-xs"/> Phí giao hàng:</span>
                      <span>{formatVND(phiShip)}</span>
                    </div>
                  )}
                  {!idDiaChi && (
                    <div className="text-[10px] mt-1.5 text-red-500 font-black uppercase tracking-tighter flex items-center gap-1">
                      <i className="fa-solid fa-triangle-exclamation animate-bounce" /> Vui lòng chọn địa chỉ để tính phí ship
                    </div>
                  )}
                </div>

                {/* Suggested vouchers */}
                {deXuatVouchers.length > 0 && (
                  <div className="p-3 rounded-xl" style={{ background: '#fffbf0', borderLeft: '4px solid #f59e0b' }}>
                    <div className="text-xs font-bold text-yellow-800 mb-2"><i className="fa-solid fa-magic mr-1" />Voucher dành cho bạn</div>
                    <div className="flex flex-wrap gap-2">
                      {deXuatVouchers.map((v, i) => (
                        <button key={i} onClick={() => applyVoucher(v.ma_code)}
                          className="text-left px-3 py-2 rounded-lg border-2 border-yellow-300 bg-white hover:bg-yellow-50 transition-colors text-xs">
                          <div className="font-bold text-yellow-700">{v.ma_code}</div>
                          <div className="text-gray-500">{v.ten_voucher}</div>
                          <div className="text-green-600 font-semibold">Tiết kiệm {formatVND(v.so_tien_giam)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voucher input */}
                <div className="p-3 rounded-xl bg-gray-50 border-l-4 border-red-400">
                  <div className="text-xs font-bold text-gray-700 mb-2"><i className="fa-solid fa-tag mr-1 text-red-400" />Mã Giảm Giá</div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-tag absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                      <input type="text" value={voucherCode} onChange={e => setVoucherCode(e.target.value)}
                        disabled={voucherApplied} onKeyDown={e => e.key === 'Enter' && applyVoucher()}
                        placeholder="Nhập mã giảm giá..."
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                    </div>
                    {!voucherApplied
                      ? <button onClick={() => applyVoucher()} disabled={!voucherCode || applyingVoucher}
                          className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-1"
                          style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a6f)' }}>
                          {applyingVoucher ? <><i className="fa-solid fa-spinner fa-spin" />Kiểm tra...</> : <><i className="fa-solid fa-check-circle" />Áp dụng</>}
                        </button>
                      : <button onClick={removeVoucher}
                          className="px-4 py-2 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 flex items-center gap-1">
                          <i className="fa-solid fa-times-circle" />Hủy
                        </button>
                    }
                  </div>
                  {voucherApplied && voucherInfo && (
                    <div className="mt-2 p-2.5 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-check text-sm" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-green-800">{voucherInfo.ten_voucher}</div>
                        <div className="text-xs text-green-600">Tiết kiệm: <strong>{formatVND(soTienGiamVoucher)}</strong></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div>
                  <div className="text-xs font-bold text-gray-600 uppercase mb-2"><i className="fa-solid fa-credit-card text-blue-500 mr-1" />Phương thức thanh toán</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: '1', icon: 'fa-money-bill-wave', color: 'text-green-500', title: 'Tiền mặt', sub: 'Trả khi nhận hàng' },
                      { val: '2', icon: 'fa-qrcode', color: 'text-blue-500', title: 'Chuyển khoản', sub: 'Quét mã QR' },
                    ].map(pm => (
                      <label key={pm.val}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${phuongThuc === pm.val ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" value={pm.val} checked={phuongThuc === pm.val} onChange={() => setPhuongThuc(pm.val)} className="hidden" />
                        <i className={`fa-solid ${pm.icon} ${pm.color} text-2xl mb-1`} />
                        <span className="font-semibold text-xs text-gray-700">{pm.title}</span>
                        <span className="text-xs text-gray-400">{pm.sub}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Xu toggle */}
                {userInfo?.diem_xu > 0 && (
                  <div className="p-3 rounded-xl bg-yellow-50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-gray-800"><i className="fa-solid fa-coins text-yellow-500 mr-1" />ShopeFood Xu</div>
                      <div className="text-xs text-gray-500">Bạn có <strong className="text-yellow-600">{userInfo.diem_xu}</strong> xu (Tiết kiệm {formatVND(tienQuyDoiXu)})</div>
                    </div>
                    <button onClick={() => setSuDungXu(!suDungXu)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-200 ${suDungXu ? 'bg-yellow-400' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${suDungXu ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>
                )}

                {/* Price summary */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Tạm tính</span><span>{formatVND(tongTien)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Phí ship</span><span>{formatVND(phiShip)}</span></div>
                  {soTienGiamVoucher > 0 && <div className="flex justify-between text-green-600"><span>Voucher</span><span>-{formatVND(soTienGiamVoucher)}</span></div>}
                  {tienGiamXu > 0 && <div className="flex justify-between text-green-600"><span>Xu</span><span>-{formatVND(tienGiamXu)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                    <span>Tổng</span><span className="text-red-500">{formatVND(tongCuoi)}</span>
                  </div>
                </div>

                {/* Order button */}
                {phuongThuc === '1' && idDiaChi && (
                  <button onClick={() => xacNhanDatHang('cash')}
                    className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-red-200 transition-all transform hover:-translate-y-1 active:translate-y-0 active:shadow-none border-b-4 border-red-700"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
                    <i className="fa-solid fa-money-bill-wave" /> Đặt Món (Tiền Mặt)
                  </button>
                )}
                {phuongThuc === '2' && idDiaChi && (
                  <button onClick={() => xacNhanDatHang('transfer')}
                    className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-green-200 transition-all transform hover:-translate-y-1 active:translate-y-0 active:shadow-none border-b-4 border-green-700"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    <i className="fa-solid fa-bolt" /> Đặt Món (PayOS)
                  </button>
                )}
                {(!phuongThuc || !idDiaChi) && (
                  <button disabled className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2 border-2 border-dashed border-gray-200">
                    <i className="fa-solid fa-hand-pointer animate-pulse" /> 
                    {!idDiaChi ? 'CHƯA CHỌN ĐỊA CHỈ' : 'CHƯA CHỌN THANH TOÁN'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Stats */}
            <div className="flex items-center gap-8 mb-6 pb-6 border-b">
              <div className="text-center">
                <div className="text-6xl font-black text-yellow-400">{thongKe.average_stars}</div>
                <Stars value={thongKe.average_stars} />
                <div className="text-gray-400 text-sm mt-1">{thongKe.total_reviews} đánh giá</div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-2">Tất cả nhận xét</h3>
                <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                  <i className="fa-solid fa-info-circle mr-1" />Chỉ những người đã đặt món tại quán mới có thể đánh giá.
                </div>
              </div>
            </div>

            {/* Reviews */}
            {danhGia.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <i className="fa-regular fa-comment-dots text-5xl mb-4 block" />
                <p>Chưa có đánh giá nào cho quán ăn này.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {danhGia.map((r, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <img src={r.avatar || 'https://ui-avatars.com/api/?name=' + r.ho_va_ten + '&background=ff6b35&color=fff'} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="font-bold text-gray-800">{r.ho_va_ten}</h5>
                        <span className="text-xs text-gray-400">{formatDT(r.created_at)}</span>
                      </div>
                      <Stars value={r.sao_quan_an} />
                      <p className="text-gray-600 mt-1 text-sm">{r.nhan_xet_quan_an || 'Khách hàng không để lại bình luận.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
