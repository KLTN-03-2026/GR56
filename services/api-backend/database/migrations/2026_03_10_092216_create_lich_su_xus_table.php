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
        Schema::create('lich_su_xus', function (Blueprint $table) {
            $table->id();
            $table->integer('id_khach_hang');
            $table->integer('id_don_hang')->nullable();
            $table->integer('so_xu');
            $table->integer('loai_giao_dich'); // 1: Cộng khi mua hàng, 2: Trừ khi dùng mua hàng, 3: Hoàn xu khi hủy, 4: Admin tặng
            $table->string('mo_ta')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lich_su_xus');
    }
};
