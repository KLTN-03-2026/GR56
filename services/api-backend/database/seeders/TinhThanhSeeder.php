<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TinhThanhSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('tinh_thanhs')->delete();

        DB::table('tinh_thanhs')->truncate();

        DB::table('tinh_thanhs')->insert([
            ['id' => 1, 'ten_tinh_thanh' => 'Đà Nẵng'],
        ]);
    }
}
