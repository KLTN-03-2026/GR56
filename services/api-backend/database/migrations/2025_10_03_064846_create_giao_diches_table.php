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
        Schema::create('giao_diches', function (Blueprint $table) {
            $table->id();
            $table->string("refNo")->nullable();
            $table->integer("creditAmount")->nullable();
            $table->string("description")->nullable();
            $table->string("transactionDate")->nullable();
            $table->string("code")->nullable();
            // Mới thêm
            $table->string('loai')->default('don_hang');
            $table->unsignedBigInteger('id_lien_quan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('giao_diches');
    }
};
