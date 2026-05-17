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
        Schema::create('danh_gias', function (Blueprint $table) {
            $table->id();
            $table->integer('id_don_hang');
            $table->integer('id_khach_hang');
            $table->integer('id_quan_an');
            $table->integer('id_shipper')->nullable();
            
            $table->integer('sao_quan_an')->nullable();
            $table->text('nhan_xet_quan_an')->nullable();
            
            $table->integer('sao_shipper')->nullable();
            $table->text('nhan_xet_shipper')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('danh_gias');
    }
};
