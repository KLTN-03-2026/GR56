<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tin_nhans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_don_hang');
            $table->unsignedBigInteger('id_nguoi_gui');
            $table->enum('loai_nguoi_gui', ['khach_hang', 'shipper']);
            $table->text('noi_dung');
            $table->boolean('da_doc')->default(false);
            $table->timestamps();

            $table->foreign('id_don_hang')
                  ->references('id')
                  ->on('don_hangs')
                  ->onDelete('cascade');

            $table->index(['id_don_hang', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tin_nhans');
    }
};
