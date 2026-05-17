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
        Schema::create('toppings', function (Blueprint $table) {
            $table->id();

            // Quán sở hữu topping này
            $table->unsignedBigInteger('id_quan_an');
            $table->index('id_quan_an');             // Index để query theo quán nhanh hơn

            $table->string('ten_topping');           // Tên topping VD: "Trân Châu Trắng"
            $table->decimal('gia', 10, 0);           // Giá topping (VNĐ, làm tròn ngàn)
            $table->string('hinh_anh')->nullable();  // URL hình ảnh
            $table->text('mo_ta')->nullable();       // Mô tả ngắn

            // Phân loại: 'drink' = dành cho đồ uống, 'food' = dành cho đồ ăn, 'all' = tất cả
            $table->enum('loai', ['drink', 'food', 'all'])->default('all');

            // Trạng thái: 1 = hiển thị, 0 = ẩn
            $table->tinyInteger('tinh_trang')->default(1);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('toppings');
    }
};
