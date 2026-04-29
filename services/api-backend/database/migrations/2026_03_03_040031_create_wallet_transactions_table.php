<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_wallet');
            // Đơn hàng liên quan (nullable vì có thể là giao dịch rút tiền)
            $table->unsignedBigInteger('id_don_hang')->nullable();
            // credit = tiền vào, debit = tiền ra (rút)
            $table->enum('loai_giao_dich', ['credit', 'debit']);
            $table->decimal('so_tien', 15, 2);
            $table->decimal('so_du_truoc', 15, 2);
            $table->decimal('so_du_sau', 15, 2);
            // Mô tả: "Tiền đơn hàng #DZ123", "Rút tiền về Vietcombank ****5678"
            $table->string('mo_ta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
