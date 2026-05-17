<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chi_tiet_don_hangs', function (Blueprint $table) {
            $table->id();
            $table->integer('id_don_hang')->default(0);
            $table->integer('id_khach_hang');
            $table->integer('id_mon_an');
            $table->integer('id_quan_an');
            $table->integer('don_gia');
            $table->integer('so_luong');
            $table->integer('thanh_tien');
            $table->longText('ghi_chu')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chi_tiet_don_hangs');
    }
};
