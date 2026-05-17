<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            // ID shipper đang được mời nhận đơn (cascade 1-1)
            // 0 = chưa giao cho ai / đã dọn xong
            $table->unsignedBigInteger('cascade_shipper_id')->default(0)->after('id_shipper');
        });
    }

    public function down(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            $table->dropColumn('cascade_shipper_id');
        });
    }
};
