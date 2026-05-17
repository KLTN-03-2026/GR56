<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            // Lý do hoàn tiền thất bại (VD: "Số dư tài khoản PayOS không đủ", "Không tìm thấy mã BIN ngân hàng")
            $table->text('refund_note')->nullable()->after('refund_payout_id');
        });
    }

    public function down(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            $table->dropColumn('refund_note');
        });
    }
};
