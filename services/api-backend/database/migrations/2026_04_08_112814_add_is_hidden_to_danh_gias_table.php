<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('danh_gias', function (Blueprint $table) {
            $table->boolean('is_hidden')->default(false)->after('nhan_xet_shipper')
                  ->comment('Admin ẩn đánh giá vi phạm');
        });
    }

    public function down(): void
    {
        Schema::table('danh_gias', function (Blueprint $table) {
            $table->dropColumn('is_hidden');
        });
    }
};
