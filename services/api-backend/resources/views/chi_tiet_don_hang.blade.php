<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Thanh toán hoàn tất</title>
</head>

<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td
                            style="background:#ff5722;padding:20px;text-align:center;color:#ffffff;font-size:20px;font-weight:bold;">
                            ✅ THANH TOÁN HOÀN TẤT
                        </td>
                    </tr>

                    <!-- Thông tin khách hàng -->
                    <tr>
                        <td style="padding:20px;font-size:14px;color:#333;">
                            <p>Xin chào <strong>{{ $data['ho_ten'] }}</strong>,</p>
                            <p>Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đã được thanh toán thành công và đang được xử lý:</p>
                            <p><strong>Mã đơn hàng:</strong> {{ $data['ma_don_hang'] }}</p>
                        </td>
                    </tr>

                    <!-- Bảng chi tiết món ăn -->
                    <tr>
                        <td style="padding:0 20px 20px 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                <thead>
                                    <tr>
                                        <th align="left"
                                            style="padding:10px;border:1px solid #eeeeee;background:#fafafa;">Món ăn
                                        </th>
                                        <th align="center"
                                            style="padding:10px;border:1px solid #eeeeee;background:#fafafa;">SL</th>
                                        <th align="right"
                                            style="padding:10px;border:1px solid #eeeeee;background:#fafafa;">Đơn giá
                                        </th>
                                        <th align="right"
                                            style="padding:10px;border:1px solid #eeeeee;background:#fafafa;">Thành tiền
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @forelse($data['ds_for'] as $item)
                                        <tr>
                                            <td style="padding:10px;border:1px solid #eeeeee;">
                                                {{ $item->ten_mon_an }}
                                            </td>
                                            <td align="center" style="padding:10px;border:1px solid #eeeeee;">
                                                {{ $item->so_luong }}
                                            </td>
                                            <td align="right" style="padding:10px;border:1px solid #eeeeee;">
                                                {{ number_format($item->don_gia, 0, ',', '.') }}₫
                                            </td>
                                            <td align="right"
                                                style="padding:10px;border:1px solid #eeeeee;font-weight:600;">
                                                {{ number_format($item->thanh_tien, 0, ',', '.') }}₫
                                            </td>
                                        </tr>
                                    @empty
                                        <tr>
                                            <td colspan="4" align="center" style="padding:15px;color:#888;">
                                                Không có món ăn nào trong đơn hàng
                                            </td>
                                        </tr>
                                    @endforelse
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <!-- Tổng kết -->
                    <tr>
                        <td style="padding:20px;font-size:14px;color:#333;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="right" style="padding:5px 0;">Phí ship:</td>
                                    <td align="right" style="padding:5px 0;font-weight:bold;">
                                        {{ number_format($data['phi_ship'], 0, ',', '.') }}₫
                                    </td>
                                </tr>
                                <tr>
                                    <td align="right" style="padding:5px 0;font-size:16px;font-weight:bold;">Tổng tiền:
                                    </td>
                                    <td align="right"
                                        style="padding:5px 0;font-size:16px;font-weight:bold;color:#ff5722;">
                                        {{ number_format($data['tong_tien'], 0, ',', '.') }}₫
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Mã QR thanh toán -->
                    {{-- <tr>
                        <td align="center" style="padding:20px;">
                            <p style="font-size:14px;color:#333;margin-bottom:10px;">
                                <strong>Quét mã QR để thanh toán</strong>
                            </p>
                            <img src="{{ $data['link_qr'] }}" alt="QR Thanh toán"
                                style="width:200px;height:auto;border:1px solid #eee;padding:5px;border-radius:8px;">
                            <p style="font-size:13px;color:#777;margin-top:8px;">
                                (Số tiền sẽ được tự động nhập khi quét)
                            </p>
                        </td>
                    </tr> --}}

                    <!-- Footer -->
                    <tr>
                        <td style="background:#fafafa;padding:20px;font-size:12px;color:#666;text-align:center;">
                            Cảm ơn bạn đã thanh toán đơn hàng tại <strong>FoodOrder</strong> 🍲
                            <br>Đơn hàng của bạn sẽ được giao sớm nhất có thể. Hẹn gặp lại bạn!
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>
