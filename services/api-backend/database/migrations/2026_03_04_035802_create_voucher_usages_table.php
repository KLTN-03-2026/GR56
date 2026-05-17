<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voucher_usages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_voucher');
            $table->unsignedBigInteger('id_khach_hang');
            $table->unsignedBigInteger('id_don_hang')->nullable();
            $table->integer('so_tien_da_giam')->default(0);
            $table->timestamps();

            // Mỗi khách hàng chỉ dùng 1 voucher 1 lần (trừ khi voucher cho phép nhiều lần)
            $table->index(['id_voucher', 'id_khach_hang']);
            $table->foreign('id_voucher')->references('id')->on('vouchers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_usages');
    }
};
