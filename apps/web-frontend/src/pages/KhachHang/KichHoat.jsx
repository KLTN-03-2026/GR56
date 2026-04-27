import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function KichHoat() {
  const { id_khach_hang } = useParams();
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    api.post('/api/khach-hang/kich-hoat', { id_khach_hang })
      .then(res => {
        if (res.data.status) {
          toast.success(res.data.message);
        } else {
          toast.error(res.data.message);
        }
        navigate('/khach-hang/dang-nhap');
      })
      .catch(() => {
        toast.error('Có lỗi xảy ra khi kích hoạt tài khoản!');
        navigate('/khach-hang/dang-nhap');
      });
  }, [id_khach_hang, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
      <div className="text-center text-white">
        <i className="fa-solid fa-spinner fa-spin text-6xl mb-4 block" />
        <h2 className="text-2xl font-bold">Đang kích hoạt tài khoản...</h2>
        <p className="opacity-75 mt-2">Vui lòng chờ trong giây lát</p>
      </div>
    </div>
  );
}
