<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_accounts_wallet', function (Blueprint $table) {
            $table->id();
            // Loại chủ sở hữu: quán ăn hoặc shipper
            $table->enum('loai_chu', ['quan_an', 'shipper']);
            $table->unsignedBigInteger('id_chu');
            $table->string('ten_ngan_hang');       // VD: "MB Bank", "Vietcombank"
            $table->string('so_tai_khoan');
            $table->string('chu_tai_khoan');
            $table->string('chi_nhanh')->nullable();
            // Tài khoản mặc định để nhận tiền
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_accounts_wallet');
    }
};
