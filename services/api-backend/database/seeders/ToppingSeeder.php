<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ToppingSeeder extends Seeder
{
    /**
     * Seed dữ liệu bảng toppings.
     * Mỗi topping gắn với một quán cụ thể (id_quan_an).
     */
    public function run(): void
    {
        DB::table('toppings')->truncate();

        $toppings = [];
        $now = now();

        $drinksForFoods = [
            ['ten_topping' => 'Lon Coca Cola', 'gia' => 15000, 'mo_ta' => 'Lon giải khát ướp lạnh ngọt ngào', 'hinh_anh' => 'https://img.freepik.com/free-photo/sparkling-cola-drink-glass-with-ice_114579-22533.jpg', 'loai' => 'food'],
            ['ten_topping' => 'Lon Pepsi', 'gia' => 15000, 'mo_ta' => 'Lon giải khát sảng khoái', 'hinh_anh' => 'https://img.freepik.com/free-photo/sparkling-cola-drink-glass-with-ice_114579-22533.jpg', 'loai' => 'food'],
            ['ten_topping' => 'Lon 7Up Không Đường', 'gia' => 15000, 'mo_ta' => 'Giải khát thanh mát, không calo', 'hinh_anh' => 'https://img.freepik.com/free-photo/lemon-lime-soda-glass-with-ice_114579-24231.jpg', 'loai' => 'food'],
            ['ten_topping' => 'Khăn Lạnh', 'gia' => 2000, 'mo_ta' => 'Khăn ướt sử dụng 1 lần', 'hinh_anh' => 'https://img.freepik.com/free-photo/wet-wipe_1339-165.jpg', 'loai' => 'food'],
        ];

        $groups = [
            'drinks' => [
                'shops' => [1, 2, 3, 4, 5, 35, 40],
                'items' => [
                    ['ten_topping' => 'Trân Châu Trắng', 'gia' => 10000, 'mo_ta' => 'Trân châu trắng giòn dai', 'hinh_anh' => 'https://img.freepik.com/free-photo/delicious-dessert-with-tapioca-pearls_23-2149021815.jpg', 'loai' => 'drink'],
                    ['ten_topping' => 'Trân Châu Đen', 'gia' => 8000, 'mo_ta' => 'Trân châu đen truyền thống', 'hinh_anh' => 'https://img.freepik.com/free-photo/boba-milk-tea-with-tapioca-pearls-table_432551-46.jpg', 'loai' => 'drink'],
                    ['ten_topping' => 'Thạch Trái Cây', 'gia' => 12000, 'mo_ta' => 'Thạch trái cây giòn sần sật', 'hinh_anh' => 'https://img.freepik.com/free-photo/fruit-jelly-with-pieces-fresh-fruit_114579-19948.jpg', 'loai' => 'drink'],
                    ['ten_topping' => 'Kem Macchiato', 'gia' => 15000, 'mo_ta' => 'Lớp kem béo ngậy mặn mặn', 'hinh_anh' => 'https://img.freepik.com/free-photo/glass-cold-coffee-with-whipped-cream-caramel_114579-50567.jpg', 'loai' => 'drink'],
                    ['ten_topping' => 'Nha Đam', 'gia' => 10000, 'mo_ta' => 'Nha đam tươi mát', 'hinh_anh' => 'https://img.freepik.com/free-photo/fruit-jelly-with-pieces-fresh-fruit_114579-19948.jpg', 'loai' => 'drink'],
                ]
            ],
            'com' => [
                'shops' => [6, 7, 8, 9, 10],
                'items' => array_merge([
                    ['ten_topping' => 'Cơm Thêm', 'gia' => 5000, 'mo_ta' => '1 chén cơm thêm nóng hổi', 'hinh_anh' => 'https://images.unsplash.com/photo-1536521642388-441263f88a61?q=80&w=300&auto=format&fit=crop', 'loai' => 'food'],
                    ['ten_topping' => 'Trứng Ốp La', 'gia' => 8000, 'mo_ta' => 'Trứng gà ốp la lòng đào', 'hinh_anh' => 'https://img.freepik.com/free-photo/fried-egg-plate-white-background_114579-88339.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Chả Hấp', 'gia' => 15000, 'mo_ta' => 'Chả hấp nhà làm dày dặn', 'hinh_anh' => 'https://img.freepik.com/free-photo/steamed-pork-sausage-vietnamese-style_114579-87321.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Canh Súp Mọc', 'gia' => 10000, 'mo_ta' => 'Canh súp ăn kèm cơm', 'hinh_anh' => 'https://img.freepik.com/free-photo/vegetable-soup-with-meatballs_114579-45601.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Ly Trà Đá', 'gia' => 5000, 'mo_ta' => 'Trà đá giải nhiệt', 'hinh_anh' => 'https://img.freepik.com/free-photo/glass-ice-tea-with-lemon-mint_114579-24021.jpg', 'loai' => 'food'],
                ], $drinksForFoods)
            ],
            'bun_pho' => [
                'shops' => [11, 12, 13, 14, 15],
                'items' => array_merge([
                    ['ten_topping' => 'Bún/Phở Thêm', 'gia' => 5000, 'mo_ta' => 'Sợi bún/phở thêm mềm dai', 'hinh_anh' => 'https://img.freepik.com/free-photo/asian-noodle-soup-bowl_114579-34865.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Rau Thêm', 'gia' => 5000, 'mo_ta' => 'Đĩa rau sống sạch', 'hinh_anh' => 'https://img.freepik.com/free-photo/fresh-vegetables_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Nước Dùng Thêm', 'gia' => 5000, 'mo_ta' => 'Nước lèo thêm ngọt xương', 'hinh_anh' => 'https://img.freepik.com/free-photo/hot-soup_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Chả Cua/Bò', 'gia' => 15000, 'mo_ta' => 'Viên chả to béo', 'hinh_anh' => 'https://img.freepik.com/free-photo/meatballs-plate_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Bánh Quẩy (3 cái)', 'gia' => 10000, 'mo_ta' => 'Bánh quẩy giòn tan', 'hinh_anh' => 'https://img.freepik.com/free-photo/fried-dough_1339-165.jpg', 'loai' => 'food'],
                ], $drinksForFoods)
            ],
            'mi_quang' => [
                'shops' => [16, 17, 18, 19, 20],
                'items' => array_merge([
                    ['ten_topping' => 'Mì Quảng Thêm', 'gia' => 5000, 'mo_ta' => 'Sợi mì quảng bản to xắt tay', 'hinh_anh' => 'https://img.freepik.com/free-photo/noodle-bowl_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Bánh Tráng Nướng', 'gia' => 7000, 'mo_ta' => 'Bánh tráng dày nướng giòn rụm', 'hinh_anh' => 'https://img.freepik.com/free-photo/rice-cracker_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Trứng Cút (3 quả)', 'gia' => 10000, 'mo_ta' => 'Trứng cút luộc bùi bùi, rim mặn', 'hinh_anh' => 'https://img.freepik.com/free-photo/quail-eggs_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Thịt Xíu Thêm', 'gia' => 15000, 'mo_ta' => 'Thịt heo rim mặn ngọt đậm đà', 'hinh_anh' => 'https://img.freepik.com/free-photo/braised-pork_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Rau Sống Thêm', 'gia' => 5000, 'mo_ta' => 'Bắp chuối, cải non tươi sạch', 'hinh_anh' => 'https://img.freepik.com/free-photo/fresh-vegetables_1339-165.jpg', 'loai' => 'food'],
                ], $drinksForFoods)
            ],
            'banh_mi' => [
                'shops' => [21, 22, 23, 24, 25],
                'items' => array_merge([
                    ['ten_topping' => 'Pate Thêm', 'gia' => 5000, 'mo_ta' => 'Pate gan heo béo ngậy', 'hinh_anh' => 'https://img.freepik.com/free-photo/pate-toast_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Chả Lụa Thêm', 'gia' => 10000, 'mo_ta' => 'Chả lụa dày miếng thơm ngon', 'hinh_anh' => 'https://img.freepik.com/free-photo/pork-roll_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Trứng Ốp La', 'gia' => 8000, 'mo_ta' => 'Trứng ốp la kẹp bên trong ổ', 'hinh_anh' => 'https://img.freepik.com/free-photo/fried-egg_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Bơ Trứng', 'gia' => 5000, 'mo_ta' => 'Xốt bơ đánh vàng óng', 'hinh_anh' => 'https://img.freepik.com/free-photo/butter_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Nhiều Rau & Chua', 'gia' => 0, 'mo_ta' => 'Thêm nhiều ngò rí, đồ dưa chua', 'hinh_anh' => 'https://img.freepik.com/free-photo/pickled-vegetables_1339-165.jpg', 'loai' => 'food'],
                ], $drinksForFoods)
            ],
            'banh_xeo_cuon' => [
                'shops' => [26, 27, 28, 29, 30],
                'items' => array_merge([
                    ['ten_topping' => 'Bánh Cuốn/Xèo Thêm', 'gia' => 10000, 'mo_ta' => 'Phần bánh xèo/cuốn thêm nóng', 'hinh_anh' => 'https://img.freepik.com/free-photo/pancake_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Nem Lụi / Chả Nướng', 'gia' => 12000, 'mo_ta' => '1 Xiên nem nướng thơm lừng', 'hinh_anh' => 'https://img.freepik.com/free-photo/grilled-pork_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Bánh Tráng Cuốn', 'gia' => 5000, 'mo_ta' => 'Xấp bánh tráng lót cuốn mềm', 'hinh_anh' => 'https://img.freepik.com/free-photo/rice-paper_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Rau Sống Thêm', 'gia' => 5000, 'mo_ta' => 'Đĩa rau tươi các loại', 'hinh_anh' => 'https://img.freepik.com/free-photo/fresh-vegetables_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Nước Mắm/Nước Tương', 'gia' => 2000, 'mo_ta' => 'Chén nước mắm chua ngọt', 'hinh_anh' => 'https://img.freepik.com/free-photo/sauce_1339-165.jpg', 'loai' => 'food'],
                ], $drinksForFoods)
            ],
            'snack_seafood' => [
                'shops' => [31, 32, 33, 34, 36, 37, 38, 39],
                'items' => array_merge([
                    ['ten_topping' => 'Bánh Mì Ăn Kèm', 'gia' => 4000, 'mo_ta' => '1 Ổ bánh mì không để chấm sốt', 'hinh_anh' => 'https://img.freepik.com/free-photo/bread_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Bánh Tráng Nướng', 'gia' => 7000, 'mo_ta' => 'Bánh tráng dày nướng', 'hinh_anh' => 'https://img.freepik.com/free-photo/rice-cracker_1339-165.jpg', 'loai' => 'food'],
                    ['ten_topping' => 'Đồ Chua Thêm', 'gia' => 5000, 'mo_ta' => 'Các loại rau dưa chua ngọt', 'hinh_anh' => 'https://img.freepik.com/free-photo/pickled-vegetables_1339-165.jpg', 'loai' => 'food'],
                ], $drinksForFoods)
            ]
        ];

        foreach ($groups as $groupKey => $groupData) {
            foreach ($groupData['shops'] as $shopId) {
                foreach ($groupData['items'] as $item) {
                    $toppings[] = array_merge($item, [
                        'id_quan_an' => $shopId,
                        'tinh_trang' => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        DB::table('toppings')->insert($toppings);

        $this->command->info('ToppingSeeder: Đã seed ' . count($toppings) . ' toppings thông minh theo danh mục quán ăn thành công!');
    }
}
