@extends('emails.components.layout')

@section('title', 'Hoàn tiền thành công')
@section('icon', '💸')
@section('icon_bg', '#E3F2FD')
@section('heading', 'Hoàn tiền thành công!')

@section('cta_url', config('app.frontend_url', 'http://localhost:5173') . '/khach-hang/lich-su-giao-dich')
@section('cta_text', '📋 Xem lịch sử giao dịch')

@section('content')
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 16px;">
  Xin chào <strong>{{ $data['ho_ten'] }}</strong>,
</p>
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 20px;">
  Chúng tôi đã hoàn tiền thành công cho đơn hàng <strong>#{{ $data['ma_don_hang'] }}</strong>. Xin lỗi vì sự bất tiện!
</p>

<!-- Refund Info Box -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E3F2FD;border-radius:10px;border:1px solid #BBDEFB;margin-bottom:20px;">
  <tr>
    <td style="padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Mã đơn hàng</td>
          <td align="right" style="font-size:15px;font-weight:700;color:#1a1a1a;">#{{ $data['ma_don_hang'] }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#888;">Lý do hủy</td>
          <td align="right" style="font-size:14px;color:#555;">{{ $data['ly_do'] ?? 'Không xác định' }}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 0 0 0;"><div style="border-top:1px dashed #BBDEFB;"></div></td>
        </tr>
        <tr>
          <td style="padding:10px 0 4px 0;font-size:16px;font-weight:700;">Số tiền hoàn</td>
          <td align="right" style="padding:10px 0 4px 0;font-size:20px;font-weight:700;color:#1976D2;">
            {{ number_format($data['so_tien_hoan'], 0, ',', '.') }}₫
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#888;">Hình thức</td>
          <td align="right" style="font-size:14px;color:#333;">
            @if(isset($data['hinh_thuc']) && $data['hinh_thuc'] == 'bank')
              🏦 Chuyển khoản ngân hàng
            @elseif(isset($data['hinh_thuc']) && $data['hinh_thuc'] == 'xu')
              🏆 Hoàn vào điểm XU
            @else
              💳 PayOS tự động
            @endif
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

@if(isset($data['xu_hoan']) && $data['xu_hoan'] > 0)
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8E1;border-radius:8px;border:1px solid #FFE082;margin-bottom:16px;">
  <tr>
    <td style="padding:14px 16px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#F57F17;">
        🏆 XU đã sử dụng cũng được hoàn lại: <strong>+{{ $data['xu_hoan'] }} XU</strong>
      </p>
    </td>
  </tr>
</table>
@endif

<p style="font-size:13px;color:#999;line-height:20px;margin:12px 0 0;text-align:center;">
  Nếu bạn chưa nhận được tiền hoàn trong 24 giờ,<br>
  vui lòng liên hệ hỗ trợ qua chatbot hoặc email.
</p>
@endsection
