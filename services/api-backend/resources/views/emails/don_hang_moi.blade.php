@extends('emails.components.layout')

@section('title', 'Đặt hàng thành công')
@section('icon', '🎉')
@section('icon_bg', '#E8F5E9')
@section('heading', 'Đặt hàng thành công!')

@section('cta_url', config('app.frontend_url', 'http://localhost:5173') . '/khach-hang/don-hang')
@section('cta_text', '📦 Theo dõi đơn hàng')

@section('content')
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 16px;">
  Xin chào <strong>{{ $data['ho_ten'] }}</strong>,
</p>
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 20px;">
  Cảm ơn bạn đã đặt hàng trên <strong style="color:#ff6b35;">FoodBee</strong>! Đơn hàng của bạn đã được tiếp nhận và đang chờ xử lý.
</p>

<!-- Order Info Box -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;border-radius:10px;border:1px solid #FFE0B2;margin-bottom:20px;">
  <tr>
    <td style="padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Mã đơn hàng</td>
          <td align="right" style="padding:6px 0;font-size:15px;font-weight:700;color:#1a1a1a;">
            #{{ $data['ma_don_hang'] }}
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Quán ăn</td>
          <td align="right" style="padding:6px 0;font-size:14px;color:#333;">
            🏪 {{ $data['ten_quan'] ?? 'N/A' }}
          </td>
        </tr>
        @if(isset($data['mon_an']) && is_array($data['mon_an']))
        <tr>
          <td colspan="2" style="padding:10px 0 4px 0;">
            <div style="border-top:1px dashed #FFE0B2;margin-bottom:8px;"></div>
            <span style="font-size:13px;font-weight:700;color:#888;">CHI TIẾT MÓN:</span>
          </td>
        </tr>
        @foreach($data['mon_an'] as $mon)
        <tr>
          <td style="padding:3px 0;font-size:14px;color:#555;">
            {{ $mon['ten'] ?? 'Món ăn' }} × {{ $mon['so_luong'] ?? 1 }}
          </td>
          <td align="right" style="padding:3px 0;font-size:14px;color:#555;">
            {{ number_format($mon['gia'] ?? 0, 0, ',', '.') }}₫
          </td>
        </tr>
        @endforeach
        @endif
        <tr>
          <td colspan="2" style="padding:8px 0 0 0;">
            <div style="border-top:1px dashed #FFE0B2;"></div>
          </td>
        </tr>
        @if(isset($data['phi_ship']))
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Phí giao hàng</td>
          <td align="right" style="padding:6px 0;font-size:14px;color:#555;">
            {{ number_format($data['phi_ship'], 0, ',', '.') }}₫
          </td>
        </tr>
        @endif
        @if(isset($data['giam_gia']) && $data['giam_gia'] > 0)
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Giảm giá</td>
          <td align="right" style="padding:6px 0;font-size:14px;color:#4CAF50;font-weight:600;">
            -{{ number_format($data['giam_gia'], 0, ',', '.') }}₫
          </td>
        </tr>
        @endif
        <tr>
          <td style="padding:10px 0 4px 0;font-size:16px;font-weight:700;color:#1a1a1a;">Tổng tiền</td>
          <td align="right" style="padding:10px 0 4px 0;font-size:20px;font-weight:700;color:#ff6b35;">
            {{ number_format($data['tong_tien'], 0, ',', '.') }}₫
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Payment Info -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;border-radius:8px;margin-bottom:16px;">
  <tr>
    <td style="padding:14px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:14px;color:#888;">Thanh toán</td>
          <td align="right" style="font-size:14px;color:#333;font-weight:600;">
            @if(isset($data['phuong_thuc']) && $data['phuong_thuc'] == 2)
              💳 Chuyển khoản (PayOS)
            @else
              💵 Tiền mặt khi nhận
            @endif
          </td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#888;padding-top:8px;">Giao đến</td>
          <td align="right" style="font-size:13px;color:#333;padding-top:8px;">
            📍 {{ $data['dia_chi'] ?? '' }}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<p style="font-size:13px;color:#999;line-height:20px;margin:12px 0 0;text-align:center;">
  ⏱️ Thời gian giao hàng dự kiến: <strong>30-45 phút</strong>
</p>
@endsection
