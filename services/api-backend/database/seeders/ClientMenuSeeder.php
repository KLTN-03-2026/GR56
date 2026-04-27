<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ClientMenu;

class ClientMenuSeeder extends Seeder
{
    public function run(): void
    {
        ClientMenu::truncate();

        $menus = [
            ['ten_menu' => 'Đơn Hàng',    'link' => '/khach-hang/don-hang',    'icon' => 'fa-solid fa-receipt',   'tinh_trang' => 1, 'thu_tu' => 1],
            ['ten_menu' => 'List Quán Ăn', 'link' => '/khach-hang/list-quan-an', 'icon' => 'fa-solid fa-store',     'tinh_trang' => 1, 'thu_tu' => 2],
            ['ten_menu' => 'Món Ăn',      'link' => '/khach-hang/mon-an',      'icon' => 'fa-solid fa-utensils',  'tinh_trang' => 1, 'thu_tu' => 3],
            ['ten_menu' => 'Yêu Thích',   'link' => '/khach-hang/yeu-thich',   'icon' => 'fa-solid fa-heart',     'tinh_trang' => 1, 'thu_tu' => 4],
        ];

        foreach ($menus as $menu) {
            ClientMenu::create($menu);
        }
    }
}
