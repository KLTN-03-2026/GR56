"""
FoodBee Bee — Smart Customer Service Chatbot v12.0
==================================================
State Machine Flow v12.0:
- SEARCHING_FOOD: User tìm món → hiện cards
- SELECTING_RESTAURANT: User click card → hỏi thêm món + thu thập delivery info
- ENTERING_DELIVERY_INFO: User nhập thông tin giao hàng
- SELECTING_PAYMENT: User chọn thanh toán
- COMPLETED: Xác nhận đơn hàng
"""

from flask import Flask, request, jsonify, session
import secrets
from flask_cors import CORS
import os
import mysql.connector
from dotenv import load_dotenv
import logging
import json
import re
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from openai import OpenAI, RateLimitError
import time

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(name)s %(levelname)s %(message)s'
)
logger = logging.getLogger('foodbee_bee')

# ── State Machine ───────────────────────────────────────
STATE_SEARCHING_FOOD        = 'SEARCHING_FOOD'
STATE_SELECTING_RESTAURANT  = 'SELECTING_RESTAURANT'
STATE_VIEWING_MENU          = 'VIEWING_MENU'
STATE_ENTERING_DELIVERY     = 'ENTERING_DELIVERY'
STATE_CONFIRMING_ORDER      = 'CONFIRMING_ORDER'   # ← MỚI: xác nhận đơn trước khi thanh toán
STATE_SELECTING_PAYMENT     = 'SELECTING_PAYMENT'
STATE_COMPLETED             = 'COMPLETED'

def init_order_session(sess):
    sess.setdefault('order_state', STATE_SEARCHING_FOOD)
    sess.setdefault('cart', [])          # list of {id, title, price, id_quan_an, restaurant}
    sess.setdefault('restaurant_id', None)
    sess.setdefault('restaurant_name', None)
    sess.setdefault('customer_name', None)
    sess.setdefault('phone', None)
    sess.setdefault('address', None)
    sess.setdefault('total_amount', 0)

# ── Groq AI ─────────────────────────────────────────────
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_MODEL   = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')

ai_client = None

def _resolve_client():
    global ai_client
    if GROQ_API_KEY:
        ai_client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url='https://api.groq.com/openai/v1',
        )
        logger.info(f"✅ Groq AI ready | model={GROQ_MODEL}")
    else:
        logger.warning("⚠️ No GROQ_API_KEY — fallback mode only")

_resolve_client()

MAX_AGENT_STEPS = 5

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app, resources={r"/*": {"origins": "*"}})

# ── Session State cho đặt hàng ─────────────────────────────────
# Lưu trữ thông tin đơn hàng đang thu thập của từng session
order_sessions = {}  # session_id -> {khach_hang_id, ho_ten, sdt, dia_chi, id_quan_an, mon_an_list, trang_thai}

def get_order_session(session_id: str) -> dict:
    if session_id not in order_sessions:
        order_sessions[session_id] = {
            'khach_hang_id': None,
            'ho_ten': '',
            'sdt': '',
            'dia_chi': '',
            'id_quan_an': None,
            'ten_quan_an': '',
            'mon_an_list': [],  # [{id, ten_mon, so_luong, gia}]
            'trang_thai': STATE_SEARCHING_FOOD,  # state machine
            # State machine fields
            'cart': [],
            'restaurant_id': None,
            'restaurant_name': None,
            'customer_name': None,
            'phone': None,
            'address': None,
            'total_amount': 0,
            # Restaurant-first flow
            'restaurant_list': [],   # [{id, name, address, rating, ...}]
            'menu_items': [],        # [{id, title, price, ...}] — menu of selected restaurant
        }
    return order_sessions[session_id]

def clear_order_session(session_id: str):
    if session_id in order_sessions:
        order_sessions[session_id] = {
            'khach_hang_id': None, 'ho_ten': '', 'sdt': '', 'dia_chi': '',
            'id_quan_an': None, 'ten_quan_an': '', 'mon_an_list': [], 'trang_thai': STATE_SEARCHING_FOOD,
            'cart': [], 'restaurant_id': None, 'restaurant_name': None,
            'customer_name': None, 'phone': None, 'address': None, 'total_amount': 0,
            'restaurant_list': [], 'menu_items': [],
        }


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
    if not row:
        return row
    result = {}
    from datetime import timedelta
    for k, v in row.items():
        if isinstance(v, Decimal):
            result[k] = float(v)
        elif hasattr(v, 'isoformat'):
            result[k] = str(v)
        elif isinstance(v, timedelta):
            result[k] = str(v)  # e.g. "6:00:00"
        elif v is None:
            result[k] = 0 if k in ('price', 'sale_price', 'gia_ban', 'gia_khuyen_mai') else ''
        else:
            result[k] = v
    return result


# ─── Từ đồng nghĩa ────────────────────────────────────

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


def _get_search_variants(keyword: str) -> list:
    kw = keyword.lower().strip()
    for canonical, variants in SYNONYMS.items():
        all_forms = [canonical] + variants
        if kw == canonical.lower() or any(kw == f.lower() for f in variants):
            return list(set(all_forms + [kw]))
    return [kw]


# ═══════════════════════════════════════════════════════════
#  QUERY FUNCTIONS — Smart food & restaurant queries
# ═══════════════════════════════════════════════════════════

def q_foods(keyword: str, limit: int = 6) -> list:
    """Tìm món ăn với thông tin phong phú: mô tả, rating"""
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
            SELECT m.id, m.ten_mon_an AS title,
                   COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) AS price,
                   m.gia_ban AS original_price, m.gia_khuyen_mai AS sale_price,
                   m.mo_ta AS description, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                   COUNT(DISTINCT dg.id) AS so_danh_gia
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND m.ten_mon_an NOT LIKE 'Them %%'
              AND ({conditions})
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.gia_khuyen_mai,
                     m.mo_ta, m.hinh_anh, qa.id, qa.ten_quan_an,
                     qa.dia_chi, dm.ten_danh_muc
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
            SELECT m.id, m.ten_mon_an AS title,
                   COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) AS price,
                   m.gia_ban AS original_price, m.gia_khuyen_mai AS sale_price,
                   m.mo_ta AS description, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND dm.ten_danh_muc LIKE %s
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.gia_khuyen_mai,
                     m.mo_ta, m.hinh_anh, qa.id, qa.ten_quan_an,
                     qa.dia_chi, dm.ten_danh_muc
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
            SELECT m.id, m.ten_mon_an AS title,
                   m.gia_ban AS price, 0 AS sale_price,
                   m.mo_ta AS description, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                   CONCAT('🔥 Bán ', SUM(ct.so_luong), ' suất') AS category,
                   SUM(ct.so_luong) AS so_ban
            FROM mon_ans m
            JOIN chi_tiet_don_hangs ct ON m.id = ct.id_mon_an
            JOIN don_hangs dh ON ct.id_don_hang = dh.id
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE dh.tinh_trang IN (3,4)
              AND dh.created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.mo_ta, m.hinh_anh,
                     qa.id, qa.ten_quan_an, qa.dia_chi
            ORDER BY so_ban DESC LIMIT %s
        """, (days, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        if not rows:
            cur.execute("""
                SELECT m.id, m.ten_mon_an AS title,
                       m.gia_ban AS price, 0 AS sale_price,
                       m.mo_ta AS description, m.hinh_anh,
                       qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                       qa.dia_chi AS address,
                       ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                       CONCAT('🔥 Bán ', SUM(ct.so_luong), ' suất') AS category
                FROM mon_ans m
                JOIN chi_tiet_don_hangs ct ON m.id = ct.id_mon_an
                JOIN don_hangs dh ON ct.id_don_hang = dh.id
                JOIN quan_ans qa ON m.id_quan_an = qa.id
                LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
                WHERE dh.tinh_trang IN (3,4) AND m.ten_mon_an NOT LIKE 'Thêm %%'
                GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.mo_ta, m.hinh_anh,
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
            SELECT m.id, m.ten_mon_an AS title,
                   COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) AS price,
                   m.gia_ban AS original_price, m.gia_khuyen_mai AS sale_price,
                   m.mo_ta AS description, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
              AND COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) <= %s
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.gia_khuyen_mai,
                     m.mo_ta, m.hinh_anh, qa.id, qa.ten_quan_an,
                     qa.dia_chi, dm.ten_danh_muc
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
            SELECT m.id, m.ten_mon_an AS title,
                   COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) AS price,
                   m.gia_ban AS original_price, m.gia_khuyen_mai AS sale_price,
                   m.mo_ta AS description, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND (qa.dia_chi LIKE %s OR qa.ten_quan_an LIKE %s)
              AND (%s='%%' OR m.ten_mon_an LIKE %s OR dm.ten_danh_muc LIKE %s)
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.gia_khuyen_mai,
                     m.mo_ta, m.hinh_anh, qa.id, qa.ten_quan_an,
                     qa.dia_chi, dm.ten_danh_muc
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
            SELECT m.id, m.ten_mon_an AS title,
                   COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) AS price,
                   m.gia_ban AS original_price, m.gia_khuyen_mai AS sale_price,
                   m.mo_ta AS description, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1
              AND qa.ten_quan_an LIKE %s
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.gia_khuyen_mai,
                     m.mo_ta, m.hinh_anh, qa.id, qa.ten_quan_an,
                     qa.dia_chi, dm.ten_danh_muc
            ORDER BY dm.ten_danh_muc, m.ten_mon_an LIMIT %s
        """, (f"%{restaurant}%", limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_menu error: {e}")
        return []


# ═══════════════════════════════════════════════════════════
#  RESTAURANT QUERY — Restaurant cards with full info
# ═══════════════════════════════════════════════════════════

def q_restaurants(keyword: str, limit: int = 6) -> list:
    """Tìm quán ăn theo từ khóa, trả về thông tin đầy đủ cho restaurant card."""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        like_kw = f"%{keyword}%"
        cur.execute("""
            SELECT
                qa.id                          AS id,
                qa.ten_quan_an                 AS name,
                qa.hinh_anh                    AS image,
                qa.dia_chi                     AS address,
                qa.so_dien_thoai              AS phone,
                CAST(qa.gio_mo_cua AS CHAR)  AS open_time,
                CAST(qa.gio_dong_cua AS CHAR) AS close_time,
                ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                COUNT(DISTINCT dg.id)          AS so_danh_gia,
                COUNT(DISTINCT m.id)           AS so_mon,
                MIN(COALESCE(NULLIF(m.gia_khuyen_mai,0), m.gia_ban)) AS min_price,
                MAX(COALESCE(NULLIF(m.gia_khuyen_mai,0), m.gia_ban)) AS max_price
            FROM quan_ans qa
            LEFT JOIN mon_ans m ON m.id_quan_an = qa.id AND m.tinh_trang = 1
            LEFT JOIN danh_gias dg ON dg.id_quan_an = qa.id
            WHERE qa.tinh_trang = 1
              AND qa.is_active  = 1
              AND (qa.ten_quan_an LIKE %s OR m.ten_mon_an LIKE %s)
            GROUP BY qa.id, qa.ten_quan_an, qa.hinh_anh, qa.dia_chi,
                     qa.so_dien_thoai, qa.gio_mo_cua, qa.gio_dong_cua
            ORDER BY rating DESC, so_danh_gia DESC
            LIMIT %s
        """, (like_kw, like_kw, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]

        if not rows:
            cur.execute("""
                SELECT
                    qa.id                          AS id,
                    qa.ten_quan_an                 AS name,
                    qa.hinh_anh                    AS image,
                    qa.dia_chi                     AS address,
                    qa.so_dien_thoai              AS phone,
                    qa.gio_mo_cua                 AS open_time,
                    qa.gio_dong_cua               AS close_time,
                    ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                    COUNT(DISTINCT dg.id)          AS so_danh_gia,
                    COUNT(DISTINCT m.id)           AS so_mon,
                    MIN(COALESCE(NULLIF(m.gia_khuyen_mai,0), m.gia_ban)) AS min_price,
                    MAX(COALESCE(NULLIF(m.gia_khuyen_mai,0), m.gia_ban)) AS max_price
                FROM quan_ans qa
                LEFT JOIN mon_ans m ON m.id_quan_an = qa.id AND m.tinh_trang = 1
                LEFT JOIN danh_gias dg ON dg.id_quan_an = qa.id
                WHERE qa.tinh_trang = 1 AND qa.is_active = 1
                  AND qa.ten_quan_an LIKE %s
                GROUP BY qa.id
                ORDER BY rating DESC
                LIMIT %s
            """, (like_kw, limit))
            rows = [_to_serializable(r) for r in cur.fetchall()]

        conn.close()
        logger.info(f"q_restaurants('{keyword}') → {len(rows)} restaurants")
        return rows
    except Exception as e:
        logger.error(f"q_restaurants error: {e}")
        return []


def q_restaurant_menu(restaurant_id: int, limit: int = 12) -> list:
    """Lấy menu của một quán theo ID."""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id,
                   m.ten_mon_an                  AS title,
                   COALESCE(NULLIF(m.gia_khuyen_mai,0), m.gia_ban) AS price,
                   m.gia_ban                     AS original_price,
                   m.gia_khuyen_mai             AS sale_price,
                   m.mo_ta                       AS description,
                   m.hinh_anh,
                   qa.id                          AS id_quan_an,
                   qa.ten_quan_an                AS restaurant,
                   qa.dia_chi                    AS address,
                   dm.ten_danh_muc               AS category,
                   ROUND(AVG(dg.sao_quan_an),1) AS rating
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE m.tinh_trang = 1
              AND qa.tinh_trang = 1
              AND qa.is_active  = 1
              AND qa.id = %s
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.gia_khuyen_mai,
                     m.mo_ta, m.hinh_anh, qa.id, qa.ten_quan_an,
                     qa.dia_chi, dm.ten_danh_muc
            ORDER BY dm.ten_danh_muc, m.ten_mon_an
            LIMIT %s
        """, (restaurant_id, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        logger.info(f"q_restaurant_menu({restaurant_id}) → {len(rows)} items")
        return rows
    except Exception as e:
        logger.error(f"q_restaurant_menu error: {e}")
        return []


def q_restaurant_by_id(restaurant_id: int) -> dict:
    """Lấy thông tin quán theo ID."""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                qa.id                          AS id,
                qa.ten_quan_an                 AS name,
                qa.hinh_anh                    AS image,
                qa.dia_chi                     AS address,
                qa.so_dien_thoai               AS phone,
                CAST(qa.gio_mo_cua AS CHAR)    AS open_time,
                CAST(qa.gio_dong_cua AS CHAR)  AS close_time,
                ROUND(AVG(dg.sao_quan_an), 1)  AS rating,
                COUNT(DISTINCT dg.id)           AS so_danh_gia,
                COUNT(DISTINCT m.id)            AS so_mon,
                MIN(COALESCE(NULLIF(m.gia_khuyen_mai,0), m.gia_ban)) AS min_price,
                MAX(COALESCE(NULLIF(m.gia_khuyen_mai,0), m.gia_ban)) AS max_price
            FROM quan_ans qa
            LEFT JOIN mon_ans m ON m.id_quan_an = qa.id AND m.tinh_trang = 1
            LEFT JOIN danh_gias dg ON dg.id_quan_an = qa.id
            WHERE qa.id = %s AND qa.tinh_trang = 1 AND qa.is_active = 1
            GROUP BY qa.id, qa.ten_quan_an, qa.hinh_anh, qa.dia_chi,
                     qa.so_dien_thoai, qa.gio_mo_cua, qa.gio_dong_cua
        """, (restaurant_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            return _to_serializable(row)
        return {}
    except Exception as e:
        logger.error(f"q_restaurant_by_id({restaurant_id}) error: {e}")
        return {}


def q_random(limit: int = 6) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title,
                   COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) AS price,
                   m.gia_ban AS original_price, m.gia_khuyen_mai AS sale_price,
                   m.mo_ta AS description, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating
            FROM mon_ans m
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE m.tinh_trang=1 AND qa.tinh_trang=1 AND qa.is_active=1
              AND m.ten_mon_an NOT LIKE 'Thêm %%'
            GROUP BY m.id, m.ten_mon_an, m.gia_ban, m.gia_khuyen_mai,
                     m.mo_ta, m.hinh_anh, qa.id, qa.ten_quan_an,
                     qa.dia_chi, dm.ten_danh_muc
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
                   qa.dia_chi AS address, qa.so_dien_thoai AS hotline,
                   qa.gio_mo_cua, qa.gio_dong_cua,
                   ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                   COUNT(dg.id) AS so_danh_gia
            FROM quan_ans qa
            LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
            WHERE qa.tinh_trang=1 AND qa.is_active=1
              AND qa.ten_quan_an LIKE %s
            GROUP BY qa.id, qa.ten_quan_an, qa.dia_chi,
                     qa.so_dien_thoai, qa.gio_mo_cua, qa.gio_dong_cua
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
            SELECT m.id, m.ten_mon_an AS title,
                   COALESCE(NULLIF(m.gia_khuyen_mai, 0), m.gia_ban) AS price,
                   m.gia_ban AS original_price, m.gia_khuyen_mai AS sale_price,
                   m.mo_ta AS description, m.hinh_anh,
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


# ─── NEW: Chi tiết đánh giá món ăn ────────────────────

def q_danh_gia_mon_an(mon_an_id: int = None, ten_mon: str = '', limit: int = 5) -> dict:
    """Lấy đánh giá chi tiết của món ăn"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        if mon_an_id:
            cur.execute("""
                SELECT dg.id, dg.sao_quan_an, dg.nhan_xet_quan_an,
                       dg.sao_shipper, dg.nhan_xet_shipper,
                       dg.created_at,
                       kh.ho_va_ten AS nguoi_danh_gia
                FROM danh_gias dg
                JOIN khach_hangs kh ON dg.id_khach_hang = kh.id
                JOIN don_hangs dh ON dg.id_don_hang = dh.id
                JOIN chi_tiet_don_hangs ct ON dh.id = ct.id_don_hang
                WHERE ct.id_mon_an = %s
                ORDER BY dg.created_at DESC LIMIT %s
            """, (mon_an_id, limit))
        elif ten_mon:
            cur.execute("""
                SELECT dg.id, dg.sao_quan_an, dg.nhan_xet_quan_an,
                       dg.sao_shipper, dg.nhan_xet_shipper,
                       dg.created_at,
                       kh.ho_va_ten AS nguoi_danh_gia
                FROM danh_gias dg
                JOIN khach_hangs kh ON dg.id_khach_hang = kh.id
                JOIN don_hangs dh ON dg.id_don_hang = dh.id
                JOIN chi_tiet_don_hangs ct ON dh.id = ct.id_don_hang
                JOIN mon_ans m ON ct.id_mon_an = m.id
                WHERE m.ten_mon_an LIKE %s
                ORDER BY dg.created_at DESC LIMIT %s
            """, (f'%{ten_mon}%', limit))
        else:
            # Lấy đánh giá mới nhất
            cur.execute("""
                SELECT dg.id, dg.sao_quan_an, dg.nhan_xet_quan_an,
                       dg.created_at, kh.ho_va_ten AS nguoi_danh_gia,
                       m.ten_mon_an AS mon_an, qa.ten_quan_an AS quan_an
                FROM danh_gias dg
                JOIN khach_hangs kh ON dg.id_khach_hang = kh.id
                JOIN don_hangs dh ON dg.id_don_hang = dh.id
                JOIN quan_ans qa ON dg.id_quan_an = qa.id
                JOIN chi_tiet_don_hangs ct ON dh.id = ct.id_don_hang
                JOIN mon_ans m ON ct.id_mon_an = m.id
                ORDER BY dg.created_at DESC LIMIT %s
            """, (limit,))

        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return {'reviews': rows, 'total': len(rows)}
    except Exception as e:
        logger.error(f"q_danh_gia_mon_an error: {e}")
        return {'reviews': [], 'total': 0}


# ─── NEW: Topping của món ăn ───────────────────────────

def q_topping_mon_an(id_quan_an: int, loai_topping: str = '') -> list:
    """Lấy topping của quán (drink/food/all)"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        if loai_topping and loai_topping in ('drink', 'food', 'all'):
            cur.execute("""
                SELECT id, ten_topping AS title, gia AS price,
                       mo_ta, loai AS loai_topping
                FROM toppings
                WHERE id_quan_an = %s AND tinh_trang = 1
                  AND (loai = %s OR loai = 'all')
                ORDER BY loai, ten_topping
            """, (id_quan_an, loai_topping))
        else:
            cur.execute("""
                SELECT id, ten_topping AS title, gia AS price,
                       mo_ta, loai AS loai_topping
                FROM toppings
                WHERE id_quan_an = %s AND tinh_trang = 1
                ORDER BY loai, ten_topping
            """, (id_quan_an,))

        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_topping_mon_an error: {e}")
        return []


# ─── NEW: Thông tin quán ăn ─────────────────────────────

def q_thong_tin_quan_an(ten_quan: str = '') -> dict:
    """Lấy thông tin chi tiết quán ăn: giờ mở cửa, hotline, địa chỉ"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        if ten_quan:
            cur.execute("""
                SELECT qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                       qa.dia_chi AS address, qa.so_dien_thoai AS hotline,
                       qa.gio_mo_cua, qa.gio_dong_cua,
                       qa.tong_tien AS min_order,
                       1 AS hoat_dong,
                       ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                       COUNT(DISTINCT dg.id) AS so_danh_gia,
                       COUNT(DISTINCT m.id) AS so_mon
                FROM quan_ans qa
                LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
                LEFT JOIN mon_ans m ON qa.id = m.id_quan_an AND m.tinh_trang=1
                WHERE qa.ten_quan_an LIKE %s AND qa.tinh_trang=1 AND qa.is_active=1
                GROUP BY qa.id, qa.ten_quan_an, qa.dia_chi,
                         qa.so_dien_thoai, qa.gio_mo_cua, qa.gio_dong_cua,
                         qa.tong_tien
            """, (f'%{ten_quan}%',))
        else:
            # Top quán theo rating
            cur.execute("""
                SELECT qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                       qa.dia_chi AS address, qa.so_dien_thoai AS hotline,
                       qa.gio_mo_cua, qa.gio_dong_cua,
                       qa.tong_tien AS min_order,
                       1 AS hoat_dong,
                       ROUND(AVG(dg.sao_quan_an), 1) AS rating,
                       COUNT(DISTINCT dg.id) AS so_danh_gia,
                       COUNT(DISTINCT m.id) AS so_mon
                FROM quan_ans qa
                LEFT JOIN danh_gias dg ON qa.id = dg.id_quan_an
                LEFT JOIN mon_ans m ON qa.id = m.id_quan_an AND m.tinh_trang=1
                WHERE qa.tinh_trang=1 AND qa.is_active=1
                GROUP BY qa.id, qa.ten_quan_an, qa.dia_chi,
                         qa.so_dien_thoai, qa.gio_mo_cua, qa.gio_dong_cua,
                         qa.tong_tien
                ORDER BY rating DESC, so_danh_gia DESC LIMIT 10
            """)

        rows = [_to_serializable(r) for r in cur.fetchall()]

        # Check giờ mở cửa
        result = []
        now = datetime.now().time() if True else None
        for r in rows:
            mo = r.get('gio_mo_cua')
            dong = r.get('gio_dong_cua')
            if mo and dong:
                try:
                    mo_str  = str(mo)[:5]
                    dong_str = str(dong)[:5]
                    r['gio_hoat_dong'] = f"{mo_str} - {dong_str}"
                except Exception:
                    r['gio_hoat_dong'] = ''
            result.append(r)

        conn.close()
        return {'restaurants': result, 'total': len(result)}
    except Exception as e:
        logger.error(f"q_thong_tin_quan_an error: {e}")
        return {'restaurants': [], 'total': 0}


# ═══════════════════════════════════════════════════════════
#  PERSONALIZED QUERY FUNCTIONS
# ═══════════════════════════════════════════════════════════

def q_don_hang_cua_toi(khach_hang_id: int, limit: int = 5) -> list:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

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
                   dh.phuong_thuc_thanh_toan, dh.is_thanh_toan,
                   dh.created_at, qa.ten_quan_an AS ten_quan
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

        THANH_TOAN_MAP = {
            0: 'Tiền mặt',
            1: 'PayOS QR',
            2: 'Ví FoodBee',
        }

        if ma_don_hang:
            cur.execute("""
                SELECT dh.id, dh.ma_don_hang, dh.tong_tien, dh.tinh_trang,
                       dh.phuong_thuc_thanh_toan, dh.is_thanh_toan,
                       dh.created_at, qa.ten_quan_an AS ten_quan,
                       s.ho_va_ten AS ten_shipper, s.so_dien_thoai AS shipper_sdt,
                       dc.dia_chi AS dia_chi_giao
                FROM don_hangs dh
                LEFT JOIN quan_ans qa ON dh.id_quan_an = qa.id
                LEFT JOIN shippers s ON dh.id_shipper = s.id
                LEFT JOIN dia_chis dc ON dh.id_dia_chi_nhan = dc.id
                WHERE dh.id_khach_hang = %s AND dh.ma_don_hang = %s
                LIMIT 1
            """, (khach_hang_id, ma_don_hang))
        else:
            cur.execute("""
                SELECT dh.id, dh.ma_don_hang, dh.tong_tien, dh.tinh_trang,
                       dh.phuong_thuc_thanh_toan, dh.is_thanh_toan,
                       dh.created_at, qa.ten_quan_an AS ten_quan,
                       s.ho_va_ten AS ten_shipper, s.so_dien_thoai AS shipper_sdt,
                       dc.dia_chi AS dia_chi_giao
                FROM don_hangs dh
                LEFT JOIN quan_ans qa ON dh.id_quan_an = qa.id
                LEFT JOIN shippers s ON dh.id_shipper = s.id
                LEFT JOIN dia_chis dc ON dh.id_dia_chi_nhan = dc.id
                WHERE dh.id_khach_hang = %s
                ORDER BY dh.created_at DESC LIMIT 1
            """, (khach_hang_id,))

        row = cur.fetchone()
        conn.close()
        if not row:
            return {}

        result = _to_serializable(row)
        result['trang_thai_text'] = TINH_TRANG_MAP.get(row.get('tinh_trang', -1), f"Trạng thái {row.get('tinh_trang')}")
        result['thanh_toan_text'] = THANH_TOAN_MAP.get(row.get('phuong_thuc_thanh_toan', -1), '')
        logger.info(f"q_trang_thai_don(kh={khach_hang_id}, ma={ma_don_hang}) → {result.get('trang_thai_text')}")
        return result
    except Exception as e:
        logger.error(f"q_trang_thai_don error: {e}")
        return {}


def tao_don_hang_moi(
    khach_hang_id: int,
    ho_ten: str,
    sdt: str,
    dia_chi: str,
    id_quan_an: int,
    mon_an_list: list,
    phuong_thuc_thanh_toan: str = 'tien_mat'
) -> dict:
    """
    Tạo đơn hàng qua BE API.
    mon_an_list: [{id_mon_an, ten_mon, so_luong, gia}]
    phuong_thuc_thanh_toan: 'tien_mat' | 'online'
    """
    import urllib.request
    import urllib.error
    try:
        be_url = os.getenv('BE_API_URL', 'https://be.foodbee.io.vn')
        payload = {
            'id_khach_hang': khach_hang_id,
            'id_quan_an': id_quan_an,
            'ho_ten': ho_ten,
            'sdt': sdt,
            'dia_chi': dia_chi,
            'mon_an_list': [
                {
                    'id_mon_an': m['id_mon_an'],
                    'so_luong': int(m.get('so_luong', 1)),
                    'gia': float(m.get('gia', 0)),
                }
                for m in mon_an_list
            ],
            'phuong_thuc_thanh_toan': phuong_thuc_thanh_toan,
        }

        req_data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            f"{be_url}/api/chatbot/dat-hang",
            data=req_data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as http_err:
            body = http_err.read().decode('utf-8', errors='replace')
            try:
                data = json.loads(body)
            except Exception:
                data = {'status': False, 'message': f"BE trả lỗi {http_err.code}: {body[:200]}"}
            if not data.get('status'):
                return {'success': False, 'message': data.get('message', f'Lỗi BE: {http_err.code}')}

        if data.get('status'):
            result = {
                'success': True,
                'don_hang_id': data['don_hang_id'],
                'ma_don_hang': data['ma_don_hang'],
                'tien_hang': data['tien_hang'],
                'phi_ship': data['phi_ship'],
                'tong_tien': data['tong_tien'],
                'message': f"Đơn hàng #{data['ma_don_hang']} đã được tạo thành công!",
            }
            if data.get('checkout_url'):
                result['checkout_url'] = data['checkout_url']
            if data.get('qr_code'):
                result['qr_code'] = data['qr_code']
            logger.info(f"✅ Tạo đơn hàng qua BE API: {data['ma_don_hang']} | tổng={data['tong_tien']:,}đ")
            return result
        else:
            return {'success': False, 'message': data.get('message', 'Lỗi tạo đơn hàng')}

    except Exception as e:
        logger.error(f"❌ Lỗi tạo đơn hàng qua BE API: {e}", exc_info=True)
        return {'success': False, 'message': f"Lỗi hệ thống: {str(e)}"}


def q_kiem_tra_vi(khach_hang_id: int) -> dict:
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT diem_xu, ho_va_ten FROM khach_hangs WHERE id = %s LIMIT 1
        """, (khach_hang_id,))
        kh = cur.fetchone()

        cur.execute("""
            SELECT COUNT(*) AS tong_don, COALESCE(SUM(tong_tien), 0) AS tong_chi
            FROM don_hangs
            WHERE id_khach_hang = %s AND tinh_trang IN (3, 4)
        """, (khach_hang_id,))
        stats = cur.fetchone()

        # Lịch sử xu gần nhất
        cur.execute("""
            SELECT so_xu, loai_giao_dich, mo_ta, created_at
            FROM lich_su_xus
            WHERE id_khach_hang = %s
            ORDER BY created_at DESC LIMIT 5
        """, (khach_hang_id,))
        xu_history = [_to_serializable(r) for r in cur.fetchall()]
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
            'lich_su_xu': xu_history,
        }
        logger.info(f"q_kiem_tra_vi(kh={khach_hang_id}) → xu={diem_xu}, đơn={tong_don}")
        return result
    except Exception as e:
        logger.error(f"q_kiem_tra_vi error: {e}")
        return {}


def q_lich_su_mon_an(khach_hang_id: int, limit: int = 10) -> list:
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


# ─── NEW: Địa chỉ giao hàng ────────────────────────────

def q_dia_chi_giao_hang(khach_hang_id: int) -> list:
    """Lấy danh sách địa chỉ giao hàng của khách"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT dc.id, dc.dia_chi, dc.ten_nguoi_nhan, dc.so_dien_thoai,
                   dc.lat, dc.lng,
                   qh.ten_quan_huyen AS quan_huyen
            FROM dia_chis dc
            LEFT JOIN quan_huyens qh ON dc.id_quan_huyen = qh.id
            WHERE dc.id_khach_hang = %s
            ORDER BY dc.created_at DESC
        """, (khach_hang_id,))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        logger.info(f"q_dia_chi_giao_hang(kh={khach_hang_id}) → {len(rows)} địa chỉ")
        return rows
    except Exception as e:
        logger.error(f"q_dia_chi_giao_hang error: {e}")
        return []


# ─── NEW: Món yêu thích ────────────────────────────────

def q_mon_yeu_thich(khach_hang_id: int, limit: int = 10) -> list:
    """Lấy món ăn yêu thích của khách"""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT m.id, m.ten_mon_an AS title, m.gia_ban AS price,
                   m.gia_khuyen_mai AS sale_price, m.hinh_anh,
                   qa.id AS id_quan_an, qa.ten_quan_an AS restaurant,
                   qa.dia_chi AS address, dm.ten_danh_muc AS category,
                   yt.created_at AS ngay_yeu_thich
            FROM yeu_thiches yt
            JOIN mon_ans m ON yt.id_mon_an = m.id
            JOIN quan_ans qa ON m.id_quan_an = qa.id
            LEFT JOIN danh_mucs dm ON m.id_danh_muc = dm.id
            WHERE yt.id_khach_hang = %s AND m.tinh_trang = 1
            ORDER BY yt.created_at DESC
            LIMIT %s
        """, (khach_hang_id, limit))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        logger.info(f"q_mon_yeu_thich(kh={khach_hang_id}) → {len(rows)} món yêu thích")
        return rows
    except Exception as e:
        logger.error(f"q_mon_yeu_thich error: {e}")
        return []


# ═══════════════════════════════════════════════════════════
#  TOOL DEFINITIONS — Tất cả tools cho Bee
# ═══════════════════════════════════════════════════════════

TOOLS = [
    # ── Tìm kiếm QUÁN ĂN — Ưu tiên cao nhất ─────────────────
    {
        "type": "function",
        "function": {
            "name": "tim_quan_an",
            "description": (
                "Tìm QUÁN ĂN theo từ khóa (tên quán hoặc tên món). "
                "LUÔN gọi tool này ĐẦU TIÊN khi khách nói 'đặt X', 'tìm quán X', 'quán nào bán X', "
                "'X ngon ở đâu', 'muốn ăn X'. "
                "Tool trả về danh sách quán với: tên, địa chỉ, rating, số món, khoảng giá, giờ mở cửa."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "Từ khóa: tên quán hoặc tên món ăn"},
                    "limit":  {"type": "integer", "default": 6}
                },
                "required": ["keyword"]
            }
        }
    },
    # ── Tìm kiếm món ăn ─────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "tim_kiem_mon_an",
            "description": (
                "Tìm kiếm món ăn theo TỪ KHÓA CHÍNH XÁC từ câu hỏi của khách. "
                "QUAN TRỌNG: Chỉ truyền tên món ăn thuần túy, KHÔNG thêm mô tả. "
                "Ví dụ: khách hỏi 'tìm phở bò' → keyword='phở bò' (KHÔNG phải 'phở bò ngon ở đà nẵng'). "
                "Gọi khi: 'tìm X', 'có X không', 'X ngon không', 'tìm kiếm X'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "Từ khóa tên món ăn tiếng Việt"},
                    "limit":  {"type": "integer", "default": 6}
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
                "Tìm món theo danh mục: 'đồ ăn nhanh', 'món chay', 'đồ uống', 'tráng miệng', 'fast food'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "danh_muc": {"type": "string", "description": "Tên danh mục"},
                    "limit":   {"type": "integer", "default": 6}
                },
                "required": ["danh_muc"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lay_mon_ban_chay",
            "description": "Món bán chạy nhất. Gọi khi: 'món hot', 'bán chạy', 'trending', 'phổ biến nhất'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days":  {"type": "integer", "default": 30},
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
                "Tìm món theo ngân sách. Gọi khi: 'dưới 50k', 'món rẻ', 'ngân sách 30 nghìn'. "
                "Chuyển đổi: 50k=50000, 100k=100000, 2 triệu=2000000."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "gia_toi_da": {"type": "integer", "description": "Giá tối đa VND (số nguyên). VD: 50000, 100000, 200000. Đọc từ câu hỏi rồi chuyển đổi: '50k'=50000, '100 nghìn'=100000."},
                    "limit":      {"type": "integer", "default": 6}
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
                "Tìm món theo khu vực Đà Nẵng. Gọi khi: 'quán ở Hải Châu', 'gần đây', "
                "'Thanh Khê có gì', 'đường Nguyễn Văn Linh'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "dia_diem": {"type": "string", "description": "Khu vực/quận/đường"},
                    "mon_an":  {"type": "string", "default": "", "description": "Loại món kèm (tùy chọn)"}
                },
                "required": ["dia_diem"]
            }
        }
    },
    # ── Đặt hàng ──────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "dat_mon_an",
            "description": (
                "THÊM MÓN VÀO GIỎ HÀNG. Gọi KHI khách muốn đặt/đặt hàng/mua món. "
                "Tool này tự tìm món trong database theo tên."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ten_mon":  {"type": "string", "description": "Tên món ăn khách muốn đặt"},
                    "so_luong": {"type": "integer", "default": 1, "description": "Số lượng"}
                },
                "required": ["ten_mon"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "xac_nhan_dat_hang",
            "description": (
                "TẠO đơn hàng khi đã thu thập đủ thông tin. "
                "THÔNG TIN BẮT BUỘC: ho_ten, sdt, dia_chi, phuong_thuc_thanh_toan ('tien_mat' hoặc 'online'). "
                "Gọi KHI: khách đã chọn món, cung cấp đủ thông tin giao hàng, VÀ chọn hình thức thanh toán. "
                "Khách đã đăng nhập thì dùng khach_hang_id, khách chưa đăng nhập vẫn đặt được."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ho_ten":   {"type": "string", "description": "Họ tên người nhận"},
                    "sdt":      {"type": "string", "description": "Số điện thoại người nhận"},
                    "dia_chi":  {"type": "string", "description": "Địa chỉ giao hàng đầy đủ"},
                    "phuong_thuc_thanh_toan": {"type": "string", "enum": ["tien_mat", "online"], "description": "Phương thức thanh toán: tien_mat hoặc online"}
                },
                "required": ["ho_ten", "sdt", "dia_chi", "phuong_thuc_thanh_toan"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "xem_menu_quan",
            "description": (
                "Xem toàn bộ menu của quán. Gọi khi: 'quán X bán gì', 'menu Y', "
                "'xem quán [tên]', 'danh sách món [tên quán]'. "
                "Ưu tiên dùng id_quan_an nếu có (từ tim_quan_an trả về)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ten_quan":   {"type": "string",  "description": "Tên quán (dùng nếu không có id_quan_an)"},
                    "id_quan_an": {"type": "integer", "description": "ID quán (ưu tiên dùng)"},
                    "limit":      {"type": "integer", "default": 12}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "goi_y_ngau_nhien",
            "description": (
                "Gợi ý món ngẫu nhiên. Gọi khi: 'gợi ý đi', 'ăn gì cũng được', "
                "'không biết ăn gì', 'surprise me'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 6}
                }
            }
        }
    },
    # ── Voucher & Đánh giá ────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "xem_khuyen_mai",
            "description": (
                "Xem voucher đang có hiệu lực. Gọi khi: 'voucher', 'mã giảm giá', "
                "'coupon', 'khuyến mãi', 'ưu đãi'."
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
                "Xem đánh giá & rating quán. Gọi khi: 'quán nào ngon', 'đánh giá', "
                "'rating', 'review [tên quán]'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ten_quan": {"type": "string", "default": "", "description": "Tên quán (để trống = top quán)"},
                    "limit":   {"type": "integer", "default": 5}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "xem_thong_tin_quan",
            "description": (
                "Xem thông tin chi tiết quán: giờ mở cửa, hotline, địa chỉ, rating, số món. "
                "Gọi khi: 'giờ mở cửa quán X', 'hotline', 'thông tin quán [tên]', "
                "'quán này có bao nhiêu món', 'quán X ở đâu'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ten_quan": {"type": "string", "default": "", "description": "Tên quán (để trống = top quán)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "goi_y_combo",
            "description": "Gợi ý món kèm. Gọi khi: 'ăn kèm gì', 'uống gì với', 'combo'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mon_chinh": {"type": "string", "description": "Món chính"},
                    "limit":     {"type": "integer", "default": 4}
                },
                "required": ["mon_chinh"]
            }
        }
    },
    # ── Topping & Reviews ─────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "xem_topping_mon",
            "description": (
                "Xem topping có sẵn cho món ăn (đồ uống, đồ ăn kèm). "
                "Gọi khi: 'topping là gì', 'thêm gì vào', 'tùy chọn món này', "
                "'có những loại topping nào'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id_quan_an":    {"type": "integer", "description": "ID quán (lấy từ kết quả món ăn)"},
                    "loai_topping":  {"type": "string", "default": "", "description": "Loại: drink/food/all"}
                },
                "required": ["id_quan_an"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "xem_danh_gia_mon",
            "description": (
                "Xem đánh giá chi tiết món ăn từ khách đã từng đặt. "
                "Gọi khi: 'đánh giá món này', 'review [tên món]', "
                "'ai đã ăn món này chưa', 'món này có ngon không'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id_mon_an":  {"type": "integer", "description": "ID món ăn (lấy từ kết quả)"},
                    "ten_mon":    {"type": "string", "default": "", "description": "Tên món"},
                    "limit":      {"type": "integer", "default": 5}
                }
            }
        }
    },
    # ── Cá nhân hóa (cần đăng nhập) ─────────────────────
    {
        "type": "function",
        "function": {
            "name": "xem_don_hang_cua_toi",
            "description": (
                "Xem đơn hàng gần nhất của khách đã đăng nhập. "
                "Gọi khi: 'đơn hàng', 'tôi đã đặt gì', 'lịch sử mua'. "
                "CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP."
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
            "name": "tra_trang_thai_don",
            "description": (
                "Tra trạng thái đơn hàng cụ thể. "
                "Gọi khi: 'đơn đến chưa', 'shipper đâu', 'trạng thái đơn', "
                "'đơn #XYZ', 'đơn mới nhất'. "
                "CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ma_don_hang": {"type": "string", "default": "", "description": "Mã đơn hàng (để trống = mới nhất)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "kiem_tra_vi_tien",
            "description": (
                "Kiểm tra điểm XU và tổng chi tiêu. "
                "Gọi khi: 'ví của tôi', 'bao nhiêu xu', 'điểm thưởng', "
                "'tổng đã chi bao nhiêu'. "
                "CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP."
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
                "Gợi ý món theo sở thích từ lịch sử đặt hàng. "
                "Gọi khi: 'gợi ý cho tôi', 'đặt lại món cũ', 'món hay ăn', "
                "'món tôi thích', 'theo sở thích'. "
                "CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP."
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
            "name": "xem_dia_chi_giao",
            "description": (
                "Xem danh sách địa chỉ giao hàng của khách. "
                "Gọi khi: 'địa chỉ của tôi', 'giao đến đâu', 'thay đổi địa chỉ', "
                "'sửa địa chỉ giao hàng'. "
                "CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP."
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
            "name": "xem_mon_yeu_thich",
            "description": (
                "Xem danh sách món yêu thích. "
                "Gọi khi: 'món yêu thích', 'thích ăn gì', 'favorites', "
                "'món đã lưu'. "
                "CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 10}
                }
            }
        }
    },
]


# ═══════════════════════════════════════════════════════════
#  TOOL EXECUTOR
# ═══════════════════════════════════════════════════════════

def execute_tool(name: str, args: dict, khach_hang_id: int = None):
    """Thực thi tool, trả về (foods: list, summary: str)"""

    # ── Quán ăn ───────────────────────────────────────
    if name == "tim_quan_an":
        kw    = args.get("keyword", "")
        limit = args.get("limit", 6)
        rests = q_restaurants(kw, limit)
        if not rests:
            return [], f"Chưa tìm thấy quán nào liên quan đến '{kw}' trên FoodBee nha bạn!"
        rest_lines = "\n".join([
            f"  [{i+1}] {r.get('name','')} | 📍{r.get('address','')} | ⭐{r.get('rating','?')} | "
            f"🍽️{r.get('so_mon',0)} món | 💰{r.get('min_price',0):,.0f}-{r.get('max_price',0):,.0f}đ"
            for i, r in enumerate(rests)
        ])
        summary = f"Tìm thấy {len(rests)} quán cho '{kw}':\n{rest_lines}"
        return rests, summary

    elif name == "xem_menu_quan":
        ten_quan = args.get("ten_quan", "")
        limit    = args.get("limit", 12)
        # Try by name first
        foods = q_menu(ten_quan, limit)
        if not foods:
            return [], f"Không tìm thấy quán '{ten_quan}' trên FoodBee nha!"
        return foods, f"'{ten_quan}' có {len(foods)} món trong menu — món nào cũng hấp dẫn!"

    # ── Công khai ───────────────────────────────────────
    if name == "tim_kiem_mon_an":
        kw    = args.get("keyword", "")
        limit = args.get("limit", 6)
        foods = q_foods(kw, limit)
        if not foods:
            foods = q_random(limit)
            return foods, f"Không tìm thấy '{kw}', Bee gợi ý {len(foods)} món khác cho bạn nha!"
        return foods, f"Tìm thấy {len(foods)} món '{kw}' — đây là những gợi ý ngon nhất Bee tìm được!"

    elif name == "tim_theo_danh_muc":
        cat   = args.get("danh_muc", "")
        limit = args.get("limit", 6)
        foods = q_by_category(cat, limit)
        if not foods:
            foods = q_random(limit)
            return foods, f"Chưa có món nào trong danh mục '{cat}', Bee gợi ý món khác cho bạn!"
        return foods, f"Có {len(foods)} món trong danh mục '{cat}' — rất đa dạng nha bạn!"

    elif name == "lay_mon_ban_chay":
        foods = q_top_foods(args.get("days", 30), args.get("limit", 6))
        if not foods:
            foods = q_random(args.get("limit", 6))
            return foods, f"Chưa có dữ liệu bán chạy, đây là món phổ biến nha!"
        return foods, f"🔥 Top {len(foods)} món bán chạy nhất — mọi người đang mê món này!"

    elif name == "tim_mon_theo_gia":
        mp    = float(args.get("gia_toi_da", 50000))
        foods = q_by_price(mp, args.get("limit", 6))
        if not foods:
            return [], f"Không có món nào dưới {int(mp):,}đ trong hệ thống nha bạn!"
        food_list = [f"{f.get('title','?')} ({float(f.get('price',0)):,.0f}đ)" for f in foods]
        return foods, f"Tìm thấy {len(foods)} món dưới {int(mp):,}đ — giá rẻ vô kể! Danh sách: {', '.join(food_list)}"

    elif name == "tim_quan_theo_khu_vuc":
        loc   = args.get("dia_diem", "")
        mon   = args.get("mon_an", "")
        foods = q_by_location(loc, mon)
        if not foods:
            return [], f"Chưa có quán nào ở khu vực '{loc}' trên FoodBee nha!"
        return foods, f"Tìm thấy {len(foods)} kết quả gần '{loc}' — Bee chọn cho bạn rồi!"

    elif name == "xem_menu_quan":
        ten_quan = args.get("ten_quan", "")
        rest_id  = args.get("id_quan_an")
        limit    = args.get("limit", 12)
        if rest_id:
            foods = q_restaurant_menu(int(rest_id), limit)
        else:
            foods = q_menu(ten_quan, limit)
        if not foods:
            rest_name = ten_quan or (f"ID {rest_id}")
            return [], f"Không tìm thấy quán '{rest_name}' trên FoodBee nha!"
        return foods, f"'{foods[0].get('restaurant', ten_quan)}' có {len(foods)} món trong menu — món nào cũng hấp dẫn!"

    elif name == "goi_y_ngau_nhien":
        foods = q_random(args.get("limit", 6))
        return foods, f"Đây là {len(foods)} món Bee chọn ngẫu nhiên cho bạn — thử món mới đi!"

    # ── Đặt hàng ────────────────────────────────────────
    elif name == "dat_mon_an":
        ten_mon   = args.get("ten_mon", "")
        so_luong  = args.get("so_luong", 1)

        session = get_order_session(str(khach_hang_id or 'guest'))
        if khach_hang_id:
            session['khach_hang_id'] = khach_hang_id
        
        # Tìm theo tên
        foods = q_foods(ten_mon, 3)
        if foods:
            food = foods[0]
            session['mon_an_list'].append({
                'id_mon_an': food.get('id'),
                'ten_mon': food.get('title'),
                'so_luong': so_luong,
                'gia': float(food.get('price', 0))
            })
            session['id_quan_an'] = food.get('id_quan_an')
            session['trang_thai'] = 'collecting'
            logger.info(f"✅ Đã thêm món vào session: {food.get('title')}")
            return [], f"✅ Đã thêm '{food.get('title')}' ({float(food.get('price', 0)):,.0f}đ) vào đơn hàng. Bạn cần cung cấp thêm: họ tên, SĐT, địa chỉ giao hàng để Bee hoàn tất đơn nhé!"
        
        return [], f"Không tìm thấy món '{ten_mon}' trong hệ thống. Bạn thử tên khác nhé!"

    elif name == "xac_nhan_dat_hang":
        ho_ten = args.get("ho_ten", "")
        sdt = args.get("sdt", "")
        dia_chi = args.get("dia_chi", "")
        phuong_thuc = args.get("phuong_thuc_thanh_toan", "tien_mat")

        session_id = str(khach_hang_id or 'guest')
        session = get_order_session(session_id)

        if not ho_ten or not sdt or not dia_chi:
            return [], "❌ Vui lòng cung cấp đầy đủ: họ tên, SĐT, địa chỉ giao hàng!"

        if not session.get('mon_an_list'):
            return [], "❌ Bạn chưa chọn món ăn nào! Hãy chọn món trước khi đặt nhé!"

        if not session.get('id_quan_an'):
            first_mon = session['mon_an_list'][0]
            ten_mon = first_mon.get('ten_mon', '')
            if ten_mon:
                foods = q_foods(ten_mon, 1)
                if foods:
                    session['id_quan_an'] = foods[0].get('id_quan_an')
                    session['ten_quan_an'] = foods[0].get('restaurant')
                    first_mon['id_mon_an'] = foods[0].get('id')
                    first_mon['gia'] = float(foods[0].get('price', 0))

        if not session.get('id_quan_an'):
            return [], "❌ Không xác định được quán ăn! Vui lòng chọn món cụ thể hơn."

        result = tao_don_hang_moi(
            khach_hang_id=khach_hang_id or 1,
            ho_ten=ho_ten,
            sdt=sdt,
            dia_chi=dia_chi,
            id_quan_an=session['id_quan_an'],
            mon_an_list=session['mon_an_list'],
            phuong_thuc_thanh_toan=phuong_thuc
        )

        if result.get('success'):
            clear_order_session(session_id)
            msg = f"🎉 {result['message']}\n📍 Địa chỉ: {dia_chi}\n💰 Tiền hàng: {result.get('tien_hang',0):,}đ | Ship: {result.get('phi_ship',0):,}đ | Tổng: {result['tong_tien']:,}đ"

            if phuong_thuc == 'online' and result.get('checkout_url'):
                msg += f"\n\n💳 Thanh toán online — quét QR hoặc bấm nút bên dưới để thanh toán!"
                return [], msg + f"\n__PAYMENT__{json.dumps({'checkout_url': result['checkout_url'], 'qr_code': result.get('qr_code',''), 'tong_tien': result['tong_tien'], 'ma_don_hang': result['ma_don_hang']})}"
            else:
                msg += "\n💵 Thanh toán tiền mặt khi nhận hàng."
                return [], msg
        else:
            return [], f"❌ {result.get('message', 'Lỗi không xác định')}"

    elif name == "xem_khuyen_mai":
        vouchers = q_vouchers(args.get("limit", 5))
        if not vouchers:
            return [], "Hiện không có voucher nào đang khuyến mãi trên FoodBee. Bee sẽ cập nhật sớm nhất!"
        v_lines = []
        for v in vouchers:
            discount = (f"{v.get('so_giam_gia', 0):,.0f}đ"
                       if v.get('loai_giam') == 0
                       else f"{v.get('so_giam_gia', 0)}%")
            min_order = f" | Đơn tối thiểu: {v.get('don_hong_toi_thieu', 0):,.0f}đ" if v.get('don_hang_toi_thieu') else ""
            max_disc  = f" | Giảm tối đa: {v.get('so_tien_toi_da', 0):,.0f}đ" if v.get('so_tien_toi_da') else ""
            left = ""
            if v.get('so_luot_toi_da'):
                remain = (v.get('so_luot_toi_da') or 0) - (v.get('so_luot_da_dung') or 0)
                left = f" | Còn {remain} lượt"
            hsd = v.get('thoi_gian_ket_thuc', '')
            v_lines.append(f"🎟️ Mã: {v.get('ma_code')} — Giảm {discount}{min_order}{max_disc}{left} | HSD: {hsd}")
        return [], f"Tìm thấy {len(vouchers)} voucher Bee mới tìm được:\n" + "\n".join(v_lines)

    elif name == "xem_danh_gia_quan":
        restaurant = args.get("ten_quan", "")
        limit      = args.get("limit", 5)
        ratings    = q_restaurant_ratings(restaurant, limit)
        if not ratings:
            return q_random(4), f"Chưa có đánh giá nào cho '{restaurant}' trên FoodBee nha bạn!"
        r_lines  = []
        top_name = ""
        for r in ratings:
            stars_num = float(r.get('rating') or 0)
            star_str  = "⭐" * round(stars_num)
            count     = r.get('so_danh_gia', 0)
            r_lines.append(f"{star_str} {r.get('restaurant')}: {stars_num}/5 ({count} đánh giá) — {r.get('address', '')}")
            if not top_name:
                top_name = r.get('restaurant', '')
        summary = "Top quán được khách yêu thích nhất:\n" + "\n".join(r_lines)
        foods   = q_menu(top_name, 4) if top_name else []
        return foods, summary

    elif name == "xem_thong_tin_quan":
        ten_quan = (args or {}).get("ten_quan", "")
        info     = q_thong_tin_quan_an(ten_quan)
        if not info.get('restaurants'):
            return [], f"Không tìm thấy thông tin quán '{ten_quan}' nha bạn!"
        lines = []
        for r in info['restaurants'][:5]:
            rating    = r.get('rating', 0)
            stars_str = "⭐" * round(rating) if rating else "Chưa có đánh giá"
            hotline   = r.get('hotline', 'Không có')
            gio       = r.get('gio_hoat_dong', 'Đang cập nhật')
            min_order = f"{r.get('min_order', 0):,.0f}đ" if r.get('min_order') else 'Không có'
            lines.append(
                f"🏪 {r.get('restaurant')}\n"
                f"   📍 {r.get('address')}\n"
                f"   📞 Hotline: {hotline}\n"
                f"   🕐 Giờ mở: {gio}\n"
                f"   💰 Đơn tối thiểu: {min_order}\n"
                f"   {stars_str} {rating}/5 | {r.get('so_danh_gia', 0)} đánh giá | {r.get('so_mon', 0)} món"
            )
        return [], "Thông tin quán Bee tìm được:\n" + "\n".join(lines)

    elif name == "goi_y_combo":
        mon_chinh = args.get("mon_chinh", "cơm")
        limit     = args.get("limit", 4)
        foods     = q_combo(mon_chinh, limit)
        if not foods:
            foods = q_random(limit)
        return foods, f"Kết hợp {mon_chinh} với món này thì ngon hết sẩy!"

    elif name == "xem_topping_mon":
        id_quan_an   = args.get("id_quan_an")
        loai_tp      = args.get("loai_topping", '')
        toppings = q_topping_mon_an(id_quan_an, loai_tp)
        if not toppings:
            return [], f"Quán này chưa có topping nào trong hệ thống nha!"
        t_lines = [f"🍽️ Topping của quán ({len(toppings)} loại):"]
        for t in toppings:
            gia = t.get('price', 0)
            gia_str = f"{float(gia):,.0f}đ" if gia else "Miễn phí"
            mo_ta = t.get('mo_ta', '')
            t_lines.append(f"  • {t.get('title')} — {gia_str}" + (f": {mo_ta}" if mo_ta else ""))
        return [], "\n".join(t_lines)

    elif name == "xem_danh_gia_mon":
        id_mon  = args.get("id_mon_an")
        ten_mon = args.get("ten_mon", '')
        limit   = args.get("limit", 5)
        result  = q_danh_gia_mon_an(id_mon, ten_mon, limit)
        if not result.get('reviews'):
            return [], f"Chưa có đánh giá nào cho món này trên FoodBee nha bạn!"
        r_lines = [f"📝 {result['total']} đánh giá món này:"]
        for r in result['reviews'][:5]:
            stars = "⭐" * int(r.get('sao_quan_an', 0))
            nhan_xet = r.get('nhan_xet_quan_an', '')
            nguoi    = r.get('nguoi_danh_gia', 'Khách ẩn danh')
            ngay     = str(r.get('created_at', ''))[:10]
            r_lines.append(f"  {stars} {nguoi} ({ngay})" + (f": {nhan_xet[:80]}" if nhan_xet else ""))
        return [], "\n".join(r_lines)

    # ── Cá nhân hóa ─────────────────────────────────────
    elif name == "xem_don_hang_cua_toi":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập FoodBee để xem đơn hàng nhé! Đăng nhập ngay thôi! 🐝"
        limit  = args.get("limit", 5)
        orders = q_don_hang_cua_toi(khach_hang_id, limit)
        if not orders:
            return [], "Bạn chưa có đơn hàng nào trên FoodBee. Đặt món đầu tiên ngay thôi! 🍔"
        lines = [f"Bạn có {len(orders)} đơn hàng gần nhất:"]
        for o in orders:
            thanh_toan = "💳 PayOS" if o.get('is_thanh_toan') else "💵 Tiền mặt"
            lines.append(
                f"  📦 #{o.get('ma_don_hang', o.get('id'))} | "
                f"{o.get('ten_quan', 'N/A')} | "
                f"{o.get('tong_tien', 0):,.0f}đ ({thanh_toan}) | "
                f"{o.get('trang_thai_text', '')} | "
                f"{str(o.get('created_at', ''))[:10]}"
            )
        return [], "\n".join(lines)

    elif name == "tra_trang_thai_don":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập FoodBee để tra cứu đơn hàng nhé! 🐝"
        ma_don = args.get("ma_don_hang", "")
        order  = q_trang_thai_don(khach_hang_id, ma_don)
        if not order:
            return [], "Không tìm thấy đơn hàng nào. Bạn kiểm tra lại mã đơn trong app nhé!"
        summary = (
            f"🔍 Trạng thái đơn hàng #{order.get('ma_don_hang', order.get('id'))}:\n"
            f"• Quán: {order.get('ten_quan', 'N/A')}\n"
            f"• Giao đến: {order.get('dia_chi_giao', 'Đang cập nhật')}\n"
            f"• Tổng tiền: {order.get('tong_tien', 0):,.0f}đ\n"
            f"• Thanh toán: {order.get('thanh_toan_text', 'N/A')}\n"
            f"• Trạng thái: {order.get('trang_thai_text', '')}\n"
            f"• Shipper: {order.get('ten_shipper') or 'Chưa có'}\n"
            f"  ({order.get('shipper_sdt') or 'đang chờ'})\n"
            f"• Thời gian đặt: {str(order.get('created_at', ''))[:16]}"
        )
        return [], summary

    elif name == "kiem_tra_vi_tien":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập FoodBee để xem ví nhé! 🐝"
        vi = q_kiem_tra_vi(khach_hang_id)
        if not vi:
            return [], "Không lấy được thông tin tài khoản. Bạn thử đăng nhập lại trong app nhé!"
        summary = (
            f"💰 Ví FoodBee của bạn:\n"
            f"• Điểm XU: {vi.get('diem_xu_text', '0 XU')}\n"
            f"• Tổng đơn hoàn thành: {vi.get('tong_don_hoan_thanh', 0)} đơn\n"
            f"• Tổng chi tiêu: {vi.get('tong_chi_tieu_text', '0đ')}"
        )
        xu_hist = vi.get('lich_su_xu', [])
        if xu_hist:
            xu_lines = ["• Lịch sử XU gần đây:"]
            for x in xu_hist[:3]:
                loai = "🔴 -" if x.get('loai_giao_dich') == 0 else "🟢 +"
                xu_lines.append(f"  {loai} {x.get('so_xu', 0)} XU: {x.get('mo_ta', '')}")
            summary += "\n" + "\n".join(xu_lines)
        return [], summary

    elif name == "goi_y_theo_lich_su":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập FoodBee để Bee gợi ý món riêng cho bạn nhé! 🐝"
        limit = args.get("limit", 6)
        foods = q_lich_su_mon_an(khach_hang_id, limit)
        if not foods:
            foods = q_random(limit)
            return foods, "Bạn chưa có đơn hàng nào. Đây là món phổ biến trên FoodBee nha!"
        return foods, f"Dựa trên sở thích của bạn, Bee chọn {len(foods)} món yêu thích!"

    elif name == "xem_dia_chi_giao":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập FoodBee để xem địa chỉ giao hàng nhé! 🐝"
        addrs = q_dia_chi_giao_hang(khach_hang_id)
        if not addrs:
            return [], "Bạn chưa lưu địa chỉ giao hàng nào. Thêm địa chỉ trong app FoodBee nhé!"
        lines = [f"Bạn có {len(addrs)} địa chỉ giao hàng:"]
        for a in addrs:
            lines.append(f"  📍 {a.get('dia_chi', '')} | {a.get('ten_nguoi_nhan', '')} | {a.get('so_dien_thoai', '')}")
        return [], "\n".join(lines)

    elif name == "xem_mon_yeu_thich":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập FoodBee để xem món yêu thích nhé! 🐝"
        limit = args.get("limit", 10)
        foods = q_mon_yeu_thich(khach_hang_id, limit)
        if not foods:
            return [], "Bạn chưa có món yêu thích nào. Thả tym món bạn thích trong app nhé! ❤️"
        names = ", ".join([f.get('title', '') for f in foods[:5]])
        return foods, f"Bạn đã lưu {len(foods)} món yêu thích! Gần đây: {names}..."

    return [], "Tool không xác định"


# ═══════════════════════════════════════════════════════════
#  SYSTEM PROMPT — Bee thông minh v11.0
# ═══════════════════════════════════════════════════════════

def build_system_prompt(
    meal_ctx: str,
    is_logged_in: bool,
    khach_hang_name: str = '',
    session: dict = None
) -> str:
    session = session or {}
    cart = session.get('cart', [])
    rest_name = session.get('restaurant_name', '')
    rest_id = session.get('restaurant_id')
    state = session.get('trang_thai', STATE_SEARCHING_FOOD)
    customer_name = session.get('customer_name', '')
    phone = session.get('phone', '')
    address = session.get('address', '')
    menu_items = session.get('menu_items', [])

    login_note = (
        f"Khách ĐÃ ĐĂNG NHẬP (tên: {khach_hang_name}). Gọi họ bằng tên. "
        "Có thể tra cứu đơn hàng, ví tiền, địa chỉ đã lưu."
    ) if is_logged_in and khach_hang_name else (
        "Khách CHƯA ĐĂNG NHẬP. Tư vấn chung, gợi ý đăng nhập để nhận ưu đãi riêng. "
        "Vẫn có thể đặt hàng với tư cách khách vãng lai."
    )

    # ── Session state description ──────────────────────────────
    if state == STATE_COMPLETED:
        state_note = (
            "Đơn hàng ĐÃ HOÀN THÀNH / ĐÃ TẠO. "
            "Khách có thể hỏi về đơn hàng, tìm món mới, hoặc đặt đơn mới."
        )
    elif state == STATE_SELECTING_PAYMENT:
        cart_lines = "\n".join([
            f"  - {c.get('title','')} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
            for c in cart
        ]) if cart else "(giỏ trống)"
        total = sum(c.get('price', 0) * c.get('so_luong', 1) for c in cart)
        phi_ship = 15000
        tong = total + phi_ship
        state_note = (
            f"⚠️ ĐANG Ở BƯỚC CHỌN THANH TOÁN.\n"
            f"  Giỏ hàng:\n{cart_lines}\n"
            f"  Quán: {rest_name or '(chưa chọn quán)'}\n"
            f"  Tiền hàng: {total:,.0f}đ\n"
            f"  Phí ship: {phi_ship:,.0f}đ\n"
            f"  TỔNG: {tong:,.0f}đ\n"
            f"  Giao đến: {address or '(chưa có địa chỉ)'}\n"
            f"  Người nhận: {customer_name or '(chưa có)'}, {phone or ''}\n"
            f"Khách đã xác nhận đơn → chỉ cần hỏi chọn 1️⃣ Tiền mặt hoặc 2️⃣ PayOS QR."
        )
    elif state == STATE_CONFIRMING_ORDER:
        cart_lines = "\n".join([
            f"  - {c.get('title','')} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
            for c in cart
        ]) if cart else "(giỏ trống)"
        total = sum(c.get('price', 0) * c.get('so_luong', 1) for c in cart)
        phi_ship = 15000
        tong = total + phi_ship
        state_note = (
            f"⚠️ ĐANG Ở BƯỚC XÁC NHẬN ĐƠN HÀNG.\n"
            f"  Giỏ hàng:\n{cart_lines}\n"
            f"  Quán: {rest_name or '(chưa chọn quán)'}\n"
            f"  Tiền hàng: {total:,.0f}đ\n"
            f"  Phí ship: {phi_ship:,.0f}đ\n"
            f"  TỔNG CỘNG: {tong:,.0f}đ\n"
            f"  Giao đến: {address or '(chưa có địa chỉ)'}\n"
            f"  Người nhận: {customer_name or '(chưa có)'}, {phone or ''}\n"
            f"→ Khi khách xác nhận đồng ý → trả lời báo cho khách gõ 'xác nhận' để chuyển sang chọn thanh toán.\n"
            f"→ Nếu khách muốn sửa → hỏi họ sửa gì rồi cập nhật session."
        )
    elif state == STATE_ENTERING_DELIVERY:
        cart_lines = "\n".join([
            f"  - {c.get('title','')} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
            for c in cart
        ]) if cart else "(giỏ trống)"
        missing = []
        if not customer_name: missing.append("họ tên")
        if not phone: missing.append("SĐT")
        if not address: missing.append("địa chỉ")
        state_note = (
            f"⚠️ ĐANG Ở BƯỚC THU THẬP THÔNG TIN GIAO HÀNG.\n"
            f"  Giỏ hàng:\n{cart_lines}\n"
            f"  Quán: {rest_name or '(chưa chọn quán)'}\n"
            f"  Người nhận: {customer_name or '(chưa có)'}\n"
            f"  SĐT: {phone or '(chưa có)'}\n"
            f"  Địa chỉ: {address or '(chưa có)'}\n"
            f"Còn thiếu: {', '.join(missing) if missing else 'đã đủ'}\n"
            f"Nếu khách cung cấp thông tin → gọi xac_nhan_dat_hang. "
            f"Nếu khách hỏi khác → trả lời tự nhiên."
        )
    elif state == STATE_VIEWING_MENU and menu_items:
        top3 = menu_items[:3]
        menu_note = "Menu quán " + (rest_name or '') + ":\n" + "\n".join([
            f"  {i+1}. {m.get('title','')} — {float(m.get('price',0)):,.0f}đ"
            for i, m in enumerate(top3)
        ])
        state_note = (
            f"⚠️ ĐANG XEM MENU quán {rest_name or ''}.\n"
            f"{menu_note}\n"
            f"(và {len(menu_items)-3} món khác)\n"
            f"Nếu khách chọn món → gọi dat_mon_an. "
            f"Nếu khách muốn đổi quán → gợi ý tìm quán mới."
        )
    elif rest_name and cart:
        cart_lines = "\n".join([
            f"  - {c.get('title','')} x{c.get('so_luong',1)}"
            for c in cart
        ])
        state_note = (
            f"⚠️ ĐANG ĐẶT HÀNG tại quán {rest_name}.\n"
            f"  Giỏ hàng:\n{cart_lines}\n"
            f"Nếu khách muốn thêm món → gọi dat_mon_an. "
            f"Nếu khách muốn đổi quán → gợi ý xóa giỏ và tìm quán mới."
        )
    else:
        state_note = (
            "Khách đang tìm kiếm / chưa có giỏ hàng. "
            "Tư vấn bình thường."
        )

    return f"""Bạn là Bee 🐝 — Nhân viên tư vấn FoodBee app đặt đồ ăn tại Đà Nẵng.

## THÔNG TIN HỆ THỐNG
- Phí giao: 15,000đ (nội thành)
- Thanh toán: Tiền mặt khi nhận HOẶC PayOS QR (chuyển khoản online)
- Khu vực: Hải Châu, Thanh Khê, Sơn Trà, Liên Chiểu, Cẩm Lệ, Ngũ Hành Sơn
- Mỗi đơn đặt từ 1 quán duy nhất (không trộn món 2 quán)

## CÁCH TRẢ LỜI
1. KHI CÓ KẾT QUẢ TOOL: ĐỌC KỸ từng món rồi TRẢ LỜI TỰ NHIÊN
   - Nói giá, địa chỉ quán THẬT TỪ TOOL
   - NÓI NHƯ CON NGƯỜI: "Ơi, món này ngon lắm á", "Quán này gần bạn đó"
   - KHÔNG nói "Dưới đây là gợi ý" hay "Bee tìm được"
2. KHÔNG HALLUCINATE: Chỉ dùng dữ liệu từ tool
3. TRẢ VỀ FOODS ARRAY để hiển thị hình ảnh
4. KHÔNG kết thúc bằng câu hỏi máy móc. Có thể im lặng hoặc "Bạn thấy món nào hợp ý thì nhắn Bee nhé!"

## QUY TRÌNH ĐẶT HÀNG — TỪNG BƯỚC
Khi khách muốn đặt, làm theo đúng thứ tự:

BƯỚC 1: Khi khách nói "đặt X" → Tìm món X (gọi tool tim_kiem_mon_an)
→ Xem kết quả, giới thiệu ngắn gọn các món phù hợp
→ **QUAN TRỌNG: HỎI KHÁCH CHỌN MÓN CỤ THỂ**
→ "Bạn ơi, có {{N}} món '{{keyword}}', bạn muốn đặt món nào?"
→ ĐỢI khách trả lời rồi mới làm tiếp

BƯỚC 2: Khi khách chọn món cụ thể (ví dụ "món 1", "món đầu tiên", "Bún Bò Huế Đặc Biệt")
→ Gọi dat_mon_an với tên món cụ thể đó
→ HỎI khách có muốn thêm món gì nữa không

BƯỚC 3: Khi khách xác nhận đủ món, hỏi thông tin giao hàng:
"Cho Bee xin thông tin giao hàng nhé:
- Họ tên người nhận: ...?
- SĐT: ...?
- Địa chỉ giao: ...?"

BƯỚC 4: Khi có đủ (họ tên + SĐT + địa chỉ + ít nhất 1 món):
→ HỎI khách chọn THANH TOÁN:
"Chọn hình thức thanh toán:
1️⃣ Tiền mặt — trả khi nhận hàng
2️⃣ PayOS QR — chuyển khoản online ngay, nhanh hơn"

BƯỚC 5: Khi khách chọn thanh toán → GỌI xac_nhan_dat_hang ngay
→ Nếu online: trả kèm __PAYMENT__ JSON
→ Nếu tiền mặt: thông báo đơn đã tạo

## MẸO TƯ VẤN THÔNG MINH
- Nếu khách hỏi chung ("đói", "không biết ăn gì") → gọi goi_y_ngau_nhien
- Nếu khách hỏi voucher → gọi xem_khuyen_mai
- Nếu khách hỏi quán ngon → gọi xem_danh_gia_quan
- Nếu khách cần đồ uống kèm → gọi goi_y_combo
- Luôn gợi ý 1 món ăn kèm hoặc đồ uống nếu phù hợp
- Nếu khách hỏi về đơn hàng cũ → có thể trả lời dựa trên context đã biết

## TRẠNG THÁI HIỆN TẠI (RẤT QUAN TRỌNG — TUÂN THỦ)
{state_note}

## NGỮ CẢNH
{meal_ctx}

## TÀI KHOẢN
{login_note}

Trả lời tiếng Việt tự nhiên, thân thiện như người bán hàng thật sự. 🐝"""


# ═══════════════════════════════════════════════════════════
#  MEAL CONTEXT
# ═══════════════════════════════════════════════════════════

def get_meal_context() -> str:
    vn_time = datetime.now(timezone(timedelta(hours=7)))
    hour = vn_time.hour
    if 5 <= hour < 10:
        return "🌅 Bữa sáng (5-10h): bánh mì, phở, xôi, cháo, bún bò, cà phê. Bee chào buổi sáng thật nồng ấm!"
    elif 10 <= hour < 14:
        return "🌞 Bữa trưa (10-14h): cơm, bún bò, cơm tấm, mì quảng. Trưa rồi, bạn đói bụng chưa?"
    elif 14 <= hour < 18:
        return "☀️ Buổi chiều (14-18h): trà sữa, cà phê, đồ ăn vặt, nước ép, sinh tố. Chiều mát mẻ, nhâm nhi ly gì ngon nhỉ?"
    elif 18 <= hour < 22:
        return "🌙 Bữa tối (18-22h): lẩu, nướng, gà rán, pizza, hải sản. Tối rồi, thưởng thức món ngon thôi!"
    else:
        return "🌃 Đêm khuya (22h+): cháo, mì, bánh mì, đồ ăn nhẹ. Đêm muộn rồi, Bee gợi món nhẹ nhàng thôi!"


# ═══════════════════════════════════════════════════════════
#  AGENT LOOP — Multi-step tool calling
# ═══════════════════════════════════════════════════════════

def _call_groq_with_retry(messages, max_retries=3, base_delay=2):
    """Gọi Groq API với retry + exponential backoff khi gặp rate limit"""
    for attempt in range(max_retries):
        try:
            resp = ai_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=1000,
                temperature=0.5,
                timeout=60,
            )
            return resp, None
        except RateLimitError as e:
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.warning(f"⚠️ Rate limit — retry {attempt+1}/{max_retries} sau {delay}s")
                time.sleep(delay)
            else:
                return None, "rate_limit"
        except Exception as e:
            return None, str(e)
    return None, "max_retries_exceeded"


def _call_groq_force_tool(messages, max_retries=3, base_delay=2):
    """BẮT BUỘC gọi tool - không cho phép tự trả lời"""
    for attempt in range(max_retries):
        try:
            resp = ai_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="required",  # BẮT BUỘC gọi tool
                max_tokens=1500,
                temperature=0.3,
                timeout=60,
            )
            return resp, None
        except RateLimitError as e:
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.warning(f"⚠️ Rate limit force — retry {attempt+1}/{max_retries} sau {delay}s")
                time.sleep(delay)
            else:
                return None, "rate_limit"
        except Exception as e:
            logger.warning(f"⚠️ Force tool error: {e}")
            return None, str(e)
    return None, "max_retries_exceeded"


def run_agent(query: str, history: list, user_context: dict, sess: dict = None, last_foods: list = None):
    if not ai_client:
        return "Bee đang nghỉ ngơi, bạn thử hỏi lại nhé! 🐝", [], []

    is_logged_in    = user_context.get('is_logged_in', False)
    khach_hang_id   = user_context.get('khach_hang_id')
    khach_hang_name = user_context.get('khach_hang_name', '')

    session_context = sess or {}

    system_prompt = build_system_prompt(
        meal_ctx=get_meal_context(),
        is_logged_in=is_logged_in,
        khach_hang_name=khach_hang_name,
        session=session_context,
    )
    messages = [{"role": "system", "content": system_prompt}]

    if history:
        for h in history[-10:]:  # Increased from -3 to -10 for better context
            role    = h.get("role", "")
            content = h.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": str(content)})

    messages.append({"role": "user", "content": query})

    all_foods       = []
    all_restaurants = []
    step_count      = 0

    # ── Keyword lists ──────────────────────────────────
    food_intent_keywords = [
        'tìm', 'tôi muốn', 'món', 'ăn', 'uống', 'bún', 'phở', 'cơm', 'mì',
        'bánh', 'cháo', 'xôi', 'gà', 'lẩu', 'nướng', 'hải sản', 'pizza',
        'burger', 'trà sữa', 'cà phê', 'sinh tố', 'nước', 'kem', 'chè',
        'sữa chua', 'đồ lạnh', 'gợi ý', 'có', 'không', 'ngon', 'gì', 'hôm nay',
        'nóng', 'mát', 'lạnh', 'mát mẻ'
    ]
    location_intent_keywords = ['quán', 'khu vực', 'ở đâu', 'gần đây', 'gần tôi', 'địa điểm']
    danh_sach_quan = ['hải châu', 'thanh khê', 'sơn trà', 'liên chiểu', 'cẩm lệ', 'ngũ hành sơn']
    order_intent_keywords = ['đặt', 'order', 'mua', 'giao hàng', 'ship', 'chuyển khoản', 'thanh toán']

    query_lower = query.lower()
    has_food_intent = any(kw in query_lower for kw in food_intent_keywords)
    logger.info(f"DEBUG: query={query_lower!r} has_food_intent={has_food_intent}")

    # ═══════════════════════════════════════════════════════════════
    #  AUTO-SEARCH: Tìm QUÁN trước khi tìm món
    # ═══════════════════════════════════════════════════════════════
    if has_food_intent:
        import unicodedata
        query_nfd = unicodedata.normalize('NFD', query_lower)

        # Trích xuất keyword chính từ query
        food_keywords_list = [
            'bún', 'phở', 'cơm', 'mì', 'bánh', 'cháo', 'gà', 'lẩu',
            'nướng', 'pizza', 'burger', 'trà sữa', 'cà phê', 'cf', 'cafe', 'kem', 'chè',
            'thịt', 'cá', 'hải sản', 'ốc', 'bạch tuộc',
            'xôi', 'bún bò', 'bún thịt', 'cơm tấm', 'mì quảng', 'bánh mì',
            'sinh tố', 'nước', 'trà'
        ]
        search_keyword = None
        sorted_kws = sorted(food_keywords_list, key=len, reverse=True)
        for kw in sorted_kws:
            kw_nfd = unicodedata.normalize('NFD', kw)
            if kw in query_lower or kw_nfd in query_nfd:
                search_keyword = kw
                break
        if not search_keyword:
            stopwords = {'tôi', 'muốn', 'đi', 'cho', 'mình', 'với', 'và', 'có', 'ở'}
            for word in query_lower.split():
                if len(word) >= 3 and word not in stopwords:
                    search_keyword = word
                    break
        if not search_keyword:
            search_keyword = query.strip()

        logger.info(f"DEBUG: search_keyword={search_keyword!r}")

        # BƯỚC 1: Tìm quán trước (ưu tiên cao nhất)
        logger.info(f"🔍 Auto-search restaurant for: '{search_keyword}'")
        try:
            rests, rest_summary = execute_tool('tim_quan_an', {
                'keyword': search_keyword,
                'limit': 6
            }, khach_hang_id)
            if rests:
                all_restaurants.extend(rests)
                logger.info(f"✅ Auto-search: {len(rests)} quán cho '{search_keyword}'")
        except Exception as e:
            logger.warning(f"⚠️ Auto-search restaurant thất bại: {e}")

        # BƯỚC 2: Nếu có intent đặt hàng → tìm thêm món ăn
        should_order = any(kw in query_lower for kw in order_intent_keywords)
        if should_order and search_keyword:
            logger.info(f"🔍 Auto-search: intent đặt hàng → tìm thêm món '{search_keyword}'")
            try:
                foods, food_summary = execute_tool('tim_kiem_mon_an', {
                    'keyword': search_keyword,
                    'limit': 6
                }, khach_hang_id)
                if foods:
                    all_foods.extend(foods)
                    logger.info(f"✅ Auto-search: {len(foods)} món '{search_keyword}'")
            except Exception as e:
                logger.warning(f"⚠️ Auto-search food thất bại: {e}")

    # Check intent: tìm quán theo khu vực
    should_search_by_location = any(kw in query_lower for kw in location_intent_keywords)
    location_found = any(q in query_lower for q in danh_sach_quan)

    if should_search_by_location and location_found:
        logger.info("🔍 Auto-search: Phát hiện intent tìm quán theo khu vực")
        for q in danh_sach_quan:
            if q in query_lower:
                location = q.title()
                logger.info(f"🔍 Auto-search với location: '{location}'")
                try:
                    rests, _ = execute_tool('tim_quan_an', {
                        'keyword': location,
                        'limit': 6
                    }, khach_hang_id)
                    if rests:
                        all_restaurants.extend(rests)
                        logger.info(f"✅ Auto-search khu vực thành công: {len(rests)} quán")
                except Exception as e:
                    logger.warning(f"⚠️ Auto-search khu vực thất bại: {e}")
                break

    # ── RESTAURANT CARDS: Nếu có quán → trả restaurant cards trước ──
    logger.info(f"DEBUG: all_restaurants={len(all_restaurants)} items")
    seen_r, uniq_rests = [], []
    for r in all_restaurants:
        rid = r.get("id")
        if rid not in seen_r:
            seen_r.append(rid)
            uniq_rests.append(r)

    if uniq_rests:
        top_rests = uniq_rests[:6]
        intro = f"Ơi, Bee tìm được {len(uniq_rests)} quán ngon cho bạn nè! 🏪\n\n"
        for i, r in enumerate(top_rests):
            intro += f"{i+1}. **{r.get('name','')}**\n"
            intro += f"   📍 {r.get('address','')} | ⭐ {r.get('rating','?')} | 🍽️ {r.get('so_mon',0)} món\n"
        intro += f"\nBạn nhắn **số thứ tự** (1, 2...) hoặc **tên quán** để Bee xem menu nhé!"
        logger.info(f"✅ Returning {len(uniq_rests)} restaurant cards (auto-search)")
        return intro, [], uniq_rests[:6]

    # ── FOOD CARDS: Nếu có món ăn → trả food cards ──
    seen_f, uniq_foods = [], []
    for f in all_foods:
        fid = f.get("id")
        if fid not in seen_f:
            seen_f.append(fid)
            uniq_foods.append(f)

    should_order = any(kw in query_lower for kw in ['đặt', 'order', 'mua', 'tìm', 'tôi muốn'])

    if uniq_foods:
        top3 = uniq_foods[:3]
        if len(top3) >= 1:
            f1 = top3[0]
            intro = f"Ơi, có {len(uniq_foods)} món '{search_keyword}' ngon tại quán nè!"
            intro += f" {f1.get('title','')} {float(f1.get('price',0)):,.0f}đ quán {f1.get('restaurant','')} ngon lắm á!"
        else:
            intro = f"Ồ! Bee tìm được {len(uniq_foods)} món cho bạn nè!"
        if len(top3) >= 2:
            f2 = top3[1]
            intro += f" {f2.get('title','')} {float(f2.get('price',0)):,.0f}đ cũng hấp dẫn!"
        if should_order:
            intro += " Bạn ơi, bạn muốn đặt món nào trong danh sách trên vậy?"
        logger.info(f"✅ Returning {len(uniq_foods)} food cards (auto-search)")
        return intro, uniq_foods[:8], []

    # ═══════════════════════════════════════════════════════════
    #  AGENT LOOP - Gọi AI để xử lý
    # ═══════════════════════════════════════════════════════════
    msg = None
    tool_call_results = []

    # Inject context
    ctx_foods = all_foods or (last_foods or [])
    if ctx_foods:
        seen_f, uniq_f = [], []
        for f in ctx_foods:
            fid = f.get("id")
            if fid not in seen_f:
                seen_f.append(fid)
                uniq_f.append(f)
        food_lines = "\n".join([
            f"- [{i+1}] {f.get('title','')} | {f.get('price','')}đ | quán {f.get('restaurant','')}"
            for i, f in enumerate(uniq_f[:8])
        ])
        messages.append({
            "role": "tool",
            "tool_call_id": "menu_context",
            "content": (
                "📋 MENU ĐANG HIỂN THỊ (khách đang xem danh sách này):\n"
                f"{food_lines}\n\nKhi khách nói 'món 1', 'số 2', 'món đầu' → gọi dat_mon_an với tên tương ứng."
            )
        })

        while step_count < MAX_AGENT_STEPS:
            step_count += 1
            logger.info(f"🤖 Bee step {step_count}/{MAX_AGENT_STEPS}")

            resp, err = _call_groq_with_retry(messages, max_retries=2, base_delay=1)
            if err:
                logger.error(f"❌ Groq error: {err}")
                break

            msg = resp.choices[0].message
            logger.info(f"📨 AI response: {str(msg)[:200]}")

            if not getattr(msg, 'tool_calls', None):
                logger.info(f"✅ Bee hoàn thành sau {step_count} bước")
                final_text = (msg.content or "").strip()
                final_text = re.sub(r'<thought>.*?</thought>', '', final_text, flags=re.DOTALL).strip()
                final_text = final_text.replace('**', '').replace('* ', '• ')

                # Check if we collected restaurant cards in this loop
                seen_r, uniq_r = [], []
                for r in all_restaurants:
                    rid = r.get("id")
                    if rid not in seen_r:
                        seen_r.append(rid)
                        uniq_r.append(r)
                if uniq_r:
                    return final_text, [], uniq_r[:6]

                seen_f2, uniq_f2 = [], []
                for f in all_foods:
                    fid = f.get("id")
                    if fid not in seen_f2:
                        seen_f2.append(fid)
                        uniq_f2.append(f)
                return final_text, uniq_f2[:8], []

            messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function",
                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ]
            })

            for tc in msg.tool_calls:
                fn_name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments)
                except Exception:
                    args = {}

                logger.info(f"🔧 Tool: {fn_name} | args: {args}")
                tool_foods, summary = execute_tool(fn_name, args, khach_hang_id)

                # Route: tim_quan_an → restaurants, others → foods
                if fn_name == "tim_quan_an":
                    all_restaurants.extend(tool_foods)
                else:
                    all_foods.extend(tool_foods)

                if fn_name == 'xac_nhan_dat_hang' and '__PAYMENT__' in summary:
                    logger.info(f"✅ Đơn hàng online thành công → trả trực tiếp")
                    return summary, [], []
                if fn_name == 'xac_nhan_dat_hang' and '🎉' in summary:
                    logger.info(f"✅ Đơn hàng tiền mặt thành công → trả trực tiếp")
                    return summary, [], []

                if tool_foods:
                    food_names = ", ".join([
                        f"{f.get('title','')} ({float(f.get('price',0)):,.0f}đ)"
                        for f in tool_foods
                    ])
                    summary += f"\n(LƯU Ý: UI đang hiển thị: {food_names}.)"

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": summary,
                })
                tool_call_results.append((fn_name, summary))
                logger.info(f"📊 Tool result: {summary[:120]}")

        # Hết MAX_AGENT_STEPS → tổng hợp
        logger.warning(f"⚠️ Bee vượt {MAX_AGENT_STEPS} bước, tổng hợp kết quả")
        final_resp, final_err = _call_groq_with_retry(messages, max_retries=2, base_delay=1)
        if final_err or not final_resp:
            final_text = "🍴 Bee đang gặp chút vấn đề, bạn thử hỏi lại được không ạ? 🐝"
        else:
            final_text = (final_resp.choices[0].message.content or "").strip()
            final_text = re.sub(r'<thought>.*?</thought>', '', final_text, flags=re.DOTALL).strip()
            final_text = final_text.replace('**', '').replace('* ', '• ')

        # Check restaurants first
        seen_r, uniq_r = [], []
        for r in all_restaurants:
            rid = r.get("id")
            if rid not in seen_r:
                seen_r.append(rid)
                uniq_r.append(r)
        if uniq_r:
            return final_text, [], uniq_r[:6]

        seen_f3, uniq_f3 = [], []
        for f in all_foods:
            fid = f.get("id")
            if fid not in seen_f3:
                seen_f3.append(fid)
                uniq_f3.append(f)

        return final_text, uniq_f3[:8], []



# ═══════════════════════════════════════════════════════════
#  FALLBACK
# ═══════════════════════════════════════════════════════════

FALLBACK_RULES = [
    (['giao hàng', 'mất bao lâu', 'bao giờ đến'],
     "🛵 FoodBee giao 30-45 phút tại Đà Nẵng nha bạn!"),
    (['phí ship', 'tiền ship', 'ship bao nhiêu'],
     "💰 Phí giao 15,000-25,000đ tùy khoảng cách nha!"),
    (['thanh toán', 'chuyển khoản', 'payos'],
     "💳 FoodBee nhận tiền mặt hoặc PayOS QR nha!"),
    (['hủy đơn', 'hủy order'],
     "✅ Bạn hủy đơn trước khi quán xác nhận trong mục Đơn hàng nhé!"),
    (['voucher', 'mã giảm', 'coupon', 'khuyến mãi'],
     "🎟️ FoodBee có nhiều voucher hấp dẫn lắm! Hỏi Bee 'có voucher gì không' nhé! 🐝"),
    (['điểm xu', 'tích xu'],
     "🏆 1,000đ = 1 XU. Tích 100 XU đổi 1,000đ giảm giá nha!"),
    (['hoàn tiền', 'refund'],
     "💸 FoodBee hoàn tiền khi đơn bị hủy từ phía quán hoặc shipper nha!"),
    (['khu vực', 'giao được đâu'],
     "📍 FoodBee phục vụ: Hải Châu, Thanh Khê, Sơn Trà, Liên Chiểu, Cẩm Lệ, Ngũ Hành Sơn!"),
    (['chào', 'hello', 'hey', 'hi ', 'alo'],
     "👋 Chào bạn! Bee đây! Bạn muốn tìm món ăn gì hôm nay nè? 🍔🐝"),
    (['cảm ơn', 'thanks'],
     "😊 Không có gì ạ! Bee luôn sẵn sàng giúp bạn! 🐝"),
    (['bye', 'tạm biệt'],
     "👋 Tạm biệt bạn! Nhớ ghé FoodBee thường xuyên nha! 🐝🍯"),
]


def fallback_respond(query: str) -> str:
    q = query.lower()
    for keywords, response in FALLBACK_RULES:
        if any(k in q for k in keywords):
            return response
    return "😊 Bee chưa rõ ý bạn lắm! Thử hỏi: 'phở ngon ở đâu?', 'món dưới 50k?' hoặc 'bán chạy nhất' nhé! Bạn còn thắc mắc gì nữa không ạ? 🐝"


# ═══════════════════════════════════════════════════════════
#  API ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data          = request.json or {}
        query         = (data.get('message') or '').strip()
        history       = data.get('history', [])
        user_context  = data.get('user_context', {})
        clicked_food  = data.get('clicked_food')
        clicked_rest  = data.get('clicked_restaurant')  # restaurant card click

        if not query and not clicked_food and not clicked_rest:
            return jsonify({'response': "Bee chào bạn! Bạn cần Bee hỗ trợ gì hôm nay nè? 🐝🍔", 'foods': [], 'restaurants': [], 'ai_powered': True})

        kh_id     = user_context.get('khach_hang_id')
        is_logged = user_context.get('is_logged_in', False)
        kh_name   = user_context.get('khach_hang_name', '')
        sess_id   = str(kh_id or 'guest')
        logger.info(f"📩 Bee [{len(history)} ctx | logged={is_logged} | kh={kh_name or kh_id}] → {query[:80]}")

        # ── Init / get order session ──────────────────────────────
        sess = get_order_session(sess_id)
        state = sess.get('trang_thai', STATE_SEARCHING_FOOD)
        last_foods = sess.get('last_foods', [])

        # ══════════════════════════════════════════════════════════
        #  RESTAURANT CARD CLICK → show menu
        # ══════════════════════════════════════════════════════════
        if clicked_rest:
            rest_id   = clicked_rest.get('id')
            rest_name = clicked_rest.get('name') or clicked_rest.get('ten_quan_an') or 'Quán'
            if not rest_id:
                rest_id = clicked_rest.get('id_quan_an')

            # Save restaurant selection
            sess['restaurant_id']   = rest_id
            sess['restaurant_name'] = rest_name
            sess['restaurant_list'] = []

            # Get menu
            menu_items = q_restaurant_menu(rest_id, 15)
            sess['menu_items'] = menu_items
            sess['trang_thai'] = STATE_VIEWING_MENU

            if not menu_items:
                reply = f"Quán '{rest_name}' hiện chưa có menu trên FoodBee nha bạn!"
                logger.info(f"✅ Restaurant click → no menu | rest={rest_name}")
                return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # Build intro with top 3 menu items
            top3 = menu_items[:3]
            intro = f"🏪 Đây là menu của **{rest_name}** nè! Bee chọn vài món hot cho bạn:\n"
            for i, m in enumerate(top3):
                intro += f"\n• **{m.get('title','')}** — {float(m.get('price',0)):,.0f}đ"
            intro += f"\n\n...và {len(menu_items)-3} món khác. Bạn nhắn tên món hoặc số thứ tự để Bee thêm vào đơn nhé!"

            logger.info(f"✅ Restaurant click → {len(menu_items)} menu items | state → VIEWING_MENU")
            return jsonify({
                'response': intro,
                'foods': menu_items,
                'restaurants': [],
                'selected_restaurant': clicked_rest,
                'ai_powered': False,
            })

        # ══════════════════════════════════════════════════════════
        #  FOOD CARD CLICK → add to cart
        # ══════════════════════════════════════════════════════════
        if clicked_food:
            food_id       = clicked_food.get('id')
            food_title    = clicked_food.get('title') or clicked_food.get('name', '')
            food_price    = float(clicked_food.get('price', 0))
            food_rest     = clicked_food.get('restaurant', '')
            food_rest_id  = clicked_food.get('id_quan_an') or clicked_food.get('restaurant_id')

            # Enforce one-restaurant rule
            if sess.get('restaurant_id') and food_rest_id and sess['restaurant_id'] != food_rest_id:
                reply = (f"⚠️ Mỗi đơn chỉ đặt từ 1 quán thôi bạn ơi!\n"
                         f"Giỏ hàng đang có món từ quán **{sess.get('restaurant_name','')}**.\n"
                         f"Bạn muốn:\n"
                         f"1️⃣ Giữ đơn hiện tại và tiếp tục thêm món\n"
                         f"2️⃣ Xóa đơn cũ và bắt đầu lại với quán mới\n\n"
                         f"Nhắn số giúp Bee nhé!")
                logger.info(f"⚠️ Cross-restaurant card click blocked | current={sess['restaurant_id']} | new={food_rest_id}")
                return jsonify({'response': reply, 'foods': sess.get('menu_items',[]), 'restaurants': [], 'ai_powered': False})

            # Add to cart
            existing = next((i for i, c in enumerate(sess['cart']) if c.get('id') == food_id), -1)
            if existing >= 0:
                sess['cart'][existing]['so_luong'] = sess['cart'][existing].get('so_luong', 1) + 1
            else:
                sess['cart'].append({
                    'id': food_id, 'title': food_title, 'price': food_price,
                    'so_luong': 1, 'id_quan_an': food_rest_id, 'restaurant': food_rest,
                })

            if food_rest_id and not sess.get('restaurant_id'):
                sess['restaurant_id']   = food_rest_id
                sess['restaurant_name'] = food_rest

            total = sum(c['price'] * c.get('so_luong', 1) for c in sess['cart'])
            sess['total_amount'] = total

            lines = [f"{i+1}. {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ"
                     for i, c in enumerate(sess['cart'])]
            cart_text = "\n".join(lines)

            # Move to ENTERING_DELIVERY
            sess['trang_thai'] = STATE_ENTERING_DELIVERY

            reply = (f"✅ Đã thêm '{food_title}' vào đơn!\n"
                     f"\n📦 Giỏ hàng:\n{cart_text}\n"
                     f"\n💰 Tổng: {total:,.0f}đ\n\n"
                     f"📋 Cung cấp thông tin giao hàng nhé:\n"
                     f"  • Họ tên người nhận: ...\n"
                     f"  • SĐT: ...\n"
                     f"  • Địa chỉ giao: ...")

            logger.info(f"✅ Food card click → cart updated | state → ENTERING_DELIVERY | cart={len(sess['cart'])}")
            return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

        # ══════════════════════════════════════════════════════════
        #  STATE: VIEWING_MENU
        # ══════════════════════════════════════════════════════════
        if state == STATE_VIEWING_MENU:
            q_lower = query.lower()

            # Check for cancel / reset
            if any(k in q_lower for k in ['không', 'thôi', 'hủy', 'chọn quán khác', 'đổi quán']):
                clear_order_session(sess_id)
                sess = get_order_session(sess_id)
                reply = "OK bạn ơi! Bạn muốn tìm quán khác không? 🍔"
                return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # Check if user selected a menu item by number
            menu_items = sess.get('menu_items', [])
            selected = None
            q_num = query.strip()
            if q_num.isdigit() and 1 <= int(q_num) <= len(menu_items):
                selected = menu_items[int(q_num) - 1]
            else:
                # Try to match by food name
                for m in menu_items:
                    mn = (m.get('title') or '').lower()
                    if mn in q_lower or q_lower in mn:
                        selected = m
                        break

            if selected:
                food_id    = selected.get('id')
                food_title = selected.get('title', '')
                food_price = float(selected.get('price', 0))
                food_rest  = selected.get('restaurant') or sess.get('restaurant_name', '')
                food_rest_id = selected.get('id_quan_an') or sess.get('restaurant_id')

                existing = next((i for i, c in enumerate(sess['cart']) if c.get('id') == food_id), -1)
                if existing >= 0:
                    sess['cart'][existing]['so_luong'] = sess['cart'][existing].get('so_luong', 1) + 1
                else:
                    sess['cart'].append({
                        'id': food_id, 'title': food_title, 'price': food_price,
                        'so_luong': 1, 'id_quan_an': food_rest_id, 'restaurant': food_rest,
                    })

                total = sum(c['price'] * c.get('so_luong', 1) for c in sess['cart'])
                sess['total_amount'] = total
                lines = [f"{i+1}. {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ"
                         for i, c in enumerate(sess['cart'])]
                cart_text = "\n".join(lines)

                sess['trang_thai'] = STATE_ENTERING_DELIVERY
                reply = (f"✅ Đã thêm '{food_title}'!\n"
                         f"\n📦 Giỏ hàng:\n{cart_text}\n"
                         f"\n💰 Tổng: {total:,.0f}đ\n\n"
                         f"📋 Giao hàng đến đâu nhỉ? Cung cấp giúp Bee:\n"
                         f"  • Họ tên: ...\n  • SĐT: ...\n  • Địa chỉ: ...")
                logger.info(f"✅ Menu item selected → cart | state → ENTERING_DELIVERY")
                return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # User typed something else → delegate to AI
            response_text, foods, restaurants = run_agent(query, history, user_context, sess, [])
            if foods:
                sess['last_foods'] = foods
            if not response_text:
                response_text = fallback_respond(query)
            return jsonify({'response': response_text, 'foods': foods, 'restaurants': [], 'ai_powered': True})

        # ══════════════════════════════════════════════════════════
        #  STATE: SELECTING_RESTAURANT → user chose a restaurant
        # ══════════════════════════════════════════════════════════
        if state == STATE_SELECTING_RESTAURANT:
            rest_list = sess.get('restaurant_list', [])
            q_lower_sel = query.lower()
            selected_rest = None

            # ── Layer 1: restaurant_list available → match by number or name ──
            if rest_list:
                q_num = query.strip()
                if q_num.isdigit() and 1 <= int(q_num) <= len(rest_list):
                    selected_rest = rest_list[int(q_num) - 1]
                else:
                    for r in rest_list:
                        rname = (r.get('name') or '').lower()
                        if rname and (rname in q_lower_sel or q_lower_sel in rname):
                            selected_rest = r
                            break

            # ── Layer 2: restaurant_list empty (session reset?) + user sent a number ──
            # Fallback: reload from DB using saved keyword
            if not selected_rest:
                q_num = query.strip()
                if q_num.isdigit():
                    prev_kw = sess.get('prev_restaurant_keyword', '')
                    if prev_kw:
                        reloaded = q_restaurants(prev_kw, limit=10)
                        if reloaded:
                            sess['restaurant_list'] = reloaded
                            num = int(q_num)
                            if 1 <= num <= len(reloaded):
                                selected_rest = reloaded[num - 1]
                    else:
                        # No saved keyword — try to match by name in DB
                        matched = q_restaurants(q_lower_sel.strip(), limit=10)
                        if matched:
                            sess['restaurant_list'] = matched
                            # If only 1 match, auto-select it
                            if len(matched) == 1:
                                selected_rest = matched[0]
                            # Else ask user to pick from new list

            # ── Commit selection → load menu ──
            if selected_rest:
                rest_id   = selected_rest.get('id')
                rest_name = selected_rest.get('name', '')
                sess['restaurant_id']   = rest_id
                sess['restaurant_name'] = rest_name

                menu_items = q_restaurant_menu(rest_id, limit=20)
                sess['menu_items']  = menu_items
                sess['trang_thai']  = STATE_VIEWING_MENU

                if menu_items:
                    top_items = menu_items[:6]
                    lines = [f"{i+1}. {m.get('title','')} — {float(m.get('price',0)):,.0f}đ"
                             for i, m in enumerate(top_items)]
                    reply = (f"🏪 **{rest_name}**\n"
                             f"   📍 {selected_rest.get('address','')}\n\n"
                             f"🍽️ **Menu tại quán nè:**\n" + "\n".join(lines))
                    if len(menu_items) > 6:
                        reply += f"\n...và {len(menu_items) - 6} món khác nữa!"
                    reply += "\n\nNhắn **số** (1, 2...) để thêm món vào giỏ nhé!"
                    logger.info(f"✅ Restaurant selected → {rest_name} | {len(menu_items)} items | state → VIEWING_MENU")
                    return jsonify({'response': reply, 'foods': menu_items, 'restaurants': [], 'ai_powered': False})
                else:
                    reply = f"🏪 **{rest_name}** — đang cập nhật menu, bạn thử lại sau nhé!"
                    return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Layer 3: User typed name → search DB directly ──
            if q_lower_sel.strip() and q_lower_sel not in ['1','2','3','4','5','6','7','8','9','0']:
                matched = q_restaurants(q_lower_sel.strip(), limit=10)
                if matched:
                    sess['restaurant_list'] = matched
                    if len(matched) == 1:
                        selected_rest = matched[0]
                        rest_id   = selected_rest.get('id')
                        rest_name = selected_rest.get('name', '')
                        sess['restaurant_id']   = rest_id
                        sess['restaurant_name'] = rest_name
                        menu_items = q_restaurant_menu(rest_id, limit=20)
                        sess['menu_items'] = menu_items
                        sess['trang_thai'] = STATE_VIEWING_MENU
                        if menu_items:
                            top_items = menu_items[:6]
                            lines = [f"{i+1}. {m.get('title','')} — {float(m.get('price',0)):,.0f}đ"
                                     for i, m in enumerate(top_items)]
                            reply = (f"🏪 **{rest_name}**\n"
                                     f"   📍 {selected_rest.get('address','')}\n\n"
                                     f"🍽️ **Menu tại quán nè:**\n" + "\n".join(lines))
                            if len(menu_items) > 6:
                                reply += f"\n...và {len(menu_items) - 6} món khác nữa!"
                            reply += "\n\nNhắn **số** (1, 2...) để thêm món vào giỏ nhé!"
                            return jsonify({'response': reply, 'foods': menu_items, 'restaurants': [], 'ai_powered': False})
                    else:
                        # Multiple matches — show list
                        rest_preview = "\n".join([
                            f"{i+1}. {r.get('name','')} — 📍{r.get('address','')}"
                            for i, r in enumerate(matched)
                        ])
                        reply = (f"🐝 Bee tìm thấy {len(matched)} quán liên quan:\n\n"
                                 f"{rest_preview}\n\n"
                                 f"Nhắn **số** (1, 2...) để Bee xem menu nhé!")
                        return jsonify({'response': reply, 'foods': [], 'restaurants': matched, 'ai_powered': False})

            # ── Layer 4: food intent → fall back to search ──
            food_kw_found = any(k in q_lower_sel for k in
                ['bún', 'phở', 'cơm', 'mì', 'bánh', 'cháo', 'gà', 'lẩu', 'nướng',
                 'pizza', 'burger', 'trà sữa', 'cà phê', 'cf', 'cafe', 'kem', 'chè',
                 'hải sản', 'xôi', 'bún bò', 'cơm tấm', 'mì quảng', 'bánh mì',
                 'sinh tố', 'nước', 'trà', 'ngon', 'hôm nay', 'gợi ý'])
            if food_kw_found or any(k in q_lower_sel for k in ['tìm', 'xem', 'món']):
                response_text, foods, restaurants = run_agent(query, history, user_context, sess, [])
                if foods:
                    sess['last_foods'] = foods
                if restaurants:
                    sess['restaurant_list'] = restaurants
                if not response_text:
                    response_text = fallback_respond(query)
                return jsonify({'response': response_text, 'foods': foods, 'restaurants': restaurants, 'ai_powered': True})

            # ── Layer 5: really not understood → show restaurant list ──
            rest_preview = "\n".join([
                f"{i+1}. {r.get('name','')} — 📍{r.get('address','')}"
                for i, r in enumerate(rest_list)
            ]) if rest_list else "(danh sách quán đã hết hạn — bạn nhắn lại từ đầu nhé!)"
            reply = (f"🐝 Bee chưa hiểu ý bạn lắm!\n\n"
                     f"📋 Danh sách quán hiện tại:\n{rest_preview}\n\n"
                     f"Nhắn **số** (1, 2...) hoặc **tên quán** để Bee xem menu nhé!")
            return jsonify({'response': reply, 'foods': [], 'restaurants': rest_list, 'ai_powered': False})

        # ══════════════════════════════════════════════════════════
        #  STATE: ENTERING_DELIVERY
        # ══════════════════════════════════════════════════════════
        if state == STATE_ENTERING_DELIVERY:
            import unicodedata
            q_lower_enter = query.lower()
            order_intent = any(k in q_lower_enter for k in
                ['đặt', 'order', 'mua', 'tìm', 'tôi muốn', 'muốn ăn', 'muốn', 'cần', 'thêm món', 'quán'])
            food_kw = any(k in q_lower_enter for k in
                ['bún', 'phở', 'cơm', 'mì', 'bánh', 'cháo', 'gà', 'lẩu', 'nướng',
                 'pizza', 'burger', 'trà sữa', 'cà phê', 'cf', 'cafe', 'kem', 'chè',
                 'hải sản', 'xôi', 'bún bò', 'cơm tấm', 'mì quảng', 'bánh mì',
                 'thịt', 'cá', 'ốc', 'sinh tố', 'nước', 'trà'])
            if order_intent and food_kw:
                response_text, foods, restaurants = run_agent(query, history, user_context, sess, last_foods)
                if foods:
                    sess['last_foods'] = foods
                if not response_text:
                    response_text = fallback_respond(query)
                logger.info(f"🐝 [ENTERING_DELIVERY→AI] Bee response: {response_text[:120]}")
                return jsonify({'response': response_text, 'foods': foods, 'restaurants': [], 'ai_powered': True})

            reply, done = _parse_delivery_info(query, sess)
            if done:
                logger.info(f"✅ Delivery info parsed → state → SELECTING_PAYMENT")
            sess['last_foods'] = []
            return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

        # ══════════════════════════════════════════════════════════
        #  STATE: CONFIRMING_ORDER → wait for user to confirm
        # ══════════════════════════════════════════════════════════
        if state == STATE_CONFIRMING_ORDER:
            q_lower = query.lower()
            confirm_kw = any(k in q_lower for k in [
                'xác nhận', 'đồng ý', 'ok', 'đặt', 'đúng', 'chuẩn', 'đúng rồi', 'ok đi'
            ])
            cancel_kw = any(k in q_lower for k in [
                'hủy', 'không', 'bỏ', 'không đặt', 'không mua', 'quay lại'
            ])
            if cancel_kw:
                sess['trang_thai'] = STATE_VIEWING_MENU
                return jsonify({
                    'response': "Đơn đã hủy. Bạn muốn thêm món gì? Menu vẫn sẵn sàng!",
                    'foods': sess.get('menu_items', []),
                    'restaurants': [],
                    'ai_powered': False,
                })
            if confirm_kw:
                sess['trang_thai'] = STATE_SELECTING_PAYMENT
                reply = _build_payment_prompt(sess)
                logger.info(f"🐝 Bee response: {reply[:120]}")
                return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
            reply = _build_confirm_order_prompt(sess)
            reply += "\n\n(Vui lòng gõ 'xác nhận' để tiếp tục, hoặc cho Bee biết bạn cần sửa gì.)"
            return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

        # ══════════════════════════════════════════════════════════
        #  STATE: SELECTING_PAYMENT
        # ══════════════════════════════════════════════════════════
        if state == STATE_SELECTING_PAYMENT:
            q_lower_sel = query.lower()

            # Allow going back to add items or change address
            if any(k in q_lower_sel for k in ['thêm', 'bớt', 'bỏ', 'xóa', 'đổi món', 'sửa']):
                sess['trang_thai'] = STATE_VIEWING_MENU
                return jsonify({
                    'response': "📋 Đang quay lại menu. Nhắn tên món bạn muốn thêm hoặc bỏ nhé!",
                    'foods': sess.get('menu_items', []),
                    'restaurants': [],
                    'ai_powered': False,
                })

            reply, done = _parse_payment_choice(query, sess, kh_id)
            logger.info(f"🐝 Bee response: {reply[:120]}")
            sess['last_foods'] = []
            return jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

        # ══════════════════════════════════════════════════════════
        #  STATE: COMPLETED → reset
        # ══════════════════════════════════════════════════════════
        if state == STATE_COMPLETED:
            sess = get_order_session(sess_id)
            clear_order_session(sess_id)
            sess = get_order_session(sess_id)

        # ══════════════════════════════════════════════════════════
        #  STATE: SEARCHING_FOOD (default) → run AI agent
        # ══════════════════════════════════════════════════════════
        last_foods = sess.get('last_foods', [])
        response_text, foods, restaurants = run_agent(query, history, user_context, sess, last_foods)

        if not response_text:
            response_text = fallback_respond(query)
            if not foods and not restaurants:
                foods = q_random(6)

        # Decide next state based on what was returned
        if restaurants:
            sess['restaurant_list'] = restaurants
            sess['prev_restaurant_keyword'] = query.strip()
            sess['trang_thai'] = STATE_SELECTING_RESTAURANT
        elif foods:
            sess['trang_thai'] = STATE_SELECTING_RESTAURANT

        if foods:
            sess['last_foods'] = foods

        logger.info(f"🐝 Bee response: {response_text[:120]} | foods={len(foods)} rests={len(restaurants)}")
        return jsonify({
            'response': response_text,
            'foods': foods,
            'restaurants': restaurants,
            'ai_powered': True,
        })

    except Exception as e:
        logger.error(f"❌ Chat error: {e}", exc_info=True)
        _raw_query    = locals().get('query', '') or ''
        fallback_text = fallback_respond(_raw_query)
        fallback_foods = []
        try:
            fallback_foods = q_random(6)
        except Exception:
            pass
        return jsonify({'response': fallback_text, 'foods': fallback_foods, 'restaurants': [], 'ai_powered': False})


# ═══════════════════════════════════════════════════════════
#  STATE MACHINE HELPERS
# ═══════════════════════════════════════════════════════════

def _parse_delivery_info(query: str, sess: dict) -> tuple:
    """Parse name/phone/address from query. Returns (reply, is_complete)."""
    q = query.strip()
    q_lower = q.lower()

    # ── Check for cancel / change keywords ──
    if any(k in q_lower for k in ['thêm món', 'bỏ', 'xóa', 'sửa', 'đổi']):
        return "📋 Giỏ hàng của bạn đang chờ. Gõ 'xem giỏ' để xem, hoặc cung cấp thông tin giao hàng để tiếp tục nhé!", False

    # ── Check for "xem giỏ" / "giỏ hàng" ──
    if any(k in q_lower for k in ['xem giỏ', 'giỏ hàng', 'đơn hàng', 'xem đơn']):
        cart = sess.get('cart', [])
        if not cart:
            return "🛒 Giỏ hàng đang trống. Bạn muốn tìm món gì nè?", False
        lines = [f"{i+1}. {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ"
                 for i, c in enumerate(cart)]
        total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
        reply = f"📦 Giỏ hàng hiện tại:\n" + "\n".join(lines)
        reply += f"\n💰 Tổng: {total:,.0f}đ\n\nVẫn cần: họ tên, SĐT, địa chỉ giao hàng nhé!"
        return reply, False

    # ── Check for payment choice at this stage (sometimes user skips ahead) ──
    if any(k in q_lower for k in ['tiền mặt', 'cod', 'chuyển khoản', 'payos', 'qr', 'thanh toán']):
        sess['customer_name'] = sess.get('customer_name') or 'Khách'
        sess['phone'] = sess.get('phone') or '0000000000'
        sess['address'] = sess.get('address') or 'Đà Nẵng'
        reply, _ = _parse_payment_choice(q, sess, None)
        return reply, True

    # ── Try to extract info from query ──
    import re
    updated = False

    # Phone: 10-11 digit patterns
    phone_match = re.search(r'0\d{9,10}', q)
    if phone_match and not sess.get('phone'):
        phone_val = phone_match.group()
        if len(phone_val) >= 10:
            sess['phone'] = phone_val
            updated = True

    # Name: extract text BEFORE the phone number (reliable for "name, phone, address" format)
    if not sess.get('customer_name'):
        # Try "name, phone..." pattern: text before phone number
        phone_pattern = r'0\d{9,10}'
        idx = re.search(phone_pattern, q)
        if idx:
            before = q[:idx.start()].strip().rstrip(',').strip()
            if len(before) >= 2:
                # Clean up: remove trailing commas/spaces
                before = re.sub(r'[,;\s]+$', '', before).strip()
                if 2 <= len(before) <= 40:
                    sess['customer_name'] = before
                    updated = True

        # Fallback: explicit keywords
        if not sess.get('customer_name'):
            name_patterns = [
                r'(?:tên|là|gọi là|người nhận)[:\s]+([A-Za-zÀ-ỹ\s]{2,40})',
            ]
            for pat in name_patterns:
                m = re.search(pat, q, re.IGNORECASE)
                if m and len(m.group(1).strip()) >= 2:
                    sess['customer_name'] = m.group(1).strip()
                    updated = True
                    break

    # Address: smart extraction with priority indicators
    if not sess.get('address'):
        # Extract text AFTER the phone number (most reliable for "name, phone, address" format)
        phone_pattern = r'0\d{9,10}'
        idx = re.search(phone_pattern, q)
        if idx:
            after = q[idx.end():].strip().lstrip(',').strip()
            if len(after) >= 5:
                sess['address'] = after
                updated = True
        else:
            # Fallback: look for address indicators
            addr_indicators = ['đường', 'quận', 'phường', 'huyện', 'xã', 'số ', 'lầu', 'tầng', 'block', 'tower']
            for ind in addr_indicators:
                idx2 = q.lower().find(ind)
                if idx2 != -1:
                    start = max(0, idx2 - 30)
                    end = min(len(q), idx2 + 50)
                    chunk = q[start:end].strip()
                    segs = [s.strip() for s in re.split(r'[,;|/]', chunk) if len(s.strip()) > 8]
                    for seg in segs:
                        if any(ind in seg.lower() for ind in addr_indicators):
                            sess['address'] = seg
                            updated = True
                            break
                    if updated:
                        break

    # Check what's missing
    missing = []
    if not sess.get('customer_name'): missing.append('họ tên')
    if not sess.get('phone'):         missing.append('SĐT')
    if not sess.get('address'):       missing.append('địa chỉ giao hàng')

    if not missing:
        # All info collected → show order summary → ask for confirmation
        sess['trang_thai'] = STATE_CONFIRMING_ORDER
        return _build_confirm_order_prompt(sess), True

    if updated:
        still_missing = []
        if not sess.get('customer_name'): still_missing.append('họ tên')
        if not sess.get('phone'):         still_missing.append('SĐT')
        if not sess.get('address'):       still_missing.append('địa chỉ giao hàng')
        if not still_missing:
            sess['trang_thai'] = STATE_CONFIRMING_ORDER
            return _build_confirm_order_prompt(sess), True
        reply = f"✅ Bee đã ghi nhận! Còn thiếu: {', '.join(still_missing)}.\nBạn nhập thêm nhé!"
        return reply, False

    # Nothing parsed → ask for missing info
    reply = "📋 Bee cần thông tin giao hàng:\n"
    if not sess.get('customer_name'): reply += "  • Họ tên người nhận: ...\n"
    if not sess.get('phone'):         reply += "  • SĐT người nhận: ...\n"
    if not sess.get('address'):       reply += "  • Địa chỉ giao hàng: ..."
    return reply, False


def _build_confirm_order_prompt(sess: dict) -> str:
    """Build order confirmation prompt — shows full summary with shipping fee."""
    cart = sess.get('cart', [])
    total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
    phi_ship = 15000
    tong = total + phi_ship

    lines = [f"{i+1}. {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ"
             for i, c in enumerate(cart)]
    cart_text = "\n".join(lines)

    reply = (
        f"📋 XEM LẠI ĐƠN HÀNG:\n"
        f"{cart_text}\n\n"
        f"💰 Tiền hàng: {total:,.0f}đ\n"
        f"🚚 Phí ship:   {phi_ship:,.0f}đ\n"
        f"─────────────────\n"
        f"💵 TỔNG CỘNG: {tong:,.0f}đ\n\n"
        f"📍 Giao đến: {sess.get('address','')}\n"
        f"👤 Người nhận: {sess.get('customer_name','')} — {sess.get('phone','')}\n\n"
        f"✅ Nếu đồng ý → gõ 'xác nhận' để tiếp tục thanh toán.\n"
        f"✏️  Muốn sửa → nhắn cho Bee biết bạn cần sửa gì."
    )
    return reply



def _build_payment_prompt(sess: dict) -> str:
    """Build payment selection prompt after delivery info is collected."""
    cart = sess.get('cart', [])
    total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
    phi_ship = 15000
    tong = total + phi_ship
    lines = [f"{i+1}. {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ"
             for i, c in enumerate(cart)]
    cart_text = "\n".join(lines)
    reply = (f"✅ Đơn hàng đã xác nhận!\n\n"
             f"📦 Đơn hàng:\n{cart_text}\n\n"
             f"💰 Tiền hàng: {total:,.0f}đ\n"
             f"🚚 Phí ship:   {phi_ship:,.0f}đ\n"
             f"─────────────────\n"
             f"💵 TỔNG CỘNG: {tong:,.0f}đ\n\n"
             f"📍 Giao đến: {sess.get('address','')}\n"
             f"👤 Người nhận: {sess.get('customer_name','')} — {sess.get('phone','')}\n\n"
             f"Chọn phương thức thanh toán:\n"
             f"1️⃣ Tiền mặt — trả khi nhận hàng\n"
             f"2️⃣ PayOS QR — chuyển khoản ngay")
    return reply


def _parse_payment_choice(query: str, sess: dict, kh_id) -> tuple:
    """Parse payment choice. Returns (reply, done).
    Supports switching payment method mid-session."""
    q_lower = query.lower()

    # ── Check for payment method SWITCH request ──
    # e.g. "đổi thanh toán", "chuyển sang tiền mặt", "tiền mặt thôi"
    switching = any(k in q_lower for k in [
        'đổi', 'đổi thanh', 'chuyển', 'thay đổi',
        'không chuyển', 'không qr', 'thôi qr',
        'tiền mặt thôi', 'tiền mặt thì', '1 thôi', '1 đi'
    ])
    wants_cash = any(k in q_lower for k in ['tiền mặt', 'cod', '1', 'trả khi nhận'])
    wants_payos = any(k in q_lower for k in ['payos', 'qr', 'chuyển khoản', '2', 'online', 'zalo', 'vnpay'])

    # If user is switching AND chose a new method → use new method
    if switching and (wants_cash or wants_payos):
        phuong_thuc = 'online' if wants_payos else 'tien_mat'
        return _confirm_and_create_order(sess, kh_id, phuong_thuc)

    # If user is switching but didn't specify new method → show prompt again
    if switching:
        return _build_payment_prompt(sess) + (
            "\n\n(Bạn muốn chuyển sang phương thức nào? 1 hoặc 2)"
        ), False

    is_cash = wants_cash
    is_payos = wants_payos

    if not is_cash and not is_payos:
        return _build_payment_prompt(sess) + "\n\n(Vui lòng chọn 1 hoặc 2)", False

    cart = sess.get('cart', [])
    if not cart:
        return "🛒 Giỏ hàng trống rồi! Tìm món gì để đặt nhé?", False

    phuong_thuc = 'online' if is_payos else 'tien_mat'
    return _confirm_and_create_order(sess, kh_id, phuong_thuc)


def _confirm_and_create_order(sess: dict, kh_id, phuong_thuc: str):
    """Create order with given payment method. Returns (reply, done)."""
    cart = sess.get('cart', [])
    if not cart:
        return "🛒 Giỏ hàng trống rồi! Tìm món gì để đặt nhé?", False

    mon_an_list = [
        {'id_mon_an': c.get('id'), 'ten_mon': c['title'],
         'so_luong': c.get('so_luong', 1), 'gia': c['price']}
        for c in cart
    ]

    result = tao_don_hang_moi(
        khach_hang_id=kh_id or 1,
        ho_ten=sess.get('customer_name', 'Khách'),
        sdt=sess.get('phone', ''),
        dia_chi=sess.get('address', ''),
        id_quan_an=sess.get('restaurant_id') or (cart[0].get('id_quan_an') if cart else None),
        mon_an_list=mon_an_list,
        phuong_thuc_thanh_toan=phuong_thuc,
    )

    # Lưu trước khi clear session
    dia_chi_display = sess.get('address', '')
    customer_name_display = sess.get('customer_name', 'Khách')
    phone_display = sess.get('phone', '')

    clear_order_session(str(kh_id or 'guest'))
    sess = get_order_session(str(kh_id or 'guest'))
    sess['trang_thai'] = STATE_COMPLETED

    if result.get('success'):
        tong_tien = result.get('tong_tien', 0)
        ma_don = result.get('ma_don_hang', '')
        tien_hang = result.get('tien_hang', 0)
        phi_ship = result.get('phi_ship', 0)
        reply = (f"🎉 Đơn hàng #{ma_don} đã được tạo!\n\n📦 Món:\n")
        for c in cart:
            reply += f"  • {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ\n"
        reply += (f"\n💰 Tiền hàng: {tien_hang:,.0f}đ\n"
                  f"🚚 Phí ship: {phi_ship:,.0f}đ\n"
                  f"💵 Tổng: {tong_tien:,.0f}đ\n"
                  f"📍 Giao đến: {dia_chi_display}\n"
                  f"👤 Người nhận: {customer_name_display} — {phone_display}\n")

        if phuong_thuc == 'online' and result.get('checkout_url'):
            reply += (f"\n💳 Thanh toán PayOS — quét QR hoặc bấm nút bên dưới.\n"
                      f"Sau khi thanh toán thành công, đơn sẽ được xác nhận ngay!")
            return (reply + f"\n__PAYMENT__" + json.dumps({
                'checkout_url': result['checkout_url'],
                'qr_code': result.get('qr_code', ''),
                'tong_tien': tong_tien,
                'ma_don_hang': ma_don,
            }) + "\n", True)
        else:
            reply += "\n💵 Thanh toán tiền mặt khi nhận hàng."
            return reply, True
    else:
        return f"❌ Tạo đơn thất bại: {result.get('message', 'Lỗi không xác định')}", False


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
        'status':       'healthy',
        'version':      '11.5-bee-smart',
        'architecture': 'multi-step-agentic-loop',
        'max_steps':    MAX_AGENT_STEPS,
        'total_tools':  len(TOOLS),
        'tools':        [t['function']['name'] for t in TOOLS],
        'ai_model':     f'Groq/{GROQ_MODEL}' if ai_client else 'fallback-only',
        'db_connected': db_ok,
        'foods_count':  n,
    })


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    logger.info(f"🚀 FoodBee Bee v11.5 — Smart Agent — port {port}")
    logger.info(f"🤖 {'✅ Groq ON | ' + GROQ_MODEL if GROQ_API_KEY else '❌ Groq OFF'}")
    logger.info(f"🔧 Total tools: {len(TOOLS)} | Max steps: {MAX_AGENT_STEPS}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
