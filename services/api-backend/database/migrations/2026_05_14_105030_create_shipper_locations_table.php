<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipper_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipper_id')->constrained('shippers')->onDelete('cascade');
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->decimal('accuracy', 8, 2)->nullable();   // độ chính xác GPS (m)
            $table->string('address')->nullable();            // địa chỉ text
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();

            $table->index(['shipper_id', 'recorded_at']);
        });

        // Thêm zone_id vào bảng shippers (chỉ nếu bảng zones đã tồn tại)
        if (Schema::hasTable('zones')) {
            Schema::table('shippers', function (Blueprint $table) {
                if (!Schema::hasColumn('shippers', 'zone_id')) {
                    $table->foreignId('zone_id')->nullable()->after('id_dia_chi')->constrained('zones')->nullOnDelete();
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('shipper_locations');
        Schema::table('shippers', function (Blueprint $table) {
            if (Schema::hasColumn('shippers', 'zone_id')) {
                $table->dropForeign(['zone_id']);
                $table->dropColumn('zone_id');
            }
        });
    }
};
