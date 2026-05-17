<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->boolean('yeu_cau_huy')->default(false)->after('ghi_chu_admin');
            $table->string('ly_do_huy', 500)->nullable()->after('yeu_cau_huy');
            $table->boolean('da_duyet_huy')->default(false)->after('ly_do_huy');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn(['yeu_cau_huy', 'ly_do_huy', 'da_duyet_huy']);
        });
    }
};
