<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $permissions = [
        58 => 'Xem dashboard admin',
        59 => 'Xem danh sách đơn hàng admin',
        60 => 'Xem chi tiết đơn hàng admin',
        61 => 'Hủy đơn hàng admin',
        62 => 'Theo dõi đơn hàng admin',
        63 => 'Xem đơn hàng chatbot',
        64 => 'Xem danh sách món ăn admin',
        65 => 'Tạo mới món ăn admin',
        66 => 'Cập nhật món ăn admin',
        67 => 'Xóa món ăn admin',
        68 => 'Thay đổi trạng thái món ăn admin',
        69 => 'Tìm kiếm món ăn admin',
        70 => 'Xem menu giao diện',
        71 => 'Tạo menu giao diện',
        72 => 'Cập nhật menu giao diện',
        73 => 'Xóa menu giao diện',
        74 => 'Thay đổi trạng thái menu giao diện',
        75 => 'Sắp xếp menu giao diện',
        76 => 'Xem topping admin',
        77 => 'Tạo topping admin',
        78 => 'Cập nhật topping admin',
        79 => 'Xóa topping admin',
        80 => 'Thay đổi trạng thái topping admin',
        81 => 'Xem ví tài chính admin',
        82 => 'Đối soát và hoàn tiền admin',
        83 => 'Nạp tiền cho shipper',
        84 => 'Duyệt yêu cầu rút tiền',
        85 => 'Xem báo cáo khiếu nại',
        86 => 'Cập nhật báo cáo khiếu nại',
        87 => 'Duyệt yêu cầu hủy đơn',
        88 => 'Xem đánh giá admin',
        89 => 'Xóa đánh giá admin',
        90 => 'Ẩn hiện đánh giá admin',
        91 => 'Xem thông báo hệ thống',
        92 => 'Gửi thông báo hệ thống',
        93 => 'Xóa thông báo hệ thống',
        94 => 'Xem AI chatbot analytics',
        95 => 'Cập nhật AI chatbot analytics',
        96 => 'Xem thống kê khách hàng',
        97 => 'Xem thống kê quán ăn',
        99 => 'Xem tỉnh thành',
        100 => 'Tạo tỉnh thành',
        101 => 'Cập nhật tỉnh thành',
        102 => 'Xóa tỉnh thành',
        103 => 'Thay đổi trạng thái tỉnh thành',
        104 => 'Xem quận huyện',
        105 => 'Tạo quận huyện',
        106 => 'Cập nhật quận huyện',
        107 => 'Xóa quận huyện',
        108 => 'Thay đổi trạng thái quận huyện',
    ];

    public function up(): void
    {
        foreach ($this->permissions as $id => $name) {
            DB::table('chuc_nangs')->updateOrInsert(
                ['id' => $id],
                ['ten_chuc_nang' => $name, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $fullAccessRoleIds = DB::table('phan_quyens')
            ->whereIn('id_chuc_nang', [1, 17, 28, 34, 41, 42, 46])
            ->select('id_chuc_vu')
            ->groupBy('id_chuc_vu')
            ->havingRaw('COUNT(DISTINCT id_chuc_nang) >= 5')
            ->pluck('id_chuc_vu');

        foreach ($fullAccessRoleIds as $idChucVu) {
            foreach (array_keys($this->permissions) as $idChucNang) {
                DB::table('phan_quyens')->updateOrInsert([
                    'id_chuc_vu' => $idChucVu,
                    'id_chuc_nang' => $idChucNang,
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('phan_quyens')->whereIn('id_chuc_nang', array_keys($this->permissions))->delete();
        DB::table('chuc_nangs')->whereIn('id', array_keys($this->permissions))->delete();
    }
};
