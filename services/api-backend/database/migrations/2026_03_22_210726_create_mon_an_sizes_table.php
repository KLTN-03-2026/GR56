<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mon_an_sizes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_mon_an');
            $table->index('id_mon_an');
            $table->string('ten_size');
            $table->integer('gia_cong_them')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mon_an_sizes');
    }
};
