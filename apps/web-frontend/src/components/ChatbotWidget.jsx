/**
 * ChatbotWidget v3.0 — Restaurant-First AI Flow
 * ============================================
 * Flow: Tìm quán → Chọn quán → Xem menu → Chọn món → Giao hàng → Thanh toán
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatVND } from '../utils/helpers';
import logoFood from '../assets/logoFood.png';
import { useAuth } from '../context/AuthContext';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('foodbee_chat_messages') || '[]'); }
    catch { return []; }
  });
  const [chatHistory, setChatHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('foodbee_chat_history') || '[]'); }
    catch { return []; }
  });
  const [sessionToken, setSessionToken] = useState(() => {
    try { return localStorage.getItem('foodbee_chat_session_token') || ''; }
    catch { return ''; }
  });
  // ── Interactive size/topping selection state ──
  const [pendingOptions, setPendingOptions] = useState(null); // { size_options, topping_options, step, pending_food, selected_size, chosen_toppings, current_total }
  const [localSize, setLocalSize] = useState(null);     // { id, title, extra_price }
  const [localToppings, setLocalToppings] = useState([]); // [{ id, title, price }]
  const [localStep, setLocalStep] = useState('select_size'); // 'select_size' | 'select_topping' | 'confirm'
  const [isOptionPending, setIsOptionPending] = useState(false); // debounce: disable buttons while waiting for server response
  const messagesEndRef = useRef(null);
  const navigate = useRef(useNavigate()).current;
  const pendingReqRef = useRef(null); // abort previous request before starting new one

  // Quick actions
  const quickActions = [
    { label: "🔥 Bán chạy", message: "món nào bán chạy nhất hôm nay?" },
    { label: "🧊 Đồ lạnh", message: "trời nóng muốn uống gì mát mát?" },
    { label: "🍜 Bún/Phở", message: "tìm bún hoặc phở ngon" },
    { label: "🍚 Cơm", message: "gợi ý cơm" },
    { label: "☕ Đồ uống", message: "tìm đồ uống" },
    { label: "💰 Dưới 50k", message: "món ăn dưới 50 nghìn" },
    { label: "🍲 Lẩu/Nướng", message: "tìm lẩu hoặc nướng" },
    { label: "🎟️ Voucher", message: "có voucher gì không?" },
    { label: "⭐ Quán ngon", message: "quán nào được đánh giá cao nhất?" },
    { label: "📦 Đơn hàng", message: "xem đơn hàng của tôi" },
    { label: "💰 Ví tiền", message: "kiểm tra số dư ví của tôi" },
    { label: "🎯 Gợi ý riêng", message: "gợi ý món ăn dựa trên sở thích của tôi" },
  ];

  // ─── User context ───────────────────────────────────────
  const { user } = useAuth();

  const getUserContext = () => {
    try {
      const raw = localStorage.getItem('khach_hang_login');
      if (!raw) return { is_logged_in: false, khach_hang_id: null, ten: '' };

      // Ưu tiên dùng thông tin user từ AuthContext
      if (user && user.id) {
        return {
          is_logged_in: true,
          khach_hang_id: user.id,
          ten: user.ho_va_ten || user.ho_ten || '',
        };
      }

      // Backend lưu token string thuần → treat as logged-in nhưng chưa load xong data
      if (raw[0] !== '{') {
        return { is_logged_in: true, khach_hang_id: null, ten: '' };
      }

      const parsed = JSON.parse(raw);
      return {
        is_logged_in: true,
        khach_hang_id: parsed?.id || parsed?.khach_hang?.id || null,
        ten: parsed?.ho_ten || parsed?.khach_hang?.ho_ten || '',
      };
    } catch {
      return { is_logged_in: true, khach_hang_id: null, ten: '' };
    }
  };

  // ─── Welcome message ────────────────────────────────────
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const ctx = getUserContext();
      const greeting = ctx.is_logged_in
        ? `👋 Chào mừng trở lại${ctx.ten ? `, <strong>${ctx.ten}</strong>` : ''}! Tôi là <strong>FoodBee AI Agent</strong> 🍯<br/>Hỏi tôi bất cứ điều gì về món ăn, đơn hàng hoặc ví tiền của bạn nhé!`
        : `👋 Xin chào! Tôi là <strong>FoodBee AI Agent</strong> 🍯<br/>Tôi có thể giúp bạn <strong>tìm món ngon</strong>, trả lời câu hỏi về quán ăn. Để <strong>đặt món</strong>, bạn cần đăng nhập nhé!`;
      setMessages([{
        from: 'bot',
        text: greeting,
        buttons: [
          { text: '🔐 Đăng nhập', type: 'route', route: '/khach-hang/dang-nhap' },
          { text: '📝 Đăng ký', type: 'route', route: '/khach-hang/dang-ky' },
        ],
      }]);
    }
  }, [isOpen]);

  // ── Khi mở chatbot với session cũ: clear stale pendingOptions từ session trước ──
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setPendingOptions(null);
      setLocalSize(null);
      setLocalToppings([]);
      setLocalStep('select_size');
      setIsOptionPending(false);
    }
  }, [isOpen]);

  // ─── Auto scroll ─────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ─── PayOS payment result handler ───────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('chatbot_pay_result');
    if (!raw) return;

    let result;
    try { result = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('chatbot_pay_result');

    if (result.status === 'success') {
      setMessages(prev => {
        const next = [...prev, {
          from: 'bot',
          text: `🎉 Thanh toán PayOS thành công!\n✅ Đơn hàng **#${result.orderCode}** đã được xác nhận.\n💰 Số tiền: **${Number(result.amount || 0).toLocaleString('vi-VN')}đ**\n\nBee sẽ theo dõi đơn hàng cho bạn. Shipper sẽ liên hệ giao hàng sớm nhất nhé! 🐝`,
          foods: [],
          restaurants: [],
          buttons: [
            { text: '📦 Xem đơn hàng', type: 'route', route: '/khach-hang/don-hang' },
            { text: '🍜 Đặt thêm món', type: 'message', message: 'gợi ý món ăn' },
          ],
        }];
        localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
        return next;
      });
    } else if (result.status === 'cancel') {
      setMessages(prev => {
        const next = [...prev, {
          from: 'bot',
          text: `ℹ️ Bạn đã huỷ thanh toán PayOS.\n\nĐơn hàng vẫn còn hiệu lực trong hệ thống. Bạn có thể:\n• Thanh toán lại bằng PayOS\n• Chọn thanh toán **tiền mặt** khi nhận hàng\n\nNhắn cho Bee biết bạn muốn làm gì nhé! 🐝`,
          foods: [],
          restaurants: [],
          buttons: [
            { text: '💵 Thanh toán tiền mặt', type: 'message', message: 'thanh toán tiền mặt' },
            { text: '💳 Thanh toán PayOS lại', type: 'message', message: 'thanh toán payos' },
          ],
        }];
        localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
        return next;
      });
    } else {
      setMessages(prev => {
        const next = [...prev, {
          from: 'bot',
          text: `❌ Thanh toán PayOS thất bại (lỗi hệ thống).\n\nTiền của bạn **không bị trừ**. Bạn có thể đặt lại thanh toán hoặc chọn tiền mặt nhé!`,
          foods: [],
          restaurants: [],
          buttons: [
            { text: '💵 Thanh toán tiền mặt', type: 'message', message: 'thanh toán tiền mặt' },
          ],
        }];
        localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
        return next;
      });
    }

    if (!isOpen) setIsOpen(true);
  }, []); // chạy 1 lần khi widget mount

  // ═══════════════════════════════════════════════════
  //  GỌI AI AGENT
  // ═══════════════════════════════════════════════════
  const callAgent = async (msg, opts = {}) => {
    const { clickedFood = null, clickedRestaurant = null,
            local_size = null, local_toppings = [] } = opts;
    const aiUrl = import.meta.env.VITE_AI_SERVER_URL || 'http://127.0.0.1:5000';
    const user_context = getUserContext();

    // Abort any in-flight request before starting a new one
    if (pendingReqRef.current) {
      pendingReqRef.current.abort();
    }
    const controller = new AbortController();
    pendingReqRef.current = controller;

    try {
      const timeoutId = setTimeout(() => controller.abort(), 55000);

      const res = await fetch(`${aiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: chatHistory.slice(-20),
          user_context,
          clicked_food: clickedFood ? {
            id: clickedFood.id,
            title: clickedFood.title || clickedFood.name,
            name: clickedFood.title || clickedFood.name,
            price: clickedFood.price || clickedFood.gia_ban || 0,
            restaurant: clickedFood.restaurant || '',
            id_quan_an: clickedFood.id_quan_an || clickedFood.restaurant_id,
          } : null,
          clicked_restaurant: clickedRestaurant || null,
          session_token: sessionToken || null,
          // Pass current selections so backend can preserve them
          local_size,
          local_toppings: local_toppings || [],
        }),
        signal: controller.signal,
      }).then(r => r.json());

      // Check abort BEFORE clearing state
      if (controller.signal.aborted) {
        clearTimeout(timeoutId);
        pendingReqRef.current = null;
        return null;
      }

      clearTimeout(timeoutId);
      pendingReqRef.current = null;
      return res;
    } catch (err) {
      pendingReqRef.current = null;
      if (controller.signal.aborted) {
        return null;
      }
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        return {
          response: '⏰ AI Agent đang bận, vui lòng thử lại sau giây lát!',
          foods: [], restaurants: [],
          _offline: true,
        };
      }
      return {
        response: '🔌 FoodBee AI hiện đang offline. Bạn có thể xem danh sách quán ăn bên dưới nhé!',
        foods: [], restaurants: [],
        buttons: [{ text: '🏪 Xem danh sách quán ăn', type: 'route', route: '/khach-hang/list-quan-an' }],
        _offline: true,
      };
    }
  };

// ── BE Analytics ───────────────────────────────────────────
  const BE_SESSION_KEY = 'foodbee_chat_be_session';

  const startBeSession = async (khId, sessionToken) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'https://be.foodbee.io.vn';
      const stored = localStorage.getItem(BE_SESSION_KEY);
      let storedData = stored ? JSON.parse(stored) : null;
      let payload = { id_khach_hang: khId };
      if (storedData?.session_token && storedData?.session_token === sessionToken) {
        payload.session_token = storedData.session_token;
      }
      const res = await fetch(`${apiBase}/api/chatbot/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.status && data?.session_id) {
        const newData = { session_id: data.session_id, session_token: data.session_token || sessionToken };
        localStorage.setItem(BE_SESSION_KEY, JSON.stringify(newData));
        return newData;
      }
    } catch { /* silent */ }
    return null;
  };

  const logToBe = async (sessionId, role, content, meta = {}) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'https://be.foodbee.io.vn';
      await fetch(`${apiBase}/api/chatbot/session/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ role, content, meta }),
      });
    } catch { /* silent */ }
  };

  // ─── Send to agent (API call + state update) ─────────────────
  const _sendToAgent = async (msg, opts = {}) => {
    const ctx = getUserContext();
    let beSessionId = null;

    // Start BE session if needed (lazy)
    try {
      const stored = localStorage.getItem(BE_SESSION_KEY);
      const storedData = stored ? JSON.parse(stored) : null;
      const newData = await startBeSession(ctx.khach_hang_id, sessionToken);
      if (newData) beSessionId = newData.session_id;
      else if (storedData?.session_id) beSessionId = storedData.session_id;
    } catch { /* silent */ }

    try {
      const res = await callAgent(msg, opts);
      if (res === null) return;

      if (res.session_token && res.session_token !== sessionToken) {
        setSessionToken(res.session_token);
        localStorage.setItem('foodbee_chat_session_token', res.session_token);
      }

      let text = res.response || '';
      const foods = (opts.clickedFood && opts.clickedFood.id)
        ? [opts.clickedFood]
        : (res.foods || []);
      const restaurants = res.restaurants || [];
      const buttons = res.buttons || null;

      let payment = null;
      if (res.payment) {
        payment = res.payment;
      } else {
        const paymentIdx = text.indexOf('__PAYMENT__');
        if (paymentIdx !== -1) {
          try {
            payment = JSON.parse(text.substring(paymentIdx + '__PAYMENT__'.length));
            text = text.substring(0, paymentIdx);
          } catch (e) { /* ignore */ }
        }
      }

      // Determine intent for analytics
      let intent = 'unknown';
      if (foods.length > 0) intent = 'search_food';
      else if (restaurants.length > 0) intent = 'search_restaurant';
      else if (payment) intent = 'order_placed';
      else if (buttons && buttons.length > 0) intent = 'confirm_action';

      // Log both messages to BE
      if (beSessionId) {
        await logToBe(beSessionId, 'user', msg, { intent: 'unknown', response_type: 'text' });
        await logToBe(beSessionId, 'assistant', text.substring(0, 255), {
          intent,
          response_type: foods.length > 0 || restaurants.length > 0 ? 'recommendation' : payment ? 'order' : 'text',
          entities: {},
        });
      }

      // Ẩn nút "Xem danh sách quán ăn" khi đang trong luồng đặt hàng
      const _orderFlowKeywords = [
        'Giỏ hàng', 'giỏ hàng', 'Người nhận', 'người nhận',
        'Thông tin đã cập nhật', 'Cung cấp thông tin giao hàng',
        'Để thanh toán', 'Chọn phương thức thanh toán',
        'Đơn hàng đã xác nhận', 'XEM LẠI ĐƠN HÀNG',
        'Tổng cộng', 'Phí ship', 'Giao đến', 'PayOS',
        'Tiền mặt', 'gõ \'xác nhận\'', 'gõ \'thanh toán\'',
        'Thêm món', 'nhắn \'menu\'', 'thêm vào đơn',
      ];
      const _isOrderFlow = text && _orderFlowKeywords.some(k => text.includes(k));

      // Use backend buttons if provided; only add default "Xem quán" when NOT in order flow
      const finalButtons = buttons && buttons.length > 0
        ? buttons
        : (!_isOrderFlow && !res._offline && foods.length === 0 && restaurants.length === 0 && text
            ? [{ text: '🏪 Xem danh sách quán ăn', type: 'route', route: '/khach-hang/list-quan-an' }]
            : null
        );

      if (res.is_cart_commit) {
        setPendingOptions(null);
        setLocalSize(null);
        setLocalToppings([]);
        setLocalStep('select_size');
        setIsOptionPending(false);
        setMessages(prev => {
          const next = [...prev];
          const lastBotIdx = [...next].reverse().findIndex(m => m.from === 'bot');
          const realIdx = lastBotIdx >= 0 ? next.length - 1 - lastBotIdx : -1;
          const baseMsg = realIdx >= 0 ? next[realIdx] : null;
          next[realIdx >= 0 ? realIdx : next.length] = {
            ...(baseMsg || {}),
            text,
            from: baseMsg ? baseMsg.from : 'bot',
            foods: [], restaurants: [],
            buttons: buttons || finalButtons || null,
            payment: null, selectedRestaurant: null, ai_powered: false,
            size_options: [], topping_options: [], options_step: null,
            pending_food: null, selected_size: null, chosen_toppings: [], current_total: 0,
          };
          localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
          return next;
        });
        return;
      }

      const hasOptionsData = !!(res.size_options || res.topping_options || res.options_step);
      if (hasOptionsData || res.options_step === 'confirm') {
        const effectiveStep = res.skip_size_step ? 'select_topping' : (res.options_step || 'select_size');
        const newPending = {
          size_options: res.size_options || [],
          topping_options: res.topping_options || [],
          step: effectiveStep,
          pending_food: res.pending_food || null,
          selected_size: res.selected_size || null,
          chosen_toppings: res.chosen_toppings || [],
          current_total: res.current_total || 0,
        };
        setPendingOptions(newPending);
        setLocalSize(res.selected_size || null);
        setLocalToppings(res.chosen_toppings || []);
        setLocalStep(effectiveStep);
        setIsOptionPending(false);
        setMessages(prev => {
          const next = [...prev];
          const lastBotIdx = [...next].reverse().findIndex(m => m.from === 'bot');
          const realIdx = lastBotIdx >= 0 ? next.length - 1 - lastBotIdx : -1;
          const baseMsg = realIdx >= 0 ? next[realIdx] : null;
          next[realIdx >= 0 ? realIdx : next.length] = {
            ...(baseMsg || {}),
            text,
            from: baseMsg ? baseMsg.from : 'bot',
            foods: [], restaurants: [],
            buttons: buttons || finalButtons || null, payment: null, selectedRestaurant: null, ai_powered: false,
            ...newPending,
          };
          localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
          return next;
        });
        return;
      }

      setMessages(prev => {
        const next = [...prev, {
          from: 'bot', text, foods, restaurants,
          buttons: buttons || finalButtons, payment,
          selectedRestaurant: res.selected_restaurant || null,
          ai_powered: res.ai_powered !== false,
        }];
        localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
        return next;
      });
      setPendingOptions(null);
      setLocalSize(null);
      setLocalToppings([]);
      setLocalStep('select_size');
      setIsOptionPending(false);

      setChatHistory(prev => {
        const next = [...prev, { role: 'user', content: msg }, { role: 'assistant', content: text }];
        localStorage.setItem('foodbee_chat_history', JSON.stringify(next));
        return next;
      });
    } catch {
      setMessages(prev => {
        const next = [...prev, { from: 'bot', text: '😅 Có lỗi xảy ra. Bạn thử lại sau nhé!', buttons: [{ text: '🏪 Xem quán ăn', type: 'route', route: '/khach-hang/list-quan-an' }] }];
        localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
        return next;
      });
    } finally {
      setIsTyping(false);
      setIsOptionPending(false);
    }
  };

  // ─── Process message: add user message → send to agent ─────
  const _processMessage = async (msg, opts = {}) => {
    setIsTyping(true);
    await _sendToAgent(msg, opts);
  };

  // ─── Intent detection: only require login for ordering actions ─────
  const isOrderIntent = (msg) => {
    const lower = (msg || '').toLowerCase();
    const orderKeywords = [
      'đặt món', 'đặt', 'mua', 'thêm vào giỏ', 'vào giỏ',
      'thanh toán', 'thanh toán', 'checkout', 'order',
      'chọn món', 'giao hàng', 'ship', 'nhận hàng',
      'mã giảm', 'voucher', 'mã khuyến mãi', 'coupon',
      'áp dụng', 'sử dụng', 'thêm', 'bỏ', 'xóa',
    ];
    return orderKeywords.some(k => lower.includes(k));
  };

  // ─── Send message ────────────────────────────────────────
  const sendMessage = async () => {
    const msg = userInput.trim();
    if (!msg || isTyping) return;
    const ctx = getUserContext();

    if (!ctx.is_logged_in && isOrderIntent(msg)) {
      setMessages(prev => {
        const next = [...prev, { from: 'bot', text: '🔐 Bạn cần <strong>đăng nhập</strong> để đặt món. Vui lòng đăng nhập hoặc đăng ký nhé!', buttons: [
          { text: '🔐 Đăng nhập', type: 'route', route: '/khach-hang/dang-nhap' },
          { text: '📝 Đăng ký', type: 'route', route: '/khach-hang/dang-ky' },
        ]}];
        return next;
      });
      return;
    }
    setUserInput('');
    setMessages(prev => {
      const next = [...prev, { from: 'user', text: msg }];
      localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
      return next;
    });
    setIsTyping(true);
    // ── FIX: Nếu đang trong luồng chọn size/topping, phải gửi kèm local_size/local_toppings
    // để backend không mất context khi user gõ text thay vì click button
    if (pendingOptions) {
      await _sendToAgent(msg, { local_size: localSize, local_toppings: localToppings });
    } else {
      await _processMessage(msg);
    }
  };

  const sendMessageDirect = async (directMsg, opts = {}) => {
    if (!directMsg || isTyping) return;
    const ctx = getUserContext();

    if (!ctx.is_logged_in && isOrderIntent(directMsg)) {
      setMessages(prev => {
        const next = [...prev, { from: 'bot', text: '🔐 Bạn cần <strong>đăng nhập</strong> để đặt món. Vui lòng đăng nhập hoặc đăng ký nhé!', buttons: [
          { text: '🔐 Đăng nhập', type: 'route', route: '/khach-hang/dang-nhap' },
          { text: '📝 Đăng ký', type: 'route', route: '/khach-hang/dang-ky' },
        ]}];
        localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
        return next;
      });
      return;
    }
    
    if (!opts.silent) {
      setMessages(prev => {
        const next = [...prev, { from: 'user', text: directMsg }];
        localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
        return next;
      });
    }
    
    setIsTyping(true);
    // Pass current selections so backend preserves them
    await _sendToAgent(directMsg, {
      local_size: localSize,
      local_toppings: localToppings,
      ...opts
    });
  };

  // ─── Handle button ──────────────────────────────────────
  const handleButton = (btn) => {
    if (btn.type === 'route') {
      setIsOpen(false);
      navigate(btn.route);
    } else if (btn.type === 'message') {
      sendMessageDirect(btn.message, { silent: true });
    }
  };

  // ─── Select restaurant → view menu ────────────────────────
  const selectRestaurant = async (restaurant) => {
    const ctx = getUserContext();
    if (!ctx.is_logged_in) {
      setMessages(prev => {
        const next = [...prev, { from: 'bot', text: '🔐 Bạn cần <strong>đăng nhập</strong> để sử dụng dịch vụ. Vui lòng đăng nhập hoặc đăng ký nhé!', buttons: [
          { text: '🔐 Đăng nhập', type: 'route', route: '/khach-hang/dang-nhap' },
          { text: '📝 Đăng ký', type: 'route', route: '/khach-hang/dang-ky' },
        ]}];
        return next;
      });
      return;
    }
    const name = restaurant.name || restaurant.ten_quan_an;
    const sendMsg = `xem menu ${name}`;
    setMessages(prev => {
      const next = [...prev, { from: 'user', text: sendMsg }];
      localStorage.setItem('foodbee_chat_messages', JSON.stringify(next));
      return next;
    });
    setIsTyping(true);
    await _processMessage(sendMsg, { clickedRestaurant: restaurant });
  };

  // ─── Select food → add to cart ──────────────────────────
  const selectFood = async (food) => {
    const ctx = getUserContext();
    if (!ctx.is_logged_in) {
      setMessages(prev => {
        const next = [...prev, { from: 'bot', text: '🔐 Bạn cần <strong>đăng nhập</strong> để sử dụng dịch vụ. Vui lòng đăng nhập hoặc đăng ký nhé!', buttons: [
          { text: '🔐 Đăng nhập', type: 'route', route: '/khach-hang/dang-nhap' },
          { text: '📝 Đăng ký', type: 'route', route: '/khach-hang/dang-ky' },
        ]}];
        return next;
      });
      return;
    }
    const tenMon = food.title || food.name;
    const sendMsg = `tôi muốn đặt món: ${tenMon}`;
    // Không hiện message của user khi click từ UI
    setIsTyping(true);
    await _processMessage(sendMsg, { clickedFood: food });
  };

  // ─── Helpers ──────────────────────────────────────────
  const getImg = (img) => {
    if (!img) return 'https://via.placeholder.com/80?text=Food';
    if (img.startsWith('http')) return img;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${img}`;
  };

  const formatMessageContent = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-[99999] font-sans">

      {/* Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 border-[3px] border-white text-white text-3xl shadow-[0_6px_20px_rgba(255,107,53,0.5)] flex items-center justify-center transition-transform hover:scale-110 absolute bottom-0 right-0 z-50"
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-comment-dots'}`} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-[80px] right-0 w-[390px] h-[580px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-[slideUp_0.3s_ease]">

          {/* Header */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-400 text-white px-4 py-3 flex items-center justify-between shrink-0 min-h-[70px]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center border-2 border-white/30 p-0.5">
                <img src={logoFood} className="w-full h-full object-contain" alt="FoodBee Bot" />
              </div>
              <div>
                <div className="font-bold text-base mb-0.5">FoodBee AI Agent</div>
                <div className="text-xs opacity-95 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_6px_#4ade80]" />
                  FOODBEE ⚡ · Multi-step Reasoning
                </div>
              </div>
            </div>
            {messages.length > 1 && (
              <button
                onClick={() => { setMessages([]); setChatHistory([]); localStorage.removeItem('foodbee_chat_messages'); localStorage.removeItem('foodbee_chat_history'); }}
                className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/20 transition-colors"
                title="Làm mới hội thoại"
              >
                <i className="fa-solid fa-rotate-right" />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3.5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.from === 'user' ? 'items-end' : 'items-start'}`}>

                {/* AI badge */}
                {msg.from === 'bot' && msg.ai_powered && (
                  <div className="text-[10px] text-orange-400 font-bold mb-1 flex items-center gap-1">
                    <i className="fa-solid fa-robot text-[9px]" /> FOODBEE
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`inline-block px-4 py-3 rounded-2xl max-w-[88%] text-sm leading-relaxed shadow-sm ${msg.from === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                    }`}
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.text) }}
                />

                {/* Buttons — ẩn khi message đang có card interactive size/topping */}
                {msg.buttons && !(msg.pending_food) && (
                  <div className="flex flex-col gap-2 mt-2 w-full max-w-[88%]">
                    {msg.buttons.map((btn, j) =>
                      btn.type === 'route' ? (
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
                      )
                    )}
                  </div>
                )}

                {/* ── Interactive Size + Topping Selector ── */}
                {msg.from === 'bot' && pendingOptions && pendingOptions.pending_food && (
                  <div className={`flex flex-col gap-2 mt-2 w-full max-w-[92%] rounded-xl border border-orange-200 bg-orange-50/40 p-3 ${isOptionPending ? 'opacity-70 pointer-events-none' : ''}`}>
                    {/* Loading overlay */}
                    {isOptionPending && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-orange-500 shadow-sm">
                          <i className="fa-solid fa-spinner fa-spin mr-1" />
                          Đang xử lý...
                        </div>
                      </div>
                    )}
                    {/* ── Size hiển thị đã chọn ── */}
                    {localSize && localStep !== 'select_size' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">📏 Size:</span>
                        <span className="text-xs font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md">
                          {localSize.title}
                          {localSize.extra_price > 0 && ` +${localSize.extra_price.toLocaleString('vi-VN')}đ`}
                        </span>
                        <button
                          onClick={() => {
                            setLocalStep('select_size');
                            setLocalSize(null);
                            setPendingOptions(prev => prev ? { ...prev, step: 'select_size', selected_size: null } : null);
                          }}
                          className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                        >
                          đổi
                        </button>
                      </div>
                    )}

                    {/* ── SIZE selection ── */}
                    {pendingOptions.size_options.length > 0 && localStep === 'select_size' && (
                      <div>
                        <p className="text-[10px] text-orange-500 font-semibold mb-1.5">📏 Chọn SIZE</p>
                        <div className="flex gap-2 flex-wrap">
                          {pendingOptions.size_options.map((s, si) => (
                            <button
                              key={s.id || si}
                              disabled={isOptionPending}
                              onClick={() => {
                                const base = pendingOptions.pending_food?.price || 0;
                                const newTotal = base + (s.extra_price || 0);
                                setLocalSize(s);
                                setLocalStep('select_topping');
                                setIsOptionPending(true);
                                setPendingOptions(prev => prev ? {
                                  ...prev, selected_size: s, step: 'select_topping',
                                  current_total: newTotal,
                                } : null);
                                sendMessageDirect(`${si + 1}`, { local_size: s, local_toppings: [], silent: true });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isOptionPending ? 'opacity-50 cursor-not-allowed' : ''} ${
                                localSize?.id === s.id
                                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-orange-400'
                              }`}
                            >
                              {s.title}
                              {s.extra_price > 0 && <span className="ml-1 text-[10px] opacity-80">+{s.extra_price.toLocaleString('vi-VN')}đ</span>}
                              {s.extra_price === 0 && <span className="ml-1 text-[10px] opacity-70">miễn phí</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── TOPPING selection ── */}
                    {pendingOptions.topping_options.length > 0 && (localStep === 'select_topping' || localStep === 'select_size') && (
                      <div>
                        <p className="text-[10px] text-orange-500 font-semibold mb-1.5">🍯 Chọn TOPPING</p>
                        <div className="flex gap-2 flex-wrap">
                          {pendingOptions.topping_options.map((t, ti) => {
                            const isSelected = localToppings.some(lt => lt.id === t.id);
                            return (
                              <button
                                key={t.id || ti}
                                disabled={isOptionPending}
                                onClick={() => {
                                  // Toggle topping selection locally — không gửi server ngay
                                  let newToppings;
                                  if (isSelected) {
                                    newToppings = localToppings.filter(lt => lt.id !== t.id);
                                  } else {
                                    newToppings = [...localToppings, t];
                                  }
                                  const base = pendingOptions.pending_food?.price || 0;
                                  const sizeExtra = localSize?.extra_price || 0;
                                  const toppingTotal = newToppings.reduce((sum, tp) => sum + (tp.price || 0), 0);
                                  setLocalToppings(newToppings);
                                  setPendingOptions(prev => ({
                                    ...prev,
                                    chosen_toppings: newToppings,
                                    current_total: base + sizeExtra + toppingTotal,
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isOptionPending ? 'opacity-50 cursor-not-allowed' : ''} ${
                                  isSelected
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-orange-400'
                                }`}
                              >
                                {isSelected && <span className="mr-1">✓</span>}
                                {t.title} {t.price > 0 ? `+${t.price.toLocaleString('vi-VN')}đ` : ''}
                              </button>
                            );
                          })}
                        </div>
                        {/* Nút xác nhận / bỏ qua topping — chỉ hiện ở bước select_topping */}
                        {localStep === 'select_topping' && (
                          <button
                            disabled={isOptionPending}
                            onClick={() => {
                              setIsOptionPending(true);
                              if (localToppings.length > 0) {
                                const tpIds = localToppings
                                  .map(t => pendingOptions.topping_options.findIndex(tp => tp.id === t.id) + 1)
                                  .filter(n => n > 0)
                                  .join(',');
                                sendMessageDirect(tpIds || 'Xong', { local_size: localSize, local_toppings: localToppings, silent: true });
                              } else {
                                sendMessageDirect('Xong', { local_size: localSize, local_toppings: [], silent: true });
                              }
                            }}
                            className="mt-2 text-[10px] text-orange-500 hover:text-orange-700 font-semibold underline transition-colors disabled:opacity-40"
                          >
                            {localToppings.length > 0
                              ? `✅ Xác nhận ${localToppings.length} topping đã chọn →`
                              : 'Bỏ qua, không chọn topping →'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── Tạm tính + hành động ── */}
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <p className="text-[10px] text-gray-500">
                          {pendingOptions.pending_food?.title}
                          {localSize && <span className="ml-1">· {localSize.title}</span>}
                        </p>
                        <p className="text-orange-500 font-bold text-sm">
                          {(pendingOptions.current_total || pendingOptions.pending_food?.price || 0).toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (localStep === 'select_size') return;
                            setIsOptionPending(true);
                            sendMessageDirect('Xong', { local_size: localSize, local_toppings: localToppings, silent: true });
                          }}
                          disabled={isOptionPending || localStep === 'select_size'}
                          title={localStep === 'select_size' ? 'Vui lòng chọn SIZE trước' : ''}
                          className="bg-gradient-to-r from-orange-500 to-orange-400 text-white text-xs px-4 py-2 rounded-xl font-semibold hover:-translate-y-0.5 transition-transform shadow-sm disabled:opacity-40 flex items-center gap-1"
                        >
                          {isOptionPending ? (
                            <>
                              <i className="fa-solid fa-spinner fa-spin text-[10px]" />
                              Đang xử lý...
                            </>
                          ) : localStep === 'select_size' ? 'Vui lòng chọn SIZE' : 'Thêm vào giỏ'}
                        </button>
                        <button
                          onClick={() => {
                            setIsOptionPending(true);
                            sendMessageDirect('sửa', { local_size: localSize, local_toppings: localToppings, silent: true });
                          }}
                          className="bg-gray-100 text-gray-500 text-xs px-3 py-2 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Sửa
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {msg.restaurants && msg.restaurants.length > 0 && !pendingOptions && (
                  <div className="flex flex-col gap-2 mt-2 w-full max-w-[92%]">
                    <div className="text-[10px] text-orange-500 font-semibold mb-1">🏪 Bee tìm được {msg.restaurants.length} quán ngon</div>
                    {msg.restaurants.map((rest, k) => (
                      <div
                        key={k}
                        onClick={() => selectRestaurant(rest)}
                        className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
                      >
                        <img
                          src={getImg(rest.image || rest.hinh_anh)}
                          alt={rest.name}
                          className="w-[70px] h-[70px] object-cover rounded-lg shrink-0"
                          onError={e => e.target.src = 'https://via.placeholder.com/70?text=Rest'}
                        />
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          <h4 className="font-bold text-gray-800 text-sm truncate mb-0.5">
                            {rest.name || rest.ten_quan_an}
                          </h4>
                          {rest.address && (
                            <p className="text-[10px] text-gray-400 truncate mb-1">📍 {rest.address}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {rest.rating && (
                              <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded font-semibold">
                                ⭐ {rest.rating}
                              </span>
                            )}
                            {rest.so_mon > 0 && (
                              <span className="text-[10px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded font-semibold">
                                🍽️ {rest.so_mon} món
                              </span>
                            )}
                            {rest.min_price > 0 && (
                              <span className="text-[10px] text-gray-500">
                                💰 {formatVND(rest.min_price)}{rest.max_price > rest.min_price ? `–${formatVND(rest.max_price)}` : ''}
                              </span>
                            )}
                          </div>
                          {rest.open_time && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              🕐 {rest.open_time} – {rest.close_time}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400 text-center">Nhấn vào quán để xem menu nhé!</p>
                  </div>
                )}

                {/* ── Food Cards — Ẩn khi đang chọn size/topping để tránh click nhầm ── */}
                {msg.foods && msg.foods.length > 0 && !pendingOptions && (
                  <div className="flex flex-col gap-2 mt-2 w-full max-w-[92%]">
                    <div className="text-[10px] text-orange-500 font-semibold mb-1">
                      {msg.selectedRestaurant ? `🍜 Menu: ${msg.selectedRestaurant.name || msg.selectedRestaurant.ten_quan_an}` : '🍜 Gợi ý cho bạn'}
                    </div>
                    {msg.foods.map((food, k) => (
                      <div
                        key={k}
                        onClick={() => selectFood(food)}
                        className="flex gap-2.5 p-2.5 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
                      >
                        <img
                          src={getImg(food.hinh_anh)}
                          alt={food.title || food.name}
                          className="w-[75px] h-[75px] object-cover rounded-lg shrink-0"
                          onError={e => e.target.src = 'https://via.placeholder.com/75?text=Food'}
                        />
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          <h4 className="font-bold text-gray-800 text-sm truncate mb-0.5">
                            {food.title || food.name}
                          </h4>
                          {food.restaurant && (
                            <p className="text-xs text-gray-500 truncate mb-0.5">🏪 {food.restaurant}</p>
                          )}
                          {food.address && (
                            <p className="text-[10px] text-gray-400 truncate mb-1 leading-tight">📍 {food.address}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <p className="text-orange-500 font-bold text-sm">
                              {formatVND(food.sale_price > 0 ? food.sale_price : food.price)}
                            </p>
                            {food.sale_price > 0 && food.sale_price < food.price && (
                              <p className="text-[10px] text-gray-400 line-through font-normal">
                                {formatVND(food.price)}
                              </p>
                            )}
                            {food.rating && (
                              <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded font-semibold">
                                ⭐ {food.rating}
                              </span>
                            )}
                          </div>
                          {food.description && (
                            <p className="text-[10px] text-gray-400 truncate mt-0.5 leading-tight">{food.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Payment ── */}
                {msg.payment && (
                  <div className="mt-3 w-full max-w-[92%] bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-green-600 font-bold text-sm">💳 Thanh toán PayOS</span>
                      <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full">QR Code</span>
                    </div>
                    <div className="bg-white rounded-lg p-3 mb-3 border border-green-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-xs">Mã đơn hàng</span>
                        <span className="text-gray-800 font-mono text-xs font-bold">{msg.payment.ma_don_hang}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-xs">Tiền hàng + Ship</span>
                        <span className="text-orange-600 font-bold">{Number(msg.payment.tong_tien).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-[10px]">Phương thức</span>
                        <span className="text-green-600 text-[10px] font-semibold">PayOS QR · Chuyển khoản</span>
                      </div>
                    </div>
                    {msg.payment.qr_code ? (
                      <div className="flex justify-center mb-3">
                        <div className="relative">
                          <img src={msg.payment.qr_code} alt="QR thanh toán" className="w-44 h-44 rounded-xl border-2 border-green-200 shadow-sm" onError={e => { e.currentTarget.style.display = 'none'; }} />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white rounded-lg px-2 py-1 shadow">
                              <span className="text-[10px] text-gray-400">PayOS</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center mb-3">
                        <p className="text-green-600 font-bold text-xs mb-0.5">💳 Thanh toán PayOS</p>
                        <p className="text-[10px] text-gray-500">Bấm nút bên dưới để mở trang thanh toán có sẵn QR</p>
                      </div>
                    )}
                    {msg.payment.checkout_url && (
                      <a
                        href={msg.payment.checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center px-4 py-3.5 rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-600 transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                      >
                        🔒 Thanh toán PayOS ngay
                      </a>
                    )}
                    <div className="mt-2 bg-blue-50 rounded-lg p-2">
                      <p className="text-[10px] text-blue-700 text-center leading-relaxed">
                        📱 Mở app ngân hàng → Quét QR · Thanh toán trong <span className="font-bold">15 phút</span> để đơn được xử lý nhanh nhất!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing */}
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

          {/* Quick Actions */}
          {getUserContext().is_logged_in && (
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
          )}

          {/* Input */}
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

      <style dangerouslySetInnerHTML={{
        __html: `
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
