<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_trending_dishes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_mon_an');
            $table->unsignedBigInteger('id_quan_an');
            $table->float('score')->default(0);
            $table->integer('order_count_7d')->default(0);
            $table->integer('conversation_count_7d')->default(0);
            $table->boolean('is_hot')->default(false);
            $table->date('period_date');
            $table->timestamps();

            $table->foreign('id_mon_an')
                ->references('id')
                ->on('mon_ans')
                ->onDelete('cascade');
            $table->foreign('id_quan_an')
                ->references('id')
                ->on('quan_ans')
                ->onDelete('cascade');
            $table->unique(['id_mon_an', 'period_date'], 'unique_trending_dish_date');
            $table->index('period_date');
            $table->index('is_hot');
            $table->index('score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_trending_dishes');
    }
};
