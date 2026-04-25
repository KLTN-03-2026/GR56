import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatVND, DEFAULT_AVATAR, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

import logoFood from '../../assets/logoFood.png';
import NotificationBell from '../NotificationBell';

export default function Navbar() {
  const { user, isLoggedIn, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedFoods, setSuggestedFoods] = useState([]);
  const [suggestedRestaurants, setSuggestedRestaurants] = useState([]);
  const [dynamicMenus, setDynamicMenus] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartSummary, setCartSummary] = useState({ count: 0, id_quan_an: null });
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get('/api/khach-hang/client-menu/data')
      .then(res => {
        if (res.data.status) setDynamicMenus(res.data.data);
      })
      .catch(() => {});
  }, []);

  // Load Cart Summary
  const fetchCartSummary = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await api.get('/api/khach-hang/gio-hang/summary');
      if (res.data.status) {
        setCartSummary({ count: res.data.count, id_quan_an: res.data.id_quan_an });
      }
    } catch {}
  }, [isLoggedIn]);

  useEffect(() => {
    fetchCartSummary();
    window.addEventListener('cart-updated', fetchCartSummary);
    return () => window.removeEventListener('cart-updated', fetchCartSummary);
  }, [fetchCartSummary]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Search suggestions with debounce
  const fetchSuggestions = useCallback(
    debounce(async (keyword) => {
      if (!keyword || keyword.trim().length < 2) {
        setSuggestedFoods([]);
        setSuggestedRestaurants([]);
        return;
      }
      try {
        const res = await api.get('/api/khach-hang/tim-kiem-goi-y', { params: { keyword } });
        if (res.data.status) {
          setSuggestedFoods((res.data.mon_an || []).slice(0, 5));
          setSuggestedRestaurants((res.data.quan_an || []).slice(0, 5));
          setShowSuggestions(true);
        }
      } catch {}
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    fetchSuggestions(val);
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    navigate(`/tim-kiem/${encodeURIComponent(searchTerm.trim())}`);
    setShowSuggestions(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const selectFood = (food) => {
    navigate(`/khach-hang/quan-an/${food.id_quan_an}`);
    setShowSuggestions(false);
    setSearchTerm('');
  };

  const selectRestaurant = (r) => {
    navigate(`/khach-hang/quan-an/${r.id}`);
    setShowSuggestions(false);
    setSearchTerm('');
  };

  const avatarSrc = user?.avatar && user.avatar !== 'null' ? user.avatar : DEFAULT_AVATAR;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.12)' : '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[70px]">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src={logoFood} alt="FoodBee" className="w-10 h-10 object-contain" />
            <span className="text-xl font-extrabold" style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>FoodBee</span>
          </Link>

          {/* Dynamic menus - desktop */}
          <ul className="hidden lg:flex items-center gap-1">
            {dynamicMenus.map((menu, idx) => (
              <li key={idx}>
                <Link
                  to={menu.link}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-gray-600 hover:text-orange-500 hover:bg-orange-50 transition-all duration-200 text-sm"
                >
                  <i className={menu.icon}></i>
                  <span>{menu.ten_menu}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4 relative" ref={searchRef}>
            <div className="flex w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => (suggestedFoods.length || suggestedRestaurants.length) && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Tìm kiếm món ăn, quán ăn..."
                className="flex-1 px-5 py-2.5 border-2 border-r-0 rounded-l-full text-sm outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                style={{ borderColor: '#e2e8f0' }}
                onMouseEnter={e => e.target.style.borderColor = '#ff6b35'}
                onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderColor = '#e2e8f0'; }}
              />
              <button
                onClick={handleSearch}
                className="px-5 py-2.5 text-white rounded-r-full font-medium transition-all duration-200 hover:shadow-lg text-sm"
                style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}
              >
                <i className="fa-solid fa-search"></i>
              </button>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && (suggestedFoods.length > 0 || suggestedRestaurants.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in border border-gray-100">
                {suggestedFoods.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <i className="fa-solid fa-utensils mr-2 text-orange-500"></i>Món ăn
                    </div>
                    {suggestedFoods.map((food, i) => (
                      <div
                        key={i}
                        onMouseDown={() => selectFood(food)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors border-b border-gray-50"
                      >
                        <img src={food.hinh_anh} alt={food.ten_mon_an}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{food.ten_mon_an}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-500">{food.ten_quan_an}</span>
                            <span className="text-xs font-bold text-orange-500">{formatVND(food.gia_khuyen_mai)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {suggestedRestaurants.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <i className="fa-solid fa-store mr-2 text-orange-500"></i>Quán ăn
                    </div>
                    {suggestedRestaurants.map((r, i) => (
                      <div
                        key={i}
                        onMouseDown={() => selectRestaurant(r)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors"
                      >
                        <img src={r.hinh_anh} alt={r.ten_quan_an}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{r.ten_quan_an}</p>
                          <p className="text-xs text-gray-500 truncate">
                            <i className="fa-solid fa-location-dot mr-1 text-red-400"></i>{r.dia_chi}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User actions */}
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                onClick={() => cartSummary.id_quan_an ? navigate(`/khach-hang/quan-an/${cartSummary.id_quan_an}`) : toast.error('Giỏ hàng của bạn đang trống!')}
                className="relative p-2 w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all duration-200"
                title="Giỏ hàng của tôi"
              >
                <i className="fa-solid fa-cart-shopping text-lg"></i>
                {cartSummary.count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {cartSummary.count}
                  </span>
                )}
              </button>
            )}
            {!isLoggedIn ? (
              <>
                <Link
                  to="/khach-hang/dang-nhap"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-200 hover:border-orange-500 hover:text-orange-500"
                  style={{ borderColor: '#e2e8f0', color: '#4a5568' }}
                >
                  <i className="fa-solid fa-sign-in-alt"></i>
                  Đăng nhập
                </Link>
                <Link
                  to="/khach-hang/dang-ky"
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}
                >
                  <i className="fa-solid fa-user-plus"></i>
                  <span className="hidden sm:inline">Đăng ký</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <NotificationBell
                  userType="khach_hang"
                  userId={user?.id}
                  token={user?.id ? localStorage.getItem('khach_hang_login') : null}
                />
                <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all duration-200 hover:border-orange-400 hover:bg-orange-50"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <img src={avatarSrc} alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover border-2 border-orange-200" />
                  <span className="hidden sm:block text-sm font-semibold text-gray-700 max-w-[120px] truncate">
                    {user?.ho_va_ten || 'Tài khoản'}
                  </span>
                  {user?.diem_xu !== undefined && (
                    <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-amber-800 bg-amber-100">
                      <i className="fa-solid fa-coins text-amber-500"></i>
                      {user.diem_xu || 0}
                    </span>
                  )}
                  <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-100">
                      <p className="font-bold text-sm text-gray-800">{user?.ho_va_ten}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/khach-hang/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <i className="fa-solid fa-user w-4 text-center text-orange-400"></i>
                        Thông tin cá nhân
                      </Link>
                      <Link
                        to="/khach-hang/don-hang"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <i className="fa-solid fa-file-invoice w-4 text-center text-orange-400"></i>
                        Đơn hàng của tôi
                      </Link>
                      <Link
                        to="/khach-hang/lich-su-xu"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <i className="fa-solid fa-coins w-4 text-center text-amber-400"></i>
                        ShopeFood Xu
                      </Link>
                      <Link
                        to="/khach-hang/lich-su-giao-dich"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <i className="fa-solid fa-receipt w-4 text-center text-blue-400"></i>
                        Lịch sử giao dịch
                      </Link>
                      <Link
                        to="/khach-hang/yeu-thich"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <i className="fa-solid fa-heart w-4 text-center text-red-400"></i>
                        Món ăn yêu thích
                      </Link>
                    </div>

                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={() => { logout(); setDropdownOpen(false); navigate('/khach-hang/dang-nhap'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <i className="fa-solid fa-sign-out-alt w-4 text-center text-red-400"></i>
                        Đăng xuất
                      </button>
                      <button
                        onClick={() => { logoutAll(); setDropdownOpen(false); navigate('/khach-hang/dang-nhap'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <i className="fa-solid fa-power-off w-4 text-center text-red-400"></i>
                        Đăng xuất tất cả
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <i className={`fa-solid ${mobileOpen ? 'fa-times' : 'fa-bars'} text-gray-600`}></i>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 animate-fade-in">
            {/* Mobile search */}
            <div className="flex mt-3 mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tìm kiếm..."
                className="flex-1 px-4 py-2.5 border-2 border-r-0 rounded-l-full text-sm outline-none bg-gray-50"
                style={{ borderColor: '#e2e8f0' }}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2.5 text-white rounded-r-full text-sm"
                style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}
              >
                <i className="fa-solid fa-search"></i>
              </button>
            </div>

            {/* Mobile nav links */}
            {dynamicMenus.map((menu, idx) => (
              <Link
                key={idx}
                to={menu.link}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors text-sm font-medium"
              >
                <i className={menu.icon}></i>
                {menu.ten_menu}
              </Link>
            ))}

            {!isLoggedIn && (
              <div className="flex gap-2 mt-2">
                <Link to="/khach-hang/dang-nhap" onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-xl border-2 text-sm font-semibold text-gray-600 hover:border-orange-500 hover:text-orange-500 transition-colors"
                  style={{ borderColor: '#e2e8f0' }}>
                  Đăng nhập
                </Link>
                <Link to="/khach-hang/dang-ky" onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
