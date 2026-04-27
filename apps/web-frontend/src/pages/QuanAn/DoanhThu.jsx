import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND, formatDate } from '../../utils/helpers';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const qa = (method, url, data) => {
  const token = localStorage.getItem('quan_an_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const fNum = n => new Intl.NumberFormat('vi-VN').format(n || 0);

// ── Shared UI ────────────────────────────────────────────────
function KPICard({ label, value, icon, color, isVND, sub }) {
  const COLOR = {
    orange: 'from-orange-50 border-orange-200 text-orange-600 bg-orange-500',
    green:  'from-green-50  border-green-200  text-green-600  bg-green-500',
    blue:   'from-blue-50   border-blue-200   text-blue-600   bg-blue-500',
    red:    'from-red-50    border-red-200    text-red-600    bg-red-500',
    purple: 'from-purple-50 border-purple-200 text-purple-600 bg-purple-500',
  };
  const [from, border, textCl, iconBg] = (COLOR[color] || COLOR.orange).split(' ');
  return (
    <div className={`bg-gradient-to-br ${from} to-white ${border} border rounded-2xl p-4 hover:shadow-md transition-all`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-xl font-extrabold ${textCl}`}>
            {isVND ? formatVND(value) : (typeof value === 'string' ? value : fNum(value))}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shadow`}>
          <i className={`fa-solid ${icon} text-white text-sm`} />
        </div>
      </div>
    </div>
  );
}

function Skeleton({ h = 'h-64' }) {
  return <div className={`${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${active
        ? 'text-white shadow-md bg-gradient-to-r from-orange-500 to-amber-400'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>
      <i className={`fa-solid ${icon}`} />
      {label}
    </button>
  );
}

// ══════════════════════════════════════════
// TAB 1 — TỔNG QUAN
// ══════════════════════════════════════════
function TabTongQuan() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const lineRef = useRef(null);
  const charts  = useRef({});

  useEffect(() => {
    load();
    return () => { Object.values(charts.current).forEach(c => { try { c.destroy(); } catch {} }); };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await qa('get', '/api/quan-an/thong-ke/tong-quan');
      if (r.data?.status) {
        setData(r.data.data);
        setTimeout(() => draw(r.data.data), 120);
      }
    } catch { toast.error('Không tải được dữ liệu'); } finally { setLoading(false); }
  };

  const draw = (d) => {
    Object.values(charts.current).forEach(c => { try { c.destroy(); } catch {} });
    charts.current = {};
    if (!lineRef.current || !d.bieu_do) return;
    charts.current.line = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: d.bieu_do.list_ngay,
        datasets: [
          {
            label: 'Doanh thu', data: d.bieu_do.list_dt, yAxisID: 'y',
            backgroundColor: 'rgba(249,115,22,.12)', borderColor: '#f97316',
            borderWidth: 2.5, tension: 0.42, pointRadius: 3, fill: true,
            pointBackgroundColor: '#f97316', pointBorderColor: '#fff', pointBorderWidth: 2,
          },
          {
            label: 'Số đơn', data: d.bieu_do.list_don, yAxisID: 'y1',
            backgroundColor: 'rgba(99,102,241,.08)', borderColor: '#6366f1',
            borderWidth: 2, tension: 0.42, pointRadius: 2, fill: false,
            borderDash: [5, 3],
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 } } },
          tooltip: { callbacks: { label: c => c.datasetIndex === 0 ? `Doanh thu: ${formatVND(c.raw)}` : `Đơn: ${c.raw}` } },
        },
        scales: {
          y:  { beginAtZero: true, position: 'left',  ticks: { callback: v => formatVND(v), font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
          y1: { beginAtZero: true, position: 'right', ticks: { stepSize: 1, font: { size: 10 } }, grid: { display: false } },
          x:  { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  };

  if (loading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} h="h-24" />)}</div>
      <Skeleton h="h-72" />
    </div>
  );
  if (!data) return <div className="text-center py-20 text-gray-400">Không tải được dữ liệu</div>;

  const kpi = data.kpi || {};

  return (
    <div className="space-y-5">
      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Doanh thu hôm nay"  value={kpi.doanh_thu_hom_nay}   icon="fa-calendar-day"  color="orange" isVND />
        <KPICard label="Doanh thu tuần này" value={kpi.doanh_thu_tuan_nay}  icon="fa-calendar-week" color="blue"   isVND />
        <KPICard label="Doanh thu tháng này"value={kpi.doanh_thu_thang_nay} icon="fa-calendar"      color="green"  isVND />
        <KPICard label="Rating trung bình"  value={`⭐ ${kpi.avg_rating}/5`} icon="fa-star"          color="purple" />
      </div>
      {/* KPI Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <p className="text-xs font-semibold text-green-600 uppercase mb-1">Đơn hoàn tất</p>
          <p className="text-2xl font-extrabold text-green-700">{fNum(kpi.tong_hoan_tat)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <p className="text-xs font-semibold text-red-500 uppercase mb-1">Đơn bị hủy</p>
          <p className="text-2xl font-extrabold text-red-600">{fNum(kpi.tong_huy)}</p>
        </div>
        <div className={`${kpi.ti_le_huy > 20 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} border rounded-2xl p-4 text-center`}>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tỉ lệ hủy</p>
          <p className={`text-2xl font-extrabold ${kpi.ti_le_huy > 20 ? 'text-red-600' : 'text-gray-700'}`}>{kpi.ti_le_huy}%</p>
        </div>
      </div>

      {/* Biểu đồ 30 ngày */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <i className="fa-solid fa-chart-line text-orange-400" />
          Doanh thu & Số đơn 30 ngày gần nhất
        </h3>
        <div className="h-72"><canvas ref={lineRef} /></div>
      </div>

      {/* Top 5 món nhanh */}
      {data.top_mon?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <i className="fa-solid fa-fire text-orange-400" />
            Top 5 món bán chạy nhất
          </h3>
          <div className="space-y-3">
            {data.top_mon.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-gray-400 text-sm">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                {m.hinh_anh && <img src={m.hinh_anh} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" onError={e => e.target.style.display='none'} />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{m.ten_mon_an}</p>
                  <p className="text-xs text-gray-400">{fNum(m.so_luong_ban)} phần bán</p>
                </div>
                <p className="text-sm font-bold text-orange-500 flex-shrink-0">{formatVND(m.tong_doanh_thu)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// TAB 2 — CHI TIẾT THEO NGÀY
// ══════════════════════════════════════════
function TabChiTiet() {
  const today    = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().setDate(1)).toISOString().split('T')[0];

  const [from, setFrom]           = useState(firstDay);
  const [to, setTo]               = useState(today);
  const [listThongKe, setList]    = useState([]);
  const [loading, setLoading]     = useState(false);

  const barRef   = useRef(null);
  const barChart = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await qa('post', '/api/quan-an/thong-ke/doanh-thu', { day_begin: from, day_end: to });
      if (r.data) {
        setList(r.data.data || []);
        setTimeout(() => drawBar(r.data), 100);
      }
    } catch { toast.error('Không thể tải dữ liệu'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const drawBar = (d) => {
    if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
    if (!barRef.current || !d?.list_ngay?.length) return;
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: d.list_ngay.map(dd => formatDate(dd)),
        datasets: [{
          label: 'Doanh thu', data: d.list_tong_tien_hang,
          backgroundColor: 'rgba(249,115,22,.75)', borderColor: '#f97316', borderWidth: 1.5, borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => formatVND(c.raw) } } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => formatVND(v), font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  };

  useEffect(() => () => { if (barChart.current) barChart.current.destroy(); }, []);

  const totalDT  = listThongKe.reduce((s, i) => s + Number(i.tong_tien_hang || 0), 0);
  const totalDon = listThongKe.reduce((s, i) => s + Number(i.so_don_hang || 0), 0);

  const handleExport = () => {
    if (!listThongKe.length) return toast('Không có dữ liệu', { icon: 'ℹ️' });
    const rows = listThongKe.map((v, i) => `${i+1},${formatDate(v.ngay_tao)},${v.so_don_hang},${v.tong_tien_hang}`);
    const csv  = 'data:text/csv;charset=utf-8,\uFEFFSTT,Ngày,Tổng đơn,Doanh thu\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `doanh-thu-${from}-${to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Từ ngày</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Đến ngày</label>
            <input type="date" value={to} max={today} onChange={e => setTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 outline-none" />
          </div>
          <button onClick={load} disabled={loading} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow transition-colors disabled:opacity-50 flex items-center gap-2">
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
            Tra cứu
          </button>
          <button onClick={handleExport} className="px-5 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm ml-auto">
            <i className="fa-solid fa-file-excel text-green-600" />
            Xuất CSV
          </button>
        </div>
        {/* Tổng kết nhanh */}
        {listThongKe.length > 0 && (
          <div className="mt-4 flex gap-4 flex-wrap">
            <div className="bg-orange-50 px-4 py-2 rounded-xl">
              <span className="text-xs text-orange-500 font-semibold">Tổng doanh thu: </span>
              <span className="font-bold text-orange-700">{formatVND(totalDT)}</span>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-xl">
              <span className="text-xs text-blue-500 font-semibold">Tổng đơn hoàn tất: </span>
              <span className="font-bold text-blue-700">{totalDon} đơn</span>
            </div>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-column text-orange-400" />Biểu đồ doanh thu theo ngày</h3>
        {loading ? <Skeleton h="h-64" /> : <div className="h-64"><canvas ref={barRef} /></div>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="fa-solid fa-table-list text-orange-400" />Chi tiết từng ngày</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-5 py-3 text-center font-semibold w-16">STT</th>
              <th className="px-5 py-3 text-left font-semibold">Ngày bán</th>
              <th className="px-5 py-3 text-center font-semibold">Số đơn</th>
              <th className="px-5 py-3 text-right font-semibold">Doanh thu (sau CK)</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="4" className="px-5 py-12 text-center text-gray-400"><i className="fa-solid fa-spinner fa-spin mr-2" />Đang tải...</td></tr>
              ) : listThongKe.length === 0 ? (
                <tr><td colSpan="4" className="px-5 py-12 text-center text-gray-400">Không có dữ liệu trong khoảng thời gian này</td></tr>
              ) : listThongKe.map((item, i) => (
                <tr key={i} className="hover:bg-orange-50/40 transition-colors">
                  <td className="px-5 py-3 text-center text-gray-400 font-bold">{i + 1}</td>
                  <td className="px-5 py-3 font-semibold text-gray-800"><i className="fa-regular fa-calendar text-orange-400 mr-2" />{formatDate(item.ngay_tao)}</td>
                  <td className="px-5 py-3 text-center"><span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-bold">{item.so_don_hang}</span></td>
                  <td className="px-5 py-3 text-right font-extrabold text-orange-500">{formatVND(item.tong_tien_hang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TAB 3 — TOP MÓN ĂN
// ══════════════════════════════════════════
function TabTopMon() {
  const today    = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().setDate(1)).toISOString().split('T')[0];

  const [from, setFrom]   = useState(firstDay);
  const [to, setTo]       = useState(today);
  const [data, setData]   = useState([]);
  const [loading, setLoad]= useState(false);

  const barRef   = useRef(null);
  const barChart = useRef(null);

  const load = async () => {
    setLoad(true);
    try {
      const r = await qa('post', '/api/quan-an/thong-ke/mon-an', { day_begin: from, day_end: to });
      if (r.data) {
        setData(r.data.data || []);
        setTimeout(() => drawBar(r.data), 100);
      }
    } catch { toast.error('Không tải được'); } finally { setLoad(false); }
  };

  useEffect(() => { load(); }, []);

  const drawBar = (d) => {
    if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
    if (!barRef.current || !d?.list_mon_an?.length) return;
    const top = d.list_mon_an.slice(0, 10);
    const vals = d.list_so_luong.slice(0, 10);
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: top,
        datasets: [{
          label: 'Số lượng bán', data: vals,
          backgroundColor: top.map((_, i) => `hsl(${30 + i * 8}, 90%, ${60 - i * 2}%)`),
          borderWidth: 0, borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw} phần` } } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    });
  };

  useEffect(() => () => { if (barChart.current) barChart.current.destroy(); }, []);

  const maxSL = data.length > 0 ? Math.max(...data.map(m => m.so_luong_ban || 0)) : 1;

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Từ ngày</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Đến ngày</label>
          <input type="date" value={to} max={today} onChange={e => setTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 outline-none" />
        </div>
        <button onClick={load} disabled={loading} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow transition-colors disabled:opacity-50 flex items-center gap-2">
          <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
          Tra cứu
        </button>
      </div>

      {/* Bar chart ngang */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-ranking-star text-orange-400" />Top 10 món bán chạy theo số lượng</h3>
        {loading ? <Skeleton h="h-72" /> : <div className="h-72"><canvas ref={barRef} /></div>}
      </div>

      {/* Bảng chi tiết */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gray-50/60 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="fa-solid fa-list text-orange-400" />Bảng xếp hạng chi tiết</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-5 py-3 text-center font-semibold w-14">Hạng</th>
              <th className="px-5 py-3 text-left font-semibold">Tên món</th>
              <th className="px-5 py-3 text-right font-semibold">Số lượng</th>
              <th className="px-5 py-3 text-right font-semibold">Doanh thu</th>
              <th className="px-5 py-3 font-semibold w-48">Tỷ lệ</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-400"><i className="fa-solid fa-spinner fa-spin mr-2" />Đang tải...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : data.map((m, i) => {
                const pct = maxSL > 0 ? Math.round((m.so_luong_ban / maxSL) * 100) : 0;
                return (
                  <tr key={i} className="hover:bg-orange-50/40 transition-colors">
                    <td className="px-5 py-3 text-center text-lg">{['🥇','🥈','🥉'][i] || <span className="text-gray-400 font-bold text-sm">{i+1}</span>}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">{m.ten_mon_an}</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-700">{fNum(m.so_luong_ban)}</td>
                    <td className="px-5 py-3 text-right font-bold text-orange-500">{formatVND(m.tong_tien_hang)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════
const TABS = [
  { id: 'tong-quan', label: 'Tổng Quan',   icon: 'fa-gauge-high' },
  { id: 'chi-tiet',  label: 'Chi Tiết Ngày',icon: 'fa-calendar-days' },
  { id: 'top-mon',   label: 'Top Món Ăn',   icon: 'fa-fire' },
];

export default function DoanhThu() {
  const [tab, setTab] = useState('tong-quan');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-400 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white opacity-10 rounded-full -translate-y-20 translate-x-10" />
        <div className="relative z-10">
          <h1 className="text-2xl font-black mb-1 flex items-center gap-3"><i className="fa-solid fa-chart-line" />Thống Kê Doanh Thu</h1>
          <p className="text-orange-50 text-sm opacity-90">Báo cáo chi tiết tình hình kinh doanh của quán</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        {TABS.map(t => (
          <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {/* Tab content */}
      {tab === 'tong-quan' && <TabTongQuan />}
      {tab === 'chi-tiet'  && <TabChiTiet />}
      {tab === 'top-mon'   && <TabTopMon />}
    </div>
  );
}
