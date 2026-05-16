import React, { useMemo, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const PRIMARY = "#EE4D2D";

interface Props {
  mode: "dual_address" | "three_point" | "shipper_to_customer";
  destAddress: string;
  destName: string;
  destCoord?: [number, number] | null;   // [lng, lat]
  secondAddress?: string;
  secondName?: string;
  secondCoord?: [number, number] | null; // [lng, lat]
  shipperAddress?: string;
  shipperName?: string;
  shipperCoord?: [number, number] | null; // [lng, lat]
  height?: number;
}

/** Build Google Maps URL - free embed (no API key needed) */
function buildMapUrl(
  mode: string,
  destCoord: [number, number] | null,
  destAddr: string,
  secCoord: [number, number] | null,
  secAddr: string,
  shipCoord: [number, number] | null,
): string {
  // [lng, lat] → "lat,lng"
  const cs = (c: [number, number]) => `${c[1]},${c[0]}`;
  const enc = encodeURIComponent;

  if (mode === "shipper_to_customer") {
    if (shipCoord && secCoord) {
      // Directions: shipper → customer (free embed)
      return `https://maps.google.com/maps?saddr=${cs(shipCoord)}&daddr=${cs(secCoord)}&t=m&z=13&output=embed`;
    }
    const pt = shipCoord || secCoord;
    if (pt) return `https://maps.google.com/maps?q=${cs(pt)}&t=m&z=15&output=embed`;
    return `https://maps.google.com/maps?q=${enc(secAddr || "Da Nang")}&t=m&z=15&output=embed`;
  }

  if (mode === "three_point") {
    // Shipper → Customer (most useful for user tracking)
    if (shipCoord && secCoord) {
      return `https://maps.google.com/maps?saddr=${cs(shipCoord)}&daddr=${cs(secCoord)}&t=m&z=13&output=embed`;
    }
    if (shipCoord && destCoord) {
      return `https://maps.google.com/maps?saddr=${cs(shipCoord)}&daddr=${cs(destCoord)}&t=m&z=13&output=embed`;
    }
    const pt = destCoord || secCoord;
    if (pt) return `https://maps.google.com/maps?q=${cs(pt)}&t=m&z=15&output=embed`;
  }

  // dual_address: Restaurant → Customer
  if (destCoord && secCoord) {
    return `https://maps.google.com/maps?saddr=${cs(destCoord)}&daddr=${cs(secCoord)}&t=m&z=13&output=embed`;
  }
  if (destCoord) {
    return `https://maps.google.com/maps?q=${cs(destCoord)}&t=m&z=15&output=embed`;
  }
  // Address fallback
  if (destAddr && secAddr) {
    return `https://maps.google.com/maps?saddr=${enc(destAddr)}&daddr=${enc(secAddr)}&t=m&z=13&output=embed`;
  }
  return `https://maps.google.com/maps?q=${enc(destAddr || "Da Nang, Viet Nam")}&t=m&z=15&output=embed`;
}

/** Minimal HTML wrapper that embeds Google Maps iframe */
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

const InlineDeliveryMap: React.FC<Props> = ({
  mode,
  destAddress, destName,
  destCoord = null,
  secondAddress = "", secondName = "",
  secondCoord = null,
  shipperCoord = null,
  height,
}) => {
  const mapHeight = height ?? hp("42%");
  const [loading, setLoading] = useState(true);

  const html = useMemo(() => {
    const url = buildMapUrl(
      mode,
      destCoord ?? null,
      destAddress,
      secondCoord ?? null,
      secondAddress,
      shipperCoord ?? null,
    );
    return buildHTML(url);
  }, [mode, destCoord, destAddress, secondCoord, secondAddress, shipperCoord]);

  return (
    <View style={[styles.container, { height: mapHeight }]}>
      <WebView
        source={{ html, baseUrl: "https://www.google.com" }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        originWhitelist={["*"]}
        allowUniversalAccessFromFileURLs
        allowFileAccess
        allowFileAccessFromFileURLs
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
        userAgent="Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%", overflow: "hidden", backgroundColor: "#F0F4F8" },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
});

export default InlineDeliveryMap;
