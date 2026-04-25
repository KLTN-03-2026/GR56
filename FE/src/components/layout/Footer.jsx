import { Link } from 'react-router-dom';
import logoFood from '../../assets/logoFood.png';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter */}
      <div style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }} className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Đăng ký nhận thông tin ưu đãi</h3>
              <p className="text-orange-100">Nhận ngay các mã giảm giá và thông tin món ăn mới nhất</p>
            </div>
            <div className="flex w-full md:w-auto">
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                className="flex-1 md:w-72 px-5 py-3 rounded-l-full text-gray-800 text-sm outline-none border-none"
              />
              <button className="px-6 py-3 bg-gray-900 text-white rounded-r-full font-semibold text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
                <i className="fa-solid fa-paper-plane"></i>
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logoFood} className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-md" alt="FoodBee" />
                <span className="text-xl font-extrabold">FoodBee</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                FoodBee - Nền tảng giao đồ ăn hàng đầu Việt Nam. Kết nối bạn với hàng ngàn nhà hàng
                và món ăn ngon chỉ với vài cú nhấp chuột.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: 'fab fa-facebook-f', href: '#', color: '#1877f2' },
                  { icon: 'fab fa-instagram', href: '#', color: '#e1306c' },
                  { icon: 'fab fa-twitter', href: '#', color: '#1da1f2' },
                  { icon: 'fab fa-youtube', href: '#', color: '#ff0000' },
                ].map((s, i) => (
                  <a key={i} href={s.href}
                    className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg text-sm"
                    style={{ '--hover-color': s.color }}
                    onMouseEnter={e => { e.currentTarget.style.background = s.color; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#9ca3af'; }}
                  >
                    <i className={s.icon}></i>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-white font-bold mb-5 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(#ff6b35, #f7931e)' }}></span>
                Liên kết nhanh
              </h4>
              <ul className="space-y-3">
                {[
                  { label: 'Trang chủ', to: '/' },
                  { label: 'Quán ăn', to: '/khach-hang/list-quan-an' },
                  { label: 'Đơn hàng', to: '/khach-hang/don-hang' },
                  { label: 'Lịch sử xu', to: '/khach-hang/lich-su-xu' },
                  { label: 'Yêu thích', to: '/khach-hang/yeu-thich' },
                  { label: 'Hồ sơ', to: '/khach-hang/profile' },
                ].map((link, i) => (
                  <li key={i}>
                    <Link to={link.to}
                      className="text-gray-400 hover:text-orange-400 text-sm transition-colors flex items-center gap-2 group">
                      <i className="fa-solid fa-chevron-right text-xs text-orange-500 group-hover:translate-x-1 transition-transform"></i>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* For partners */}
            <div>
              <h4 className="text-white font-bold mb-5 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(#ff6b35, #f7931e)' }}></span>
                Đối tác
              </h4>
              <ul className="space-y-3">
                {[
                  { label: 'Đăng ký quán ăn', to: '/quan-an/dang-ky' },
                  { label: 'Đăng ký shipper', to: '/shipper/dang-ky' },
                  { label: 'Đăng nhập quán ăn', to: '/quan-an/dang-nhap' },
                  { label: 'Đăng nhập shipper', to: '/shipper/dang-nhap' },
                ].map((link, i) => (
                  <li key={i}>
                    <Link to={link.to}
                      className="text-gray-400 hover:text-orange-400 text-sm transition-colors flex items-center gap-2 group">
                      <i className="fa-solid fa-chevron-right text-xs text-orange-500 group-hover:translate-x-1 transition-transform"></i>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-5 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(#ff6b35, #f7931e)' }}></span>
                Liên hệ
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-400">
                  <i className="fa-solid fa-location-dot text-orange-400 mt-0.5 w-4"></i>
                  <span>123 Đường Nguyễn Văn Linh, Q.Hải Châu, TP.Đà Nẵng</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <i className="fa-solid fa-phone text-orange-400 w-4"></i>
                  <a href="tel:0394425076" className="hover:text-orange-400 transition-colors">0394 442 5076</a>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <i className="fa-solid fa-envelope text-orange-400 w-4"></i>
                  <a href="mailto:vannhan130504@gmail.com" className="hover:text-orange-400 transition-colors">vannhan130540@gmail.com</a>
                </li>
              </ul>

              {/* App Badges */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-gray-700 transition-colors">
                  <i className="fab fa-apple text-2xl text-white"></i>
                  <div>
                    <p className="text-gray-400 text-xs">Tải trên</p>
                    <p className="text-white text-sm font-bold">App Store</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-gray-700 transition-colors">
                  <i className="fab fa-google-play text-2xl text-green-400"></i>
                  <div>
                    <p className="text-gray-400 text-xs">Tải trên</p>
                    <p className="text-white text-sm font-bold">Google Play</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800 py-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">
            © 2024 FoodBee. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {['Chính sách bảo mật', 'Điều khoản dịch vụ', 'Cookie'].map((item, i) => (
              <a key={i} href="#" className="text-gray-500 hover:text-orange-400 text-xs transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
