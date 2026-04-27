"""
FoodBee AI Chatbot — Agentic Architecture v10.0
================================================
Thay đổi so với v9.0 (nhúng truyền thống):
- Kiến trúc AI Agent thuần: LLM tự suy luận, tự lên kế hoạch, tự chọn tool
- Multi-step agentic loop: Agent gọi tool nhiều lượt đến khi có đủ thông tin
- 4 tools mới cá nhân hóa: xem_don_hang_cua_toi, kiem_tra_vi_tien,
  tra_trang_thai_don, goi_y_theo_lich_su
- Nhận khach_hang_id từ FE để query data cá nhân (đơn hàng, ví, lịch sử)
- Xóa toàn bộ logic if/else cứng ở Python layer → Agent tự quyết định
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import mysql.connector
from dotenv import load_dotenv
import logging
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from openai import OpenAI, RateLimitError, APIError

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(name)s %(levelname)s %(message)s'
)
logger = logging.getLogger('foodbee_agent')

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_MODEL   = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
MAX_AGENT_STEPS = 5   # Giới hạn số lượt tool-calling trong 1 session

if GROQ_API_KEY:
    groq_client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url='https://api.groq.com/openai/v1',
    )
    logger.info(f"✅ Groq AI Agent ready | model={GROQ_MODEL}")
else:
    groq_client = None
    logger.warning("⚠️ No GROQ_API_KEY — fallback mode only")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


# ═══════════════════════════════════════════════════════════
#  DATABASE HELPERS
# ═══════════════════════════════════════════════════════════

def get_conn():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'BE_SHOPEFOOD'),
        connection_timeout=5,
    )


def _to_serializable(row: dict) -> dict:
    """Chuyển Decimal/date/None từ MySQL sang JSON-safe types."""
    if not row:
        return row
    result = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            result[k] = float(v)
        elif hasattr(v, 'isoformat'):
            result[k] = str(v)
        elif v is None:
            result[k] = 0 if k in ('price', 'sale_price', 'gia_ban', 'gia_khuyen_mai') else ''
        else:
            result[k] = v
    return result


# ─── TOOLS: Tìm kiếm món ăn / nhà hàng ────────────────────

def _get_search_variants(keyword: str) -> list:
    SYNONYMS = {
        'cà phê':  ['cafe', 'caphe', 'ca phe', 'coffee', 'cf'],
        'trà sữa': ['tra sua', 'trasua', 'milk tea', 'milktea', 'ts'],
        'nước ép': ['nuoc ep', 'juice', 'nc ep'],
        'sinh tố': ['sinh to', 'smoothie'],
        'bún bò':  ['bun bo', 'bunbo', 'bb'],
        'cơm tấm': ['com tam', 'comtam', 'ct'],
        'bánh mì': ['banh mi', 'banhmi', 'bm'],
        'hải sản': ['hai san', 'haisan', 'seafood', 'hs'],
        'gà rán':  ['ga ran', 'garan', 'gr'],
        'phở':     ['pho', 'pho bo'],
        'lẩu':     ['lau', 'hotpot'],
        'cơm':     ['com', 'rice'],
        'mì quảng':['mi quang', 'miquang'],
    }
    kw = keyword.lower().strip()
    for canonical, variants in SYNONYMS.items():
        all_forms = [canonical] + variants
        if kw == canonical.lower() or any(kw == f.lower() for f in variants):
            return list(set(all_forms + [kw]))
    return [kw]


def q_foods(keyword: str, limit: int = 6) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        search_terms = _get_search_variants(keyword)
        cond_list, params = [], []
        for t in search_terms:
            lk = f'%{t}%'
            cond_list.append('(m.ten_mon_an LIKE %s OR dm.ten_danh_muc LIKE %s OR m.mo_ta LIKE %s)')
            params += [lk, lk, lk]
        conditions = ' OR '.join(cond_list)
        params += [keyword, f'{keyword}%', limit]
        cur.execute(f"""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND m.ten_mon_an NOT LIKE 'Them %%'
              AND ({conditions})
            ORDER BY
                CASE WHEN LOWER(m.ten_mon_an) = LOWER(%s) THEN 1
                     WHEN LOWER(m.ten_mon_an) LIKE LOWER(%s) THEN 2
                     ELSE 3 END
            LIMIT %s
        """, params)
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        logger.info(f"q_foods('{keyword}') → {len(rows)} results")
        return rows
    except Exception as e:
        logger.error(f"q_foods error: {e}")
        return []


def q_by_category(category: str, limit: int = 6) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND dm.ten_danh_muc LIKE %s
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
            ORDER BY RAND() LIMIT %s
        """, (f"%{category}%", limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_by_category error: {e}")
        return []


def q_top_foods(days: int = 30, limit: int = 6) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   0 AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address,
                   CONCAT('🔥 Bán ', SUM(ct.so_luong), ' suất') AS category,
                   SUM(ct.so_luong) AS so_ban
            FROM mon_ans m
            JOIN chi_tiet_don_hangs ct ON m.id = ct.id_mon_an
            JOIN don_hangs dh ON ct.id_don_hang = dh.id
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            WHERE dh.tinh_trang IN (3,4)
              AND dh.created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.hinh_anh,
                     qa.id, qa.ten_quan_an, qa.dia_chi
            ORDER BY so_ban DESC LIMIT %s
        """, (days, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        if not rows:
            cur.execute("""
                SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                       0 AS sale_price, m.hinh_anh,
                       qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                       qa.dia_chi AS address,
                       CONCAT('🔥 Bán ', SUM(ct.so_luong), ' suất') AS category
                FROM mon_ans m
                JOIN chi_tiet_don_hangs ct ON m.id = ct.id_mon_an
                JOIN don_hangs dh ON ct.id_don_hang = dh.id
                JOIN quan_ans qa ON m.id_quan_an = qa.id
                WHERE dh.tinh_trang IN (3,4) AND m.ten_mon_an NOT LIKE 'Thêm %%'
                GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.hinh_anh,
                         qa.id, qa.ten_quan_an, qa.dia_chi
                ORDER BY SUM(ct.so_luong) DESC LIMIT %s
            """, (limit,))
            rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_top_foods error: {e}")
        return []


def q_by_price(max_price: float, limit: int = 6) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
              AND COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) <= %s
            ORDER BY COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) DESC
            LIMIT %s
        """, (max_price, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_by_price error: {e}")
        return []


def q_by_location(location: str, food_kw: str = '', limit: int = 6) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        like_loc = f"%{location}%"
        like_kw  = f"%{food_kw}%" if food_kw else "%"
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND (qa.dia_chi LIKE %s OR qa.ten_quan_an LIKE %s)
              AND (%s='%%' OR m.ten_mon_an LIKE %s OR dm.ten_danh_muc LIKE %s)
            ORDER BY RAND() LIMIT %s
        """, (like_loc, like_loc, like_kw, like_kw, like_kw, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_by_location error: {e}")
        return []


def q_menu(restaurant: str, limit: int = 8) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1
              AND qa.ten_quan_an LIKE %s
            ORDER BY dm.ten_danh_muc, m.ten_mon_an LIMIT %s
        """, (f"%{restaurant}%", limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_menu error: {e}")
        return []


def q_random(limit: int = 6) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
            ORDER BY RAND() LIMIT %s
        """, (limit,))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_random error: {e}")
        return []


def q_vouchers(limit: int = 5) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT ma_code, ten_voucher, mo_ta, loai_giam, so_giam_gia,
                   so_tien_toi_da, don_hang_toi_thieu, thoi_gian_ket_thuc,
                   so_luot_da_dung, so_luot_toi_da
            FROM vouchers
            WHERE tinh_trang=1
              AND loai_voucher IN ('public', 'system')
              AND thoi_gian_bat_dau <= CURDATE()
              AND thoi_gian_ket_thuc >= CURDATE()
              AND (so_luot_toi_da IS NULL OR so_luot_da_dung < so_luot_toi_da)
            ORDER BY so_giam_gia DESC LIMIT %s
        """, (limit,))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_vouchers error: {e}")
        return []


def q_restaurant_ratings(restaurant: str = '', limit: int = 5) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        like = f'%{restaurant}%' if restaurant else '%'
        cur.execute("""
            SELECT qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                   COUNT(dg.id) AS so_danh_gia
            FROM quan_ans qa
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE qa.tinh_trang=1 AND qa.is_active=1
              AND qa.ten_quan_an LIKE %s
            GROUP BY qa.id, qa.ten_quan_an, qa.dia_chi
            HAVING COUNT(dg.id) > 0
            ORDER BY rating DESC, so_danh_gia DESC LIMIT %s
        """, (like, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_restaurant_ratings error: {e}")
        return []


def q_combo(mon_chinh: str, limit: int = 4) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        drink_kws = ['cà phê', 'trà sữa', 'nước ép', 'sinh tố', 'đồ uống', 'cafe']
        is_food = not any(k in mon_chinh.lower() for k in drink_kws)
        combo_target = 'đồ uống' if is_food else 'cơm'
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
              AND (dm.ten_danh_muc LIKE %s OR m.ten_mon_an LIKE %s)
            ORDER BY RAND() LIMIT %s
        """, (f'%{combo_target}%', f'%{combo_target}%', limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_combo error: {e}")
        return []


# ─── TOOLS MỚI: Cá nhân hóa theo khach_hang_id ────────────

def q_don_hang_cua_toi(khach_hang_id: int, limit: int = 5) -> list:
    """Lấy danh sách đơn hàng gần nhất của khách hàng"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        # Map trạng thái sang text (theo DonHang model)
        TINH_TRANG_MAP = {
            0: 'Chờ xác nhận',
            1: 'Shipper đã nhận',
            2: 'Quán đang làm',
            3: 'Đang giao',
            4: 'Hoàn thành',
            5: 'Đã hủy',
        }

        cur.execute("""
            SELECT dh.id, dh.ma_don_hang, dh.tong_tien, dh.tinh_trang,
                   dh.phuong_thuc_thanh_toan, dh.created_at,
                   qa.ten_quan_an AS ten_quan
            FROM don_hangs dh
            LEFT JOIN quan_ans qa ON dh.id_quan_an = qa.id
            WHERE dh.id_khach_hang = %s
            ORDER BY dh.created_at DESC
            LIMIT %s
        """, (khach_hang_id, limit))

        rows = cur.fetchall()
        conn.close()

        result = []
        for r in rows:
            row = _to_serializable(r)
            row['trang_thai_text'] = TINH_TRANG_MAP.get(r.get('tinh_trang', -1), f"Trạng thái {r.get('tinh_trang')}")
            result.append(row)

        logger.info(f"q_don_hang_cua_toi(kh={khach_hang_id}) → {len(result)} đơn hàng")
        return result
    except Exception as e:
        logger.error(f"q_don_hang_cua_toi error: {e}")
        return []


def q_trang_thai_don(khach_hang_id: int, ma_don_hang: str = '') -> dict:
    """Tra trạng thái đơn hàng cụ thể hoặc đơn mới nhất"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        TINH_TRANG_MAP = {
            0: '⏳ Chờ xác nhận',
            1: '✅ Shipper đã nhận đơn',
            2: '🍳 Quán đang chuẩn bị',
            3: '🛵 Đang giao hàng',
            4: '🎉 Hoàn thành',
            5: '❌ Đã hủy',
        }

        if ma_don_hang:
            cur.execute("""
                SELECT dh.id, dh.ma_don_hang, dh.tong_tien, dh.tinh_trang,
                       dh.phuong_thuc_thanh_toan, dh.created_at,
                       qa.ten_quan_an AS ten_quan,
                       s.ho_va_ten AS ten_shipper
                FROM don_hangs dh
                LEFT JOIN quan_ans qa ON dh.id_quan_an = qa.id
                LEFT JOIN shippers s ON dh.id_shipper = s.id
                WHERE dh.id_khach_hang = %s AND dh.ma_don_hang = %s
                LIMIT 1
            """, (khach_hang_id, ma_don_hang))
        else:
            cur.execute("""
                SELECT dh.id, dh.ma_don_hang, dh.tong_tien, dh.tinh_trang,
                       dh.phuong_thuc_thanh_toan, dh.created_at,
                       qa.ten_quan_an AS ten_quan,
                       s.ho_va_ten AS ten_shipper
                FROM don_hangs dh
                LEFT JOIN quan_ans qa ON dh.id_quan_an = qa.id
                LEFT JOIN shippers s ON dh.id_shipper = s.id
                WHERE dh.id_khach_hang = %s
                ORDER BY dh.created_at DESC LIMIT 1
            """, (khach_hang_id,))

        row = cur.fetchone()
        conn.close()
        if not row:
            return {}

        result = _to_serializable(row)
        result['trang_thai_text'] = TINH_TRANG_MAP.get(row.get('tinh_trang', -1), f"Trạng thái {row.get('tinh_trang')}")
        logger.info(f"q_trang_thai_don(kh={khach_hang_id}, ma={ma_don_hang}) → {result.get('trang_thai_text')}")
        return result
    except Exception as e:
        logger.error(f"q_trang_thai_don error: {e}")
        return {}


def q_kiem_tra_vi(khach_hang_id: int) -> dict:
    """Kiểm tra điểm xu của khách hàng (wallets table chỉ dành cho quán/shipper)"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        # Điểm xu từ bảng khach_hangs
        cur.execute("""
            SELECT diem_xu, ho_va_ten FROM khach_hangs WHERE id = %s LIMIT 1
        """, (khach_hang_id,))
        kh = cur.fetchone()

        # Tổng tiền đã chi tiêu
        cur.execute("""
            SELECT COUNT(*) AS tong_don, COALESCE(SUM(tong_tien), 0) AS tong_chi
            FROM don_hangs
            WHERE id_khach_hang = %s AND tinh_trang IN (3, 4)
        """, (khach_hang_id,))
        stats = cur.fetchone()
        conn.close()

        if not kh:
            return {}

        diem_xu   = int(kh.get('diem_xu') or 0)
        tong_don  = int(stats.get('tong_don') or 0) if stats else 0
        tong_chi  = float(stats.get('tong_chi') or 0) if stats else 0

        result = {
            'diem_xu': diem_xu,
            'diem_xu_text': f"{diem_xu} XU (≈ {diem_xu * 10:,}đ giảm giá)",
            'tong_don_hoan_thanh': tong_don,
            'tong_chi_tieu': tong_chi,
            'tong_chi_tieu_text': f"{tong_chi:,.0f}đ",
        }
        logger.info(f"q_kiem_tra_vi(kh={khach_hang_id}) → xu={diem_xu}, đơn={tong_don}")
        return result
    except Exception as e:
        logger.error(f"q_kiem_tra_vi error: {e}")
        return {}


def q_lich_su_mon_an(khach_hang_id: int, limit: int = 10) -> list:
    """Lấy các món ăn đã đặt trước đây để gợi ý cá nhân hóa"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category,
                   SUM(ct.so_luong) AS tong_dat,
                   MAX(dh.created_at) AS lan_cuoi_dat
            FROM chi_tiet_don_hangs ct
            JOIN don_hangs dh ON ct.id_don_hang = dh.id
            JOIN mon_ans m ON ct.id_mon_an = m.id
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE dh.id_khach_hang = %s
              AND dh.tinh_trang IN (3, 4)
              AND m.tinh_trang = 1
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.gia_khuyen_mai,
                     m.hinh_anh, qa.id, qa.ten_quan_an, qa.dia_chi, dm.ten_danh_muc
            ORDER BY tong_dat DESC, lan_cuoi_dat DESC
            LIMIT %s
        """, (khach_hang_id, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        logger.info(f"q_lich_su_mon_an(kh={khach_hang_id}) → {len(rows)} món đã đặt")
        return rows
    except Exception as e:
        logger.error(f"q_lich_su_mon_an error: {e}")
        return []


# ═══════════════════════════════════════════════════════════
#  TOOL DEFINITIONS — LLM tự chọn tool
# ═══════════════════════════════════════════════════════════

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "tim_kiem_mon_an",
            "description": (
                "Tìm kiếm món ăn trong FoodBee theo từ khóa. "
                "Gọi khi người dùng hỏi về bất kỳ loại đồ ăn/uống cụ thể. "
                "Ví dụ: 'tìm phở', 'muốn ăn bún bò', 'có cơm tấm không', 'cf nào ngon'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "string",
                        "description": "Từ khóa tên món ăn, viết đầy đủ tiếng Việt. VD: 'phở', 'cơm tấm', 'cà phê', 'trà sữa'"
                    },
                    "limit": {"type": "integer", "default": 6}
                },
                "required": ["keyword"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tim_theo_danh_muc",
            "description": (
                "Tìm món ăn theo danh mục/nhóm loại. Gọi khi người dùng hỏi theo nhóm: "
                "'đồ ăn nhanh', 'món chay', 'đồ uống', 'tráng miệng', 'món Việt', 'fast food'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "danh_muc": {
                        "type": "string",
                        "description": "Tên danh mục. VD: 'đồ uống', 'fast food', 'chay', 'tráng miệng'"
                    },
                    "limit": {"type": "integer", "default": 6}
                },
                "required": ["danh_muc"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lay_mon_ban_chay",
            "description": (
                "Lấy danh sách món bán chạy nhất. "
                "Gọi khi hỏi: 'món hot', 'bán chạy nhất', 'được đặt nhiều', 'phổ biến nhất', 'trending'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "default": 30, "description": "Số ngày gần đây"},
                    "limit": {"type": "integer", "default": 6}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tim_mon_theo_gia",
            "description": (
                "Tìm món ăn theo ngân sách tối đa. "
                "Gọi khi hỏi: 'món rẻ', 'dưới 50k', 'ngân sách 30 nghìn', 'tiết kiệm', 'giá rẻ'. "
                "Chuyển đổi: 50k=50000, 100 nghìn=100000, 2 triệu=2000000."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "gia_toi_da": {
                        "type": "number",
                        "description": "Giá tối đa tính bằng đồng. VD: 50000 (50k), 100000 (100 nghìn)"
                    },
                    "limit": {"type": "integer", "default": 6}
                },
                "required": ["gia_toi_da"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tim_quan_theo_khu_vuc",
            "description": (
                "Tìm quán ăn theo địa điểm/khu vực tại Đà Nẵng. "
                "Gọi khi hỏi: 'quán gần đây', 'quán ở Hải Châu', 'khu vực Thanh Khê', 'đường Trần Phú'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "dia_diem": {
                        "type": "string",
                        "description": "Tên khu vực/quận/đường. VD: 'Hải Châu', 'Thanh Khê', 'Nguyễn Văn Linh'"
                    },
                    "mon_an": {"type": "string", "default": "", "description": "Loại món kèm theo (tùy chọn)"}
                },
                "required": ["dia_diem"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "xem_menu_quan",
            "description": (
                "Xem thực đơn của một quán cụ thể. "
                "Gọi khi hỏi: 'quán X bán gì', 'menu quán Y', 'xem menu của [tên quán]'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ten_quan": {"type": "string", "description": "Tên quán ăn cần xem menu"}
                },
                "required": ["ten_quan"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "goi_y_ngau_nhien",
            "description": (
                "Gợi ý món ăn ngẫu nhiên. "
                "Gọi khi người dùng không biết ăn gì, muốn khám phá, hỏi chung chung 'gợi ý cho tôi đi'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 6}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "xem_khuyen_mai",
            "description": (
                "Xem voucher và ưu đãi đang có hiệu lực. "
                "Gọi khi hỏi: 'có voucher không', 'mã giảm giá', 'khuyến mãi hôm nay', 'discount', 'coupon'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 5}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "xem_danh_gia_quan",
            "description": (
                "Xem đánh giá và rating quán ăn. "
                "Gọi khi hỏi: 'quán nào ngon nhất', 'đánh giá quán X', 'rating bao nhiêu sao', 'review'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ten_quan": {
                        "type": "string",
                        "default": "",
                        "description": "Tên quán. Để trống để xem top quán được đánh giá cao nhất."
                    },
                    "limit": {"type": "integer", "default": 5}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "goi_y_combo",
            "description": (
                "Gợi ý món ăn kết hợp/combo. "
                "Gọi khi hỏi: 'ăn kèm gì', 'kết hợp với gì', 'uống gì kèm', 'combo', 'set meal'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "mon_chinh": {
                        "type": "string",
                        "description": "Món chính. VD: 'cơm tấm', 'phở', 'trà sữa'"
                    },
                    "limit": {"type": "integer", "default": 4}
                },
                "required": ["mon_chinh"]
            }
        }
    },
    # ── TOOLS MỚI: Cá nhân hóa ──────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "xem_don_hang_cua_toi",
            "description": (
                "Xem danh sách đơn hàng gần nhất của khách hàng đã đăng nhập. "
                "Gọi khi hỏi: 'đơn hàng của tôi', 'tôi đã đặt gì', 'lịch sử đặt hàng', 'xem đơn'."
                "Tool này chỉ hoạt động khi người dùng ĐÃ ĐĂNG NHẬP."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 5, "description": "Số đơn hàng gần nhất cần xem"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tra_trang_thai_don",
            "description": (
                "Tra trạng thái đơn hàng cụ thể hoặc đơn mới nhất. "
                "Gọi khi hỏi: 'đơn của tôi đến chưa', 'shipper đến chưa', 'đơn hàng đang ở đâu', "
                "'trạng thái đơn', 'đơn tôi đặt lúc nãy'. "
                "Tool này chỉ hoạt động khi người dùng ĐÃ ĐĂNG NHẬP."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ma_don_hang": {
                        "type": "string",
                        "default": "",
                        "description": "Mã đơn hàng cụ thể (nếu có). Để trống để tra đơn mới nhất."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "kiem_tra_vi_tien",
            "description": (
                "Kiểm tra số dư ví điện tử và điểm xu của khách hàng. "
                "Gọi khi hỏi: 'ví của tôi', 'số dư ví', 'tôi có bao nhiêu xu', 'điểm thưởng của tôi', "
                "'tôi có bao nhiêu tiền trong ví'. "
                "Tool này chỉ hoạt động khi người dùng ĐÃ ĐĂNG NHẬP."
            ),
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "goi_y_theo_lich_su",
            "description": (
                "Gợi ý món ăn dựa trên lịch sử đặt hàng của khách hàng (cá nhân hóa). "
                "Gọi khi hỏi: 'gợi ý dựa trên lịch sử', 'tôi hay ăn gì', 'đặt lại món cũ', "
                "'gợi ý theo sở thích của tôi', 'món tôi đã thích'. "
                "Tool này chỉ hoạt động khi người dùng ĐÃ ĐĂNG NHẬP."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 6}
                }
            }
        }
    },
]


# ═══════════════════════════════════════════════════════════
#  TOOL EXECUTOR
# ═══════════════════════════════════════════════════════════

def execute_tool(name: str, args: dict, khach_hang_id: int = None):
    """Thực thi tool và trả về (foods: list, summary: str)"""

    # ── Các tool công khai ──────────────────────────────────
    if name == "tim_kiem_mon_an":
        kw    = args.get("keyword", "")
        limit = args.get("limit", 6)
        foods = q_foods(kw, limit)
        if not foods:
            foods = q_random(limit)
            return foods, f"Không tìm thấy '{kw}', gợi ý {len(foods)} món thay thế"
        return foods, f"Tìm thấy {len(foods)} món với từ khóa '{kw}'"

    elif name == "tim_theo_danh_muc":
        cat   = args.get("danh_muc", "")
        limit = args.get("limit", 6)
        foods = q_by_category(cat, limit)
        if not foods:
            foods = q_random(limit)
            return foods, f"Không tìm thấy danh mục '{cat}', gợi ý {len(foods)} món thay thế"
        return foods, f"Tìm thấy {len(foods)} món trong danh mục '{cat}'"

    elif name == "lay_mon_ban_chay":
        foods = q_top_foods(args.get("days", 30), args.get("limit", 6))
        if not foods:
            foods = q_random(args.get("limit", 6))
            return foods, f"Chưa có dữ liệu bán chạy, gợi ý {len(foods)} món phổ biến"
        return foods, f"Top {len(foods)} món bán chạy nhất"

    elif name == "tim_mon_theo_gia":
        mp    = float(args.get("gia_toi_da", 50000))
        foods = q_by_price(mp, args.get("limit", 6))
        if not foods:
            return [], f"Không có món nào dưới {int(mp):,}đ"
        return foods, f"Tìm thấy {len(foods)} món dưới {int(mp):,}đ"

    elif name == "tim_quan_theo_khu_vuc":
        loc   = args.get("dia_diem", "")
        mon   = args.get("mon_an", "")
        foods = q_by_location(loc, mon)
        if not foods:
            return [], f"Chưa có quán nào gần '{loc}'"
        return foods, f"Tìm thấy {len(foods)} kết quả gần '{loc}'"

    elif name == "xem_menu_quan":
        ten   = args.get("ten_quan", "")
        foods = q_menu(ten)
        if not foods:
            return [], f"Không tìm thấy quán '{ten}'"
        return foods, f"Menu của '{ten}': {len(foods)} món"

    elif name == "goi_y_ngau_nhien":
        foods = q_random(args.get("limit", 6))
        return foods, f"Gợi ý {len(foods)} món ngẫu nhiên"

    elif name == "xem_khuyen_mai":
        vouchers = q_vouchers(args.get("limit", 5))
        if not vouchers:
            return [], "Hiện không có voucher nào đang hoạt động trên FoodBee"
        v_lines = []
        for v in vouchers:
            discount = (f"{v.get('so_giam_gia', 0):,.0f}đ"
                       if v.get('loai_giam') == 0
                       else f"{v.get('so_giam_gia', 0)}%")
            min_order = f" | Đơn tối thiểu: {v.get('don_hang_toi_thieu', 0):,.0f}đ" if v.get('don_hang_toi_thieu') else ""
            max_disc  = f" | Giảm tối đa: {v.get('so_tien_toi_da', 0):,.0f}đ" if v.get('so_tien_toi_da') else ""
            left = ""
            if v.get('so_luot_toi_da'):
                remain = (v.get('so_luot_toi_da') or 0) - (v.get('so_luot_da_dung') or 0)
                left = f" | Còn {remain} lượt"
            hsd = v.get('thoi_gian_ket_thuc', '')
            v_lines.append(f"🎟️ Mã: {v.get('ma_code')} — Giảm {discount}{min_order}{max_disc}{left} | HSD: {hsd}")
        summary = f"Tìm thấy {len(vouchers)} voucher đang hiệu lực:\n" + "\n".join(v_lines)
        return [], summary

    elif name == "xem_danh_gia_quan":
        restaurant = args.get("ten_quan", "")
        limit      = args.get("limit", 5)
        ratings    = q_restaurant_ratings(restaurant, limit)
        if not ratings:
            return q_random(4), f"Chưa có đánh giá nào cho quán '{restaurant}'"
        r_lines  = []
        top_name = ""
        for r in ratings:
            stars_num = float(r.get('rating') or 0)
            star_str  = "⭐" * round(stars_num)
            count     = r.get('so_danh_gia', 0)
            r_lines.append(f"{star_str} {r.get('restaurant')}: {stars_num}/5 ({count} đánh giá) — {r.get('address', '')}")
            if not top_name:
                top_name = r.get('restaurant', '')
        summary = "Top quán được đánh giá cao:\n" + "\n".join(r_lines)
        foods   = q_menu(top_name, 4) if top_name else []
        return foods, summary

    elif name == "goi_y_combo":
        mon_chinh = args.get("mon_chinh", "cơm")
        limit     = args.get("limit", 4)
        foods     = q_combo(mon_chinh, limit)
        if not foods:
            foods = q_random(limit)
        return foods, f"Gợi ý món ăn kèm/combo với '{mon_chinh}'"

    # ── Tools cá nhân hóa (cần đăng nhập) ──────────────────
    elif name == "xem_don_hang_cua_toi":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập để xem đơn hàng. Hãy đăng nhập vào tài khoản FoodBee nhé!"
        limit  = args.get("limit", 5)
        orders = q_don_hang_cua_toi(khach_hang_id, limit)
        if not orders:
            return [], "Bạn chưa có đơn hàng nào trên FoodBee. Hãy đặt món đầu tiên ngay nhé! 🛒"
        lines = []
        for o in orders:
            lines.append(
                f"📦 Đơn #{o.get('ma_don_hang', o.get('id'))} | "
                f"{o.get('ten_quan', 'N/A')} | "
                f"{o.get('tong_tien', 0):,.0f}đ | "
                f"{o.get('trang_thai_text', '')} | "
                f"{str(o.get('created_at', ''))[:10]}"
            )
        summary = f"Bạn có {len(orders)} đơn hàng gần nhất:\n" + "\n".join(lines)
        return [], summary

    elif name == "tra_trang_thai_don":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập để tra cứu đơn hàng. Hãy đăng nhập vào tài khoản FoodBee nhé!"
        ma_don = args.get("ma_don_hang", "")
        order  = q_trang_thai_don(khach_hang_id, ma_don)
        if not order:
            return [], "Không tìm thấy đơn hàng. Bạn thử kiểm tra trong mục Đơn Hàng của app nhé!"
        summary = (
            f"🔍 Trạng thái đơn hàng #{order.get('ma_don_hang', order.get('id'))}:\n"
            f"• Quán: {order.get('ten_quan', 'N/A')}\n"
            f"• Tổng tiền: {order.get('tong_tien', 0):,.0f}đ\n"
            f"• Trạng thái: {order.get('trang_thai_text', '')}\n"
            f"• Shipper: {order.get('ten_shipper', 'Chưa có') or 'Chưa có'}\n"
            f"• Thời gian đặt: {str(order.get('created_at', ''))[:16]}"
        )
        return [], summary

    elif name == "kiem_tra_vi_tien":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập để xem thông tin. Hãy đăng nhập vào tài khoản FoodBee nhé!"
        vi  = q_kiem_tra_vi(khach_hang_id)
        if not vi:
            return [], "Không lấy được thông tin tài khoản. Bạn thử truy cập trong app nhé!"
        summary = (
            f"💰 Thông tin tài khoản FoodBee của bạn:\n"
            f"• Điểm XU: {vi.get('diem_xu_text', '0 XU')}\n"
            f"• Tổng đơn hoàn thành: {vi.get('tong_don_hoan_thanh', 0)} đơn\n"
            f"• Tổng chi tiêu: {vi.get('tong_chi_tieu_text', '0đ')}"
        )
        return [], summary

    elif name == "goi_y_theo_lich_su":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập để xem gợi ý cá nhân hóa. Hãy đăng nhập vào tài khoản FoodBee nhé!"
        limit = args.get("limit", 6)
        foods = q_lich_su_mon_an(khach_hang_id, limit)
        if not foods:
            foods = q_random(limit)
            return foods, "Bạn chưa có lịch sử đặt hàng, đây là một số gợi ý phổ biến"
        return foods, f"Gợi ý {len(foods)} món ăn dựa trên sở thích của bạn"

    return [], "Tool không xác định"


# ═══════════════════════════════════════════════════════════
#  SYSTEM PROMPT — FoodBee Agent
# ═══════════════════════════════════════════════════════════

def build_system_prompt(meal_ctx: str, is_logged_in: bool) -> str:
    login_ctx = (
        "Khách hàng ĐÃ ĐĂNG NHẬP. Bạn có thể sử dụng các tool cá nhân hóa: "
        "xem_don_hang_cua_toi, tra_trang_thai_don, kiem_tra_vi_tien, goi_y_theo_lich_su."
        if is_logged_in
        else
        "Khách hàng CHƯA ĐĂNG NHẬP. Nếu hỏi về đơn hàng/ví/lịch sử cá nhân, "
        "hãy thông báo cần đăng nhập và gợi ý đi đến trang đăng nhập."
    )

    return f"""Bạn là **FoodBee Assistant** 🍯 — AI Agent thông minh của ứng dụng đặt đồ ăn FoodBee tại Đà Nẵng, Việt Nam.

## VAI TRÒ CỦA BẠN
Bạn là một **AI Agent** — không phải chatbot thông thường. Bạn có khả năng:
- **Tự suy luận** để hiểu intent của người dùng, kể cả khi họ viết tắt, không dấu, sai chính tả
- **Tự lập kế hoạch** và gọi nhiều tool liên tiếp nếu cần
- **Tự chọn tool phù hợp** mà không cần người dùng nói rõ cần gì

## QUY TẮC QUAN TRỌNG

### 1. LUÔN GỌI TOOL KHI CÓ LIÊN QUAN ĐẾN ĐỒ ĂN
- Mọi câu hỏi về thức ăn/uống → **GỌI TOOL NGAY**, không đoán bừa
- Không biết chắc → gọi `goi_y_ngau_nhien` thay vì nói "không biết"
- Tool trả 0 kết quả → gọi thêm tool khác để có món thay thế

### 2. TỰ DỊCH VIẾT TẮT / KHÔNG DẤU
Người dùng hay viết tắt — bạn PHẢI tự hiểu:
- cf / cafe / caphe → cà phê
- ts / trasua → trà sữa
- bb / bunbo / bun bo → bún bò
- ct / comtam / com tam → cơm tấm
- bm / banhmi / banh mi → bánh mì
- hs / haisan → hải sản
- gr / garan → gà rán
- pho / phobo → phở

### 3. GỌI NHIỀU TOOL NẾU CẦN
Ví dụ: "trời nóng muốn uống gì mát?" → gọi `tim_kiem_mon_an(keyword="sinh tố")` VÀ `tim_kiem_mon_an(keyword="nước ép")`

### 4. CÁ NHÂN HÓA KHI ĐÃ ĐĂNG NHẬP
{login_ctx}

## THÔNG TIN FOODBEE
- Ứng dụng đặt món ăn, giao hàng tận nơi tại Đà Nẵng
- Thời gian giao: **30-45 phút**
- Phí giao hàng: **15,000 - 25,000đ** tùy khoảng cách
- Thanh toán: tiền mặt khi nhận HOẶC chuyển khoản QR (PayOS)
- Khu vực phục vụ: Hải Châu, Thanh Khê, Sơn Trà, Liên Chiểu, Cẩm Lệ, Ngũ Hành Sơn

## ĐIỂM XU
1,000đ = 1 XU | 100 XU = 1,000đ giảm giá | XU không hết hạn

## CHÍNH SÁCH
- Hủy đơn: trước khi quán xác nhận
- Khiếu nại: trong 24h sau khi nhận
- Hoàn tiền: khi đơn bị hủy từ phía quán/shipper

## 🕐 NGỮ CẢNH THỜI GIAN
{meal_ctx}
Ưu tiên gợi ý món phù hợp với khung giờ này khi người dùng hỏi chung chung.

## QUY TẮC TRẢ LỜI
1. Ngắn gọn, thân thiện, có emoji phù hợp 🍜
2. Sau khi tool trả kết quả: 1-2 câu nhận xét ngắn, KHÔNG liệt kê lại từng tên món
3. Luôn trả lời bằng tiếng Việt"""


# ═══════════════════════════════════════════════════════════
#  THỜI GIAN — Meal context
# ═══════════════════════════════════════════════════════════

def get_meal_context() -> str:
    vn_time = datetime.now(timezone(timedelta(hours=7)))
    hour = vn_time.hour
    if 5 <= hour < 10:
        return "🌅 BỮA SÁNG (5–10h): bánh mì, phở, xôi, cháo, bún bò, cà phê"
    elif 10 <= hour < 14:
        return "🌞 BỮA TRƯA (10–14h): cơm, bún bò, cơm tấm, mì quảng, cháo"
    elif 14 <= hour < 18:
        return "☀️ BUỔI CHIỀU (14–18h): trà sữa, cà phê, đồ ăn vặt, nước ép, sinh tố"
    elif 18 <= hour < 22:
        return "🌙 BỮA TỐI (18–22h): lẩu, nướng, gà rán, pizza, hải sản"
    else:
        return "🌃 ĐÊM KHUYA (22h+): cháo, mì, bánh mì, đồ ăn nhẹ"


# ═══════════════════════════════════════════════════════════
#  AGENTIC LOOP — Multi-step tool calling
# ═══════════════════════════════════════════════════════════

def run_agent(query: str, history: list, user_context: dict):
    """
    Vòng lặp Agent:
    1. LLM quyết định tool nào cần gọi (hoặc trả lời thẳng)
    2. Execute tool → đưa kết quả lại cho LLM
    3. LLM có thể gọi thêm tool hoặc tổng hợp và trả lời cuối
    Lặp tối đa MAX_AGENT_STEPS lần.
    """
    if not groq_client:
        return None, []

    # Extract context
    is_logged_in  = user_context.get('is_logged_in', False)
    khach_hang_id = user_context.get('khach_hang_id')  # ID nếu đã đăng nhập

    # Build messages
    system_prompt = build_system_prompt(get_meal_context(), is_logged_in)
    messages = [{"role": "system", "content": system_prompt}]

    # Thêm lịch sử hội thoại (tối đa 20 messages gần nhất)
    if history:
        for h in history[-20:]:
            role    = h.get("role", "")
            content = h.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": str(content)})

    messages.append({"role": "user", "content": query})

    all_foods  = []
    step_count = 0

    while step_count < MAX_AGENT_STEPS:
        step_count += 1
        logger.info(f"🤖 Agent step {step_count}/{MAX_AGENT_STEPS}")

        try:
            # LLM quyết định bước tiếp theo
            resp = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=1000,
                temperature=0.5,
                timeout=20,
            )
        except RateLimitError:
            logger.warning("⚠️ Groq rate limit — dừng agent")
            break
        except APIError as e:
            logger.error(f"Groq API error: {e}")
            break

        msg = resp.choices[0].message

        # Không cần tool → Agent đã có đủ thông tin, trả lời thẳng
        if not msg.tool_calls:
            logger.info(f"✅ Agent hoàn thành sau {step_count} bước")
            final_text = (msg.content or "").strip()

            # Dedup foods
            seen, unique_foods = set(), []
            for f in all_foods:
                fid = f.get("id")
                if fid not in seen:
                    seen.add(fid)
                    unique_foods.append(f)

            return final_text, unique_foods[:8]

        # Thêm assistant message vào history
        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments}
                }
                for tc in msg.tool_calls
            ]
        })

        # Execute tất cả tools LLM vừa chọn
        for tc in msg.tool_calls:
            fn_name = tc.function.name
            try:
                args = json.loads(tc.function.arguments)
            except Exception:
                args = {}

            logger.info(f"🔧 Tool: {fn_name} | args: {args}")
            foods, summary = execute_tool(fn_name, args, khach_hang_id)
            all_foods.extend(foods)

            # Đưa kết quả tool vào messages để LLM tiếp tục
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": summary,
            })
            logger.info(f"📊 Tool result: {summary[:120]}")

    # Quá MAX_AGENT_STEPS → tổng hợp những gì có
    logger.warning(f"⚠️ Agent vượt {MAX_AGENT_STEPS} bước, tổng hợp kết quả")
    try:
        messages.append({
            "role": "user",
            "content": "Hãy tổng hợp và trả lời cho tôi dựa trên những thông tin đã thu thập được."
        })
        final_resp = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=400,
            temperature=0.6,
            timeout=15,
        )
        final_text = (final_resp.choices[0].message.content or "").strip()
    except Exception:
        final_text = "🍴 Đây là một số gợi ý cho bạn!"

    seen, unique_foods = set(), []
    for f in all_foods:
        fid = f.get("id")
        if fid not in seen:
            seen.add(fid)
            unique_foods.append(f)

    return final_text, unique_foods[:8]


# ═══════════════════════════════════════════════════════════
#  FALLBACK (khi Groq offline)
# ═══════════════════════════════════════════════════════════

FALLBACK_RULES = [
    (['giao hàng bao lâu', 'mất bao lâu', 'bao giờ đến'],
     "🛵 FoodBee giao hàng trong **30-45 phút** tại Đà Nẵng!"),
    (['phí giao', 'phí ship', 'tiền ship', 'ship bao nhiêu'],
     "💰 Phí giao hàng khoảng **15,000 - 25,000đ** tùy khoảng cách!"),
    (['thanh toán', 'trả tiền', 'payment', 'chuyển khoản'],
     "💳 Hỗ trợ **tiền mặt** khi nhận hàng và **chuyển khoản QR** (PayOS)!"),
    (['hủy đơn', 'cancel', 'hủy order'],
     "✅ Bạn có thể hủy đơn **trước khi quán xác nhận** trong mục Đơn hàng!"),
    (['voucher', 'mã giảm', 'khuyến mãi', 'coupon', 'ưu đãi'],
     "🎟️ FoodBee có nhiều voucher giảm giá! Hỏi tôi **'có voucher gì không?'** nhé!"),
    (['điểm xu', 'tích xu', 'xu là'],
     "🏆 **1,000đ = 1 XU**. Tích đủ **100 XU** đổi được **1,000đ** giảm giá!"),
    (['hoàn tiền', 'refund'],
     "💸 FoodBee hoàn tiền khi đơn bị hủy từ phía quán/shipper!"),
    (['khu vực', 'vùng phục vụ', 'giao được đâu'],
     "📍 Phục vụ toàn Đà Nẵng: Hải Châu, Thanh Khê, Sơn Trà, Liên Chiểu, Cẩm Lệ, Ngũ Hành Sơn!"),
    (['xin chào', 'chào', 'hello', 'hi ', 'alo', 'hey'],
     "👋 Xin chào! Tôi là **FoodBee AI Agent**. Bạn muốn tìm món ăn gì hôm nay?"),
    (['cảm ơn', 'thanks'],
     "😊 Không có gì! FoodBee luôn sẵn sàng phục vụ bạn!"),
    (['tạm biệt', 'bye'],
     "👋 Tạm biệt! Nhớ ghé FoodBee thường xuyên nhé! 🍯"),
]


def fallback_respond(query: str) -> str:
    q = query.lower()
    for keywords, response in FALLBACK_RULES:
        if any(k in q for k in keywords):
            return response
    return "😊 Bạn thử hỏi: **'phở ngon ở đâu?'**, **'món dưới 50k?'**, hay **'bán chạy nhất hôm nay?'**!"


# ═══════════════════════════════════════════════════════════
#  API ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data         = request.json or {}
        query        = (data.get('message') or '').strip()
        history      = data.get('history', [])
        user_context = data.get('user_context', {})

        if not query:
            return jsonify({'response': "Bạn muốn hỏi gì ạ? 😊", 'foods': [], 'ai_powered': True})

        kh_id     = user_context.get('khach_hang_id')
        is_logged = user_context.get('is_logged_in', False)
        logger.info(f"📩 Agent [{len(history)} ctx | logged={is_logged} | kh_id={kh_id}] → {query[:80]}")

        # Chạy Agentic Loop
        response_text, foods = run_agent(query, history, user_context)

        if not response_text:
            # Groq offline/rate-limited → fallback với DB
            response_text = fallback_respond(query)
            if not foods:
                foods = q_random(6)

        logger.info(f"🤖 Response: {response_text[:120]}")

        return jsonify({
            'response':   response_text,
            'foods':      foods,
            'ai_powered': True,
        })

    except Exception as e:
        logger.error(f"❌ Chat error: {e}", exc_info=True)
        _raw_query     = locals().get('query', '') or ''
        fallback_text  = fallback_respond(_raw_query)
        fallback_foods = []
        try:
            fallback_foods = q_random(6)
        except Exception:
            pass
        return jsonify({
            'response':   fallback_text,
            'foods':      fallback_foods,
            'ai_powered': False,
        })


@app.route('/api/categories', methods=['GET'])
def categories():
    try:
        conn = get_conn()
        cur  = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT dm.id, dm.ten_danh_muc AS name, COUNT(m.id) AS so_mon
            FROM danh_mucs dm
            LEFT JOIN mon_ans m ON m.id_danh_muc = dm.id AND m.tinh_trang=1
            GROUP BY dm.id, dm.ten_danh_muc
            ORDER BY so_mon DESC
        """)
        cats = cur.fetchall()
        conn.close()
        return jsonify({'categories': cats, 'total': len(cats)})
    except Exception as e:
        logger.error(f"categories error: {e}")
        return jsonify({'categories': [], 'total': 0}), 500


@app.route('/api/restaurants', methods=['GET'])
def restaurants():
    try:
        limit = int(request.args.get('limit', 20))
        conn  = get_conn()
        cur   = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT qa.id, qa.ten_quan_an AS name, qa.dia_chi AS address,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                   COUNT(DISTINCT dg.id) AS so_danh_gia,
                   COUNT(DISTINCT m.id) AS so_mon
            FROM quan_ans qa
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            LEFT JOIN mon_ans m ON qa.id = m.id_quan_an AND m.tinh_trang=1
            WHERE qa.tinh_trang=1 AND qa.is_active=1
            GROUP BY qa.id, qa.ten_quan_an, qa.dia_chi
            ORDER BY rating DESC, so_danh_gia DESC
            LIMIT %s
        """, (limit,))
        data = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return jsonify({'restaurants': data, 'total': len(data)})
    except Exception as e:
        logger.error(f"restaurants error: {e}")
        return jsonify({'restaurants': [], 'total': 0}), 500


@app.route('/api/health', methods=['GET'])
def health():
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM mon_ans WHERE tinh_trang=1")
        n = cur.fetchone()[0]
        conn.close()
        db_ok = True
    except Exception:
        n, db_ok = 0, False

    return jsonify({
        'status':        'healthy',
        'version':       '10.0-agent',
        'architecture':  'multi-step-agentic-loop',
        'max_steps':     MAX_AGENT_STEPS,
        'total_tools':   len(TOOLS),
        'tools':         [t['function']['name'] for t in TOOLS],
        'personalized_tools': [
            'xem_don_hang_cua_toi',
            'tra_trang_thai_don',
            'kiem_tra_vi_tien',
            'goi_y_theo_lich_su',
        ],
        'ai_model':      GROQ_MODEL if groq_client else 'fallback-only',
        'db_connected':  db_ok,
        'foods_count':   n,
    })


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    logger.info(f"🚀 FoodBee AI Agent v10.0 — Multi-step Agentic Loop — port {port}")
    logger.info(f"🤖 {'✅ Groq AI ON | ' + GROQ_MODEL if groq_client else '❌ Groq OFF (fallback mode)'}")
    logger.info(f"🔧 Total tools: {len(TOOLS)} | Max steps per session: {MAX_AGENT_STEPS}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
