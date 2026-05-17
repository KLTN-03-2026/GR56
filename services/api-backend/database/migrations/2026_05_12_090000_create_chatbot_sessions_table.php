<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chatbot_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_khach_hang')->nullable();
            $table->string('session_token')->unique();
            $table->json('messages')->nullable();
            $table->enum('trang_thai', ['active', 'closed'])->default('active');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->foreign('id_khach_hang')
                ->references('id')
                ->on('khach_hangs')
                ->onDelete('set null');
            $table->index('id_khach_hang');
            $table->index('session_token');
            $table->index('trang_thai');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_sessions');
    }
};
