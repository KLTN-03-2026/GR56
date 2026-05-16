import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Image,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import apiClient from "../genaral/api";

const PRIMARY = "#EE4D2D";
const BLUE = "#3B82F6";

interface ShipperInfo {
  tinh_trang: number;
  shipper_name: string;
  shipper_phone: string;
  shipper_avatar: string;
  restaurant_lat: number;
  restaurant_lng: number;
  customer_lat: number;
  customer_lng: number;
  shipper_lat: number;
  shipper_lng: number;
  last_location_update: string | null;
  customer_address: string;
}

interface OrderTrackingMapProps {
  orderId: number;
  height?: number;
  onClose?: () => void;
}

/** Haversine distance in km */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(ts: string | null): string {
  if (!ts) return "Chưa cập nhật";
  return new Date(ts).toLocaleTimeString("vi-VN");
}

function getStatusText(status: number): string {
  if (status === 0 || status === 1) return "Chờ nhận đơn";
  if (status === 2) return "Đang chế biến";
  if (status === 3) return "Đang vận chuyển";
  if (status === 4) return "Giao hàng thành công";
  if (status === 5) return "Đã bị hủy";
  return "Đang cập nhật";
}

function buildMapUrl(
  sLat: number | null,
  sLng: number | null,
  dLat: number | null,
  dLng: number | null,
  fallbackAddress?: string
): string {
  if (sLat && sLng && dLat && dLng) {
    return `https://maps.google.com/maps?saddr=${sLat},${sLng}&daddr=${dLat},${dLng}&t=m&z=14&output=embed`;
  }
  if (sLat && sLng) {
    return `https://maps.google.com/maps?q=${sLat},${sLng}&t=m&z=15&output=embed`;
  }
  if (dLat && dLng) {
    return `https://maps.google.com/maps?q=${dLat},${dLng}&t=m&z=15&output=embed`;
  }
  const addr = fallbackAddress || "Da Nang, Viet Nam";
  return `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&t=m&z=15&output=embed`;
}

function buildHTML(mapUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#f0f4f8}
iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
#ld{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;background:#f0f4f8;z-index:10;gap:12px;
  pointer-events:none
}
.sp{width:38px;height:38px;border:3px solid #e2e8f0;border-top:3px solid #EE4D2D;
  border-radius:50%;animation:spin .85s linear infinite}
.tx{font-size:11px;color:#94a3b8;font-family:sans-serif}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div id="ld"><div class="sp"></div><div class="tx">Đang tải bản đồ...</div></div>
<iframe
  src="${mapUrl}"
  allowfullscreen
  loading="eager"
  referrerpolicy="no-referrer-when-downgrade"
  onload="document.getElementById('ld').style.display='none'"
></iframe>
</body>
</html>`;
}

const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({
  orderId,
  height = hp("52%"),
  onClose,
}) => {
  const [canTrack, setCanTrack] = useState(false);
  const [orderInfo, setOrderInfo] = useState<ShipperInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrderInfo = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiClient.post("/khach-hang/theo-doi-don-hang", { id: orderId });
      if (res.data?.status) {
        setCanTrack(res.data.can_track ?? false);
        setOrderInfo(res.data.order ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrderInfo();
    const interval = setInterval(() => loadOrderInfo(false), 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrderInfo(false);
  };

  const handleCallShipper = () => {
    if (orderInfo?.shipper_phone) {
      Linking.openURL(`tel:${orderInfo.shipper_phone}`);
    }
  };

  const distance = useMemo(() => {
    if (!orderInfo) return null;
    return getDistance(
      orderInfo.shipper_lat,
      orderInfo.shipper_lng,
      orderInfo.customer_lat,
      orderInfo.customer_lng
    );
  }, [orderInfo]);

  const etaMinutes = useMemo(() => {
    if (distance === null) return null;
    return Math.round((distance / 30) * 60) + 3;
  }, [distance]);

  const mapHtml = useMemo(() => {
    if (!orderInfo) return null;
    const sLat = orderInfo.shipper_lat || null;
    const sLng = orderInfo.shipper_lng || null;
    const dLat = orderInfo.customer_lat || null;
    const dLng = orderInfo.customer_lng || null;
    const url = buildMapUrl(sLat, sLng, dLat, dLng, orderInfo.customer_address);
    return buildHTML(url);
  }, [orderInfo]);

  const status = orderInfo?.tinh_trang ?? 0;

  if (status === 4 || status === 5) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveIndicator} />
          <Text style={styles.headerTitle}>Theo Dõi Đơn Hàng #{orderId}</Text>
        </View>
        <View style={styles.headerRight}>
          {!canTrack && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{getStatusText(status)}</Text>
            </View>
          )}
          {canTrack && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              <ActivityIndicator
                size="small"
                color={PRIMARY}
                animating={refreshing}
              />
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!canTrack ? (
        <View style={styles.noTrackContainer}>
          <Text style={styles.noTrackIcon}>🛵</Text>
          <Text style={styles.noTrackTitle}>Chưa có thông tin vị trí</Text>
          <Text style={styles.noTrackText}>
            Hệ thống sẽ cập nhật radar vị trí khi Shipper đã tiếp nhận đơn hàng!
          </Text>
        </View>
      ) : (
        <>
          {/* Map */}
          <View style={[styles.mapContainer, { height: hp("30%") }]}>
            {mapHtml && (
              <WebView
                source={{ html: mapHtml, baseUrl: "https://www.google.com" }}
                style={StyleSheet.absoluteFill}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                originWhitelist={["*"]}
                allowUniversalAccessFromFileURLs
                allowFileAccess
                allowFileAccessFromFileURLs
                setSupportMultipleWindows={false}
                onError={() => setLoading(false)}
                userAgent="Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
              />
            )}
          </View>

          {/* Shipper Info */}
          {orderInfo && (
            <View style={styles.shipperInfo}>
              <Text style={styles.shipperTitle}>
                <Text style={styles.shipperIcon}>🏍️</Text> Thông Tin Shipper
              </Text>

              <View style={styles.shipperCard}>
                <View style={styles.shipperRow}>
                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    <Image
                      source={{
                        uri:
                          orderInfo.shipper_avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            orderInfo.shipper_name || "S"
                          )}&background=3b82f6&color=fff&size=128`,
                      }}
                      style={styles.avatar}
                    />
                    <View style={styles.onlineDot} />
                  </View>

                  {/* Info */}
                  <View style={styles.shipperDetails}>
                    <Text style={styles.shipperName}>{orderInfo.shipper_name}</Text>
                    <Text style={styles.shipperPhone}>
                      📞 {orderInfo.shipper_phone}
                    </Text>
                  </View>
                </View>

                {/* Distance & ETA */}
                {distance !== null && (
                  <View style={styles.distanceContainer}>
                    <View style={styles.distanceItem}>
                      <Text style={styles.distanceLabel}>Khoảng cách</Text>
                      <Text style={styles.distanceValue}>
                        {distance.toFixed(1)}{" "}
                        <Text style={styles.distanceUnit}>km</Text>
                      </Text>
                    </View>
                    <View style={styles.distanceDivider} />
                    <View style={styles.distanceItem}>
                      <Text style={styles.distanceLabel}>Thời gian đến</Text>
                      <Text style={styles.distanceValue}>
                        ~{etaMinutes}{" "}
                        <Text style={styles.distanceUnit}>phút</Text>
                      </Text>
                    </View>
                  </View>
                )}

                {/* Last Update */}
                <View style={styles.updateRow}>
                  <Text style={styles.updateLabel}>Cập nhật vị trí:</Text>
                  <Text style={styles.updateTime}>
                    {formatTime(orderInfo.last_location_update)}
                  </Text>
                </View>

                {/* Call Button */}
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCallShipper}
                  activeOpacity={0.8}
                >
                  <Text style={styles.callButtonIcon}>📞</Text>
                  <Text style={styles.callButtonText}>Gọi Cho Shipper</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: wp("4%"),
    marginVertical: hp("1%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  container: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#F0F4F8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  refreshButton: {
    padding: 4,
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  closeText: {
    fontSize: 24,
    color: "#94A3B8",
    fontWeight: "300",
  },
  noTrackContainer: {
    padding: wp("8%"),
    alignItems: "center",
    backgroundColor: "#FFF7ED",
  },
  noTrackIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noTrackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EA580C",
    marginBottom: 8,
  },
  noTrackText: {
    fontSize: 13,
    color: "#9A3412",
    textAlign: "center",
    lineHeight: 20,
  },
  mapContainer: {
    width: "100%",
    backgroundColor: "#F0F4F8",
  },
  shipperInfo: {
    padding: wp("4%"),
  },
  shipperTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  shipperIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  shipperCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: wp("4%"),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  shipperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#DBEAFE",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  shipperDetails: {
    flex: 1,
  },
  shipperName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  shipperPhone: {
    fontSize: 13,
    color: "#64748B",
  },
  distanceContainer: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  distanceItem: {
    flex: 1,
    alignItems: "center",
  },
  distanceDivider: {
    width: 1,
    backgroundColor: "#BFDBFE",
    marginHorizontal: 8,
  },
  distanceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3B82F6",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1E40AF",
  },
  distanceUnit: {
    fontSize: 12,
    fontWeight: "600",
  },
  updateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  updateLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  updateTime: {
    fontSize: 11,
    color: "#3B82F6",
    fontWeight: "700",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  callButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

export default OrderTrackingMap;
