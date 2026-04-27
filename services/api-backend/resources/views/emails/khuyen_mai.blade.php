@extends('emails.components.layout')

@section('title', 'Khuyến mãi dành riêng cho bạn')
@section('icon', '🎟️')
@section('icon_bg', '#F3E5F5')
@section('heading', 'Ưu đãi dành riêng cho bạn!')

@section('cta_url', config('app.frontend_url', 'http://localhost:5173'))
@section('cta_text', '🍯 Đặt món ngay')

@section('content')
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 16px;">
  Xin chào <strong>{{ $data['ho_ten'] }}</strong>,
</p>
<p style="font-size:15px;color:#555;line-height:24px;margin:0 0 24px;">
  FoodBee dành tặng bạn mã giảm giá đặc biệt! 🎁 Nhanh tay sử dụng trước khi hết hạn nhé.
</p>

@if(isset($data['vouchers']) && is_array($data['vouchers']))
@foreach($data['vouchers'] as $v)
<!-- Voucher Card -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#FFF3E0,#FFECB3);border-radius:12px;border:2px dashed #FFB74D;margin-bottom:16px;">
  <tr>
    <td style="padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="font-size:28px;font-weight:800;color:#E65100;">
              @if(isset($v['loai_giam']) && $v['loai_giam'] == 1)
                {{ $v['so_giam'] }}%
              @else
                {{ number_format($v['so_giam'] ?? 0, 0, ',', '.') }}₫
              @endif
            </span>
            <span style="font-size:14px;color:#888;margin-left:8px;">GIẢM GIÁ</span>
          </td>
        </tr>
        <tr>
          <td style="padding-top:8px;">
            <div style="display:inline-block;background:#ff6b35;color:#fff;padding:6px 16px;border-radius:6px;font-size:16px;font-weight:700;letter-spacing:2px;">
              {{ $v['ma_code'] ?? 'FOODBEE' }}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding-top:10px;">
            @if(isset($v['don_toi_thieu']) && $v['don_toi_thieu'] > 0)
            <p style="margin:0;font-size:13px;color:#888;">
              📝 Đơn tối thiểu: {{ number_format($v['don_toi_thieu'], 0, ',', '.') }}₫
            </p>
            @endif
            @if(isset($v['han_su_dung']))
            <p style="margin:4px 0 0;font-size:13px;color:#E53935;">
              ⏰ Hết hạn: {{ $v['han_su_dung'] }}
            </p>
            @endif
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
@endforeach
@endif

<p style="font-size:13px;color:#999;line-height:20px;margin:12px 0 0;text-align:center;">
  Nhập mã voucher khi thanh toán để được giảm giá.<br>
  Mỗi mã chỉ sử dụng được 1 lần.
</p>
@endsection
