// Format tiền VND
export const formatVND = (number) => {
  if (!number && number !== 0) return '0đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(number);
};

// Format ngày giờ
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN');
};

// Format expire voucher
export const formatExpire = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Đã hết hạn';
  if (diffDays === 0) return 'Hết hạn hôm nay';
  if (diffDays <= 3) return `Còn ${diffDays} ngày`;
  return `HSD: ${date.toLocaleDateString('vi-VN')}`;
};

// Check expire soon (trong 3 ngày)
export const isExpiringSoon = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 3;
};

// Get token
export const getToken = () => localStorage.getItem('khach_hang_login');
export const isLoggedIn = () => !!getToken();

// Default avatar
export const DEFAULT_AVATAR = 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-icon-download-in-svg-png-gif-file-formats--user-boy-avatars-flat-icons-pack-people-456322.png';

// Get category icon
export const getCategoryIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('pizza')) return 'fa-solid fa-pizza-slice';
  if (lower.includes('burger') || lower.includes('hamburger')) return 'fa-solid fa-hamburger';
  if (lower.includes('sushi') || lower.includes('nhật')) return 'fa-solid fa-fish';
  if (lower.includes('cơm') || lower.includes('việt')) return 'fa-solid fa-bowl-rice';
  if (lower.includes('nướng') || lower.includes('bbq')) return 'fa-solid fa-fire-burner';
  if (lower.includes('lẩu')) return 'fa-solid fa-hot-tub-person';
  if (lower.includes('chay')) return 'fa-solid fa-leaf';
  if (lower.includes('trà') || lower.includes('cafe') || lower.includes('coffee')) return 'fa-solid fa-mug-hot';
  if (lower.includes('dessert') || lower.includes('bánh') || lower.includes('ngọt')) return 'fa-solid fa-cake-candles';
  if (lower.includes('gà')) return 'fa-solid fa-drumstick-bite';
  if (lower.includes('hải sản') || lower.includes('tôm')) return 'fa-solid fa-shrimp';
  if (lower.includes('mì') || lower.includes('phở') || lower.includes('bún')) return 'fa-solid fa-bowl-food';
  return 'fa-solid fa-utensils';
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const el = document.createElement('input');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  }
};

// To Slug
export const toSlug = (text) => {
  if (!text) return '';
  let slug = text.toLowerCase();
  slug = slug.replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, 'a');
  slug = slug.replace(/[éèẻẽẹêếềểễệ]/g, 'e');
  slug = slug.replace(/[íìỉĩị]/g, 'i');
  slug = slug.replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o');
  slug = slug.replace(/[úùủũụưứừửữự]/g, 'u');
  slug = slug.replace(/[ýỳỷỹỵ]/g, 'y');
  slug = slug.replace(/đ/g, 'd');
  slug = slug.replace(/[^a-z0-9 -]/g, '');
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/-+/g, '-');
  return slug.trim().replace(/^-+|-+$/g, '');
};

// Debounce
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
