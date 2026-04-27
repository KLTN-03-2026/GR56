<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class KhachHangSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('khach_hangs')->delete();
        DB::table('khach_hangs')->truncate();
        DB::table('khach_hangs')->insert([
            [
                'id'            => 1,
                'ho_va_ten'     => 'Nguyễn Văn Nhân',
                'so_dien_thoai' => '0394425076',
                'email'         => 'vannhan130504@gmail.com',
                'password'      => bcrypt('123456'),
                'cccd'          => '123456789012',
                'ngay_sinh'     => '2000-01-01',
                'avatar'        => "https://surl.li/oqshfx",
                'hash_reset'    => null,
                'hash_active'   => null,
                'is_active'     => 1,
                'is_block'      => 0,
            ],
            [
                'id'            => 2,
                'ho_va_ten'     => 'Nguyễn Văn A',
                'so_dien_thoai' => '0123456789',
                'email'         => 'nguyenvana@gmail.com',
                'password'      => bcrypt('123456'),
                'cccd'          => '123456709012',
                'ngay_sinh'     => '2000-01-01',
                'avatar'        => "https://bitly.li/rMWM",
                'hash_reset'    => null,
                'hash_active'   => null,
                'is_active'     => 1,
                'is_block'      => 0,
            ],
            [
                'id'            => 3,
                'ho_va_ten'     => 'Lê Minh Tuấn',
                'so_dien_thoai' => '0987654321',
                'email'         => 'minhtuan.le@gmail.com',
                'password'      => bcrypt('123456'),
                'cccd'          => '987654321001',
                'ngay_sinh'     => '1995-04-15',
                'avatar'        => "https://bitly.li/rMWM",
                'hash_reset'    => null,
                'hash_active'   => null,
                'is_active'     => 1,
                'is_block'      => 0,
            ],
            [
                'id'            => 4,
                'ho_va_ten'     => 'Trần Thị Hồng Nhung',
                'so_dien_thoai' => '0911223344',
                'email'         => 'nhung.tran@gmail.com',
                'password'      => bcrypt('123456'),
                'cccd'          => '456789123456',
                'ngay_sinh'     => '1998-08-20',
                'avatar'        => "https://bitly.li/rMWM",
                'hash_reset'    => null,
                'hash_active'   => null,
                'is_active'     => 1,
                'is_block'      => 0,
            ],
            [
                'id'            => 5,
                'ho_va_ten'     => 'Đặng Quốc Huy',
                'so_dien_thoai' => '0933445566',
                'email'         => 'quochuy.dang@gmail.com',
                'password'      => bcrypt('123456'),
                'cccd'          => '112233445566',
                'ngay_sinh'     => '1996-11-30',
                'avatar'        => "https://techcare.vn/image/hinh-dai-dien-zalo-ngau-r1tnx2b.jpg",
                'hash_reset'    => null,
                'hash_active'   => null,
                'is_active'     => 1,
                'is_block'      => 0,
            ],
            [
                'id'            => 6,
                'ho_va_ten'     => 'Phạm Thị Mai',
                'so_dien_thoai' => '0909887766',
                'email'         => 'mai.pham@gmail.com',
                'password'      => bcrypt('123456'),
                'cccd'          => '445566778899',
                'ngay_sinh'     => '1999-03-22',
                'avatar'        => "https://moc247.com/wp-content/uploads/2023/10/anh-dai-dien-dep-cho-nu_3.jpg",
                'hash_reset'    => null,
                'hash_active'   => null,
                'is_active'     => 1,
                'is_block'      => 0,
            ],
            [
                'id'            => 7,
                'ho_va_ten'     => 'Ngô Văn Lâm',
                'so_dien_thoai' => '0966887799',
                'email'         => 'vanlam.ngo@gmail.com',
                'password'      => bcrypt('123456'),
                'cccd'          => '998877665544',
                'ngay_sinh'     => '1997-07-12',
                'avatar'        => "https://i.pinimg.com/564x/94/9b/8d/949b8d8d9229693ba9d53b054b738e2a.jpg",
                'hash_reset'    => null,
                'hash_active'   => null,
                'is_active'     => 1,
                'is_block'      => 0,
            ],
        ]);
    }
}
