<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yeu_thiches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_khach_hang');
            $table->unsignedBigInteger('id_mon_an');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('id_khach_hang')->references('id')->on('khach_hangs')->onDelete('cascade');
            $table->foreign('id_mon_an')->references('id')->on('mon_ans')->onDelete('cascade');

            // Mỗi khách chỉ có thể yêu thích 1 món 1 lần
            $table->unique(['id_khach_hang', 'id_mon_an'], 'unique_yeu_thich');
            $table->index('id_khach_hang');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yeu_thiches');
    }
};
