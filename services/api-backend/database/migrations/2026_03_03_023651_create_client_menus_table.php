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
        Schema::create('client_menus', function (Blueprint $table) {
            $table->id();
            $table->string('ten_menu')->comment('Tên hiển thị menu');
            $table->string('link')->nullable()->comment('Đường dẫn');
            $table->string('icon')->nullable()->comment('Class icon fontawesome');
            $table->integer('tinh_trang')->default(1)->comment('1: Hiển thị, 0: Tắt');
            $table->integer('thu_tu')->default(0)->comment('Thứ tự hiển thị');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_menus');
    }
};
