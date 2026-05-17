<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            $table->enum('refund_status', ['pending', 'success', 'failed'])->nullable()->after('anh_giao_hang');
            $table->timestamp('refund_at')->nullable()->after('refund_status');
            $table->string('refund_payout_id')->nullable()->after('refund_at');
        });
    }

    public function down(): void
    {
        Schema::table('don_hangs', function (Blueprint $table) {
            $table->dropColumn(['refund_status', 'refund_at', 'refund_payout_id']);
        });
    }
};
