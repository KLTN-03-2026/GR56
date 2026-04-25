import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND, formatDate } from '../../utils/helpers';

export default function ViTien() {
  const [wallet, setWallet] = useState({});
  const [giaoDich, setGiaoDich] = useState([]);
  const [lichSuRut, setLichSuRut] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingGd, setLoadingGd] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [idQuanAn, setIdQuanAn] = useState(null);
  
  const [activeTab, setActiveTab] = useState('giao_dich');
  const [showBankModal, setShowBankModal] = useState(false);

  const [formRut, setFormRut] = useState({
    loai_vi: 'quan_an',
    id_chu_vi: null,
    id_bank_account: '',
    so_tien_rut: ''
  });

  const [formBank, setFormBank] = useState({
    loai_chu: 'quan_an',
    id_chu: null,
    ten_ngan_hang: '',
    so_tai_khoan: '',
    chu_tai_khoan: '',
    chi_nhanh: '',
    is_default: false
  });

  const dsNganHang = ['MB Bank', 'Vietcombank', 'Techcombank', 'VPBank', 'BIDV', 'Agribank', 'VietinBank', 'ACB', 'TPBank', 'SHB', 'MSB', 'OCB', 'HDBank'];

  useEffect(() => {
    loadInit();
  }, []);

  const loadInit = async () => {
    try {
      const res = await api.get('/api/quan-an/data-login');
      if (res.data.status && res.data.data) {
        const id = res.data.data.id;
        setIdQuanAn(id);
        setFormRut(prev => ({ ...prev, id_chu_vi: id }));
        setFormBank(prev => ({ ...prev, id_chu: id }));
        loadAll(id);
      }
    } catch {}
  };

  const loadAll = (id) => {
    loadGiaoDich(id);
    loadLichSuRut(id);
    loadBankAccounts(id);
  };

  const loadGiaoDich = async (id) => {
    setLoadingGd(true);
    try {
      const res = await api.get('/api/wallet/chi-tiet', { params: { loai_vi: 'quan_an', id_chu_vi: id } });
      if (res.data.status) {
        setWallet(res.data.data?.vi || {});
        setGiaoDich(res.data.data?.giao_dich || []);
      }
    } catch {}
    finally { setLoadingGd(false); }
  };

  const loadLichSuRut = async (id) => {
    try {
      const res = await api.get('/api/wallet/lich-su-rut', { params: { loai_vi: 'quan_an', id_chu_vi: id } });
      setLichSuRut(res.data?.data || []);
      if (res.data?.vi) setWallet(res.data.vi);
    } catch {}
  };

  const loadBankAccounts = async (id) => {
    try {
      const res = await api.get('/api/wallet/tai-khoan', { params: { loai_chu: 'quan_an', id_chu: id } });
      const banks = res.data?.data || [];
      setBankAccounts(banks);
      const macDinh = banks.find(b => b.is_default);
      if (macDinh) setFormRut(prev => ({ ...prev, id_bank_account: macDinh.id }));
    } catch {}
  };

  const handleRutTien = async () => {
    if (!formRut.so_tien_rut || Number(formRut.so_tien_rut) < 10000) return toast.error('Số tiền rút tối thiểu là 10.000đ');
    if (!formRut.id_bank_account) return toast.error('Vui lòng chọn tài khoản nhận');
    setSubmitting(true);
    try {
      const res = await api.post('/api/wallet/yeu-cau-rut-tien', formRut);
      if (res.data.status) {
        toast.success(res.data.message);
        setFormRut(prev => ({ ...prev, so_tien_rut: '' }));
        loadAll(idQuanAn);
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleThemBank = async () => {
    if (!formBank.ten_ngan_hang || !formBank.so_tai_khoan || !formBank.chu_tai_khoan) return toast.error('Vui lòng điền đủ thông tin bắt buộc');
    try {
      const res = await api.post('/api/wallet/them-tai-khoan', formBank);
      if (res.data.status) {
        toast.success(res.data.message);
        setFormBank(prev => ({ ...prev, ten_ngan_hang: '', so_tai_khoan: '', chu_tai_khoan: '', chi_nhanh: '', is_default: false }));
        setShowBankModal(false);
        loadBankAccounts(idQuanAn);
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Gặp sự cố kết nối!');
    }
  };

  const handleDeleteBank = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    try {
      const res = await api.post('/api/wallet/xoa-tai-khoan', { id });
      if (res.data.status) {
        toast.success(res.data.message);
        loadBankAccounts(idQuanAn);
      }
    } catch {}
  };

  const formatStatus = (st) => {
    const s = {
      cho_duyet: <span className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 rounded-full">Chờ duyệt</span>,
      da_duyet: <span className="px-2.5 py-1 text-xs font-bold text-blue-800 bg-blue-100 rounded-full">Đã duyệt</span>,
      da_chuyen: <span className="px-2.5 py-1 text-xs font-bold text-green-800 bg-green-100 rounded-full">Hoàn tất</span>,
      tu_choi: <span className="px-2.5 py-1 text-xs font-bold text-red-800 bg-red-100 rounded-full">Từ chối</span>
    };
    return s[st] || <span className="px-2.5 py-1 text-xs font-bold text-gray-800 bg-gray-100 rounded-full">{st}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-400 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-20 translate-x-20"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shrink-0"><i className="fa-solid fa-wallet"></i></div>
            <div>
              <p className="text-teal-50 font-bold uppercase tracking-wider text-sm mb-1">Ví Thu Nhập Quán Ăn</p>
              <h2 className="text-4xl md:text-5xl font-black drop-shadow-md">{formatVND(wallet.so_du || 0)}</h2>
              <p className="text-teal-50 text-sm mt-1 flex items-center gap-1.5"><i className="fa-solid fa-shield-check"></i> Số dư khả dụng hiện tại</p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex-1 md:w-44 border border-white/20">
              <p className="text-sm text-teal-100 mb-1 flex items-center gap-1.5"><i className="fa-solid fa-arrow-down-to-line"></i> Tổng thu nhập</p>
              <p className="text-xl font-bold">{formatVND(wallet.tong_tien_nhan || 0)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex-1 md:w-44 border border-white/20">
              <p className="text-sm text-teal-100 mb-1 flex items-center gap-1.5"><i className="fa-solid fa-arrow-up-from-line"></i> Tổng đã rút</p>
              <p className="text-xl font-bold">{formatVND(wallet.tong_tien_rut || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: TABS */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
            <div className="flex border-b border-gray-100 px-6 pt-2">
              <button onClick={()=>setActiveTab('giao_dich')} className={`pb-4 pt-4 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab==='giao_dich'?'border-teal-500 text-teal-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <i className="fa-solid fa-clock-rotate-left"></i> Lịch Sử Giao Dịch <span className="bg-teal-100 text-teal-700 py-0.5 px-2 rounded-full text-xs">{giaoDich.length}</span>
              </button>
              <button onClick={()=>setActiveTab('rut_tien')} className={`pb-4 pt-4 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab==='rut_tien'?'border-teal-500 text-teal-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <i className="fa-solid fa-money-bill-transfer"></i> Lịch Sử Rút Tiền <span className="bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs">{lichSuRut.length}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto w-full p-2 bg-gray-50/50">
              {activeTab === 'giao_dich' && (
                loadingGd ? <div className="p-8 text-center text-gray-400"><i className="fa-solid fa-spinner fa-spin text-4xl mb-3"/> <p>Đang tải dữ liệu...</p></div>
                : giaoDich.length === 0 ? <div className="p-16 text-center text-gray-400"><i className="fa-regular fa-folder-open text-6xl mb-4 text-gray-200 block"/> Chưa có giao dịch nào</div>
                : giaoDich.map((gd, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white p-4 mx-4 my-2 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${gd.loai_giao_dich === 'credit' ? 'bg-teal-100 text-teal-600' : 'bg-rose-100 text-rose-600'}`}>
                       <i className={`fa-solid text-xl ${gd.loai_giao_dich === 'credit' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}/>
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-bold text-gray-800 truncate">{gd.mo_ta || 'Giao dịch hệ thống'}</p>
                       <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><i className="fa-regular fa-clock"/> {formatDate(gd.created_at)}</p>
                     </div>
                     <div className="text-right shrink-0">
                       <p className={`font-black tracking-tight ${gd.loai_giao_dich==='credit'?'text-teal-600':'text-rose-600'}`}>
                         {gd.loai_giao_dich==='credit'?'+':'-'}{formatVND(gd.so_tien)}
                       </p>
                       <p className="text-xs text-gray-400 mt-0.5">Dư: {formatVND(gd.so_du_sau)}</p>
                     </div>
                  </div>
                ))
              )}

              {activeTab === 'rut_tien' && (
                lichSuRut.length === 0 ? <div className="p-16 text-center text-gray-400"><i className="fa-solid fa-building-columns text-6xl mb-4 text-gray-200 block"/> Chưa có yêu cầu rút tiền</div>
                : lichSuRut.map((rut, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white p-4 mx-4 my-2 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                     <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                       <i className="fa-solid fa-money-check-dollar text-xl"/>
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-bold text-gray-800 mb-0.5">Yêu cầu rút tiền</p>
                       {rut.bank_account ? (
                         <p className="text-xs text-gray-500 font-medium truncate mb-1">
                           {rut.bank_account.ten_ngan_hang} • {rut.bank_account.chu_tai_khoan} • ****{rut.bank_account.so_tai_khoan?.slice(-4)}
                         </p>
                       ) : <p className="text-xs text-gray-400 truncate mb-1">Thông tin ngân hàng không khả dụng</p>}
                       <p className="text-xs text-gray-400 flex items-center gap-1"><i className="fa-regular fa-clock"/> {formatDate(rut.created_at)}</p>
                       {rut.ghi_chu_admin && <p className="text-xs text-rose-500 mt-1.5 italic px-2 py-1 bg-rose-50 rounded-lg inline-block w-full truncate"><i className="fa-solid fa-circle-info mr-1"/>{rut.ghi_chu_admin}</p>}
                     </div>
                     <div className="text-right shrink-0 flex flex-col justify-between items-end h-full">
                       <p className="font-black tracking-tight text-gray-900 mb-2">{formatVND(rut.so_tien_rut)}</p>
                       {formatStatus(rut.trang_thai)}
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIONS */}
        <div className="flex flex-col gap-6">
          
          {/* Withdrawal Form */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center"><i className="fa-solid fa-hand-holding-dollar"/></div> Rút Tiền Về Bank
            </h3>
            <div className="space-y-4">
              <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số tiền cần rút</label>
                 <div className="relative">
                   <input value={formRut.so_tien_rut} onChange={e=>setFormRut({...formRut, so_tien_rut: e.target.value})} type="number" placeholder="Tối thiểu 100,000" className="w-full pl-4 pr-16 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-gray-800" />
                   <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none font-bold text-gray-400">VNĐ</div>
                 </div>
                 <p className="text-xs text-gray-500 mt-1.5 ml-1">Số dư hiện tại: <span className="font-bold text-teal-600">{formatVND(wallet.so_du)}</span></p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tài khoản nhận</label>
                {bankAccounts.length === 0 ? (
                  <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-200 text-sm flex items-start gap-2">
                    <i className="fa-solid fa-triangle-exclamation mt-0.5"></i> <span>Bạn chưa thêm tài khoản ngân hàng nào. Vui lòng thêm trước khi rút tiền.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-1 scrollbar-hide">
                    {bankAccounts.map((b, i) => (
                      <div key={i} onClick={()=>setFormRut({...formRut, id_bank_account: b.id})} className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${formRut.id_bank_account === b.id ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-100 hover:border-teal-300'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${formRut.id_bank_account === b.id ? 'border-teal-500 bg-teal-500' : 'border-gray-300'}`}>
                          {formRut.id_bank_account === b.id && <div className="w-2 h-2 bg-white rounded-full"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{b.chu_tai_khoan}</p>
                          <p className="text-xs text-gray-500 truncate">{b.ten_ngan_hang} • ****{b.so_tai_khoan?.slice(-4)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button disabled={submitting || bankAccounts.length===0} onClick={handleRutTien} className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-2">
                {submitting ? <i className="fa-solid fa-spinner fa-spin"/> : 'Gửi Yêu Cầu Rút Tiền'}
              </button>
            </div>
          </div>

          {/* Bank Management */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[320px]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="fa-solid fa-building-columns text-teal-600"/> Hệ Thống Banks</h3>
              <button onClick={()=>setShowBankModal(true)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"><i className="fa-solid fa-plus mr-1"/>  Thêm Ngân Hàng</button>
            </div>
            <div className="flex-1 p-2 overflow-y-auto">
               {bankAccounts.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-gray-400"><i className="fa-regular fa-credit-card text-4xl mb-2 text-gray-300"/> <p className="text-sm">Chưa liên kết thẻ</p></div>
               : bankAccounts.map((b,i)=>(
                 <div key={i} className="flex justify-between items-center p-3 mx-2 my-2 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0 tracking-tighter">BANK</div>
                      <div className="min-w-0">
                         <p className="text-sm font-bold text-gray-800 truncate">{b.ten_ngan_hang}</p>
                         <p className="text-xs text-gray-500 truncate mt-0.5">{b.chu_tai_khoan} • ****{b.so_tai_khoan?.slice(-4)}</p>
                      </div>
                    </div>
                    <button onClick={()=>handleDeleteBank(b.id)} className="w-8 h-8 rounded-full text-red-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors shrink-0"><i className="fa-solid fa-trash-can"/></button>
                 </div>
               ))}
            </div>
          </div>

        </div>
      </div>

      {/* BANK ADD MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out]">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-5 text-white flex justify-between items-center">
               <h3 className="font-bold text-lg flex items-center gap-2"><i className="fa-solid fa-link"/> Liên Kết Ngân Hàng</h3>
               <button onClick={()=>setShowBankModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"><i className="fa-solid fa-times"/></button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Ngân Hàng <span className="text-red-500">*</span></label>
                 <select value={formBank.ten_ngan_hang} onChange={(e)=>setFormBank({...formBank, ten_ngan_hang:e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-teal-500">
                    <option value="">Chọn Nhãn Hiệu Bank...</option>
                    {dsNganHang.map(n=><option key={n} value={n}>{n}</option>)}
                 </select>
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Số Tài Khoản <span className="text-red-500">*</span></label>
                  <input value={formBank.so_tai_khoan} onChange={(e)=>setFormBank({...formBank, so_tai_khoan:e.target.value})} type="text" placeholder="Ghi đúng STK..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-teal-500"/>
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Chủ Tài Khoản <span className="text-red-500">*</span></label>
                  <input value={formBank.chu_tai_khoan} onChange={(e)=>setFormBank({...formBank, chu_tai_khoan:e.target.value.toUpperCase()})} type="text" placeholder="Chữ in hoa không dấu (Vd: NGUYEN VAN A)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-teal-500 uppercase"/>
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Chi Nhánh</label>
                  <input value={formBank.chi_nhanh} onChange={(e)=>setFormBank({...formBank, chi_nhanh:e.target.value})} type="text" placeholder="Không bắt buộc" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-teal-500"/>
               </div>
               <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${formBank.is_default ? 'bg-teal-500' : 'bg-gray-200'}`}>
                    {formBank.is_default && <i className="fa-solid fa-check text-white text-xs"/>}
                  </div>
                  <input type="checkbox" className="hidden" checked={formBank.is_default} onChange={(e)=>setFormBank({...formBank, is_default:e.target.checked})} />
                  <span className="text-sm font-semibold text-gray-700">Đây là tài khoản nhận tiền chính</span>
               </label>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
               <button onClick={()=>setShowBankModal(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">Hủy Bỏ</button>
               <button onClick={handleThemBank} className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl shadow-md transition-colors">Lưu Thông Tin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
