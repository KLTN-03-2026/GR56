<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('ma_code')->unique();
            $table->string('ten_voucher')->nullable();
            $table->string('hinh_anh')->nullable();
            $table->string('mo_ta')->nullable();
            $table->date('thoi_gian_bat_dau');
            $table->date('thoi_gian_ket_thuc');
            $table->integer('id_quan_an')->default(0); // 0 = toàn hệ thống
            $table->integer('loai_giam');               // 0=tiền mặt, 1=phần trăm
            $table->integer('so_giam_gia');
            $table->integer('so_tien_toi_da')->nullable();
            $table->integer('don_hang_toi_thieu')->default(0);
            $table->integer('tinh_trang')->default(1);
            // Giới hạn lượt dùng
            $table->integer('so_luot_toi_da')->nullable();    // null = không giới hạn
            $table->integer('so_luot_da_dung')->default(0);
            $table->integer('so_luot_moi_nguoi')->default(1); // Mỗi người dùng được bao nhiêu lần
            // Loại voucher: public | private | system | referral
            $table->string('loai_voucher')->default('public');
            $table->unsignedBigInteger('id_khach_hang_rieng')->nullable(); // Voucher riêng 1 khách
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};
