import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND, formatDateTime } from '../../utils/helpers';

const sA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('shipper_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const PER_PAGE = 8;

function Pagination({ page, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 mt-5">
      <button onClick={() => onChange(p => Math.max(1, p - 1))} disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm">
        <i className="fa-solid fa-chevron-left text-xs" />
      </button>
      {[...Array(total)].map((_, idx) => {
        const p = idx + 1;
        if (p === 1 || p === total || (p >= page - 1 && p <= page + 1)) {
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl font-bold text-sm transition shadow-sm ${
                page === p ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              {p}
            </button>
          );
        }
        if (p === page - 2 || p === page + 2) return <span key={`d${p}`} className="text-gray-300 w-6 text-center">…</span>;
        return null;
      })}
      <button onClick={() => onChange(p => Math.min(total, p + 1))} disabled={page === total}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm">
        <i className="fa-solid fa-chevron-right text-xs" />
      </button>
    </div>
  );
}

export default function ShipperThongKe() {
  const [payload, setPayload] = useState({
    day_begin: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    day_end: new Date().toISOString().split('T')[0],
  });

  const [listData, setListData] = useState([]);
  const [listHuy, setListHuy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('hoan_thanh');
  const [pageHT, setPageHT] = useState(1);
  const [pageHuy, setPageHuy] = useState(1);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setPageHT(1);
    setPageHuy(1);
    try {
      const res = await sA('/api/shipper/don-hang/thong-ke', 'post', payload);
      if (res.data?.data !== undefined) {
        setListData(res.data.data || []);
        setListHuy(res.data.data_huy || []);
      } else {
        toast.error(res.data?.message);
      }
    } catch {
      toast.error('Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const tongTien = listData.reduce((sum, item) => sum + (Number(item.phi_ship) || 0), 0);
  const tongDon = listData.length;
  const tongHuy = listHuy.length;

  const totalHT  = Math.ceil(tongDon / PER_PAGE);
  const totalHuy = Math.ceil(tongHuy / PER_PAGE);
  const currentHT  = listData.slice((pageHT  - 1) * PER_PAGE, pageHT  * PER_PAGE);
  const currentHuy = listHuy.slice((pageHuy - 1) * PER_PAGE, pageHuy * PER_PAGE);

  const TABS = [
    { key: 'hoan_thanh', label: 'Hoàn Thành', count: tongDon, icon: 'fa-circle-check', active: 'bg-green-500' },
    { key: 'da_huy',     label: 'Đã Hủy',     count: tongHuy, icon: 'fa-circle-xmark', active: 'bg-red-500'   },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="text-white px-4 py-5" style={{ background: 'linear-gradient(135deg, #0f2027, #2c5364)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <i className="fa-solid fa-chart-column text-2xl text-green-400" />
              <h1 className="text-xl font-extrabold">Thống Kê Thu Nhập</h1>
            </div>
            <p className="text-white/50 text-sm">Báo cáo chi tiết các chuyến giao hàng</p>
          </div>
          <div className="flex gap-2">
            <Link to="/shipper/profile" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">
              <i className="fa-solid fa-user" />
            </Link>
            <Link to="/shipper/don-hang" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">
              <i className="fa-solid fa-house" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full p-4 flex-1">

        {/* Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-hand-holding-dollar text-2xl text-yellow-300" />
              </div>
              <div>
                <p className="text-green-100 text-xs uppercase font-bold tracking-wider mb-0.5">Tổng Phí Ship</p>
                <h2 className="text-3xl font-black">{formatVND(tongTien)}</h2>
              </div>
            </div>
            <div className="flex gap-4 bg-white/10 border border-white/20 rounded-2xl px-5 py-3">
              <div className="text-center">
                <p className="text-green-100 text-xs uppercase font-bold tracking-wider mb-0.5">Hoàn thành</p>
                <p className="text-2xl font-black">{tongDon}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-green-100 text-xs uppercase font-bold tracking-wider mb-0.5">TB/Chuyến</p>
                <p className="text-xl font-bold">{tongDon ? formatVND(tongTien / tongDon) : '0đ'}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-red-200 text-xs uppercase font-bold tracking-wider mb-0.5">Đã Hủy</p>
                <p className="text-2xl font-black text-red-200">{tongHuy}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Từ Ngày</label>
            <input type="date" value={payload.day_begin}
              onChange={e => setPayload({ ...payload, day_begin: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Đến Ngày</label>
            <input type="date" value={payload.day_end} max={new Date().toISOString().split('T')[0]}
              onChange={e => setPayload({ ...payload, day_end: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
          </div>
          <button onClick={loadData} disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-800 text-white rounded-xl font-bold text-sm shadow hover:bg-gray-700 transition disabled:opacity-50 h-[42px]">
            {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-filter" />Lọc</>}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.key ? `${t.active} text-white shadow-md` : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }`}>
              <i className={`fa-solid ${t.icon}`} />
              {t.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${tab === t.key ? 'bg-white/25' : 'bg-gray-100'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl p-16 flex flex-col items-center text-gray-400 shadow-sm border border-gray-100">
            <i className="fa-solid fa-spinner fa-spin text-4xl mb-3" />
            <p className="text-sm font-medium">Đang tải dữ liệu...</p>
          </div>
        ) : tab === 'hoan_thanh' ? (
          tongDon === 0 ? (
            <div className="bg-white rounded-2xl p-16 flex flex-col items-center text-gray-400 shadow-sm border border-gray-100">
              <i className="fa-solid fa-motorcycle text-6xl text-gray-200 mb-4" />
              <p className="font-semibold">Chưa có chuyến xe nào trong kỳ này</p>
            </div>
          ) : (
            <>
              {/* Info dòng */}
              <div className="text-xs text-gray-400 mb-3 text-right">
                Hiển thị {(pageHT - 1) * PER_PAGE + 1}–{Math.min(pageHT * PER_PAGE, tongDon)} / {tongDon} đơn
              </div>
              <div className="space-y-3">
                {currentHT.map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-green-200 hover:shadow-sm transition-all">
                    <div className="w-11 h-11 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-check" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-800 text-sm tracking-wider mb-0.5">#{item.ma_don_hang}</div>
                      <p className="text-xs text-gray-400"><i className="fa-regular fa-clock mr-1" />{formatDateTime(item.created_at)}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate"><i className="fa-solid fa-location-dot text-red-400 mr-1" />{item.dia_chi}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 font-semibold">Tiền hàng</p>
                      <p className="text-sm font-bold text-gray-600 mb-1">{formatVND(item.tong_tien)}</p>
                      <p className="text-xs text-green-600 font-bold">Phí ship</p>
                      <p className="text-base font-black text-green-500">+{formatVND(item.phi_ship)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={pageHT} total={totalHT} onChange={setPageHT} />
            </>
          )
        ) : (
          tongHuy === 0 ? (
            <div className="bg-white rounded-2xl p-16 flex flex-col items-center text-gray-400 shadow-sm border border-gray-100">
              <i className="fa-solid fa-circle-check text-6xl text-gray-200 mb-4" />
              <p className="font-semibold">Tốt lắm! Không có đơn bị hủy</p>
              <p className="text-sm mt-1">Hãy tiếp tục duy trì nhé!</p>
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-400 mb-3 text-right">
                Hiển thị {(pageHuy - 1) * PER_PAGE + 1}–{Math.min(pageHuy * PER_PAGE, tongHuy)} / {tongHuy} đơn
              </div>
              <div className="space-y-3">
                {currentHuy.map((item, i) => (
                  <div key={i} className="bg-red-50/60 rounded-2xl border border-red-100 p-4 flex items-center gap-4 hover:border-red-300 hover:shadow-sm transition-all">
                    <div className="w-11 h-11 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-xmark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-black text-gray-700 text-sm tracking-wider">#{item.ma_don_hang}</span>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Đã hủy</span>
                      </div>
                      <p className="text-xs text-gray-400"><i className="fa-regular fa-clock mr-1" />{formatDateTime(item.created_at)}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate"><i className="fa-solid fa-location-dot text-red-400 mr-1" />{item.dia_chi}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 font-semibold">Tiền hàng</p>
                      <p className="text-sm font-bold text-gray-400 line-through mb-1">{formatVND(item.tong_tien)}</p>
                      <p className="text-xs text-red-400 font-bold">Phí ship</p>
                      <p className="text-base font-black text-red-400 line-through">{formatVND(item.phi_ship)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={pageHuy} total={totalHuy} onChange={setPageHuy} />
            </>
          )
        )}

        <div className="pb-10" />
      </div>
    </div>
  );
}
