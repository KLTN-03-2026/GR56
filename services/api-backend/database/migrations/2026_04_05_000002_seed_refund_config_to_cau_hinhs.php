<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Thêm cấu hình tự động hoàn tiền nếu chưa tồn tại
        $configs = [
            [
                'ma_cau_hinh' => 'refund_enabled',
                'gia_tri'     => '1',
                'mo_ta'       => 'Bật/tắt tính năng tự động hoàn tiền PayOS (1=bật, 0=tắt)',
            ],
            [
                'ma_cau_hinh' => 'refund_delay_minutes',
                'gia_tri'     => '5',
                'mo_ta'       => 'Số phút chờ trước khi tự động hoàn tiền sau khi đơn bị hủy',
            ],
        ];

        foreach ($configs as $config) {
            DB::table('cau_hinhs')->updateOrInsert(
                ['ma_cau_hinh' => $config['ma_cau_hinh']],
                array_merge($config, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }

    public function down(): void
    {
        DB::table('cau_hinhs')->whereIn('ma_cau_hinh', [
            'refund_enabled',
            'refund_delay_minutes',
        ])->delete();
    }
};
