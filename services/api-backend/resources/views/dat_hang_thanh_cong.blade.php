<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Đặt hàng thành công</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        background: #f6f6f6;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 50px auto;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        text-align: center;
      }
      .header {
        background: #ff5722;
        color: #fff;
        padding: 25px;
        font-size: 22px;
        font-weight: bold;
      }
      .content {
        padding: 25px;
        color: #333;
        text-align: left;
      }
      .content p {
        margin: 8px 0;
        font-size: 15px;
      }
      .order-info {
        margin-top: 15px;
        background: #fafafa;
        padding: 15px;
        border-radius: 6px;
        border: 1px solid #eee;
      }
      .order-info p {
        margin: 10px 0;
      }
      .total {
        font-size: 18px;
        color: #ff5722;
        font-weight: bold;
      }
      .qr-box {
        margin-top: 25px;
        text-align: center;
      }
      .qr-box img {
        width: 200px;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 5px;
      }
      .qr-box p {
        font-size: 13px;
        color: #777;
        margin-top: 8px;
      }
      .btn-home {
        display: inline-block;
        background: #ff5722;
        color: #fff;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 6px;
        margin-top: 25px;
        font-weight: 500;
      }
      .btn-home:hover {
        background: #e64a19;
      }
      .footer {
        background: #fafafa;
        color: #666;
        font-size: 13px;
        padding: 15px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">🎉 ĐẶT HÀNG THÀNH CÔNG 🎉</div>

      <div class="content">
        <p>Xin chào <strong>{{ $data['ho_ten'] }}</strong>,</p>
        <p>Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đã được tiếp nhận thành công!</p>

        <div class="order-info">
          <p><strong>Mã đơn hàng:</strong> {{ $data['ma_don_hang'] }}</p>
          <p class="total">
            <strong>Tổng tiền:</strong> {{ number_format($data['tong_tien'], 0, ',', '.') }}₫
          </p>
        </div>

      </div>

      <div class="footer">
        Cảm ơn bạn đã mua sắm tại <strong>FoodOrder</strong> 🍲<br />
        Hẹn gặp lại bạn trong những đơn hàng tiếp theo!
      </div>
    </div>
  </body>
</html>
