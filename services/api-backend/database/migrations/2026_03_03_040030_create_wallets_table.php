<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            // loai_vi: 'quan_an' hoặc 'shipper'
            $table->enum('loai_vi', ['quan_an', 'shipper']);
            // ID của quán ăn hoặc shipper
            $table->unsignedBigInteger('id_chu_vi');
            // Số dư hiện tại
            $table->decimal('so_du', 15, 2)->default(0);
            // Tổng tiền đã nhận (cumulative)
            $table->decimal('tong_tien_nhan', 15, 2)->default(0);
            // Tổng tiền đã rút (cumulative)
            $table->decimal('tong_tien_rut', 15, 2)->default(0);
            $table->timestamps();

            // Mỗi quán/shipper chỉ có 1 ví
            $table->unique(['loai_vi', 'id_chu_vi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
