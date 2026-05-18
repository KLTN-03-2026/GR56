<?php

namespace App\Http\Controllers;

use App\Models\DanhMuc;
use App\Models\DiaChi;
use App\Models\MonAn;
use App\Models\QuanAn;
use App\Jobs\FindShipperJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatbotController extends Controller
{
    /**
     * Tìm kiếm món ăn từ database dựa trên từ khóa chatbot
     * Endpoint PUBLIC: /api/chatbot/tim-kiem-mon-an
     */
    public function timKiemMonAn(Request $request)
    {
        try {
            $keyword = trim($request->input('keyword', ''));
            $limit   = (int) $request->input('limit', 8);
            $limit   = min(max($limit, 1), 20);

            if (strlen($keyword) < 1) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Từ khóa không hợp lệ',
                    'mon_an'  => [],
                    'quan_an' => [],
                ]);
            }

            // ── Tìm món ăn ──────────────────────────────────────────────
            $monAn = MonAn::join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
                ->leftJoin('danh_mucs', 'danh_mucs.id', '=', 'mon_ans.id_danh_muc')
                ->where('mon_ans.tinh_trang', 1)
                ->where('quan_ans.tinh_trang', 1)
                ->where('quan_ans.is_active', 1)
                ->where(function ($q) use ($keyword) {
                    $q->where('mon_ans.ten_mon_an', 'like', '%' . $keyword . '%')
                        ->orWhere('danh_mucs.ten_danh_muc', 'like', '%' . $keyword . '%')
                        ->orWhere('mon_ans.mo_ta', 'like', '%' . $keyword . '%');
                })
                ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Lon %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Ly %')
                ->select(
                    'mon_ans.id',
                    'mon_ans.ten_mon_an',
                    'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai',
                    'mon_ans.hinh_anh',
                    'mon_ans.mo_ta',
                    'mon_ans.id_quan_an',
                    'quan_ans.ten_quan_an',
                    'quan_ans.dia_chi',
                    'danh_mucs.ten_danh_muc',
                    DB::raw("CASE
                        WHEN LOWER(mon_ans.ten_mon_an) = LOWER('{$keyword}') THEN 1
                        WHEN LOWER(mon_ans.ten_mon_an) LIKE LOWER('{$keyword}%') THEN 2
                        ELSE 3
                    END as relevance")
                )
                ->orderBy('relevance')
                ->orderByDesc('mon_ans.gia_khuyen_mai')
                ->limit($limit)
                ->get();

            // ── Tìm quán ăn ─────────────────────────────────────────────
            $quanAn = QuanAn::where('tinh_trang', 1)
                ->where('is_active', 1)
                ->where(function ($q) use ($keyword) {
                    $q->where('ten_quan_an', 'like', '%' . $keyword . '%')
                        ->orWhere('dia_chi', 'like', '%' . $keyword . '%');
                })
                ->select('id', 'ten_quan_an', 'hinh_anh', 'dia_chi')
                ->limit(4)
                ->get();

            return response()->json([
                'status'  => true,
                'keyword' => $keyword,
                'mon_an'  => $monAn,
                'quan_an' => $quanAn,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
                'mon_an'  => [],
                'quan_an' => [],
            ], 500);
        }
    }

    /**
     * Gợi ý món ăn cá nhân hóa theo danh sách sở thích (keywords) của khách hàng
     * Endpoint PUBLIC: /api/chatbot/goi-y-ca-nhan
     * Body: { "keywords": ["bún", "cơm", "trà sữa"] }
     */
    public function goiYCaNhan(Request $request)
    {
        try {
            $keywords = $request->input('keywords', []);

            // Lọc + giới hạn
            if (!is_array($keywords)) {
                $keywords = [];
            }
            $keywords = array_filter(array_map('trim', $keywords));
            $keywords = array_values(array_unique($keywords));
            $keywords = array_slice($keywords, 0, 10); // tối đa 10 keyword

            if (empty($keywords)) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Không có sở thích nào được cung cấp',
                    'mon_an'  => [],
                ]);
            }

            // Build WHERE clause: OR cho tất cả keywords
            $query = MonAn::join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
                ->leftJoin('danh_mucs', 'danh_mucs.id', '=', 'mon_ans.id_danh_muc')
                ->where('mon_ans.tinh_trang', 1)
                ->where('quan_ans.tinh_trang', 1)
                ->where('quan_ans.is_active', 1)
                ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Lon %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Ly %')
                ->where(function ($q) use ($keywords) {
                    foreach ($keywords as $kw) {
                        $q->orWhere('mon_ans.ten_mon_an', 'like', '%' . $kw . '%')
                            ->orWhere('danh_mucs.ten_danh_muc', 'like', '%' . $kw . '%')
                            ->orWhere('mon_ans.mo_ta', 'like', '%' . $kw . '%');
                    }
                });

            // Tính điểm liên quan: mỗi keyword match + 1 điểm
            $scoreExpr = '0';
            foreach ($keywords as $kw) {
                $safe = addslashes($kw);
                $scoreExpr .= " + IF(LOWER(mon_ans.ten_mon_an) LIKE LOWER('%{$safe}%'), 2, 0)";
                $scoreExpr .= " + IF(LOWER(danh_mucs.ten_danh_muc) LIKE LOWER('%{$safe}%'), 1, 0)";
            }

            $monAn = $query->select(
                'mon_ans.id',
                'mon_ans.ten_mon_an',
                'mon_ans.gia_ban',
                'mon_ans.gia_khuyen_mai',
                'mon_ans.hinh_anh',
                'mon_ans.id_quan_an',
                'quan_ans.ten_quan_an',
                'quan_ans.dia_chi',
                'danh_mucs.ten_danh_muc',
                DB::raw("({$scoreExpr}) as diem_lien_quan")
            )
                ->orderByDesc(DB::raw("({$scoreExpr})"))
                ->orderByDesc('mon_ans.gia_khuyen_mai')
                ->limit(12)
                ->get();

            return response()->json([
                'status'   => true,
                'keywords' => $keywords,
                'mon_an'   => $monAn,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
                'mon_an'  => [],
            ], 500);
        }
    }

    /**
     * Món ăn bán chạy nhất (30 ngày gần nhất)
     * GET /api/chatbot/mon-an-ban-chay
     */
    public function monAnBanChay(Request $request)
    {
        try {
            $monAn = MonAn::join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
                ->join('chi_tiet_don_hangs', 'chi_tiet_don_hangs.id_mon_an', '=', 'mon_ans.id')
                ->join('don_hangs', 'don_hangs.id', '=', 'chi_tiet_don_hangs.id_don_hang')
                ->where('mon_ans.tinh_trang', 1)
                ->where('quan_ans.tinh_trang', 1)
                ->where('quan_ans.is_active', 1)
                ->where('don_hangs.tinh_trang', 4)
                ->where('don_hangs.created_at', '>=', now()->subDays(30))
                ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
                ->groupBy(
                    'mon_ans.id', 'mon_ans.ten_mon_an', 'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai', 'mon_ans.hinh_anh',
                    'mon_ans.id_quan_an', 'quan_ans.ten_quan_an', 'quan_ans.dia_chi'
                )
                ->select(
                    'mon_ans.id',
                    'mon_ans.ten_mon_an',
                    'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai',
                    'mon_ans.hinh_anh',
                    'mon_ans.id_quan_an',
                    'quan_ans.ten_quan_an',
                    'quan_ans.dia_chi',
                    DB::raw('COUNT(chi_tiet_don_hangs.id) as so_luong_ban')
                )
                ->orderByDesc('so_luong_ban')
                ->limit(8)
                ->get();

            return response()->json(['status' => true, 'mon_an' => $monAn]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'mon_an' => []], 500);
        }
    }

    /**
     * Proxy route cho AI Chat Agent — chuyển request từ FE sang Python Chatbot
     * Endpoint PUBLIC: /api/chat
     * Đặt ở public section vì chatbot cần hoạt động cho cả khách chưa đăng nhập
     */
    public function proxyChat(Request $request)
    {
        try {
            $message      = $request->input('message', '');
            $history      = $request->input('history', []);
            $userContext  = $request->input('user_context', []);

            // Đọc AI server URL từ env (mặc định localhost:5000)
            $aiServerUrl = env('AI_SERVER_URL', 'http://127.0.0.1:5000');

            $response = Http::timeout(50)
                ->post("{$aiServerUrl}/api/chat", [
                    'message'      => $message,
                    'history'      => $history,
                    'user_context' => $userContext,
                ]);

            if ($response->successful()) {
                return response()->json($response->json());
            }

            Log::error('AI Chat proxy failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            return response()->json([
                'response' => '🔌 FoodBee AI đang bận, bạn thử lại sau nhé!',
                'foods'    => [],
                '_offline' => true,
            ], 502);

        } catch (\Exception $e) {
            Log::error('AI Chat proxy exception: ' . $e->getMessage());
            return response()->json([
                'response' => '🔌 FoodBee AI hiện đang offline. Bạn có thể xem danh sách quán ăn bên dưới nhé!',
                'foods'    => [],
                'buttons'  => [['text' => '🏪 Xem danh sách quán ăn', 'type' => 'route', 'route' => '/khach-hang/list-quan-an']],
                '_offline' => true,
            ], 502);
        }
    }

    /**
     * API cho AI Chatbot đặt hàng trực tiếp
     * POST /api/chatbot/dat-hang
     */
    public function datHangTuChatbot(Request $request)
    {
        try {
            $validated = $request->validate([
                'id_khach_hang'          => 'nullable|integer',  // nullable: guest allowed
                'id_quan_an'             => 'required|integer|exists:quan_ans,id',
                'ho_ten'                 => 'required|string|max:100',
                'sdt'                    => 'required|string|max:20',
                'dia_chi'                => 'required|string|max:255',
                'mon_an_list'            => 'required|array|min:1',
                'mon_an_list.*.id_mon_an' => 'required|integer',
                'mon_an_list.*.so_luong' => 'required|integer|min:1',
                'mon_an_list.*.gia'      => 'required|numeric|min:0',
                'phuong_thuc_thanh_toan' => 'required|in:tien_mat,online',
                // Size info (optional)
                'mon_an_list.*.id_size'  => 'nullable|integer',
                'mon_an_list.*.ten_size' => 'nullable|string|max:50',
                // Topping info (optional, JSON array as string)
                'mon_an_list.*.topping_ids'   => 'nullable|string|max:500',
                'mon_an_list.*.topping_names' => 'nullable|string|max:500',
            ]);

            $khachHang = null;
            $khachHangId = $validated['id_khach_hang'] ?? 0;

            if ($khachHangId > 0) {
                $khachHang = \App\Models\KhachHang::find($khachHangId);
            }

            // Guest order: find or create a guest placeholder account
            if (!$khachHang) {
                $khachHang = \App\Models\KhachHang::first();
                if (!$khachHang) {
                    return response()->json([
                        'status' => false,
                        'message' => 'Hệ thống chưa có tài khoản khách hàng nào. Vui lòng liên hệ admin.'
                    ], 400);
                }
                Log::info("[Chatbot-Guest] Đơn không login — gán vào khách ID={$khachHang->id} ({$khachHang->ho_ten})");
            }

            $quanAn = QuanAn::find($validated['id_quan_an']);

            if (!$khachHang || !$quanAn) {
                return response()->json(['status' => false, 'message' => 'Không tìm thấy khách hàng hoặc quán ăn']);
            }

            $tien_hang = 0;
            foreach ($validated['mon_an_list'] as $mon) {
                $tien_hang += $mon['so_luong'] * $mon['gia'];
            }

            $phi_ship  = 15000;
            $tong_tien = $tien_hang + $phi_ship;

            $phuong_thuc = $validated['phuong_thuc_thanh_toan'] === 'online'
                ? \App\Models\DonHang::thanh_toan_chuyen_khoan
                : \App\Models\DonHang::thanh_toan_tien_mat;

            // Tạo bản ghi DiaChi để getDonHangShipper JOIN đúng
            $diaChiData = [
                'id_khach_hang'  => $khachHang->id,  // luôn dùng resolved customer ID
                'id_quan_huyen'  => 0,
                'dia_chi'        => $validated['dia_chi'],
                'ten_nguoi_nhan' => $validated['ho_ten'],
                'so_dien_thoai'  => $validated['sdt'],
            ];

            // Geocode địa chỉ text → tọa độ để shipper có thể chỉ đường
            $apiKey = '6TTIZbUWJmRMSpiYzQ0YY8z5v8wv43w0';
            $geocodeUrl = 'https://mapapis.openmap.vn/v1/geocode/forward?text='
                . urlencode($validated['dia_chi']) . '&apikey=' . $apiKey;
            try {
                $client = new \GuzzleHttp\Client(['timeout' => 5]);
                $response = $client->get($geocodeUrl);
                $geoData = json_decode($response->getBody()->getContents(), true);

                if (!empty($geoData['features'][0]['geometry']['coordinates'])) {
                    $coords = $geoData['features'][0]['geometry']['coordinates'];
                    $diaChiData['toa_do_y'] = floatval($coords[1]);
                    $diaChiData['toa_do_x'] = floatval($coords[0]);
                    Log::info("[Chatbot] Geocode thành công: {$validated['dia_chi']} => lat={$coords[1]}, lng={$coords[0]}");
                } else {
                    Log::warning("[Chatbot] Geocode không tìm thấy tọa độ cho: {$validated['dia_chi']}");
                }
            } catch (\Exception $e) {
                Log::warning("[Chatbot] Geocode thất bại: " . $e->getMessage());
            }

            $diaChi = DiaChi::create($diaChiData);

            $donHang = \App\Models\DonHang::create([
                'ma_don_hang'            => 'FOODBEE' . time() . rand(100, 999),
                'id_khach_hang'          => $khachHang->id,  // dùng resolved ID (không dùng validated thôi)
                'id_voucher'             => 0,
                'id_shipper'             => 0,
                'id_quan_an'             => $validated['id_quan_an'],
                'phuong_thuc_thanh_toan' => $phuong_thuc,
                'id_dia_chi_nhan'        => $diaChi->id,
                'ten_nguoi_nhan'         => $validated['ho_ten'],
                'so_dien_thoai'          => $validated['sdt'],
                'tien_hang'              => $tien_hang,
                'phi_ship'               => $phi_ship,
                'tong_tien'              => $tong_tien,
                'is_thanh_toan'          => 0,
                'tinh_trang'             => 0,
                'is_chatbot'             => 1,
            ]);

            $donHang->ma_don_hang = 'FOODBEE' . $donHang->id;
            $donHang->save();

            foreach ($validated['mon_an_list'] as $mon) {
                // Build ghi_chu from topping names if available
                $ghiChu = '';
                if (!empty($mon['topping_names'])) {
                    $ghiChu = 'Topping: ' . $mon['topping_names'];
                }
                \App\Models\ChiTietDonHang::create([
                    'id_don_hang'   => $donHang->id,
                    'id_khach_hang' => $khachHang->id,
                    'id_mon_an'    => $mon['id_mon_an'],
                    'id_quan_an'   => $validated['id_quan_an'],
                    'don_gia'      => $mon['gia'],
                    'so_luong'     => $mon['so_luong'],
                    'thanh_tien'   => $mon['gia'] * $mon['so_luong'],
                    'ghi_chu'      => $ghiChu,
                    'id_size'      => $mon['id_size'] ?? null,
                    'ten_size'     => $mon['ten_size'] ?? null,
                ]);
            }

            $response = [
                'status'       => true,
                'don_hang_id'  => $donHang->id,
                'ma_don_hang'  => $donHang->ma_don_hang,
                'tien_hang'    => $tien_hang,
                'phi_ship'     => $phi_ship,
                'tong_tien'    => $tong_tien,
            ];

            if ($validated['phuong_thuc_thanh_toan'] === 'online') {
                $donHang->load('chiTiet.monAn');
                $appScheme = rtrim(env('FOODBEE_APP_SCHEME', 'foodbee://payos'), '/');
                $returnUrl = $appScheme . '/success?' . http_build_query([
                    'id_don_hang'  => $donHang->id,
                    'ma_don_hang'  => $donHang->ma_don_hang,
                    'source'       => 'chatbot',
                ]);
                $cancelUrl = $appScheme . '/cancel?' . http_build_query([
                    'id_don_hang' => $donHang->id,
                    'source'      => 'chatbot',
                ]);
                $payosResult = \App\Services\PayOSService::taoLinkThanhToan($donHang, $returnUrl, $cancelUrl);
                if ($payosResult['status'] ?? false) {
                    $response['checkout_url']    = $payosResult['checkout_url'] ?? '';
                    $response['payment_link_id'] = $payosResult['payment_link_id'] ?? '';

                    // PayOS v2 trả qrUrl (URL CDN). KHÔNG fetch vì CDN thường bị anti-hotlinking.
                    // Thay vào đó: dùng checkout_url → user click → mở trang PayOS có sẵn QR bên trong.
                    $response['checkout_url']    = $payosResult['checkout_url'] ?? '';
                    $response['payment_link_id'] = $payosResult['payment_link_id'] ?? '';
                    $response['qr_code']         = ''; // không dùng — checkout_url đã có QR
                }
            }

            // Fire realtime notification cho shipper — CHỈ COD, PayOS chờ webhook mới bắn
            if ($phuong_thuc === \App\Models\DonHang::thanh_toan_tien_mat) {
                try {
                    \Illuminate\Support\Facades\Log::info("🚀 Fire DonHangMoiEvent (COD): đơn #{$donHang->ma_don_hang}");
                    event(new \App\Events\DonHangMoiEvent($donHang));
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Lỗi fire DonHangMoiEvent: ' . $e->getMessage());
                }
            } else {
                \Illuminate\Support\Facades\Log::info("⏳ Bỏ qua DonHangMoiEvent (PayOS): đơn #{$donHang->ma_don_hang} — chờ webhook thanh toán");
            }

            // ── DISPATCH: Tự động tìm và gửi đơn ưu tiên cho shipper gần nhất ──
            try {
                FindShipperJob::dispatchSync($donHang->fresh());
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Lỗi dispatch FindShipperJob trong chatbot: ' . $e->getMessage());
            }

            // Broadcast toast cho admin biết có đơn chatbot mới
            try {
                event(new \App\Events\AdminAlertEvent('don_hang_chatbot_moi', [
                    'id'           => $donHang->id,
                    'ma_don_hang'  => $donHang->ma_don_hang,
                    'tong_tien'    => $tong_tien,
                    'ten_quan_an'  => $quanAn->ten_quan_an ?? '',
                    'ten_nguoi_nhan' => $validated['ho_ten'],
                    'so_dien_thoai' => $validated['sdt'],
                ]));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Lỗi fire AdminAlertEvent chatbot: ' . $e->getMessage());
            }

            return response()->json($response);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Chatbot đặt hàng lỗi: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Validate voucher cho chatbot (PUBLIC — không cần auth).
     * Nhận khach_hang_id từ body thay vì token.
     *
     * POST /api/chatbot/validate-voucher
     * Body: { ma_code, id_quan_an, khach_hang_id, tong_tien_hang }
     */
    public function validateVoucherChatbot(Request $request)
    {
        $request->validate([
            'ma_code'        => 'required|string',
            'id_quan_an'     => 'required|integer|exists:quan_ans,id',
            'khach_hang_id'  => 'required|integer|exists:khach_hangs,id',
            'tong_tien_hang' => 'required|numeric|min:0',
        ]);

        $ketQua = \App\Services\VoucherService::kiemTraVoucher(
            $request->ma_code,
            (int) $request->khach_hang_id,
            (int) $request->id_quan_an,
            (int) $request->tong_tien_hang
        );

        if (!$ketQua['ok']) {
            return response()->json(['status' => false, 'message' => $ketQua['message']], 400);
        }

        $tongTienSauGiam = max(0, $request->tong_tien_hang - $ketQua['so_tien_giam']);

        return response()->json([
            'status'  => true,
            'message' => $ketQua['message'],
            'data'    => [
                'voucher'            => $ketQua['voucher'],
                'so_tien_giam'       => $ketQua['so_tien_giam'],
                'tong_tien_goc'      => $request->tong_tien_hang,
                'tong_tien_sau_giam' => $tongTienSauGiam,
            ],
        ]);
    }

    /**
     * Đề xuất voucher tốt nhất cho đơn chatbot.
     * POST /api/chatbot/de-xuat-voucher
     * Body: { id_khach_hang, id_quan_an, tong_tien_hang, limit? }
     */
    public function deXuatVoucherChatbot(Request $request)
    {
        $validated = $request->validate([
            'id_khach_hang'  => 'required|integer|exists:khach_hangs,id',
            'id_quan_an'     => 'required|integer|exists:quan_ans,id',
            'tong_tien_hang' => 'required|numeric|min:0',
            'limit'          => 'nullable|integer|min:1|max:5',
        ]);

        $vouchers = \App\Services\VoucherService::deXuatVoucher(
            (int) $validated['id_khach_hang'],
            (int) $validated['id_quan_an'],
            (int) $validated['tong_tien_hang']
        );

        usort($vouchers, function ($a, $b) {
            $discountCompare = ($b['so_tien_giam'] ?? 0) <=> ($a['so_tien_giam'] ?? 0);
            if ($discountCompare !== 0) {
                return $discountCompare;
            }

            return ($b['priority'] ?? 0) <=> ($a['priority'] ?? 0);
        });

        $limit = (int) ($validated['limit'] ?? 3);

        return response()->json([
            'status' => true,
            'data'   => array_slice($vouchers, 0, $limit),
        ]);
    }

    /**
     * Áp dụng voucher + tạo đơn hàng trong 1 transaction.
     * Gọi từ chatbot sau khi đã validate voucher.
     *
     * POST /api/chatbot/dat-hang-voucher
     * Body: { id_khach_hang, id_quan_an, ho_ten, sdt, dia_chi, mon_an_list,
     *         phuong_thuc_thanh_toan, ma_code, xu_su_dung }
     */
    public function datHangVoiVoucher(Request $request)
    {
        $validated = $request->validate([
            'id_khach_hang'          => 'nullable|integer',  // nullable: guest allowed
            'id_quan_an'             => 'required|integer|exists:quan_ans,id',
            'ho_ten'                 => 'required|string|max:100',
            'sdt'                    => 'required|string|max:20',
            'dia_chi'                => 'required|string|max:255',
            'mon_an_list'            => 'required|array|min:1',
            'mon_an_list.*.id_mon_an' => 'required|integer',
            'mon_an_list.*.so_luong' => 'required|integer|min:1',
            'mon_an_list.*.gia'      => 'required|numeric|min:0',
            'phuong_thuc_thanh_toan' => 'required|in:tien_mat,online',
            'ma_code'                => 'nullable|string',
            'xu_su_dung'             => 'nullable|integer|min:0',
            'mon_an_list.*.id_size'  => 'nullable|integer',
            'mon_an_list.*.ten_size' => 'nullable|string|max:50',
            'mon_an_list.*.topping_ids'   => 'nullable|string|max:500',
            'mon_an_list.*.topping_names' => 'nullable|string|max:500',
        ]);

        // ── Resolve customer (support guest) ───────────────────────────────
        $khachHang = null;
        $khachHangId = $validated['id_khach_hang'] ?? 0;
        if ($khachHangId > 0) {
            $khachHang = \App\Models\KhachHang::find($khachHangId);
        }
        if (!$khachHang) {
            $khachHang = \App\Models\KhachHang::first();
            if (!$khachHang) {
                return response()->json([
                    'status' => false,
                    'message' => 'Hệ thống chưa có tài khoản khách hàng nào. Vui lòng liên hệ admin.'
                ], 400);
            }
            Log::info("[Chatbot-Voucher-Guest] Đơn không login — gán vào khách ID={$khachHang->id}");
        }
        // Use resolved customer ID everywhere
        $resolvedId = $khachHang->id;

        $quanAn    = QuanAn::find($validated['id_quan_an']);

        if (!$khachHang || !$quanAn) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy khách hàng hoặc quán ăn']);
        }

        $tienHang = 0;
        foreach ($validated['mon_an_list'] as $mon) {
            $tienHang += $mon['so_luong'] * $mon['gia'];
        }

        $phiShip  = 15000;
        $tongTien = $tienHang + $phiShip;
        $xuSuDung = $validated['xu_su_dung'] ?? 0;
        $tongTienSauXu = $tongTien;
        $tongTienSauVoucher = $tongTien;

        // ── Xử lý voucher (nếu có) ────────────────────────────────────
        $idVoucher = 0;
        $soTienGiamVoucher = 0;
        if (!empty($validated['ma_code'])) {
            $ketQuaVoucher = \App\Services\VoucherService::kiemTraVoucher(
                $validated['ma_code'],
                $resolvedId,
                $validated['id_quan_an'],
                $tienHang
            );
            if ($ketQuaVoucher['ok']) {
                $idVoucher = $ketQuaVoucher['voucher']['id'];
                $soTienGiamVoucher = $ketQuaVoucher['so_tien_giam'];
                $tongTienSauVoucher = max(0, $tongTien - $soTienGiamVoucher);
                $tongTienSauXu = $tongTienSauVoucher;

                // Lưu vào voucher_usages
                \App\Models\VoucherUsage::create([
                    'id_voucher'     => $idVoucher,
                    'id_khach_hang' => $resolvedId,
                    'so_tien_da_giam' => $soTienGiamVoucher,
                ]);
            }
        }

        // ── Xử lý XU (nếu có) ──────────────────────────────────────────
        $tongTienSauXu = max(0, $tongTienSauVoucher);
        if ($xuSuDung > 0 && $khachHang->diem_xu >= $xuSuDung) {
            // 1 XU = 1 đ
            $tongTienSauXu = max(0, $tongTienSauVoucher - $xuSuDung);
        }

        $tongTien = $tongTienSauXu;

        $phuongThuc = $validated['phuong_thuc_thanh_toan'] === 'online'
            ? \App\Models\DonHang::thanh_toan_chuyen_khoan
            : \App\Models\DonHang::thanh_toan_tien_mat;

        // ── Geocode địa chỉ ─────────────────────────────────────────────
        $diaChiData = [
            'id_khach_hang'  => $resolvedId,
            'id_quan_huyen'  => 0,
            'dia_chi'        => $validated['dia_chi'],
            'ten_nguoi_nhan' => $validated['ho_ten'],
            'so_dien_thoai'  => $validated['sdt'],
        ];

        $apiKey = '6TTIZbUWJmRMSpiYzQ0YY8z5v8wv43w0';
        $geocodeUrl = 'https://mapapis.openmap.vn/v1/geocode/forward?text='
            . urlencode($validated['dia_chi']) . '&apikey=' . $apiKey;
        try {
            $client = new \GuzzleHttp\Client(['timeout' => 5]);
            $response = $client->get($geocodeUrl);
            $geoData = json_decode($response->getBody()->getContents(), true);
            if (!empty($geoData['features'][0]['geometry']['coordinates'])) {
                $coords = $geoData['features'][0]['geometry']['coordinates'];
                $diaChiData['toa_do_y'] = floatval($coords[1]);
                $diaChiData['toa_do_x'] = floatval($coords[0]);
                Log::info("[Chatbot-Voucher] Geocode OK: lat={$coords[1]}, lng={$coords[0]}");
            }
        } catch (\Exception $e) {
            Log::warning("[Chatbot-Voucher] Geocode thất bại: " . $e->getMessage());
        }

        $diaChi = DiaChi::create($diaChiData);

        // ── Tạo đơn hàng ────────────────────────────────────────────────
        $donHang = \App\Models\DonHang::create([
            'ma_don_hang'            => 'FOODBEE' . time() . rand(100, 999),
            'id_khach_hang'          => $resolvedId,
            'id_voucher'             => $idVoucher,
            'id_shipper'             => 0,
            'id_quan_an'             => $validated['id_quan_an'],
            'phuong_thuc_thanh_toan' => $phuongThuc,
            'id_dia_chi_nhan'        => $diaChi->id,
            'ten_nguoi_nhan'         => $validated['ho_ten'],
            'so_dien_thoai'          => $validated['sdt'],
            'dia_chi_giao'           => $validated['dia_chi'],
            'tien_hang'              => $tienHang,
            'phi_ship'               => $phiShip,
            'tong_tien'              => $tongTien,
            'tien_giam_tu_voucher'   => $soTienGiamVoucher,
            'xu_su_dung'             => $xuSuDung,
            'is_thanh_toan'          => 0,
            'tinh_trang'             => 0,
            'is_chatbot'             => 1,
        ]);

        $donHang->ma_don_hang = 'FOODBEE' . $donHang->id;
        $donHang->save();

        foreach ($validated['mon_an_list'] as $mon) {
            $ghiChu = '';
            if (!empty($mon['topping_names'])) {
                $ghiChu = 'Topping: ' . $mon['topping_names'];
            }
            \App\Models\ChiTietDonHang::create([
                'id_don_hang'   => $donHang->id,
                'id_khach_hang' => $resolvedId,
                'id_mon_an'     => $mon['id_mon_an'],
                'id_quan_an'    => $validated['id_quan_an'],
                'don_gia'       => $mon['gia'],
                'so_luong'      => $mon['so_luong'],
                'thanh_tien'    => $mon['gia'] * $mon['so_luong'],
                'ghi_chu'       => $ghiChu,
                'id_size'       => $mon['id_size'] ?? null,
                'ten_size'      => $mon['ten_size'] ?? null,
            ]);
        }

        // ── Trừ XU khách hàng ───────────────────────────────────────────
        if ($xuSuDung > 0) {
            $khachHang->diem_xu = max(0, $khachHang->diem_xu - $xuSuDung);
            $khachHang->save();

            \App\Models\LichSuXu::create([
                'id_khach_hang'     => $resolvedId,
                'so_xu'             => $xuSuDung,
                'loai_giao_dich'    => 0,
                'mo_ta'             => "Sử dụng {$xuSuDung} XU cho đơn #{$donHang->ma_don_hang}",
                'id_don_hang'       => $donHang->id,
            ]);
        }

        $response = [
            'status'        => true,
            'don_hang_id'   => $donHang->id,
            'ma_don_hang'   => $donHang->ma_don_hang,
            'tien_hang'     => $tienHang,
            'phi_ship'      => $phiShip,
            'tong_tien'     => $tongTien,
            'voucher_giam'  => $soTienGiamVoucher,
            'xu_su_dung'    => $xuSuDung,
            'tong_tien_goc' => $tongTienSauVoucher + $xuSuDung,
            'message'       => "Đơn hàng #{$donHang->ma_don_hang} đã được tạo thành công!",
        ];

        if ($validated['phuong_thuc_thanh_toan'] === 'online') {
            $appScheme = rtrim(env('FOODBEE_APP_SCHEME', 'foodbee://payos'), '/');
            $returnUrl = $appScheme . '/success?' . http_build_query([
                'id_don_hang'  => $donHang->id,
                'ma_don_hang'  => $donHang->ma_don_hang,
                'source'       => 'chatbot',
            ]);
            $cancelUrl = $appScheme . '/cancel?' . http_build_query([
                'id_don_hang' => $donHang->id,
                'source'      => 'chatbot',
            ]);
            $payosResult = \App\Services\PayOSService::taoLinkThanhToan($donHang, $returnUrl, $cancelUrl);
            if ($payosResult['status'] ?? false) {
                $response['checkout_url']    = $payosResult['checkout_url'] ?? '';
                $response['payment_link_id'] = $payosResult['payment_link_id'] ?? '';
                $response['qr_code']         = '';
            }
        }

        // Fire events
        if ($phuongThuc === \App\Models\DonHang::thanh_toan_tien_mat) {
            try {
                event(new \App\Events\DonHangMoiEvent($donHang));
                Log::info("🚀 Fire DonHangMoiEvent (Voucher+Chatbot): đơn #{$donHang->ma_don_hang}");
            } catch (\Exception $e) {
                Log::error('Lỗi fire DonHangMoiEvent: ' . $e->getMessage());
            }
        }

        try {
            FindShipperJob::dispatchSync($donHang->fresh());
        } catch (\Exception $e) {
            Log::error('Lỗi dispatch FindShipperJob trong chatbot-voucher: ' . $e->getMessage());
        }

        try {
            event(new \App\Events\AdminAlertEvent('don_hang_chatbot_moi', [
                'id'             => $donHang->id,
                'ma_don_hang'    => $donHang->ma_don_hang,
                'tong_tien'      => $tongTien,
                'ten_quan_an'    => $quanAn->ten_quan_an ?? '',
                'ten_nguoi_nhan' => $validated['ho_ten'],
                'so_dien_thoai'  => $validated['sdt'],
            ]));
        } catch (\Exception $e) {
            Log::error('Lỗi fire AdminAlertEvent chatbot-voucher: ' . $e->getMessage());
        }

        return response()->json($response);
    }
}
