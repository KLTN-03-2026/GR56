<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('chuc_nangs')->updateOrInsert(
            ['id' => 56],
            ['ten_chuc_nang' => 'Cấp quyền cho chức vụ', 'created_at' => now(), 'updated_at' => now()]
        );

        DB::table('chuc_nangs')->updateOrInsert(
            ['id' => 57],
            ['ten_chuc_nang' => 'Xóa quyền khỏi chức vụ', 'created_at' => now(), 'updated_at' => now()]
        );

        $grantRoles = DB::table('phan_quyens')
            ->where('id_chuc_nang', 38)
            ->pluck('id_chuc_vu')
            ->unique();

        foreach ($grantRoles as $idChucVu) {
            DB::table('phan_quyens')->updateOrInsert([
                'id_chuc_vu' => $idChucVu,
                'id_chuc_nang' => 56,
            ]);
        }

        $deleteRoles = DB::table('phan_quyens')
            ->where('id_chuc_nang', 39)
            ->pluck('id_chuc_vu')
            ->unique();

        foreach ($deleteRoles as $idChucVu) {
            DB::table('phan_quyens')->updateOrInsert([
                'id_chuc_vu' => $idChucVu,
                'id_chuc_nang' => 57,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('phan_quyens')->whereIn('id_chuc_nang', [56, 57])->delete();
        DB::table('chuc_nangs')->whereIn('id', [56, 57])->delete();
    }
};
