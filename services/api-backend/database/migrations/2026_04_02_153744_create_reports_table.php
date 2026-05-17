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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->morphs('reporter'); // reporter_id, reporter_type
            $table->unsignedBigInteger('id_don_hang')->nullable();
            $table->string('tieu_de');
            $table->text('noi_dung');
            $table->string('trang_thai')->default('cho_xu_ly'); // cho_xu_ly, dang_xu_ly, da_xu_ly
            $table->string('hinh_anh')->nullable();
            $table->text('ghi_chu_admin')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
