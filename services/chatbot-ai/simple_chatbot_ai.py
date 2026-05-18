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

from flask import Flask, request, jsonify as _flask_jsonify, session
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
from typing import Optional
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
STATE_FOOD_CARD             = 'FOOD_CARD'          # food search results shown → select by number
STATE_SELECTING_OPTIONS    = 'SELECTING_OPTIONS'     # ← MỚI: chọn size/topping trước khi thêm vào giỏ
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
    sess.setdefault('voucher', None)
    sess.setdefault('xu_su_dung', 0)
    sess.setdefault('pending_food', None)
    sess.setdefault('pending_toppings', [])
    sess.setdefault('available_toppings', [])
    sess.setdefault('pending_size', None)
    sess.setdefault('pending_sizes', [])
    sess.setdefault('options_step', 'select_size')

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
_SESSIONS_FILE = os.path.join(os.path.dirname(__file__), 'order_sessions.json')


def _load_sessions():
    """Load persisted sessions from disk on startup."""
    if os.path.exists(_SESSIONS_FILE):
        try:
            with open(_SESSIONS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    order_sessions.update(data)
                    logger.info(f"📦 Loaded {len(data)} persisted sessions from disk")
        except Exception as e:
            logger.warning(f"⚠️ Could not load sessions: {e}")


def _save_sessions():
    """Persist sessions to disk after each mutation."""
    try:
        with open(_SESSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(order_sessions, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"⚠️ Could not save sessions: {e}")


def _resp(base_resp: dict, sess_id: str) -> dict:
    """Add session_id to every API response so FE can store it persistently."""
    r = dict(base_resp)
    r['session_id'] = sess_id
    return _flask_jsonify(r)


# Load persisted sessions on startup
_load_sessions()

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
            'customer_name': None,  # Đặt lại mỗi đơn mới — KHÔNG kế thừa từ đơn trước
            'phone': None,           # Đặt lại mỗi đơn mới
            'address': None,        # Đặt lại mỗi đơn mới
            'total_amount': 0,
            # Restaurant-first flow
            'restaurant_list': [],   # [{id, name, address, rating, ...}]
            'menu_items': [],        # [{id, title, price, ...}] — menu of selected restaurant
            # Voucher & XU
            'voucher': None,
            'xu_su_dung': 0,
            # ── Pending food: chờ user chọn size/topping ──
            'pending_food': None,   # {id, title, price, id_quan_an, restaurant}
            'pending_toppings': [],  # list of {id, title, price}
            'available_toppings': [],  # available topping options for the current food
            'pending_size': None,   # {id, title, extra_price}
            'pending_sizes': [],    # list of {id, title, extra_price} — available sizes
            # Sub-state trong SELECTING_OPTIONS:
            # 'select_size'    — bước 1: chọn size
            # 'select_topping' — bước 2: chọn topping
            # 'confirm'        — bước 3: xác nhận trước khi thêm giỏ
            'options_step': 'select_size',
        }
        _save_sessions()  # Persist new session immediately
    return order_sessions[session_id]


def _save_session(sess_id: str):
    """Save a specific session to disk (called after each update)."""
    _save_sessions()

def clear_order_session(session_id: str):
    if session_id in order_sessions:
        order_sessions[session_id] = {
            'khach_hang_id': None, 'ho_ten': '', 'sdt': '', 'dia_chi': '',
            'id_quan_an': None, 'ten_quan_an': '', 'mon_an_list': [], 'trang_thai': STATE_SEARCHING_FOOD,
            'cart': [], 'restaurant_id': None, 'restaurant_name': None,
            'customer_name': None, 'phone': None, 'address': None, 'total_amount': 0,
            'restaurant_list': [], 'menu_items': [],
            'voucher': None, 'xu_su_dung': 0,
            'pending_food': None, 'pending_toppings': [], 'available_toppings': [], 'pending_size': None,
            'pending_sizes': [],
            'options_step': 'select_size',
        }
        _save_sessions()  # Persist cleared state immediately


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


# ═══════════════════════════════════════════════════════════════════════════════
#  CHATBOT INTERACTION HISTORY & PERSONALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def _ensure_chatbot_history_table():
    """Create chatbot_history table if not exists."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chatbot_history (
                id              BIGINT AUTO_INCREMENT PRIMARY KEY,
                khach_hang_id   INT NULL,
                session_id      VARCHAR(255) NOT NULL DEFAULT 'guest',
                action_type     VARCHAR(50) NOT NULL,
                -- What user asked / did
                query_text      TEXT,
                action_detail   TEXT,
                -- What chatbot returned
                response_text   TEXT,
                foods_shown     JSON,
                restaurants_shown JSON,
                selected_item   JSON,
                -- Order context
                restaurant_name VARCHAR(255),
                cart_summary    JSON,
                delivery_info   JSON,
                -- Metadata
                state_before    VARCHAR(50),
                state_after     VARCHAR(50),
                ai_powered      TINYINT(1) DEFAULT 0,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_khach_hang (khach_hang_id),
                INDEX idx_session  (session_id),
                INDEX idx_created  (created_at),
                INDEX idx_action   (action_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.warning(f"⚠️ Could not create chatbot_history table: {e}")


def _ensure_user_food_profile_table():
    """Create user_food_profile table if not exists."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_food_profile (
                id              BIGINT AUTO_INCREMENT PRIMARY KEY,
                khach_hang_id   INT NOT NULL,
                -- Food preferences
                favorite_foods  JSON,       -- [{food_name, count, last_ordered}]
                favorite_restaurants JSON,  -- [{restaurant_name, count, last_ordered}]
                preferred_price_min INT DEFAULT 0,
                preferred_price_max INT DEFAULT 200000,
                -- Delivery preferences (learned from orders)
                preferred_address TEXT,
                preferred_name    VARCHAR(255),
                preferred_phone  VARCHAR(20),
                -- Order stats
                total_orders    INT DEFAULT 0,
                total_spent     DECIMAL(12,0) DEFAULT 0,
                last_order_at    DATETIME,
                avg_order_value  DECIMAL(10,0) DEFAULT 0,
                -- Most ordered items / categories
                top_categories  JSON,       -- [{category, count}]
                updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE INDEX idx_khach_hang (khach_hang_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.warning(f"⚠️ Could not create user_food_profile table: {e}")


def save_chatbot_interaction(
    khach_hang_id: Optional[int],
    session_id: str,
    action_type: str,
    query_text: str = '',
    action_detail: str = '',
    response_text: str = '',
    foods_shown: list = None,
    restaurants_shown: list = None,
    selected_item: dict = None,
    restaurant_name: str = '',
    cart: list = None,
    delivery_info: dict = None,
    state_before: str = '',
    state_after: str = '',
    ai_powered: bool = False,
) -> bool:
    """Save a chatbot interaction to history table."""
    try:
        import json as _json
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO chatbot_history (
                khach_hang_id, session_id, action_type,
                query_text, action_detail, response_text,
                foods_shown, restaurants_shown, selected_item,
                restaurant_name, cart_summary, delivery_info,
                state_before, state_after, ai_powered
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            khach_hang_id,
            session_id,
            action_type,
            query_text,
            action_detail,
            response_text,
            _json.dumps(foods_shown or [], ensure_ascii=False) if foods_shown is not None else None,
            _json.dumps(restaurants_shown or [], ensure_ascii=False) if restaurants_shown is not None else None,
            _json.dumps(selected_item, ensure_ascii=False) if selected_item else None,
            restaurant_name,
            _json.dumps(cart or [], ensure_ascii=False) if cart is not None else None,
            _json.dumps(delivery_info or {}, ensure_ascii=False) if delivery_info is not None else None,
            state_before,
            state_after,
            1 if ai_powered else 0,
        ))
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        logger.warning(f"⚠️ save_chatbot_interaction failed: {e}")
        return False


def get_user_profile(khach_hang_id: int) -> dict:
    """Get personalized context for a user from their food profile + history."""
    if not khach_hang_id:
        return {}

    try:
        import json as _json
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        # 1. Get user food profile
        cur.execute("""
            SELECT * FROM user_food_profile WHERE khach_hang_id = %s LIMIT 1
        """, (khach_hang_id,))
        profile = cur.fetchone()

        # 2. Get recent interactions (last 20)
        cur.execute("""
            SELECT action_type, query_text, action_detail, restaurant_name,
                   cart_summary, created_at
            FROM chatbot_history
            WHERE khach_hang_id = %s
            ORDER BY created_at DESC
            LIMIT 20
        """, (khach_hang_id,))
        recent = [_to_serializable(r) for r in cur.fetchall()]

        cur.close()
        conn.close()

        if not profile:
            return {'recent_interactions': recent}

        # Parse JSON fields
        if profile.get('favorite_foods'):
            if isinstance(profile['favorite_foods'], str):
                profile['favorite_foods'] = _json.loads(profile['favorite_foods'])
        if profile.get('favorite_restaurants'):
            if isinstance(profile['favorite_restaurants'], str):
                profile['favorite_restaurants'] = _json.loads(profile['favorite_restaurants'])
        if profile.get('top_categories'):
            if isinstance(profile['top_categories'], str):
                profile['top_categories'] = _json.loads(profile['top_categories'])

        profile['recent_interactions'] = recent
        return profile

    except Exception as e:
        logger.warning(f"⚠️ get_user_profile failed: {e}")
        return {}


def update_user_profile_from_order(khach_hang_id: int, sess: dict):
    """Update user's food profile after an order is completed."""
    if not khach_hang_id:
        return
    try:
        import json as _json
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        cart = sess.get('cart', [])
        total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
        rest_name = sess.get('restaurant_name', '')

        # Load or create profile
        cur.execute("SELECT * FROM user_food_profile WHERE khach_hang_id=%s LIMIT 1",
                     (khach_hang_id,))
        profile = cur.fetchone()

        if not profile:
            # Create new
            cur.execute("""
                INSERT INTO user_food_profile (khach_hang_id, favorite_foods, favorite_restaurants,
                    total_orders, total_spent, avg_order_value, last_order_at,
                    preferred_address, preferred_name, preferred_phone)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                khach_hang_id,
                _json.dumps([{'name': c['title'], 'count': c.get('so_luong', 1)}
                              for c in cart], ensure_ascii=False),
                _json.dumps([{'name': rest_name, 'count': 1}], ensure_ascii=False),
                1, total, total,
                datetime.now(),
                sess.get('address', ''),
                sess.get('customer_name', ''),
                sess.get('phone', ''),
            ))
        else:
            # Merge into existing
            fav_foods = _json.loads(profile['favorite_foods']) if profile.get('favorite_foods') else []
            fav_rests = _json.loads(profile['favorite_restaurants']) if profile.get('favorite_restaurants') else []

            for c in cart:
                existing = next((f for f in fav_foods if f['name'] == c['title']), None)
                if existing:
                    existing['count'] += c.get('so_luong', 1)
                else:
                    fav_foods.append({'name': c['title'], 'count': c.get('so_luong', 1)})

            if rest_name:
                existing_r = next((r for r in fav_rests if r['name'] == rest_name), None)
                if existing_r:
                    existing_r['count'] += 1
                else:
                    fav_rests.append({'name': rest_name, 'count': 1})

            new_total_orders = (profile.get('total_orders') or 0) + 1
            new_total_spent  = float(profile.get('total_spent') or 0) + total
            new_avg = new_total_spent / new_total_orders

            cur.execute("""
                UPDATE user_food_profile SET
                    favorite_foods     = %s,
                    favorite_restaurants = %s,
                    total_orders       = %s,
                    total_spent        = %s,
                    avg_order_value    = %s,
                    last_order_at      = %s,
                    preferred_address  = COALESCE(%s, preferred_address),
                    preferred_name      = COALESCE(%s, preferred_name),
                    preferred_phone     = COALESCE(%s, preferred_phone)
                WHERE khach_hang_id = %s
            """, (
                _json.dumps(fav_foods, ensure_ascii=False),
                _json.dumps(fav_rests, ensure_ascii=False),
                new_total_orders,
                new_total_spent,
                new_avg,
                datetime.now(),
                sess.get('address'),
                sess.get('customer_name'),
                sess.get('phone'),
                khach_hang_id,
            ))

        conn.commit()
        cur.close()
        conn.close()
        logger.info(f"✅ Updated food profile for khach_hang_id={khach_hang_id}")
    except Exception as e:
        logger.warning(f"⚠️ update_user_profile_from_order failed: {e}")


def build_personalization_context(profile: dict) -> str:
    """
    Build a natural language context string from user profile.
    This is injected into AI prompts for personalization.
    """
    if not profile:
        return ""

    parts = []

    # Recent order activity
    recent = profile.get('recent_interactions', [])
    if recent:
        # Extract unique restaurants from recent interactions
        recent_rests = list(dict.fromkeys(
            r.get('restaurant_name', '') for r in recent if r.get('restaurant_name')
        ))[:3]
        if recent_rests:
            parts.append(f"Quán đã tương tác gần đây: {', '.join(recent_rests)}")

        # Recent queries
        recent_queries = [r.get('query_text', '') for r in recent[:5] if r.get('query_text')]
        if recent_queries:
            # Deduplicate and limit
            seen = set()
            unique = []
            for q in recent_queries:
                norm = q.lower().strip()
                if norm not in seen and len(norm) > 2:
                    seen.add(norm)
                    unique.append(q)
            if unique:
                parts.append(f"Câu hỏi gần đây: {'; '.join(unique[:3])}")

    # Favorite items
    fav_foods = profile.get('favorite_foods', [])
    if fav_foods and isinstance(fav_foods, list):
        top_foods = sorted(fav_foods, key=lambda x: x.get('count', 0), reverse=True)[:5]
        food_names = [f['name'] for f in top_foods]
        parts.append(f"Món hay đặt: {', '.join(food_names)}")

    # Favorite restaurants
    fav_rests = profile.get('favorite_restaurants', [])
    if fav_rests and isinstance(fav_rests, list):
        top_rests = sorted(fav_rests, key=lambda x: x.get('count', 0), reverse=True)[:3]
        rest_names = [r['name'] for r in top_rests]
        parts.append(f"Quán hay đặt: {', '.join(rest_names)}")

    # Stats
    total_orders = profile.get('total_orders', 0)
    avg_value = profile.get('avg_order_value', 0)
    if total_orders > 0:
        parts.append(f"Đã đặt {total_orders} đơn, trung bình {float(avg_value):,.0f}đ/đơn")

    # Preferred address
    pref_addr = profile.get('preferred_address', '')
    if pref_addr:
        parts.append(f"Địa chỉ giao hàng thường dùng: {pref_addr}")

    if not parts:
        return ""

    return "📌 THÔNG TIN CÁ NHÂN HÓA (dùng để gợi ý phù hợp hơn):\n" + "\n".join(f"  • {p}" for p in parts)





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

# ── Helpers ──────────────────────────────────────────────────────────────────
def _extract_food_after_prefix(text: str):
    """Extract food name after 'đặt/order/mua/tôi muốn đặt' prefix."""
    for prefix in ['đặt', 'order', 'mua', 'ship', 'tôi muốn đặt']:
        idx = text.lower().find(prefix)
        if idx != -1:
            after = text[idx + len(prefix):].strip()
            words = after.split()
            trailing = {'nhé', 'nha', 'ạ', 'ơi', 'một', 'với', 'và', 'có',
                        'không', 'bạn', 'ở', 'món', 'con'}
            while words and (words[-1].lower() in trailing or len(words[-1]) <= 2):
                words.pop()
            return ' '.join(words) if words else None
    return None


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


def _is_wellness_recommendation_intent(query: str) -> bool:
    q = (query or '').lower()
    wellness_words = [
        'ốm', 'om', 'bệnh', 'benh', 'mệt', 'met', 'không khỏe', 'khong khoe',
        'đau họng', 'dau hong', 'cảm', 'cam lanh', 'cảm lạnh', 'sốt', 'sot',
        'ho ', ' ho', 'nhức đầu', 'nhuc dau', 'đau bụng', 'dau bung',
        'khó chịu', 'kho chiu', 'uể oải', 'ue oai',
    ]
    suggest_words = ['gợi ý', 'goi y', 'ăn gì', 'an gi', 'món', 'mon', 'ăn', 'an']
    return any(w in q for w in wellness_words) and any(w in q for w in suggest_words)


def q_wellness_foods(query: str, limit: int = 8) -> list:
    """Suggest gentle foods from DB for users who feel sick/tired."""
    q = (query or '').lower()
    if any(k in q for k in ['đau họng', 'dau hong', 'ho ', ' ho', 'cảm', 'cam lanh', 'cảm lạnh', 'sốt', 'sot']):
        keywords = ['cháo', 'súp', 'phở', 'bún', 'miến', 'canh', 'trà gừng', 'nước cam']
    elif any(k in q for k in ['đau bụng', 'dau bung', 'khó tiêu', 'kho tieu']):
        keywords = ['cháo', 'súp', 'canh', 'phở', 'bún', 'cơm', 'nước ép']
    else:
        keywords = ['cháo', 'súp', 'phở', 'bún', 'miến', 'canh', 'cơm gà', 'nước ép', 'sinh tố']

    foods, seen = [], set()
    for keyword in keywords:
        for item in q_foods(keyword, limit=4):
            fid = item.get('id')
            if fid in seen:
                continue
            seen.add(fid)
            foods.append(item)
            if len(foods) >= limit:
                return foods
    if not foods:
        foods = q_random(limit)
    return foods[:limit]


def _wellness_recommendation_response(query: str, foods: list) -> str:
    q = (query or '').lower()
    if any(k in q for k in ['đau họng', 'dau hong', 'ho ', ' ho', 'cảm', 'cảm lạnh', 'sốt', 'sot']):
        reason = "nên ưu tiên món nóng, mềm, dễ nuốt; tránh đồ đá, cay và quá dầu."
    elif any(k in q for k in ['đau bụng', 'dau bung', 'khó tiêu', 'kho tieu']):
        reason = "nên chọn món mềm, ít dầu mỡ, vị nhẹ để bụng dễ chịu hơn."
    else:
        reason = "nên ăn món ấm, nhẹ bụng, có nước để dễ ăn và đỡ mệt hơn."

    lines = []
    for i, food in enumerate((foods or [])[:3], 1):
        title = food.get('title', '')
        price = float(food.get('price', 0))
        restaurant = food.get('restaurant', '')
        lines.append(f"{i}. {title} — {price:,.0f}đ tại {restaurant}")
    sample = "\n".join(lines)
    if sample:
        sample = "\n\nBee chọn từ dữ liệu món đang bán:\n" + sample

    return (
        f"Nghe bạn đang không khỏe, Bee gợi ý vài món nhẹ nha. Lúc ốm/mệt thì {reason}"
        f"{sample}\n\nBạn bấm món bên dưới để xem size/topping và thêm vào giỏ nhé."
    )


def _smart_recommendation_context(query: str) -> dict:
    """Classify common recommendation contexts before generic fallback."""
    q = (query or '').lower()
    ask_words = [
        'gợi ý', 'goi y', 'ăn gì', 'an gi', 'uống gì', 'uong gi',
        'nên ăn', 'nen an', 'nên uống', 'nen uong', 'tư vấn', 'tu van',
        'khuyên', 'khuyen', 'chọn món', 'chon mon', 'món nào', 'mon nao',
        'không biết ăn', 'khong biet an', 'thèm', 'them',
    ]
    if not any(w in q for w in ask_words):
        return {}

    contexts = [
        {
            'key': 'hot_weather',
            'triggers': ['nóng', 'nong', 'oi bức', 'oi buc', 'khát', 'khat', 'giải nhiệt', 'giai nhiet'],
            'keywords': ['trà đào', 'trà chanh', 'nước ép', 'sinh tố', 'trà sữa', 'chè'],
            'advice': 'Trời nóng thì nên chọn món mát, dễ uống, ít ngấy; nếu đang mệt thì hạn chế quá nhiều đá.',
        },
        {
            'key': 'rainy_cold',
            'triggers': ['mưa', 'mua', 'lạnh', 'lanh', 'trời lạnh', 'troi lanh', 'ẩm', 'am am'],
            'keywords': ['phở', 'bún bò', 'mì quảng', 'cháo', 'súp', 'lẩu'],
            'advice': 'Trời mưa/lạnh hợp món nóng, có nước, ăn xong ấm bụng.',
        },
        {
            'key': 'breakfast',
            'triggers': ['ăn sáng', 'an sang', 'bữa sáng', 'bua sang', 'sáng nay', 'sang nay'],
            'keywords': ['bánh mì', 'xôi', 'phở', 'bún', 'cháo', 'cơm tấm'],
            'advice': 'Bữa sáng nên chọn món đủ no nhưng không quá nặng bụng.',
        },
        {
            'key': 'lunch_office',
            'triggers': ['ăn trưa', 'an trua', 'bữa trưa', 'bua trua', 'văn phòng', 'van phong', 'công ty', 'cong ty'],
            'keywords': ['cơm', 'cơm gà', 'cơm tấm', 'mì quảng', 'bún', 'bánh mì'],
            'advice': 'Bữa trưa nên ưu tiên món no, dễ ăn, giao đi làm tiện.',
        },
        {
            'key': 'dinner',
            'triggers': ['ăn tối', 'an toi', 'bữa tối', 'bua toi', 'tối nay', 'toi nay'],
            'keywords': ['cơm', 'mì quảng', 'bún bò', 'phở', 'hải sản', 'lẩu'],
            'advice': 'Bữa tối có thể chọn món ấm bụng, no vừa phải; nếu ăn muộn thì tránh quá dầu.',
        },
        {
            'key': 'healthy',
            'triggers': ['healthy', 'lành mạnh', 'lanh manh', 'eat clean', 'giảm cân', 'giam can', 'ít calo', 'it calo', 'nhẹ bụng', 'nhe bung'],
            'keywords': ['salad', 'nước ép', 'sinh tố', 'cơm gà', 'cháo', 'súp'],
            'advice': 'Nếu muốn ăn nhẹ/healthy, Bee ưu tiên món ít dầu, có rau hoặc đồ uống trái cây.',
        },
        {
            'key': 'spicy',
            'triggers': ['cay', 'đậm vị', 'dam vi', 'đậm đà', 'dam da'],
            'keywords': ['bún bò', 'mì quảng', 'bún mắm', 'lẩu', 'gà cay', 'bánh xèo'],
            'advice': 'Bạn đang thèm vị đậm/cay thì các món nước hoặc món miền Trung sẽ hợp hơn.',
        },
        {
            'key': 'sweet',
            'triggers': ['ngọt', 'ngot', 'tráng miệng', 'trang mieng', 'ăn vặt', 'an vat', 'buồn miệng', 'buon mieng'],
            'keywords': ['trà sữa', 'chè', 'kem', 'sinh tố', 'bánh', 'cà phê'],
            'advice': 'Nếu muốn ăn vặt/ngọt, Bee chọn món dễ ăn, hợp để nhâm nhi.',
        },
        {
            'key': 'group',
            'triggers': ['nhóm', 'nhom', 'gia đình', 'gia dinh', 'nhiều người', 'nhieu nguoi', 'tụi tôi', 'tui toi', 'team'],
            'keywords': ['lẩu', 'nướng', 'hải sản', 'gà', 'pizza', 'bánh xèo'],
            'advice': 'Đi nhóm nên chọn món dễ chia phần hoặc nhiều topping để ai cũng ăn được.',
        },
        {
            'key': 'coffee_drink',
            'triggers': ['tỉnh táo', 'tinh tao', 'buồn ngủ', 'buon ngu', 'cà phê', 'cafe', 'uống nước', 'uong nuoc'],
            'keywords': ['cà phê', 'trà sữa', 'trà đào', 'trà chanh', 'nước ép', 'sinh tố'],
            'advice': 'Nếu cần tỉnh táo hoặc muốn uống nhẹ, Bee ưu tiên đồ uống dễ đặt và phổ biến.',
        },
    ]

    for ctx in contexts:
        if any(t in q for t in ctx['triggers']):
            return ctx

    if any(w in q for w in ['đói', 'doi', 'phân vân', 'phan van', 'gì cũng được', 'gi cung duoc', 'tùy', 'tuy']):
        return {
            'key': 'general',
            'keywords': ['cơm', 'bún', 'phở', 'mì quảng', 'bánh mì', 'trà sữa'],
            'advice': 'Bạn đang phân vân thì Bee chọn các món dễ ăn, phổ biến và có nhiều quán đang bán.',
        }
    return {}


def q_contextual_foods(context: dict, limit: int = 8) -> list:
    foods, seen = [], set()
    for keyword in context.get('keywords', []):
        for item in q_foods(keyword, limit=4):
            fid = item.get('id')
            if fid in seen:
                continue
            seen.add(fid)
            foods.append(item)
            if len(foods) >= limit:
                return foods
    return foods or q_random(limit)


def _contextual_recommendation_response(context: dict, foods: list) -> str:
    lines = []
    for i, food in enumerate((foods or [])[:3], 1):
        title = food.get('title', '')
        price = float(food.get('price', 0))
        restaurant = food.get('restaurant', '')
        category = food.get('category', '')
        suffix = f" ({category})" if category else ""
        lines.append(f"{i}. {title}{suffix} — {price:,.0f}đ tại {restaurant}")
    sample = "\n".join(lines)
    if sample:
        sample = "\n\nBee lọc từ món thật trong database:\n" + sample
    return (
        f"{context.get('advice', 'Bee chọn vài món hợp với nhu cầu của bạn.')}"
        f"{sample}\n\nBạn có thể bấm món bên dưới để đặt, hoặc nói rõ hơn như: dưới 50k, ít cay, gần Hải Châu."
    )


def _quick_action_result(query: str) -> dict:
    """Deterministic responses for FE quick action buttons."""
    q = (query or '').lower().strip()
    if not q:
        return {}

    if any(k in q for k in ['bán chạy', 'ban chay', 'hot nhất', 'hot nhat', 'trending', 'phổ biến']):
        foods = q_top_foods(days=30, limit=8)
        if not foods:
            foods = q_random(8)
        return {
            'kind': 'foods',
            'action_type': 'quick:bestseller',
            'response': f"🔥 Đây là các món bán chạy Bee lấy từ dữ liệu đơn hàng gần đây. Bạn chọn món để thêm vào giỏ nhé!",
            'foods': foods,
        }

    if any(k in q for k in ['dưới 50', 'duoi 50', '50 nghìn', '50k', 'rẻ', 'gia re', 'giá rẻ']):
        foods = q_by_price(50000, limit=8)
        return {
            'kind': 'foods',
            'action_type': 'quick:under_50k',
            'response': "💰 Bee lọc các món dưới 50,000đ từ database nè. Vừa túi tiền mà vẫn dễ đặt.",
            'foods': foods,
        }

    if any(k in q for k in ['đồ lạnh', 'do lanh', 'mát', 'mat mat', 'giải nhiệt', 'giai nhiet']):
        ctx = {
            'key': 'quick_cold_drinks',
            'keywords': ['trà đào', 'trà chanh', 'nước ép', 'sinh tố', 'trà sữa', 'chè'],
            'advice': '🧊 Bee chọn các món mát/dễ uống từ database, hợp lúc trời nóng hoặc muốn giải nhiệt.',
        }
        foods = q_contextual_foods(ctx, limit=8)
        return {'kind': 'foods', 'action_type': 'quick:cold', 'response': _contextual_recommendation_response(ctx, foods), 'foods': foods}

    if any(k in q for k in ['bún', 'bun', 'phở', 'pho']):
        foods = []
        seen = set()
        for kw in ['bún', 'phở']:
            for item in q_foods(kw, limit=6):
                fid = item.get('id')
                if fid not in seen:
                    seen.add(fid)
                    foods.append(item)
        return {
            'kind': 'foods',
            'action_type': 'quick:noodles',
            'response': "🍜 Bee tìm các món bún/phở đang bán trong database. Món nước nóng, dễ ăn nè.",
            'foods': foods[:8],
        }

    if any(k in q for k in ['cơm', 'com']):
        foods = q_foods('cơm', limit=8)
        return {
            'kind': 'foods',
            'action_type': 'quick:rice',
            'response': "🍚 Đây là các món cơm Bee tìm được từ database. Hợp khi bạn muốn ăn no chắc bụng.",
            'foods': foods,
        }

    if any(k in q for k in ['đồ uống', 'do uong', 'uống', 'uong', 'cà phê', 'cafe']):
        ctx = {
            'key': 'quick_drinks',
            'keywords': ['cà phê', 'trà sữa', 'trà đào', 'trà chanh', 'nước ép', 'sinh tố'],
            'advice': '☕ Bee lọc các món đồ uống thật trong database cho bạn.',
        }
        foods = q_contextual_foods(ctx, limit=8)
        return {'kind': 'foods', 'action_type': 'quick:drinks', 'response': _contextual_recommendation_response(ctx, foods), 'foods': foods}

    return {}


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


def q_sizes_mon_an(id_mon_an: int) -> list:
    """Lấy sizes của một món ăn."""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id, ten_size AS title, gia_cong_them AS extra_price
            FROM mon_an_sizes
            WHERE id_mon_an = %s
            ORDER BY id
        """, (id_mon_an,))
        rows = [_to_serializable(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"q_sizes_mon_an error: {e}")
        return []


# ─── Helpers cho SELECTING_OPTIONS ─────────────────────────────────────────

def _build_options_lines(sizes: list, selected_size: dict = None) -> str:
    if not sizes:
        return "  (không có tùy chọn size)"
    lines = []
    for i, s in enumerate(sizes, 1):
        extra = s.get('extra_price', 0)
        extra_str = f" (+{extra:,.0f}đ)" if extra > 0 else (f" ({extra:,.0f}đ)" if extra < 0 else " (miễn phí)")
        marker = " ✅" if selected_size and selected_size.get('id') == s.get('id') else ""
        lines.append(f"  {i}. {s['title']}{extra_str}{marker}")
    return "\n".join(lines)


def _build_topping_lines(toppings: list, selected_ids: list = None) -> str:
    if not toppings:
        return "  (không có topping)"
    lines = []
    for i, t in enumerate(toppings, 1):
        price = t.get('price', 0)
        marker = " ✅" if (selected_ids is not None and t.get('id') in selected_ids) else ""
        lines.append(f"  {i}. {t['title']} — {price:,.0f}đ{marker}")
    return "\n".join(lines)


def _options_response(reply: str, pf: dict, pending_sizes: list, pending_toppings: list,
                       selected_size: dict, chosen_toppings: list, step: str,
                       current_total: float, skip_size_step: bool = False, **_ignored) -> dict:
    """Build a SELECTING_OPTIONS response with structured data for frontend interactive UI."""
    base_price = float(pf.get('price', 0))
    size_extra = float(selected_size.get('extra_price', 0)) if selected_size else 0
    return {
        'response': reply,
        'foods': [],
        'restaurants': [],
        'ai_powered': False,
        # ── Structured data cho frontend interactive UI ──
        'size_options': [
            {'id': s.get('id'), 'title': s.get('title'), 'extra_price': float(s.get('extra_price', 0))}
            for s in pending_sizes
        ],
        'topping_options': [
            {'id': t.get('id'), 'title': t.get('title'), 'price': float(t.get('price', 0))}
            for t in pending_toppings
        ],
        'options_step': step,
        'skip_size_step': skip_size_step,  # True = đã chọn size rồi, bỏ qua size UI
        'pending_food': {
            'id': pf.get('id'),
            'title': pf.get('title', ''),
            'price': base_price,
        },
        'selected_size': {
            'id': selected_size.get('id') if selected_size else None,
            'title': selected_size.get('title') if selected_size else None,
            'extra_price': size_extra,
        } if selected_size else None,
        'chosen_toppings': [
            {'id': t.get('id'), 'title': t.get('title'), 'price': float(t.get('price', 0))}
            for t in chosen_toppings
        ],
        'current_total': current_total,
    }


def _parse_topping_numbers(q: str, all_toppings: list) -> list:
    """Parse topping selection from query. Returns list of indices or None."""
    q = q.strip()
    if not all_toppings:
        return []
    # "1,3,5" or "1 3 5" or "1" formats
    for sep in [',', ';', ' ']:
        parts = q.split(sep)
        if len(parts) > 1 or (len(parts) == 1 and parts[0].isdigit()):
            nums = [p.strip() for p in parts if p.strip().isdigit()]
            if nums:
                return [int(n) - 1 for n in nums]
    # single "1" without separator
    if q.isdigit():
        return [int(q) - 1]
    return None


def _commit_pending_to_cart(sess, sess_id: str):
    """Move pending food + size + toppings into the cart."""
    pf = sess.get('pending_food')
    if not pf:
        sess['trang_thai'] = STATE_VIEWING_MENU
        return _flask_jsonify({'response': "Món đã hết hạn, bạn chọn lại món nhé.", 'foods': sess.get('menu_items', []), 'restaurants': [], 'ai_powered': False})

    food_id = pf.get('id')
    food_title = pf.get('title', '')
    food_price = float(pf.get('price', 0))
    food_rest_id = pf.get('id_quan_an') or sess.get('restaurant_id')
    food_rest = pf.get('restaurant') or sess.get('restaurant_name', '')

    size = sess.get('pending_size')
    toppings = sess.get('pending_toppings', [])

    # Tính giá cuối cùng
    final_price = food_price
    if size:
        final_price += float(size.get('extra_price', 0))
    for tp in toppings:
        final_price += float(tp.get('price', 0))

    # Check existing: cùng món + cùng size + cùng topping list → tăng số lượng
    cart = sess['cart']
    matched_idx = -1
    if size or toppings:
        matched_idx = next((i for i, c in enumerate(cart)
                           if c.get('id') == food_id
                           and c.get('size_id') == (size.get('id') if size else None)
                           and c.get('topping_ids') == sorted([t['id'] for t in toppings])), -1)
    else:
        matched_idx = next((i for i, c in enumerate(cart)
                           if c.get('id') == food_id
                           and not c.get('size_id')
                           and not c.get('topping_ids')), -1)

    cart_item = {
        'id': food_id,
        'title': food_title,
        'base_price': food_price,
        'price': final_price,
        'so_luong': 1,
        'id_quan_an': food_rest_id,
        'restaurant': food_rest,
        'size': size,
        'toppings': toppings,
    }

    if matched_idx >= 0:
        cart[matched_idx]['so_luong'] += 1
    else:
        cart.append(cart_item)

    # Gán restaurant context
    if food_rest_id and not sess.get('restaurant_id'):
        sess['restaurant_id'] = food_rest_id
        sess['restaurant_name'] = food_rest

    # Reset pending
    sess['pending_food'] = None
    sess['pending_size'] = None
    sess['pending_toppings'] = []
    sess['available_toppings'] = []
    sess['pending_sizes'] = []
    sess['options_step'] = 'select_size'

    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
    sess['total_amount'] = total

    lines = []
    for i, c in enumerate(cart):
        extras = []
        if c.get('size'):
            extras.append(f"[{c['size']['title']}]")
        if c.get('toppings'):
            extras.append(f"+{len(c['toppings'])} topping")
        extra_str = f" {' '.join(extras)}" if extras else ""
        lines.append(f"  {i+1}. {c['title']}{extra_str} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ")
    cart_text = "\n".join(lines)

    reply = (
        f"✅ Đã thêm '{food_title}' vào đơn!\n\n"
        f"📦 Giỏ hàng:\n{cart_text}\n\n"
        f"💰 Tổng: {total:,.0f}đ\n\n"
        f"Bạn muốn làm gì tiếp?"
    )
    sess['trang_thai'] = STATE_VIEWING_MENU
    logger.info(f"✅ [SELECTING_OPTIONS] committed → VIEWING_MENU | cart={len(cart)}")
    return _flask_jsonify({
        'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False,
        # Clear interactive state so frontend does NOT show pendingOptions card
        'size_options': [], 'topping_options': [], 'options_step': None,
        'is_cart_commit': True,
        'buttons': [
            {'text': '➕ Thêm món', 'type': 'message', 'message': 'thêm món', 'silent': True},
            {'text': '📋 Xem menu', 'type': 'message', 'message': 'menu', 'silent': True},
            {'text': '💳 Thanh toán', 'type': 'message', 'message': 'thanh toán', 'silent': True},
        ],
    })


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


def call_be_api(path: str, method: str = "GET", json_data: dict = None) -> dict:
    """Gọi BE API endpoint, trả dict hoặc None nếu lỗi."""
    import urllib.request
    import urllib.error
    try:
        be_url = os.getenv('BE_API_URL', 'https://be.foodbee.io.vn')
        payload = json.dumps(json_data or {}).encode('utf-8') if json_data else None
        req = urllib.request.Request(
            f"{be_url}{path}",
            data=payload,
            headers={'Content-Type': 'application/json'},
            method=method
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try:
            return json.loads(body)
        except Exception:
            logger.error(f"call_be_api HTTP {e.code}: {body[:200]}")
            return None
    except Exception as e:
        logger.error(f"call_be_api error: {e}")
        return None


def tao_don_hang_moi(
    khach_hang_id: Optional[int],
    ho_ten: str,
    sdt: str,
    dia_chi: str,
    id_quan_an: int,
    mon_an_list: list,
    phuong_thuc_thanh_toan: str = 'tien_mat',
    xu_su_dung: int = 0,
    id_voucher: int = None,
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
        if xu_su_dung > 0:
            payload['xu_su_dung'] = xu_su_dung
        if id_voucher:
            payload['id_voucher'] = id_voucher

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
            logger.info(f"✅ Tạo đơn hàng qua BE API: {data['ma_don_hang']} | tổng={data['tong_tien']:,}đ | checkout={bool(data.get('checkout_url'))} | qr_code={'có' if data.get('qr_code') else 'KHÔNG'}")
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
                "Tìm QUÁN ĂN theo tên quán cụ thể. "
                "Gọi khi khách nói 'quán X', 'tìm quán X', 'quán nào bán X'. "
                "KHÔNG gọi khi câu hỏi chỉ có giá tiền hoặc ngân sách (dưới Xk, trên Xk). "
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
    # ── Voucher & Xu ─────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "apply_voucher",
            "description": (
                "Áp mã voucher giảm giá vào đơn hàng hiện tại. "
                "Gọi khi: khách nói 'nhập mã GIAM20', 'áp voucher X', 'dùng mã Y', "
                "'có mã giảm giá', 'mã khuyến mãi'. "
                "TRẢ VỀ: số tiền giảm và tổng mới. "
                "CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP VÀ CÓ MÓN TRONG GIỎ."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ma_code": {"type": "string", "description": "Mã voucher (viết hoa, không khoảng trắng)"}
                },
                "required": ["ma_code"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "su_dung_xu",
            "description": (
                "Dùng điểm XU tích lũy để thanh toán đơn hàng. "
                "Gọi khi: khách nói 'dùng xu', 'dùng điểm', 'thanh toán bằng xu', "
                "'trừ xu', 'xu của tôi'. "
                "1 XU = 1đ giảm. Tối đa dùng = số dư XU hiện có. "
                "CHỈ HOẠT ĐỘNG KHI ĐÃ ĐĂNG NHẬP VÀ CÓ MÓN TRONG GIỎ."
            ),
            "parameters": {
                "type": "object",
                "properties": {}
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
            return [], f"Không tìm thấy món nào tên '{kw}' trên FoodBee nha! Bạn thử từ khóa khác nhé!"
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
            cart_item = {
                'id': food.get('id'),
                'id_quan_an': food.get('id_quan_an'),
                'title': food.get('title'),
                'price': float(food.get('price', 0)),
                'restaurant': food.get('restaurant', ''),
                'so_luong': so_luong,
            }
            session['cart'].append(cart_item)
            session['mon_an_list'].append({
                'id_mon_an': food.get('id'),
                'ten_mon': food.get('title'),
                'so_luong': so_luong,
                'gia': float(food.get('price', 0))
            })
            session['id_quan_an'] = food.get('id_quan_an')
            session['restaurant_id'] = food.get('id_quan_an')
            session['restaurant_name'] = food.get('restaurant', '')
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
            khach_hang_id=khach_hang_id or None,
            ho_ten=ho_ten,
            sdt=sdt,
            dia_chi=dia_chi,
            id_quan_an=session['id_quan_an'],
            mon_an_list=session['mon_an_list'],
            phuong_thuc_thanh_toan=phuong_thuc,
            xu_su_dung=session.get('xu_su_dung') or 0,
            id_voucher=(session.get('voucher') or {}).get('id'),
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

    elif name == "apply_voucher":
        ma_code = args.get("ma_code", "").strip().upper()
        if not ma_code:
            return [], "Bạn chưa cung cấp mã voucher. Gõ 'nhập mã GIAM20' để áp dụng nhé!"
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập FoodBee để sử dụng voucher nhé! 🐝"

        session = get_order_session(str(khach_hang_id))
        rest_id = session.get('restaurant_id')
        cart = session.get('cart', [])
        if not cart:
            return [], "Giỏ hàng trống. Bạn thêm món vào đơn trước rồi mới dùng voucher được nhé!"

        tong_tien = sum(c.get('price', 0) * c.get('so_luong', 1) for c in cart)

        try:
            # Gọi endpoint public mới — không cần auth token
            resp = call_be_api(
                "/chatbot/validate-voucher",
                method="POST",
                json_data={
                    "ma_code": ma_code,
                    "id_quan_an": rest_id or 0,
                    "khach_hang_id": khach_hang_id,
                    "tong_tien_hang": int(tong_tien),
                }
            )
            if resp and resp.get('status'):
                v = resp['data'].get('voucher', {})
                so_tien_giam = resp['data'].get('so_tien_giam', 0)
                tong_sau_giam = resp['data'].get('tong_tien_sau_giam', tong_tien)
                session['voucher'] = {
                    'id': v.get('id'),
                    'ma_code': v.get('ma_code'),
                    'so_tien_giam': so_tien_giam,
                    'ten_voucher': v.get('ten_voucher'),
                }
                session['tong_tien_sau_voucher'] = tong_sau_giam
                return [], (
                    f"✅ Áp voucher '{ma_code}' thành công!\n"
                    f"  🎟️ {v.get('ten_voucher', '')}\n"
                    f"  💸 Giảm: {so_tien_giam:,.0f}đ\n"
                    f"  💰 Tổng mới: {tong_sau_giam:,.0f}đ"
                )
            else:
                msg = resp.get('message', 'Voucher không hợp lệ hoặc đã hết hạn.') if resp else 'Không thể kết nối BE.'
                return [], f"❌ {msg}"
        except Exception as e:
            logger.error(f"apply_voucher error: {e}")
            return [], "Không thể áp dụng voucher lúc này. Bạn thử lại sau nhé!"

    elif name == "su_dung_xu":
        if not khach_hang_id:
            return [], "Bạn cần đăng nhập FoodBee để dùng XU thanh toán nhé! 🐝"

        vi = q_kiem_tra_vi(khach_hang_id)
        if not vi:
            return [], "Không lấy được thông tin ví. Bạn thử đăng nhập lại nhé!"

        diem_xu = vi.get('diem_xu', 0)
        session = get_order_session(str(khach_hang_id))
        cart = session.get('cart', [])
        if not cart:
            return [], "Giỏ hàng trống. Bạn thêm món vào đơn trước rồi mới dùng XU được nhé!"

        tong_tien = sum(c.get('price', 0) * c.get('so_luong', 1) for c in cart)
        phi_ship = 15000
        tong_sau_voucher = session.get('tong_tien_sau_voucher', tong_tien)
        so_tien_con_lai = tong_sau_voucher + phi_ship

        xu_co_the_dung = min(diem_xu, so_tien_con_lai)
        session['xu_su_dung'] = xu_co_the_dung
        session['xu_tich_luy'] = int((tong_sau_voucher + phi_ship - xu_co_the_dung) * 0.05)
        return [], (
            f"✅ Đã dùng {xu_co_the_dung:,} XU cho đơn hàng!\n"
            f"  💰 Số dư XU: {diem_xu - xu_co_the_dung:,} XU\n"
            f"  🎁 XU tích lũy cho đơn này: +{session['xu_tich_luy']:,} XU"
        )

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
        voucher_info = ""
        if sess.get('voucher'):
            v = sess['voucher']
            tong = (sess.get('tong_tien_sau_voucher') or total) + phi_ship
            voucher_info = (
                f"  🎟️ Voucher ({v.get('ma_code','')}) đã áp: -{v.get('so_tien_giam',0):,.0f}đ\n"
            )
        xu_info = ""
        if sess.get('xu_su_dung'):
            xu_info = f"  💰 Đã dùng XU: -{sess['xu_su_dung']:,.0f}đ\n"
        state_note = (
            f"⚠️ ĐANG Ở BƯỚC CHỌN THANH TOÁN.\n"
            f"  Giỏ hàng:\n{cart_lines}\n"
            f"  Quán: {rest_name or '(chưa chọn quán)'}\n"
            f"  Tiền hàng: {total:,.0f}đ\n"
            f"  Phí ship: {phi_ship:,.0f}đ\n"
            f"{voucher_info}"
            f"{xu_info}"
            f"  TỔNG: {tong:,.0f}đ\n"
            f"  Giao đến: {address or '(chưa có địa chỉ)'}\n"
            f"  Người nhận: {customer_name or '(chưa có)'}, {phone or ''}\n"
            f"Khách đã xác nhận đơn → hỏi chọn 1️⃣ Tiền mặt hoặc 2️⃣ PayOS QR.\n"
            f"Nếu khách hỏi về voucher hoặc xu → gọi tool apply_voucher / su_dung_xu tương ứng.\n"
            f"NÊN chủ động gợi ý khách nhập mã voucher nếu chưa có."
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
- KHUYẾN MÃI: Có hỗ trợ **VOUCHER** (mã giảm giá) và **XU** tích lũy
  → Khách nói 'mã GIAM20', 'nhập mã', 'áp voucher' → gọi tool apply_voucher
  → Khách nói 'dùng xu', 'thanh toán bằng xu', 'xu của tôi' → gọi tool su_dung_xu
  → 1 XU = 1đ giảm, tối đa dùng = số dư XU hiện có
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


def run_agent(query: str, history: list, user_context: dict, sess: dict = None,
              last_foods: list = None, personal_ctx: str = ''):
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
    # Inject personalization context into system prompt
    if personal_ctx:
        system_prompt += "\n\n" + personal_ctx

    # Inject extracted food keyword so AI uses the CORRECT keyword for tool calls
    extracted = _extract_food_after_prefix(query)
    if extracted:
        system_prompt += f"\n\n[LỆNH BẮT BUỘC] Khi khách nói 'đặt {extracted}', gọi tool 'tim_kiem_mon_an' với keyword='{extracted}' (KHÔNG phải '{query}')"
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
    order_intent_keywords = ['đặt', 'order', 'mua', 'giao hàng', 'ship', 'chuyển khoản', 'thanh toán', 'giúp', 'cho', 'lấy', 'mang', 'đặt giúp']

    query_lower = query.lower()
    has_food_intent = any(kw in query_lower for kw in food_intent_keywords)
    logger.info(f"DEBUG: query={query_lower!r} has_food_intent={has_food_intent}")

    # ═══════════════════════════════════════════════════════════════
    #  DỮ LIỆU TÊN QUÁN (dùng chung cho view_menu và order_intent)
    # ═══════════════════════════════════════════════════════════════
    known_restaurants = sorted([
        'highlands coffee', 'highlands', 'highland', 'hl',
        'xôi chiên nguyên', 'xôi chiên',
        'phở hàng bò', 'phở hàng trì',
        'bún bò huế', 'bún bò',
        'bánh mì huỳnh', 'bánh mì',
        'trà sữa', 'gong cha', 'koi', 'the coffee house', 'coffee house',
        'starbucks', 'sbux', 'sb',
        'cộng cà phê', 'cộng', 'concaf',
        'phúc long', 'phuc long',
        'pasteur', 'pasteurized',
        'mì quảng', 'mì quảng ngon',
        'cf', 'cafe', 'cà phê', 'caphe',
    ], key=len, reverse=True)

    restaurant_aliases = {
        'xôi': 'xôi chiên nguyên',
        'bún bò': 'bún bò huế',
        'bún bò huế': 'bún bò huế',
        'phở': 'phở',
        'bánh mì': 'bánh mì',
        'cf': 'highlands',
        'cafe': 'highlands',
        'cà phê': 'cà phê',
        'highlands': 'highlands',
        'highland': 'highlands',
        'coffee': 'highlands',
        'hl': 'highlands',
    }

    # ═══════════════════════════════════════════════════════════════
    #  INTENT: XEM MENU QUAN — xử lý trước auto-search
    # ═══════════════════════════════════════════════════════════════
    import re
    view_menu_patterns = [
        re.compile(r'^(?:tôi|bạn|cho tôi|cho bạn)?\s*muốn\s+(?:xem\s+)?(?:menu\s+)?(?:quán\s+)?(.+)', re.IGNORECASE),
        re.compile(r'^(?:cho\s+(?:tôi|bạn)\s+)?xem\s+menu\s+(?:củ[ae]\s+)?(.+)', re.IGNORECASE),
        re.compile(r'^menu\s+(?:củ[ae]\s+)?(.+)', re.IGNORECASE),
        re.compile(r'^(.+?)\s*menu$', re.IGNORECASE),
        re.compile(r'^(?:cho\s+(?:tôi|bạn)\s+)?xem\s+quán\s+(.+)', re.IGNORECASE),
        re.compile(r'menu\s+(?:củ[ae]\s+)?(.+)', re.IGNORECASE),
        re.compile(r'xem\s+menu\s+(?:củ[ae]\s+)?(.+)', re.IGNORECASE),
        re.compile(r'xem\s+quán\s+(.+)', re.IGNORECASE),
        re.compile(r'quán\s+(?:này|đó)\s+(?:bán\s+)?gì', re.IGNORECASE),
        re.compile(r'(.+)\s+bán\s+gì', re.IGNORECASE),
        re.compile(r'xem\s+(.+)\s+menu', re.IGNORECASE),
        re.compile(r'menu\s*(?:quán\s*)?(bún bò|bún bò huế)', re.IGNORECASE),
        re.compile(r'(bún bò|bún bò huế)\s*menu', re.IGNORECASE),
        re.compile(r'menu\s*(?:highlands|highland|hl)', re.IGNORECASE),
        re.compile(r'(?:highlands|highland|hl)\s*menu', re.IGNORECASE),
        re.compile(r'quán\s+(?:này|đó)\s+(?:có\s+)?gì', re.IGNORECASE),
    ]
    menu_rest_name = None
    menu_search_keyword = None

    for pat in view_menu_patterns:
        m = pat.search(query)
        if m:
            candidate = m.group(1).strip() if m.lastindex >= 1 else ''
            if not candidate:
                continue
            stopwords = {'của', 'tôi', 'bạn', 'quán', 'này', 'đó', 'mình', 'menu', 'bán', 'gì', 'có', 'xem', 'muốn', 'cho'}
            matched_rests = []
            for rest in known_restaurants:
                if rest in candidate.lower():
                    matched_rests.append(rest)
            if matched_rests:
                best_match = matched_rests[0]
                menu_rest_name = best_match
                menu_search_keyword = restaurant_aliases.get(best_match, best_match)
                break
            tokens = [t for t in candidate.split() if t not in stopwords and len(t) >= 2]
            if tokens:
                menu_rest_name = ' '.join(tokens)
                menu_search_keyword = menu_rest_name
                break

    if menu_rest_name:
        logger.info(f"🔍 Intent: view_menu | rest='{menu_rest_name}' | search='{menu_search_keyword}'")
        try:
            rests, _ = execute_tool('tim_quan_an', {'keyword': menu_search_keyword, 'limit': 3}, khach_hang_id)
            if rests:
                rest = rests[0]
                rest_id = rest.get('id') or rest.get('id_quan_an')
                menu_items = q_restaurant_menu(rest_id, limit=15)
                rest_name = rest.get('name', menu_rest_name)
                if menu_items:
                    top3 = menu_items[:3]
                    intro = f"🏪 Đây là menu của **{rest_name}** nè!\n"
                    for i, m in enumerate(top3):
                        intro += f"\n• **{m.get('title','')}** — {float(m.get('price',0)):,.0f}đ"
                    intro += f"\n\n...và {len(menu_items)-3} món khác. Nhắn tên món hoặc số để Bee thêm vào đơn nhé!"
                    return intro, menu_items, []
                else:
                    return f"Quán '{rest_name}' hiện chưa có menu trên FoodBee nha bạn!", [], []
            else:
                return f"😕 Bee không tìm thấy quán nào tên '{menu_rest_name}' trên FoodBee. Bạn thử tên khác nhé!", [], []
        except Exception as e:
            logger.warning(f"⚠️ view_menu error: {e}")

    # ═══════════════════════════════════════════════════════════════
    #  INTENT: ĐẶT HÀNG / XEM MENU TỪ QUÁN CỤ THỂ
    # ═══════════════════════════════════════════════════════════════
    should_order = any(kw in query_lower for kw in order_intent_keywords)
    detected_restaurant = None
    for rest_name in known_restaurants:
        if rest_name in query_lower:
            detected_restaurant = rest_name
            break

    if detected_restaurant:
        logger.info(f"🔍 Intent: restaurant='{detected_restaurant}' | order={should_order}")
        try:
            search_kw = restaurant_aliases.get(detected_restaurant, detected_restaurant)
            rests, _ = execute_tool('tim_quan_an', {'keyword': search_kw, 'limit': 5}, khach_hang_id)
            if rests:
                rest = rests[0]
                rest_id = rest.get('id') or rest.get('id_quan_an')
                rest_name = rest.get('name', detected_restaurant.title())
                menu_items = q_restaurant_menu(rest_id, limit=15)
                if menu_items:
                    top_items = menu_items[:6]
                    lines = []
                    for i, m in enumerate(top_items, 1):
                        price = float(m.get('price', 0))
                        lines.append(f"**{i}. {m.get('title','')}** — {price:,.0f}đ")
                    reply = f"☕ Quán **{rest_name}** có menu sau:\n\n" + "\n".join(lines)
                    if len(menu_items) > 6:
                        reply += f"\n\n...và {len(menu_items) - 6} món khác."
                    reply += "\n\nBạn muốn đặt món nào? Nhắn **số** hoặc **tên món** nhé! 🐝"
                    return reply, menu_items, []
                else:
                    return f"Quán '{rest_name}' hiện chưa có menu trên FoodBee nha bạn! 😕", [], []
            else:
                import random
                suggestions = [
                    f"😕 Bee không tìm thấy quán '{detected_restaurant.title()}' trên FoodBee. Bạn thử tên khác nhé!",
                    f"Hmm... Bee chưa có quán '{detected_restaurant.title()}' trong dữ liệu. Thử 'tìm cà phê' để xem các quán cafe nhé!",
                ]
                return random.choice(suggestions), [], []
        except Exception as e:
            logger.warning(f"⚠️ Restaurant intent error: {e}")

    # ═══════════════════════════════════════════════════════════════
    #  AUTO-SEARCH: Tìm QUÁN trước khi tìm món
    # ═══════════════════════════════════════════════════════════════
    if has_food_intent:
        import unicodedata
        query_nfd = unicodedata.normalize('NFD', query_lower)

        # ── ƯU TIÊN: extract full food name sau "đặt"/"order"/"mua" ──────
        search_keyword = _extract_food_after_prefix(query)

        # ── Fallback: keyword list (khi không match pattern trên) ───────
        if not search_keyword:
            food_keywords_list = [
                'bún', 'phở', 'cơm', 'mì', 'bánh', 'cháo', 'gà', 'lẩu',
                'nướng', 'pizza', 'burger', 'trà sữa', 'cà phê', 'cf', 'cafe', 'kem', 'chè',
                'thịt', 'cá', 'hải sản', 'ốc', 'bạch tuộc',
                'xôi', 'bún bò', 'bún thịt', 'cơm tấm', 'mì quảng',
                'sinh tố', 'nước', 'trà'
            ]
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

        # ── BƯỚC 0: Detect price query → gọi q_by_price trực tiếp ──
        price_keywords = ['dưới', 'trên', 'khoảng', 'tầm', 'ngân sách']
        has_price_intent = any(pk in query_lower for pk in price_keywords)
        if not has_price_intent:
            has_price_intent = bool(re.search(r'(món |mang |ăn )?dưới', query_lower))
        if not has_price_intent:
            has_price_intent = bool(re.search(r'(rẻ|giá rẻ|bình dân)', query_lower))

        if has_price_intent:
            max_price = 50000  # default
            m = re.search(r'(\d+)[\s.,]*k\b', query_lower)
            if not m:
                m = re.search(r'(\d+)[\s.,]*(nghìn|ngàn)', query_lower)
            if not m:
                m = re.search(r'(\d+)[\s.,]*đồng', query_lower)
            if m:
                max_price = float(m.group(1)) * 1000

            logger.info(f"🔍 Price search detected: max_price={max_price}")
            try:
                price_foods = q_by_price(max_price, 8)
                if price_foods:
                    logger.info(f"✅ Price search: {len(price_foods)} món ≤ {max_price:,}đ")
                    top3 = price_foods[:3]
                    intro = f"Ơi, Bee tìm được {len(price_foods)} món dưới {int(max_price):,}đ nè! 🏷️\n\n"
                    for i, f in enumerate(top3):
                        intro += f"{i+1}. **{f.get('title','')}** — {float(f.get('price',0)):,.0f}đ | {f.get('restaurant','')}\n"
                    intro += "\nBạn nhắn **số thứ tự** (1, 2...) để thêm món vào đơn nhé!"
                    return intro, price_foods, []
                else:
                    intro = f"😢 Trong hệ thống hiện chưa có món nào dưới {int(max_price):,}đ nha bạn! Bạn thử hỏi 'món dưới 20k' hoặc 'dưới 30k' xem sao nhé!"
                    return intro, [], []
            except Exception as e:
                logger.warning(f"⚠️ Price search failed: {e}")

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

    # ── Deduplicate restaurants & foods ───────────────────────────
    logger.info(f"DEBUG: all_restaurants={len(all_restaurants)} items | all_foods={len(all_foods)} items")
    seen_r, uniq_rests = [], []
    for r in all_restaurants:
        rid = r.get("id")
        if rid not in seen_r:
            seen_r.append(rid)
            uniq_rests.append(r)

    seen_f, uniq_foods = [], []
    for f in all_foods:
        fid = f.get("id")
        if fid not in seen_f:
            seen_f.append(fid)
            uniq_foods.append(f)

    # ── Priority 1: price intent → return foods ──────────────────
    if uniq_foods and (uniq_rests or uniq_foods):
        price_keywords = ['dưới', 'trên', 'khoảng', 'tầm', 'ngân sách', 'giá', 'rẻ', 'đắt']
        has_price_intent = any(pk in query_lower for pk in price_keywords)
        if not has_price_intent:
            has_price_intent = bool(re.search(r'\d+\s*(k|nghìn|ngàn|trăm)', query_lower))

        if has_price_intent:
            top3 = uniq_foods[:3]
            intro = f"Ơi, Bee tìm được {len(uniq_foods)} món dưới giá bạn yêu cầu nè! 🏷️\n\n"
            for i, f in enumerate(top3):
                intro += f"• **{f.get('title','')}** — {float(f.get('price',0)):,.0f}đ | {f.get('restaurant','')}\n"
            intro += "\nBạn nhắn **số thứ tự** (1, 2...) để thêm món vào đơn nhé!"
            logger.info(f"✅ Price search: returning {len(uniq_foods)} food cards (overriding restaurants)")
            return intro, uniq_foods[:8], []

    # ── Priority 2: restaurants → return restaurant cards ──────
    if uniq_rests:
        should_order_intent = any(kw in query_lower for kw in ['đặt', 'order', 'mua', 'tìm', 'tôi muốn'])

        # Auto-add: chỉ có 1 quán + user có intent đặt → auto thêm top food vào cart
        if should_order_intent and len(uniq_rests) == 1 and uniq_foods:
            rest = uniq_rests[0]
            rest_id = rest.get('id') or rest.get('id_quan_an')
            rest_name = rest.get('name', '')
            top_food = uniq_foods[0]
            food_id = top_food.get('id')
            food_title = top_food.get('title', '')
            food_price = float(top_food.get('price', 0))
            food_rest_id = top_food.get('id_quan_an') or rest_id

            # Build reply (will be shown by caller)
            intro = (
                f"✅ Bee đặt giúp bạn: **{food_title}** ({food_price:,.0f}đ)\n"
                f"🏪 tại **{rest_name}**\n\n"
                f"📦 Giỏ hàng: {food_title} x1 — {food_price:,.0f}đ\n"
                f"💰 Tổng: {food_price:,.0f}đ\n\n"
                f"📋 Cung cấp thông tin giao hàng nhé:\n"
                f"  • Họ tên người nhận: ...\n  • SĐT: ...\n  • Địa chỉ giao: ..."
            )
            logger.info(f"✅ AUTO-ADD: '{food_title}' from single restaurant '{rest_name}'")
            return intro, [top_food], []

        # Auto-add: chỉ có 1 food result → auto thêm vào cart
        if should_order_intent and len(uniq_foods) == 1:
            top_food = uniq_foods[0]
            food_id = top_food.get('id')
            food_title = top_food.get('title', '')
            food_price = float(top_food.get('price', 0))
            rest_name = top_food.get('restaurant', '')

            intro = (
                f"✅ Bee đặt giúp bạn: **{food_title}** ({food_price:,.0f}đ)\n"
                f"🏪 tại **{rest_name}**\n\n"
                f"📦 Giỏ hàng: {food_title} x1 — {food_price:,.0f}đ\n"
                f"💰 Tổng: {food_price:,.0f}đ\n\n"
                f"📋 Cung cấp thông tin giao hàng nhé:\n"
                f"  • Họ tên người nhận: ...\n  • SĐT: ...\n  • Địa chỉ giao: ..."
            )
            logger.info(f"✅ AUTO-ADD: '{food_title}' (single food result)")
            return intro, [top_food], []

        top_rests = uniq_rests[:6]
        intro = f"Ơi, Bee tìm được {len(uniq_rests)} quán ngon cho bạn nè! 🏪\n\n"
        for i, r in enumerate(top_rests):
            intro += f"{i+1}. **{r.get('name','')}**\n"
            intro += f"   📍 {r.get('address','')} | ⭐ {r.get('rating','?')} | 🍽️ {r.get('so_mon',0)} món\n"
        intro += f"\nBạn nhắn **số thứ tự** (1, 2...) hoặc **tên quán** để Bee xem menu nhé!"
        logger.info(f"✅ Returning {len(uniq_rests)} restaurant cards (auto-search)")
        return intro, [], uniq_rests[:6]

    # ── Priority 3: foods only → return food cards ─────────────
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
        clicked_rest  = data.get('clicked_restaurant')

        if not query and not clicked_food and not clicked_rest:
            return _flask_jsonify({'response': "Bee chào bạn! Bạn cần Bee hỗ trợ gì hôm nay nè? 🐝🍔", 'foods': [], 'restaurants': [], 'ai_powered': True})

        kh_id     = user_context.get('khach_hang_id')
        is_logged = user_context.get('is_logged_in', False)
        kh_name   = user_context.get('khach_hang_name', '')
        # ── Client session ID: dùng session_id FE gửi lên (UUID cố định cho mỗi tab/browser)
        #    Kết hợp với kh_id để đảm bảo mỗi khách có session riêng.
        #    Nếu không có → tạo mới hoặc dùng 'guest' (chỉ khi kh_id = None).
        #    LƯU Ý: KHÔNG dùng session_token vì nó không cố định qua backend restarts.
        client_session_id = data.get('session_id') or ''
        # Guest không login → dùng client_session_id; logged-in user → dùng kh_id (luôn ổn định)
        sess_id = str(kh_id or client_session_id) if (kh_id or client_session_id) else 'guest'
        logger.info(f"📩 Bee [{len(history)} ctx | logged={is_logged} | kh={kh_name or kh_id}] sess={sess_id[:20]} → {query[:60]}")

        # ── Init / get order session ──────────────────────────────
        sess = get_order_session(sess_id)
        state = sess.get('trang_thai', STATE_SEARCHING_FOOD)
        last_foods = sess.get('last_foods', [])

        # ── Load personalization context ───────────────────────────
        user_profile = get_user_profile(kh_id) if kh_id else {}
        personal_ctx = build_personalization_context(user_profile)

        # ── Quick action guard ──────────────────────────────────────
        # Quick buttons are always visible in FE. If the user taps them while
        # checkout/delivery state is active, still return the requested data
        # instead of treating the text as delivery info.
        quick_result = _quick_action_result(query)
        if quick_result and state not in (STATE_SELECTING_OPTIONS, STATE_CONFIRMING_ORDER, STATE_SELECTING_PAYMENT):
            foods = quick_result.get('foods') or []
            restaurants = quick_result.get('restaurants') or []
            if foods:
                sess['last_foods'] = foods
                sess['trang_thai'] = STATE_FOOD_CARD
            elif restaurants:
                sess['restaurant_list'] = restaurants
                sess['trang_thai'] = STATE_SELECTING_RESTAURANT
            response_text = quick_result.get('response') or "Bee tìm được vài gợi ý cho bạn nè!"
            save_chatbot_interaction(
                khach_hang_id=kh_id,
                session_id=sess_id,
                action_type=quick_result.get('action_type', 'quick_action'),
                query_text=query,
                response_text=response_text,
                foods_shown=foods,
                restaurants_shown=restaurants,
                restaurant_name=sess.get('restaurant_name', ''),
                cart=sess.get('cart', []),
                state_before=state,
                state_after=sess.get('trang_thai', state),
                ai_powered=False,
            )
            return _flask_jsonify({
                'response': response_text,
                'foods': foods,
                'restaurants': restaurants,
                'ai_powered': False,
            })

        # ── Smart wellness recommendation guard ──────────────────────
        # Queries like "hôm nay tôi ốm, mệt, gợi ý món" need DB-backed
        # recommendations even when the LLM is unavailable.
        if (
            query
            and _is_wellness_recommendation_intent(query)
            and state not in (STATE_SELECTING_OPTIONS, STATE_CONFIRMING_ORDER, STATE_SELECTING_PAYMENT)
        ):
            foods = q_wellness_foods(query, limit=8)
            sess['last_foods'] = foods
            sess['trang_thai'] = STATE_FOOD_CARD if foods else STATE_SEARCHING_FOOD
            response_text = _wellness_recommendation_response(query, foods)
            save_chatbot_interaction(
                khach_hang_id=kh_id,
                session_id=sess_id,
                action_type='wellness_recommendation',
                query_text=query,
                response_text=response_text,
                foods_shown=foods,
                restaurants_shown=[],
                restaurant_name=sess.get('restaurant_name', ''),
                cart=sess.get('cart', []),
                state_before=state,
                state_after=sess.get('trang_thai', state),
                ai_powered=False,
            )
            return _flask_jsonify({
                'response': response_text,
                'foods': foods,
                'restaurants': [],
                'ai_powered': False,
            })

        # ── Smart contextual recommendation guard ───────────────────
        # Handles common advisory questions with DB-backed results:
        # hot weather, rainy day, breakfast/lunch/dinner, healthy,
        # spicy/sweet cravings, group meals, coffee/drinks...
        smart_context = _smart_recommendation_context(query)
        if (
            smart_context
            and state not in (STATE_SELECTING_OPTIONS, STATE_CONFIRMING_ORDER, STATE_SELECTING_PAYMENT)
        ):
            foods = q_contextual_foods(smart_context, limit=8)
            sess['last_foods'] = foods
            sess['trang_thai'] = STATE_FOOD_CARD if foods else STATE_SEARCHING_FOOD
            response_text = _contextual_recommendation_response(smart_context, foods)
            save_chatbot_interaction(
                khach_hang_id=kh_id,
                session_id=sess_id,
                action_type=f"contextual_recommendation:{smart_context.get('key', 'general')}",
                query_text=query,
                response_text=response_text,
                foods_shown=foods,
                restaurants_shown=[],
                restaurant_name=sess.get('restaurant_name', ''),
                cart=sess.get('cart', []),
                state_before=state,
                state_after=sess.get('trang_thai', state),
                ai_powered=False,
            )
            return _flask_jsonify({
                'response': response_text,
                'foods': foods,
                'restaurants': [],
                'ai_powered': False,
            })

        # ── Global payment-method guard ──────────────────────────────
        # Payment buttons must never fall through to FAQ/search fallback.
        q_payment = query.lower().strip()
        is_payment_method_click = q_payment in {
            'tiền mặt', 'tien mat', 'cod', 'payos', 'payos qr', 'qr',
            'chuyển khoản', 'chuyen khoan', 'online',
            'thanh toán tiền mặt', 'thanh toan tien mat',
            'thanh toán payos', 'thanh toan payos',
        }
        if is_payment_method_click and state != STATE_SELECTING_OPTIONS:
            cart = sess.get('cart', [])
            if not cart:
                return _flask_jsonify({
                    'response': "🛒 Giỏ hàng trống nên chưa thể thanh toán. Bạn thêm món trước nhé!",
                    'foods': [],
                    'restaurants': [],
                    'ai_powered': False,
                })
            if not sess.get('customer_name') or not sess.get('phone') or not sess.get('address'):
                sess['trang_thai'] = STATE_ENTERING_DELIVERY
                total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                reply = (
                    f"📋 Để thanh toán, Bee cần thông tin giao hàng nhé!\n\n"
                    f"📦 Giỏ hàng: {len(cart)} món — {total:,.0f}đ\n\n"
                )
                if not sess.get('customer_name'): reply += "  • Họ tên người nhận: ...\n"
                if not sess.get('phone'):         reply += "  • SĐT người nhận: ...\n"
                if not sess.get('address'):       reply += "  • Địa chỉ giao hàng: ...\n"
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            sess['trang_thai'] = STATE_SELECTING_PAYMENT
            reply, done = _parse_payment_choice(query, sess, kh_id)
            payment_obj = None
            response_text = reply
            if '__PAYMENT__' in reply:
                parts = reply.split('__PAYMENT__', 1)
                response_text = parts[0].strip()
                try:
                    payment_obj = json.loads(parts[1].strip())
                except Exception as e:
                    logger.error(f"❌ Parse __PAYMENT__ JSON failed (global guard): {e}")
            resp_data = {
                'response': response_text,
                'foods': [],
                'restaurants': [],
                'ai_powered': False,
            }
            if payment_obj:
                resp_data['payment'] = payment_obj
            elif not done:
                resp_data['buttons'] = _payment_action_buttons(sess, kh_id, is_logged)
            return _flask_jsonify(resp_data)

        # ── Global delivery-info guard ───────────────────────────────
        # If the user types "Name, phone, address" while a cart exists, handle it
        # as checkout info even if the conversation state drifted.
        if (
            query
            and sess.get('cart')
            and state not in (STATE_SELECTING_OPTIONS, STATE_CONFIRMING_ORDER, STATE_SELECTING_PAYMENT)
            and re.search(r'0\d{9,10}', query)
            and (',' in query or any(k in query.lower() for k in ['đường', 'quận', 'phường', 'huyện', 'đà nẵng', 'da nang']))
        ):
            reply_delivery, done_delivery = _parse_delivery_info(query, sess)
            if reply_delivery:
                cart = sess.get('cart', [])
                if done_delivery:
                    sess['trang_thai'] = STATE_CONFIRMING_ORDER
                    confirm_reply = _build_confirm_order_prompt(sess)
                    return _flask_jsonify({
                        'response': confirm_reply,
                        'foods': [],
                        'restaurants': [],
                        'ai_powered': False,
                        'buttons': _confirm_order_buttons(),
                    })
                sess['trang_thai'] = STATE_ENTERING_DELIVERY
                total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                cart_lines = "\n".join([
                    f"  {i+1}. {c.get('title','')} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                    for i, c in enumerate(cart)
                ])
                response_text = (
                    f"✅ Thông tin đã cập nhật!\n\n"
                    f"📦 Giỏ hàng:\n{cart_lines}\n\n"
                    f"💰 Tổng: {total:,.0f}đ\n"
                    f"👤 Người nhận: {sess.get('customer_name') or '(chưa có)'}\n"
                    f"📞 SĐT: {sess.get('phone') or '(chưa có)'}\n"
                    f"📍 Địa chỉ: {sess.get('address') or '(chưa có)'}\n\n"
                    + reply_delivery
                )
                return _flask_jsonify({'response': response_text, 'foods': [], 'restaurants': [], 'ai_powered': False})

        # Auto-fill delivery info từ user profile (chỉ khi đã login và chưa có thông tin)
        # VÀ luôn clear delivery info từ đơn cũ khi bắt đầu đơn mới (tránh nhớ nhầm)
        if state == STATE_SEARCHING_FOOD:
            if kh_id and user_profile:
                if not sess.get('customer_name') and user_profile.get('preferred_name'):
                    sess['customer_name'] = user_profile['preferred_name']
                if not sess.get('phone') and user_profile.get('preferred_phone'):
                    sess['phone'] = user_profile['preferred_phone']
                if not sess.get('address') and user_profile.get('preferred_address'):
                    sess['address'] = user_profile['preferred_address']
            else:
                # Guest hoặc chưa có profile → clear delivery info từ đơn trước
                sess['customer_name'] = None
                sess['phone'] = None
                sess['address'] = None

        # ══════════════════════════════════════════════════════════
        #  PRESERVE RESTAURANT CONTEXT — "đặt X" from VIEWING_MENU / SELECTING_RESTAURANT
        #  When user says "đặt [food]" while viewing a restaurant's menu (either via
        #  FOOD_CARD state or run_agent view_menu), search THAT restaurant's menu FIRST.
        #  This prevents "đặt Trà Sữa" from returning results from OTHER restaurants.
        # ══════════════════════════════════════════════════════════
        _order_prefixes = ['đặt ', 'order ', 'mua ', 'ship ', 'tôi muốn đặt', 'tôi muốn order', 'tôi muốn mua', 'muốn đặt', 'muốn order', 'muốn mua']
        is_order_intent = any(query.lower().startswith(p) for p in _order_prefixes) or any(p in query.lower() for p in ['đặt món', 'order món', 'mua món'])
        if is_order_intent:
            ctx_items = sess.get('menu_items') or sess.get('last_foods') or []
            ctx_rest_id   = sess.get('restaurant_id')
            ctx_rest_name = sess.get('restaurant_name', '')
            if ctx_items and ctx_rest_id:
                food_kw = None
                q_clean = query.strip()
                for prefix in ['tôi muốn đặt ', 'tôi muốn order ', 'tôi muốn mua ', 'muốn đặt ', 'muốn order ', 'muốn mua ']:
                    if q_clean.lower().startswith(prefix):
                        food_kw = q_clean[len(prefix):].strip()
                        food_kw = re.sub(r'^món:?\s*', '', food_kw, flags=re.IGNORECASE).strip()
                        break
                if not food_kw:
                    for prefix in ['đặt ', 'order ', 'mua ', 'ship ']:
                        if q_clean.lower().startswith(prefix):
                            food_kw = q_clean[len(prefix):].strip()
                            food_kw = re.sub(r'^món:?\s*', '', food_kw, flags=re.IGNORECASE).strip()
                            break
                if not food_kw:
                    m = re.search(r'(?:đặt|order|mua)\s+món:?\s+(.+)', q_clean, re.IGNORECASE)
                    if m:
                        food_kw = m.group(1).strip()
                if food_kw:
                    words = food_kw.split()
                    trailing = {'nhé', 'nha', 'ạ', 'ơi', 'một', 'với', 'và', 'có', 'không', 'bạn', 'ở', 'món', 'con', 'đi', 'rồi', 'cho'}
                    while words and (words[-1].lower() in trailing or len(words[-1]) <= 2):
                        words.pop()
                    food_kw = ' '.join(words)

                if food_kw and len(food_kw) >= 2:
                    food_kw_lower = food_kw.lower()
                    logger.info(f"🔍 [PRESERVE CTX] searching '{food_kw}' in menu of '{ctx_rest_name}' ({ctx_rest_id}) | items={len(ctx_items)}")
                    for m in ctx_items:
                        mn = (m.get('title') or '').lower()
                        mn_words = set(mn.split())
                        kw_words = set(food_kw_lower.split())
                        # Exact match → Full substring in menu name → ALL words of kw appear in menu name
                        matched = (mn == food_kw_lower or
                                   food_kw_lower in mn or
                                   (kw_words and kw_words <= mn_words) or
                                   (len(kw_words) >= 2 and kw_words <= mn_words))
                        if matched:
                            food_id    = m.get('id')
                            food_price = float(m.get('price', 0))
                            food_title = m.get('title', '')

                            # ── Kiểm tra size & topping ──
                            sizes = q_sizes_mon_an(food_id)
                            toppings = q_topping_mon_an(ctx_rest_id) if ctx_rest_id else []
                            has_options = bool(sizes or toppings)

                            sess['pending_food'] = {
                                'id': food_id, 'title': food_title, 'price': food_price,
                                'id_quan_an': ctx_rest_id, 'restaurant': ctx_rest_name,
                            }
                            sess['pending_size'] = None
                            sess['pending_toppings'] = []
                            sess['available_toppings'] = toppings
                            sess['options_step'] = 'select_size'

                            if has_options:
                                sess['pending_sizes'] = sizes
                                sess['trang_thai'] = STATE_SELECTING_OPTIONS
                                sess['options_step'] = 'select_size'
                                sizes_lines = _build_options_lines(sizes)
                                reply = (
                                    f"🍽️ Món bạn chọn: **{food_title}** — {food_price:,.0f}đ\n\n"
                                    f"📏 **CHỌN SIZE** (nhắn số 1, 2, 3...):\n{sizes_lines}\n\n"
                                    f"🍯 Topping có sẵn:\n{_build_topping_lines(toppings)}\n\n"
                                    f"(Không cần topping thì nhấn **\"Xong\"** để bỏ qua)"
                                )
                                logger.info(f"✅ [PRESERVE CTX] '{food_title}' → size/topping options | state → SELECTING_OPTIONS")
                                return _flask_jsonify({
                                    'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False,
                                    # ── Structured data cho frontend interactive UI ──
                                    'size_options': [{'id': s.get('id'), 'title': s.get('title'), 'extra_price': float(s.get('extra_price', 0))} for s in sizes],
                                    'topping_options': [{'id': t.get('id'), 'title': t.get('title'), 'price': float(t.get('price', 0))} for t in toppings],
                                    'options_step': 'select_size',
                                    'pending_food': {'id': food_id, 'title': food_title, 'price': float(food_price)},
                                })

                            # Không có size/topping → add trực tiếp
                            sess['cart'].append({
                                'id': food_id, 'title': food_title,
                                'price': food_price, 'base_price': food_price,
                                'so_luong': 1, 'id_quan_an': ctx_rest_id, 'restaurant': ctx_rest_name,
                                'size': None, 'toppings': [],
                            })
                            total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in sess['cart'])
                            sess['total_amount'] = total
                            sess['trang_thai'] = STATE_ENTERING_DELIVERY
                            lines = [
                                f"  {i+1}. {c['title']} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                                for i, c in enumerate(sess['cart'])
                            ]
                            reply = (
                                f"✅ Đã thêm '{food_title}' vào đơn!\n\n"
                                f"📦 Giỏ hàng:\n" + "\n".join(lines) + f"\n\n"
                                f"💰 Tổng: {total:,.0f}đ\n\n"
                                f"📋 Cung cấp thông tin giao hàng nhé:\n"
                                f"  • Họ tên người nhận: ...\n"
                                f"  • SĐT người nhận: ...\n"
                                f"  • Địa chỉ giao hàng: ..."
                            )
                            logger.info(f"✅ [PRESERVE CTX] direct add '{food_title}' → ENTERING_DELIVERY | cart={len(sess['cart'])}")
                            return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
                # Not found in current restaurant's menu → fall through to normal search
                            reply = (
                                f"✅ Đã thêm '{m.get('title')}' vào đơn!\n\n"
                                f"📦 Giỏ hàng:\n" + "\n".join(lines) + f"\n\n"
                                f"💰 Tổng: {total:,.0f}đ\n\n"
                                f"📋 Cung cấp thông tin giao hàng nhé:\n"
                                f"  • Họ tên người nhận: ...\n"
                                f"  • SĐT người nhận: ...\n"
                                f"  • Địa chỉ giao hàng: ..."
                            )
                            logger.info(f"✅ [PRESERVE CTX] direct add '{m.get('title')}' → ENTERING_DELIVERY | cart={len(sess['cart'])}")
                            return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
                # Not found in current restaurant's menu → fall through to normal search
                # MUST clear pending_food so frontend doesn't show stale options UI
                if sess.get('pending_food'):
                    logger.info(f"🔍 [PRESERVE CTX] '{food_kw}' not found in ctx → clearing pending_food, letting AI search")
                    sess['pending_food'] = None
                    sess['pending_size'] = None
                    sess['pending_toppings'] = []
                    sess['available_toppings'] = []
                    sess['pending_sizes'] = []
                    sess['options_step'] = 'select_size'

        # ══════════════════════════════════════════════════════════
        #  FOOD CARD CLICK → add to cart (MUST run BEFORE is_new_order_intent)
        #  When user clicks a food card, FE sends both message + clicked_food.
        #  We handle clicked_food first so the correct item is added to cart,
        #  not a DB search result that would show duplicate cards.
        # ══════════════════════════════════════════════════════════
        logger.info(f"🐝 [DEBUG] clicked_food={clicked_food} | query='{query[:60]}' | state={state}")
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
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # Kiểm tra size & topping trước khi add vào giỏ
            sizes = q_sizes_mon_an(food_id)
            id_quan_an = food_rest_id or sess.get('restaurant_id')
            toppings = q_topping_mon_an(id_quan_an) if id_quan_an else []
            has_options = bool(sizes or toppings)

            sess['pending_food'] = {
                'id': food_id, 'title': food_title, 'price': food_price,
                'id_quan_an': food_rest_id, 'restaurant': food_rest,
            }
            sess['pending_size'] = None
            sess['pending_toppings'] = []  # save to session so NEXT request can use it
            sess['available_toppings'] = toppings
            sess['options_step'] = 'select_size'
            sess['restaurant_id'] = food_rest_id or sess.get('restaurant_id')
            sess['restaurant_name'] = food_rest or sess.get('restaurant_name', '')
            # Keep the full restaurant menu. Previously this was overwritten with
            # only the clicked food, so "Xem menu" showed a single item.
            existing_menu = sess.get('menu_items') or []
            existing_rest_ids = {
                item.get('id_quan_an') or item.get('restaurant_id')
                for item in existing_menu
                if item.get('id_quan_an') or item.get('restaurant_id')
            }
            should_reload_menu = (
                not existing_menu
                or len(existing_menu) <= 1
                or (food_rest_id and existing_rest_ids and food_rest_id not in existing_rest_ids)
            )
            if should_reload_menu and sess.get('restaurant_id'):
                full_menu = q_restaurant_menu(sess['restaurant_id'], limit=30)
                sess['menu_items'] = full_menu or existing_menu or [{
                    'id': food_id, 'title': food_title, 'price': food_price,
                    'id_quan_an': food_rest_id, 'restaurant': food_rest,
                }]

            if has_options:
                sess['pending_sizes'] = sizes
                sess['trang_thai'] = STATE_SELECTING_OPTIONS
                sizes_lines = _build_options_lines(sizes)
                reply = (
                    f"🍽️ Món bạn chọn: **{food_title}** — {food_price:,.0f}đ\n\n"
                    f"📏 **CHỌN SIZE** (nhắn số 1, 2, 3...):\n{sizes_lines}\n\n"
                    f"🍯 Topping có sẵn:\n{_build_topping_lines(toppings)}\n\n"
                    f"(Không cần topping thì nhấn **\"Xong\"** để bỏ qua)"
                )
                logger.info(f"✅ Food card click → size/topping options shown | state → SELECTING_OPTIONS | sizes={len(sizes)} toppings={len(toppings)}")
                return _flask_jsonify({
                    'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False,
                    'size_options': [{'id': s.get('id'), 'title': s.get('title'), 'extra_price': float(s.get('extra_price', 0))} for s in sizes],
                    'topping_options': [{'id': t.get('id'), 'title': t.get('title'), 'price': float(t.get('price', 0))} for t in toppings],
                    'options_step': 'select_size',
                    'pending_food': {'id': food_id, 'title': food_title, 'price': float(food_price)},
                })

            # Không có size/topping → add trực tiếp vào giỏ
            sess['cart'].append({
                'id': food_id, 'title': food_title, 'price': food_price,
                'base_price': food_price, 'so_luong': 1,
                'id_quan_an': food_rest_id, 'restaurant': food_rest,
                'size': None, 'toppings': [],
            })

            if food_rest_id and not sess.get('restaurant_id'):
                sess['restaurant_id']   = food_rest_id
                sess['restaurant_name'] = food_rest

            total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in sess['cart'])
            sess['total_amount'] = total

            lines = [f"{i+1}. {c['title']} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                     for i, c in enumerate(sess['cart'])]
            cart_text = "\n".join(lines)

            sess['trang_thai'] = STATE_ENTERING_DELIVERY

            reply = (f"✅ Đã thêm '{food_title}' vào đơn!\n"
                     f"\n📦 Giỏ hàng:\n{cart_text}\n"
                     f"\n💰 Tổng: {total:,.0f}đ\n\n"
                     f"📋 Cung cấp thông tin giao hàng nhé:\n"
                     f"  • Họ tên người nhận: ...\n"
                     f"  • SĐT: ...\n"
                     f"  • Địa chỉ giao: ...")

            logger.info(f"✅ Food card click → direct add (no options) | state → ENTERING_DELIVERY | cart={len(sess['cart'])}")
            return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
        #  "ĐẶT MÓN" INTENT — bypass AI, call DB directly
        #  Handles: "tôi muốn đặt X", "order X", "mua X"
        # ══════════════════════════════════════════════════════════
        q_lower = query.lower()
        is_new_order_intent = (
            q_lower.startswith('đặt ') or
            q_lower.startswith('order ') or
            q_lower.startswith('mua ') or
            q_lower.startswith('ship ') or
            'đặt món' in q_lower or
            'order món' in q_lower or
            'mua món' in q_lower or
            q_lower.startswith('tôi muốn đặt') or
            q_lower.startswith('tôi muốn order') or
            q_lower.startswith('tôi muốn mua') or
            q_lower.startswith('muốn đặt') or
            q_lower.startswith('muốn order') or
            q_lower.startswith('muốn mua')
        )

        # Reset state + delivery info khi user bắt đầu search mới
        # SKIP nếu đang ở SELECTING_OPTIONS: guard sẽ xử lý riêng, không reset pending_size
        if is_new_order_intent and state not in (STATE_SEARCHING_FOOD, STATE_SELECTING_OPTIONS):
            logger.info(f"🐝 [ORDER INTENT] resetting session state {state} → SEARCHING_FOOD")
            sess['trang_thai'] = STATE_SEARCHING_FOOD
            sess['customer_name'] = None
            sess['phone'] = None
            sess['address'] = None
            sess['cart'] = []
            sess['voucher'] = None
            sess['xu_su_dung'] = 0
            state = STATE_SEARCHING_FOOD

        if is_new_order_intent:
            food_kw = None
            # ── Extract food name from query ──────────────────────────
            q_clean = query.strip()
            # Pattern 1: "tôi muốn đặt [food]"
            for prefix in ['tôi muốn đặt ', 'tôi muốn order ', 'tôi muốn mua ',
                           'muốn đặt ', 'muốn order ', 'muốn mua ']:
                if q_clean.lower().startswith(prefix):
                    food_kw = q_clean[len(prefix):].strip()
                    # Remove "món:" or "món" after keyword
                    food_kw = re.sub(r'^món:?\s*', '', food_kw, flags=re.IGNORECASE).strip()
                    break
            # Pattern 2: "đặt [food]", "order [food]", "mua [food]"
            if not food_kw:
                for prefix in ['đặt ', 'order ', 'mua ', 'ship ']:
                    if q_clean.lower().startswith(prefix):
                        food_kw = q_clean[len(prefix):].strip()
                        food_kw = re.sub(r'^món:?\s*', '', food_kw, flags=re.IGNORECASE).strip()
                        break
            # Pattern 3: "đặt món [food]", "order món [food]"
            if not food_kw:
                m = re.search(r'(?:đặt|order|mua)\s+món:?\s+(.+)', q_clean, re.IGNORECASE)
                if m:
                    food_kw = m.group(1).strip()

            # Clean trailing particles
            if food_kw:
                words = food_kw.split()
                trailing = {'nhé', 'nha', 'ạ', 'ơi', 'một', 'với', 'và', 'có',
                           'không', 'bạn', 'ở', 'món', 'con', 'đi', 'rồi', 'cho'}
                while words and (words[-1].lower() in trailing or len(words[-1]) <= 2):
                    words.pop()
                food_kw = ' '.join(words)

            if food_kw and len(food_kw) >= 2:
                logger.info(f"🔍 [DIRECT] food search for: '{food_kw}'")
                try:
                    foods = q_foods(food_kw, limit=6)
                    rests = q_restaurants(food_kw, limit=6)
                    if foods:
                        sess['last_foods'] = foods
                        sess['trang_thai'] = STATE_FOOD_CARD
                        reply = (
                            f"🍜 Bee tìm được **{len(foods)} món** '{food_kw}' cho bạn nè!\n"
                            f"👉 Nhấn vào món bên dưới hoặc nhắn **số** (1, 2...) để thêm vào đơn nhé!"
                        )
                        return _flask_jsonify({'response': reply, 'foods': foods, 'restaurants': [], 'ai_powered': False})
                    elif rests:
                        sess['restaurant_list'] = rests
                        sess['prev_restaurant_keyword'] = food_kw
                        sess['trang_thai'] = STATE_SELECTING_RESTAURANT
                        top3 = rests[:3]
                        lines = [f"  {i+1}. **{r.get('name','')}** | 📍 {r.get('address','')}"
                                 for i, r in enumerate(top3)]
                        reply = (
                            f"🍜 Bee tìm được {len(rests)} quán '{food_kw}' cho bạn nè!\n\n"
                            + "\n".join(lines)
                            + f"\n\n👉 Nhắn **số** (1, 2...) để xem menu nhé!"
                        )
                        return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': rests, 'ai_powered': False})
                    else:
                        reply = f"😕 Không tìm thấy món nào tên '{food_kw}' trên FoodBee. Bạn thử từ khóa khác nhé!"
                        return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
                except Exception as e:
                    logger.error(f"❌ Direct food search failed: {e}")

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
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # Build concise intro — let food cards display the full menu
            intro = (
                f"🏪 Đây là menu của **{rest_name}** nè! "
                f"**{len(menu_items)} món** đang có sẵn. "
                f"Nhấn vào món để thêm vào đơn nhé!"
            )

            logger.info(f"✅ Restaurant click → {len(menu_items)} menu items | state → VIEWING_MENU")
            return _flask_jsonify({
                'response': intro,
                'foods': menu_items,
                'restaurants': [],
                'selected_restaurant': clicked_rest,
                'ai_powered': False,
            })

        # ══════════════════════════════════════════════════════════
        # ══════════════════════════════════════════════════════════
        #  STATE: VIEWING_MENU
        # ══════════════════════════════════════════════════════════
        if state == STATE_VIEWING_MENU:
            q_lower = query.lower()
            q_clean = q_lower.strip()
            menu_items = sess.get('menu_items', [])
            cart = sess.get('cart', [])

            # ── Button actions from cart summary ───────────────────────
            if q_clean in ['thêm món', 'them mon', 'thêm', 'mua thêm', 'đặt thêm', 'chon mon', 'chọn món']:
                if menu_items:
                    reply = "🍔 Bạn muốn thêm món nào? Chọn trong menu bên dưới nhé!"
                    return _flask_jsonify({
                        'response': reply,
                        'foods': menu_items,
                        'restaurants': [],
                        'ai_powered': False,
                        'selected_restaurant': {
                            'id': sess.get('restaurant_id'),
                            'name': sess.get('restaurant_name', ''),
                        },
                    })
                reply = "Bạn muốn thêm món gì? Nhắn tên món hoặc tên quán cho Bee nhé!"
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            if q_clean in ['menu', 'xem menu', 'coi menu', 'hiện menu', 'mở menu']:
                if menu_items:
                    reply = f"📋 Menu hiện tại của **{sess.get('restaurant_name','quán')}** đây. Bạn chọn món để thêm vào giỏ nhé!"
                    return _flask_jsonify({
                        'response': reply,
                        'foods': menu_items,
                        'restaurants': [],
                        'ai_powered': False,
                        'selected_restaurant': {
                            'id': sess.get('restaurant_id'),
                            'name': sess.get('restaurant_name', ''),
                        },
                    })
                reply = "Bee chưa có menu hiện tại. Bạn muốn xem menu quán nào?"
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Ưu tiên: "thanh toán" từ VIEWING_MENU — chuyển sang ENTERING_DELIVERY ──
            thanh_toan_kw = ['thanh toán', 'chuyển khoản', 'payos', 'qr',
                             'tiền mặt', 'cod', 'thanh toán online', 'thanh toán nào',
                             'hình thức thanh toán', 'giao hàng', 'giao hang', 'ship hàng', 'đặt hàng']
            if any(k in q_lower for k in thanh_toan_kw):
                if not cart:
                    reply = "Giỏ hàng trống nên chưa thể thanh toán được! Bạn thêm món trước nhé! 🐝"
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
                sess['trang_thai'] = STATE_ENTERING_DELIVERY
                total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                reply = (
                    f"📋 Để thanh toán, Bee cần thông tin giao hàng nhé!\n\n"
                    f"📦 Giỏ hàng: {len(cart)} món — {total:,.0f}đ\n\n"
                    f"  • Họ tên người nhận: ...\n"
                    f"  • SĐT người nhận: ...\n"
                    f"  • Địa chỉ giao hàng: ...\n\n"
                    f"👉 Cung cấp thông tin giúp Bee rồi gõ 'thanh toán' lại nhé!"
                )
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # Check for cancel / reset
            if any(k in q_lower for k in ['không', 'thôi', 'hủy', 'chọn quán khác', 'đổi quán']):
                clear_order_session(sess_id)
                sess = get_order_session(sess_id)
                reply = "OK bạn ơi! Bạn muốn tìm quán khác không? 🍔"
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # Check if user selected a menu item by number
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

                # ── Kiểm tra size & topping ──
                sizes = q_sizes_mon_an(food_id)
                id_quan_an = food_rest_id or sess.get('restaurant_id')
                toppings = q_topping_mon_an(id_quan_an) if id_quan_an else []
                has_options = bool(sizes or toppings)

                sess['pending_food'] = {
                    'id': food_id, 'title': food_title, 'price': food_price,
                    'id_quan_an': food_rest_id, 'restaurant': food_rest,
                }
                sess['pending_size'] = None
                sess['pending_toppings'] = []
                sess['available_toppings'] = toppings
                sess['options_step'] = 'select_size'

                if has_options:
                    sess['pending_sizes'] = sizes
                    sess['trang_thai'] = STATE_SELECTING_OPTIONS
                    sizes_lines = _build_options_lines(sizes)
                    reply = (
                        f"🍽️ Món bạn chọn: **{food_title}** — {food_price:,.0f}đ\n\n"
                        f"📏 **CHỌN SIZE** (nhắn số 1, 2, 3...):\n{sizes_lines}\n\n"
                        f"🍯 Topping có sẵn:\n{_build_topping_lines(toppings)}\n\n"
                        f"(Không cần topping thì nhấn **\"Xong\"** để bỏ qua)"
                    )
                    logger.info(f"✅ Menu item selected → size/topping options | state → SELECTING_OPTIONS")
                    return _flask_jsonify({
                        'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False,
                        'size_options': [{'id': s.get('id'), 'title': s.get('title'), 'extra_price': float(s.get('extra_price', 0))} for s in sizes],
                        'topping_options': [{'id': t.get('id'), 'title': t.get('title'), 'price': float(t.get('price', 0))} for t in toppings],
                        'options_step': 'select_size',
                        'pending_food': {'id': food_id, 'title': food_title, 'price': float(food_price)},
                    })

                # Không có size/topping → add trực tiếp
                sess['cart'].append({
                    'id': food_id, 'title': food_title, 'price': food_price,
                    'base_price': food_price, 'so_luong': 1,
                    'id_quan_an': food_rest_id, 'restaurant': food_rest,
                    'size': None, 'toppings': [],
                })
                if food_rest_id and not sess.get('restaurant_id'):
                    sess['restaurant_id']   = food_rest_id
                    sess['restaurant_name'] = food_rest

                total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in sess['cart'])
                sess['total_amount'] = total
                lines = [f"{i+1}. {c['title']} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                         for i, c in enumerate(sess['cart'])]
                cart_text = "\n".join(lines)

                sess['trang_thai'] = STATE_ENTERING_DELIVERY
                reply = (f"✅ Đã thêm '{food_title}'!\n"
                         f"\n📦 Giỏ hàng:\n{cart_text}\n"
                         f"\n💰 Tổng: {total:,.0f}đ\n\n"
                         f"📋 Giao hàng đến đâu nhỉ? Cung cấp giúp Bee:\n"
                         f"  • Họ tên: ...\n  • SĐT: ...\n  • Địa chỉ: ...")
                logger.info(f"✅ Menu item selected → direct add | state → ENTERING_DELIVERY")
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # User typed something else → delegate to AI
            try:
                agent_result = run_agent(query, history, user_context, sess, [], personal_ctx)
                if agent_result is None:
                    response_text, foods, restaurants = "", [], []
                else:
                    response_text, foods, restaurants = agent_result
            except Exception as e:
                logger.error(f"❌ run_agent error: {e}")
                response_text, foods, restaurants = "", [], []
            if foods:
                sess['last_foods'] = foods
                
                # Auto-update context if AI returned a menu (all foods from same restaurant)
                r_ids = {f.get('id_quan_an') or f.get('restaurant_id') for f in foods if (f.get('id_quan_an') or f.get('restaurant_id'))}
                if len(r_ids) == 1:
                    r_id = list(r_ids)[0]
                    r_name = foods[0].get('restaurant', '')
                    sess['restaurant_id'] = r_id
                    sess['restaurant_name'] = r_name
                    sess['menu_items'] = foods
                    sess['trang_thai'] = STATE_VIEWING_MENU

            if not response_text:
                response_text = fallback_respond(query)
            return _flask_jsonify({'response': response_text, 'foods': foods, 'restaurants': [], 'ai_powered': True})

        # ══════════════════════════════════════════════════════════
        #  STATE: FOOD_CARD → user saw food search results, selects by number
        # ══════════════════════════════════════════════════════════
        if state == STATE_FOOD_CARD:
            q_lower = query.lower()
            
            # ── Ưu tiên: "thanh toán" từ FOOD_CARD — chuyển sang ENTERING_DELIVERY ──
            thanh_toan_kw = ['thanh toán', 'chuyển khoản', 'payos', 'qr',
                             'tiền mặt', 'cod', 'thanh toán online', 'thanh toán nào',
                             'hình thức thanh toán', 'giao hàng', 'giao hang', 'ship hàng', 'đặt hàng', 'xác nhận đơn', 'xong']
            if any(k in q_lower for k in thanh_toan_kw):
                cart = sess.get('cart', [])
                if not cart:
                    reply = "Giỏ hàng trống nên chưa thể thanh toán được! Bạn thêm món trước nhé! 🐝"
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
                sess['trang_thai'] = STATE_ENTERING_DELIVERY
                total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                reply = (
                    f"📋 Để thanh toán, Bee cần thông tin giao hàng nhé!\n\n"
                    f"📦 Giỏ hàng: {len(cart)} món — {total:,.0f}đ\n\n"
                    f"  • Họ tên người nhận: ...\n"
                    f"  • SĐT người nhận: ...\n"
                    f"  • Địa chỉ giao hàng: ...\n\n"
                    f"👉 Cung cấp thông tin giúp Bee rồi gõ 'thanh toán' lại nhé!"
                )
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
            
            last_foods = sess.get('last_foods', [])

            # ── Check for delivery info FIRST (skip for simple inputs / bot text) ──
            q_stripped = query.strip()
            has_bot_markers = any(c in q_stripped for c in ['₫', '💰', '🚚', '📋', '👤', '📍', '📞', '──'])
            is_simple_input = q_stripped.isdigit() or len(q_stripped) <= 5
            reply_delivery, done_delivery = None, False
            if not is_simple_input and not has_bot_markers:
                reply_delivery, done_delivery = _parse_delivery_info(query, sess)
            if reply_delivery:
                sess['trang_thai'] = STATE_CONFIRMING_ORDER if done_delivery else STATE_ENTERING_DELIVERY
                cart = sess.get('cart', [])
                if cart and done_delivery:
                    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                    cart_lines = "\n".join([
                        f"  {i+1}. {c.get('title','')} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                        for i, c in enumerate(cart)
                    ])
                    response_text = (
                        f"✅ Thông tin đã cập nhật!\n\n"
                        f"📦 Giỏ hàng:\n{cart_lines}\n\n"
                        f"💰 Tổng: {total:,.0f}đ\n"
                        f"👤 Người nhận: {sess.get('customer_name') or '(chưa có)'}\n"
                        f"📞 SĐT: {sess.get('phone') or '(chưa có)'}\n"
                        f"📍 Địa chỉ: {sess.get('address') or '(chưa có)'}\n\n"
                        + reply_delivery
                    )
                else:
                    response_text = reply_delivery
                logger.info(f"🐝 [FOOD_CARD] delivery parsed")
                if done_delivery:
                    return _flask_jsonify({
                        'response': response_text,
                        'foods': [],
                        'restaurants': [],
                        'ai_powered': False,
                        'buttons': _confirm_order_buttons(),
                    })
                return _flask_jsonify({'response': response_text, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Check for cancel / new search ──────────────────────
            if any(k in q_lower for k in ['không', 'thôi', 'hủy', 'tìm khác', 'quán khác']):
                sess['trang_thai'] = STATE_SEARCHING_FOOD
                sess['last_foods'] = []
                reply = "OK bạn ơi! Bạn muốn tìm món gì khác?"
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── User typed "X Y" (size number + topping numbers) → parse & commit directly ──
            # e.g. "1 1" = size 1 + topping 1
            q_parts = query.strip().split()
            if len(q_parts) == 2 and q_parts[0].isdigit() and q_parts[1].isdigit():
                size_idx = int(q_parts[0]) - 1
                tp_idx   = int(q_parts[1]) - 1
                if 0 <= size_idx < len(sizes) and 0 <= tp_idx < len(toppings):
                    chosen_size    = sizes[size_idx]
                    chosen_topping = [toppings[tp_idx]]
                    total_price    = food_price + float(chosen_size.get('extra_price', 0)) + float(chosen_topping[0].get('price', 0))
                    sess['cart'].append({
                        'id': food_id, 'title': food_title, 'price': total_price,
                        'base_price': food_price, 'so_luong': 1,
                        'id_quan_an': food_rest_id, 'restaurant': food_rest,
                        'size': chosen_size, 'toppings': chosen_topping,
                    })
                    if food_rest_id and not sess.get('restaurant_id'):
                        sess['restaurant_id']   = food_rest_id
                        sess['restaurant_name'] = food_rest
                    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in sess['cart'])
                    sess['total_amount'] = total
                    sess['trang_thai']  = STATE_ENTERING_DELIVERY
                    lines = [f"  {i+1}. {c['title']} — {float(c.get('price',0)):,.0f}đ"
                             for i, c in enumerate(sess['cart'])]
                    cart_text = "\n".join(lines)
                    reply = (
                        f"✅ Đã thêm '{food_title}' vào đơn!\n\n"
                        f"📦 Giỏ hàng:\n{cart_text}\n\n"
                        f"💰 Tổng: {total:,.0f}đ\n\n"
                        f"📋 Cung cấp thông tin giao hàng nhé:\n"
                        f"  • Họ tên người nhận: ...\n"
                        f"  • SĐT: ...\n"
                        f"  • Địa chỉ giao: ..."
                    )
                    logger.info(f"✅ [FOOD_CARD] 1-step add (size+topping) | cart={len(sess['cart'])}")
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── User typed a number → add food to cart ─────────────
            q_num = query.strip()
            selected = None
            if q_num.isdigit() and last_foods:
                idx = int(q_num) - 1
                if 0 <= idx < len(last_foods):
                    selected = last_foods[idx]
            else:
                # Try match by food name in last_foods
                for f in last_foods:
                    fn = (f.get('title') or '').lower()
                    if fn and (fn in q_lower or q_lower.strip() == fn):
                        selected = f
                        break

            if not selected:
                them_mon_kw = ['thêm món', 'thêm mons', 'mua thêm', 'thêm', 'đặt món', 'đặt thêm', 'order thêm', 'chọn món']
                if q_lower.strip() in them_mon_kw:
                    if last_foods:
                        reply = (
                            f"🍔 Bạn muốn thêm món gì nhỉ?\n\n"
                            f"👉 Dưới đây là danh sách món ăn, bạn vui lòng chọn món hoặc nhắn số thứ tự nhé!"
                        )
                        return _flask_jsonify({'response': reply, 'foods': last_foods, 'restaurants': [], 'ai_powered': False})
                    else:
                        reply = (
                            f"🍔 Bạn muốn thêm món gì nhỉ?\n\n"
                            f"👉 Vui lòng nhắn **tên món** để Bee thêm vào giỏ cho bạn nhé!\n"
                            f"(Ví dụ: nhắn tên 'Trà Đào')"
                        )
                        return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

                xem_menu_kw = ['menu', 'xem menu', 'coi menu', 'hiện menu', 'mở menu']
                if q_lower.strip() in xem_menu_kw:
                    if last_foods:
                        reply = f"📋 Bee gửi lại danh sách món ăn nhé. Bạn muốn dùng món nào ạ? 👇"
                        return _flask_jsonify({'response': reply, 'foods': last_foods, 'restaurants': [], 'ai_powered': False})
                    else:
                        reply = "Bee chưa có thông tin món ăn lúc này. Bạn muốn tìm món gì cứ nhắn Bee nhé! 🍔"
                        return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            if selected:
                food_id    = selected.get('id')
                food_title = selected.get('title', '')
                food_price = float(selected.get('price', 0))
                food_rest  = selected.get('restaurant', '')
                food_rest_id = selected.get('id_quan_an') or selected.get('restaurant_id')

                # ── Kiểm tra size & topping ──
                sizes = q_sizes_mon_an(food_id)
                id_quan_an = food_rest_id or sess.get('restaurant_id')
                toppings = q_topping_mon_an(id_quan_an) if id_quan_an else []
                has_options = bool(sizes or toppings)

                sess['pending_food'] = {
                    'id': food_id, 'title': food_title, 'price': food_price,
                    'id_quan_an': food_rest_id, 'restaurant': food_rest,
                }
                sess['pending_size'] = None
                sess['pending_toppings'] = []
                sess['available_toppings'] = toppings
                sess['options_step'] = 'select_size'

                if has_options:
                    sess['pending_sizes'] = sizes
                    sess['trang_thai'] = STATE_SELECTING_OPTIONS
                    sizes_lines = _build_options_lines(sizes)
                    reply = (
                        f"🍽️ Món bạn chọn: **{food_title}** — {food_price:,.0f}đ\n\n"
                        f"📏 **CHỌN SIZE** (nhắn số 1, 2, 3...):\n{sizes_lines}\n\n"
                        f"🍯 Topping có sẵn:\n{_build_topping_lines(toppings)}\n\n"
                        f"(Không cần topping thì nhấn **\"Xong\"** để bỏ qua)"
                    )
                    logger.info(f"✅ [FOOD_CARD] food selected → size/topping options | state → SELECTING_OPTIONS")
                    return _flask_jsonify({
                        'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False,
                        'size_options': [{'id': s.get('id'), 'title': s.get('title'), 'extra_price': float(s.get('extra_price', 0))} for s in sizes],
                        'topping_options': [{'id': t.get('id'), 'title': t.get('title'), 'price': float(t.get('price', 0))} for t in toppings],
                        'options_step': 'select_size',
                        'pending_food': {'id': food_id, 'title': food_title, 'price': float(food_price)},
                    })

                # Không có size/topping → add trực tiếp
                sess['cart'].append({
                    'id': food_id, 'title': food_title, 'price': food_price,
                    'base_price': food_price, 'so_luong': 1,
                    'id_quan_an': food_rest_id, 'restaurant': food_rest,
                    'size': None, 'toppings': [],
                })
                if food_rest_id and not sess.get('restaurant_id'):
                    sess['restaurant_id']   = food_rest_id
                    sess['restaurant_name'] = food_rest

                total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in sess['cart'])
                sess['total_amount'] = total
                sess['trang_thai']  = STATE_ENTERING_DELIVERY

                lines = [f"  {i+1}. {c['title']} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                         for i, c in enumerate(sess['cart'])]
                cart_text = "\n".join(lines)
                reply = (
                    f"✅ Đã thêm '{food_title}' vào đơn!\n\n"
                    f"📦 Giỏ hàng:\n{cart_text}\n\n"
                    f"💰 Tổng: {total:,.0f}đ\n\n"
                    f"📋 Cung cấp thông tin giao hàng nhé:\n"
                    f"  • Họ tên người nhận: ...\n"
                    f"  • SĐT: ...\n"
                    f"  • Địa chỉ giao: ..."
                )
                logger.info(f"✅ [FOOD_CARD] food selected → direct add | state → ENTERING_DELIVERY | cart={len(sess['cart'])}")
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── User typed something else → delegate to AI ──────────
            try:
                agent_result = run_agent(query, history, user_context, sess, last_foods, personal_ctx)
                if agent_result is None:
                    response_text, foods, restaurants = "", [], []
                else:
                    response_text, foods, restaurants = agent_result
            except Exception as e:
                logger.error(f"❌ run_agent error: {e}")
                response_text, foods, restaurants = "", [], []

            if foods:
                sess['last_foods'] = foods
                
                # Auto-update context if AI returned a menu (all foods from same restaurant)
                r_ids = {f.get('id_quan_an') or f.get('restaurant_id') for f in foods if (f.get('id_quan_an') or f.get('restaurant_id'))}
                if len(r_ids) == 1:
                    r_id = list(r_ids)[0]
                    r_name = foods[0].get('restaurant', '')
                    sess['restaurant_id'] = r_id
                    sess['restaurant_name'] = r_name
                    sess['menu_items'] = foods
                    sess['trang_thai'] = STATE_VIEWING_MENU
                else:
                    sess['trang_thai'] = STATE_FOOD_CARD

            if not response_text:
                response_text = fallback_respond(query)
            return _flask_jsonify({'response': response_text, 'foods': foods, 'restaurants': [], 'ai_powered': True})

        # ══════════════════════════════════════════════════════════
        #  STATE: SELECTING_OPTIONS → 3 bước: size → topping → confirm
        # ══════════════════════════════════════════════════════════
        if state == STATE_SELECTING_OPTIONS:
            pf = sess.get('pending_food')
            if not pf:
                sess['trang_thai'] = STATE_VIEWING_MENU
                return _flask_jsonify({
                    'response': "Món đã hết hạn, bạn chọn lại món nhé.",
                    'foods': sess.get('menu_items', []), 'restaurants': [], 'ai_powered': False,
                    'options_step': 'select_size',
                })

            # Initialize chosen_toppings BEFORE any early-return paths in the guard
            chosen_toppings = sess.get('pending_toppings', [])

            # ── ENTRY GUARD: đang chọn size/topping mà user nhắn intent đặt món mới hoặc menu → reset & xử lý món mới ──
            q_lower_guard = query.lower()
            _guard_prefixes = ['đặt ', 'order ', 'mua ', 'ship ', 'tôi muốn đặt', 'tôi muốn order', 'tôi muốn mua', 'muốn đặt', 'muốn order', 'muốn mua', 'menu', 'xem menu', 'hủy', 'bỏ qua', 'thôi', 'chọn lại', 'đổi ý']
            _guard_intent = any(q_lower_guard.startswith(p) for p in _guard_prefixes) or any(p in q_lower_guard for p in ['đặt món', 'order món', 'mua món'])
            if _guard_intent:
                ctx_items = sess.get('menu_items') or sess.get('last_foods') or []
                ctx_rest_id = sess.get('restaurant_id')
                ctx_rest_name = sess.get('restaurant_name', '')

                # ── CASE A: Đã chọn size rồi + cùng món → chỉ re-show topping form, KHÔNG reset size ──
                # User đã chọn size (selected_size != None). Nếu food keyword trùng với pending_food
                # → chỉ re-set pending_food + pending_toppings, giữ nguyên selected_size.
                # Fall through sẽ hiện topping form bình thường.
                if selected_size is not None and pf is not None:
                    food_kw = None
                    q_clean = query.strip()
                    for prefix in ['tôi muốn đặt ', 'tôi muốn order ', 'tôi muốn mua ', 'muốn đặt ', 'muốn order ', 'muốn mua ']:
                        if q_clean.lower().startswith(prefix):
                            food_kw = q_clean[len(prefix):].strip()
                            break
                    if not food_kw:
                        for prefix in ['đặt ', 'order ', 'mua ', 'ship ']:
                            if q_clean.lower().startswith(prefix):
                                food_kw = q_clean[len(prefix):].strip()
                                break
                    if not food_kw:
                        m = re.search(r'(?:đặt|order|mua)\s+món:?\s+(.+)', q_clean, re.IGNORECASE)
                        if m:
                            food_kw = m.group(1).strip()
                    if food_kw:
                        words = food_kw.split()
                        trailing = {'nhé', 'nha', 'ạ', 'ơi', 'một', 'với', 'và', 'có', 'không', 'bạn', 'ở', 'món', 'con', 'đi', 'rồi', 'cho'}
                        while words and (words[-1].lower() in trailing or len(words[-1]) <= 2):
                            words.pop()
                        food_kw = ' '.join(words)
                    # Nếu food keyword trùng với pending_food đang chọn → KHÔNG reset size
                    if food_kw and pf and food_kw.lower() == (pf.get('title') or '').lower():
                        sess['pending_food'] = pf  # keep same food
                        sess['pending_toppings'] = []
                        sess['options_step'] = 'select_topping'
                        # Fall through to normal select_topping handling below
                    elif query.strip().isdigit() and sess.get('pending_sizes'):
                        # User nhắn số (ví dụ "3") mà pending_sizes còn → coi như chọn size
                        size_idx = int(query.strip()) - 1
                        if 0 <= size_idx < len(sess['pending_sizes']):
                            sess['pending_size'] = sess['pending_sizes'][size_idx]
                            sess['pending_sizes'] = []
                            sess['options_step'] = 'select_topping'
                            # Fall through → hiện topping form
                        else:
                            # Số không hợp lệ → reset hoàn toàn
                            sess['pending_food'] = None
                            sess['pending_size'] = None
                            sess['pending_sizes'] = []
                            sess['pending_toppings'] = []
                            sess['available_toppings'] = []
                            sess['options_step'] = 'select_size'
                            sess['trang_thai'] = STATE_SEARCHING_FOOD
                            try:
                                agent_result = run_agent(query, history, user_context, sess, sess.get('last_foods', []), personal_ctx)
                                response_text, foods, restaurants = agent_result if agent_result else ("", [], [])
                            except Exception as e:
                                logger.error(f"❌ run_agent error: {e}")
                                response_text, foods, restaurants = "Bee đang bị lỗi chút xíu, bạn chờ xíu nha! 🐝", [], []
                            return _flask_jsonify({'response': response_text, 'foods': foods, 'restaurants': restaurants, 'ai_powered': True})
                    else:
                        # Food khác hoặc intent khác → reset mọi thứ
                        sess['pending_food'] = None
                        sess['pending_size'] = None
                        sess['pending_sizes'] = []
                        sess['pending_toppings'] = []
                        sess['available_toppings'] = []
                        sess['options_step'] = 'select_size'
                        sess['trang_thai'] = STATE_SEARCHING_FOOD
                        # Gọi AI agent xử lý request mới
                        try:
                            agent_result = run_agent(query, history, user_context, sess, sess.get('last_foods', []), personal_ctx)
                            if agent_result is None:
                                response_text, foods, restaurants = "", [], []
                            else:
                                response_text, foods, restaurants = agent_result
                        except Exception as e:
                            logger.error(f"❌ run_agent error after reset: {e}")
                            response_text, foods, restaurants = "Bee đang bị lỗi chút xíu, bạn chờ xíu nha! 🐝", [], []
                        return _flask_jsonify({'response': response_text, 'foods': foods, 'restaurants': restaurants, 'ai_powered': True})
                elif ctx_items and ctx_rest_id:
                    # ── CASE B: Chưa chọn size → guard logic gốc ──
                    food_kw = None
                    q_clean = query.strip()
                    for prefix in ['tôi muốn đặt ', 'tôi muốn order ', 'tôi muốn mua ', 'muốn đặt ', 'muốn order ', 'muốn mua ']:
                        if q_clean.lower().startswith(prefix):
                            food_kw = q_clean[len(prefix):].strip()
                            break
                    if not food_kw:
                        for prefix in ['đặt ', 'order ', 'mua ', 'ship ']:
                            if q_clean.lower().startswith(prefix):
                                food_kw = q_clean[len(prefix):].strip()
                                break
                    if not food_kw:
                        m = re.search(r'(?:đặt|order|mua)\s+món:?\s+(.+)', q_clean, re.IGNORECASE)
                        if m:
                            food_kw = m.group(1).strip()
                    if food_kw:
                        words = food_kw.split()
                        trailing = {'nhé', 'nha', 'ạ', 'ơi', 'một', 'với', 'và', 'có', 'không', 'bạn', 'ở', 'món', 'con', 'đi', 'rồi', 'cho'}
                        while words and (words[-1].lower() in trailing or len(words[-1]) <= 2):
                            words.pop()
                        food_kw = ' '.join(words)

                    if food_kw and len(food_kw) >= 2:
                        food_kw_lower = food_kw.lower()
                        logger.info(f"🔍 [SELECTING_OPTIONS→RESET] new order intent: '{food_kw}' | ctx_rest={ctx_rest_name}")
                        for m_item in ctx_items:
                            mn = (m_item.get('title') or '').lower()
                            mn_words = set(mn.split())
                            kw_words = set(food_kw_lower.split())
                            matched = (mn == food_kw_lower or
                                       food_kw_lower in mn or
                                       (kw_words and kw_words <= mn_words) or
                                       (len(kw_words) >= 2 and kw_words <= mn_words))
                            if matched:
                                food_id    = m_item.get('id')
                                food_price = float(m_item.get('price', 0))
                                food_title = m_item.get('title', '')
                                sizes     = q_sizes_mon_an(food_id)
                                toppings  = q_topping_mon_an(ctx_rest_id) if ctx_rest_id else []
                                has_options = bool(sizes or toppings)

                                sess['pending_food'] = {
                                    'id': food_id, 'title': food_title, 'price': food_price,
                                    'id_quan_an': ctx_rest_id, 'restaurant': ctx_rest_name,
                                }
                                sess['pending_size'] = None
                                sess['pending_toppings'] = []
                                sess['available_toppings'] = toppings
                                sess['options_step'] = 'select_size'

                                if has_options:
                                    sess['pending_sizes'] = sizes
                                    sess['trang_thai'] = STATE_SELECTING_OPTIONS
                                    sizes_lines = _build_options_lines(sizes)
                                    reply = (
                                        f"🍽️ Món bạn chọn: **{food_title}** — {food_price:,.0f}đ\n\n"
                                        f"📏 **CHỌN SIZE** (nhắn số 1, 2, 3...):\n{sizes_lines}\n\n"
                                        f"🍯 Topping có sẵn:\n{_build_topping_lines(toppings)}\n\n"
                                        f"(Không cần topping thì nhấn **\"Xong\"** để bỏ qua)"
                                    )
                                    return _flask_jsonify({
                                        'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False,
                                        'size_options': [{'id': s.get('id'), 'title': s.get('title'), 'extra_price': float(s.get('extra_price', 0))} for s in sizes],
                                        'topping_options': [{'id': t.get('id'), 'title': t.get('title'), 'price': float(t.get('price', 0))} for t in toppings],
                                        'options_step': 'select_size',
                                        'skip_size_step': False,
                                        'pending_food': {'id': food_id, 'title': food_title, 'price': float(food_price)},
                                        'selected_size': None,
                                        'chosen_toppings': [],
                                        'current_total': float(food_price),
                                    })
                                else:
                                    sess['cart'].append({
                                        'id': food_id, 'title': food_title,
                                        'price': food_price, 'base_price': food_price,
                                        'so_luong': 1, 'id_quan_an': ctx_rest_id, 'restaurant': ctx_rest_name,
                                        'size': None, 'toppings': [],
                                    })
                                    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in sess['cart'])
                                    sess['total_amount'] = total
                                    sess['trang_thai'] = STATE_ENTERING_DELIVERY
                                    lines = [f"  {i+1}. {c['title']} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                                             for i, c in enumerate(sess['cart'])]
                                    reply = (
                                        f"✅ Đã thêm '{food_title}' vào đơn!\n\n"
                                        f"📦 Giỏ hàng:\n" + "\n".join(lines) + f"\n\n"
                                        f"💰 Tổng: {total:,.0f}đ\n\n"
                                        f"📋 Cung cấp thông tin giao hàng nhé:\n"
                                        f"  • Họ tên người nhận: ...\n"
                                        f"  • SĐT người nhận: ...\n"
                                        f"  • Địa chỉ giao hàng: ..."
                                    )
                                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
                    # food_kw không tìm thấy → fall through để AI xử lý
                    sess['pending_food'] = None
                    sess['pending_size'] = None
                    sess['pending_toppings'] = []
                    sess['available_toppings'] = []
                    sess['pending_sizes'] = []
                    sess['options_step'] = 'select_size'
                    sess['trang_thai'] = STATE_SEARCHING_FOOD
                    try:
                        agent_result = run_agent(query, history, user_context, sess, sess.get('last_foods', []), personal_ctx)
                        if agent_result is None:
                            response_text, foods, restaurants = "", [], []
                        else:
                            response_text, foods, restaurants = agent_result
                    except Exception as e:
                        logger.error(f"❌ run_agent error after reset: {e}")
                        response_text, foods, restaurants = "Bee đang bị lỗi chút xíu, bạn chờ xíu nha! 🐝", [], []
                    return _flask_jsonify({'response': response_text, 'foods': foods, 'restaurants': restaurants, 'ai_powered': True})
                else:
                    # Không có context (menu_items/restarant_id) → fall through để AI xử lý
                    pass
            pending_sizes = sess.get('pending_sizes', [])
            pending_toppings = sess.get('pending_toppings', [])
            selected_size = sess.get('pending_size')
            local_toppings_data = data.get('local_toppings', data.get('toppings', []))
            local_size = data.get('local_size') or data.get('selected_size', {}) or data.get('size', {})
            # FE gửi kèm topping objects → dùng trực tiếp thay vì parse từ text
            if isinstance(local_toppings_data, list):
                sess['pending_toppings'] = local_toppings_data
                pending_toppings = local_toppings_data
                chosen_toppings = local_toppings_data
            # FE gửi kèm size object → dùng trực tiếp
            if local_size and isinstance(local_size, dict) and local_size.get('id'):
                sess['pending_size'] = local_size
                selected_size = local_size
            step = sess.get('options_step', 'select_size')
            q_lower = query.lower().strip()
            q_stripped = query.strip()

            # ── BƯỚC 1: CHỌN SIZE ──────────────────────────────────────
            # Nếu đang chọn size và user nhắn số → parse và return NGAY topping form
            # KHÔNG fall through: cùng số "3" sẽ bị parse nhầm thành topping index!
            if step == 'select_size' and q_stripped.isdigit():
                size_idx = int(q_stripped) - 1
                if 0 <= size_idx < len(pending_sizes):
                    sess['pending_size'] = pending_sizes[size_idx]
                    sess['pending_sizes'] = []  # clear so preemption check doesn't fire during topping step
                    selected_size = pending_sizes[size_idx]
                    size_extra_sel = float(selected_size.get('extra_price', 0))
                    sess['options_step'] = 'select_topping'
                    base_now = float(pf.get('price', 0))
                    total_now = base_now + size_extra_sel
                    size_str_sel = (
                        f"**{selected_size['title']}** (+{size_extra_sel:,.0f}đ)"
                        if size_extra_sel > 0 else f"**{selected_size['title']}** (miễn phí)"
                    )
                    rest_id_sel = pf.get('id_quan_an') or sess.get('restaurant_id')
                    avail_tp = q_topping_mon_an(rest_id_sel) if rest_id_sel else []
                    sess['available_toppings'] = avail_tp
                    sess['pending_toppings'] = []
                    if avail_tp:
                        tp_lines_sel = _build_topping_lines(avail_tp, selected_ids=[])
                        reply = (
                            f"📏 **Size đã chọn:** {size_str_sel}\n\n"
                            f"🍯 **CHỌN TOPPING** (nhắn số, nhiều số cách nhau bằng dấu phẩy):\n"
                            f"{tp_lines_sel}\n\n"
                            f"🍯 **Topping đã chọn:**\n  (chưa chọn)\n\n"
                            f"Nhấn **\"Xong\"** để bỏ qua topping và thêm vào giỏ.\n"
                            f"Nhấn **\"Sửa\"** để quay lại chọn size."
                        )
                        return _flask_jsonify(_options_response(
                            reply, pf, pending_sizes, avail_tp,
                            selected_size, [], 'select_topping', total_now,
                            skip_size_step=True, sess=sess
                        ))
                    else:
                        # Không có topping → thêm vào giỏ luôn
                        return _commit_pending_to_cart(sess, sess_id)
                # else: số không hợp lệ → fall through hiện lại form size

            # ── Tính giá hiện tại ──
            base_price = float(pf.get('price', 0))
            size_extra = float(selected_size.get('extra_price', 0)) if selected_size else 0
            topping_total = sum(float(t.get('price', 0)) for t in chosen_toppings)
            current_total = base_price + size_extra + topping_total

            # ── Helper: build summary block ──
            def _build_summary():
                size_str = f"**{selected_size['title']}** ({size_extra:+,.0f}đ)" if selected_size else "Tiêu chuẩn (miễn phí)"
                tp_str = "\n".join(f"  ✅ {t['title']} — {float(t.get('price',0)):,.0f}đ"
                                   for t in chosen_toppings) if chosen_toppings else "  (không chọn topping)"
                return (
                    f"📋 **Tóm tắt đơn hàng:**\n"
                    f"  🍽️ {pf.get('title','')} — {base_price:,.0f}đ\n"
                    f"  📏 Size: {size_str}\n"
                    f"  🍯 Topping:\n{tp_str}\n"
                    f"  💰 **Tạm tính: {current_total:,.0f}đ**"
                )

            # ── Từ khóa xác nhận → chuyển sang bước confirm ──
            confirm_keywords = ['done', 'xong', 'thôi', 'không cần', 'không thêm', 'skip',
                                'bỏ qua', 'ok ', ' ok', 'đồng ý', 'xác nhận', 'thêm vào giỏ']

            # Xử lý "Xong" ở bước 1 (chưa chọn topping): bỏ qua topping → confirm
            if any(k in q_lower for k in confirm_keywords) and step == 'select_size':
                if pending_toppings:
                    sess['options_step'] = 'select_topping'
                    step = 'select_topping'
                    # Re-calculate totals after step change
                    chosen_toppings = sess.get('pending_toppings', [])
                    topping_total = sum(float(t.get('price', 0)) for t in chosen_toppings)
                    current_total = base_price + size_extra + topping_total
                    # Hiện topping form nhưng KHÔNG hiện size (đã chọn rồi)
                    tp_lines = "\n".join(f"  ✅ {t['title']} — {float(t.get('price',0)):,.0f}đ"
                                        for t in chosen_toppings) if chosen_toppings else "  (không chọn topping)"
                    tp_selected_ids = [t['id'] for t in chosen_toppings]
                    size_str = f"**{selected_size['title']}** ({size_extra:+,.0f}đ)" if selected_size else "Tiêu chuẩn"
                    reply = (
                        f"📏 **Size đã chọn:** {size_str}\n\n"
                        f"🍯 **CHỌN TOPPING** (nhắn số, nhiều số cách nhau bằng dấu phẩy, ví dụ \"1,3\"):\n"
                        f"{_build_topping_lines(pending_toppings, selected_ids=tp_selected_ids)}\n\n"
                        f"🍯 **Topping đã chọn:**\n{tp_lines}\n\n"
                        f"{_build_summary()}\n\n"
                        f"Nhấn **\"Xong\"** để thêm vào giỏ.\n"
                        f"Nhấn **\"Sửa\"** để quay lại chọn size."
                    )
                    return _flask_jsonify(_options_response(
                        reply, pf, pending_sizes, pending_toppings,
                        selected_size, chosen_toppings, 'select_topping', current_total,
                        skip_size_step=True, sess=sess
                    ))
                else:
                    # Không có topping → thêm vào giỏ luôn
                    return _commit_pending_to_cart(sess, sess_id)

            if any(k in q_lower for k in confirm_keywords) and step == 'select_topping':
                sess['options_step'] = 'confirm'
                step = 'confirm'

            # ── BƯỚC 3: CONFIRM ──
            if step == 'confirm':
                # Một lần nữa nhấn xác nhận → thêm vào giỏ
                if any(k in q_lower for k in confirm_keywords):
                    return _commit_pending_to_cart(sess, sess_id)
                # Nhấn sửa → quay lại bước trước
                if q_lower in ['sửa', 'sua', 'quay lại', 'back', 'lại', 'thay đổi']:
                    sess['options_step'] = 'select_topping'
                    step = 'select_topping'
                    # Reload pending_sizes từ DB để hiện lại size form
                    food_id = pf.get('id')
                    rest_id = pf.get('id_quan_an') or sess.get('restaurant_id')
                    sizes = q_sizes_mon_an(food_id) if food_id else []
                    toppings = q_topping_mon_an(rest_id) if rest_id else []
                    sess['pending_sizes'] = sizes
                    sess['pending_toppings'] = toppings
                    sizes_lines = _build_options_lines(sizes, selected_size=selected_size)
                    tp_lines = "\n".join(f"  ✅ {t['title']} — {float(t.get('price',0)):,.0f}đ"
                                        for t in chosen_toppings) if chosen_toppings else "  (không chọn topping)"
                    tp_selected_ids = [t['id'] for t in chosen_toppings]
                    size_str = f"**{selected_size['title']}** ({size_extra:+,.0f}đ)" if selected_size else "Tiêu chuẩn"
                    reply = (
                        f"📏 **Size đã chọn:** {size_str}\n\n"
                        f"🍯 **CHỌN TOPPING** (nhắn số, nhiều số cách nhau bằng dấu phẩy, ví dụ \"1,3\"):\n"
                        f"{_build_topping_lines(toppings, selected_ids=tp_selected_ids)}\n\n"
                        f"🍯 **Topping đã chọn:**\n{tp_lines}\n\n"
                        f"{_build_summary()}\n\n"
                        f"Nhấn **\"Xong\"** để thêm vào giỏ.\n"
                        f"Nhấn **\"Sửa\"** để quay lại chọn size."
                    )
                    return _flask_jsonify(_options_response(
                        reply, pf,
                        sizes, toppings,
                        selected_size, chosen_toppings, 'select_topping', current_total, True,
                        sess=sess
                    ))
                else:
                    reply = (
                        f"✅ **Xác nhận đơn hàng:**\n\n"
                        f"{_build_summary()}\n\n"
                        f"Nhấn **\"Xong\"** để thêm vào giỏ.\n"
                        f"Nhấn **\"Sửa\"** để quay lại chọn lại topping."
                    )
                    return _flask_jsonify(_options_response(
                        reply, pf,
                        sizes, toppings,
                        selected_size, chosen_toppings, step, current_total, False,
                        sess=sess
                    ))

            # ── BƯỚC 2: CHỌN TOPPING ──
            if step == 'select_topping':
                # Fetch available toppings to map indexes and names correctly
                rest_id_tp = pf.get('id_quan_an') or sess.get('restaurant_id')
                avail_toppings = sess.get('available_toppings') or (q_topping_mon_an(rest_id_tp) if rest_id_tp else [])

                # ── SIZE PREEMPTION: user is in select_topping but hasn't selected size yet
                # (e.g. guard caused a re-show of size form and user typed "3" again).
                # Treat single-digit input as a SIZE index if it matches → route to select_size.
                if selected_size is None and pending_sizes and q_stripped.isdigit():
                    size_idx = int(q_stripped) - 1
                    if 0 <= size_idx < len(pending_sizes):
                        # Re-route to the select_size block below
                        step = 'select_size'

                if step == 'select_size':
                    pass  # fall through to size selection below

                if step == 'select_topping':
                    # Xử lý topping trước
                    topping_numbers = _parse_topping_numbers(q_lower, avail_toppings)
                    matched_by_name = []
                    q_for_name = query.lower().strip()
                    for prefix in ['chọn ', 'topping ', 'thêm ', 'lấy ', 'là ', '']:
                        if q_for_name.startswith(prefix):
                            q_for_name = q_for_name[len(prefix):].strip()
                    for tp in avail_toppings:
                        tp_name = (tp.get('title') or '').lower()
                        if tp_name and tp_name in q_for_name:
                            matched_by_name.append(tp)

                    # Nếu user gửi text chỉ chứa "xong" hoặc "sửa" thì bỏ qua parse topping mới
                    # (để giữ nguyên chosen_toppings nhận từ frontend)
                    is_command_only = any(k in q_lower for k in ['sửa', 'sua', 'quay lại', 'xong']) and not re.search(r'\d+', q_lower)

                    if not is_command_only:
                        if matched_by_name:
                            sess['pending_toppings'] = matched_by_name
                        elif topping_numbers is not None:
                            chosen = []
                            for n in topping_numbers:
                                if 0 <= n < len(avail_toppings):
                                    chosen.append(avail_toppings[n])
                            sess['pending_toppings'] = list({t['id']: t for t in chosen}.values())  # deduplicate

                    # Gọi lại helper với topping đã cập nhật
                    chosen_toppings = sess.get('pending_toppings', [])
                    topping_total = sum(float(t.get('price', 0)) for t in chosen_toppings)
                    current_total = base_price + size_extra + topping_total

                    # Các command điều hướng
                    if any(k in q_lower for k in ['sửa', 'sua', 'quay lại', 'back', 'lại', 'thay đổi']):
                        food_id = pf.get('id')
                        sizes_for_edit = q_sizes_mon_an(food_id) if food_id else []
                        sess['pending_size'] = None
                        sess['pending_toppings'] = []
                        sess['pending_sizes'] = sizes_for_edit
                        sess['options_step'] = 'select_size'
                        reply = (
                            f"🍽️ **CHỌN SIZE** (nhắn số 1, 2, 3...):\n"
                            f"{_build_options_lines(sizes_for_edit)}\n\n"
                            f"💰 Giá món: {base_price:,.0f}đ"
                        )
                        return _flask_jsonify(_options_response(
                            reply, pf, sizes_for_edit, avail_toppings,
                            None, [], 'select_size', base_price, False,
                            sess=sess
                        ))
                    elif any(k in q_lower for k in ['không', 'bỏ', 'không cần', 'không topping', 'skip topping']):
                        sess['pending_toppings'] = []
                        return _commit_pending_to_cart(sess, sess_id)
                    elif 'xong' in q_lower:
                        return _commit_pending_to_cart(sess, sess_id)
                    elif topping_numbers is not None or matched_by_name:
                        # Có chọn topping → chỉ cập nhật lựa chọn, chờ user bấm/nhắn "Xong" để thêm vào giỏ.
                        step = 'select_topping'
                    else:
                        # Không match gì → hiện lại form topping
                        step = 'select_topping'

                    if step == 'select_size':
                        pass  # fall through to size selection below

                    tp_lines = "\n".join(f"  ✅ {t['title']} — {float(t.get('price',0)):,.0f}đ"
                                        for t in chosen_toppings) if chosen_toppings else "  (không chọn topping)"
                    tp_selected_ids = [t['id'] for t in chosen_toppings]
                    size_str = f"**{selected_size['title']}** ({size_extra:+,.0f}đ)" if selected_size else "Tiêu chuẩn"
                    reply = (
                        f"📏 **Size đã chọn:** {size_str}\n\n"
                        f"🍯 **CHỌN TOPPING** (nhắn số, nhiều số cách nhau bằng dấu phẩy, ví dụ \"1,3\"):\n"
                        f"{_build_topping_lines(avail_toppings, selected_ids=tp_selected_ids)}\n\n"
                        f"🍯 **Topping đã chọn:**\n{tp_lines}\n\n"
                        f"{_build_summary()}\n\n"
                        f"Nhấn **\"Xong\"** để thêm vào giỏ.\n"
                        f"Nhấn **\"Sửa\"** để quay lại chọn size."
                    )
                    return _flask_jsonify(_options_response(
                        reply, pf, pending_sizes, avail_toppings,
                        selected_size, chosen_toppings, step, current_total,
                        sess=sess
                    ))

            # Không có sizes → chuyển thẳng sang topping (hoặc confirm nếu đã chọn size)
            if not pending_sizes:
                # Nếu đang ở bước confirm rồi → KHÔNG hiện lại size form nữa
                if step == 'confirm':
                    # Đã chọn size rồi → fall through xuống confirm response bên dưới
                    pass
                else:
                    # Chưa chọn size + không còn size options → chuyển sang topping
                    sess['options_step'] = 'select_topping'
                    step = 'select_topping'
                    # fall through để hiện topping form
            elif step == 'select_size':
                # Đang chọn size và input không parse được (hoặc số không hợp lệ) → hiện lại size form
                if selected_size is not None:
                    # Đã chọn size rồi → nhảy qua bước topping
                    pass  # fall through
                else:
                    sizes_lines = _build_options_lines(pending_sizes)
                    size_str2 = f"**{selected_size['title']}** ({float(selected_size.get('extra_price',0)):+,.0f}đ)" if selected_size else "Tiêu chuẩn"
                    reply = (
                        f"🍽️ **CHỌN SIZE** (nhắn số 1, 2, 3...):\n{sizes_lines}\n\n"
                        f"📏 Size đã chọn: {size_str2}\n\n"
                        f"💰 Giá món: {base_price:,.0f}đ"
                    )
                    return _flask_jsonify(_options_response(
                        reply, pf, pending_sizes, pending_toppings,
                        selected_size, chosen_toppings, 'select_size', current_total, False,
                        sess=sess
                    ))
            else:
                # Còn pending_sizes nhưng step không phải select_size → fall through
                pass

            # ── Fall-through: sau khi chọn size → hiện form topping ngay ──
            if step == 'select_topping':
                # Reload sizes từ DB (đã bị xóa khỏi session sau khi chọn)
                food_id = pf.get('id')
                rest_id = pf.get('id_quan_an') or sess.get('restaurant_id')
                sizes_for_response = q_sizes_mon_an(food_id) if food_id else []
                toppings_for_response = sess.get('available_toppings') or (q_topping_mon_an(rest_id) if rest_id else [])
                tp_lines = "\n".join(f"  ✅ {t['title']} — {float(t.get('price',0)):,.0f}đ"
                                    for t in chosen_toppings) if chosen_toppings else "  (không chọn topping)"
                tp_selected_ids = [t['id'] for t in chosen_toppings]
                size_str = f"**{selected_size['title']}** ({size_extra:+,.0f}đ)" if selected_size else "Tiêu chuẩn"
                reply = (
                    f"📏 **Size đã chọn:** {size_str}\n\n"
                    f"🍯 **CHỌN TOPPING** (nhắn số, nhiều số cách nhau bằng dấu phẩy, ví dụ \"1,3\"):\n"
                    f"{_build_topping_lines(toppings_for_response, selected_ids=tp_selected_ids)}\n\n"
                    f"🍯 **Topping đã chọn:**\n{tp_lines}\n\n"
                    f"{_build_summary()}\n\n"
                    f"Nhấn **\"Xong\"** để thêm vào giỏ.\n"
                    f"Nhấn **\"Sửa\"** để quay lại chọn size."
                )
                return _flask_jsonify(_options_response(
                    reply, pf,
                    sizes_for_response, toppings_for_response,
                    selected_size, chosen_toppings, 'select_topping', current_total, True,
                    sess=sess
                ))

            # ── Confirm step: không match confirm keywords → hiện lại form confirm ──
            if step == 'confirm':
                tp_summary = "\n".join(f"  ✅ {t['title']} — {float(t.get('price',0)):,.0f}đ"
                                       for t in chosen_toppings) if chosen_toppings else "  (không chọn topping)"
                size_str = f"**{selected_size['title']}** ({size_extra:+,.0f}đ)" if selected_size else "Tiêu chuẩn (miễn phí)"
                reply = (
                    f"✅ **Xác nhận đơn hàng:**\n\n"
                    f"📋 **Tóm tắt:**\n"
                    f"  🍽️ {pf.get('title','')} — {base_price:,.0f}đ\n"
                    f"  📏 Size: {size_str}\n"
                    f"  🍯 Topping:\n{tp_summary}\n"
                    f"  💰 **Tạm tính: {current_total:,.0f}đ**\n\n"
                    f"Nhấn **\"Xong\"** để thêm vào giỏ.\n"
                    f"Nhấn **\"Sửa\"** để quay lại chọn lại topping."
                )
                food_id = pf.get('id')
                rest_id = pf.get('id_quan_an') or sess.get('restaurant_id')
                return _flask_jsonify(_options_response(
                    reply, pf,
                    q_sizes_mon_an(food_id) if food_id else [],
                    sess.get('pending_toppings', []),
                    selected_size, chosen_toppings,
                    'confirm', current_total, True,
                    sess=sess
                ))

        # ══════════════════════════════════════════════════════════
        #  STATE: SELECTING_RESTAURANT → user chose a restaurant
        # ══════════════════════════════════════════════════════════
        if state == STATE_SELECTING_RESTAURANT:
            # ── CRITICAL: parse delivery info FIRST (same as ENTERING_DELIVERY) ──
            reply_delivery, done_delivery = _parse_delivery_info(query, sess)
            if reply_delivery:
                # User sent delivery info → switch to ENTERING_DELIVERY and show cart
                sess['trang_thai'] = STATE_CONFIRMING_ORDER if done_delivery else STATE_ENTERING_DELIVERY
                cart = sess.get('cart', [])
                if cart and done_delivery:
                    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                    cart_lines = "\n".join([
                        f"  {i+1}. {c.get('title','')} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                        for i, c in enumerate(cart)
                    ])
                    response_text = (
                        f"✅ Thông tin đã cập nhật!\n\n"
                        f"📦 Giỏ hàng:\n{cart_lines}\n\n"
                        f"💰 Tổng: {total:,.0f}đ\n"
                        f"👤 Người nhận: {sess.get('customer_name') or '(chưa có)'}\n"
                        f"📞 SĐT: {sess.get('phone') or '(chưa có)'}\n"
                        f"📍 Địa chỉ: {sess.get('address') or '(chưa có)'}\n\n"
                        + reply_delivery
                    )
                elif cart:
                    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                    cart_lines = "\n".join([
                        f"  {i+1}. {c.get('title','')} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                        for i, c in enumerate(cart)
                    ])
                    response_text = (
                        f"📦 Giỏ hàng:\n{cart_lines}\n\n"
                        f"💰 Tổng: {total:,.0f}đ\n\n"
                        + reply_delivery
                    )
                else:
                    response_text = reply_delivery
                logger.info(f"🐝 [SELECTING_RESTAURANT] delivery parsed → ENTERING_DELIVERY")
                if done_delivery:
                    return _flask_jsonify({
                        'response': response_text,
                        'foods': [],
                        'restaurants': [],
                        'ai_powered': False,
                        'buttons': _confirm_order_buttons(),
                    })
                return _flask_jsonify({'response': response_text, 'foods': [], 'restaurants': [], 'ai_powered': False})

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
                    return _flask_jsonify({'response': reply, 'foods': menu_items, 'restaurants': [], 'ai_powered': False})
                else:
                    reply = f"🏪 **{rest_name}** — đang cập nhật menu, bạn thử lại sau nhé!"
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

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
                            return _flask_jsonify({'response': reply, 'foods': menu_items, 'restaurants': [], 'ai_powered': False})
                    else:
                        # Multiple matches — show list
                        rest_preview = "\n".join([
                            f"{i+1}. {r.get('name','')} — 📍{r.get('address','')}"
                            for i, r in enumerate(matched)
                        ])
                        reply = (f"🐝 Bee tìm thấy {len(matched)} quán liên quan:\n\n"
                                 f"{rest_preview}\n\n"
                                 f"Nhắn **số** (1, 2...) để Bee xem menu nhé!")
                        return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': matched, 'ai_powered': False})

            # ── Layer 4: food intent → fall back to search ──
            food_kw_found = any(k in q_lower_sel for k in
                ['bún', 'phở', 'cơm', 'mì', 'bánh', 'cháo', 'gà', 'lẩu', 'nướng',
                 'pizza', 'burger', 'trà sữa', 'cà phê', 'cf', 'cafe', 'kem', 'chè',
                 'hải sản', 'xôi', 'bún bò', 'cơm tấm', 'mì quảng', 'bánh mì',
                 'sinh tố', 'nước', 'trà', 'ngon', 'hôm nay', 'gợi ý'])
            if food_kw_found or any(k in q_lower_sel for k in ['tìm', 'xem', 'món']):
                try:
                    agent_result = run_agent(query, history, user_context, sess, [], personal_ctx)
                    if agent_result is None:
                        response_text, foods, restaurants = "", [], []
                    else:
                        response_text, foods, restaurants = agent_result
                except Exception as e:
                    logger.error(f"❌ run_agent error: {e}")
                    response_text, foods, restaurants = "", [], []
                if foods:
                    sess['last_foods'] = foods
                    # Fix: when run_agent returns a restaurant menu, update restaurant_id so
                    # PRESERVE CONTEXT can find the correct restaurant context
                    if not sess.get('restaurant_id') and foods:
                        first_food = foods[0]
                        r_id = first_food.get('id_quan_an') or first_food.get('restaurant_id')
                        r_name = first_food.get('restaurant', '')
                        if r_id:
                            sess['restaurant_id']   = r_id
                            sess['restaurant_name'] = r_name
                if restaurants:
                    sess['restaurant_list'] = restaurants
                if not response_text:
                    response_text = fallback_respond(query)
                return _flask_jsonify({'response': response_text, 'foods': foods, 'restaurants': restaurants, 'ai_powered': True})

            # ── Layer 5: really not understood → show restaurant list ──
            rest_preview = "\n".join([
                f"{i+1}. {r.get('name','')} — 📍{r.get('address','')}"
                for i, r in enumerate(rest_list)
            ]) if rest_list else "(danh sách quán đã hết hạn — bạn nhắn lại từ đầu nhé!)"
            reply = (f"🐝 Bee chưa hiểu ý bạn lắm!\n\n"
                     f"📋 Danh sách quán hiện tại:\n{rest_preview}\n\n"
                     f"Nhắn **số** (1, 2...) hoặc **tên quán** để Bee xem menu nhé!")
            return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': rest_list, 'ai_powered': False})

        # ══════════════════════════════════════════════════════════
        #  STATE: ENTERING_DELIVERY
        # ══════════════════════════════════════════════════════════
        if state == STATE_ENTERING_DELIVERY:
            import unicodedata
            q_lower_enter = query.lower()

            # ── Ưu tiên: intent "thanh toán" phải được xử lý TRƯỚC _parse_delivery_info ──
            thanh_toan_kw = ['thanh toán', 'chuyển khoản', 'payos', 'qr',
                             'tiền mặt', 'cod', 'thanh toán online', 'thanh toán nào',
                             'hình thức thanh toán']
            if any(k in q_lower_enter for k in thanh_toan_kw):
                cart = sess.get('cart', [])
                if not cart:
                    response_text = "Giỏ hàng trống nên chưa thể thanh toán được! Bạn thêm món trước nhé! 🐝"
                    return _flask_jsonify({'response': response_text, 'foods': [], 'restaurants': [], 'ai_powered': False})
                # Auto-fill delivery info từ profile nếu có
                if is_logged and kh_id and user_profile:
                    if not sess.get('customer_name') and user_profile.get('preferred_name'):
                        sess['customer_name'] = user_profile['preferred_name']
                    if not sess.get('phone') and user_profile.get('preferred_phone'):
                        sess['phone'] = user_profile['preferred_phone']
                    if not sess.get('address') and user_profile.get('preferred_address'):
                        sess['address'] = user_profile['preferred_address']
                # Nếu vẫn thiếu → yêu cầu cung cấp
                if not sess.get('customer_name') or not sess.get('phone') or not sess.get('address'):
                    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                    reply = (
                        f"📋 Để thanh toán, Bee cần thông tin giao hàng nhé!\n\n"
                        f"📦 Giỏ hàng: {len(cart)} món — {total:,.0f}đ\n\n"
                    )
                    if not sess.get('customer_name'): reply += "  • Họ tên người nhận: ...\n"
                    if not sess.get('phone'):         reply += "  • SĐT người nhận: ...\n"
                    if not sess.get('address'):       reply += "  • Địa chỉ giao hàng: ...\n"
                    reply += "\n👉 Cung cấp thông tin giúp Bee rồi gõ 'thanh toán' lại nhé!"
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
                # Đủ thông tin → chuyển sang CONFIRMING_ORDER
                sess['trang_thai'] = STATE_CONFIRMING_ORDER
                reply = _build_confirm_order_prompt(sess)
                return _flask_jsonify({
                    'response': reply,
                    'foods': [], 'restaurants': [], 'ai_powered': False,
                    'buttons': _confirm_order_buttons(),
                })

            # ── CRITICAL: parse delivery info FIRST (always, before AI) ──
            # Delivery info should NEVER be consumed by AI agent
            reply, done = _parse_delivery_info(query, sess)
            if reply:
                if done:
                    # All info collected — reply contains confirm prompt, buttons too
                    confirm_reply = _build_confirm_order_prompt(sess)
                    sess['last_foods'] = []
                    return _flask_jsonify({
                        'response': confirm_reply,
                        'foods': [],
                        'restaurants': [],
                        'ai_powered': False,
                        'buttons': _confirm_order_buttons(),
                    })

                # Not complete yet — wrap reply with cart summary
                cart = sess.get('cart', [])
                if cart:
                    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                    cart_lines = "\n".join([
                        f"  {i+1}. {c.get('title','')} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                        for i, c in enumerate(cart)
                    ])
                    reply = (
                        f"✅ Thông tin đã cập nhật!\n\n"
                        f"📦 Giỏ hàng:\n{cart_lines}\n\n"
                        f"💰 Tổng: {total:,.0f}đ\n"
                        f"👤 Người nhận: {sess.get('customer_name') or '(chưa có)'}\n"
                        f"📞 SĐT: {sess.get('phone') or '(chưa có)'}\n"
                        f"📍 Địa chỉ: {sess.get('address') or '(chưa có)'}\n\n"
                        + reply
                    )
                logger.info(f"🐝 [ENTERING_DELIVERY] delivery parsed | done={done}")
                if done:
                    logger.info(f"✅ Delivery info complete → state → CONFIRMING_ORDER")
                sess['last_foods'] = []
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Only if _parse_delivery_info returned empty (no delivery info in query) ──
            # Check for user wanting to add more items / change restaurant
            if any(k in q_lower_enter for k in ['thêm món', 'bớt món', 'bỏ món', 'đổi món', 'sửa món',
                                                  'chọn món khác', 'món khác', 'xem menu', 'đổi sang',
                                                  'quán khác', 'đổi quán', 'chọn quán khác', 'xem quán']):
                menu_items = sess.get('menu_items', [])
                if not menu_items:
                    rest_id = sess.get('restaurant_id')
                    if rest_id:
                        menu_items = q_restaurant_menu(rest_id, limit=15)
                        sess['menu_items'] = menu_items
                if menu_items:
                    sess['trang_thai'] = STATE_VIEWING_MENU
                    cart_lines = "\n".join([
                        f"  {i+1}. {c['title']} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                        for i, c in enumerate(sess.get('cart', []))
                    ])
                    reply = (
                        f"📋 Giỏ hàng hiện tại:\n{cart_lines}\n\n"
                        f"🍽️ Món có sẵn tại **{sess.get('restaurant_name','')}**:\n"
                        + "\n".join([f"  {i+1}. {m.get('title','')} — {float(m.get('price',0)):,.0f}đ"
                                     for i, m in enumerate(menu_items[:5])])
                        + f"\n\n...và {len(menu_items)-5} món khác.\n"
                        f"👉 Nhắn **số** hoặc **tên món** để thêm/bớt nhé!"
                    )
                    return _flask_jsonify({'response': reply, 'foods': menu_items, 'restaurants': [], 'ai_powered': False})
                else:
                    reply = "Bạn muốn tìm món khác? Nhắn tên món cho Bee nhé!"
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Change restaurant ──────────────────────────────────────────
            if any(k in q_lower_enter for k in ['quán khác', 'đổi quán', 'chọn quán khác', 'xem quán', 'đổi menu', 'khác quán']):
                # XÓA CART khi đổi quán — tránh giỏ hàng bị mix giữa 2 quán
                sess['cart'] = []
                sess['menu_items'] = []
                sess['restaurant_id'] = None
                sess['restaurant_name'] = None
                sess['restaurant_list'] = []
                sess['customer_name'] = None
                sess['phone'] = None
                sess['address'] = None
                sess['total_amount'] = 0
                sess['voucher'] = None
                sess['xu_su_dung'] = 0
                sess['trang_thai'] = STATE_SEARCHING_FOOD
                reply = "OK bạn ơi! Đơn cũ đã được xóa. Bạn muốn tìm quán nào khác? Nhắn tên món hoặc loại quán cho Bee nhé! 🍔"
                logger.info(f"🐝 [ENTERING_DELIVERY] đổi quán → cart cleared | state → SEARCHING_FOOD")
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Add / change items ──────────────────────────────────────
            if any(k in q_lower_enter for k in ['thêm món', 'bớt món', 'bỏ món', 'đổi món', 'sửa món',
                                                  'chọn món khác', 'món khác', 'xem menu', 'đổi sang']):
                menu_items = sess.get('menu_items', [])
                if not menu_items:
                    rest_id = sess.get('restaurant_id')
                    if rest_id:
                        menu_items = q_restaurant_menu(rest_id, limit=15)
                        sess['menu_items'] = menu_items
                if menu_items:
                    sess['trang_thai'] = STATE_VIEWING_MENU
                    cart_lines = "\n".join([
                        f"  {i+1}. {c['title']} x{c.get('so_luong',1)} — {float(c.get('price',0)):,.0f}đ"
                        for i, c in enumerate(sess.get('cart', []))
                    ])
                    reply = (
                        f"📋 Giỏ hàng hiện tại:\n{cart_lines}\n\n"
                        f"🍽️ Món có sẵn tại **{sess.get('restaurant_name','')}**:\n"
                        + "\n".join([f"  {i+1}. {m.get('title','')} — {float(m.get('price',0)):,.0f}đ"
                                     for i, m in enumerate(menu_items[:5])])
                        + f"\n\n...và {max(0, len(menu_items)-5)} món khác.\n"
                        f"👉 Nhắn **số** hoặc **tên món** để thêm/bớt nhé!"
                    )
                    return _flask_jsonify({'response': reply, 'foods': menu_items, 'restaurants': [], 'ai_powered': False})
                else:
                    reply = "Bạn muốn tìm món khác? Nhắn tên món cho Bee nhé!"
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # Fallback: unrelated query → no AI, no food search
            response_text = fallback_respond(query)
            return _flask_jsonify({'response': response_text, 'foods': [], 'restaurants': [], 'ai_powered': False})

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
                return _flask_jsonify({
                    'response': "Đơn đã hủy. Bạn muốn thêm món gì? Menu vẫn sẵn sàng!",
                    'foods': sess.get('menu_items', []),
                    'restaurants': [],
                    'ai_powered': False,
                })
            if confirm_kw:
                sess['trang_thai'] = STATE_SELECTING_PAYMENT
                reply = _build_payment_prompt(sess, kh_id, is_logged)
                logger.info(f"🐝 Bee response (confirm → payment): {reply[:300]}")
                return _flask_jsonify({
                    'response': reply,
                    'foods': [],
                    'restaurants': [],
                    'ai_powered': False,
                    'buttons': _payment_action_buttons(sess, kh_id, is_logged),
                })

            # ── SMART EDIT HANDLER ─────────────────────────────────────────
            edit_reply, was_edited = _handle_edit_in_confirm(query, sess)
            if was_edited:
                # Re-show confirm prompt after edit
                reply = _build_confirm_order_prompt(sess)
                reply += f"\n\n{edit_reply}"
                reply += "\n\nBạn có thể bấm Xác nhận để tiếp tục thanh toán, hoặc bấm Sửa thông tin nếu cần đổi lại."
                return _flask_jsonify({
                    'response': reply,
                    'foods': [],
                    'restaurants': [],
                    'ai_powered': False,
                    'buttons': _confirm_order_buttons(),
                })

            # ── Voucher / Xu trong CONFIRMING_ORDER — gọi AI agent để gọi tool ──
            voucher_xu_kw = [
                'voucher', 'mã giảm', 'mã khuyến mãi', 'coupon',
                'nhập mã', 'áp mã', 'áp voucher', 'dùng mã',
                'xu của tôi', 'dùng xu', 'dùng điểm', 'điểm xu',
                'thanh toán bằng xu', 'trừ xu', 'tích xu', 'đổi xu',
            ]
            if any(k in q_lower for k in voucher_xu_kw):
                if not is_logged or not kh_id:
                    reply = (
                        "🐝 Bạn cần **đăng nhập FoodBee** để dùng voucher và XU nhé!\n\n"
                        "👉 Đăng nhập trong app FoodBee rồi quay lại nhắn 'xác nhận' để tiếp tục nhé!"
                    )
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})
                try:
                    agent_result = run_agent(query, history, user_context, sess, [], personal_ctx)
                    if agent_result is None:
                        response_text, foods, restaurants = "", [], []
                    else:
                        response_text, foods, restaurants = agent_result
                except Exception as e:
                    logger.error(f"❌ run_agent error (voucher/xu): {e}")
                    response_text, foods, restaurants = "", [], []
                if not response_text:
                    response_text = "Bee đang xử lý voucher/XU cho bạn... Bạn thử nhắn lại nhé! 🐝"
                payment_reply = _build_payment_prompt(sess, kh_id, is_logged)
                final_reply = (response_text + "\n\n" + payment_reply) if response_text else payment_reply
                return _flask_jsonify({
                    'response': final_reply,
                    'foods': foods,
                    'restaurants': restaurants,
                    'ai_powered': True,
                    'buttons': _payment_action_buttons(sess, kh_id, is_logged),
                })

            # ── "Sửa thông tin" with no new data → enter edit mode ───────
            sua_info_intent = any(k in q_lower for k in [
                'sửa thông tin', 'sửa giao hàng', 'đổi thông tin', 'sửa địa chỉ',
                'đổi địa chỉ', 'sửa tên', 'đổi tên', 'sửa sđt', 'đổi sđt',
                'sửa phone', 'đổi phone', 'thay đổi thông tin',
                'sửa người nhận', 'đổi người nhận',
            ])
            if sua_info_intent:
                # Clear current delivery fields so user re-enters them
                sess['customer_name'] = None
                sess['phone'] = None
                sess['address'] = None
                sess['trang_thai'] = STATE_ENTERING_DELIVERY
                reply = (
                    "✏️  OK! Bạn muốn sửa thông tin giao hàng.\n"
                    "📋 Cung cấp lại thông tin nhé:\n"
                    "  • Họ tên người nhận: ...\n"
                    "  • SĐT: ...\n"
                    "  • Địa chỉ giao: ..."
                )
                logger.info(f"🐝 [CONFIRMING_ORDER] sửa thông tin → state → ENTERING_DELIVERY")
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── View cart ─────────────────────────────────────────────────
            if any(k in q_lower for k in ['xem giỏ', 'giỏ hàng', 'đơn hàng', 'xem đơn']):
                reply = _build_confirm_order_prompt(sess)
                return _flask_jsonify({
                    'response': reply,
                    'foods': [],
                    'restaurants': [],
                    'ai_powered': False,
                    'buttons': _confirm_order_buttons(),
                })

            # ── Change restaurant ──────────────────────────────────────────
            if any(k in q_lower for k in ['quán khác', 'đổi quán', 'chọn quán khác', 'xem quán', 'đổi menu']):
                clear_order_session(sess_id)
                sess = get_order_session(sess_id)
                reply = "OK bạn ơi! Bạn muốn tìm quán nào khác? Nhắn tên món hoặc loại quán cho Bee nhé! 🍔"
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Back to menu / choose other items ─────────────────────────────
            back_to_menu_kw = [
                'chọn món khác', 'xem menu', 'menu quán', 'xem lại menu',
                'món khác', 'món khác trong menu', 'đổi món', 'đổi sang món khác',
                'thêm món', 'bớt món', 'bỏ món', 'xóa món', 'sửa món',
                'tôi muốn chọn món khác', 'chọn món khác trong menu',
            ]
            if any(k in q_lower for k in back_to_menu_kw):
                menu_items = sess.get('menu_items', [])
                if not menu_items:
                    # Try reloading menu from restaurant
                    rest_id = sess.get('restaurant_id')
                    if rest_id:
                        menu_items = q_restaurant_menu(rest_id, limit=15)
                        sess['menu_items'] = menu_items

                if menu_items:
                    # CRITICAL: switch back to VIEWING_MENU so the user's next message
                    # (e.g. "tôi muốn đặt món X") goes through the add-to-cart flow
                    sess['trang_thai'] = STATE_VIEWING_MENU
                    top3 = menu_items[:3]
                    menu_note = "Menu quán " + (sess.get('restaurant_name') or '') + ":\n" + "\n".join([
                        f"  {i+1}. {m.get('title','')} — {float(m.get('price',0)):,.0f}đ"
                        for i, m in enumerate(top3)
                    ])
                    reply = (
                        f"🍽️ Đây là menu của **{sess.get('restaurant_name','')}** nè!\n\n"
                        f"{menu_note}\n"
                    )
                    if len(menu_items) > 3:
                        reply += f"...và {len(menu_items)-3} món khác.\n"
                    reply += (
                        f"\n\n📋 Đơn hàng hiện tại của bạn:\n"
                        + "\n".join([
                            f"  {i+1}. {c['title']} x{c.get('so_luong',1)}"
                            for i, c in enumerate(sess.get('cart', []))
                        ])
                        + f"\n\n👉 Nhắn **số món** (1, 2...) hoặc **tên món** để thêm/bớt trong đơn nhé!\n"
                        f"✅ Gõ 'xác nhận' khi xong."
                    )
                    return _flask_jsonify({
                        'response': reply,
                        'foods': menu_items,
                        'restaurants': [],
                        'ai_powered': False,
                    })
                else:
                    reply = (
                        "😕 Hiện không có menu để chọn. "
                        "Bạn nhắn tên món hoặc loại đồ ăn cho Bee nhé!"
                    )
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # Default: re-prompt
            reply = _build_confirm_order_prompt(sess)
            return _flask_jsonify({
                'response': reply,
                'foods': [],
                'restaurants': [],
                'ai_powered': False,
                'buttons': _confirm_order_buttons(),
            })

        # ══════════════════════════════════════════════════════════
        #  STATE: SELECTING_PAYMENT
        # ══════════════════════════════════════════════════════════
        if state == STATE_SELECTING_PAYMENT:
            q_lower_sel = query.lower()

            # ── SMART EDIT HANDLER (sửa info, sửa món, đổi quán) ────────
            edit_reply, was_edited = _handle_edit_in_confirm(query, sess)
            if was_edited:
                reply = _build_confirm_order_prompt(sess)
                reply += f"\n\n{edit_reply}"
                return _flask_jsonify({
                    'response': reply,
                    'foods': [],
                    'restaurants': [],
                    'ai_powered': False,
                    'buttons': _confirm_order_buttons(),
                })

            # ── "Sửa thông tin" with no new data → enter edit mode ───────
            sua_info_intent = any(k in q_lower_sel for k in [
                'sửa thông tin', 'sửa giao hàng', 'đổi thông tin', 'sửa địa chỉ',
                'đổi địa chỉ', 'sửa tên', 'đổi tên', 'sửa sđt', 'đổi sđt',
                'sửa phone', 'đổi phone', 'thay đổi thông tin',
                'sửa người nhận', 'đổi người nhận',
            ])
            if sua_info_intent:
                sess['customer_name'] = None
                sess['phone'] = None
                sess['address'] = None
                sess['trang_thai'] = STATE_ENTERING_DELIVERY
                reply = (
                    "✏️  OK! Bạn muốn sửa thông tin giao hàng.\n"
                    "📋 Cung cấp lại thông tin nhé:\n"
                    "  • Họ tên người nhận: ...\n"
                    "  • SĐT: ...\n"
                    "  • Địa chỉ giao: ..."
                )
                logger.info(f"🐝 [SELECTING_PAYMENT] sửa thông tin → state → ENTERING_DELIVERY")
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Change restaurant ─────────────────────────────────────────
            if any(k in q_lower_sel for k in ['quán khác', 'đổi quán', 'chọn quán khác', 'xem quán', 'đổi menu']):
                clear_order_session(sess_id)
                sess = get_order_session(sess_id)
                reply = "OK bạn ơi! Bạn muốn tìm quán nào khác? Nhắn tên món hoặc loại quán cho Bee nhé! 🍔"
                return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

            # ── Clickable XU / voucher buttons ───────────────────────────
            wants_use_xu = any(k in q_lower_sel for k in ['dùng xu', 'dung xu', 'dùng điểm', 'trừ xu'])
            voucher_match = re.search(r'(?:áp voucher|ap voucher|nhập mã|nhap ma|dùng mã|dung ma)\s+([A-Za-z0-9_-]+)', query, re.IGNORECASE)
            if wants_use_xu or voucher_match:
                if not is_logged or not kh_id:
                    reply = (
                        "🐝 Bạn cần đăng nhập FoodBee để dùng voucher và XU nhé!\n\n"
                        + _build_payment_prompt(sess, kh_id, False)
                    )
                    return _flask_jsonify({
                        'response': reply,
                        'foods': [],
                        'restaurants': [],
                        'ai_powered': False,
                        'buttons': _payment_action_buttons(sess, kh_id, False),
                    })

                if wants_use_xu:
                    _, action_reply = execute_tool("su_dung_xu", {}, kh_id)
                else:
                    ma_code = voucher_match.group(1).strip().upper()
                    _, action_reply = execute_tool("apply_voucher", {"ma_code": ma_code}, kh_id)

                payment_reply = _build_payment_prompt(sess, kh_id, is_logged)
                return _flask_jsonify({
                    'response': f"{action_reply}\n\n{payment_reply}",
                    'foods': [],
                    'restaurants': [],
                    'ai_powered': False,
                    'buttons': _payment_action_buttons(sess, kh_id, is_logged),
                })

            # ── Voucher / Xu — chuyển qua AI agent để gọi tool tương ứng ──
            voucher_xu_kw = [
                'voucher', 'mã giảm', 'mã khuyến mãi', 'coupon',
                'nhập mã', 'áp mã', 'áp voucher', 'dùng mã',
                'xu của tôi', 'dùng xu', 'dùng điểm', 'điểm xu',
                'thanh toán bằng xu', 'trừ xu', 'tích xu', 'đổi xu',
            ]
            if any(k in q_lower_sel for k in voucher_xu_kw):
                if not is_logged or not kh_id:
                    # Chưa đăng nhập → thông báo đăng nhập
                    cart = sess.get('cart', [])
                    total = sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart)
                    phi_ship = 15000
                    tong = total + phi_ship
                    reply = (
                        f"🐝 Bạn cần **đăng nhập FoodBee** để dùng voucher và XU nhé!\n\n"
                        f"📦 Đơn hàng hiện tại: {total:,.0f}đ + ship {phi_ship:,.0f}đ = **{tong:,.0f}đ**\n\n"
                        f"👉 Đăng nhập trong app FoodBee rồi quay lại nhắn 'thanh toán' nhé!"
                    )
                    return _flask_jsonify({'response': reply, 'foods': [], 'restaurants': [], 'ai_powered': False})

                # Đã đăng nhập → gọi AI agent để xử lý voucher/xu tool
                try:
                    agent_result = run_agent(query, history, user_context, sess, [], personal_ctx)
                    if agent_result is None:
                        response_text, foods, restaurants = "", [], []
                    else:
                        response_text, foods, restaurants = agent_result
                except Exception as e:
                    logger.error(f"❌ run_agent error (voucher/xu): {e}")
                    response_text, foods, restaurants = "", [], []

                if not response_text:
                    response_text = "Bee đang xử lý voucher/XU cho bạn... Bạn thử nhắn lại nhé! 🐝"

                # Sau khi AI áp dụng voucher/xu → rebuild payment prompt để hiện kết quả mới
                payment_reply = _build_payment_prompt(sess, kh_id, is_logged)
                final_reply = (response_text + "\n\n" + payment_reply) if response_text else payment_reply
                return _flask_jsonify({
                    'response': final_reply,
                    'foods': foods,
                    'restaurants': restaurants,
                    'ai_powered': True,
                    'buttons': _payment_action_buttons(sess, kh_id, is_logged),
                })

            # ── Change / remove items ───────────────────────────────────
            doi_mon_kw = any(k in q_lower_sel for k in [
                'đổi món', 'đổi món ăn', 'đổi', 'sửa món', 'sửa đơn',
                'không muốn', 'bỏ món', 'bớt món', 'xóa món', 'hủy món',
                'thay đổi món', 'đổi thành', 'đổi món khác',
            ])
            if doi_mon_kw:
                clear_order_session(sess_id)
                sess = get_order_session(sess_id)
                return _flask_jsonify({
                    'response': (
                        "OK bạn ơi! Đơn cũ đã được hủy.\n"
                        "👉 Nhắn tên món bạn muốn thay thế cho Bee nhé! 🍔"
                    ),
                    'foods': [], 'restaurants': [], 'ai_powered': False,
                })

            reply, done = _parse_payment_choice(query, sess, kh_id)
            logger.info(f"🐝 Bee response: {reply[:120]}")
            sess['last_foods'] = []

            # ── Parse __PAYMENT__ marker → extract payment object ─────────────
            payment_obj = None
            if '__PAYMENT__' in reply:
                parts = reply.split('__PAYMENT__', 1)
                reply_text = parts[0].strip()
                if len(parts) > 1:
                    try:
                        payment_obj = json.loads(parts[1].strip())
                    except Exception as e:
                        logger.error(f"❌ Parse __PAYMENT__ JSON failed: {e}")

            resp_data = {'response': reply_text if payment_obj else reply, 'foods': [], 'restaurants': [], 'ai_powered': False}
            if payment_obj:
                resp_data['payment'] = payment_obj
            elif not done:
                resp_data['buttons'] = _payment_action_buttons(sess, kh_id, is_logged)
            return _flask_jsonify(resp_data)

        # ══════════════════════════════════════════════════════════
        #  STATE: COMPLETED → reset / handle follow-up edits
        if state == STATE_COMPLETED:
            q_lower_comp = query.lower()

            # ── Change / edit item in order ───────────────────────────────
            doi_mon_kw = any(k in q_lower_comp for k in [
                'đổi món', 'đổi món ăn', 'đổi món khác', 'đổi món ăn khác',
                'sửa món', 'sửa đơn', 'đổi', 'thay đổi món', 'đổi thành',
                'không muốn', 'bỏ món', 'bớt món', 'xóa món', 'hủy món',
            ])
            if doi_mon_kw:
                clear_order_session(sess_id)
                sess = get_order_session(sess_id)
                return _flask_jsonify({
                    'response': (
                        "OK bạn ơi! Đơn cũ đã được hủy.\n"
                        "👉 Nhắn tên món bạn muốn thay thế cho Bee nhé! 🍔"
                    ),
                    'foods': [], 'restaurants': [], 'ai_powered': False,
                })

            # ── Switch to different restaurant ───────────────────────────
            if any(k in q_lower_comp for k in ['quán khác', 'đổi quán', 'chọn quán khác', 'đổi menu', 'menu khác']):
                clear_order_session(sess_id)
                sess = get_order_session(sess_id)
                return _flask_jsonify({
                    'response': "OK! Bạn muốn tìm quán nào khác? Nhắn tên món hoặc loại quán cho Bee nhé! 🍔",
                    'foods': [], 'restaurants': [], 'ai_powered': False,
                })

            # Default: reset session and let AI handle
            clear_order_session(sess_id)
            sess = get_order_session(sess_id)

        # ══════════════════════════════════════════════════════════
        #  STATE: SEARCHING_FOOD (default) → run AI agent
        # ══════════════════════════════════════════════════════════
        last_foods = sess.get('last_foods', [])
        try:
            agent_result = run_agent(query, history, user_context, sess, last_foods, personal_ctx)
            if agent_result is None:
                response_text, foods, restaurants = "", [], []
                logger.warning("⚠️ run_agent returned None → using empty response")
            else:
                response_text, foods, restaurants = agent_result
        except Exception as e:
            logger.error(f"❌ run_agent error: {e}")
            response_text, foods, restaurants = "", [], []

        if not response_text:
            response_text = fallback_respond(query)
            # NOTE: Do NOT call q_random() here — it shows random food cards
            # even for greetings/non-food queries, which confuses users

        # ── AUTO-ADD: run_agent returned "✅ Bee đặt giúp bạn" → add to cart ──
        if response_text.startswith("✅ Bee đặt giúp bạn") and foods:
            top_food = foods[0]
            food_id = top_food.get('id')
            food_title = top_food.get('title', '')
            food_price = float(top_food.get('price', 0))
            food_rest = top_food.get('restaurant', '')
            food_rest_id = top_food.get('id_quan_an') or top_food.get('restaurant_id')

            existing = next((i for i, c in enumerate(sess['cart']) if c.get('id') == food_id), -1)
            if existing >= 0:
                sess['cart'][existing]['so_luong'] = sess['cart'][existing].get('so_luong', 1) + 1
            else:
                sess['cart'].append({
                    'id': food_id, 'title': food_title, 'price': food_price,
                    'so_luong': 1, 'id_quan_an': food_rest_id, 'restaurant': food_rest,
                })
            if food_rest_id and not sess.get('restaurant_id'):
                sess['restaurant_id'] = food_rest_id
                sess['restaurant_name'] = food_rest

            total = sum(c['price'] * c.get('so_luong', 1) for c in sess['cart'])
            sess['total_amount'] = total
            sess['trang_thai'] = STATE_ENTERING_DELIVERY
            # Rewrite reply to show cart summary
            cart_lines = "\n".join([
                f"  {i+1}. {c['title']} x{c.get('so_luong',1)} — {float(c['price']):,.0f}đ"
                for i, c in enumerate(sess['cart'])
            ])
            response_text = (
                f"✅ Đã thêm '{food_title}' vào đơn!\n\n"
                f"📦 Giỏ hàng:\n{cart_lines}\n\n"
                f"💰 Tổng: {total:,.0f}đ\n\n"
                f"📋 Cung cấp thông tin giao hàng nhé:\n"
                f"  • Họ tên người nhận: ...\n"
                f"  • SĐT: ...\n"
                f"  • Địa chỉ giao: ..."
            )
            logger.info(f"✅ AUTO-ADD cart updated | state → ENTERING_DELIVERY | total={total}")
            return _flask_jsonify({'response': response_text, 'foods': [], 'restaurants': [], 'ai_powered': False})

        # Decide next state based on what was returned
        if restaurants:
            sess['restaurant_list'] = restaurants
            sess['prev_restaurant_keyword'] = query.strip()
            sess['trang_thai'] = STATE_SELECTING_RESTAURANT
        elif foods:
            sess['trang_thai'] = STATE_SELECTING_RESTAURANT

        if foods:
            sess['last_foods'] = foods

        # Generate response text from food data when AI returned foods but bad text
        if foods and (not response_text or response_text == "😊 Bee chưa rõ ý bạn lắm! Thử hỏi: 'phở ngon ở đâu?', 'món dưới 50k?' hoặc 'bán chạy nhất' nhé! Bạn còn thắc mắc gì nữa không ạ? 🐝"):
            top3 = foods[:3]
            lines = []
            for i, f in enumerate(top3):
                price = float(f.get('price', 0))
                rest = f.get('restaurant', 'quán không rõ')
                lines.append(f"  {i+1}. **{f.get('title','')}** — {price:,.0f}đ | 🏪 {rest}")
            response_text = (
                f"🍜 Bee tìm được {len(foods)} món ngon cho bạn nè!\n\n"
                + "\n".join(lines)
                + f"\n\n👉 Nhắn **số** (1, 2...) để thêm vào đơn nhé!"
            )
            logger.info(f"✅ Generated response from food data | {len(foods)} foods")

        logger.info(f"🐝 Bee response: {response_text[:120]} | foods={len(foods)} rests={len(restaurants)}")

        # ── Parse __PAYMENT__ marker → extract payment object ─────────────────
        payment_obj = None
        if '__PAYMENT__' in response_text:
            parts = response_text.split('__PAYMENT__', 1)
            response_text = parts[0].strip()
            if len(parts) > 1:
                try:
                    payment_str = parts[1].strip()
                    payment_obj = json.loads(payment_str)
                    logger.info(f"✅ Payment object extracted: checkout_url={bool(payment_obj.get('checkout_url'))} qr_code={bool(payment_obj.get('qr_code'))}")
                except Exception as e:
                    logger.error(f"❌ Parse __PAYMENT__ JSON failed: {e}")

        # ── Save interaction to history ──────────────────────────────────
        save_chatbot_interaction(
            khach_hang_id=kh_id,
            session_id=sess_id,
            action_type='search',
            query_text=query,
            response_text=response_text,
            foods_shown=foods,
            restaurants_shown=restaurants,
            restaurant_name=sess.get('restaurant_name', ''),
            cart=sess.get('cart', []),
            state_before=state,
            state_after=sess.get('trang_thai', state),
            ai_powered=True,
        )

        resp_data = {
            'response': response_text,
            'foods': foods,
            'restaurants': restaurants,
            'ai_powered': True,
        }
        if payment_obj:
            resp_data['payment'] = payment_obj

        logger.info(f"🔵 Returning API response keys: {list(resp_data.keys())} | payment={bool(payment_obj)}")
        return _flask_jsonify(resp_data)

    except Exception as e:
        logger.error(f"❌ Chat error: {e}", exc_info=True)
        _raw_query    = locals().get('query', '') or ''
        fallback_text = fallback_respond(_raw_query)
        fallback_foods = []
        try:
            fallback_foods = q_random(6)
        except Exception:
            pass
        return _flask_jsonify({'response': fallback_text, 'foods': fallback_foods, 'restaurants': [], 'ai_powered': False})


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

    # ── PHONE: scan for invalid/incomplete phone FIRST ─────────────────────
    # Detect 9-digit "almost phone" — common typo, still extract name/address
    almost_phone = re.search(r'\b(0\d{8})\b', q)
    if almost_phone:
        # Still try to extract name (before) and address (after)
        ap_val = almost_phone.group()
        before = q[:almost_phone.start()].strip().rstrip(',').strip()
        after  = q[almost_phone.end():].strip().lstrip(',').strip()

        if not sess.get('customer_name') and 2 <= len(before) <= 40:
            sess['customer_name'] = re.sub(r'[,;\s]+$', '', before).strip()
            updated = True

        if not sess.get('address') and len(after) >= 5:
            sess['address'] = after
            updated = True

        return (
            f"⚠️ SĐT '{ap_val}' có vẻ thiếu 1 số (cần 10 số).\n"
            f"Bạn nhập lại SĐT đúng giúp Bee nhé (VD: 0394425076)!",
            False
        )

    # Also warn if user typed something that looks like phone but wrong length
    # (but try to extract name/address first)
    if not re.search(r'0\d{9,10}', q):
        stray_digits = re.findall(r'\b(\d{7,10})\b', q)
        if stray_digits:
            has_words = len([w for w in q.split() if len(w) > 3]) >= 2
            if has_words:
                return (
                    f"⚠️ Bee không nhận ra SĐT trong tin nhắn của bạn.\n"
                    f"Hãy nhập SĐT gồm 10 số bắt đầu bằng 0 (VD: 0394425076) nhé!",
                    False
                )

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


# ═══════════════════════════════════════════════════════════════════════════════
#  EDIT HANDLER — smart parsing for editing cart / delivery info / restaurant
# ═══════════════════════════════════════════════════════════════════════════════

def _handle_edit_in_confirm(query: str, sess: dict) -> tuple:
    """
    Parse edit requests in CONFIRMING_ORDER / SELECTING_PAYMENT states.
    Returns (reply_message, was_edited: bool).

    Supports:
    - Sửa thông tin: tên, SĐT, địa chỉ (full or partial)
    - Sửa món: thêm / bớt / xóa / đổi số lượng
    - Xem giỏ hàng chi tiết
    """
    q = query.strip()
    q_lower = q.lower()

    # ── 1. Sửa thông tin giao hàng ─────────────────────────────────────────
    sua_info_kw = ['sửa thông tin', 'sửa giao hàng', 'đổi thông tin', 'sửa địa chỉ',
                   'đổi địa chỉ', 'sửa tên', 'đổi tên', 'sửa sđt', 'đổi sđt',
                   'sửa phone', 'đổi phone', 'thay đổi thông tin', 'edit address',
                   'sửa người nhận', 'đổi người nhận']
    if any(k in q_lower for k in sua_info_kw):
        reply, edited = _handle_edit_delivery_info(q, sess)
        return reply, edited

    # ── 2. Sửa món (bớt / xóa / thêm / đổi số lượng) ─────────────────────
    sua_mon_kw = ['bớt', 'bỏ', 'xóa', 'xóa món', 'bỏ món', 'giảm',
                  'tăng thêm', 'thêm món', 'đổi món', 'đổi số lượng',
                  'sửa món', 'sửa số lượng', 'chỉnh món', 'chỉnh số lượng',
                  'đổi', 'sửa', 'bớt đi', 'bớt xuống', 'tăng lên']
    if any(k in q_lower for k in sua_mon_kw):
        reply, edited = _handle_edit_cart(q, sess)
        if edited:
            # Recalculate total
            cart = sess.get('cart', [])
            total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
            sess['total_amount'] = total
        return reply, edited

    return "", False


def _handle_edit_delivery_info(query: str, sess: dict) -> tuple:
    """Extract and update delivery fields from query. Returns (reply, edited)."""
    q = query.strip()
    phone_match = re.search(r'0\d{9,10}', q)

    # Collect what was parsed
    updated_fields = []

    # Phone
    if phone_match:
        phone_val = phone_match.group()
        if len(phone_val) >= 10:
            sess['phone'] = phone_val
            updated_fields.append(f"SĐT: {phone_val}")

    # Name: text before phone, or after keywords
    name_candidates = []
    if phone_match:
        name_candidates.append(q[:phone_match.start()].strip().rstrip(','))
    for kw in ['tên', 'người nhận', 'họ tên', 'name']:
        idx = q.lower().find(kw)
        if idx >= 0:
            rest = q[idx + len(kw):].strip().lstrip(r':\s')
            if rest:
                name_candidates.append(rest)

    best_name = ''
    for cand in name_candidates:
        cand = cand.strip().rstrip(',').strip()
        if 2 < len(cand) < 100 and not re.search(r'0\d{9,10}', cand):
            # Filter out address-y text
            if not any(w in cand.lower() for w in ['đường', 'quận', 'phường', 'tp', 'đà nẵng', 'hà nội', 'hcm']):
                best_name = cand
                break

    if best_name:
        sess['customer_name'] = best_name
        updated_fields.append(f"tên: {best_name}")

    # Address
    addr_kw = ['địa chỉ', 'giao đến', 'ship', 'nhận ở', 'đến']
    addr_match = None
    for kw in addr_kw:
        idx = q.lower().find(kw)
        if idx >= 0:
            rest = q[idx + len(kw):].strip().lstrip(r':\s,.')
            if rest:
                addr_match = rest.strip().rstrip('.').strip()
                break

    if addr_match and len(addr_match) > 5:
        sess['address'] = addr_match
        updated_fields.append(f"địa chỉ: {addr_match}")

    if not updated_fields:
        # Prompt user to specify what to change
        current = []
        if sess.get('customer_name'): current.append(f"  • Tên: {sess['customer_name']}")
        if sess.get('phone'):         current.append(f"  • SĐT:  {sess['phone']}")
        if sess.get('address'):       current.append(f"  • Địa chỉ: {sess['address']}")
        current_str = "\n".join(current) if current else "  (chưa có thông tin)"
        return (
            f"✏️  Bạn muốn sửa thông tin nào?\n\n"
            f"Hiện tại:\n{current_str}\n\n"
            f"Gõ theo format: 'tên: [tên mới], SĐT: [số], địa chỉ: [địa chỉ mới]'",
            False
        )

    updated_str = '\n'.join(f"  ✅ {f}" for f in updated_fields)
    return (
        f"✏️  Đã cập nhật:\n{updated_str}\n\n"
        f"Hãy nhắn tiếp thông tin cần sửa khác (nếu có), hoặc gõ 'xác nhận' để tiếp tục!",
        True
    )


def _handle_edit_cart(query: str, sess: dict) -> tuple:
    """
    Handle cart edits: add/remove items, change quantity.
    Returns (reply, edited: bool).
    """
    cart = sess.get('cart', [])
    menu_items = sess.get('menu_items', [])
    q_lower = query.lower()

    # ── Helper: find cart item by name or number ───────────────────────────
    def find_cart_item(q_str: str):
        q_str_l = q_str.lower()
        # By number
        m = re.match(r'^(\d+)$', q_str_str := q_str.strip())
        if m and 1 <= int(m.group(1)) <= len(cart):
            return cart[int(m.group(1)) - 1]
        # By name (best partial match)
        best = None
        for c in cart:
            ct = (c.get('title') or '').lower()
            if ct in q_str_l or q_str_l in ct:
                best = c
        return best

    q_str_str = query  # alias for closure

    # ── ADD item (from menu) ──────────────────────────────────────────────
    add_kw = ['thêm món', 'thêm', 'tăng thêm', 'tăng lên', 'mua thêm', 'gọi thêm']
    if any(k in q_lower for k in add_kw):
        if not menu_items:
            return "🛒 Không có menu hiện tại. Bạn nhắn tên món muốn thêm nhé!", False

        # Try to match item in current menu
        selected = None
        for m in menu_items:
            mn = (m.get('title') or '').lower()
            if mn in q_lower or q_lower in mn:
                selected = m
                break

        if not selected:
            return (
                f"🛒 Menu hiện tại ({sess.get('restaurant_name','')}):\n" +
                "\n".join(f"  {i+1}. {m.get('title','')} — {float(m.get('price',0)):,.0f}đ"
                          for i, m in enumerate(menu_items)) +
                "\n\nNhắn số hoặc tên món để thêm nhé!",
                False
            )

        food_id    = selected.get('id')
        food_title = selected.get('title', '')
        food_price = float(selected.get('price', 0))
        food_rest  = selected.get('restaurant') or sess.get('restaurant_name', '')
        food_rest_id = selected.get('id_quan_an') or sess.get('restaurant_id')

        existing = next((i for i, c in enumerate(cart) if c.get('id') == food_id), -1)
        if existing >= 0:
            cart[existing]['so_luong'] = cart[existing].get('so_luong', 1) + 1
        else:
            cart.append({
                'id': food_id, 'title': food_title, 'price': food_price,
                'so_luong': 1, 'id_quan_an': food_rest_id, 'restaurant': food_rest,
            })

        new_total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
        sess['total_amount'] = new_total
        return (
            f"✅ Đã thêm '{food_title}'!\n"
            f"📦 Giỏ hàng: {len(cart)} món — 💰 {new_total:,.0f}đ",
            True
        )

    # ── REMOVE / DELETE item ────────────────────────────────────────────
    remove_kw = ['bớt', 'bỏ', 'xóa', 'xóa món', 'bỏ món', 'giảm', 'bớt đi', 'bớt xuống']
    if any(k in q_lower for k in remove_kw):
        target = None
        # Try number
        m = re.match(r'^(\d+)$', query.strip())
        if m and 1 <= int(m.group(1)) <= len(cart):
            target = cart[int(m.group(1)) - 1]
        else:
            # Try by name
            for c in cart:
                ct = (c.get('title') or '').lower()
                if ct in q_lower or q_lower.replace('bớt ', '').replace('bỏ ', '').replace('xóa ', '') in ct:
                    target = c
                    break

        if not target:
            if not cart:
                return "🛒 Giỏ hàng đang trống!", False
            return (
                "🛒 Giỏ hàng hiện tại:\n" +
                "\n".join(f"  {i+1}. {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ"
                          for i, c in enumerate(cart)) +
                "\n\nNhắn số hoặc tên món để bớt nhé!",
                False
            )

        idx_to_remove = next((i for i, c in enumerate(cart) if c.get('id') == target.get('id')), -1)
        if idx_to_remove >= 0:
            current_qty = cart[idx_to_remove].get('so_luong', 1)
            if current_qty > 1:
                cart[idx_to_remove]['so_luong'] = current_qty - 1
                action = f"đã giảm '{target['title']}' xuống còn {current_qty - 1}"
            else:
                removed_title = cart[idx_to_remove]['title']
                cart.pop(idx_to_remove)
                action = f"đã xóa '{removed_title}'"

        new_total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
        sess['total_amount'] = new_total
        if not cart:
            sess['trang_thai'] = STATE_VIEWING_MENU
            return (
                f"✅ Đã {action}! Giỏ hàng trống rồi.\n"
                f"Bạn muốn thêm món gì nữa không?",
                True
            )
        return (
            f"✅ {action}!\n"
            f"📦 Giỏ hàng: {len(cart)} món — 💰 {new_total:,.0f}đ",
            True
        )

    # ── CHANGE QUANTITY (set specific number) ────────────────────────────
    change_kw = ['đổi', 'sửa', 'sửa số lượng', 'chỉnh số lượng', 'số lượng']
    if any(k in q_lower for k in change_kw):
        # Try "tên món x N" or "N cái tên món"
        m = re.search(r'x\s*(\d+)', q_lower) or re.search(r'(\d+)\s*(cái|cup|ly|cái|món)', q_lower)
        new_qty = None
        target_name = query

        if m:
            new_qty = int(m.group(1))
            target_name = re.sub(r'x\s*\d+', '', query).strip()
            target_name = re.sub(r'\d+\s*(cái|cup|ly|cái|món)', '', target_name).strip()

        if not new_qty or new_qty < 1:
            # Prompt
            if not cart:
                return "🛒 Giỏ hàng trống!", False
            return (
                "🛒 Giỏ hàng:\n" +
                "\n".join(f"  {i+1}. {c['title']} x{c.get('so_luong',1)}"
                          for i, c in enumerate(cart)) +
                "\n\nGõ 'số lượng [tên món] x[số]' để đổi (VD: 'cafe muối x2')",
                False
            )

        # Find target
        target = None
        if target_name.isdigit() and 1 <= int(target_name) <= len(cart):
            target = cart[int(target_name) - 1]
        else:
            for c in cart:
                ct = (c.get('title') or '').lower()
                if ct in target_name.lower() or target_name.lower() in ct:
                    target = c
                    break

        if not target:
            return (
                "🛒 Giỏ hàng:\n" +
                "\n".join(f"  {i+1}. {c['title']} x{c.get('so_luong',1)}"
                          for i, c in enumerate(cart)) +
                "\n\nKhông tìm thấy món. Gõ 'số lượng [tên] x[số]' để đổi!",
                False
            )

        idx = next((i for i, c in enumerate(cart) if c.get('id') == target.get('id')), -1)
        if idx >= 0:
            if new_qty == 1:
                cart[idx]['so_luong'] = 1
                msg = f"✅ Đã đổi '{target['title']}' thành 1"
            else:
                cart[idx]['so_luong'] = new_qty
                msg = f"✅ Đã đổi '{target['title']}' thành x{new_qty}"

        new_total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
        sess['total_amount'] = new_total
        return (
            f"{msg}\n📦 Giỏ hàng: {len(cart)} món — 💰 {new_total:,.0f}đ",
            True
        )

    return "", False


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
        + f"─────────────────\n"
        + f"💵 TỔNG CỘNG: {tong:,.0f}đ\n\n"
        + f"📍 Giao đến: {sess.get('address','')}\n"
        + f"👤 Người nhận: {sess.get('customer_name','')} — {sess.get('phone','')}\n\n"
        + f"✅ Nếu đồng ý, bấm Xác nhận để tiếp tục thanh toán.\n"
        + f"✏️  Muốn sửa thông tin giao hàng, bấm Sửa thông tin."
    )
    return reply


def _confirm_order_buttons() -> list:
    """Buttons shown while the user reviews the order before payment."""
    return [
        {'text': '✅ Xác nhận', 'type': 'message', 'message': 'xác nhận', 'silent': True},
        {'text': '✏️ Sửa thông tin', 'type': 'message', 'message': 'sửa thông tin', 'silent': True},
    ]



def _best_valid_vouchers(sess: dict, kh_id=None, limit: int = 3) -> list:
    """Return the best currently usable vouchers for this order."""
    if not kh_id:
        return []
    cart = sess.get('cart', [])
    if not cart:
        return []
    rest_id = sess.get('restaurant_id')
    tong_tien = int(sum(float(c.get('price', 0)) * c.get('so_luong', 1) for c in cart))
    valid = []
    for v in q_vouchers(limit=20):
        ma_code = (v.get('ma_code') or '').strip().upper()
        if not ma_code:
            continue
        resp = call_be_api(
            "/chatbot/validate-voucher",
            method="POST",
            json_data={
                "ma_code": ma_code,
                "id_quan_an": rest_id or 0,
                "khach_hang_id": kh_id,
                "tong_tien_hang": tong_tien,
            }
        )
        if not (resp and resp.get('status')):
            continue
        data = resp.get('data') or {}
        voucher = data.get('voucher') or {}
        valid.append({
            'id': voucher.get('id'),
            'ma_code': voucher.get('ma_code') or ma_code,
            'ten_voucher': voucher.get('ten_voucher') or v.get('ten_voucher') or '',
            'so_tien_giam': float(data.get('so_tien_giam') or 0),
            'tong_tien_sau_giam': float(data.get('tong_tien_sau_giam') or tong_tien),
        })
        if len(valid) >= max(limit * 2, limit):
            break
    valid.sort(key=lambda item: item.get('so_tien_giam', 0), reverse=True)
    return valid[:limit]


def _payment_action_buttons(sess: dict, kh_id=None, is_logged: bool = False) -> list:
    """Buttons shown after order confirmation, before creating the order."""
    buttons = []
    if is_logged and kh_id:
        vi = q_kiem_tra_vi(kh_id) or {}
        diem_xu = int(vi.get('diem_xu') or 0)
        if diem_xu > 0 and not sess.get('xu_su_dung'):
            buttons.append({
                'text': f"🪙 Dùng XU ({diem_xu:,})",
                'type': 'message',
                'message': 'dùng xu',
                'silent': True,
            })
        current_code = ((sess.get('voucher') or {}).get('ma_code') or '').upper()
        for v in _best_valid_vouchers(sess, kh_id, limit=3):
            ma_code = (v.get('ma_code') or '').upper()
            if not ma_code or ma_code == current_code:
                continue
            buttons.append({
                'text': f"🎟️ {ma_code} -{v.get('so_tien_giam', 0):,.0f}đ",
                'type': 'message',
                'message': f"áp voucher {ma_code}",
                'silent': True,
            })
    buttons.extend([
        {'text': '💵 Tiền mặt', 'type': 'message', 'message': 'tiền mặt', 'silent': True},
        {'text': '💳 PayOS QR', 'type': 'message', 'message': 'payos', 'silent': True},
    ])
    return buttons


def _build_payment_prompt(sess: dict, kh_id=None, is_logged: bool = False) -> str:
    """Build payment selection prompt after delivery info is collected."""
    cart = sess.get('cart', [])
    total = sum(c['price'] * c.get('so_luong', 1) for c in cart)
    phi_ship = 15000
    tong_sau_voucher = sess.get('tong_tien_sau_voucher', total)
    xu_da_dung = sess.get('xu_su_dung', 0)
    tong = max(0, tong_sau_voucher + phi_ship - xu_da_dung)
    lines = [f"{i+1}. {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ"
             for i, c in enumerate(cart)]
    cart_text = "\n".join(lines)

    voucher_da_co = sess.get('voucher')
    voucher_line = ""
    if voucher_da_co:
        v = voucher_da_co
        voucher_line = f"🎟️ Voucher ({v.get('ma_code','')}): -{v.get('so_tien_giam',0):,.0f}đ\n"
    xu_line = ""
    if xu_da_dung > 0:
        xu_line = f"🪙 XU đã dùng: -{xu_da_dung:,.0f}đ\n"

    promo_text = ""
    if is_logged and kh_id:
        vi = q_kiem_tra_vi(kh_id) or {}
        diem_xu = int(vi.get('diem_xu') or 0)
        promo_text += f"💡 Ví của bạn: {diem_xu:,} XU.\n"
        vouchers = _best_valid_vouchers(sess, kh_id, limit=3)
        if vouchers:
            voucher_lines = [
                f"  • {v.get('ma_code','')} — giảm {v.get('so_tien_giam', 0):,.0f}đ"
                for v in vouchers
            ]
            promo_text += "🎟️ Voucher dùng được tốt nhất:\n" + "\n".join(voucher_lines) + "\n"
    else:
        promo_text = "💡 Đăng nhập FoodBee để dùng voucher và XU giảm giá nhé!\n"

    reply = (f"✅ Đơn hàng đã xác nhận!\n\n"
             f"📦 Đơn hàng:\n{cart_text}\n\n"
             f"💰 Tiền hàng: {total:,.0f}đ\n"
             f"🚚 Phí ship:   {phi_ship:,.0f}đ\n"
             + (voucher_line if voucher_line else "")
             + (xu_line if xu_line else "")
             + f"─────────────────\n"
             + f"💵 TỔNG CỘNG: {tong:,.0f}đ\n\n"
             + f"📍 Giao đến: {sess.get('address','')}\n"
             + f"👤 Người nhận: {sess.get('customer_name','')} — {sess.get('phone','')}\n\n"
             + promo_text
             + f"\nChọn khuyến mãi hoặc phương thức thanh toán bên dưới.")
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
        return _build_payment_prompt(sess, kh_id, bool(kh_id)) + (
            "\n\nBạn muốn chuyển sang phương thức nào?"
        ), False

    is_cash = wants_cash
    is_payos = wants_payos

    if not is_cash and not is_payos:
        return _build_payment_prompt(sess, kh_id, bool(kh_id)), False

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

    mon_an_list = []
    for c in cart:
        topping_ids_list = []
        topping_names_list = []
        if c.get('toppings'):
            topping_ids_list   = [t['id'] for t in c['toppings']]
            topping_names_list = [t['title'] for t in c['toppings']]
        size = c.get('size') or {}
        mon_an_list.append({
            'id_mon_an': c.get('id'),
            'ten_mon': c['title'],
            'so_luong': c.get('so_luong', 1),
            'gia': c['price'],
            'id_size': size.get('id'),
            'ten_size': size.get('title'),
            'topping_ids': ','.join(map(str, topping_ids_list)) if topping_ids_list else '',
            'topping_names': ', '.join(topping_names_list) if topping_names_list else '',
        })

    result = tao_don_hang_moi(
        khach_hang_id=kh_id or None,
        ho_ten=sess.get('customer_name', 'Khách'),
        sdt=sess.get('phone', ''),
        dia_chi=sess.get('address', ''),
        id_quan_an=sess.get('restaurant_id') or (cart[0].get('id_quan_an') if cart else None),
        mon_an_list=mon_an_list,
        phuong_thuc_thanh_toan=phuong_thuc,
        xu_su_dung=sess.get('xu_su_dung') or 0,
        id_voucher=(sess.get('voucher') or {}).get('id'),
    )

    # Lưu trước khi clear session
    dia_chi_display     = sess.get('address', '')
    customer_name_display = sess.get('customer_name', 'Khách')
    phone_display       = sess.get('phone', '')
    rest_name_display   = sess.get('restaurant_name', '')
    # Save cart for profile update
    cart_snapshot       = list(cart)

    if result.get('success'):
        # ── Update user food profile ───────────────────────────────────
        if kh_id:
            update_user_profile_from_order(kh_id, sess)

        # ── Save to chatbot history ───────────────────────────────────
        save_chatbot_interaction(
            khach_hang_id=kh_id,
            session_id=str(kh_id or 'guest'),
            action_type='order_completed',
            action_detail=f"Order #{result.get('ma_don_hang','')} thành công",
            response_text=f"Đơn hàng đã tạo thành công",
            restaurant_name=rest_name_display,
            cart=cart_snapshot,
            delivery_info={
                'name': customer_name_display,
                'phone': phone_display,
                'address': dia_chi_display,
            },
            state_before='SELECTING_PAYMENT',
            state_after='COMPLETED',
            ai_powered=False,
        )

        # Clear session after successful order
        clear_order_session(str(kh_id or 'guest'))
        sess = get_order_session(str(kh_id or 'guest'))
        sess['trang_thai'] = STATE_COMPLETED

        tong_tien = result.get('tong_tien', 0)
        ma_don = result.get('ma_don_hang', '')
        tien_hang = result.get('tien_hang', 0)
        phi_ship = result.get('phi_ship', 0)
        voucher_giam = result.get('voucher_giam', 0)
        xu_su_dung = result.get('xu_su_dung', 0)
        reply = (f"🎉 Đơn hàng #{ma_don} đã được tạo!\n\n📦 Món:\n")
        for c in cart_snapshot:
            reply += f"  • {c['title']} x{c.get('so_luong',1)} — {c['price']:,.0f}đ\n"
        reply += (f"\n💰 Tiền hàng: {tien_hang:,.0f}đ\n"
                  f"🚚 Phí ship: {phi_ship:,.0f}đ\n")
        if voucher_giam > 0:
            reply += f"🎟️ Voucher giảm: -{voucher_giam:,.0f}đ\n"
        if xu_su_dung > 0:
            reply += f"🪙 XU đã dùng: -{xu_su_dung:,.0f}đ\n"
        reply += f"💵 Tổng còn: {tong_tien:,.0f}đ\n"
        reply += f"📍 Giao đến: {dia_chi_display}\n"
        reply += f"👤 Người nhận: {customer_name_display} — {phone_display}\n"

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
        return _flask_jsonify({'categories': cats, 'total': len(cats)})
    except Exception as e:
        logger.error(f"categories error: {e}")
        return _flask_jsonify({'categories': [], 'total': 0}), 500


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
        return _flask_jsonify({'restaurants': data, 'total': len(data)})
    except Exception as e:
        logger.error(f"restaurants error: {e}")
        return _flask_jsonify({'restaurants': [], 'total': 0}), 500


@app.route('/api/session/clear', methods=['POST'])
def clear_session():
    """Clear the order session. Called when user clicks 'Xoá session' button."""
    try:
        data = request.json or {}
        kh_id = data.get('khach_hang_id')
        client_session_id = data.get('session_id') or ''
        sess_id = str(kh_id or client_session_id) if (kh_id or client_session_id) else 'guest'
        clear_order_session(sess_id)
        logger.info(f"🗑️ [SESSION] cleared | sess_id={sess_id[:20]}")
        return _flask_jsonify({'ok': True, 'message': 'Session cleared'})
    except Exception as e:
        logger.error(f"❌ clear_session error: {e}")
        return _flask_jsonify({'ok': False, 'message': str(e)}), 500


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

    return _flask_jsonify({
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
    _ensure_chatbot_history_table()
    _ensure_user_food_profile_table()
    logger.info("✅ Chatbot history & personalization tables ready")
    port = int(os.getenv('FLASK_PORT', 5000))
    logger.info(f"🚀 FoodBee Bee v12.0 — Smart Agent — port {port}")
    logger.info(f"🤖 {'✅ Groq ON | ' + GROQ_MODEL if GROQ_API_KEY else '❌ Groq OFF'}")
    logger.info(f"🔧 Total tools: {len(TOOLS)} | Max steps: {MAX_AGENT_STEPS}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
