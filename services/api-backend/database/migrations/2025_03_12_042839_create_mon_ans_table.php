<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('mon_ans', function (Blueprint $table) {
            $table->id();
            $table->string('ten_mon_an');
            $table->string('slug_mon_an');
            $table->integer('gia_ban');
            $table->integer('gia_khuyen_mai')->nullable();
            $table->longText('mo_ta')->nullable();
            $table->integer('id_quan_an');
            $table->integer('tinh_trang')->default(1);
            $table->string('hinh_anh')->nullable();
            $table->integer('is_combo')->default(0);
            $table->text('list_combo')->nullable();
            $table->integer('id_danh_muc');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mon_ans');
    }
};
