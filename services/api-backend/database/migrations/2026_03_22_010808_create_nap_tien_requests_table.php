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
        Schema::create('nap_tien_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_shipper');
            $table->decimal('so_tien', 15, 2);
            $table->string('trang_thai')->default('cho_thanh_toan'); // cho_thanh_toan, thanh_cong, that_bai
            $table->string('payos_payment_id')->nullable();
            $table->text('ghi_chu')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nap_tien_requests');
    }
};
