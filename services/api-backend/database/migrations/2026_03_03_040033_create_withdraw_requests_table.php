<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('withdraw_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_wallet');
            $table->unsignedBigInteger('id_bank_account');
            $table->decimal('so_tien_rut', 15, 2);
            $table->string('noi_dung_chuyen_khoan', 100)->nullable();
            $table->enum('trang_thai', ['cho_duyet', 'da_duyet', 'da_chuyen', 'tu_choi'])
                ->default('cho_duyet');
            $table->text('ghi_chu_admin')->nullable();
            $table->timestamp('thoi_gian_chuyen')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('withdraw_requests');
    }
};
