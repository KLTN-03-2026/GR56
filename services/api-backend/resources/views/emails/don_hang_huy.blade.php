@extends('emails.components.layout')

@section('title', 'Đơn hàng đã hủy')
@section('icon', '❌')
@section('icon_bg', '#FFEBEE')
@section('heading', 'Đơn hàng đã được hủy')

@section('cta_url', config('app.frontend_url', 'http://localhost:5173'))
@section('cta_text', '🍯 Đặt đơn mới')

@section('content')
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 16px;">
  Xin chào <strong>{{ $data['ho_ten'] }}</strong>,
</p>
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 20px;">
  Đơn hàng <strong>#{{ $data['ma_don_hang'] }}</strong> đã bị hủy. Rất xin lỗi vì sự bất tiện này.
</p>

<!-- Cancel Info Box -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3F0;border-radius:10px;border:1px solid #FFCDD2;margin-bottom:20px;">
  <tr>
    <td style="padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Mã đơn</td>
          <td align="right" style="font-size:15px;font-weight:700;color:#1a1a1a;">#{{ $data['ma_don_hang'] }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Quán ăn</td>
          <td align="right" style="font-size:14px;color:#333;">{{ $data['ten_quan'] ?? 'N/A' }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Lý do hủy</td>
          <td align="right" style="font-size:14px;color:#E53935;font-weight:600;">{{ $data['ly_do'] ?? 'Không xác định' }}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 0 0 0;"><div style="border-top:1px dashed #FFCDD2;"></div></td>
        </tr>
        <tr>
          <td style="padding:10px 0 4px 0;font-size:16px;font-weight:700;">Tổng tiền</td>
          <td align="right" style="padding:10px 0 4px 0;font-size:18px;font-weight:700;color:#E53935;text-decoration:line-through;">
            {{ number_format($data['tong_tien'], 0, ',', '.') }}₫
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

@if(isset($data['se_hoan_tien']) && $data['se_hoan_tien'])
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E3F2FD;border-radius:8px;border:1px solid #BBDEFB;margin-bottom:16px;">
  <tr>
    <td style="padding:14px 16px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#1976D2;">
        💰 Tiền sẽ được hoàn lại trong vòng <strong>24 giờ</strong>
      </p>
    </td>
  </tr>
</table>
@endif

<p style="font-size:13px;color:#999;line-height:20px;margin:12px 0 0;text-align:center;">
  Hãy thử đặt đơn mới — FoodBee luôn sẵn sàng phục vụ bạn! 🍜
</p>
@endsection
