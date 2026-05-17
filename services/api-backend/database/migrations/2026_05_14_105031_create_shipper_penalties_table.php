<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipper_penalties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipper_id')->constrained('shippers')->onDelete('cascade');
            $table->string('loai_penalty');   // 'reject', 'timeout', 'late', 'cancel', 'gps_fraud'
            $table->string('mo_ta')->nullable();
            $table->foreignId('don_hang_id')->nullable()->constrained('don_hangs')->nullOnDelete();
            $table->integer('diem_tru')->default(0);  // điểm bị trừ
            $table->timestamp('hieu_luc_den')->nullable(); // hết hiệu lực penalty (auto xóa sau)
            $table->boolean('da_giai_quyet')->default(false);
            $table->timestamps();

            $table->index(['shipper_id', 'loai_penalty', 'da_giai_quyet']);
            $table->index(['hieu_luc_den']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipper_penalties');
    }
};
