import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../../utils/api';
import { formatVND } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';
import { exportElementToPDF, PDFButton } from '../../utils/exportPDF.jsx';

Chart.register(...registerables);

const adm = (method, url, data) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const fNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

// ─── Tab Button ───
function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${active
        ? 'text-white shadow-md'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
      style={active ? { background: 'linear-gradient(135deg,#e94560,#c0392b)' } : {}}>
      <i className={`fa-solid ${icon}`} />
      {label}
    </button>
  );
}

// ─── Skeleton ───
function Skeleton({ h = 'h-72' }) {
  return <div className={`${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

// ─── Summary Card ───
function Card({ label, value, icon, color, isVND }) {
  const COLORS = {
    blue: 'from-blue-50 to-blue-100/60 border-blue-200 text-blue-600 bg-blue-500',
    green: 'from-green-50 to-green-100/60 border-green-200 text-green-600 bg-green-500',
    orange: 'from-orange-50 to-orange-100/60 border-orange-200 text-orange-600 bg-orange-500',
    purple: 'from-purple-50 to-purple-100/60 border-purple-200 text-purple-600 bg-purple-500',
    red: 'from-red-50 to-red-100/60 border-red-200 text-red-600 bg-red-500',
  };
  const [fromTo, border, textCl, iconBg] = (COLORS[color] || COLORS.blue).split(' ');
  return (
    <div className={`bg-gradient-to-br ${fromTo} ${fromTo.replace('from', 'to')} ${border} border rounded-2xl p-5 hover:shadow-md transition-all`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-xl font-extrabold ${textCl} leading-tight`}>
            {isVND ? formatVND(value) : (typeof value === 'string' ? value : fNum(value))}
          </p>
        </div>
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center shadow`}>
          <i className={`fa-solid ${icon} text-white text-sm`} />
        </div>
      </div>
    </div>
  );
}

// ─── Date Picker Row ───
function DatePicker({ from, to, onFromChange, onToChange, onApply, loading }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
        <i className="fa-solid fa-calendar-day text-gray-400 text-xs" />
        <input type="date" value={from} onChange={e => onFromChange(e.target.value)}
          className="text-sm text-gray-700 outline-none" />
      </div>
      <span className="text-gray-400 text-sm font-semibold">đến</span>
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
        <i className="fa-solid fa-calendar-day text-gray-400 text-xs" />
        <input type="date" value={to} onChange={e => onToChange(e.target.value)}
          className="text-sm text-gray-700 outline-none" />
      </div>
      <button onClick={onApply} disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shadow hover:opacity-90 disabled:opacity-60 transition-all"
        style={{ background: 'linear-gradient(135deg,#e94560,#c0392b)' }}>
        <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
        Lọc
      </button>
    </div>
  );
}

// ══════════════════════════════════════════
// TAB 1 — Tổng Quan Dashboard
// ══════════════════════════════════════════
function TabDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const dailyRef = useRef(null);
  const monthRef = useRef(null);
  const donutRef = useRef(null);
  const charts = useRef({});

  useEffect(() => { load(); return () => destroyAll(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adm('get', '/api/admin/thong-ke/dashboard');
      if (r.data?.status) {
        setData(r.data.data);
        setTimeout(() => draw(r.data.data), 120);
      }
    } catch { }
    finally { setLoading(false); }
  };

  const destroyAll = () => {
    Object.values(charts.current).forEach(c => { try { c.destroy(); } catch { } });
    charts.current = {};
  };

  const draw = (d) => {
    destroyAll();
    const opts = (label, cb) => ({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,.85)', callbacks: { label: cb } } },
    });

    if (dailyRef.current && d.doanh_thu_theo_ngay) {
      charts.current.daily = new Chart(dailyRef.current, {
        type: 'line',
        data: {
          labels: d.doanh_thu_theo_ngay.list_ngay,
          datasets: [{
            label: 'Doanh thu', data: d.doanh_thu_theo_ngay.list_tong_tien_hang,
            backgroundColor: 'rgba(233,69,96,.1)', borderColor: '#e94560',
            borderWidth: 2.5, tension: 0.42, pointRadius: 3, fill: true,
            pointBackgroundColor: '#e94560', pointBorderColor: '#fff', pointBorderWidth: 2,
          }],
        },
        options: {
          ...opts('Doanh thu', c => `Doanh thu: ${formatVND(c.raw)}`),
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' }, ticks: { callback: v => formatVND(v), font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          },
        },
      });
    }

    if (monthRef.current && Array.isArray(d.doanh_thu_theo_thang)) {
      charts.current.month = new Chart(monthRef.current, {
        type: 'bar',
        data: {
          labels: d.doanh_thu_theo_thang.map(x => x.ten_thang),
          datasets: [{
            label: 'Doanh thu', data: d.doanh_thu_theo_thang.map(x => x.doanh_thu),
            backgroundColor: 'rgba(16,185,129,.75)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 6,
          }],
        },
        options: {
          ...opts('Doanh thu', c => `Doanh thu: ${formatVND(c.raw)}`),
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' }, ticks: { callback: v => formatVND(v), font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          },
        },
      });
    }

    if (donutRef.current && Array.isArray(d.don_hang_theo_trang_thai)) {
      charts.current.donut = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: d.don_hang_theo_trang_thai.map(s => s.ten_trang_thai),
          datasets: [{
            data: d.don_hang_theo_trang_thai.map(s => s.so_luong),
            backgroundColor: ['#9ca3af','#fbbf24','#f97316','#3b82f6','#22c55e','#ef4444'],
            borderColor: '#fff', borderWidth: 3,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: c => `${c.label}: ${fNum(c.raw)} đơn` } } },
        },
      });
    }
  };

  if (loading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} h="h-24" />)}</div>
      <div className="grid lg:grid-cols-3 gap-5">{[...Array(3)].map((_, i) => <Skeleton key={i} h="h-72" />)}</div>
    </div>
  );

  if (!data) return <div className="text-center py-20 text-gray-400"><i className="fa-solid fa-triangle-exclamation text-5xl mb-4 block text-yellow-300" />Không tải được dữ liệu.</div>;

  const tq = data.tong_quan || {};

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Tổng doanh thu" value={tq.tong_doanh_thu} icon="fa-sack-dollar" color="green" isVND />
        <Card label="Tiền lời hệ thống" value={tq.tong_tien_loi} icon="fa-piggy-bank" color="blue" isVND />
        <Card label="Đơn hàng hoàn tất" value={tq.tong_don_hang} icon="fa-bag-shopping" color="orange" />
        <Card label="Tỷ lệ hoàn thành" value={`${tq.completion_rate || 0}%`} icon="fa-circle-check" color="purple" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Doanh thu hôm nay" value={tq.doanh_thu_hom_nay} icon="fa-calendar-day" color="red" isVND />
        <Card label="Doanh thu tuần này" value={tq.doanh_thu_tuan_nay} icon="fa-calendar-week" color="blue" isVND />
        <Card label="Doanh thu tháng này" value={tq.doanh_thu_thang_nay} icon="fa-calendar" color="green" isVND />
        <Card label="Giá trị đơn TB" value={tq.avg_order_value} icon="fa-receipt" color="orange" isVND />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-line text-red-400" />Doanh thu 30 ngày gần nhất</h3>
          <div className="h-64"><canvas ref={dailyRef} /></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-pie text-purple-400" />Phân bố trạng thái đơn</h3>
          <div className="h-64"><canvas ref={donutRef} /></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-column text-green-500" />Doanh thu theo tháng ({new Date().getFullYear()})</h3>
        <div className="h-64"><canvas ref={monthRef} /></div>
      </div>

      {/* Top lists */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2"><i className="fa-solid fa-trophy text-yellow-400" />Top 10 Quán Ăn</h3>
          <p className="text-xs text-gray-400 mb-4">Xếp hạng theo tổng doanh thu</p>
          {!data.top_quan_an?.length
            ? <p className="text-center py-8 text-gray-300">Không có dữ liệu</p>
            : data.top_quan_an.map((q, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-xl px-2 transition-colors">
                <span className="w-7 text-center text-base flex-shrink-0">{['🥇','🥈','🥉'][i] || <b className="text-gray-400 text-xs">{i+1}</b>}</span>
                <img src={q.hinh_anh || 'https://placehold.co/40'} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" onError={e => e.target.src='https://placehold.co/40'} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{q.ten_quan_an}</div>
                  <div className="text-xs text-gray-400">{fNum(q.tong_don_hang)} đơn</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-sm text-green-600">{formatVND(q.tong_doanh_thu)}</div>
                  <div className="text-xs text-gray-400">TB: {formatVND(q.doanh_thu_trung_binh)}</div>
                </div>
              </div>
            ))
          }
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2"><i className="fa-solid fa-star text-orange-400" />Top 10 Món Ăn bán chạy</h3>
          <p className="text-xs text-gray-400 mb-4">Xếp hạng theo số lượng bán</p>
          {!data.top_mon_an?.length
            ? <p className="text-center py-8 text-gray-300">Không có dữ liệu</p>
            : data.top_mon_an.map((m, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-xl px-2 transition-colors">
                <span className="w-7 text-center text-base flex-shrink-0">{['🥇','🥈','🥉'][i] || <b className="text-gray-400 text-xs">{i+1}</b>}</span>
                <img src={m.hinh_anh || 'https://placehold.co/40'} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" onError={e => e.target.src='https://placehold.co/40'} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{m.ten_mon_an}</div>
                  <div className="text-xs text-gray-400">{fNum(m.so_luong_ban)} món bán</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-sm text-orange-500">{formatVND(m.gia_khuyen_mai)}/món</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TAB 2 — Thống Kê Khách Hàng
// ══════════════════════════════════════════
function TabKhachHang() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const barRef = useRef(null);
  const barChart = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adm('post', '/api/admin/thong-ke/thong-ke-tien-khach-hang', { day_begin: from, day_end: to });
      setData(r.data);
      setTimeout(() => drawBar(r.data), 100);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const drawBar = (d) => {
    if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
    if (!barRef.current || !d?.list_ten?.length) return;
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: d.list_ten,
        datasets: [{
          label: 'Tổng tiêu', data: d.list_tien,
          backgroundColor: 'rgba(99,102,241,.7)', borderColor: '#6366f1', borderWidth: 1.5, borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => formatVND(c.raw) } } },
        scales: {
          x: { beginAtZero: true, ticks: { callback: v => formatVND(v), font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    });
  };

  useEffect(() => () => { if (barChart.current) barChart.current.destroy(); }, []);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="fa-solid fa-users text-blue-400" />Thống kê chi tiêu theo khách hàng</h3>
          <div className="flex gap-3 items-center">
            <ExcelButton disabled={!data?.data?.length} onClick={() => exportToExcel(
              data.data.map((kh, i) => ({ ...kh, __stt: i + 1 })),
              [
                { label: 'STT',          key: '__stt',         width: 6 },
                { label: 'Khách hàng',   key: 'ho_va_ten',     width: 25 },
                { label: 'Tổng đơn',     key: 'tong_don_hang', width: 12 },
                { label: 'Tổng tiêu',    key: 'tong_tien_tieu',width: 16, format: v => Number(v).toLocaleString('vi-VN') },
                { label: 'Đơn cao nhất', key: 'don_hang_max',  width: 16, format: v => Number(v).toLocaleString('vi-VN') },
              ],
              `ThongKeKH_${from}_${to}`, 'Khách Hàng'
            )} />
            <DatePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} onApply={load} loading={loading} />
          </div>
        </div>

        {loading ? <Skeleton h="h-80" /> : (
          <>
            <div className="h-80 mb-5"><canvas ref={barRef} /></div>
            {data?.data?.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3 text-left font-semibold">STT</th>
                    <th className="px-4 py-3 text-left font-semibold">Khách hàng</th>
                    <th className="px-4 py-3 text-right font-semibold">Tổng đơn</th>
                    <th className="px-4 py-3 text-right font-semibold">Tổng tiêu</th>
                    <th className="px-4 py-3 text-right font-semibold">Đơn cao nhất</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.data.map((kh, i) => (
                      <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{kh.ho_va_ten}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fNum(kh.tong_don_hang)}</td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600">{formatVND(kh.tong_tien_tieu)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatVND(kh.don_hang_max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TAB 3 — Thống Kê Quán Ăn
// ══════════════════════════════════════════
function TabQuanAn() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const barRef = useRef(null);
  const barChart = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adm('post', '/api/admin/thong-ke/thong-ke-tien-quan-an', { day_begin: from, day_end: to });
      setData(r.data);
      setTimeout(() => drawBar(r.data), 100);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const drawBar = (d) => {
    if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
    if (!barRef.current || !d?.list_ten?.length) return;
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: d.list_ten,
        datasets: [{
          label: 'Doanh thu', data: d.list_tien,
          backgroundColor: 'rgba(16,185,129,.7)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => formatVND(c.raw) } } },
        scales: {
          x: { beginAtZero: true, ticks: { callback: v => formatVND(v), font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    });
  };

  useEffect(() => () => { if (barChart.current) barChart.current.destroy(); }, []);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="fa-solid fa-store text-green-500" />Thống kê doanh thu theo quán ăn</h3>
          <div className="flex gap-3 items-center">
            <ExcelButton color="green" disabled={!data?.data?.length} onClick={() => exportToExcel(
              data.data.map((qa, i) => ({ ...qa, __stt: i + 1 })),
              [
                { label: 'STT',          key: '__stt',         width: 6 },
                { label: 'Quán ăn',      key: 'ten_quan_an',   width: 25 },
                { label: 'Tổng đơn hàng',key: 'tong_don_hang', width: 14 },
                { label: 'KH phục vụ',   key: 'so_luong_khach_hang', width: 14 },
                { label: 'Tổng doanh thu',key: 'tong_tien_ban', width: 16, format: v => Number(v).toLocaleString('vi-VN') },
              ],
              `ThongKeAdminQuanAn_${from}_${to}`, 'Quán Ăn'
            )} />
            <DatePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} onApply={load} loading={loading} />
          </div>
        </div>

        {loading ? <Skeleton h="h-80" /> : (
          <>
            <div className="h-80 mb-5"><canvas ref={barRef} /></div>
            {data?.data?.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3 text-left font-semibold">STT</th>
                    <th className="px-4 py-3 text-left font-semibold">Quán ăn</th>
                    <th className="px-4 py-3 text-right font-semibold">Tổng đơn hàng</th>
                    <th className="px-4 py-3 text-right font-semibold">KH phục vụ</th>
                    <th className="px-4 py-3 text-right font-semibold">Tổng doanh thu</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.data.map((qa, i) => (
                      <tr key={i} className="hover:bg-green-50/40 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{qa.ten_quan_an}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fNum(qa.tong_don_hang)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fNum(qa.so_luong_khach_hang)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">{formatVND(qa.tong_tien_ban)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TAB 4 — Đơn Hủy & Xu Hướng
// ══════════════════════════════════════════
function TabHuyDon() {
  const today    = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [from, setFrom]       = useState(firstDay);
  const [to, setTo]           = useState(today);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const lineRef  = useRef(null);
  const donutRef = useRef(null);
  const charts   = useRef({});

  const load = async (f = from, t = to) => {
    setLoading(true);
    try {
      const r = await adm('post', '/api/admin/thong-ke/huy-don', { day_begin: f, day_end: t });
      if (r.data?.status) {
        setData(r.data.data);
        setTimeout(() => draw(r.data.data), 120);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); return () => { Object.values(charts.current).forEach(c => { try { c.destroy(); } catch {} }); }; }, []);

  const draw = (d) => {
    Object.values(charts.current).forEach(c => { try { c.destroy(); } catch {} });
    charts.current = {};

    if (lineRef.current && d.xu_huong) {
      charts.current.line = new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels: d.xu_huong.list_ngay,
          datasets: [{
            label: 'Đơn hủy', data: d.xu_huong.list_huy,
            backgroundColor: 'rgba(239,68,68,.12)', borderColor: '#ef4444',
            borderWidth: 2.5, tension: 0.4, pointRadius: 3, fill: true,
            pointBackgroundColor: '#ef4444', pointBorderColor: '#fff', pointBorderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw} đơn hủy` } } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          },
        },
      });
    }

    if (donutRef.current && d.ly_do_chart) {
      charts.current.donut = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: d.ly_do_chart.labels,
          datasets: [{ data: d.ly_do_chart.data, backgroundColor: ['#f97316', '#ef4444', '#6b7280'], borderColor: '#fff', borderWidth: 3 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 } } }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} đơn` } } },
        },
      });
    }
  };

  const kpi = data?.kpi || {};

  return (
    <div className="space-y-5">
      {/* Bộ lọc */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="fa-solid fa-ban text-red-400" />Thống kê đơn hủy theo khoảng thời gian</h3>
        <DatePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} onApply={() => load(from, to)} loading={loading} />
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} h="h-24" />)}</div>
          <div className="grid lg:grid-cols-3 gap-5">{[...Array(2)].map((_, i) => <Skeleton key={i} h="h-72" />)}</div>
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400"><i className="fa-solid fa-triangle-exclamation text-5xl mb-4 block text-yellow-300" />Không tải được dữ liệu.</div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Tổng đơn hủy (toàn hệ thống)" value={kpi.tong_huy} icon="fa-ban"            color="red" />
            <Card label="Tỉ lệ hủy tổng"               value={`${kpi.ti_le_huy}%`}  icon="fa-percent"        color="orange" />
            <Card label="Hủy trong khoảng lọc"          value={kpi.huy_trong_khoang} icon="fa-calendar-xmark" color="purple" />
            <Card label="Tổng tiền hoàn (online)"       value={kpi.tong_tien_hoan}   icon="fa-rotate-left"    color="blue" isVND />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
              <p className="text-xs font-semibold text-blue-500 uppercase mb-1">Đơn online (PayOS) hủy</p>
              <p className="text-2xl font-extrabold text-blue-600">{fNum(kpi.huy_do_timeout)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
              <p className="text-xs font-semibold text-orange-500 uppercase mb-1">Đơn tiền mặt hủy</p>
              <p className="text-2xl font-extrabold text-orange-600">{fNum(kpi.huy_do_admin)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Khác</p>
              <p className="text-2xl font-extrabold text-gray-600">{fNum(kpi.huy_do_khac)}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-line text-red-400" />Xu hướng hủy đơn 30 ngày gần nhất</h3>
              <div className="h-64"><canvas ref={lineRef} /></div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-pie text-orange-400" />Phân bố lý do hủy</h3>
              <div className="h-64"><canvas ref={donutRef} /></div>
            </div>
          </div>

          {/* Top quán hủy */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-ranking-star text-red-400" />Top quán có đơn hủy nhiều nhất</h3>
            {!data.top_quan_huy?.length ? (
              <p className="text-center py-8 text-gray-300">Không có đơn hủy trong khoảng thời gian này 🎉</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3 text-left font-semibold">STT</th>
                    <th className="px-4 py-3 text-left font-semibold">Quán ăn</th>
                    <th className="px-4 py-3 text-right font-semibold">Tổng đơn</th>
                    <th className="px-4 py-3 text-right font-semibold">Số đơn hủy</th>
                    <th className="px-4 py-3 text-right font-semibold">Tỉ lệ hủy</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.top_quan_huy.map((q, i) => (
                      <tr key={i} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 flex items-center gap-2">
                          {q.hinh_anh && <img src={q.hinh_anh} alt="" className="w-8 h-8 rounded-lg object-cover" onError={e => e.target.style.display='none'} />}
                          {q.ten_quan_an}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{fNum(q.tong_don)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-500">{fNum(q.so_don_huy)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${q.ti_le_huy > 30 ? 'bg-red-100 text-red-600' : q.ti_le_huy > 15 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            {q.ti_le_huy}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════
const TABS = [
  { id: 'dashboard',  label: 'Tổng Quan',  icon: 'fa-gauge-high' },
  { id: 'khach-hang', label: 'Khách Hàng', icon: 'fa-users' },
  { id: 'quan-an',    label: 'Quán Ăn',    icon: 'fa-store' },
  { id: 'huy-don',    label: 'Đơn Hủy',    icon: 'fa-ban' },
];

export default function AdminThongKe() {
  const [tab, setTab] = useState('dashboard');
  const [pdfLoading, setPdfLoading] = useState(false);
  const contentRef = useRef(null);

  const handleExportPDF = () => {
    const TAB_NAMES = {
      'dashboard':  'BaoCao_TongQuan',
      'khach-hang': 'BaoCao_KhachHang',
      'quan-an':    'BaoCao_QuanAn',
      'huy-don':    'BaoCao_DonHuy',
    };
    exportElementToPDF(contentRef.current, TAB_NAMES[tab] || 'BaoCao_FoodBee', {
      landscape: true,
      onStart: () => setPdfLoading(true),
      onDone:  () => setPdfLoading(false),
    });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <i className="fa-solid fa-chart-line text-red-500" />
            Thống Kê Hệ Thống
          </h1>
          <p className="text-gray-400 text-sm mt-1">Phân tích doanh thu và hiệu suất hoạt động</p>
        </div>
        {/* Export PDF button */}
        <PDFButton
          onClick={handleExportPDF}
          loading={pdfLoading}
          label="Export PDF"
        />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        {TABS.map(t => (
          <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {/* Tab content — captured by contentRef for PDF export */}
      <div ref={contentRef}>
        {tab === 'dashboard'  && <TabDashboard />}
        {tab === 'khach-hang' && <TabKhachHang />}
        {tab === 'quan-an'    && <TabQuanAn />}
        {tab === 'huy-don'    && <TabHuyDon />}
      </div>
    </div>
  );
}
