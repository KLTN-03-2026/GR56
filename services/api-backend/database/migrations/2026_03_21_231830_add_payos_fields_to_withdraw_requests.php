<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Thêm các cột PayOS vào bảng withdraw_requests:
     *   - payos_payout_id  : ID lệnh chi từ PayOS
     *   - payos_reference  : Reference ID gửi lên PayOS
     *   - payos_state      : Trạng thái từ PayOS (PROCESSING, COMPLETED, FAILED...)
     *
     * Và thêm trạng thái mới 'dang_chuyen' (PayOS đang xử lý chuyển tiền)
     * Luồng: cho_duyet → da_duyet (thủ công) | dang_chuyen (PayOS) → da_chuyen
     */
    public function up(): void
    {
        Schema::table('withdraw_requests', function (Blueprint $table) {
            // Cột PayOS Payout
            $table->string('payos_payout_id', 100)->nullable()->after('thoi_gian_chuyen')
                  ->comment('ID lệnh chi từ PayOS');
            $table->string('payos_reference', 100)->nullable()->after('payos_payout_id')
                  ->comment('Reference ID gửi lên PayOS');
            $table->string('payos_state', 50)->nullable()->after('payos_reference')
                  ->comment('Trạng thái lệnh chi từ PayOS: PROCESSING, COMPLETED, FAILED');
        });
    }

    public function down(): void
    {
        Schema::table('withdraw_requests', function (Blueprint $table) {
            $table->dropColumn(['payos_payout_id', 'payos_reference', 'payos_state']);
        });
    }
};
