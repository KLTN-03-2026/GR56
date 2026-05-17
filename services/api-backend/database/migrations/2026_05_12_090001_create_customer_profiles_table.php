<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_profiles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_khach_hang')->unique();
            $table->integer('so_lan_dat')->default(0);
            $table->json('dia_chi_thuong_xuyen')->nullable();
            $table->json('top_categories')->nullable();
            $table->json('top_mon_an')->nullable();
            $table->json('top_quan_an')->nullable();
            $table->enum('khau_vi', ['unknown', 'thanh_dam', 'cay', 'ngot', 'bo_duong'])
                ->default('unknown');
            $table->enum('price_range', ['budget', 'mid', 'premium'])->default('mid');
            $table->json('tags')->nullable();
            $table->json('intent_history')->nullable();
            $table->json('mood_preferences')->nullable();
            $table->timestamps();

            $table->foreign('id_khach_hang')
                ->references('id')
                ->on('khach_hangs')
                ->onDelete('cascade');
            $table->index('id_khach_hang');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_profiles');
    }
};
