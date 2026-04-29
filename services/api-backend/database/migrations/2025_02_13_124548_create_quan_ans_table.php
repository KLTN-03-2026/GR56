<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quan_ans', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('ma_so_thue')->nullable();
            $table->string('ten_quan_an');
            $table->string('hinh_anh')->nullable();
            $table->integer('id_quan_huyen');
            $table->text('dia_chi');
            $table->string('so_dien_thoai')->unique();
            $table->time('gio_mo_cua')->nullable();
            $table->time('gio_dong_cua')->nullable();
            $table->integer('tong_tien')->default(0);
            $table->integer('is_active')->default(0);
            $table->integer('tinh_trang')->default(0);
            $table->double('toa_do_x')->nullable();
            $table->double('toa_do_y')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quan_ans');
    }
};
