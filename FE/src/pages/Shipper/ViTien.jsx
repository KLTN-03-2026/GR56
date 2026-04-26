import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND, formatDate } from '../../utils/helpers';

const sA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('shipper_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

/* ----- Add Bank Modal ----- */

const AddBankFormFields = ({ form, onChange }) => (
  <div className="p-6 space-y-4">
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5">Ngân Hàng</label>
      <select value={form.ten_ngan_hang} onChange={e => onChange({...form, ten_ngan_hang: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-medium">
        <option value="">-- Chọn ngân hàng --</option>
        {['MB Bank', 'Vietcombank', 'Techcombank', 'VPBank', 'BIDV', 'Agribank', 'VietinBank', 'ACB', 'TPBank', 'SHB', 'MSB', 'OCB', 'HDBank'].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5">Số Tài Khoản</label>
      <input type="text" value={form.so_tai_khoan} onChange={e => onChange({...form, so_tai_khoan: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-mono tracking-wider" placeholder="0123456..."/>
    </div>
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5">Tên Chủ Tài Khoản</label>
      <input type="text" value={form.chu_tai_khoan} onChange={e => onChange({...form, chu_tai_khoan: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none uppercase" placeholder="NGUYEN VAN A" />
    </div>
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5">Chi Nhánh (Tùy chọn)</label>
      <input type="text" value={form.chi_nhanh} onChange={e => onChange({...form, chi_nhanh: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" placeholder="Chi nhánh..." />
    </div>
    <div className="flex items-center gap-2 pt-2">
      <input type="checkbox" id="default-bank" checked={form.is_default} onChange={e => onChange({...form, is_default: e.target.checked})} className="w-4 h-4 text-blue-600 rounded bg-gray-100 border-gray-300 focus:ring-blue-500 cursor-pointer" />
      <label htmlFor="default-bank" className="text-sm text-gray-700 cursor-pointer font-medium select-none">Đặt làm thẻ nhận tiền mặc định</label>
    </div>
  </div>
);

function AddBankModal({ idShipper, onClose, onSuccess }) {
  const [formBank, setFormBank] = useState({
     loai_chu: 'shipper', ten_ngan_hang: '', so_tai_khoan: '', chu_tai_khoan: '', chi_nhanh: '', is_default: false
  });

  const themTaiKhoan = async () => {
    if (!formBank.ten_ngan_hang || !formBank.chu_tai_khoan || !formBank.so_tai_khoan) return toast.error('Vui lòng điền đủ thông tin');
    try {
      const res = await sA('/api/wallet/them-tai-khoan', 'post', { ...formBank, id_chu: idShipper });
      if (res.data.status) {
        toast.success(res.data.message);
        onSuccess();
      } else {
         toast.error(res.data.message);
      }
    } catch {
       toast.error('Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm shadow-2xl">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
         <div className="bg-blue-600 p-5 text-white flex justify-between items-center">
            <h3 className="font-bold text-lg"><i className="fa-solid fa-plus-circle mr-2"></i>Thêm Tài Khoản</h3>
            <button onClick={onClose} className="text-white/60 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
         </div>
         <AddBankFormFields form={formBank} onChange={setFormBank} />
         <div className="p-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50">
            <button onClick={onClose} className="px-5 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors">Hủy</button>
            <button onClick={themTaiKhoan} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-md">Lưu Tài Khoản</button>
         </div>
      </div>
    </div>
  );
}

export default function ShipperViTien() {
  const [tab, setTab] = useState('giao-dich');
  const [idShipper, setIdShipper] = useState(null);
  
  const [wallet, setWallet] = useState({});
  const [giaoDich, setGiaoDich] = useState([]);
  const [lichSuRut, setLichSuRut] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formRut, setFormRut] = useState({ loai_vi: 'shipper', id_bank_account: '', so_tien_rut: '' });
  const [showAddBank, setShowAddBank] = useState(false);
  
  // Nộp tiền
  const [nopTienAmt, setNopTienAmt] = useState(200000);
  const [checking, setChecking] = useState(false);

  const [pageGD, setPageGD] = useState(1);
  const itemsPerPageGD = 10;
  const totalPagesGD = Math.ceil(giaoDich.length / itemsPerPageGD);
  const currentGD = giaoDich.slice((pageGD - 1) * itemsPerPageGD, pageGD * itemsPerPageGD);

  useEffect(() => {
    sA('/api/shipper/data-login').then(res => {
      if (res.data?.status && res.data?.data?.id) {
         setIdShipper(res.data.data.id);
      }
    });
  }, []);

  useEffect(() => {
    if (idShipper) {
      loadAll();
      kiemTraReturnPayOS();
    }
  }, [idShipper]);

  const kiemTraReturnPayOS = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const payosCode = urlParams.get('code');
    const orderCode = urlParams.get('orderCode');
    const payosCancel = urlParams.get('cancel');

    // Nếu khách hàng ko thanh toán mà bấm huỷ (cancel = true)
    if (payosCancel === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
      toast('Đã huỷ thao tác nạp tiền', { icon: 'ℹ️' });
      setTab('nop-tien');
      return;
    }

    // Nếu trả về thành công có mã đơn
    if (payosCode === '00' && orderCode) {
      setChecking(true);
      try {
        const res = await sA('/api/wallet/xac-nhan-nap-tien', 'post', { orderCode });
        if (res.data?.status) {
          toast.success(res.data.message);
          window.history.replaceState({}, document.title, window.location.pathname);
          loadAll();
          setTab('giao-dich');
        } else {
          toast.error(res.data?.message);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch {
        toast.error('Lỗi kết nối kiểm tra nạp tiền.');
      } finally {
        setChecking(false);
      }
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadGiaoDich(), loadLichSuRut(), loadBankAccounts()]);
    setLoading(false);
  };

  const loadGiaoDich = async () => {
    try {
      const res = await sA(`/api/wallet/chi-tiet?loai_vi=shipper&id_chu_vi=${idShipper}`);
      if (res.data?.status) {
        setWallet(res.data.data.vi || {});
        setGiaoDich(res.data.data.giao_dich || []);
      }
    } catch {}
  };

  const loadLichSuRut = async () => {
    try {
      const res = await sA(`/api/wallet/lich-su-rut?loai_vi=shipper&id_chu_vi=${idShipper}`);
      if (res.data?.data) {
        setLichSuRut(res.data.data);
      }
      if (res.data?.vi) setWallet(res.data.vi);
    } catch {}
  };

  const loadBankAccounts = async () => {
    try {
      const res = await sA(`/api/wallet/tai-khoan?loai_chu=shipper&id_chu=${idShipper}`);
      if (res.data?.data) {
        setBankAccounts(res.data.data);
        const md = res.data.data.find(b => b.is_default);
        if (md && !formRut.id_bank_account) setFormRut(p => ({ ...p, id_bank_account: md.id }));
      }
    } catch {}
  };

  const guiYeuCauRut = async () => {
    if (!formRut.so_tien_rut || formRut.so_tien_rut < 10000) return toast.error('Số tiền rút tối thiểu là  10.000đ');
    if (!formRut.id_bank_account) return toast.error('Vui lòng chọn tài khoản ngân hàng');
    
    setSubmitting(true);
    try {
      const res = await sA('/api/wallet/yeu-cau-rut-tien', 'post', { ...formRut, id_chu_vi: idShipper });
      if (res.data.status) {
        toast.success(res.data.message);
        setFormRut(p => ({ ...p, so_tien_rut: '' }));
        loadAll();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };



  const xoaTaiKhoan = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    try {
      const res = await sA('/api/wallet/xoa-tai-khoan', 'post', { id });
      if (res.data.status) {
        toast.success(res.data.message);
        loadBankAccounts();
      }
    } catch {}
  };

  const kiemTraGiaoDich = async () => {
    setChecking(true);
    try {
      const res = await sA('/api/transaction/sync');
      if (res.data?.status) {
        const msg = res.data.processed > 0 ? `Đã xử lý ${res.data.processed} giao dịch mới!` : 'Chưa có giao dịch mới nào.';
        toast(msg, { icon: '🔄' });
        if (res.data.processed > 0) loadAll();
      }
    } catch {
      toast.error('Lỗi kiểm tra giao dịch');
    } finally {
      setChecking(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Đã copy: ' + text)).catch(() => toast.error('Lỗi copy'));
  };

  const noiDungCK = idShipper ? `NOPVI${idShipper}` : 'NOPVI...';
  const qrUrl = `https://img.vietqr.io/image/MB-0394425076-qr_only.png?amount=${nopTienAmt}&addInfo=${encodeURIComponent(noiDungCK)}`;

  const labelTrangThai = (ts) => ({ cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', da_chuyen: 'Hoàn tất', tu_choi: 'Từ chối' }[ts] || ts);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="text-white px-4 py-5" style={{ background: 'linear-gradient(135deg, #0f2027, #2c5364)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <i className="fa-solid fa-wallet text-2xl text-blue-400" />
              <h1 className="text-xl font-extrabold">Ví Thu Nhập</h1>
            </div>
            <p className="text-white/50 text-sm">Quản lý số dư và thu nhập của bạn</p>
          </div>
          <div className="flex gap-3">
             <button onClick={loadAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20">
               <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} />Làm mới
             </button>
             <Link to="/shipper/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20"><i className="fa-solid fa-user" /></Link>
             <Link to="/shipper/don-hang" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20"><i className="fa-solid fa-house" /></Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-4 flex-1">
        {/* Wallet balance banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl mb-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-20 translate-x-20 blur-2xl"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex justify-center items-center shadow-inner backdrop-blur-md">
                   <i className="fa-solid fa-sack-dollar text-3xl text-yellow-300"></i>
                </div>
                <div>
                   <p className="text-blue-100 font-medium uppercase tracking-widest text-xs mb-1">Số dư khả dụng</p>
                   <h2 className="text-4xl font-black tracking-tight">{formatVND(wallet.so_du || 0)}</h2>
                </div>
             </div>
             <div className="flex gap-2 w-full md:w-auto">
                <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                   <div>
                      <p className="text-xs text-green-300 font-semibold mb-1 uppercase tracking-wider"><i className="fa-solid fa-arrow-down mr-1"></i>Đã Nhận</p>
                      <p className="font-bold text-lg">{formatVND(wallet.tong_tien_nhan || 0)}</p>
                   </div>
                </div>
                <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                   <div>
                      <p className="text-xs text-orange-300 font-semibold mb-1 uppercase tracking-wider"><i className="fa-solid fa-arrow-up mr-1"></i>Đã Rút</p>
                      <p className="font-bold text-lg">{formatVND(wallet.tong_tien_rut || 0)}</p>
                   </div>
                </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
             
             {/* Tab navigation */}
             <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-2 overflow-x-auto hide-scrollbar">
                <button onClick={() => setTab('giao-dich')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === 'giao-dich' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                   <i className="fa-solid fa-clock-rotate-left"></i> Lịch sử ví
                </button>
                <button onClick={() => setTab('nop-tien')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === 'nop-tien' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                   <i className="fa-solid fa-money-bill-transfer"></i> Nộp tiền
                </button>
                <button onClick={() => setTab('rut-tien')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === 'rut-tien' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                   <i className="fa-solid fa-building-columns"></i> Lịch sử rút
                </button>
             </div>

             <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
                {tab === 'giao-dich' && (
                  <div>
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-blue-500"><i className="fa-solid fa-spinner fa-spin text-4xl mb-3"></i>Đang tải dữ liệu...</div>
                    ) : giaoDich.length === 0 ? (
                      <div className="text-center py-20 text-gray-400"><i className="fa-solid fa-receipt text-6xl text-gray-200 mb-4 block"></i>Chưa có giao dịch</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          {currentGD.map((gd, i) => (
                             <div key={i} className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 shrink-0 shadow-sm ${gd.loai_giao_dich === 'credit' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                 <i className={`fa-solid ${gd.loai_giao_dich === 'credit' ? 'fa-arrow-down' : 'fa-arrow-up'} text-lg`}></i>
                               </div>
                               <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-800 text-sm truncate">{gd.mo_ta || 'Giao dịch'}</p>
                                  <p className="text-xs text-gray-500 mt-1"><i className="fa-regular fa-clock mr-1"></i>{formatDate(gd.created_at)}</p>
                               </div>
                               <div className="text-right shrink-0 ml-4">
                                  <p className={`font-black text-lg ${gd.loai_giao_dich === 'credit' ? 'text-green-500' : 'text-orange-500'}`}>
                                    {gd.loai_giao_dich === 'credit' ? '+' : '-'}{formatVND(gd.so_tien)}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">Số dư: {formatVND(gd.so_du_sau)}</p>
                               </div>
                             </div>
                          ))}
                        </div>
                        
                        {totalPagesGD > 1 && (
                          <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-gray-50">
                            <button onClick={() => setPageGD(p => Math.max(1, p - 1))} disabled={pageGD === 1} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors border border-gray-200">
                              <i className="fa-solid fa-chevron-left text-xs"></i>
                            </button>
                            <div className="flex items-center gap-1">
                               {[...Array(totalPagesGD)].map((_, idx) => {
                                  const p = idx + 1;
                                  if (p === 1 || p === totalPagesGD || (p >= pageGD - 1 && p <= pageGD + 1)) {
                                     return (
                                        <button key={p} onClick={() => setPageGD(p)} className={`w-9 h-9 flex items-center justify-center rounded-xl font-bold text-sm transition-all ${pageGD === p ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'}`}>
                                           {p}
                                        </button>
                                     );
                                  }
                                  if (p === pageGD - 2 || p === pageGD + 2) return <span key={`dots-${p}`} className="text-gray-300">...</span>;
                                  return null;
                               })}
                            </div>
                            <button onClick={() => setPageGD(p => Math.min(totalPagesGD, p + 1))} disabled={pageGD === totalPagesGD} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors border border-gray-200">
                              <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'nop-tien' && (
                  <div>
                     <div className="bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-100 text-blue-800">
                        <h3 className="font-black mb-2 flex items-center"><i className="fa-solid fa-circle-info mr-2"></i>Nạp Tiền Ví Tự Động Qua PayOS</h3>
                        <p className="text-sm">Vui lòng nhập số tiền cần nạp, hệ thống sẽ chuyển hướng bạn đến cổng thanh toán PayOS. Tiền sẽ được cộng vào ví ngay sau khi thanh toán thành công.</p>
                     </div>
                     <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nhập số tiền cần nạp</label>
                        <div className="relative">
                           <input type="number" min="10000" step="10000" className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-lg text-blue-600 shadow-inner" value={nopTienAmt} onChange={e => setNopTienAmt(Number(e.target.value) || 0)} />
                           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400"><i className="fa-solid fa-money-bill-1-wave"></i></div>
                           <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 font-bold">đ</div>
                        </div>
                        <div className="flex gap-2 flex-wrap mt-3">
                           {[50000, 100000, 200000, 500000, 1000000].map(amt => (
                             <button key={amt} onClick={() => setNopTienAmt(amt)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${nopTienAmt === amt ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{formatVND(amt)}</button>
                           ))}
                        </div>
                     </div>
                     
                     <button onClick={async () => {
                        if (!nopTienAmt || nopTienAmt < 10000) return toast.error('Số tiền tối thiểu 10.000đ');
                        setChecking(true);
                        try {
                           const r = await sA('/api/wallet/tao-link-nap-tien', 'post', { id_shipper: idShipper, so_tien: nopTienAmt });
                           if (r.data?.status && r.data?.data?.checkoutUrl) {
                              window.location.href = r.data.data.checkoutUrl;
                           } else {
                              toast.error(r.data?.message);
                           }
                        } catch {
                           toast.error('Có lỗi xảy ra');
                        } finally {
                           setChecking(false);
                        }
                     }} disabled={checking || nopTienAmt < 10000} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all mt-6 disabled:opacity-50">
                       {checking ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang tạo giao dịch...</> : <><i className="fa-solid fa-qrcode mr-2"></i>Thanh Toán Ngay Qua PayOS</>}
                     </button>
                  </div>
                )}

                {tab === 'rut-tien' && (
                  <div>
                    {lichSuRut.length === 0 ? (
                      <div className="text-center py-20 text-gray-400"><i className="fa-solid fa-clock-rotate-left text-6xl text-gray-200 mb-4 block"></i>Chưa có yêu cầu rút</div>
                    ) : (
                      <div className="space-y-4">
                        {lichSuRut.map((rut, i) => (
                           <div key={i} className="flex p-4 bg-gray-50 rounded-2xl border border-gray-100 gap-4 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                             <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-orange-500 shrink-0 border border-orange-100">
                               <i className="fa-solid fa-building-columns text-xl"></i>
                             </div>
                             <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-sm mb-1">Yêu cầu rút tiền</p>
                                {rut.bank_account && (
                                  <p className="text-xs text-gray-500 mb-1"><i className="fa-regular fa-credit-card mr-1"></i>{rut.bank_account.ten_ngan_hang} (****{String(rut.bank_account.so_tai_khoan).slice(-4)})</p>
                                )}
                                <p className="text-xs text-blue-600 font-semibold bg-blue-50 inline-block px-2 py-0.5 rounded mr-2"><i className="fa-solid fa-money-bill-wave mr-1"></i>{formatVND(rut.so_tien_rut)}</p>
                                <span className={`text-xs px-2 py-0.5 outline outline-1 outline-offset-1 rounded font-bold ${
                                  rut.trang_thai === 'cho_duyet' ? 'bg-orange-100 text-orange-600 outline-orange-200' :
                                  rut.trang_thai === 'da_chuyen' ? 'bg-green-100 text-green-600 outline-green-200' :
                                  'bg-red-100 text-red-600 outline-red-200'
                                }`}>{labelTrangThai(rut.trang_thai)}</span>
                             </div>
                             <div className="text-right shrink-0">
                                <p className="text-xs text-gray-400 font-medium mb-1">{formatDate(rut.created_at)}</p>
                                {rut.noi_dung_chuyen_khoan && <p className="text-xs font-semibold text-gray-600 mt-2 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm border-dashed">GD: {rut.noi_dung_chuyen_khoan}</p>}
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            
            {/* Form Yêu Cầu Rút */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-800 mb-5 flex items-center text-lg"><i className="fa-solid fa-paper-plane text-orange-500 mr-2"></i>Yêu Cầu Rút Tiền</h3>
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Số Tiền Rút (đ)</label>
                    <input type="number" value={formRut.so_tien_rut} onChange={e => setFormRut({...formRut, so_tien_rut: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 font-black text-gray-800 text-lg transition-colors" placeholder="VD: 50.000" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Tài Khoản Nhận</label>
                    {bankAccounts.length === 0 ? (
                      <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100 font-semibold flex items-start gap-2"><i className="fa-solid fa-triangle-exclamation mt-0.5"></i> Vui lòng thêm tài khoản ngân hàng bên dưới</div>
                    ) : (
                      <div className="space-y-2">
                        {bankAccounts.map((b, i) => (
                           <div key={i} onClick={() => setFormRut({...formRut, id_bank_account: b.id})} className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${formRut.id_bank_account === b.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
                              <p className="font-bold text-sm text-gray-800 flex justify-between items-center">{b.ten_ngan_hang} {formRut.id_bank_account === b.id && <i className="fa-solid fa-circle-check text-orange-500"></i>}</p>
                              <p className="text-xs text-gray-500 mt-0.5 tracking-wider">****{String(b.so_tai_khoan).slice(-4)}</p>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={guiYeuCauRut} disabled={submitting || bankAccounts.length === 0} className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:bg-orange-600 transition-all disabled:opacity-50 mt-2">
                    {submitting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Gửi Yêu Cầu & Chờ Duyệt'}
                  </button>
               </div>
            </div>

            {/* Quản Lý Tài Khoản Ngân Hàng */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-gray-800 text-lg"><i className="fa-solid fa-credit-card text-blue-500 mr-2"></i>Thẻ Ngân Hàng</h3>
                  <button onClick={() => setShowAddBank(true)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"><i className="fa-solid fa-plus font-bold"></i></button>
               </div>
               
               <div className="space-y-3">
                  {bankAccounts.map((b, i) => (
                     <div key={i} className="p-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl text-white shadow-md relative overflow-hidden group">
                        <i className="fa-brands fa-cc-visa absolute -right-4 -bottom-4 text-6xl text-white/10"></i>
                        <p className="font-bold text-sm text-blue-200 flex justify-between">{b.ten_ngan_hang} <button onClick={() => xoaTaiKhoan(b.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"><i className="fa-solid fa-trash-can"></i></button></p>
                        <p className="font-mono tracking-widest text-lg font-medium mt-1 mb-2">**** {String(b.so_tai_khoan).slice(-4)}</p>
                        <div className="flex justify-between items-center">
                           <p className="text-xs uppercase opacity-80 font-semibold">{b.chu_tai_khoan}</p>
                           {b.is_default === 1 && <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border border-blue-400/50 backdrop-blur-sm">Mặc định</span>}
                        </div>
                     </div>
                  ))}
                  {bankAccounts.length === 0 && <p className="text-center text-sm text-gray-400 py-4 italic">Bạn chưa thêm thẻ nào</p>}
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal Add Bank */}
      {showAddBank && (
         <AddBankModal idShipper={idShipper} onClose={() => setShowAddBank(false)} onSuccess={() => { setShowAddBank(false); loadBankAccounts(); }} />
      )}
    </div>
  );
}
