<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('don_hangs', function (Blueprint $table) {
            $table->id();
            $table->string('ma_don_hang')->unique();
            $table->integer('id_khach_hang');
            $table->integer('id_voucher')->nullable();
            $table->integer('id_shipper')->nullable();
            $table->integer('id_quan_an');
            $table->integer('id_dia_chi_nhan');
            $table->string('ten_nguoi_nhan');
            $table->string('so_dien_thoai');
            $table->double('tien_hang')->default(0);
            $table->double('phi_ship')->default(0);
            $table->double('tong_tien')->default(0);
            $table->double('so_tien_nhan')->default(0);          // Tiền shipper nhận từ khách
            $table->integer('phuong_thuc_thanh_toan')->default(1); // 1=tiền mặt, 2=chuyển khoản
            $table->integer('is_thanh_toan')->default(0);
            $table->integer('tinh_trang')->default(0);
            // Settlement (đối soát thanh toán cho quán / shipper)
            $table->decimal('chiet_khau_phan_tram', 5, 2)->default(15);
            $table->decimal('tien_chiet_khau', 15, 2)->nullable();
            $table->decimal('tien_quan_an', 15, 2)->nullable();
            $table->decimal('tien_shipper', 15, 2)->nullable();
            $table->boolean('da_doi_soat')->default(false);
            $table->timestamp('thoi_gian_doi_soat')->nullable();
            $table->boolean('da_dat_coc')->default(false); // Đã đặt cọc tiền mặt chưa

            $table->integer('xu_su_dung')->default(0);
            $table->double('tien_giam_tu_xu')->default(0);
            $table->integer('xu_tich_luy')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('don_hangs');
    }
};
