import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import api from '../../utils/api';
import { formatVND } from '../../utils/helpers';

Chart.register(...registerables);

const adm = (url) => api.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } });
const fNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fDT = (s) => { if (!s) return ''; const d = new Date(s); return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

const STATUS_MAP = {
  0: { label: 'Chờ shipper', cls: 'bg-gray-100 text-gray-700' },
  1: { label: 'Chờ quán nhận', cls: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Đang nấu', cls: 'bg-orange-100 text-orange-700' },
  3: { label: 'Đang giao', cls: 'bg-blue-100 text-blue-700' },
  4: { label: 'Hoàn tất', cls: 'bg-green-100 text-green-700' },
  5: { label: 'Đã hủy', cls: 'bg-red-100 text-red-600' },
};

/* ── KPI Card ── */
function StatCard({ label, value, sub, icon, color, isVND = false }) {
  const COLORS = {
    blue: { bg: 'from-blue-50 to-blue-100/50 border-blue-200', icon: 'bg-blue-500', text: 'text-blue-600' },
    green: { bg: 'from-green-50 to-green-100/50 border-green-200', icon: 'bg-green-500', text: 'text-green-600' },
    orange: { bg: 'from-orange-50 to-orange-100/50 border-orange-200', icon: 'bg-orange-500', text: 'text-orange-600' },
    purple: { bg: 'from-purple-50 to-purple-100/50 border-purple-200', icon: 'bg-purple-500', text: 'text-purple-600' },
    red: { bg: 'from-red-50 to-red-100/50 border-red-200', icon: 'bg-red-500', text: 'text-red-600' },
    cyan: { bg: 'from-cyan-50 to-cyan-100/50 border-cyan-200', icon: 'bg-cyan-500', text: 'text-cyan-600' },
  };
  const c = COLORS[color] || COLORS.blue;
  return (
    <div className={`bg-gradient-to-br ${c.bg} rounded-2xl border p-5 hover:shadow-md transition-all`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-extrabold ${c.text} ${isVND ? 'text-lg' : ''} leading-tight`}>
            {isVND ? formatVND(value) : (typeof value === 'string' ? value : fNum(value))}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 ${c.icon} rounded-2xl flex items-center justify-center flex-shrink-0 shadow`}>
          <i className={`fa-solid ${icon} text-white text-base`} />
        </div>
      </div>
    </div>
  );
}

/* ── Top Item Row ── */
function TopItem({ item, index, nameKey, subKey, revKey }) {
  const rank = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-3 rounded-xl transition-colors">
      <span className="w-8 text-center text-lg flex-shrink-0">{rank[index] || <span className="text-gray-400 text-sm font-bold">{index + 1}</span>}</span>
      {item.hinh_anh && <img src={item.hinh_anh} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" onError={e => e.target.style.display='none'} />}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-800 text-sm truncate">{item[nameKey]}</div>
        <div className="text-xs text-gray-400">{item[subKey]}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-sm text-green-600">{formatVND(item[revKey])}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chart refs
  const dailyRef = useRef(null);
  const monthlyRef = useRef(null);
  const doughnutRef = useRef(null);
  const dailyChart = useRef(null);
  const monthlyChart = useRef(null);
  const doughnutChart = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await adm('/api/admin/thong-ke/dashboard');
      if (r.data?.status) {
        setData(r.data.data);
        setTimeout(() => drawCharts(r.data.data), 100);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const destroyCharts = () => {
    [dailyChart, monthlyChart, doughnutChart].forEach(ref => { if (ref.current) { ref.current.destroy(); ref.current = null; } });
  };

  const drawCharts = (d) => {
    destroyCharts();

    // Daily Revenue
    if (dailyRef.current && d.doanh_thu_theo_ngay) {
      dailyChart.current = new Chart(dailyRef.current, {
        type: 'line',
        data: {
          labels: d.doanh_thu_theo_ngay.list_ngay || [],
          datasets: [{
            label: 'Doanh thu', data: d.doanh_thu_theo_ngay.list_tong_tien_hang || [],
            backgroundColor: 'rgba(99,102,241,.12)', borderColor: '#6366f1',
            borderWidth: 2.5, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff', pointBorderWidth: 2, fill: true,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,.85)', callbacks: { label: (c) => `Doanh thu: ${formatVND(c.raw)}` } } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { callback: (v) => formatVND(v), font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          },
        }
      });
    }

    // Monthly Bar
    if (monthlyRef.current && Array.isArray(d.doanh_thu_theo_thang)) {
      monthlyChart.current = new Chart(monthlyRef.current, {
        type: 'bar',
        data: {
          labels: d.doanh_thu_theo_thang.map(x => x.ten_thang),
          datasets: [{
            label: 'Doanh thu', data: d.doanh_thu_theo_thang.map(x => x.doanh_thu),
            backgroundColor: 'rgba(16,185,129,.7)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,.85)', callbacks: { label: (c) => `Doanh thu: ${formatVND(c.raw)}` } } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { callback: (v) => formatVND(v), font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          },
        }
      });
    }

    // Doughnut order status
    if (doughnutRef.current && Array.isArray(d.don_hang_theo_trang_thai)) {
      const colors = [
        'rgba(156,163,175,.8)', // 0: Gray
        'rgba(251,191,36,.8)', // 1: Yellow
        'rgba(249,115,22,.8)',  // 2: Orange
        'rgba(59,130,246,.8)',  // 3: Blue
        'rgba(34,197,94,.8)',   // 4: Green
        'rgba(239,68,68,.8)'    // 5: Red
      ];
      doughnutChart.current = new Chart(doughnutRef.current, {
        type: 'doughnut',
        data: {
          labels: d.don_hang_theo_trang_thai.map(s => s.ten_trang_thai),
          datasets: [{ data: d.don_hang_theo_trang_thai.map(s => s.so_luong), backgroundColor: colors, borderColor: '#fff', borderWidth: 3 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => `${c.label}: ${fNum(c.raw)} đơn` } } },
        }
      });
    }
  };

  useEffect(() => () => destroyCharts(), []);

  const tq = data?.tong_quan || {};
  const growth = (val) => {
    if (!val || val === 0) return <span className="text-gray-400 text-xs"><i className="fa-solid fa-minus mr-1" />Không đổi</span>;
    return val > 0
      ? <span className="text-green-500 text-xs"><i className="fa-solid fa-arrow-up mr-1" />{Math.abs(val)}%</span>
      : <span className="text-red-400 text-xs"><i className="fa-solid fa-arrow-down mr-1" />{Math.abs(val)}%</span>;
  };

  if (loading) return (
    <div className="p-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 h-80 bg-white rounded-2xl animate-pulse" />
        <div className="h-80 bg-white rounded-2xl animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            <i className="fa-solid fa-gauge-high mr-3 text-red-500" />Dashboard Tổng Quan
          </h1>
          <p className="text-gray-400 text-sm mt-1">Chào mừng trở lại! Đây là tổng quan hệ thống FoodBee.</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all shadow"
          style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>
          <i className="fa-solid fa-rotate-right" />Làm mới
        </button>
      </div>

      {/* Row 1: KPI Main */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Quán ăn" value={tq.tong_quan_an} icon="fa-store" color="orange" sub={<><i className="fa-solid fa-circle text-xs text-orange-400" />Toàn hệ thống</>} />
        <StatCard label="Khách hàng" value={tq.tong_khach_hang} icon="fa-users" color="blue" sub={growth(tq.growth_khach_hang)} />
        <StatCard label="Món ăn" value={tq.tong_mon_an} icon="fa-bowl-food" color="cyan" sub={<><i className="fa-solid fa-circle text-xs text-cyan-400" />Sản phẩm</>} />
        <StatCard label="Tổng doanh thu" value={tq.tong_doanh_thu} icon="fa-sack-dollar" color="green" isVND sub={<><i className="fa-solid fa-circle text-xs text-green-400" />Tổng tiền hàng</>} />
      </div>

      {/* Row 2: Profit + Cost */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-green-100/40 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Tiền Lời Hệ Thống</p>
              <p className="text-2xl font-extrabold text-green-700">{formatVND(tq.tong_tien_loi)}</p>
              <p className="text-xs text-green-500 mt-1"><i className="fa-solid fa-circle-info mr-1" />Hoa hồng QA (15%) + Vận hành ship (10%)</p>
            </div>
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-piggy-bank text-white text-xl" /></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100/40 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Tổng Chi Phí</p>
              <p className="text-2xl font-extrabold text-red-600">{formatVND(tq.tong_tien_chi_phi)}</p>
              <p className="text-xs text-red-400 mt-1"><i className="fa-solid fa-tags mr-1" />Voucher hệ thống + Tiền xu đã dùng</p>
            </div>
            <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-cart-minus text-white text-xl" /></div>
          </div>
        </div>
      </div>

      {/* Row 3: Time-based revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Doanh thu hôm nay" value={tq.doanh_thu_hom_nay} icon="fa-calendar-day" color="green" isVND sub={growth(tq.growth_hom_nay)} />
        <StatCard label="Doanh thu tuần này" value={tq.doanh_thu_tuan_nay} icon="fa-calendar-week" color="blue" isVND sub={growth(tq.growth_tuan_nay)} />
        <StatCard label="Doanh thu tháng này" value={tq.doanh_thu_thang_nay} icon="fa-calendar" color="purple" isVND sub={growth(tq.growth_thang_nay)} />
      </div>

      {/* Row 4: Other KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Giá trị đơn trung bình" value={tq.avg_order_value} icon="fa-receipt" color="orange" isVND sub="Trung bình hệ thống" />
        <StatCard label="Đơn đang xử lý" value={tq.don_hang_dang_xu_ly} icon="fa-hourglass-half" color="cyan" sub="Đang chờ & giao" />
        <StatCard label="Tỷ lệ hoàn thành" value={`${tq.completion_rate || 0}%`} icon="fa-circle-check" color="green" sub="Đơn thành công" />
      </div>

      {/* Charts Row 1: Line + Doughnut */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-indigo-500" />Doanh thu 30 ngày gần nhất
          </h3>
          <div className="h-72"><canvas ref={dailyRef} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-purple-500" />Phân bố đơn hàng
          </h3>
          <div className="h-72"><canvas ref={doughnutRef} /></div>
        </div>
      </div>

      {/* Charts Row 2: Monthly Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
          <i className="fa-solid fa-chart-column text-green-500" />Doanh thu theo tháng ({new Date().getFullYear()})
        </h3>
        <div className="h-72"><canvas ref={monthlyRef} /></div>
      </div>

      {/* Top Performers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Restaurants */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-1 text-sm flex items-center gap-2">
            <i className="fa-solid fa-trophy text-yellow-500" />Top 10 Quán Ăn theo doanh thu
          </h3>
          <p className="text-xs text-gray-400 mb-4">Xếp hạng dựa theo tổng tiền đơn hàng</p>
          {!data?.top_quan_an?.length
            ? <div className="text-center py-10 text-gray-300"><i className="fa-solid fa-store text-5xl mb-3 block" /><p>Không có dữ liệu</p></div>
            : <div className="divide-y divide-gray-100">
                {data.top_quan_an.map((q, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors">
                    <span className="w-7 text-center text-base">{['🥇','🥈','🥉'][i] || <b className="text-gray-400 text-xs">{i+1}</b>}</span>
                    <img src={q.hinh_anh || 'https://placehold.co/40'} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" onError={e => e.target.src='https://placehold.co/40'} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{q.ten_quan_an}</div>
                      <div className="text-xs text-gray-400"><i className="fa-solid fa-bag-shopping mr-1" />{fNum(q.tong_don_hang)} đơn</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm text-green-600">{formatVND(q.tong_doanh_thu)}</div>
                      <div className="text-xs text-gray-400">TB: {formatVND(q.doanh_thu_trung_binh)}</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Top Food */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-1 text-sm flex items-center gap-2">
            <i className="fa-solid fa-star text-orange-400" />Top 10 Món Ăn bán chạy
          </h3>
          <p className="text-xs text-gray-400 mb-4">Xếp hạng dựa theo số lượng bán</p>
          {!data?.top_mon_an?.length
            ? <div className="text-center py-10 text-gray-300"><i className="fa-solid fa-bowl-food text-5xl mb-3 block" /><p>Không có dữ liệu</p></div>
            : <div className="divide-y divide-gray-100">
                {data.top_mon_an.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors">
                    <span className="w-7 text-center text-base">{['🥇','🥈','🥉'][i] || <b className="text-gray-400 text-xs">{i+1}</b>}</span>
                    <img src={m.hinh_anh || 'https://placehold.co/40'} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" onError={e => e.target.src='https://placehold.co/40'} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{m.ten_mon_an}</div>
                      <div className="text-xs text-gray-400"><i className="fa-solid fa-cart-shopping mr-1" />{fNum(m.so_luong_ban)} món bán</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm text-green-600">{formatVND((m.gia_khuyen_mai || 0) * (m.so_luong_ban || 0))}</div>
                      <div className="text-xs text-gray-400">{formatVND(m.gia_khuyen_mai)}/món</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Recent Orders + Status Stats */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Status stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
            <i className="fa-solid fa-list-check text-blue-500" />Thống kê theo trạng thái
          </h3>
          {!data?.don_hang_theo_trang_thai?.length
            ? <div className="text-center py-10 text-gray-300"><i className="fa-solid fa-inbox text-5xl mb-3 block" /><p>Không có dữ liệu</p></div>
            : <div className="space-y-3">
                {data.don_hang_theo_trang_thai.map((s, i) => {
                  const total = data.don_hang_theo_trang_thai.reduce((a, b) => a + (b.tong_tien || 0), 0);
                  const pct = total > 0 ? Math.round((s.tong_tien / total) * 100) : 0;
                  const statusInfo = STATUS_MAP[s.trang_thai] || { label: s.ten_trang_thai, cls: 'bg-gray-100 text-gray-600' };
                  const barColors = ['bg-gray-400', 'bg-yellow-400', 'bg-orange-400', 'bg-blue-400', 'bg-green-500', 'bg-red-400'];
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo.cls}`}>{s.ten_trang_thai}</span>
                        <div className="text-right"><span className="text-xs font-bold text-gray-700">{fNum(s.so_luong)}</span></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColors[i] || 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-24 sm:w-28 shrink-0 text-right whitespace-nowrap">{formatVND(s.tong_tien)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-gray-500" />Đơn hàng gần đây
            </h3>
            <Link to="/admin/don-hang" className="text-xs text-blue-500 hover:text-blue-700 font-semibold">Xem tất cả →</Link>
          </div>
          {!data?.don_hang_gan_day?.length
            ? <div className="text-center py-10 text-gray-300"><i className="fa-solid fa-inbox text-5xl mb-3 block" /><p>Không có đơn hàng</p></div>
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-3 py-2 text-left font-semibold">Mã đơn</th>
                    <th className="px-3 py-2 text-left font-semibold">Khách hàng</th>
                    <th className="px-3 py-2 text-left font-semibold">Quán ăn</th>
                    <th className="px-3 py-2 text-right font-semibold">Giá trị</th>
                    <th className="px-3 py-2 text-center font-semibold">Trạng thái</th>
                    <th className="px-3 py-2 text-right font-semibold">Thời gian</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.don_hang_gan_day.map((o, i) => {
                      const st = STATUS_MAP[o.tinh_trang] || { label: o.ten_trang_thai || '?', cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-gray-800">#{o.ma_don_hang}</td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs">{o.ten_khach_hang}</td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs truncate max-w-28">{o.ten_quan_an}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-green-600">{formatVND(o.tong_tien)}</td>
                          <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span></td>
                          <td className="px-3 py-2.5 text-right text-xs text-gray-400">{fDT(o.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          }
        </div>
      </div>
    </div>
  );
}
