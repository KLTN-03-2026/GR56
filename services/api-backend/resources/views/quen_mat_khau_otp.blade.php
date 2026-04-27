<!DOCTYPE html>
<html lang="vi" style="padding:0;Margin:0">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Đặt lại mật khẩu</title>
  <link href="https://fonts.googleapis.com/css?family=Lato:400,700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Lato',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f4;">
    <tr>
      <td align="center" style="padding:30px 10px;">

        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:#ff5722;padding:20px;">
              <h2 style="color:#ffffff;margin:0;font-size:22px;">🍲 FoodBee</h2>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td align="center" style="padding:40px 30px 20px 30px;">
              <h1 style="font-size:26px;line-height:34px;color:#111111;margin:0;font-weight:700;">
                Đặt lại mật khẩu 🔐
              </h1>
              <p style="font-size:16px;color:#555555;line-height:24px;margin:16px 0 0;">
                Xin chào <strong>{{ $data['ho_va_ten'] }}</strong>, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
              </p>
            </td>
          </tr>

          <!-- OTP Code -->
          <tr>
            <td style="padding:20px 30px 30px 30px;">
              <p style="font-size:16px;color:#555555;line-height:24px;margin:0 0 20px;">
                Sử dụng mã xác nhận bên dưới để đặt lại mật khẩu. Mã có hiệu lực trong <strong>10 phút</strong>.
              </p>

              <div style="text-align:center;margin:20px 0;">
                <div style="display:inline-block;background:#fff3f0;border:2px dashed #ff5722;border-radius:12px;padding:20px 40px;">
                  <p style="margin:0 0 6px;font-size:13px;color:#999;letter-spacing:1px;text-transform:uppercase;">Mã xác nhận</p>
                  <span style="font-size:42px;font-weight:700;color:#ff5722;letter-spacing:10px;">{{ $data['ma_otp'] }}</span>
                </div>
              </div>

              <p style="font-size:14px;color:#777777;line-height:22px;margin:20px 0 0;text-align:center;">
                ⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:25px 30px;color:#555555;font-size:15px;line-height:22px;text-align:center;background:#fafafa;">
              <p style="margin:0;">Trân trọng,</p>
              <p style="margin:4px 0 0;font-weight:600;">Đội ngũ Hỗ trợ FoodBee</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
