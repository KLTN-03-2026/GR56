<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChiTietDanhMucQuanAnSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('chi_tiet_danh_muc_quan_ans')->delete();
        DB::table('chi_tiet_danh_muc_quan_ans')->truncate();
        // Tự động gom nhóm dựa vào các món ăn đã được seed trước đó ở MonAnSeeder
        $dsLienKet = DB::table('mon_ans')
            ->select('id_quan_an', 'id_danh_muc')
            ->distinct()
            ->get();

        $dataToInsert = [];
        foreach ($dsLienKet as $item) {
            $dataToInsert[] = [
                'id_quan_an'  => $item->id_quan_an,
                'id_danh_muc' => $item->id_danh_muc,
                'created_at'  => now(),
                'updated_at'  => now()
            ];
        }

        if (count($dataToInsert) > 0) {
            DB::table('chi_tiet_danh_muc_quan_ans')->insert($dataToInsert);
        }
    }
}
