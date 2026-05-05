<?php

namespace App\Http\Controllers;

use App\Jobs\SendMailJob;
use App\Mail\MasterMail;
use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use App\Models\GiaoDich;
use App\Models\KhachHang;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TestController extends Controller
{
    public function convert($input)
    {
        preg_match('/DZ(\d+)/', $input, $matches);
        if (isset($matches[1])) {
            $dzNumber = $matches[1];
            return $dzNumber;
        } else {
            return 0;
        }
    }
    public function GetTransaction()
    {
        $payload = [
            "USERNAME"  => "0394425076",
            "PASSWORD"  => "Nhan130504@@@@@",
            "DAY_BEGIN" => "01/12/2025",
            "DAY_END"   => "30/12/2025",
            "NUMBER_MB" => "0394425076"
        ];

        $client = new \GuzzleHttp\Client();
        $res = $client->post("https://api-mb.midstack.io.vn/api/transactions", [
            'json' => $payload
        ]);

        $data = json_decode($res->getBody()->getContents(), true);

        $transactions = $data['data']['transactionHistoryList'] ?? [];
        foreach ($transactions as $index => $item) {
            if (floatval($item['creditAmount']) > 0) {
                $check = GiaoDich::where('refNo', $item['refNo'])->first();
                if (!$check) {
                    $code = $this->convert($item['description']);
                    $so_tien_nhan = floatval($item['creditAmount']);
                    GiaoDich::create([
                        'refNo'             => $item['refNo'],
                        'creditAmount'      => $item['creditAmount'],
                        'description'       => $item['description'],
                        'transactionDate'   => $item['transactionDate'],
                        'code'              => $code,
                    ]);

                    $don_hang = DonHang::where('id', $code)
                        ->where('is_thanh_toan', DonHang::CHUA_THANH_TOAN)
                        ->whereNull('so_tien_nhan')->first();

                    if ($don_hang) {
                        Log::info($don_hang->toArray());

                        $don_hang->is_thanh_toan    = 1;
                        // $don_hang->tinh_trang       = 1;
                        $don_hang->so_tien_nhan     = $so_tien_nhan;

                        $don_hang->save();

                        $khach_hang = KhachHang::where('id', $don_hang->id_khach_hang)->first();

                        $data['ho_ten']                   = $khach_hang->ho_va_ten;
                        $data['tong_tien']          = $don_hang->tong_tien;
                        $data['ma_don_hang']        = $don_hang->ma_don_hang;
                        // Mail::to($khach_hang->email)->send(new MasterMail('Thanh toán hoàn tất quý khách vui lòng kiếm tra email', 'dat_hang_thanh_cong', $data));
                        SendMailJob::dispatch($khach_hang->email, 'Thanh toán hoàn tất quý khách vui lòng kiếm tra email', 'dat_hang_thanh_cong', $data);
                        return response()->json([
                            'status'    => 1,
                            'message'   => 'Thanh toán hoàn tất',
                        ]);
                    }

                }
            }
        }
    }
}
