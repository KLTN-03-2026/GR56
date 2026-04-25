import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

/**
 * ChatBox component for real-time communication between Customer and Shipper
 * @param {string|number} orderId 
 * @param {string} currentUserType - 'khach_hang' or 'shipper'
 * @param {function} onClose 
 * @param {string} otherPartyName - Name of the person being chatted with
 */
export default function ChatBox({ orderId, currentUserType, onClose, otherPartyName = 'Đối tác' }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        fetchMessages();
        setupEcho();
        
        return () => {
            leaveEcho();
        };
    }, [orderId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const endpoint = currentUserType === 'shipper' 
                ? `/api/shipper/chat/${orderId}/tin-nhan` 
                : `/api/khach-hang/chat/${orderId}/tin-nhan`;
            const res = await api.get(endpoint);
            if (res.data.status) {
                setMessages(res.data.data || []);
            }
        } catch (err) {
            console.error('Fetch messages error:', err);
            toast.error('Không thể tải tin nhắn!');
        } finally {
            setLoading(false);
        }
    };

    const setupEcho = async () => {
        try {
            const { default: echo, updateEchoToken } = await import('../utils/echo');
            updateEchoToken();
            
            const channelName = `chat.${orderId}`;
            echo.private(channelName)
                .listen('.tin-nhan.moi', (data) => {
                    const msg = data.tin_nhan;
                    // Only add if not already in list (prevent double message for sender)
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                });
        } catch (err) {
            console.error('Echo setup error:', err);
        }
    };

    const leaveEcho = async () => {
        try {
            const { default: echo } = await import('../utils/echo');
            echo.leave(`chat.${orderId}`);
        } catch {}
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const endpoint = `/api/${currentUserType.replace('_', '-')}/chat/gui`;
            const res = await api.post(endpoint, {
                id_don_hang: orderId,
                noi_dung: newMessage.trim()
            });

            if (res.data.status) {
                setNewMessage('');
                // The message will be added via Echo listener
            } else {
                toast.error(res.data.message || 'Lỗi gửi tin nhắn');
            }
        } catch (err) {
            toast.error('Lỗi kết nối khi gửi tin nhắn');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center justify-between text-white shrink-0 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <i className={`fa-solid ${currentUserType === 'shipper' ? 'fa-user' : 'fa-motorcycle'} text-white text-lg`} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-sm truncate uppercase tracking-tight">{otherPartyName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                            <span className="text-[10px] font-medium text-white/80 uppercase">Đang trực tuyến</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all group"
                >
                    <i className="fa-solid fa-xmark group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            {/* Messages Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[450px] bg-gray-50/50 scroll-smooth"
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                        <span className="text-xs text-gray-400 font-medium">Đang tải cuộc trò chuyện...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-10 opacity-60">
                        <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center border border-gray-200">
                            <i className="fa-solid fa-comments text-2xl text-gray-300" />
                        </div>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest px-8 text-center leading-relaxed">
                            Hãy bắt đầu trò chuyện để đơn hàng được giao nhanh hơn!
                        </span>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.loai_nguoi_gui === currentUserType;
                        return (
                            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all hover:shadow-md ${
                                    isMe 
                                        ? 'bg-orange-500 text-white rounded-tr-none' 
                                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                }`}>
                                    <div className="leading-relaxed font-medium">{msg.noi_dung}</div>
                                    <div className={`text-[10px] mt-1 font-medium ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isMe && msg.da_doc && <span className="ml-1.5 uppercase font-black tracking-tighter">● Đã xem</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2 group">
                <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nhập nội dung tin nhắn..."
                    className="flex-1 bg-gray-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all outline-none font-medium placeholder:text-gray-400"
                />
                <button 
                    disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 active:scale-90 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 disabled:bg-gray-200"
                >
                    {sending ? (
                        <i className="fa-solid fa-spinner fa-spin text-sm" />
                    ) : (
                        <i className="fa-solid fa-paper-plane" />
                    )}
                </button>
            </form>
        </div>
    );
}
