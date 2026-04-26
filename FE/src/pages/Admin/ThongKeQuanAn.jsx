import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';

const adA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('nhan_vien_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

export default function AdminThongKeQuanAn() {
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
      const res = await adA('/api/admin/thong-ke/thong-ke-tien-quan-an', 'post', payload);
      if (res.data) {
        setListData(res.data.data || []);
        renderChart(res.data.list_ten || [], res.data.list_tien || []);
      }
    } catch (e) {
      const errs = e?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
      else toast.error('Có lỗi xảy ra khi tải thống kê quán ăn');
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
    const colors = ['#f87979', '#7dcea0', '#3498db', '#17202a', '#4a235a', '#aab7b8', '#d4ac0d', '#e67e22', '#1abc9c', '#9b59b6'];

    chartInstance.current = new Chart(ctx, {
       type: 'doughnut',
       data: {
         labels: labels,
         datasets: [{
           label: 'Doanh Thu',
           data: dataValues,
           backgroundColor: colors,
           borderWidth: 2,
           borderColor: '#ffffff',
         }]
       },
       options: {
         responsive: true,
         maintainAspectRatio: false,
         plugins: {
           legend: { position: 'right', labels: { font: { family: "'Inter', sans-serif" } } },
           tooltip: {
             backgroundColor: 'rgba(15, 23, 42, 0.9)',
             titleFont: { size: 14, family: "'Inter', sans-serif" },
             bodyFont: { size: 14, family: "'Inter', sans-serif" },
             padding: 12,
             cornerRadius: 8,
             displayColors: true
           }
         },
         cutout: '60%'
       }
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-5 border-b border-gray-100 gap-4">
         <div>
            <h1 className="text-3xl font-black text-gray-900"><i className="fa-solid fa-store text-indigo-600 mr-3"></i>Thống Kê Đối Tác</h1>
            <p className="text-gray-500 mt-2 font-medium">Báo cáo doanh thu hoạt động của các đối tác quán ăn.</p>
         </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-6 items-end">
         <div className="w-full md:w-1/3">
           <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Từ Ngày</label>
           <input type="date" value={payload.day_begin} onChange={e=>setPayload({...payload, day_begin: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-medium text-gray-700" />
         </div>
         <div className="w-full md:w-1/3">
           <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Đến Ngày</label>
           <input type="date" value={payload.day_end} max={new Date().toISOString().split('T')[0]} onChange={e=>setPayload({...payload, day_end: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-medium text-gray-700" />
         </div>
         <div className="w-full md:w-1/3">
           <button onClick={fetchData} disabled={loading} className="w-full h-[50px] flex justify-center items-center bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 group">
             {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-filter mr-2 group-hover:scale-110 transition-transform"></i> Lọc Thống Kê</>}
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col items-center">
            <h3 className="font-bold text-gray-800 text-lg mb-6 self-start"><i className="fa-solid fa-chart-pie text-indigo-600 mr-2"></i>Biểu Đồ Thị Phần Tiền Bán Quán Ăn</h3>
            <div className="relative h-[350px] w-full flex justify-center items-center">
               <canvas ref={chartRef}></canvas>
               {!loading && listData.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 text-gray-400 font-medium">
                    Chưa có dữ liệu
                 </div>
               )}
            </div>
         </div>

         <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
               <h3 className="font-bold text-gray-800 text-lg"><i className="fa-solid fa-ranking-star text-amber-500 mr-2"></i>Bảng Phân Tích Quán Ăn</h3>
            </div>
            
            <div className="flex-1 overflow-x-auto p-6">
               <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50 uppercase font-bold tracking-wider">
                     <tr>
                        <th className="px-4 py-3 rounded-l-xl">Tên Quán Ăn</th>
                        <th className="px-4 py-3 text-center">Số KH</th>
                        <th className="px-4 py-3 text-center">Số Đơn</th>
                        <th className="px-4 py-3 text-right rounded-r-xl">Tổng Thu</th>
                     </tr>
                  </thead>
                  <tbody>
                     {listData.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-10 text-gray-400 italic">Không có dữ liệu</td></tr>
                     ) : (
                        listData.map((item, idx) => (
                           <tr key={idx} className="border-b border-gray-50 hover:bg-indigo-50/50 transition-colors group">
                              <td className="px-4 py-4 font-bold text-gray-800 truncate max-w-[150px]"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">{idx + 1}</div>{item.ten_quan_an}</div></td>
                              <td className="px-4 py-4 text-center">
                                 <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-bold text-xs">{item.so_luong_khach_hang}</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg font-bold text-xs">{item.tong_don_hang}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                 <span className="font-bold text-green-600">{formatVND(item.tong_tien_ban || 0)}</span>
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
