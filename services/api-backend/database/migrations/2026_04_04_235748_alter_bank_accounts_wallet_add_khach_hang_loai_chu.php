<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Thêm 'khach_hang' vào ENUM loai_chu của bảng bank_accounts_wallet
        DB::statement("ALTER TABLE `bank_accounts_wallet` MODIFY COLUMN `loai_chu` ENUM('quan_an','shipper','khach_hang') NOT NULL");
    }

    public function down(): void
    {
        // Xóa các bản ghi loai_chu='khach_hang' trước để tránh lỗi data truncation
        DB::table('bank_accounts_wallet')->where('loai_chu', 'khach_hang')->delete();
        DB::statement("ALTER TABLE `bank_accounts_wallet` MODIFY COLUMN `loai_chu` ENUM('quan_an','shipper') NOT NULL");
    }
};
