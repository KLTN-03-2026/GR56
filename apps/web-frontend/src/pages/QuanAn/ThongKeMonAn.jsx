import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';

const qA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('quan_an_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

export default function QuanAnThongKeMonAn() {
  const [payload, setPayload] = useState({
    day_begin: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    day_end: new Date().toISOString().split('T')[0]
  });
  
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    fetchData();
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await qA('/api/quan-an/thong-ke/mon-an', 'post', payload);
      if (res.data) {
        setListData(res.data.data || []);
        renderChart(res.data.list_mon_an || [], res.data.list_so_luong || []);
      }
    } catch {
       toast.error('Có lỗi xảy ra khi tải thống kê món ăn');
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (labels, dataValues) => {
    if (chartInstance.current) {
       chartInstance.current.destroy();
    }
    
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
    gradient.addColorStop(1, 'rgba(251, 146, 60, 0.2)');

    chartInstance.current = new Chart(ctx, {
       type: 'bar',
       data: {
         labels: labels,
         datasets: [{
           label: 'Số Lượng Bán Ra',
           data: dataValues,
           backgroundColor: gradient,
           borderColor: '#f97316',
           borderWidth: 1,
           borderRadius: 4,
           barPercentage: 0.6
         }]
       },
       options: {
         responsive: true,
         maintainAspectRatio: false,
         plugins: {
           legend: { display: false },
           tooltip: {
             backgroundColor: 'rgba(15, 23, 42, 0.9)',
             titleFont: { size: 14, family: "'Inter', sans-serif" },
             bodyFont: { size: 14, family: "'Inter', sans-serif" },
             padding: 12,
             cornerRadius: 8,
             displayColors: false
           }
         },
         scales: {
           y: { 
             beginAtZero: true, 
             grid: { color: '#f1f5f9', drawBorder: false },
             ticks: { stepSize: 1, font: { family: "'Inter', sans-serif" } }
           },
           x: { 
             grid: { display: false },
             ticks: { font: { family: "'Inter', sans-serif" } }
           }
         }
       }
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-5 border-b border-gray-100 gap-4">
         <div>
            <h1 className="text-3xl font-black text-gray-900"><i className="fa-solid fa-chart-pie text-orange-500 mr-3"></i>Thống Kê Món Ăn</h1>
            <p className="text-gray-500 mt-2 font-medium">Theo dõi hiệu suất bán hàng của từng món trong thực đơn.</p>
         </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-6 items-end">
         <div className="w-full md:w-1/3">
           <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Từ Ngày</label>
           <input type="date" value={payload.day_begin} onChange={e=>setPayload({...payload, day_begin: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none font-medium" />
         </div>
         <div className="w-full md:w-1/3">
           <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Đến Ngày</label>
           <input type="date" value={payload.day_end} max={new Date().toISOString().split('T')[0]} onChange={e=>setPayload({...payload, day_end: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none font-medium" />
         </div>
         <div className="w-full md:w-1/3">
           <button onClick={fetchData} disabled={loading} className="w-full h-[50px] flex justify-center items-center bg-gray-800 text-white rounded-xl font-bold shadow-md hover:bg-gray-700 transition-colors disabled:opacity-50 group">
             {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-filter mr-2 group-hover:scale-110 transition-transform"></i> Lọc Kết Quả</>}
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Chart section */}
         <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 text-lg mb-6"><i className="fa-solid fa-chart-bar text-orange-500 mr-2"></i>Biểu Đồ Top Món Ăn Bán Chạy</h3>
            <div className="relative h-[350px] w-full">
               <canvas ref={chartRef}></canvas>
               {!loading && listData.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 text-gray-400 font-medium">
                    Chưa có dữ liệu trong khoảng thời gian này
                 </div>
               )}
            </div>
         </div>

         {/* Table section */}
         <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
               <h3 className="font-bold text-gray-800 text-lg"><i className="fa-solid fa-ranking-star text-amber-500 mr-2"></i>Bảng Phân Tích Món Ăn</h3>
            </div>
            
            <div className="flex-1 overflow-x-auto p-6">
               <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50 uppercase font-bold tracking-wider">
                     <tr>
                        <th className="px-4 py-3 rounded-l-xl text-center">STT</th>
                        <th className="px-4 py-3">Tên Món Ăn</th>
                        <th className="px-4 py-3 text-center">SL Bán</th>
                         <th className="px-4 py-3 text-right rounded-r-xl">Doanh Thu (Sau CK 15%)</th>
                     </tr>
                  </thead>
                  <tbody>
                     {listData.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-10 text-gray-400 italic">Không có dữ liệu</td></tr>
                     ) : (
                        listData.map((item, idx) => (
                           <tr key={idx} className="border-b border-gray-50 hover:bg-orange-50/50 transition-colors group">
                              <td className="px-4 py-4 text-center font-bold text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-4 font-bold text-gray-800 truncate max-w-[150px]">{item.ten_mon_an}</td>
                              <td className="px-4 py-4 text-center">
                                 <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg font-bold text-xs">{item.so_luong_ban}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                 <span className="font-bold text-gray-700">{formatVND(item.tong_tien_hang || 0)}</span>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
      
    </div>
  );
}
