<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zones', function (Blueprint $table) {
            $table->id();
            $table->string('ten_zone');           // vd: "Hai Chau", "Son Tra"
            $table->string('slug')->unique();    // vd: "hai-chau"
            $table->string('tinh_thanh')->nullable();
            $table->string('quan_huyen')->nullable();
            $table->decimal('lat_center', 10, 7)->nullable();  // Tâm zone
            $table->decimal('lng_center', 10, 7)->nullable();
            $table->float('ban_kinh_km')->default(5);         // Bán kính bao phủ
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
