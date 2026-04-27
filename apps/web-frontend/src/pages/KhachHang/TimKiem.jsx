import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatVND } from '../../utils/helpers';

export default function TimKiem() {
  const { thong_tin } = useParams();
  const navigate = useNavigate();
  const [listMonAn, setListMonAn] = useState([]);
  const [listQuanAn, setListQuanAn] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    search();
  }, [thong_tin]);

  const search = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/khach-hang/mon-an/tim-kiem', { noi_dung_tim: thong_tin });
      setListMonAn(res.data.mon_an || []);
      setListQuanAn(res.data.quan_an || []);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                <i className="fa-solid fa-magnifying-glass mr-2 text-orange-500" />
                Kết quả tìm kiếm: <span className="text-gradient">"{thong_tin}"</span>
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Tìm thấy <span className="font-semibold text-gray-700">{listMonAn.length}</span> món ăn và <span className="font-semibold text-gray-700">{listQuanAn.length}</span> quán ăn
              </p>
            </div>
            <button onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-300 text-orange-500 font-semibold text-sm hover:bg-orange-50 transition-colors">
              <i className="fa-solid fa-arrow-left" />Trang chủ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="text-center py-32">
            <i className="fa-solid fa-spinner fa-spin text-5xl text-orange-500 mb-4 block" />
            <p className="text-gray-400 text-lg">Đang tìm kiếm...</p>
          </div>
        ) : listMonAn.length === 0 && listQuanAn.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl shadow-sm">
            <i className="fa-solid fa-search text-8xl text-gray-100 mb-6 block" />
            <h3 className="text-2xl font-bold text-gray-400 mb-2">Không tìm thấy kết quả</h3>
            <p className="text-gray-400">Vui lòng thử lại với từ khóa khác</p>
            <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 rounded-xl text-white font-bold inline-flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
              <i className="fa-solid fa-home" />Về trang chủ
            </button>
          </div>
        ) : (
          <>
            {/* Food results */}
            {listMonAn.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl"
                    style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
                    <i className="fa-solid fa-bowl-food" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gradient">Món Ăn</h3>
                    <p className="text-gray-400 text-sm">{listMonAn.length} món ăn phù hợp</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {listMonAn.map((item, i) => (
                    <Link key={i} to={`/khach-hang/quan-an/${item.id_quan_an}`} className="group block">
                      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                        <div className="relative overflow-hidden h-36">
                          <img src={item.hinh_anh} alt={item.ten_mon_an} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center shadow-lg">
                              <i className="fa-solid fa-plus" />
                            </div>
                          </div>
                          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                            <i className="fa-solid fa-tag mr-1" />Sale
                          </span>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-gray-800 text-sm truncate mb-1">{item.ten_mon_an}</h4>
                          <p className="text-gray-400 text-xs truncate mb-2">{item.ten_quan_an}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.gia_ban !== item.gia_khuyen_mai && (
                              <span className="text-xs text-gray-300 line-through">{formatVND(item.gia_ban)}</span>
                            )}
                            <span className="text-sm font-bold text-orange-500">{formatVND(item.gia_khuyen_mai)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Restaurant results */}
            {listQuanAn.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl"
                    style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
                    <i className="fa-solid fa-store" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gradient">Quán Ăn</h3>
                    <p className="text-gray-400 text-sm">{listQuanAn.length} quán ăn phù hợp</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {listQuanAn.map((qa, i) => (
                    <Link key={i} to={`/khach-hang/quan-an/${qa.id}`} className="group block">
                      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                        <div className="relative overflow-hidden h-48">
                          <img src={qa.hinh_anh} alt={qa.ten_quan_an} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                            <i className="fa-solid fa-star text-yellow-400" />
                            <span className="font-bold">4.8</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-gray-800 text-base mb-1">{qa.ten_quan_an}</h4>
                          <p className="text-gray-400 text-sm mb-3"><i className="fa-solid fa-location-dot mr-1 text-orange-400" />{qa.dia_chi}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><i className="fa-solid fa-clock text-orange-300" />30-45 phút</span>
                            <span className="flex items-center gap-1"><i className="fa-solid fa-motorcycle text-orange-300" />Miễn phí ship</span>
                          </div>
                          {qa.toi_thieu && (
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-gray-400">Tối thiểu: <span className="font-semibold text-gray-600">{qa.toi_thieu}</span></span>
                              {qa.giam_gia && <span className="text-green-500 font-semibold">{qa.giam_gia}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
