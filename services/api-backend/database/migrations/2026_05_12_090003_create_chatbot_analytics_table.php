<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chatbot_analytics', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_khach_hang')->nullable();
            $table->unsignedBigInteger('session_id')->nullable();
            $table->string('intent', 100);
            $table->json('entities')->nullable();
            $table->enum('response_type', ['text', 'recommendation', 'order'])->default('text');
            $table->boolean('converted')->default(false);
            $table->string('message_preview', 255)->nullable();
            $table->timestamps();

            $table->foreign('id_khach_hang')
                ->references('id')
                ->on('khach_hangs')
                ->onDelete('set null');
            $table->foreign('session_id')
                ->references('id')
                ->on('chatbot_sessions')
                ->onDelete('set null');
            $table->index('id_khach_hang');
            $table->index('intent');
            $table->index('converted');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_analytics');
    }
};
