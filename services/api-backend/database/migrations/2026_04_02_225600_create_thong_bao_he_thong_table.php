<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('thong_bao_he_thong', function (Blueprint $table) {
            $table->id();
            $table->string('tieu_de');
            $table->text('noi_dung');
            $table->string('hinh_anh')->nullable();
            $table->string('duong_dan')->nullable();         // URL redirect khi click
            $table->enum('loai', ['sale', 'event', 'news'])->default('news');
            $table->unsignedInteger('so_nguoi_nhan')->default(0);
            $table->unsignedBigInteger('created_by')->nullable(); // id nhan_vien
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('thong_bao_he_thong');
    }
};
