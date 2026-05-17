<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Thêm cột payos_payment_link_id vào bảng don_hangs
     * Dùng để lưu ID link thanh toán PayOS khi khách tạo link
     */
    public function up(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            $table->string('payos_payment_link_id', 100)->nullable()->after('so_tien_nhan')
                  ->comment('PayOS Payment Link ID');
        });
    }

    public function down(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            $table->dropColumn('payos_payment_link_id');
        });
    }
};
