/**
 * ChatbotWidget v2.0 — AI Agent Architecture
 * ============================================
 * Toàn bộ logic xử lý ý định (intent), context, từ khóa đã được
 * chuyển sang Python AI Agent (Groq LLM + Tool Calling).
 * Frontend chỉ đảm nhiệm: hiển thị UI, gửi tin nhắn, render kết quả.
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatVND } from '../utils/helpers';
import logoFood from '../assets/logoFood.png';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen]       = useState(false);
  const [isTyping, setIsTyping]   = useState(false);
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages]   = useState([]);
  const [chatHistory, setChatHistory] = useState([]); // Multi-turn history gửi cho AI Agent
  const messagesEndRef = useRef(null);
  const navigate       = useRef(useNavigate()).current;

  // Quick actions — gợi ý phổ biến (không có logic, chỉ gửi text lên Agent)
  const quickActions = [
    { label: "🔥 Bán chạy",   message: "món nào bán chạy nhất hôm nay?" },
    { label: "🧊 Đồ lạnh",    message: "trời nóng muốn uống gì mát mát?" },
    { label: "🍜 Bún/Phở",    message: "tìm bún hoặc phở ngon" },
    { label: "🍚 Cơm",        message: "gợi ý cơm" },
    { label: "☕ Đồ uống",    message: "tìm đồ uống" },
    { label: "💰 Dưới 50k",   message: "món ăn dưới 50 nghìn" },
    { label: "🍲 Lẩu/Nướng",  message: "tìm lẩu hoặc nướng" },
    { label: "🎟️ Voucher",    message: "có voucher gì không?" },
    { label: "⭐ Quán ngon",  message: "quán nào được đánh giá cao nhất?" },
    { label: "📦 Đơn hàng",   message: "xem đơn hàng của tôi" },
    { label: "💰 Ví tiền",    message: "kiểm tra số dư ví của tôi" },
    { label: "🎯 Gợi ý riêng",message: "gợi ý món ăn dựa trên sở thích của tôi" },
  ];

  // ─── Lấy user context từ localStorage ─────────────────
  const getUserContext = () => {
    try {
      const raw = localStorage.getItem('khach_hang_login');
      if (!raw) return { is_logged_in: false, khach_hang_id: null };
      const parsed = JSON.parse(raw);
      return {
        is_logged_in:  true,
        khach_hang_id: parsed?.id || parsed?.khach_hang?.id || null,
        ten:           parsed?.ho_ten || parsed?.khach_hang?.ho_ten || '',
      };
    } catch {
      return { is_logged_in: false, khach_hang_id: null };
    }
  };

  // ─── Welcome message ────────────────────────────────────
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const ctx = getUserContext();
      const greeting = ctx.is_logged_in
        ? `👋 Chào mừng trở lại${ctx.ten ? `, <strong>${ctx.ten}</strong>` : ''}! Tôi là <strong>FoodBee AI Agent</strong> 🍯<br/>Hỏi tôi bất cứ điều gì về món ăn, đơn hàng hoặc ví tiền của bạn nhé!`
        : `👋 Xin chào! Tôi là <strong>FoodBee AI Agent</strong> 🍯<br/>Được hỗ trợ bởi <strong>Groq AI</strong> ⚡ — Tôi tự suy luận và tìm kiếm thông tin cho bạn!`;
      setMessages([{
        from: 'bot',
        text: greeting,
        buttons: ctx.is_logged_in ? null : [
          { text: '🍜 Tìm món ăn',  type: 'message', message: 'gợi ý món ăn ngon' },
          { text: '🔐 Đăng nhập',   type: 'route',   route: '/khach-hang/dang-nhap' },
          { text: '📝 Đăng ký',     type: 'route',   route: '/khach-hang/dang-ky' },
        ],
      }]);
    }
  }, [isOpen]);

  // ─── Auto scroll ─────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ═══════════════════════════════════════════════════
  //  GỌI AI AGENT (Python Flask — port 5000)
  //  Toàn bộ NLP, intent detection, tool selection = AI làm
  // ═══════════════════════════════════════════════════
  const callAgent = async (msg) => {
    const aiServerURL  = import.meta.env.VITE_AI_SERVER_URL || 'http://127.0.0.1:5000';
    const user_context = getUserContext();

    try {
      const controller  = new AbortController();
      const timeoutId   = setTimeout(() => controller.abort(), 45000); // 45s cho multi-step agent

      const res = await axios.post(`${aiServerURL}/api/chat`, {
        message:      msg,
        history:      chatHistory.slice(-20),  // Truyền lịch sử hội thoại
        user_context,                           // ID, trạng thái đăng nhập
      }, {
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });

      clearTimeout(timeoutId);
      return res.data;

    } catch (err) {
      // Agent offline / timeout → thông báo nhẹ nhàng
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        return {
          response: '⏰ AI Agent đang bận, vui lòng thử lại sau giây lát!',
          foods:    [],
          _offline: true,
        };
      }
      return {
        response: '🔌 FoodBee AI hiện đang offline. Bạn có thể xem danh sách quán ăn bên dưới nhé!',
        foods:    [],
        buttons:  [{ text: '🏪 Xem danh sách quán ăn', type: 'route', route: '/khach-hang/list-quan-an' }],
        _offline: true,
      };
    }
  };

  // ─── Xử lý gửi tin ─────────────────────────────────────
  const _processMessage = async (msg) => {
    try {
      const res        = await callAgent(msg);
      const text       = res.response || '';
      const foods      = res.foods    || [];
      const buttons    = res.buttons  || null;

      // Cập nhật multi-turn history
      setChatHistory(prev => [
        ...prev,
        { role: 'user',      content: msg  },
        { role: 'assistant', content: text },
      ]);

      // Nếu Agent trả không có foods và không phải offline → thêm nút xem quán
      const finalButtons = buttons || (
        !res._offline && foods.length === 0 && text
          ? [{ text: '🏪 Xem danh sách quán ăn', type: 'route', route: '/khach-hang/list-quan-an' }]
          : null
      );

      setMessages(prev => [...prev, {
        from:       'bot',
        text,
        foods,
        buttons:    finalButtons,
        ai_powered: res.ai_powered !== false,
      }]);

    } catch {
      setMessages(prev => [...prev, {
        from:    'bot',
        text:    '😅 Có lỗi xảy ra. Bạn thử lại sau nhé!',
        buttons: [{ text: '🏪 Xem quán ăn', type: 'route', route: '/khach-hang/list-quan-an' }],
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    const msg = userInput.trim();
    if (!msg || isTyping) return;
    setUserInput('');
    setMessages(prev => [...prev, { from: 'user', text: msg }]);
    setIsTyping(true);
    await _processMessage(msg);
  };

  const sendMessageDirect = async (directMsg) => {
    if (!directMsg || isTyping) return;
    setMessages(prev => [...prev, { from: 'user', text: directMsg }]);
    setIsTyping(true);
    await _processMessage(directMsg);
  };

  // ─── Điều hướng khi nhấn button ─────────────────────────
  const handleButton = (btn) => {
    if (btn.type === 'route') {
      setIsOpen(false);
      navigate(btn.route);
    } else if (btn.type === 'message') {
      sendMessageDirect(btn.message);
    }
  };

  // ─── Click vào food card ─────────────────────────────────
  const selectFood = (food) => {
    const rid = food.id_quan_an || food.restaurant_id;
    if (!rid) {
      setMessages(prev => [...prev, {
        from: 'bot',
        text: 'ℹ️ Không tìm thấy thông tin quán!',
        buttons: [{ text: '🏠 Về trang chủ', type: 'route', route: '/' }],
      }]);
      return;
    }

    const logged = !!localStorage.getItem('khach_hang_login');
    if (!logged) {
      setMessages(prev => [...prev, {
        from: 'bot',
        text: `🔐 Bạn cần đăng nhập để xem menu và đặt món từ <strong>${food.restaurant || food.title}</strong>!`,
        buttons: [
          { text: '🔐 Đăng nhập ngay',    type: 'route', route: '/khach-hang/dang-nhap' },
          { text: '📝 Đăng ký miễn phí',  type: 'route', route: '/khach-hang/dang-ky' },
        ],
      }]);
      return;
    }

    setIsOpen(false);
    navigate(`/khach-hang/quan-an/${rid}`);
  };

  // ─── Helper: URL ảnh ─────────────────────────────────────
  const getImg = (img) => {
    if (!img) return 'https://via.placeholder.com/80?text=Food';
    if (img.startsWith('http')) return img;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${img}`;
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="fixed bottom-6 right-6 z-[99999] font-sans">

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 border-[3px] border-white text-white text-3xl shadow-[0_6px_20px_rgba(255,107,53,0.5)] flex items-center justify-center transition-transform hover:scale-110 absolute bottom-0 right-0 z-50"
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-comment-dots'}`} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-[80px] right-0 w-[390px] h-[580px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-[slideUp_0.3s_ease]">

          {/* ── Header ── */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-400 text-white px-4 py-3 flex items-center justify-between shrink-0 min-h-[70px]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center border-2 border-white/30 p-0.5">
                <img src={logoFood} className="w-full h-full object-contain" alt="FoodBee Bot" />
              </div>
              <div>
                <div className="font-bold text-base mb-0.5">FoodBee AI Agent</div>
                <div className="text-xs opacity-95 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_6px_#4ade80]" />
                  Groq AI ⚡ · Multi-step Reasoning
                </div>
              </div>
            </div>

            {/* Clear chat */}
            {messages.length > 1 && (
              <button
                onClick={() => { setMessages([]); setChatHistory([]); }}
                className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/20 transition-colors"
                title="Làm mới hội thoại"
              >
                <i className="fa-solid fa-rotate-right" />
              </button>
            )}
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3.5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.from === 'user' ? 'items-end' : 'items-start'}`}>

                {/* AI badge */}
                {msg.from === 'bot' && msg.ai_powered && (
                  <div className="text-[10px] text-orange-400 font-bold mb-1 flex items-center gap-1">
                    <i className="fa-solid fa-robot text-[9px]" /> Groq AI Agent
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`inline-block px-4 py-3 rounded-2xl max-w-[88%] text-sm leading-relaxed shadow-sm ${
                    msg.from === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                  }`}
                  dangerouslySetInnerHTML={{ __html: msg.text }}
                />

                {/* Buttons */}
                {msg.buttons && (
                  <div className="flex flex-col gap-2 mt-2 w-full max-w-[88%]">
                    {msg.buttons.map((btn, j) => btn.type === 'route' ? (
                      <Link
                        key={j}
                        onClick={() => setIsOpen(false)}
                        to={btn.route}
                        className="bg-gradient-to-r from-orange-500 to-orange-400 text-white text-center px-4 py-2.5 rounded-xl text-sm font-semibold hover:-translate-y-0.5 transition-transform shadow-sm"
                      >
                        {btn.text}
                      </Link>
                    ) : (
                      <button
                        key={j}
                        onClick={() => handleButton(btn)}
                        className="bg-gradient-to-r from-orange-500 to-orange-400 text-white text-center px-4 py-2.5 rounded-xl text-sm font-semibold hover:-translate-y-0.5 transition-transform shadow-sm"
                      >
                        {btn.text}
                      </button>
                    ))}
                  </div>
                )}

                {/* Food Cards */}
                {msg.foods && msg.foods.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 w-full max-w-[92%]">
                    {msg.foods.map((food, k) => (
                      <div
                        key={k}
                        onClick={() => selectFood(food)}
                        className="flex gap-2.5 p-2.5 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
                      >
                        <img
                          src={getImg(food.hinh_anh)}
                          alt={food.title}
                          className="w-[70px] h-[70px] object-cover rounded-lg shrink-0"
                          onError={e => e.target.src = 'https://via.placeholder.com/80?text=Food'}
                        />
                        <div className="flex flex-col justify-center min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm truncate mb-1">
                            {food.title || food.name}
                          </h4>
                          {food.restaurant && (
                            <p className="text-xs text-gray-500 truncate mb-0.5">🏪 {food.restaurant}</p>
                          )}
                          {food.address && (
                            <p className="text-[11px] text-gray-400 truncate mb-1 leading-tight">📍 {food.address}</p>
                          )}
                          <p className="text-orange-500 font-bold text-sm flex items-center gap-1.5">
                            {formatVND(food.sale_price > 0 ? food.sale_price : food.price)}
                            {food.sale_price > 0 && food.sale_price < food.price && (
                              <span className="text-[10px] text-gray-400 line-through font-normal">
                                {formatVND(food.price)}
                              </span>
                            )}
                            {(food._isBest || food.so_ban) && (
                              <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-md animate-pulse">HOT</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-100 flex items-center gap-2 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-[10px] text-gray-400">AI đang suy luận...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick Actions ── */}
          <div className="flex shrink-0 gap-2 p-3 overflow-x-auto bg-white border-t border-gray-100 scrollbar-hide">
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={() => sendMessageDirect(a.message)}
                disabled={isTyping}
                className="px-3.5 py-1.5 border border-orange-500 rounded-full text-orange-500 bg-white hover:bg-orange-500 hover:text-white transition-colors whitespace-nowrap text-xs font-semibold disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* ── Input ── */}
          <div className="flex p-3 gap-2 bg-white border-t border-gray-100 shrink-0">
            <input
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Chat tự nhiên với AI Agent..."
              disabled={isTyping}
              className="flex-1 border border-gray-200 rounded-full px-4 text-sm focus:outline-none focus:border-orange-500 disabled:bg-gray-50"
            />
            <button
              onClick={sendMessage}
              disabled={!userInput.trim() || isTyping}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 text-white flex items-center justify-center disabled:opacity-50 shrink-0 hover:scale-105 transition-transform"
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
}
