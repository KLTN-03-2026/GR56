<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Report;
use App\Models\DonHang;
use App\Models\KhachHang;
use App\Models\Shipper;
use App\Models\QuanAn;
use App\Services\WalletService;
use App\Events\DonHangDaHuyEvent;
use App\Events\AdminAlertEvent;
use App\Jobs\RefundPayOSJob;
use App\Models\CauHinh;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ReportController extends Controller
{
    // Dành cho Client: Khách Hàng, Shipper, Quán Ăn
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tieu_de'    => 'required|string|max:255',
            'noi_dung'   => 'required|string',
            'id_don_hang'=> 'nullable|integer',
            'hinh_anh'   => 'nullable|image|max:10240',
            'yeu_cau_huy'=> 'nullable|boolean',
            'ly_do_huy'  => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => false,
                'message' => $validator->errors()->first()
            ], 400);
        }

        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Unauthorized'], 401);
        }

        // Nếu yêu cầu hủy đơn → kiểm tra đơn có đang active không
        $yeu_cau_huy = (bool) $request->input('yeu_cau_huy', false);
        if ($yeu_cau_huy && $request->id_don_hang) {
            $donHang = DonHang::find($request->id_don_hang);
            if (!$donHang || !in_array($donHang->tinh_trang, [0, 1, 2, 3])) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Đơn hàng này không thể yêu cầu hủy (đã hoàn thành hoặc đã hủy).'
                ], 400);
            }
        }

        $hinh_anh_path = null;
        if ($request->hasFile('hinh_anh')) {
            $file     = $request->file('hinh_anh');
            $filename = time() . '_' . $file->getClientOriginalName();
            $file->move(public_path('assets/reports'), $filename);
            $hinh_anh_path = 'assets/reports/' . $filename;
        }

        $report = Report::create([
            'reporter_id'  => $user->id,
            'reporter_type'=> get_class($user),
            'id_don_hang'  => $request->id_don_hang,
            'tieu_de'      => $request->tieu_de,
            'noi_dung'     => $request->noi_dung,
            'hinh_anh'     => $hinh_anh_path,
            'yeu_cau_huy'  => $yeu_cau_huy,
            'ly_do_huy'    => $yeu_cau_huy ? $request->ly_do_huy : null,
            'da_duyet_huy' => false,
        ]);

        $message = $yeu_cau_huy
            ? 'Đã gửi yêu cầu hủy đơn hàng. Admin sẽ xem xét và xử lý sớm nhất!'
            : 'Đã gửi báo cáo / khiếu nại thành công.';

        // ── Broadcast alert đến Admin ────────────────────────────
        try {
            $nguoiGui = get_class($user) === 'App\Models\KhachHang' ? 'Khách hàng'
                       : (get_class($user) === 'App\Models\Shipper' ? 'Shipper' : 'Quán ăn');
            $payloadAlert = [
                'report_id'   => $report->id,
                'tieu_de'     => $report->tieu_de,
                'nguoi_gui'   => $nguoiGui . ': ' . ($user->ho_va_ten ?? $user->ten_quan_an ?? ''),
                'id_don_hang' => $report->id_don_hang,
                'ma_don_hang' => $report->id_don_hang ? (DonHang::find($report->id_don_hang)?->ma_don_hang ?? '') : '',
            ];
            broadcast(new AdminAlertEvent($yeu_cau_huy ? 'yeu_cau_huy' : 'bao_cao_moi', $payloadAlert));
        } catch (\Exception $e) {
            \Log::error('[AdminAlert] Broadcast error: ' . $e->getMessage());
        }
        // ──────────────────────────────────────────────────────────

        return response()->json([
            'status'  => true,
            'message' => $message,
        ]);
    }

    // Dành cho Admin
    public function getAdminReports(Request $request)
    {
        $query = Report::with(['reporter', 'donHang', 'donHang.quanAn', 'donHang.khachHang']);

        if ($request->has('trang_thai') && $request->trang_thai != 'all') {
            $query->where('trang_thai', $request->trang_thai);
        }

        if ($request->has('reporter_type') && $request->reporter_type != 'all') {
            $typeClass = '';
            if ($request->reporter_type == 'khach_hang') $typeClass = 'App\Models\KhachHang';
            else if ($request->reporter_type == 'shipper') $typeClass = 'App\Models\Shipper';
            else if ($request->reporter_type == 'quan_an') $typeClass = 'App\Models\QuanAn';

            if ($typeClass) {
                $query->where('reporter_type', $typeClass);
            }
        }

        // Filter yêu cầu hủy
        if ($request->has('yeu_cau_huy') && $request->yeu_cau_huy == '1') {
            $query->where('yeu_cau_huy', true);
        }

        $reports = $query->orderBy('yeu_cau_huy', 'desc') // ưu tiên yêu cầu hủy lên đầu
                         ->orderBy('created_at', 'desc')
                         ->get();

        $reports->map(function ($report) {
            if ($report->reporter_type === 'App\Models\KhachHang') {
                $report->reporter_role  = 'Khách hàng';
                $report->reporter_name  = $report->reporter ? $report->reporter->ho_va_ten : 'N/A';
                $report->reporter_phone = $report->reporter ? $report->reporter->so_dien_thoai : 'N/A';
            } elseif ($report->reporter_type === 'App\Models\Shipper') {
                $report->reporter_role  = 'Shipper';
                $report->reporter_name  = $report->reporter ? $report->reporter->ho_va_ten : 'N/A';
                $report->reporter_phone = $report->reporter ? $report->reporter->so_dien_thoai : 'N/A';
            } elseif ($report->reporter_type === 'App\Models\QuanAn') {
                $report->reporter_role  = 'Quán ăn';
                $report->reporter_name  = $report->reporter ? $report->reporter->ten_quan_an : 'N/A';
                $report->reporter_phone = $report->reporter ? $report->reporter->so_dien_thoai : 'N/A';
            }
            return $report;
        });

        return response()->json([
            'status' => true,
            'data'   => $reports
        ]);
    }

    public function updateAdminReport(Request $request)
    {
        $request->validate([
            'id'         => 'required|exists:reports,id',
            'trang_thai' => 'required|string',
        ]);

        $report = Report::find($request->id);
        $report->trang_thai = $request->trang_thai;

        if ($request->has('ghi_chu_admin')) {
            $report->ghi_chu_admin = $request->ghi_chu_admin;
        }
        $report->save();

        if ($report->reporter) {
            try {
                $report->reporter->notify(new \App\Notifications\ReportProcessedNotification($report));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error sending notification: ' . $e->getMessage());
            }
        }

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật trạng thái báo cáo thành công!'
        ]);
    }

    /**
     * Admin duyệt hủy đơn hàng từ report
     */
    public function duyetHuyDon(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:reports,id',
        ]);

        $report = Report::find($request->id);

        if (!$report->yeu_cau_huy) {
            return response()->json([
                'status'  => false,
                'message' => 'Báo cáo này không phải yêu cầu hủy đơn.'
            ], 400);
        }

        if ($report->da_duyet_huy) {
            return response()->json([
                'status'  => false,
                'message' => 'Yêu cầu hủy này đã được duyệt rồi.'
            ], 400);
        }

        if (!$report->id_don_hang) {
            return response()->json([
                'status'  => false,
                'message' => 'Báo cáo này không liên kết với đơn hàng nào.'
            ], 400);
        }

        $donHang = DonHang::find($report->id_don_hang);

        if (!$donHang) {
            return response()->json([
                'status'  => false,
                'message' => 'Không tìm thấy đơn hàng.'
            ], 404);
        }

        if (!in_array($donHang->tinh_trang, [0, 1, 2, 3])) {
            return response()->json([
                'status'  => false,
                'message' => 'Đơn hàng đã hoàn thành hoặc đã hủy trước đó, không thể hủy nữa.'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Hủy đơn hàng
            $donHang->update(['tinh_trang' => 5]);

            // ── Hoàn xu và voucher cho khách ──────────────────────
            try {
                WalletService::hoanXuVaVoucher($donHang);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Không thể hoàn xu/voucher: ' . $e->getMessage());
            }

            // Nếu khách đã thanh toán PayOS → dispatch RefundPayOSJob
            if ($donHang->is_thanh_toan == 1 && $donHang->phuong_thuc_thanh_toan == 3) {
                $enabled = CauHinh::getVal('refund_enabled', 1);
                $delay   = intval(CauHinh::getVal('refund_delay_minutes', 5));
                if ($enabled) {
                    RefundPayOSJob::dispatch($donHang->id, $donHang->tong_tien, 'Admin duyệt hủy đơn - hoàn tiền tự động')
                        ->delay(now()->addMinutes($delay));
                }
            }

            // Nếu khách đã thanh toán chuyển khoản thủ công → hoàn tiền vào ví (không có PayOS)
            if ($donHang->is_thanh_toan == 1 && $donHang->phuong_thuc_thanh_toan == 2) {
                try {
                    WalletService::hoanTienHuyDon($donHang);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Không thể hoàn tiền tự động (CK): ' . $e->getMessage());
                }
            }

            // Nếu shipper đã nhận đơn COD → hoàn tiền đặt cọc
            if ($donHang->id_shipper && $donHang->phuong_thuc_thanh_toan == 1) {
                try {
                    WalletService::hoanCocCODChoShipper($donHang);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Không thể hoàn cọc COD: ' . $e->getMessage());
                }
            }

            // Cập nhật report
            $report->da_duyet_huy = true;
            $report->trang_thai   = 'da_xu_ly';
            $report->save();

            DB::commit();

            // Broadcast realtime: cập nhật trạng thái đơn hàng đến khách, quán, shipper
            broadcast(new DonHangDaHuyEvent($donHang))->toOthers();

            // Luôn gửi notification cho KHÁCH HÀNG có đơn bị hủy
            $khachHang = KhachHang::find($donHang->id_khach_hang);
            if ($khachHang) {
                try {
                    $khachHang->notify(new \App\Notifications\ReportProcessedNotification($report));
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Lỗi gửi notification khách hàng: ' . $e->getMessage());
                }
            }

            // Gửi notification cho SHIPPER (nếu đơn đã có shipper nhận)
            if ($donHang->id_shipper) {
                $shipper = Shipper::find($donHang->id_shipper);
                if ($shipper) {
                    try {
                        $shipper->notify(new \App\Notifications\ReportProcessedNotification($report));
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error('Lỗi gửi notification shipper: ' . $e->getMessage());
                    }
                }
            }

            // Luôn gửi notification cho QUÁN ĂN có đơn bị hủy
            $quanAn = QuanAn::find($donHang->id_quan_an);
            if ($quanAn) {
                try {
                    $quanAn->notify(new \App\Notifications\ReportProcessedNotification($report));
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Lỗi gửi notification quán ăn: ' . $e->getMessage());
                }
            }

            // Nếu reporter không phải khách, shipper, hay quán ⇒ vẫn gửi cho reporter
            $isReporterKhachHangCuaDon = $report->reporter instanceof KhachHang
                && (int) $report->reporter->id === (int) $donHang->id_khach_hang;
            $isReporterShipperCuaDon = $report->reporter instanceof Shipper
                && (int) $report->reporter->id === (int) $donHang->id_shipper;
            $isReporterQuanAnCuaDon = $report->reporter instanceof QuanAn
                && (int) $report->reporter->id === (int) $donHang->id_quan_an;

            if ($report->reporter && !$isReporterKhachHangCuaDon && !$isReporterShipperCuaDon && !$isReporterQuanAnCuaDon) {
                try {
                    $report->reporter->notify(new \App\Notifications\ReportProcessedNotification($report));
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Error sending notification to reporter: ' . $e->getMessage());
                }
            }

            return response()->json([
                'status'  => true,
                'message' => 'Đã duyệt hủy đơn hàng #' . $donHang->ma_don_hang . ' thành công!'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Lỗi duyệt hủy đơn: ' . $e->getMessage());
            return response()->json([
                'status'  => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }
}
