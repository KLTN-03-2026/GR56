<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chi_tiet_don_hangs', function (Blueprint $table) {
            $table->unsignedBigInteger('id_size')->nullable()->after('id_mon_an');
            $table->string('ten_size')->nullable()->after('id_size');
        });
    }

    public function down(): void
    {
        Schema::table('chi_tiet_don_hangs', function (Blueprint $table) {
            $table->dropColumn(['id_size', 'ten_size']);
        });
    }
};
