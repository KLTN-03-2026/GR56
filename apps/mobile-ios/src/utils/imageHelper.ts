import apiClient from "../genaral/api";

const DEFAULT_SHIPPER_AVATAR = "https://thichtrangtri.com/wp-content/uploads/2025/05/Hinh-anh-con-bo-9-1-269x300.jpg";

/**
 * Lấy URL đầy đủ cho hình ảnh
 * @param imagePath - Đường dẫn hình ảnh từ API (hoặc URL đầy đủ)
 * @returns URL đầy đủ của hình ảnh
 */
export const getImageUrl = (imagePath: string | null | undefined): string => {
  // Nếu không có path, trả về placeholder
  if (!imagePath) return "https://via.placeholder.com/100x100";

  // Nếu đã là URL đầy đủ, trả về ngay
  if (imagePath.startsWith("http")) return imagePath;

  // Nếu là path tương đối, ghép với base URL từ apiClient
  const baseURL = apiClient.defaults.baseURL;
  if (!baseURL) {
    console.warn("API base URL not configured in apiClient");
    return "https://via.placeholder.com/100x100";
  }
  
  const storageUrl = baseURL.replace("/api", "") + "/storage";
  return `${storageUrl}/${imagePath}`;
};

/**
 * Lấy URL avatar shipper, dùng ảnh mặc định nếu không có
 * @param imagePath - Đường dẫn hình ảnh từ API
 * @returns URL đầy đủ hoặc ảnh mặc định shipper
 */
export const getShipperAvatarUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return DEFAULT_SHIPPER_AVATAR;
  return getImageUrl(imagePath);
};

/**
 * Lấy API base URL (dùng cho các endpoint khác)
 * @returns API base URL
 */
export const getAPIBaseUrl = (): string => {
  const baseURL = apiClient.defaults.baseURL;
  if (!baseURL) {
    throw new Error("API base URL not configured in apiClient");
  }
  return baseURL;
};

/**
 * Lấy storage base URL (dùng cho hình ảnh)
 * @returns Storage base URL
 */
export const getStorageBaseUrl = (): string => {
  const baseURL = apiClient.defaults.baseURL;
  if (!baseURL) {
    throw new Error("API base URL not configured in apiClient");
  }
  return baseURL.replace("/api", "") + "/storage";
};
