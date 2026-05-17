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
        Schema::create('tinh_thanhs', function (Blueprint $table) {
            $table->id();
            $table->string('ten_tinh_thanh');
            $table->double('toa_do_x')->nullable();
            $table->double('toa_do_y')->nullable()  ;
            $table->integer('tinh_trang')->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tinh_thanhs');
    }
};
