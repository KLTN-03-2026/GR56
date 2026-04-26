import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';
import { adminEventBus } from '../../layouts/AdminLayout';

const adm = (url, method='get', data=null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method==='get' ? api.get(url,cfg) : api.post(url,data,cfg);
};
const fDT = (s) => { if(!s) return '—'; const d=new Date(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

const TT_MAP = {
  cho_duyet:    { label:'Chờ duyệt',        cls:'bg-yellow-100 text-yellow-700 border-yellow-200', icon:'fa-hourglass-half' },
  da_duyet:     { label:'Đã duyệt',          cls:'bg-blue-100 text-blue-700 border-blue-200',       icon:'fa-check' },
  dang_chuyen:  { label:'PayOS đang xử lý',  cls:'bg-purple-100 text-purple-700 border-purple-200', icon:'fa-spinner fa-spin' },
  da_chuyen:    { label:'Đã chuyển khoản',   cls:'bg-green-100 text-green-700 border-green-200',    icon:'fa-check-double' },
  tu_choi:      { label:'Từ chối',           cls:'bg-red-100 text-red-600 border-red-200',          icon:'fa-times' },
};

const MAP_VIETQR = {
  'MB Bank': 'MB', 'Vietcombank': 'VCB', 'Techcombank': 'TCB', 'VPBank': 'VPB',
  'BIDV': 'BIDV', 'Agribank': 'VBA', 'VietinBank': 'ICB', 'ACB': 'ACB',
  'TPBank': 'TPB', 'SHB': 'SHB', 'MSB': 'MSB', 'OCB': 'OCB', 'HDBank': 'HDB'
};

function Modal({ open, onClose, title, headerCls, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className={`p-5 ${headerCls} rounded-t-3xl flex items-center justify-between`}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl"/></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        {footer && <div className="p-4 border-t flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

// ====================== TAB 1: RÚT TIỀN ======================
function TabRutTien() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterTT, setFilterTT] = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [selected, setSelected] = useState(null);
  const [ghiChu, setGhiChu] = useState('');
  const [showDuyet, setShowDuyet] = useState(false);
  const [showTuChoi, setShowTuChoi] = useState(false);
  const [showCK, setShowCK] = useState(false);
  const [showPayOSDetail, setShowPayOSDetail] = useState(false);
  const [payosDetail, setPayosDetail] = useState(null);
  const [loadingPayOS, setLoadingPayOS] = useState(false);

  useEffect(()=>{fetchList();},[]);
  const fetchList = async () => { setLoading(true); try{const r=await adm('/api/admin/withdraw/data');setList(r.data.data||[]);}catch{toast.error('Lỗi tải dữ liệu');}finally{setLoading(false);} };

  const filtered = useMemo(()=>list.filter(i=>(!filterTT||i.trang_thai===filterTT)&&(!filterLoai||i.loai_vi===filterLoai)),[list,filterTT,filterLoai]);
  const demTT = (tt) => list.filter(i=>i.trang_thai===tt).length;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const currentItems = useMemo(() => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage]);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [filterTT, filterLoai]);

  const openModal = (item, type) => { setSelected(item); setGhiChu(''); if(type==='duyet')setShowDuyet(true); else if(type==='tuchoi')setShowTuChoi(true); else setShowCK(true); };

  const xemPayOS = async (item) => {
    setSelected(item);
    setShowPayOSDetail(true);
    setLoadingPayOS(true);
    try {
      const r = await adm(`/api/admin/payos/payout/${item.payos_payout_id}`);
      setPayosDetail(r.data.data || null);
    } catch { toast.error('Không thể tải thông tin PayOS'); }
    finally { setLoadingPayOS(false); }
  };

  const submit = async (url, extraValidate=null) => {
    if(extraValidate) { if(!ghiChu.trim()){toast.error(extraValidate);return;} }
    setSubmitting(true);
    try {
      const r = await adm(url,'post',{id:selected.id,ghi_chu:ghiChu});
      if(r.data.status){
        // Hiển thị thông tin PayOS nếu có
        if(r.data.payout_id){
          toast.success(`✅ ${r.data.message}\nPayOS ID: ${r.data.payout_id}`, {duration: 5000});
        } else if(r.data.payos_error) {
          toast(`⚠️ ${r.data.message}`, {icon:'⚠️', duration:6000, style:{background:'#fffbeb',border:'1px solid #fbbf24'}});
        } else {
          toast.success(r.data.message);
        }
        setShowDuyet(false); setShowTuChoi(false); setShowCK(false);
        fetchList();
      } else toast.error(r.data.message);
    }
    catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} finally{setSubmitting(false);}
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(()=>toast.success('Đã copy!')).catch(()=>toast.error('Copy thất bại')); };

  const PAYOS_STATE_MAP = {
    'PROCESSING': { label: 'Đang xử lý', cls: 'bg-yellow-100 text-yellow-700' },
    'COMPLETED':  { label: 'Hoàn thành', cls: 'bg-green-100 text-green-700' },
    'FAILED':     { label: 'Thất bại',   cls: 'bg-red-100 text-red-700' },
    'CANCELLED':  { label: 'Đã huỷ',    cls: 'bg-gray-100 text-gray-700' },
  };

  return (
    <div className="space-y-5 mt-6">
      {/* Modal Duyệt — có PayOS tự động */}
      <Modal open={showDuyet} onClose={()=>setShowDuyet(false)} title="Duyệt & Chuyển Tiền Tự Động (PayOS)" headerCls="bg-gradient-to-r from-green-600 to-emerald-600"
        footer={<><button onClick={()=>setShowDuyet(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={()=>submit('/api/admin/withdraw/approve')} disabled={submitting} className="px-6 py-2 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 disabled:opacity-60">
            {submitting?<><i className="fa-solid fa-spinner fa-spin mr-2"/>Đang xử lý...</>:<><i className="fa-solid fa-bolt mr-2"/>Duyệt & Chuyển tự động</>}</button></>}>
        {selected && <div className="space-y-3">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-sm space-y-2">
            <div className="font-bold text-gray-800">{selected.ten_chu} <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${selected.loai_vi==='shipper'?'bg-cyan-100 text-cyan-700':'bg-orange-100 text-orange-700'}`}>{selected.loai_vi==='shipper'?'Shipper':'Quán Ăn'}</span></div>
            <div className="text-red-600 font-bold text-xl">{formatVND(selected.so_tien_rut)}</div>
            {selected.bank_account && <div className="text-gray-600 text-xs">{selected.bank_account.ten_ngan_hang} • {selected.bank_account.chu_tai_khoan} • ****{selected.bank_account.so_tai_khoan?.slice(-4)}</div>}
          </div>
          {/* PayOS Info Banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
            <i className="fa-solid fa-robot text-purple-500 mt-0.5 text-sm"/>
            <div className="text-xs text-purple-700">
              <div className="font-bold mb-0.5">Chuyển tiền tự động qua PayOS</div>
              Hệ thống sẽ <b>tự động gửi lệnh chi</b> đến ngân hàng của người nhận ngay sau khi bạn duyệt. Không cần chuyển thủ công.
            </div>
          </div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú (tùy chọn)</label>
            <textarea rows={2} value={ghiChu} onChange={e=>setGhiChu(e.target.value)} placeholder="VD: Đã kiểm tra thông tin..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 resize-none"/></div>
        </div>}
      </Modal>

      <Modal open={showTuChoi} onClose={()=>setShowTuChoi(false)} title="Từ Chối Yêu Cầu" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowTuChoi(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={()=>submit('/api/admin/withdraw/reject','Vui lòng nhập lý do từ chối!')} disabled={submitting} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-60">
            {submitting?<i className="fa-solid fa-spinner fa-spin mr-2"/>:<i className="fa-solid fa-times mr-2"/>}Xác nhận từ chối</button></>}>
        {selected && <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm"><b>{selected.ten_chu}</b> — {formatVND(selected.so_tien_rut)}</div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Lý do từ chối <span className="text-red-400">*</span></label>
            <textarea rows={3} value={ghiChu} onChange={e=>setGhiChu(e.target.value)} placeholder="Nhập lý do từ chối..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 resize-none"/></div>
        </div>}
      </Modal>

      {/* Modal Xác nhận chuyển khoản (dành cho da_duyet - chuyển thủ công) */}
      <Modal open={showCK} onClose={()=>setShowCK(false)} title="Xác Nhận Đã Chuyển Khoản" headerCls="bg-gradient-to-r from-indigo-500 to-purple-600"
        footer={<><button onClick={()=>setShowCK(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={()=>submit('/api/admin/withdraw/confirm-transfer')} disabled={submitting} className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-60">
            {submitting?<i className="fa-solid fa-spinner fa-spin mr-2"/>:<i className="fa-solid fa-check-double mr-2"/>}Xác nhận đã chuyển</button></>}>
        {selected && <div className="space-y-3">
          {selected.bank_account && <div className="text-center">
            <img src={`https://img.vietqr.io/image/${MAP_VIETQR[selected.bank_account.ten_ngan_hang]||selected.bank_account.ten_ngan_hang?.replace(/\s+/g,'')}-${selected.bank_account.so_tai_khoan}-qr_only.png?amount=${selected.so_tien_rut}&addInfo=${selected.noi_dung_chuyen_khoan||''}`} alt="QR" className="mx-auto max-w-48 rounded-2xl border shadow-sm" onError={e=>e.target.style.display='none'}/>
            <p className="text-xs text-gray-400 mt-2"><i className="fa-solid fa-qrcode mr-1"/>Quét mã QR để chuyển khoản</p>
          </div>}
          <div className="bg-gray-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-1.5">
            <div className="text-gray-400 text-xs">Người nhận:</div><div className="font-semibold text-xs">{selected.ten_chu}</div>
            <div className="text-gray-400 text-xs">Số tiền:</div><div className="font-bold text-red-600 text-sm">{formatVND(selected.so_tien_rut)}</div>
            {selected.bank_account && <>
              <div className="text-gray-400 text-xs">Ngân hàng:</div><div className="text-xs">{selected.bank_account.ten_ngan_hang}</div>
              <div className="text-gray-400 text-xs">Số TK:</div><div className="font-bold tracking-widest text-xs">{selected.bank_account.so_tai_khoan}</div>
              <div className="text-gray-400 text-xs">Chủ TK:</div><div className="text-xs">{selected.bank_account.chu_tai_khoan}</div>
            </>}
            {selected.noi_dung_chuyen_khoan && <>
              <div className="text-gray-400 text-xs">Nội dung:</div>
              <div className="flex items-center gap-1"><code className="text-blue-600 text-xs font-bold">{selected.noi_dung_chuyen_khoan}</code>
                <button onClick={()=>copyToClipboard(selected.noi_dung_chuyen_khoan)} className="text-gray-400 hover:text-blue-500"><i className="fa-solid fa-copy text-xs"/></button></div>
            </>}
          </div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Mã giao dịch (tùy chọn)</label>
            <input value={ghiChu} onChange={e=>setGhiChu(e.target.value)} placeholder="VD: GD2024030112345678" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"/></div>
        </div>}
      </Modal>

      {/* Modal Chi tiết PayOS Payout */}
      <Modal open={showPayOSDetail} onClose={()=>{setShowPayOSDetail(false);setPayosDetail(null);}} title="Chi tiết lệnh chi PayOS" headerCls="bg-gradient-to-r from-purple-600 to-indigo-600">
        {selected && <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-xl p-3">
            <i className="fa-solid fa-robot"/>
            <span>Lệnh chi được tạo tự động bởi PayOS Payout API</span>
          </div>
          {loadingPayOS ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"/></div>
          : payosDetail ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">PayOS ID:</span><code className="text-xs text-purple-700 font-bold">{payosDetail.id || selected.payos_payout_id}</code></div>
                <div className="flex justify-between"><span className="text-gray-500">Reference:</span><code className="text-xs text-blue-600">{payosDetail.referenceId || selected.payos_reference}</code></div>
                <div className="flex justify-between"><span className="text-gray-500">Trạng thái PayOS:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PAYOS_STATE_MAP[payosDetail.approvalState]?.cls || 'bg-gray-100 text-gray-700'}`}>
                    {PAYOS_STATE_MAP[payosDetail.approvalState]?.label || payosDetail.approvalState}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Thời gian:</span><span className="text-xs">{fDT(payosDetail.createdAt)}</span></div>
              </div>
              {payosDetail.transactions && payosDetail.transactions.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-blue-700 mb-2">Giao dịch chi tiết</div>
                  {payosDetail.transactions.map((tx, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-500">→ {tx.toAccountNumber} ({tx.toAccountName})</span>
                      <span className="font-bold text-green-700">{formatVND(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">PayOS Payout ID:</span><code className="text-xs text-purple-700 font-bold">{selected.payos_payout_id}</code></div>
              <div className="flex justify-between"><span className="text-gray-500">Reference:</span><code className="text-xs text-blue-600">{selected.payos_reference}</code></div>
              <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PAYOS_STATE_MAP[selected.payos_state]?.cls || 'bg-gray-100 text-gray-700'}`}>
                  {PAYOS_STATE_MAP[selected.payos_state]?.label || selected.payos_state || '—'}
                </span>
              </div>
            </div>
          )}
        </div>}
      </Modal>

      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Danh Sách Yêu Cầu Rút Tiền</h2><p className="text-gray-400 text-sm mt-1">{list.length} yêu cầu</p></div>
        <div className="flex gap-3">
          <ExcelButton disabled={filtered.length === 0} onClick={() => exportToExcel(
            filtered.map((item, i) => ({ ...item, __stt: i + 1 })),
            [
              { label: 'STT',          key: '__stt',         width: 6 },
              { label: 'Người rút',   key: 'ten_chu',       width: 25 },
              { label: 'Nguồn',       key: 'loai_vi',       width: 15, format: v => v === 'shipper' ? 'Shipper' : 'Quán Ăn' },
              { label: 'Số tiền',     key: 'so_tien_rut',   width: 14, format: v => Number(v).toLocaleString('vi-VN') },
              { label: 'Ngân hàng',   key: 'bank_account',  width: 25, format: v => v ? v.ten_ngan_hang : '—' },
              { label: 'Số tài khoản', key: 'bank_account',  width: 20, format: v => v ? v.so_tai_khoan : '—' },
              { label: 'Tên tài khoản', key: 'bank_account',  width: 25, format: v => v ? v.chu_tai_khoan : '—' },
              { label: 'Nội dung CK', key: 'noi_dung_chuyen_khoan', width: 20 },
              { label: 'Trạng thái',  key: 'trang_thai',    width: 20, format: v => ({'cho_duyet':'Chờ duyệt','da_duyet':'Đã duyệt','dang_chuyen':'Đang xử lý','da_chuyen':'Đã chuyển','tu_choi':'Từ chối'})[v] || v },
              { label: 'Thời gian',   key: 'created_at',    width: 20, format: v => v ? new Date(v).toLocaleString('vi-VN') : '' },
            ],
            'RutTien', 'Rút Tiền'
          )} />
          <button onClick={fetchList} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700"><i className="fa-solid fa-rotate-right"/>Làm mới</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[['cho_duyet','Chờ duyệt','bg-yellow-50 border-yellow-200','text-yellow-600','bg-yellow-400','fa-hourglass-half'],
          ['da_duyet','Đã duyệt (thủ công)','bg-blue-50 border-blue-200','text-blue-600','bg-blue-500','fa-check'],
          ['dang_chuyen','PayOS đang xử lý','bg-purple-50 border-purple-200','text-purple-600','bg-purple-500','fa-bolt'],
          ['da_chuyen','Đã chuyển xong','bg-green-50 border-green-200','text-green-600','bg-green-500','fa-check-double'],
          ['tu_choi','Từ chối','bg-red-50 border-red-200','text-red-600','bg-red-500','fa-times']].map(([tt,label,bgCls,txtCls,iconBg,icon])=>(
          <div key={tt} className={`${bgCls} rounded-2xl border p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all ${filterTT===tt?'ring-2 ring-offset-1 ring-gray-400':''}`} onClick={()=>setFilterTT(filterTT===tt?'':tt)}>
            <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}><i className={`fa-solid ${icon} text-white text-sm`}/></div>
            <div><div className="text-xs font-semibold text-gray-500 leading-tight">{label}</div>
              <div className={`text-2xl font-extrabold ${txtCls}`}>{demTT(tt)}</div></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <select value={filterLoai} onChange={e=>setFilterLoai(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 min-w-40">
          <option value="">Tất cả nguồn</option><option value="quan_an">Từ Quán Ăn</option><option value="shipper">Từ Shipper</option>
        </select>
        {(filterTT||filterLoai) && <button onClick={()=>{setFilterTT('');setFilterLoai('');}} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200"><i className="fa-solid fa-xmark mr-1"/>Bỏ lọc</button>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-green-100 border-t-green-500 rounded-full animate-spin"/></div>
        : filtered.length===0 ? <div className="text-center py-24"><i className="fa-solid fa-inbox text-6xl text-gray-200 mb-4 block"/><p className="text-gray-400">Không có yêu cầu rút tiền nào</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-green-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-left">Người rút</th>
              <th className="px-4 py-3 text-center">Nguồn</th>
              <th className="px-4 py-3 text-right">Số tiền</th>
              <th className="px-4 py-3 text-left">Tài khoản NH</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-center">PayOS</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((item,i)=>{
                const tt = TT_MAP[item.trang_thai]||{label:item.trang_thai,cls:'bg-gray-100 text-gray-600 border-gray-200',icon:'fa-circle'};
                return (
                  <tr key={item.id||i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*itemsPerPage+i+1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{item.ten_chu}</div>
                      <div className="text-xs text-gray-400">ID ví: #{item.id_wallet}</div>
                    </td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.loai_vi==='shipper'?'bg-cyan-100 text-cyan-700':'bg-orange-100 text-orange-700'}`}>{item.loai_vi==='shipper'?<><i className="fa-solid fa-motorcycle mr-1"/>Shipper</>:<><i className="fa-solid fa-store mr-1"/>Quán Ăn</>}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-red-600">{formatVND(item.so_tien_rut)}</div>
                      {item.noi_dung_chuyen_khoan && <div className="text-xs text-blue-500 font-semibold tracking-wide cursor-pointer" onClick={()=>copyToClipboard(item.noi_dung_chuyen_khoan)}><i className="fa-solid fa-copy mr-1"/>Copy ND</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {item.bank_account ? <>
                        <div className="font-semibold">{item.bank_account.ten_ngan_hang}</div>
                        <div className="text-gray-400 tracking-widest">****{item.bank_account.so_tai_khoan?.slice(-4)}</div>
                      </> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${tt.cls}`}>
                          <i className={`fa-solid ${tt.icon} text-xs`}/>{tt.label}
                        </span>
                        {item.ghi_chu_admin && <div className="text-xs text-gray-400 mt-1 max-w-32 truncate" title={item.ghi_chu_admin}>{item.ghi_chu_admin}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.payos_payout_id ? (
                        <button onClick={()=>xemPayOS(item)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs hover:bg-purple-200 font-semibold mx-auto">
                          <i className="fa-solid fa-bolt text-xs"/>
                          <span>{item.payos_state === 'PROCESSING' ? 'Đang xử lý' : item.payos_state === 'COMPLETED' ? 'Hoàn thành' : (item.payos_state || 'Xem')}</span>
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.trang_thai==='cho_duyet' ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={()=>openModal(item,'duyet')} className="px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs hover:bg-green-200 font-semibold" title="Duyệt & PayOS tự chuyển"><i className="fa-solid fa-bolt"/></button>
                          <button onClick={()=>openModal(item,'tuchoi')} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200 font-semibold"><i className="fa-solid fa-times"/></button>
                        </div>
                      ) : item.trang_thai==='da_duyet' ? (
                        <button onClick={()=>openModal(item,'ck')} className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-xs hover:bg-indigo-200 font-semibold"><i className="fa-solid fa-money-bill-transfer mr-1"/>CK thủ công</button>
                      ) : item.trang_thai==='dang_chuyen' ? (
                        <button onClick={()=>openModal(item,'ck')} className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-xs hover:bg-purple-200 font-semibold"><i className="fa-solid fa-check mr-1"/>Xác nhận xong</button>
                      ) : <span className="text-gray-300 text-xs">Hoàn tất</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> trong <span className="font-bold text-gray-800">{filtered.length}</span> yêu cầu
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <div className="flex gap-1 text-sm font-semibold">
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={`dots-${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                    return null;
                  })}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>
            </div>
          )}
          </div>
        }
      </div>
    </div>
  );
}

// ====================== TAB 2: NỘP TIỀN SHIPPER ======================
function TabNopTienShipper() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingID, setSubmittingID] = useState(null);
  const [frmTien, setFrmTien] = useState({});
  const [frmNote, setFrmNote] = useState({});

  useEffect(()=>{ fetchList(); },[]);
  const fetchList = async () => { setLoading(true); try{const r=await adm('/api/admin/wallet/danh-sach-shipper'); setList(r.data.data||[]);}catch{toast.error('Lỗi lấy DS Shipper')}finally{setLoading(false);} };

  const nopTien = async (shipper) => {
    const amount = parseFloat(frmTien[shipper.id]);
    if (!amount || amount < 1000) return toast.error("Số tiền tối thiểu 1.000đ");
    if(!confirm(`Xác nhận nộp ${formatVND(amount)} vào ví của Shipper ${shipper.ho_va_ten}?`)) return;
    setSubmittingID(shipper.id);
    try {
      const r = await adm('/api/admin/wallet/nop-tien-shipper', 'post', { id_shipper: shipper.id, so_tien: amount, ghi_chu: frmNote[shipper.id]||'' });
      if(r.data.status) { toast.success(r.data.message); setFrmTien(prev=>({...prev, [shipper.id]:''})); setFrmNote(prev=>({...prev, [shipper.id]:''})); fetchList(); } else toast.error(r.data.message);
    } catch(e) { toast.error("Lỗi nộp tiền"); } finally { setSubmittingID(null); }
  };

  return (
    <div className="space-y-5 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Thu Tiền Mặt Shipper (Topup)</h2>
          <p className="text-gray-500 text-sm mt-1">Khi Shipper nộp tiền mặt đơn COD về, Admin nạp vào ví điện tử lại cho họ.</p>
        </div>
        <button onClick={fetchList} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 shadow-sm"><i className="fa-solid fa-rotate-right"/>Làm mới</button>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? <div className="col-span-12 text-center py-24"><div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"/></div>
        : list.map(shipper=>(
          <div key={shipper.id} className="bg-white rounded-3xl p-5 border border-indigo-50 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl shadow-inner">{shipper.ho_va_ten.charAt(0)}</div>
              <div>
                <div className="font-bold text-gray-800 text-base">{shipper.ho_va_ten}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1"><i className="fa-solid fa-phone text-indigo-400"/> {shipper.so_dien_thoai}</div>
              </div>
              <div className="ml-auto"><span className={`w-3 h-3 rounded-full inline-block ${shipper.is_active?'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]':'bg-gray-300'}`}></span></div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 mb-4 grid grid-cols-2 gap-2 text-center border border-gray-100">
              <div className="border-r border-gray-200">
                <div className="text-xs text-gray-400 font-medium">Số dư khả dụng</div>
                <div className="font-extrabold text-green-600">{formatVND(shipper.so_du)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Lịch sử thu/rút</div>
                <div className="text-xs text-gray-600 font-semibold"><span className="text-blue-500">+{formatVND(shipper.tong_tien_nhan)}</span> / <span className="text-red-500">-{formatVND(shipper.tong_tien_rut)}</span></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><i className="fa-solid fa-money-bill-wave"/></span>
                <input type="number" value={frmTien[shipper.id]||''} onChange={e=>setFrmTien({...frmTien,[shipper.id]:e.target.value})} placeholder="Số tiền nạp (VND)..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-semibold text-indigo-700"/>
              </div>
              <input type="text" value={frmNote[shipper.id]||''} onChange={e=>setFrmNote({...frmNote,[shipper.id]:e.target.value})} placeholder="Ghi chú (tùy chọn)..." className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"/>
              <button disabled={submittingID===shipper.id||!frmTien[shipper.id]} onClick={()=>nopTien(shipper)} className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:grayscale transition-all shadow-md">
                {submittingID===shipper.id ? <i className="fa-solid fa-spinner fa-spin mr-2"/> : <i className="fa-solid fa-paper-plane mr-2"/>} Xác Nhận Nạp Tiền
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ====================== TAB 3: PayOS PAYOUT HISTORY ======================
function TabPayOSPayout() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soDu, setSoDu] = useState(null);
  const [ketNoi, setKetNoi] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const currentItems = useMemo(() => payouts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [payouts, currentPage]);
  const totalPages = Math.ceil(payouts.length / itemsPerPage);

  useEffect(()=>{
    fetchAll();
  },[]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.allSettled([
        adm('/api/admin/payos/payout/danh-sach'),
        adm('/api/admin/payos/payout/so-du'),
        adm('/api/admin/payos/kiem-tra-ket-noi'),
      ]);
      if (r1.status === 'fulfilled') {
        const d = r1.value?.data?.data;
        const pts = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setPayouts(pts);
      }
      if(r2.status==='fulfilled') setSoDu(r2.value.data);
      if(r3.status==='fulfilled') setKetNoi(r3.value.data);
    } catch{}
    finally{setLoading(false);}
  };

  const PAYOS_STATE_MAP = {
    'PROCESSING': { label: 'Đang xử lý', cls: 'bg-yellow-100 text-yellow-700' },
    'COMPLETED':  { label: 'Hoàn thành', cls: 'bg-green-100 text-green-700' },
    'FAILED':     { label: 'Thất bại',   cls: 'bg-red-100 text-red-700' },
    'CANCELLED':  { label: 'Đã huỷ',    cls: 'bg-gray-100 text-gray-700' },
  };

  return (
    <div className="space-y-5 mt-6">
      {/* Kết nối status */}
      {ketNoi && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className={`rounded-2xl border p-4 flex items-center gap-4 ${ketNoi.payment?.ket_noi ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ketNoi.payment?.ket_noi ? 'bg-green-100' : 'bg-red-100'}`}>
              <i className={`fa-solid ${ketNoi.payment?.ket_noi ? 'fa-check-circle text-green-600' : 'fa-exclamation-circle text-red-600'} text-2xl`}/>
            </div>
            <div>
              <div className="font-bold text-gray-800 text-sm">Tài khoản Thanh toán</div>
              <div className="text-xs text-gray-500">Nhận tiền đơn hàng</div>
              <div className={`text-xs font-bold mt-0.5 ${ketNoi.payment?.ket_noi ? 'text-green-600' : 'text-red-500'}`}>{ketNoi.payment?.message}</div>
            </div>
          </div>
          <div className={`rounded-2xl border p-4 flex items-center gap-4 ${ketNoi.payout?.ket_noi ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ketNoi.payout?.ket_noi ? 'bg-purple-100' : 'bg-red-100'}`}>
              <i className={`fa-solid ${ketNoi.payout?.ket_noi ? 'fa-bolt text-purple-600' : 'fa-exclamation-circle text-red-600'} text-2xl`}/>
            </div>
            <div>
              <div className="font-bold text-gray-800 text-sm">Tài khoản Payout</div>
              <div className="text-xs text-gray-500">Chuyển tiền tự động</div>
              {ketNoi.payout?.ket_noi ? (
                <div className="text-sm font-extrabold text-purple-600 mt-0.5">{formatVND(ketNoi.payout?.so_du || 0)}</div>
              ) : (
                <div className="text-xs font-bold text-red-500 mt-0.5">{ketNoi.payout?.message}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900"><i className="fa-solid fa-bolt text-purple-500 mr-2"/>Lịch sử lệnh chi PayOS Payout</h2>
          <p className="text-gray-400 text-sm mt-1">Các lệnh chi tự động được tạo khi duyệt yêu cầu rút tiền</p>
        </div>
        <div className="flex gap-3">
          <ExcelButton color="blue" disabled={payouts.length === 0} onClick={() => exportToExcel(
            payouts,
            [
              { label: 'PayOS ID',    key: 'id',            width: 25 },
              { label: 'Reference',   key: 'referenceId',   width: 20 },
              { label: 'Số tiền',     key: 'amount',        width: 14, format: (v, item) => (item.transactions?.[0]?.amount || 0).toLocaleString('vi-VN') },
              { label: 'Trạng thái',  key: 'approvalState', width: 18, format: v => ({'PROCESSING':'Đang xử lý','COMPLETED':'Hoàn thành','FAILED':'Thất bại','CANCELLED':'Đã hủy'})[v] || v },
              { label: 'Thời gian',   key: 'createdAt',     width: 20, format: v => v ? new Date(v).toLocaleString('vi-VN') : '' },
            ],
            'PayOS_Payout', 'PayOS Payout'
          )} />
          <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700"><i className="fa-solid fa-rotate-right"/>Làm mới</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"/></div>
        : payouts.length === 0 ? <div className="text-center py-20"><i className="fa-solid fa-bolt text-6xl text-gray-200 mb-4 block"/><p className="text-gray-400">Chưa có lệnh chi nào</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-purple-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-4 py-3 text-left">PayOS ID</th>
              <th className="px-4 py-3 text-left">Reference</th>
              <th className="px-4 py-3 text-right">Số tiền</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-center">Ngày tạo</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((p, i) => (
                <tr key={p.id||i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3"><code className="text-xs text-purple-700 font-bold">{p.id}</code></td>
                  <td className="px-4 py-3"><code className="text-xs text-blue-600">{p.referenceId}</code></td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">
                    {p.transactions?.[0]?.amount ? formatVND(p.transactions[0].amount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PAYOS_STATE_MAP[p.approvalState]?.cls || 'bg-gray-100 text-gray-700'}`}>
                      {PAYOS_STATE_MAP[p.approvalState]?.label || p.approvalState}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{fDT(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, payouts.length)}</span> trong <span className="font-bold text-gray-800">{payouts.length}</span> lệnh chi
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <div className="flex gap-1 text-sm font-semibold">
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={`dots-${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                    return null;
                  })}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>
            </div>
          )}
          </div>
        }
      </div>
    </div>
  );
}

// ====================== TAB 5: LỊCH SỬ HOÀN TIỀN PAYOS ======================
const REFUND_STATUS_MAP = {
  success: { label: 'Đã hoàn tiền', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'fa-check-circle' },
  pending: { label: 'Đang xử lý',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200',   icon: 'fa-spinner fa-spin' },
  failed:  { label: 'Thất bại',    cls: 'bg-red-100 text-red-600 border-red-200',             icon: 'fa-times-circle' },
  null:    { label: 'Chưa hoàn',   cls: 'bg-gray-100 text-gray-500 border-gray-200',          icon: 'fa-clock' },
};

function TabHoanTienPayOS() {
  const [list, setList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [newRefundAlert, setNewRefundAlert] = useState(null);

  useEffect(() => { fetchList(1); }, [filterStatus]);

  // ── Real-time: tự reload khi có refund_failed từ AdminLayout ────────────
  useEffect(() => {
    const handler = ({ data }) => {
      setNewRefundAlert({ data, time: Date.now() });
      fetchList(1);
      setTimeout(() => setNewRefundAlert(null), 6000);
    };
    adminEventBus.on('reload_refunds', handler);
    return () => adminEventBus.off('reload_refunds', handler);
  }, []);
  // ────────────────────────────────────────────────────────────────────────


  const fetchList = async (page = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (filterStatus) params.append('refund_status', filterStatus);
      if (search.trim()) params.append('search', search.trim());
      const r = await adm(`/api/admin/refund/danh-sach?${params}`);
      const d = r.data.data;
      setList(d.data || []);
      setCurrentPage(d.current_page || 1);
      setTotalPages(d.last_page || 1);
      setTotalItems(d.total || 0);
      setStats(r.data.stats || null);
    } catch { toast.error('Lỗi tải dữ liệu hoàn tiền'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); fetchList(1); };

  const openConfirm = (item) => { setSelected(item); setShowConfirm(true); };

  const doManualRefund = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const r = await adm('/api/admin/refund/hoan-tien-thu-cong', 'post', { id_don_hang: selected.id });
      if (r.data.status) {
        toast.success(r.data.message);
        setShowConfirm(false);
        fetchList(currentPage);
      } else {
        toast.error(r.data.message);
      }
    } catch { toast.error('Lỗi kích hoạt hoàn tiền'); }
    finally { setSubmitting(false); }
  };

  const exportRef = () => exportToExcel(
    list.map((item, i) => ({
      ...item,
      __stt: i + 1,
      khach_hang_ten: item.khach_hang?.ho_va_ten || '—',
      khach_hang_sdt: item.khach_hang?.so_dien_thoai || '—',
    })),
    [
      { label: 'STT',          key: '__stt',          width: 6 },
      { label: 'Mã đơn hàng', key: 'ma_don_hang',    width: 18 },
      { label: 'Khách hàng',  key: 'khach_hang_ten', width: 25 },
      { label: 'SĐT',         key: 'khach_hang_sdt', width: 15 },
      { label: 'Số tiền (đ)', key: 'tong_tien',      width: 14, format: v => Number(v).toLocaleString('vi-VN') },
      { label: 'Trạng thái',  key: 'refund_status',  width: 15, format: v => ({ success:'Đã hoàn', pending:'Đang xử lý', failed:'Thất bại' })[v] || 'Chưa hoàn' },
      { label: 'Payout ID',   key: 'refund_payout_id', width: 30 },
      { label: 'Thời gian hoàn', key: 'refund_at',   width: 20, format: v => v ? new Date(v).toLocaleString('vi-VN') : '' },
      { label: 'Ngày hủy đơn', key: 'updated_at',   width: 20, format: v => v ? new Date(v).toLocaleString('vi-VN') : '' },
    ],
    'HoanTien_PayOS', 'Hoàn Tiền PayOS'
  );

  return (
    <div className="space-y-5 mt-6">
      {/* Confirm Modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Xác nhận hoàn tiền thủ công" headerCls="bg-gradient-to-r from-rose-500 to-pink-600"
        footer={<><button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={doManualRefund} disabled={submitting} className="px-6 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 disabled:opacity-60">
            {submitting ? <><i className="fa-solid fa-spinner fa-spin mr-2"/>Đang gửi...</> : <><i className="fa-solid fa-rotate-right mr-2"/>Kích hoạt hoàn tiền</>}
          </button></>}>
        {selected && <div className="space-y-3">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Mã đơn hàng:</span><code className="font-bold text-rose-700">{selected.ma_don_hang}</code></div>
            <div className="flex justify-between"><span className="text-gray-500">Khách hàng:</span><span className="font-semibold">{selected.khach_hang?.ho_va_ten || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Số tiền hoàn:</span><span className="font-extrabold text-rose-600 text-lg">{formatVND(selected.tong_tien)}</span></div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 text-sm"/>
            <p className="text-xs text-amber-700">Hệ thống sẽ <b>dispatch RefundPayOSJob ngay lập tức</b> để chuyển tiền từ tài khoản PayOS Payout về tài khoản ngân hàng mặc định của khách hàng.</p>
          </div>
        </div>}
      </Modal>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['Tổng đơn', stats.tong, 'bg-slate-50 border-slate-200', 'text-slate-600', 'bg-slate-400', 'fa-list'],
            ['Đã hoàn tiền', stats.da_hoan, 'bg-emerald-50 border-emerald-200', 'text-emerald-600', 'bg-emerald-500', 'fa-check-circle'],
            ['Đang xử lý', stats.dang_xu_ly, 'bg-yellow-50 border-yellow-200', 'text-yellow-600', 'bg-yellow-400', 'fa-spinner'],
            ['Thất bại', stats.that_bai, 'bg-red-50 border-red-200', 'text-red-600', 'bg-red-500', 'fa-times-circle'],
            ['Chưa hoàn', stats.chua_hoan, 'bg-gray-50 border-gray-200', 'text-gray-500', 'bg-gray-400', 'fa-clock'],
          ].map(([label, val, bgCls, txtCls, iconBg, icon]) => (
            <div key={label} className={`${bgCls} rounded-2xl border p-3 flex items-center gap-3`}>
              <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}><i className={`fa-solid ${icon} text-white text-sm`}/></div>
              <div><div className="text-xs font-semibold text-gray-500 leading-tight">{label}</div>
                <div className={`text-2xl font-extrabold ${txtCls}`}>{val ?? 0}</div></div>
            </div>
          ))}
        </div>
      )}

      {/* Tổng đã hoàn */}
      {stats?.tong_da_hoan > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 flex items-center gap-4 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><i className="fa-solid fa-coins text-2xl"/></div>
          <div>
            <div className="text-sm font-medium opacity-80">Tổng tiền đã hoàn thành công</div>
            <div className="text-3xl font-black">{formatVND(stats.tong_da_hoan)}</div>
          </div>
        </div>
      )}

      {/* Header + Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900"><i className="fa-solid fa-rotate-left text-rose-500 mr-2"/>Lịch Sử Hoàn Tiền PayOS</h2>
          <p className="text-gray-400 text-sm mt-1">Đơn hàng PayOS đã hủy cần hoàn tiền — {totalItems} đơn</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {newRefundAlert && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 animate-pulse">
              <i className="fa-solid fa-triangle-exclamation"/>
              Hoàn tiền thất bại: #{newRefundAlert.data?.ma_don_hang || ''}
            </div>
          )}
          <ExcelButton color="rose" disabled={list.length === 0} onClick={exportRef}/>
          <button onClick={() => fetchList(currentPage)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600">
            <i className="fa-solid fa-rotate-right"/>Làm mới
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-60">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo mã đơn hàng..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400"/>
          </div>
          <button type="submit" className="px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600">Tìm</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {[['','Tất cả'],['success','Đã hoàn'],['pending','Đang xử lý'],['failed','Thất bại'],['chua_hoan','Chưa hoàn']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${filterStatus === val ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin"/></div>
        : list.length === 0 ? <div className="text-center py-24"><i className="fa-solid fa-rotate-left text-6xl text-gray-200 mb-4 block"/><p className="text-gray-400">Không có đơn hoàn tiền nào</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-rose-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-left">Mã đơn hàng</th>
              <th className="px-4 py-3 text-left">Khách hàng</th>
              <th className="px-4 py-3 text-right">Số tiền hoàn</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-left">Payout ID</th>
              <th className="px-4 py-3 text-center">Thời gian hoàn</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((item, i) => {
                const statusKey = item.refund_status || 'null';
                const st = REFUND_STATUS_MAP[statusKey] || REFUND_STATUS_MAP['null'];
                const canRetry = item.refund_status === 'failed' || item.refund_status === 'pending' || !item.refund_status;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*20+i+1}</td>
                    <td className="px-4 py-3">
                      <code className="font-bold text-rose-700 text-sm">{item.ma_don_hang}</code>
                      <div className="text-xs text-gray-400 mt-0.5">{fDT(item.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{item.khach_hang?.ho_va_ten || '—'}</div>
                      <div className="text-xs text-gray-400">{item.khach_hang?.so_dien_thoai || item.khach_hang?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-extrabold text-rose-600 text-base">{formatVND(item.tong_tien)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${st.cls}`}>
                        <i className={`fa-solid ${st.icon} text-xs`}/>{st.label}
                      </span>
                      {/* Hiển thị lý do thất bại / ghi chú */}
                      {item.refund_note && (
                        <div className={`mt-1.5 text-xs px-2 py-1 rounded-lg text-left max-w-44 mx-auto leading-tight ${
                          item.refund_status === 'failed'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : item.refund_status === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-gray-50 text-gray-500 border border-gray-100'
                        }`}>
                          <i className={`fa-solid mr-1 ${
                            item.refund_status === 'failed' ? 'fa-triangle-exclamation'
                            : item.refund_status === 'success' ? 'fa-circle-check'
                            : 'fa-info-circle'
                          } text-xs`}/>
                          {item.refund_note}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.refund_payout_id
                        ? <code className="text-xs text-purple-600 font-mono break-all">{item.refund_payout_id}</code>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{item.refund_at ? fDT(item.refund_at) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-center">
                      {canRetry ? (
                        <button onClick={() => openConfirm(item)}
                          className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200 flex items-center gap-1 mx-auto">
                          <i className="fa-solid fa-rotate-right text-xs"/>Hoàn tiền lại
                        </button>
                      ) : (
                        <span className="text-emerald-500 text-xs font-semibold"><i className="fa-solid fa-check mr-1"/>Hoàn tất</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">Trang <span className="font-bold text-gray-800">{currentPage}</span> / <span className="font-bold text-gray-800">{totalPages}</span> — {totalItems} đơn</div>
              <div className="flex items-center gap-2">
                <button onClick={() => { const p = Math.max(1, currentPage-1); setCurrentPage(p); fetchList(p); }} disabled={currentPage===1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                  <i className="fa-solid fa-chevron-left text-xs"/>
                </button>
                {[...Array(Math.min(totalPages,5))].map((_, idx) => {
                  const page = currentPage <= 3 ? idx+1 : currentPage - 2 + idx;
                  if (page < 1 || page > totalPages) return null;
                  return <button key={page} onClick={() => { setCurrentPage(page); fetchList(page); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm font-semibold ${currentPage===page ? 'bg-rose-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{page}</button>;
                })}
                <button onClick={() => { const p = Math.min(totalPages, currentPage+1); setCurrentPage(p); fetchList(p); }} disabled={currentPage===totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                  <i className="fa-solid fa-chevron-right text-xs"/>
                </button>
              </div>
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}

// ====================== TAB 4: LỊCH SỬ NẠP TIỀN SHIPPER (PAYOS) ======================
function TabLichSuNapTienShipper() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const currentItems = useMemo(() => list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [list, currentPage]);
  const totalPages = Math.ceil(list.length / itemsPerPage);

  useEffect(() => { fetchList(); }, []);
  const fetchList = async () => {
    setLoading(true);
    try {
      const r = await adm('/api/admin/wallet/lich-su-nap-tien');
      setList(r.data.data || []);
    } catch { toast.error('Lỗi lấy DS Nạp tiền'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Lịch Sử Nạp Tiền Shipper (Tự Động)</h2>
          <p className="text-gray-500 text-sm mt-1">Lịch sử shipper nạp tiền vào ví qua cổng thanh toán PayOS.</p>
        </div>
        <button onClick={fetchList} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 shadow-sm"><i className="fa-solid fa-rotate-right"/>Làm mới</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"/></div>
        : list.length === 0 ? <div className="text-center py-20"><i className="fa-solid fa-clock-rotate-left text-6xl text-gray-200 mb-4 block"/><p className="text-gray-400">Chưa có giao dịch nạp tiền nào</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-blue-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-4 py-3 text-left">Mã YC</th>
              <th className="px-4 py-3 text-left">Shipper</th>
              <th className="px-4 py-3 text-right">Số tiền nạp</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-left">Ngày nạp</th>
              <th className="px-4 py-3 text-left">PayOS Link ID</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((p, i) => (
                <tr key={p.id||i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3"><code className="text-xs text-blue-700 font-bold">#{p.id}</code></td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-800">{p.shipper?.ho_va_ten}</div>
                    <div className="text-xs text-gray-500">{p.shipper?.so_dien_thoai}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">
                    {formatVND(p.so_tien)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.trang_thai === 'thanh_cong' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.trang_thai === 'thanh_cong' ? 'Thành công' : 'Chờ thanh toán'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fDT(p.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{p.payos_payment_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> giao dịch
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <div className="flex gap-1 text-sm font-semibold">
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={`dots-${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                    return null;
                  })}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>
            </div>
          )}
          </div>
        }
      </div>
    </div>
  );
}

// ====================== MAIN ======================
export default function AdminRutTien() {
  const [tab, setTab] = useState('withdraw');
  return (
    <div className="p-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-wallet mr-3 text-green-500"/>Quản Lý Giao Dịch Tài Chính</h1>
      </div>
      <div className="flex gap-2 mb-2 flex-wrap">
        <button onClick={()=>setTab('withdraw')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='withdraw'?'bg-green-600 text-white shadow-md':'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
          <i className="fa-solid fa-money-bill-transfer mr-2"/>Yêu cầu rút tiền
        </button>
        <button onClick={()=>setTab('topup')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='topup'?'bg-indigo-600 text-white shadow-md':'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
          <i className="fa-solid fa-coins mr-2"/>Công Nợ Shipper (Thu Hộ)
        </button>
        <button onClick={()=>setTab('history_topup')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='history_topup'?'bg-blue-600 text-white shadow-md':'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
          <i className="fa-solid fa-clock-rotate-left mr-2"/>Lịch Sử Nạp Tiền
        </button>
        <button onClick={()=>setTab('payos')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='payos'?'bg-purple-600 text-white shadow-md':'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
          <i className="fa-solid fa-bolt mr-2"/>PayOS Lệnh Chi
        </button>
        <button onClick={()=>setTab('refund')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='refund'?'bg-rose-600 text-white shadow-md':'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
          <i className="fa-solid fa-rotate-left mr-2"/>Hoàn Tiền PayOS
        </button>
      </div>

      {tab==='withdraw' ? <TabRutTien/>
      : tab==='topup' ? <TabNopTienShipper/>
      : tab==='history_topup' ? <TabLichSuNapTienShipper/>
      : tab==='payos' ? <TabPayOSPayout/>
      : <TabHoanTienPayOS/>}
    </div>
  );
}

