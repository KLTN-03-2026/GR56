import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../../utils/api';
import { formatVND } from '../../utils/helpers';

Chart.register(...registerables);

const adm = (url) => api.get(url, {
  headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` }
});

const fNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmt = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

// ── Skeleton ──
function Skeleton({ h = 'h-48' }) {
  return <div className={`${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

// ── Stat Card ──
function StatCard({ label, value, icon, color }) {
  const COLORS = {
    purple: { bg: 'from-purple-50 to-purple-100/50 border-purple-200', icon: 'bg-purple-500', text: 'text-purple-600' },
    cyan: { bg: 'from-cyan-50 to-cyan-100/50 border-cyan-200', icon: 'bg-cyan-500', text: 'text-cyan-600' },
    green: { bg: 'from-green-50 to-green-100/50 border-green-200', icon: 'bg-green-500', text: 'text-green-600' },
    orange: { bg: 'from-orange-50 to-orange-100/50 border-orange-200', icon: 'bg-orange-500', text: 'text-orange-600' },
  };
  const c = COLORS[color] || COLORS.purple;
  return (
    <div className={`bg-gradient-to-br ${c.bg} rounded-2xl border p-5`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-extrabold ${c.text}`}>{typeof value === 'number' ? fNum(value) : value}</p>
        </div>
        <div className={`w-11 h-11 ${c.icon} rounded-xl flex items-center justify-center shadow`}>
          <i className={`fa-solid ${icon} text-white text-sm`} />
        </div>
      </div>
    </div>
  );
}

// ── Date Filter ──
function DateFilter({ from, to, onFrom, onTo, onApply, loading }) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-calendar-day text-gray-400 text-xs" />
        <input type="date" value={from} onChange={e => onFrom(e.target.value)}
          className="text-sm text-gray-700 outline-none" />
      </div>
      <span className="text-gray-400 text-sm font-semibold">đến</span>
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-calendar-day text-gray-400 text-xs" />
        <input type="date" value={to} onChange={e => onTo(e.target.value)}
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

// ── Intent Badge ──
const INTENT_COLORS = {
  'tìm_món': 'bg-blue-100 text-blue-700',
  'healthy': 'bg-green-100 text-green-700',
  'cay': 'bg-red-100 text-red-700',
  'tiết_kiệm': 'bg-yellow-100 text-yellow-700',
  'mood_vui': 'bg-pink-100 text-pink-700',
  'mood_buồn': 'bg-gray-100 text-gray-700',
  'dat_hang_lai': 'bg-purple-100 text-purple-700',
  'tìm_quán': 'bg-orange-100 text-orange-700',
  'theo_danh_muc': 'bg-cyan-100 text-cyan-700',
  'unknown': 'bg-gray-100 text-gray-500',
};
const INTENT_LABELS = {
  'tìm_món': 'Tim mon',
  'healthy': 'Healthy',
  'cay': 'Cay',
  'tiết_kiệm': 'Tiet kiem',
  'mood_vui': 'Vui',
  'mood_buồn': 'Buon',
  'dat_hang_lai': 'Dat hang lai',
  'tìm_quán': 'Tim quan',
  'theo_danh_muc': 'Danh muc',
  'unknown': 'Unknown',
};

export default function AdminChatbotAnalytics() {
  const [period, setPeriod] = useState(7);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Trending
  const [trending, setTrending] = useState([]);
  const [trendingPeriod, setTrendingPeriod] = useState(7);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const donutRef = useRef(null);
  const lineRef = useRef(null);
  const donutChart = useRef(null);
  const lineChart = useRef(null);

  // ── Load analytics ──
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await adm(`/api/admin/chatbot-analytics?period=${period}`);
      if (res.data.status) setAnalytics(res.data);
    } catch (e) {
      console.error('Chatbot analytics error:', e);
    }
    setLoading(false);
  };

  // ── Load trending ──
  const loadTrending = async () => {
    setTrendingLoading(true);
    try {
      const res = await adm(`/api/admin/ai-trending?period=${trendingPeriod}&limit=20`);
      if (res.data.status) setTrending(res.data.dishes || []);
    } catch (e) {
      console.error('Trending error:', e);
    }
    setTrendingLoading(false);
  };

  useEffect(() => { loadAnalytics(); }, [period]);
  useEffect(() => { loadTrending(); }, [trendingPeriod]);

  // ── Draw charts ──
  useEffect(() => {
    if (!analytics || !analytics.intent_distribution) return;

    // Donut — intent distribution
    if (donutRef.current) {
      if (donutChart.current) donutChart.current.destroy();
      const data = analytics.intent_distribution;
      donutChart.current = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: data.map(d => INTENT_LABELS[d.intent] || d.intent),
          datasets: [{
            data: data.map(d => d.count),
            backgroundColor: [
              '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
              '#ec4899', '#6366f1', '#f97316', '#14b8a6', '#9ca3af',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'right', labels: { font: { size: 12 }, padding: 12 } },
            title: { display: true, text: 'Phan bo Intent', font: { size: 14, weight: 'bold' } },
          },
        },
      });
    }

    // Line — conversation volume
    if (lineRef.current) {
      if (lineChart.current) lineChart.current.destroy();
      const byDay = analytics.volume_by_day || [];
      lineChart.current = new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels: byDay.map(d => fmt(d.date)),
          datasets: [
            {
              label: 'So cuoc hoi thoai',
              data: byDay.map(d => d.sessions),
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139,92,246,0.1)',
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Tin nhan',
              data: byDay.map(d => d.total_messages || 0),
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6,182,212,0.1)',
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Luong hoi thoai theo ngay', font: { size: 14, weight: 'bold' } },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    return () => {
      if (donutChart.current) donutChart.current.destroy();
      if (lineChart.current) lineChart.current.destroy();
    };
  }, [analytics]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
            <i className="fa-solid fa-robot text-purple-500" />
            Chatbot AI Analytics
          </h1>
          <p className="text-sm text-gray-400 mt-1">Theo doi hieu qua chatbot va xu huong AI</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${period === p ? 'text-white shadow' : 'text-gray-500 bg-white border hover:bg-gray-50'}`}
              style={period === p ? { background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' } : {}}>
              {p === 7 ? '7 ngay' : p === 14 ? '14 ngay' : '30 ngay'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tong cuoc hoi thoai"
          value={fNum(analytics?.total_sessions || 0)}
          icon="fa-comments"
          color="purple"
        />
        <StatCard
          label="Chuyen doi thanh don"
          value={`${analytics?.conversion_rate || 0}%`}
          icon="fa-bag-shopping"
          color="cyan"
        />
        <StatCard
          label="Cuoc hoi thoai thanh cong"
          value={fNum(analytics?.converted_sessions || 0)}
          icon="fa-check-circle"
          color="green"
        />
        <StatCard
          label="Ty le chuyen doi"
          value={`${analytics?.total_sessions > 0
            ? Math.round((analytics?.converted_sessions / analytics?.total_sessions) * 100) : 0}%`}
          icon="fa-chart-line"
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <Skeleton h="h-72" />
            <Skeleton h="h-72" />
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <canvas ref={donutRef} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <canvas ref={lineRef} />
            </div>
          </>
        )}
      </div>

      {/* Intent + Top Asked Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intent Distribution Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <i className="fa-solid fa-brain text-purple-500" />
            <h2 className="font-bold text-gray-800">Intent Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-bold text-gray-500 uppercase text-xs">Intent</th>
                  <th className="px-5 py-3 text-center font-bold text-gray-500 uppercase text-xs">So lan</th>
                  <th className="px-5 py-3 text-center font-bold text-gray-500 uppercase text-xs">Ty le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(analytics?.intent_distribution || []).map((item) => {
                  const total = analytics?.intent_distribution?.reduce((s, i) => s + i.count, 0) || 1;
                  const pct = ((item.count / total) * 100).toFixed(1);
                  return (
                    <tr key={item.intent} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${INTENT_COLORS[item.intent] || INTENT_COLORS['unknown']}`}>
                          {INTENT_LABELS[item.intent] || item.intent}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-semibold text-gray-700">{fNum(item.count)}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)' }} />
                          </div>
                          <span className="text-xs font-bold text-gray-500 w-10">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Asked Dishes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <i className="fa-solid fa-fire text-orange-500" />
            <h2 className="font-bold text-gray-800">Top Hoi Nhieu Nhat</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(analytics?.top_asked_dishes || []).slice(0, 10).map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                  {idx + 1}
                </span>
                {item.hinh_anh && (
                  <img src={item.hinh_anh} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    onError={e => e.target.style.display = 'none'} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{item.ten_mon_an}</p>
                  <p className="text-xs text-gray-400">{formatVND(item.gia_khuyen_mai || item.gia_ban)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
                    <i className="fa-solid fa-comment-dots text-xs" />
                    {fNum(item.ask_count)}
                  </div>
                  <p className="text-[10px] text-gray-400">luot hoi</p>
                </div>
              </div>
            ))}
            {(!analytics?.top_asked_dishes || analytics.top_asked_dishes.length === 0) && (
              <div className="py-8 text-center text-gray-400 text-sm">Chua co du lieu</div>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Trending Dishes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-fire-flame-curved text-red-500" />
            <h2 className="font-bold text-gray-800">Hot theo AI</h2>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
              {trending.filter(d => d.is_hot).length} mon hot
            </span>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map(p => (
              <button key={p} onClick={() => setTrendingPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${trendingPeriod === p ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
                style={trendingPeriod === p ? { background: 'linear-gradient(135deg,#e94560,#c0392b)' } : {}}>
                {p} ngay
              </button>
            ))}
          </div>
        </div>

        {trendingLoading ? (
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} h="h-48" />)}
          </div>
        ) : trending.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <i className="fa-solid fa-fire-flame-curved text-4xl mb-3 block" />
            <p>Chua co du lieu trending. Chay lenh <code className="bg-gray-100 px-1 rounded">php artisan chatbot:compute-trending</code> de tinh toan.</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trending.map((dish) => (
              <div key={dish.id} className={`relative rounded-2xl border overflow-hidden transition-all hover:shadow-md hover:-translate-y-1
                ${dish.is_hot ? 'border-red-200 bg-gradient-to-b from-red-50 to-white' : 'border-gray-100 bg-white'}`}>
                {dish.is_hot && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1 z-10">
                    <i className="fa-solid fa-fire" /> HOT
                  </div>
                )}
                {dish.mon_an?.hinh_anh ? (
                  <img src={dish.mon_an.hinh_anh} alt={dish.mon_an.ten_mon_an}
                    className="w-full h-28 object-cover"
                    onError={e => e.target.style.display = 'none'} />
                ) : (
                  <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                    <i className="fa-solid fa-bowl-food text-3xl text-gray-300" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-bold text-sm text-gray-800 truncate">{dish.mon_an?.ten_mon_an || 'Mon an'}</p>
                  <p className="text-xs text-gray-400 truncate">{dish.quan_an?.ten_quan_an || ''}</p>
                  <p className="text-sm font-bold text-orange-500 mt-1">
                    {formatVND(dish.mon_an?.gia_khuyen_mai || dish.mon_an?.gia_ban || 0)}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-bag-shopping" /> {fNum(dish.order_count_7d)}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-comment" /> {fNum(dish.conversation_count_7d)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                        style={{ width: `${Math.min(100, dish.score / 2)}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">{dish.score?.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
