@extends('emails.components.layout')

@section('title', 'Đơn hàng hoàn thành')
@section('icon', '✅')
@section('icon_bg', '#E8F5E9')
@section('heading', 'Đơn hàng đã hoàn thành!')

@section('cta_url', config('app.frontend_url', 'http://localhost:5173') . '/khach-hang/don-hang')
@section('cta_text', '⭐ Đánh giá đơn hàng')

@section('content')
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 16px;">
  Xin chào <strong>{{ $data['ho_ten'] }}</strong>,
</p>
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 20px;">
  Đơn hàng <strong>#{{ $data['ma_don_hang'] }}</strong> đã được giao thành công! 🎉 Hy vọng bạn hài lòng với trải nghiệm.
</p>

<!-- Order Summary -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FFF4;border-radius:10px;border:1px solid #C8E6C9;margin-bottom:20px;">
  <tr>
    <td style="padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Mã đơn hàng</td>
          <td align="right" style="font-size:15px;font-weight:700;color:#1a1a1a;">#{{ $data['ma_don_hang'] }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Quán ăn</td>
          <td align="right" style="font-size:14px;color:#333;">🏪 {{ $data['ten_quan'] ?? 'N/A' }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Shipper</td>
          <td align="right" style="font-size:14px;color:#333;">🛵 {{ $data['ten_shipper'] ?? 'N/A' }}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 0 0 0;"><div style="border-top:1px dashed #C8E6C9;"></div></td>
        </tr>
        <tr>
          <td style="padding:10px 0 4px 0;font-size:16px;font-weight:700;">Tổng tiền</td>
          <td align="right" style="padding:10px 0 4px 0;font-size:20px;font-weight:700;color:#4CAF50;">
            {{ number_format($data['tong_tien'], 0, ',', '.') }}₫
          </td>
        </tr>
        @if(isset($data['xu_tich_luy']) && $data['xu_tich_luy'] > 0)
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#FF8F00;">🏆 XU tích lũy</td>
          <td align="right" style="font-size:14px;font-weight:600;color:#FF8F00;">
            +{{ $data['xu_tich_luy'] }} XU
          </td>
        </tr>
        @endif
      </table>
    </td>
  </tr>
</table>

<!-- Rating CTA -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8E1;border-radius:10px;border:1px solid #FFE082;">
  <tr>
    <td style="padding:18px;text-align:center;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#F57F17;">
        ⭐ Đánh giá trải nghiệm của bạn
      </p>
      <p style="margin:0;font-size:13px;color:#888;line-height:20px;">
        Phản hồi của bạn giúp cải thiện chất lượng dịch vụ FoodBee.<br>
        Hãy nhấn nút bên dưới để đánh giá quán ăn và shipper nhé!
      </p>
    </td>
  </tr>
</table>
@endsection
