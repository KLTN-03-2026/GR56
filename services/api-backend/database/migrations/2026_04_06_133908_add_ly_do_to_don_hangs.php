<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            // Lý do hủy đơn: 'auto_cancel' | 'admin' | 'khach' | null
            $table->string('ly_do', 50)->nullable()->after('tinh_trang');
        });
    }

    public function down(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            $table->dropColumn('ly_do');
        });
    }
};
