import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatVND, formatExpire, isExpiringSoon, getCategoryIcon, copyToClipboard } from '../../utils/helpers';
import toast from 'react-hot-toast';

// =================== PARTICLE CANVAS ===================
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const FOODS = ['🍕','🍔','🍜','🍣','🥘','☕','🍰','🍗','🌮','🥗'];
    const particles = Array.from({ length: 28 }, (_, i) => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.5,
      size: 18 + Math.random() * 22, opacity: 0.08 + Math.random() * 0.13,
      emoji: FOODS[i % FOODS.length], rotation: Math.random() * 360, rotV: (Math.random()-0.5)*0.6,
    }));
    // Starfield particles
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.5, opacity: Math.random(),
      pulse: Math.random() * Math.PI * 2,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // Stars
      stars.forEach(s => {
        s.pulse += 0.015;
        const a = 0.3 + 0.4 * Math.sin(s.pulse);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      });
      // Food emojis
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rotation += p.rotV;
        if (p.y < -50) { p.y = h + 50; p.x = Math.random() * w; }
        if (p.x < -50) p.x = w + 50;
        if (p.x > w + 50) p.x = -50;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.font = `${p.size}px serif`;
        ctx.fillText(p.emoji, -p.size/2, p.size/2);
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />;
}

// =================== HERO 3D MAGICAL ===================
const SLIDES = [
  {
    accent: ['#ff6b35', '#f7931e'],
    glow: 'rgba(255,107,53,0.4)',
    badge: '🔥 Giao hàng siêu tốc',
    title: 'Món Ngon Tới Tay',
    titleHL: 'Trong Tích Tắc',
    desc: 'FoodBee đưa hàng ngàn món ăn ngon từ các nhà hàng uy tín tới tận cửa nhà bạn. Nóng hổi, tươi ngon, đúng giờ!',
    img: 'https://png.pngtree.com/png-clipart/20241112/original/pngtree-food-delivery-by-scooters-free-download-png-image_16940462.png',
    stats: [['50K+','Khách hàng'],['200+','Nhà hàng'],['15p','Giao hàng']],
    orbs: ['#ff6b35','#f7931e','#ffd700'],
  },
  {
    accent: ['#a855f7', '#6366f1'],
    glow: 'rgba(168,85,247,0.4)',
    badge: '✨ Ưu đãi đặc biệt',
    title: 'Giảm Đến',
    titleHL: '50% Hôm Nay!',
    desc: 'Hàng ngàn voucher ưu đãi đang chờ bạn. Đặt ngay để nhận ngay — càng đặt nhiều càng nhiều ưu đãi hấp dẫn!',
    img: 'https://alltop.vn/backend/media/images/posts/695/Dominos_Pizza-196049.jpg',
    stats: [['500+','Voucher'],['30%','Tiết kiệm TB'],['VIP','Thành viên']],
    orbs: ['#a855f7','#6366f1','#ec4899'],
  },
  {
    accent: ['#06b6d4', '#10b981'],
    glow: 'rgba(6,182,212,0.4)',
    badge: '🌏 Đa dạng ẩm thực',
    title: 'Khám Phá',
    titleHL: 'Thế Giới Ẩm Thực',
    desc: 'Từ phở Hà Nội đến sushi Nhật, từ pizza Ý đến pad thai Thái — mọi hương vị đều có mặt trên FoodBee!',
    img: 'https://vj-prod-website-cms.s3.ap-southeast-1.amazonaws.com/shutterstock371955106huge-1675245432977.jpg',
    stats: [['1000+','Món ăn'],['20+','Quốc gia'],['4.9★','Đánh giá']],
    orbs: ['#06b6d4','#10b981','#3b82f6'],
  },
];

function HeroCarousel({ onOrder }) {
  const [current, setCurrent] = useState(0);
  const [countdown, setCountdown] = useState({ h: 2, m: 30, s: 0 });
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const timerRef = useRef(null);
  const countRef = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 5500);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(18, 0, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const diff = target - now;
      setCountdown({ h: Math.floor(diff/3600000), m: Math.floor((diff%3600000)/60000), s: Math.floor((diff%60000)/1000) });
    };
    tick();
    countRef.current = setInterval(tick, 1000);
    return () => clearInterval(countRef.current);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }, []);

  const s = SLIDES[current];
  const pad = n => String(n).padStart(2, '0');
  const rotX = (mousePos.y - 0.5) * -8;
  const rotY = (mousePos.x - 0.5) * 10;

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden flex items-center"
      style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #050714 0%, #0a0f2e 40%, #0d1235 100%)' }}
    >
      {/* Particle Canvas */}
      <ParticleCanvas />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
        {s.orbs.map((color, i) => (
          <div key={`${current}-${i}`} className="absolute rounded-full"
            style={{
              width: `${350 + i * 100}px`, height: `${350 + i * 100}px`,
              background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
              top: i === 0 ? '-10%' : i === 1 ? '40%' : '60%',
              left: i === 0 ? '60%' : i === 1 ? '-10%' : '70%',
              transform: `translate(
                ${(mousePos.x - 0.5) * (20 + i * 15)}px,
                ${(mousePos.y - 0.5) * (20 + i * 10)}px
              )`,
              transition: 'transform 0.3s ease, background 0.8s ease',
              filter: 'blur(40px)',
              animation: `orbFloat ${6+i*2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          />
        ))}
        {/* Grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 relative" style={{ zIndex: 10 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-screen py-24">

          {/* LEFT: Text */}
          <div className="text-white">
            {/* Badge neon */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-black mb-8"
              style={{
                background: `linear-gradient(135deg, ${s.accent[0]}22, ${s.accent[1]}22)`,
                border: `1px solid ${s.accent[0]}60`,
                boxShadow: `0 0 20px ${s.accent[0]}40`,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.7s ease',
              }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: s.accent[0] }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: s.accent[0] }} />
              </span>
              <span style={{ color: s.accent[0] }}>{s.badge}</span>
            </div>

            {/* Title 3D */}
            <h1 className="font-black leading-tight mb-6"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
              <span className="block" style={{ color: 'rgba(255,255,255,0.9)' }}>{s.title}</span>
              <span className="block" style={{
                color: s.accent[0],
                textShadow: `0 0 40px ${s.glow}, 0 0 80px ${s.glow}`,
              }}>{s.titleHL}</span>
            </h1>

            <p className="text-white/60 text-lg mb-10 leading-relaxed max-w-lg">{s.desc}</p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-12">
              <button onClick={onOrder}
                className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${s.accent[0]}, ${s.accent[1]})`, boxShadow: `0 10px 40px ${s.glow}` }}>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                <i className="fa-solid fa-utensils text-lg relative z-10" />
                <span className="relative z-10 text-lg">Đặt Món Ngay</span>
                <i className="fa-solid fa-arrow-right relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-white/80 hover:text-white transition-all duration-300 hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <i className="fa-solid fa-compass" />
                <span>Khám Phá</span>
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              {s.stats.map(([val, lab], i) => (
                <div key={i} className="text-center">
                  <div className="font-black text-2xl" style={{ color: s.accent[0] }}>{val}</div>
                  <div className="text-white/50 text-xs font-semibold uppercase tracking-widest">{lab}</div>
                </div>
              ))}
            </div>

            {/* Countdown */}
            <div className="mt-8 flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color:'#64748b' }}>Flash Sale kết thúc sau:</span>
              {[pad(countdown.h), pad(countdown.m), pad(countdown.s)].map((v, i) => (
                <React.Fragment key={i}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: `inset 0 0 15px ${s.glow}` }}>
                    {v}
                  </div>
                  {i < 2 && <span className="text-white/40 font-black text-xl">:</span>}
                </React.Fragment>
              ))}

            </div>
          </div>

          {/* RIGHT: 3D Floating card */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative w-full max-w-md" style={{ perspective: '1000px' }}>
              {/* Main 3D card */}
              <div className="relative rounded-3xl p-6 transition-all duration-200 cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${s.accent[0]}40`,
                  backdropFilter: 'blur(20px)',
                  transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                  boxShadow: `0 30px 80px ${s.glow}, 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 1px rgba(255,255,255,0.1)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.15s ease, box-shadow 0.7s ease',
                }}>
                {/* Glow top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-1 rounded-full blur-sm"
                  style={{ background: `linear-gradient(90deg, transparent, ${s.accent[0]}, transparent)` }} />
                <img src={s.img} alt="food" className="w-full h-64 object-contain drop-shadow-2xl"
                  style={{ filter: `drop-shadow(0 20px 40px ${s.glow})`, animation: 'floatBob 4s ease-in-out infinite' }} />
                {/* Info bar */}
                <div className="mt-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-black text-lg">FoodBee Delivery</div>
                      <div className="text-white/50 text-sm">Giao hàng nhanh trong 15 phút</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `linear-gradient(135deg, ${s.accent[0]}, ${s.accent[1]})` }}>🚀</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {['⭐ 4.9','🛵 15p','✅ Hoàn tiền'].map((t,i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-bold text-white/70"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating mini cards */}
              {[{ emoji:'🍕', label:'Pizza Ý', price:'89K', pos:'-left-12 top-8', delay:'0s' },
                { emoji:'🍜', label:'Phở Bò', price:'65K', pos:'-right-12 top-16', delay:'1s' },
                { emoji:'☕', label:'Cà Phê', price:'45K', pos:'-left-8 bottom-8', delay:'2s' },
              ].map((card, i) => (
                <div key={i} className={`absolute ${card.pos} rounded-2xl p-3 flex items-center gap-2`}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(20px)',
                    animation: `floatBob ${4+i}s ease-in-out infinite`,
                    animationDelay: card.delay,
                    boxShadow: `0 10px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)`,
                  }}>
                  <span className="text-2xl">{card.emoji}</span>
                  <div>
                    <div className="text-white text-xs font-black">{card.label}</div>
                    <div className="text-xs font-black" style={{ color: s.accent[0] }}>{card.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3" style={{ zIndex: 20 }}>
          {SLIDES.map((sl, i) => (
            <button key={i} onClick={() => { setCurrent(i); clearInterval(timerRef.current); timerRef.current = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 5500); }}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === current ? '40px' : '8px', height: '8px',
                background: i === current ? `linear-gradient(90deg, ${sl.accent[0]}, ${sl.accent[1]})` : 'rgba(255,255,255,0.2)',
                boxShadow: i === current ? `0 0 12px ${sl.accent[0]}` : 'none',
              }} />
          ))}
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 5 }}>
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#ffffff" fillOpacity="0.03" />
          <path d="M0,60 C480,20 960,80 1440,60 L1440,80 L0,80 Z" fill="#ffffff" fillOpacity="0.02" />
        </svg>
      </div>

      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes floatBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </section>
  );
}

// =================== FEATURES 3D ===================
const features = [
  { emoji: '⚡', title: 'Siêu Tốc 15 Phút', desc: 'Giao hàng trong 15 phút', color: ['#f59e0b','#f97316'] },
  { emoji: '🗺️', title: 'Theo Dõi Live Map', desc: 'Xem shipper real-time', color: ['#6366f1','#a855f7'] },
  { emoji: '🍽️', title: '1000+ Món Ăn', desc: 'Đa dạng mọi khẩu vị', color: ['#10b981','#06b6d4'] },
  { emoji: '💰', title: 'Giá Siêu Tốt', desc: 'Voucher mỗi ngày', color: ['#ef4444','#f59e0b'] },
  { emoji: '⭐', title: '4.9★ Chất Lượng', desc: 'Uy tín hàng đầu', color: ['#ec4899','#a855f7'] },
];

// =================== LIGHT THEME CONSTANTS (DragonLab-inspired) ===================
const DARK_BG  = 'linear-gradient(160deg, #f0f4f8 0%, #e8eef5 100%)';
const DARK_BG2 = '#ffffff';
const GRID = {};

// =================== SCROLL REVEAL SYSTEM ===================
// CSS animations injected once at module level
if (typeof document !== 'undefined' && !document.getElementById('reveal-styles')) {
  const style = document.createElement('style');
  style.id = 'reveal-styles';
  style.textContent = `
    [data-reveal] {
      opacity: 0;
      transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.7s ease;
    }
    [data-reveal='fade-up']    { transform: translateY(48px); }
    [data-reveal='fade-down']  { transform: translateY(-32px); }
    [data-reveal='fade-left']  { transform: translateX(-48px); }
    [data-reveal='fade-right'] { transform: translateX(48px); }
    [data-reveal='zoom-in']    { transform: scale(0.88); filter: blur(4px); }
    [data-reveal='flip']       { transform: rotateX(20deg) translateY(40px); perspective: 800px; }
    [data-reveal].revealed {
      opacity: 1;
      transform: none;
      filter: none;
    }
    [data-reveal].stagger-1  { transition-delay: 0.05s; }
    [data-reveal].stagger-2  { transition-delay: 0.12s; }
    [data-reveal].stagger-3  { transition-delay: 0.19s; }
    [data-reveal].stagger-4  { transition-delay: 0.26s; }
    [data-reveal].stagger-5  { transition-delay: 0.33s; }
    [data-reveal].stagger-6  { transition-delay: 0.40s; }
    [data-reveal].stagger-7  { transition-delay: 0.47s; }
    [data-reveal].stagger-8  { transition-delay: 0.54s; }
  `;
  document.head.appendChild(style);
}
function useReveal() {
  useEffect(() => {
    // Delay nhỏ để đảm bảo DOM đã render đầy đủ
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
      );
      const targets = document.querySelectorAll('[data-reveal]:not(.revealed)');
      targets.forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }, 100);
    return () => clearTimeout(timer);
  }); // Chạy sau mỗi render để catch new elements
}

// Reveal wrapper component
function Reveal({ children, effect = 'fade-up', delay = 0, className = '', style: extraStyle = {} }) {
  const delayClass = delay > 0 ? `stagger-${delay}` : '';
  return (
    <div
      data-reveal={effect}
      className={`${delayClass} ${className}`.trim()}
      style={extraStyle}
    >
      {children}
    </div>
  );
}

function DarkHeading({ sub, title, hl, desc }) {
  return (
    <Reveal effect="fade-up">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black mb-4 uppercase tracking-widest"
          style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', color: '#ff6b35' }}>
          {sub}
        </div>
        <h2 className="text-4xl font-black mb-3" style={{ color: '#1e293b' }}>
          {title}
          {hl && <span style={{ color:'#ff6b35' }}> {hl}</span>}
        </h2>
        {desc && <p className="text-base" style={{ color:'#64748b' }}>{desc}</p>}
      </div>
    </Reveal>
  );
}

function BtnMore({ onClick, children }) {
  return (
    <div className="text-center mt-10">
      <button onClick={onClick} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-white transition-all duration-300 hover:scale-105 hover:shadow-xl text-sm"
        style={{ background: 'linear-gradient(135deg,#ff6b35,#f7931e)', boxShadow:'0 8px 30px rgba(255,107,53,0.35)' }}>
        {children}
      </button>
    </div>
  );
}

// =================== MAIN PAGE ===================
export default function HomePage() {
  const navigate = useNavigate();

  // Data states
  const [data, setData] = useState({
    phanLoai: [], quanAn: [], monAnData: [], originalMonAnData: [],
    list_voucher: [], list_quan_an_sale: [], topMonAnTuan: [],
    ngayDauTuan: '', ngayCuoiTuan: '',
  });
  const [voucherCaNhan, setVoucherCaNhan] = useState([]);
  const [goiYCaNhan, setGoiYCaNhan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTopMonAn, setLoadingTopMonAn] = useState(true);
  const [loadingGoiY, setLoadingGoiY] = useState(false);
  const [wishlistIds, setWishlistIds] = useState(new Set()); // id_mon_an đã yêu thích

  // Pagination
  const [saleLimit, setSaleLimit] = useState(8);
  const [restLimit, setRestLimit] = useState(6);
  const [foodLimit, setFoodLimit] = useState(12);
  const [voucherLimit, setVoucherLimit] = useState(8);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [displayMonAn, setDisplayMonAn] = useState([]);

  // Countdown
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Load main data
  useEffect(() => {
    api.get('/api/khach-hang/trang-chu/data')
      .then(res => {
        const d = res.data;
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        const monAnArr = d.mon_an || [];
        setData({
          phanLoai: d.phan_loai || [],
          quanAn: d.quan_an_yeu_thich || [],
          monAnData: monAnArr,
          originalMonAnData: monAnArr,
          list_voucher: (d.voucher || []).filter(v => v.loai_voucher !== 'private'),
          list_quan_an_sale: d.quan_an_sale || [],
          topMonAnTuan: d.top_mon_an_tuan || [],
          ngayDauTuan: fmt(monday),
          ngayCuoiTuan: fmt(sunday),
        });
        setDisplayMonAn(monAnArr);
        setLoadingTopMonAn(false);
        setLoading(false);

        // Load voucher cá nhân
        if (localStorage.getItem('khach_hang_login')) {
          api.get('/api/khach-hang/voucher/cua-toi')
            .then(r => { if (r.data.status) setVoucherCaNhan(r.data.data); })
            .catch(() => { });
          // Tải wishlist IDs
          api.get('/api/khach-hang/yeu-thich/ids', { headers: { Authorization: `Bearer ${localStorage.getItem('khach_hang_login')}` } })
            .then(r => { if (r.data.status) setWishlistIds(new Set(r.data.ids)); })
            .catch(() => { });
        }
      })
      .catch(() => {
        setLoading(false);
        setLoadingTopMonAn(false);
        toast.error('Không thể tải dữ liệu. Vui lòng thử lại!');
      });
  }, []);

  // Toggle yêu thích món ăn
  const toggleWishlist = useCallback(async (e, idMonAn) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('khach_hang_login');
    if (!token) { toast.error('Vui lòng đăng nhập để sử dụng Yêu Thích!'); navigate('/khach-hang/dang-nhap'); return; }
    const isLiked = wishlistIds.has(idMonAn);
    // Optimistic update
    setWishlistIds(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(idMonAn) : next.add(idMonAn);
      return next;
    });
    try {
      await api.post('/api/khach-hang/yeu-thich/toggle', { id_mon_an: idMonAn }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(isLiked ? 'Đã xóa khỏi yêu thích' : '❤️ Đã thêm vào yêu thích!');
    } catch {
      // Rollback
      setWishlistIds(prev => {
        const next = new Set(prev);
        isLiked ? next.add(idMonAn) : next.delete(idMonAn);
        return next;
      });
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
  }, [wishlistIds, navigate]);

  // Load gợi ý cá nhân
  const loadGoiY = useCallback(async (kws = null) => {
    const keywords = kws || JSON.parse(localStorage.getItem('chatbot_preferences') || '[]');
    if (!keywords.length) { setGoiYCaNhan([]); return; }
    setLoadingGoiY(true);
    try {
      const res = await api.post('/api/chatbot/goi-y-ca-nhan', { keywords });
      if (res.data.status) setGoiYCaNhan(res.data.mon_an || []);
    } catch { setGoiYCaNhan([]); }
    finally { setLoadingGoiY(false); }
  }, []);

  useEffect(() => {
    loadGoiY();
    const handler = (e) => loadGoiY(e.detail?.keywords);
    window.addEventListener('chatbot-preference-updated', handler);
    return () => window.removeEventListener('chatbot-preference-updated', handler);
  }, [loadGoiY]);

  // Countdown
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(18, 0, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const diff = target - now;
      setCountdown({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Filter functions
  const filterByPrice = (range) => {
    setSelectedPrice(range);
    const src = data.originalMonAnData;
    let filtered;
    switch (range) {
      case 'under50': filtered = src.filter(i => i.gia_khuyen_mai < 50000); break;
      case '50to100': filtered = src.filter(i => i.gia_khuyen_mai >= 50000 && i.gia_khuyen_mai <= 100000); break;
      case '100to200': filtered = src.filter(i => i.gia_khuyen_mai > 100000 && i.gia_khuyen_mai <= 200000); break;
      case '200to300': filtered = src.filter(i => i.gia_khuyen_mai > 200000 && i.gia_khuyen_mai <= 300000); break;
      case 'above300': filtered = src.filter(i => i.gia_khuyen_mai > 300000); break;
      default: filtered = src;
    }
    setDisplayMonAn(filtered);
    setFoodLimit(12);
  };

  const filterByCategory = (id) => {
    setSelectedCategory(id);
    setSelectedPrice('all');
    if (id === null) {
      setDisplayMonAn(data.originalMonAnData);
    } else {
      setDisplayMonAn(data.originalMonAnData.filter(i => i.id_danh_muc === id));
    }
    setFoodLimit(12);
  };

  const pad = n => String(n).padStart(2, '0');

  // Kích hoạt scroll reveal mỗi khi data thay đổi (để observe các card mới render)
  useReveal();

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      {/* ===== HERO ===== */}
      <HeroCarousel onOrder={() => navigate('/khach-hang/list-quan-an')} />

      {/* ===== FEATURES 3D GLASS ===== */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(160deg,#eef2f8 0%,#f5f7fb 100%)' }}>

        <div className="container mx-auto px-4 relative z-10">
          <Reveal effect="fade-up">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
                style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', color: '#ff6b35' }}>
                <i className="fa-solid fa-rocket" /> Tại sao chọn FoodBee?
              </div>
              <h2 className="text-4xl font-black mb-4" style={{ color: '#1e293b' }}>Trải Nghiệm <span style={{ color:'#ff6b35' }}>Đẳng Cấp</span></h2>
              <p style={{ color:'#64748b' }} className="text-lg">Nền tảng giao đồ ăn thông minh nhất Việt Nam</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {features.map((f, i) => (
              <Reveal key={i} effect="zoom-in" delay={i + 1}>
                <div
                  className="group relative rounded-3xl p-6 text-center cursor-pointer transition-all duration-500 hover:-translate-y-3 hover:scale-105"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = f.color[0] + '50';
                    e.currentTarget.style.boxShadow = `0 12px 40px ${f.color[0]}20`;
                    e.currentTarget.style.background = `linear-gradient(135deg, ${f.color[0]}08, ${f.color[1]}05)`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                    e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)';
                    e.currentTarget.style.background = '#ffffff';
                  }}>
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                    style={{ background: `linear-gradient(135deg, ${f.color[0]}30, ${f.color[1]}20)`, boxShadow: `0 8px 24px ${f.color[0]}30` }}>
                    {f.emoji}
                  </div>
                  <h5 className="font-black text-sm mb-2" style={{ color:'#1e293b' }}>{f.title}</h5>
                  <p className="text-xs leading-relaxed" style={{ color:'#64748b' }}>{f.desc}</p>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 rounded-full transition-all duration-500 group-hover:w-3/4"
                    style={{ background: `linear-gradient(90deg, ${f.color[0]}, ${f.color[1]})` }} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {goiYCaNhan.length > 0 && (
        <section className="py-20 relative overflow-hidden" style={{ background: '#ffffff' }}>
          <div className="absolute inset-0 pointer-events-none" style={GRID} />
          <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background:'rgba(124,58,237,0.12)' }} />
          <div className="container mx-auto px-4 relative z-10">
            <DarkHeading sub="✨ Dành riêng cho bạn" title="Gợi Ý" hl="Cá Nhân" desc="Các món ăn phù hợp với sở thích của bạn" />
            {loadingGoiY ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array(6).fill(0).map((_, i) => <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background:'rgba(255,255,255,0.05)' }} />)}
              </div>
            ) : (
              <React.Fragment>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {goiYCaNhan.map((mon, idx) => (
                    <Reveal key={mon.id} effect="zoom-in" delay={Math.min(idx + 1, 8)}>
                    <Link to={`/khach-hang/quan-an/${mon.id_quan_an}`} className="group block">
                      <div className="rounded-2xl overflow-hidden transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl"
                        style={{ background:'#ffffff', border:'1px solid rgba(124,58,237,0.15)', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.4)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(124,58,237,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.15)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'; }}>
                        <div className="relative">
                          <img src={mon.hinh_anh || 'https://via.placeholder.com/200x160'} alt={mon.ten_mon_an}
                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-black text-white"
                            style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>✨ Cho bạn</span>
                        </div>
                        <div className="p-3">
                          <h6 className="font-black text-sm truncate mb-1" style={{ color:'#1e293b' }}>{mon.ten_mon_an}</h6>
                          <p className="text-xs truncate" style={{ color:'#64748b' }}><i className="fa-solid fa-store mr-1" />{mon.ten_quan_an}</p>
                          {mon.ten_danh_muc && <p className="text-xs mt-1" style={{ color:'#7c3aed' }}><i className="fa-solid fa-tag mr-1" />{mon.ten_danh_muc}</p>}
                        </div>
                      </div>
                    </Link>
                    </Reveal>
                  ))}
                </div>
                <div className="text-center mt-8">
                  <button onClick={() => { localStorage.removeItem('chatbot_preferences'); setGoiYCaNhan([]); toast.success('Đã xóa lịch sử!'); }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:text-white transition-colors"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
                    <i className="fa-solid fa-trash" />Xóa lịch sử sở thích
                  </button>
                </div>
              </React.Fragment>
            )}
          </div>
        </section>
      )}

      {/* ===== TOP MÓN ĂN TUẦN ===== */}
      <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(160deg,#f5f7fb 0%,#eef2f8 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={GRID} />
        <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background:'rgba(255,107,53,0.08)' }} />
        <div className="container mx-auto px-4 relative z-10">
          <DarkHeading sub="📊 Xu hướng tuần này" title="Món Ăn" hl="Bán Chạy Nhất"
            desc={!loadingTopMonAn ? `Top ${data.topMonAnTuan.length} món từ ${data.ngayDauTuan} – ${data.ngayCuoiTuan}` : undefined} />

          {loadingTopMonAn ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array(6).fill(0).map((_, i) => <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background:'rgba(255,255,255,0.05)' }} />)}
            </div>
          ) : data.topMonAnTuan.length === 0 ? (
            <div className="text-center py-16" style={{ color:'#94a3b8' }}>
              <i className="fa-solid fa-chart-bar text-6xl mb-4 block" />Chưa có dữ liệu tuần này
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {data.topMonAnTuan.map((mon, idx) => {
                const rankColors = ['#ffd700','#c0c0c0','#cd7f32'];
                const isTop3 = idx < 3;
                return (
                  <Reveal key={mon.id} effect="fade-up" delay={Math.min(idx + 1, 8)}>
                  <Link to={`/khach-hang/quan-an/${mon.id_quan_an}`} className="group block">
                    <div className="rounded-2xl overflow-hidden transition-all duration-400 hover:-translate-y-2"
                      style={{
                        background:'#ffffff',
                        border: `1px solid ${isTop3 ? rankColors[idx]+'60' : 'rgba(0,0,0,0.07)'}`,
                        boxShadow: isTop3 ? `0 4px 20px ${rankColors[idx]}25` : '0 2px 12px rgba(0,0,0,0.07)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 12px 32px ${isTop3?rankColors[idx]:'#ff6b35'}25`; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow=isTop3?`0 4px 20px ${rankColors[idx]}25`:'0 2px 12px rgba(0,0,0,0.07)'; }}>
                      <div className="relative">
                        <img src={mon.hinh_anh || 'https://via.placeholder.com/200x160'} alt={mon.ten_mon_an}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-2 left-2">
                          {isTop3
                            ? <span className="text-xl drop-shadow-lg">{['🥇','🥈','🥉'][idx]}</span>
                            : <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)' }}>#{idx+1}</span>}
                        </div>
                        <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                          style={{ background:'linear-gradient(135deg,#ff6b35,#f7931e)' }}>
                          <i className="fa-solid fa-fire-flame-curved" />{mon.tong_so_luong_ban}
                        </span>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <i className="fa-solid fa-eye text-white opacity-0 group-hover:opacity-100 transition-opacity text-xl" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h6 className="font-black text-sm truncate mb-0.5" style={{ color:'#1e293b' }}>{mon.ten_mon_an}</h6>
                        <p className="text-xs truncate mb-2" style={{ color:'#64748b' }}><i className="fa-solid fa-store mr-1" />{mon.ten_quan_an}</p>
                        <span className="text-sm font-black" style={{ color:'#ff8c5a' }}>{formatVND(mon.gia_khuyen_mai || mon.gia_ban)}</span>
                      </div>
                    </div>
                  </Link>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== SALE RESTAURANTS ===== */}
      <section className="py-20 relative overflow-hidden" style={{ background: '#ffffff' }}>
        <div className="absolute inset-0 pointer-events-none" style={GRID} />
        <div className="absolute bottom-0 left-1/4 w-96 h-64 rounded-full blur-3xl pointer-events-none" style={{ background:'rgba(239,68,68,0.05)' }} />
        <div className="container mx-auto px-4 relative z-10">
          <DarkHeading sub="🔥 Ưu đãi hấp dẫn" title="Quán Ăn Đang" hl="Sale HOT" desc={`${data.list_quan_an_sale?.length||0} quán đang có ưu đãi đặc biệt!`} />

          {/* Flash sale banner */}
          <div className="rounded-3xl p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
            style={{ background:'linear-gradient(135deg,#1a0a00,#2d1200)', border:'1px solid rgba(255,107,53,0.25)', boxShadow:'0 20px 60px rgba(255,107,53,0.15)' }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage:`radial-gradient(circle at 20% 50%, #ff6b35 0%, transparent 60%)` }} />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black mb-3 text-white"
                style={{ background:'linear-gradient(135deg,#ff6b35,#dc2626)' }}>
                <i className="fa-solid fa-bolt" /> FLASH SALE · CHỈ HÔM NAY
              </div>
              <h3 className="text-3xl font-black text-white mb-1">Giảm Đến <span style={{ color:'#ff6b35' }}>50%</span></h3>
              <p className="text-sm" style={{ color:'rgba(255,255,255,0.6)' }}>{data.list_quan_an_sale?.length||0} quán tham gia chương trình ưu đãi</p>
            </div>
            <div className="flex gap-3 relative z-10">
              {[['Giờ',countdown.hours],['Phút',countdown.minutes],['Giây',countdown.seconds]].map(([lab,val],i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                    style={{ background:'rgba(255,107,53,0.2)', border:'1px solid rgba(255,107,53,0.4)', boxShadow:'0 0 20px rgba(255,107,53,0.15)' }}>
                    {pad(val)}
                  </div>
                  <div className="text-xs mt-1 uppercase font-bold tracking-widest" style={{ color:'rgba(255,255,255,0.5)' }}>{lab}</div>
                </div>
              ))}
            </div>
          </div>

          {data.list_quan_an_sale?.length === 0 ? (
            <div className="text-center py-16" style={{ color:'#94a3b8' }}>
              <i className="fa-solid fa-store-slash text-6xl mb-4 block" />Chưa có quán nào đang sale
            </div>
          ) : (
            <React.Fragment>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {data.list_quan_an_sale.slice(0, saleLimit).map((v, i) => (
                  <Reveal key={i} effect="fade-left" delay={Math.min(i + 1, 8)}>
                  <Link to={`/khach-hang/quan-an/${v.id}`} className="group block">
                    <div className="rounded-3xl overflow-hidden transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl"
                      style={{ background:'#ffffff', border:'1px solid rgba(255,107,53,0.15)', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,107,53,0.4)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(255,107,53,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,107,53,0.15)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'; }}>
                      <div className="relative overflow-hidden">
                        <img src={v.hinh_anh||'https://via.placeholder.com/300x200'} alt={v.ten_quan_an}
                          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-600" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-xs font-black text-white"
                          style={{ background:'linear-gradient(135deg,#dc2626,#ef4444)' }}>-{v.phan_tram_giam||'20'}%</span>
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-xl text-xs font-black text-white"
                          style={{ background:'linear-gradient(135deg,#ff6b35,#f7931e)' }}>🔥 HOT</span>
                        <div className="absolute bottom-3 left-4 right-4">
                          <h5 className="font-black text-white text-base truncate drop-shadow-lg">{v.ten_quan_an}</h5>
                          <p className="text-white/60 text-xs truncate mt-0.5"><i className="fa-solid fa-location-dot mr-1 text-orange-400" />{v.dia_chi}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs" style={{ color:'#64748b' }}><i className="fa-solid fa-motorcycle mr-1 text-orange-400" />{v.phi_ship||'Miễn phí ship'}</span>
                          <span className="text-xs" style={{ color:'#64748b' }}><i className="fa-regular fa-clock mr-1" />30-45 phút</span>
                        </div>
                        {/* Rating row */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg" style={{ background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.25)' }}>
                            <i className="fa-solid fa-star text-yellow-400 text-[10px]" />
                            <span className="font-black text-yellow-500 text-xs ml-0.5">{v.sao_trung_binh ? Number(v.sao_trung_binh).toFixed(1) : '5.0'}</span>
                          </div>
                          {v.so_danh_gia > 0 && (
                            <span className="text-[11px]" style={{ color:'#94a3b8' }}>({v.so_danh_gia} đánh giá)</span>
                          )}
                        </div>
                        <button className="w-full py-2.5 rounded-xl font-black text-white text-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                          style={{ background:'linear-gradient(135deg,#ff6b35,#f7931e)' }}>
                          <i className="fa-solid fa-utensils mr-2" />Đặt ngay
                        </button>
                      </div>
                    </div>
                  </Link>
                  </Reveal>
                ))}
              </div>
              {data.list_quan_an_sale.length > saleLimit && (
                <BtnMore onClick={() => setSaleLimit(l => l+8)}>
                  <i className="fa-solid fa-fire" />Xem Thêm Quán Sale ({data.list_quan_an_sale.length - saleLimit} còn lại)
                </BtnMore>
              )}
            </React.Fragment>
          )}
        </div>
      </section>

      {/* ===== FOOD MENU ===== */}
      <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(160deg,#f5f7fb 0%,#eef2f8 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={GRID} />
        <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background:'rgba(99,102,241,0.08)' }} />
        <div className="container mx-auto px-4 relative z-10">
          <DarkHeading sub="🍽️ Thực đơn" title="Khám Phá" hl="Tất Cả Món Ăn" desc="Hàng ngàn món ăn từ các nhà hàng uy tín" />

          {/* Filters */}
          <div className="rounded-3xl p-6 mb-8" style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <h6 className="font-black text-sm flex items-center gap-2" style={{ color:'#1e293b' }}>
                <i className="fa-solid fa-filter text-orange-400" />Danh mục
              </h6>
              <button onClick={() => { setSelectedCategory(null); setSelectedPrice('all'); setDisplayMonAn(data.originalMonAnData); setFoodLimit(12); }}
                className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1">
                <i className="fa-solid fa-rotate-right" />Đặt lại
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              <button onClick={() => filterByCategory(null)}
                className="px-4 py-2 rounded-xl text-xs font-black transition-all duration-200"
                style={selectedCategory === null
                  ? { background:'linear-gradient(135deg,#ff6b35,#f7931e)', color:'white', boxShadow:'0 4px 15px rgba(255,107,53,0.4)' }
                  : { background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.08)', color:'#475569' }}>
                🔥 Tất cả
              </button>
              {data.phanLoai.map(v => (
                <button key={v.id} onClick={() => filterByCategory(v.id)}
                  className="px-4 py-2 rounded-xl text-xs font-black transition-all duration-200"
                  style={selectedCategory === v.id
                    ? { background:'linear-gradient(135deg,#ff6b35,#f7931e)', color:'white', boxShadow:'0 4px 15px rgba(255,107,53,0.4)' }
                    : { background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.08)', color:'#475569' }}>
                  <i className={`${getCategoryIcon(v.ten_danh_muc)} mr-1`} />{v.ten_danh_muc}
                </button>
              ))}
            </div>
            <h6 className="font-black text-sm flex items-center gap-2 mb-3" style={{ color:'#1e293b' }}>
              <i className="fa-solid fa-tag text-orange-400" />Mức giá
            </h6>
            <div className="flex flex-wrap gap-2">
              {[{key:'all',label:'Tất cả'},{key:'under50',label:'Dưới 50K'},{key:'50to100',label:'50K–100K'},{key:'100to200',label:'100K–200K'},{key:'200to300',label:'200K–300K'},{key:'above300',label:'Trên 300K'}].map(p => (
                <button key={p.key} onClick={() => filterByPrice(p.key)}
                  className="px-4 py-2 rounded-xl text-xs font-black transition-all duration-200"
                  style={selectedPrice === p.key
                    ? { background:'linear-gradient(135deg,#ff6b35,#f7931e)', color:'white', boxShadow:'0 4px 15px rgba(255,107,53,0.4)' }
                    : { background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.08)', color:'#475569' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food grid */}
          {displayMonAn.length === 0 ? (
            <div className="text-center py-16" style={{ color:'#94a3b8' }}>
              <i className="fa-solid fa-bowl-food text-6xl mb-4 block" />Không có món ăn phù hợp
            </div>
          ) : (
            <React.Fragment>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {displayMonAn.slice(0, foodLimit).map((v, k) => (
                  <Reveal key={k} effect="fade-up" delay={Math.min(k + 1, 8)}>
                  <Link to={`/khach-hang/quan-an/${v.id_quan_an}`} className="group block">
                    <div className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2"
                      style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,107,53,0.35)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(255,107,53,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,0,0,0.06)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'; }}>
                      <div className="overflow-hidden relative">
                        <img src={v.hinh_anh} alt={v.ten_mon_an} className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <button className="w-10 h-10 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                            style={{ background:'linear-gradient(135deg,#ff6b35,#f7931e)', boxShadow:'0 4px 20px rgba(255,107,53,0.5)' }}
                            onClick={e => { e.preventDefault(); navigate(`/khach-hang/quan-an/${v.id_quan_an}`); }}>
                            <i className="fa-solid fa-plus" />
                          </button>
                        </div>
                        {/* Heart - wishlist */}
                        <button
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110"
                          style={{ background: wishlistIds.has(v.id) ? '#ef4444' : 'rgba(255,255,255,0.88)', color: wishlistIds.has(v.id) ? 'white' : '#94a3b8' }}
                          onClick={e => toggleWishlist(e, v.id)}>
                          <i className={(wishlistIds.has(v.id) ? 'fa-solid' : 'fa-regular') + ' fa-heart text-xs'} />
                        </button>
                      </div>
                      <div className="p-3">
                        <h6 className="font-black text-xs truncate mb-0.5" style={{ color:'#1e293b' }}>{v.ten_mon_an}</h6>
                        <p className="text-xs truncate mb-2" style={{ color:'#64748b' }}>{v.ten_quan_an}</p>
                        <div className="flex items-center gap-1.5">
                          {v.gia_khuyen_mai > 0 && v.gia_khuyen_mai < v.gia_ban && (
                            <span className="text-[10px] line-through" style={{ color:'#94a3b8' }}>{formatVND(v.gia_ban)}</span>
                          )}
                          <span className="font-black text-xs" style={{ color:'#ff8c5a' }}>{formatVND(v.gia_khuyen_mai||v.gia_ban)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  </Reveal>
                ))}
              </div>
              {displayMonAn.length > foodLimit && (
                <BtnMore onClick={() => setFoodLimit(l => l+12)}>
                  <i className="fa-solid fa-plus" />Xem Thêm Món Ăn ({displayMonAn.length - foodLimit} còn lại)
                </BtnMore>
              )}
            </React.Fragment>
          )}
        </div>
      </section>

      {/* ===== POPULAR RESTAURANTS ===== */}
      <section className="py-24 relative overflow-hidden" style={{ background: '#f5f7fb' }}>
        <div className="absolute inset-0 pointer-events-none" style={GRID} />
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background:'rgba(255,107,53,0.05)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ background:'rgba(99,102,241,0.05)' }} />

        <div className="container mx-auto px-4 relative z-10">
          <DarkHeading sub="⭐ Lựa chọn hàng đầu" title="Quán Ăn" hl="Yêu Thích Nhất" desc="Những nhà hàng được đánh giá cao nhất bởi hàng ngàn khách hàng FoodBee" />

          {/* Restaurant Grid - New Premium Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.quanAn.slice(0, restLimit).map((v, k) => {
              const stars = v.sao_trung_binh ? Number(v.sao_trung_binh).toFixed(1) : '5.0';
              return (
                <Reveal key={k} effect={k % 2 === 0 ? 'fade-left' : 'fade-right'} delay={Math.min(k + 1, 6)}>
                  <Link to={`/khach-hang/quan-an/${v.id}`} className="group block h-full">
                    <div className="relative rounded-3xl overflow-hidden h-full transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl"
                      style={{
                        background: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.07)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
                        minHeight: '220px',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,107,53,0.4)'; e.currentTarget.style.boxShadow='0 20px 50px rgba(255,107,53,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,0,0,0.07)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.07)'; }}>

                      {/* Horizontal layout: image left, info right */}
                      <div className="flex h-full">
                        {/* Image */}
                        <div className="relative flex-shrink-0 overflow-hidden" style={{ width: '40%' }}>
                          <img
                            src={v.hinh_anh || 'https://via.placeholder.com/400x280'}
                            alt={v.ten_quan_an}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            style={{ minHeight: '220px' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />
                          {k === 0 && (
                            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl text-xs font-black text-white"
                              style={{ background:'linear-gradient(135deg,#ff6b35,#f7931e)', boxShadow:'0 4px 15px rgba(255,107,53,0.5)' }}>
                              🏆 NỔI BẬT NHẤT
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col justify-between p-5 flex-1 min-w-0">
                          {/* Top: name + heart */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h5 className="font-black leading-tight line-clamp-2"
                                style={{ fontSize: '1rem', color:'#1e293b' }}>
                                {v.ten_quan_an}
                              </h5>
                              <button className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:text-red-400 transition-all hover:scale-110"
                                style={{ background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.08)', color:'#94a3b8' }}
                                onClick={e => e.preventDefault()}>
                                <i className="fa-regular fa-heart text-xs" />
                              </button>
                            </div>

                            {/* Rating inline — ngay dưới tên quán */}
                            <div className="flex items-center gap-1.5 mb-2">
                              {[1,2,3,4,5].map(i => (
                                <i key={i} className={`fa-${i <= Math.round(Number(stars)) ? 'solid' : 'regular'} fa-star text-yellow-400 text-[11px]`} />
                              ))}
                              <span className="text-xs font-black text-yellow-600">{stars}</span>
                              {v.so_danh_gia > 0 && (
                                <span className="text-xs" style={{ color:'#94a3b8' }}>({v.so_danh_gia} đánh giá)</span>
                              )}
                            </div>

                            {/* Address */}
                            <p className="text-xs mb-3 flex items-start gap-1.5 line-clamp-2" style={{ color:'#64748b' }}>
                              <i className="fa-solid fa-location-dot text-orange-400 mt-0.5 flex-shrink-0" />
                              <span>{v.dia_chi}</span>
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {v.loai_hinh_quan && (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                                  style={{ background:'rgba(255,107,53,0.12)', border:'1px solid rgba(255,107,53,0.25)', color:'#ff8c5a' }}>
                                  {v.loai_hinh_quan}
                                </span>
                              )}
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                                style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#34d399' }}>
                                <i className="fa-solid fa-motorcycle mr-1" />Giao nhanh
                              </span>
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                                style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', color:'#a5b4fc' }}>
                                <i className="fa-solid fa-shield-halved mr-1" />Uy tín
                              </span>
                            </div>
                          </div>

                          {/* Bottom: stats + CTA */}
                          <div>
                            {/* Stats strip */}
                            <div className="flex items-center gap-4 mb-4 pb-3" style={{ borderBottom:'1px solid rgba(0,0,0,0.08)' }}>
                              {/* Rating */}
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg"
                                  style={{ background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.2)' }}>
                                  <i className="fa-solid fa-star text-yellow-400 text-[10px]" />
                                  <span className="font-black text-yellow-400 text-xs">{stars}</span>
                                </div>
                              </div>
                              {/* Time */}
                              <div className="flex items-center gap-1 text-xs" style={{ color:'#64748b' }}>
                                <i className="fa-solid fa-clock text-orange-400" />
                                <span>30-45 phút</span>
                              </div>
                              {/* Min order */}
                              {v.toi_thieu && (
                                <div className="flex items-center gap-1 text-xs" style={{ color:'#64748b' }}>
                                  <i className="fa-solid fa-wallet text-purple-400" />
                                  <span>Min {v.toi_thieu}</span>
                                </div>
                              )}
                            </div>

                            {/* CTA */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px]" style={{ color:'#94a3b8' }}>Miễn phí giao hàng</span>
                              <span className="flex items-center gap-1.5 text-sm font-black px-4 py-2 rounded-xl transition-all duration-300 group-hover:gap-2.5"
                                style={{ background:'linear-gradient(135deg,rgba(255,107,53,0.15),rgba(247,147,30,0.15))', border:'1px solid rgba(255,107,53,0.3)', color:'#ff8c5a' }}>
                                Đặt ngay <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          {data.quanAn.length > restLimit && (
            <BtnMore onClick={() => setRestLimit(l => l + 6)}>
              <i className="fa-solid fa-store" />Xem Thêm Quán Ăn ({data.quanAn.length - restLimit} còn lại)
            </BtnMore>
          )}
        </div>
      </section>


      {/* ===== VOUCHER SECTION ===== */}
      <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(160deg,#f5f7fb 0%,#eef2f8 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={GRID} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-64 rounded-full blur-3xl pointer-events-none" style={{ background:'rgba(124,58,237,0.04)' }} />
        <div className="container mx-auto px-4 relative z-10">
          <DarkHeading sub="🎟️ Ưu đãi độc quyền" title="Mã Giảm Giá" hl="Hấp Dẫn" desc="Sao chép mã và áp dụng ngay khi đặt hàng!" />

          {voucherCaNhan.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 rounded-full" style={{ background:'linear-gradient(90deg,transparent,rgba(220,38,38,0.4),transparent)' }} />
                <span className="font-black text-sm flex items-center gap-2 px-4" style={{ color:'#475569' }}>
                  <i className="fa-solid fa-crown text-yellow-500" />VOUCHER DÀNH RIÊNG CHO BẠN
                  <span className="px-2 py-0.5 rounded-full text-xs font-black text-white" style={{ background:'linear-gradient(135deg,#dc2626,#f59e0b)' }}>{voucherCaNhan.length}</span>
                </span>
                <div className="h-px flex-1 rounded-full" style={{ background:'linear-gradient(90deg,transparent,rgba(220,38,38,0.4),transparent)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {voucherCaNhan.map((v, i) => (
                  <Reveal key={v.id} effect="fade-right" delay={Math.min(i + 1, 4)}>
                    <VoucherCard v={v} type="private" />
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {data.list_voucher.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 rounded-full" style={{ background:'linear-gradient(90deg,transparent,rgba(124,58,237,0.4),transparent)' }} />
                <span className="font-black text-sm flex items-center gap-2 px-4" style={{ color:'#475569' }}>
                  <i className="fa-solid fa-tags text-purple-500" />VOUCHER DÀNH CHO TẤT CẢ
                </span>
                <div className="h-px flex-1 rounded-full" style={{ background:'linear-gradient(90deg,transparent,rgba(124,58,237,0.4),transparent)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.list_voucher.slice(0, voucherLimit).map((v, i) => (
                  <Reveal key={v.id} effect="fade-left" delay={Math.min(i + 1, 4)}>
                    <VoucherCard v={v} type={v.id_quan_an ? 'restaurant' : 'system'} />
                  </Reveal>
                ))}
              </div>
              {data.list_voucher.length > voucherLimit && (
                <BtnMore onClick={() => setVoucherLimit(l => l+8)}>
                  <i className="fa-solid fa-tags" />Xem thêm ({data.list_voucher.length - voucherLimit} voucher còn lại)
                </BtnMore>
              )}
            </div>
          )}

          {data.list_voucher.length === 0 && voucherCaNhan.length === 0 && (
            <div className="text-center py-16" style={{ color:'#94a3b8' }}>
              <i className="fa-solid fa-ticket text-6xl mb-4 block" />Chưa có voucher nào. Đặt hàng thường xuyên để nhận voucher!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// =================== VOUCHER CARD DARK ===================
function VoucherCard({ v, type }) {
  const colorMap = {
    private:    { from: '#dc2626', to: '#f59e0b', icon: 'fa-crown',  label: 'Dành riêng cho bạn', glow: 'rgba(220,38,38,0.2)' },
    restaurant: { from: '#059669', to: '#10b981', icon: 'fa-store',  label: 'Quán ăn',             glow: 'rgba(5,150,105,0.2)' },
    system:     { from: '#7c3aed', to: '#4f46e5', icon: 'fa-bolt',   label: 'Hệ thống',            glow: 'rgba(124,58,237,0.2)' },
  };
  const c = colorMap[type] || colorMap.system;

  const handleCopy = async () => {
    const ok = await copyToClipboard(v.ma_code);
    if (ok) toast.success(`Đã chép mã: ${v.ma_code}`);
    else toast.error('Không thể chép mã');
  };

  return (
    <div className="cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5"
      style={{ background:'#ffffff', border:`1px solid ${c.from}25`, boxShadow:`0 2px 12px rgba(0,0,0,0.07)` }}
      onClick={handleCopy}
      onMouseEnter={e => { e.currentTarget.style.borderColor=c.from+'50'; e.currentTarget.style.boxShadow=`0 12px 32px ${c.glow}`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=c.from+'25'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)'; }}>

      {/* Top bar gradient */}
      <div className="h-1 w-full" style={{ background:`linear-gradient(90deg,${c.from},${c.to})` }} />

      <div className="flex">
        {/* Icon side */}
        <div className="w-16 flex flex-col items-center justify-center py-5 shrink-0"
          style={{ background:`linear-gradient(135deg,${c.from}20,${c.to}10)` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background:`linear-gradient(135deg,${c.from},${c.to})`, boxShadow:`0 4px 12px ${c.glow}` }}>
            <i className={`fas ${c.icon} text-white`} />
          </div>
        </div>

        {/* Dotted separator */}
        <div className="flex flex-col justify-center px-1">
          <div className="w-px h-full border-l-2 border-dashed" style={{ borderColor:`${c.from}20` }} />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between mb-2 gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white"
              style={{ background:`linear-gradient(135deg,${c.from},${c.to})` }}>{c.label}</span>
            <span className={`text-[10px] shrink-0 font-semibold ${isExpiringSoon(v.thoi_gian_ket_thuc) ? 'text-red-500' : ''}`}
              style={!isExpiringSoon(v.thoi_gian_ket_thuc) ? { color:'#94a3b8' } : {}}>
              <i className="fas fa-clock mr-1" />{formatExpire(v.thoi_gian_ket_thuc)}
            </span>
          </div>
          <p className="font-black text-sm mb-1 truncate" style={{ color:'#1e293b' }}>{v.ten_voucher || v.ma_code}</p>
          <p className="font-bold text-xs mb-1" style={{ color:'#ff8c5a' }}>
            {v.loai_giam == 1 ? `Giảm ${v.so_giam_gia}% (tối đa ${formatVND(v.so_tien_toi_da)})` : `Giảm ${formatVND(v.so_giam_gia)}`}
          </p>
          <p className="text-[10px] mb-3" style={{ color:'#94a3b8' }}>Đơn tối thiểu {formatVND(v.don_hang_toi_thieu)}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-1.5 rounded-lg text-xs font-black truncate"
              style={{ background:`${c.from}15`, color: c.from, border:`1px solid ${c.from}30` }}>{v.ma_code}</code>
            <button onClick={e => { e.stopPropagation(); handleCopy(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-black text-white transition-all hover:shadow-lg hover:scale-105"
              style={{ background:`linear-gradient(135deg,${c.from},${c.to})` }}>
              <i className="fas fa-copy mr-1" />Chép
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




