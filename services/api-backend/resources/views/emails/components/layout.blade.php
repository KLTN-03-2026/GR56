<!DOCTYPE html>
<html lang="vi" style="padding:0;margin:0">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>@yield('title', 'FoodBee')</title>
  <link href="https://fonts.googleapis.com/css?family=Lato:400,700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Lato',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f4;">
    <tr>
      <td align="center" style="padding:30px 10px;">

        <!-- Wrapper -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#ff6b35,#ff8f00);padding:24px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding-right:12px;">
                    <div style="width:44px;height:44px;background:#fff;border-radius:50%;text-align:center;line-height:44px;font-size:26px;">🍯</div>
                  </td>
                  <td>
                    <span style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">FoodBee</span>
                    <br>
                    <span style="font-size:12px;color:rgba(255,255,255,0.85);letter-spacing:0.5px;">Đặt món ngon · Giao tận nơi</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Icon Banner -->
          <tr>
            <td align="center" style="padding:32px 30px 8px 30px;">
              <div style="width:72px;height:72px;border-radius:50%;background:@yield('icon_bg', '#FFF3E0');text-align:center;line-height:72px;font-size:36px;margin:0 auto;">
                @yield('icon', '📧')
              </div>
              <h1 style="font-size:24px;line-height:32px;color:#1a1a1a;margin:16px 0 0;font-weight:700;">
                @yield('heading', 'Thông báo từ FoodBee')
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:16px 30px 24px 30px;">
              @yield('content')
            </td>
          </tr>

          <!-- CTA Button -->
          @hasSection('cta_url')
          <tr>
            <td align="center" style="padding:0 30px 30px 30px;">
              <a href="@yield('cta_url')" target="_blank"
                style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#ff6b35,#ff8f00);
                       color:#ffffff;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none;
                       box-shadow:0 4px 12px rgba(255,107,53,0.3);">
                @yield('cta_text', 'Xem ngay')
              </a>
            </td>
          </tr>
          @endif

          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#888;line-height:20px;">
                Email này được gửi tự động từ <strong style="color:#ff6b35;">FoodBee</strong> 🍯
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#aaa;">
                Đà Nẵng, Việt Nam · <a href="{{ config('app.frontend_url', 'http://localhost:5173') }}" style="color:#ff6b35;text-decoration:none;">foodbee.vn</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
