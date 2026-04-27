<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;


class DanhMucSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('danh_mucs')->delete();

        DB::table('danh_mucs')->truncate();

        DB::table('danh_mucs')->insert([
            ['id' => '1', 'ten_danh_muc' => 'Bánh truyền thống', 'slug_danh_muc' => Str::slug('Bánh truyền thống'), 'hinh_anh' => 'https://afamilycdn.com/150157425591193600/2021/9/10/24130700020582136376707604290604352532348575n-1631264758126969867816.jpeg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '2', 'ten_danh_muc' => 'Bánh cuốn/Bánh ướt', 'slug_danh_muc' => Str::slug('Bánh cuốn/Bánh ướt'), 'hinh_anh' => 'https://thanhnien.mediacdn.vn/uploaded/giangvu/2020_05_08/95699484_1866226053509484_9022442935488086016_o_VWSO.jpg?width=500', 'id_danh_muc_cha' => '1', 'tinh_trang' => '1'],
            ['id' => '3', 'ten_danh_muc' => 'Bánh xèo/Bánh khọ', 'slug_danh_muc' => Str::slug('Bánh xèo/Bánh khọ'), 'hinh_anh' => 'https://cafefcdn.com/203337114487263232/2024/3/14/19169024739980261136209544427010601057149777n-17103293464812097568028-1710378477032-1710378477566769991568.jpg', 'id_danh_muc_cha' => '1', 'tinh_trang' => '1'],
            ['id' => '4', 'ten_danh_muc' => 'Bánh bao', 'slug_danh_muc' => Str::slug('Bánh bao'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2022/01/05/1409227/chia-se-cach-lam-banh-bao-nhan-dau-xanh-thom-ngot-vo-mem-xop-202201051416364928.jpg', 'id_danh_muc_cha' => '1', 'tinh_trang' => '1'],
            ['id' => '5', 'ten_danh_muc' => 'Bánh Huế', 'slug_danh_muc' => Str::slug('Bánh Huế'), 'hinh_anh' => 'https://static.vinwonders.com/production/banh-hue-so-1.jpg', 'id_danh_muc_cha' => '1', 'tinh_trang' => '1'],
            ['id' => '6', 'ten_danh_muc' => 'Bánh mì', 'slug_danh_muc' => Str::slug('Bánh mì'), 'hinh_anh' => 'https://static-images.vnncdn.net/files/publish/2023/5/14/clever-junior-694.jpg', 'id_danh_muc_cha' => '1', 'tinh_trang' => '1'],
            ['id' => '7', 'ten_danh_muc' => 'Lẩu & Nướng', 'slug_danh_muc' => Str::slug('Lẩu & Nướng'), 'hinh_anh' => 'https://kvi.vn/Uploads/786/images/kh%C3%B3a%20h%E1%BB%8Dc%20l%E1%BA%A9u%20n%C6%B0%E1%BB%9Bng%20h%C3%A0n%20qu%E1%BB%91c.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '8', 'ten_danh_muc' => 'Đồ nướng', 'slug_danh_muc' => Str::slug('Đồ nướng'), 'hinh_anh' => 'https://top10quynhon.com/wp-content/uploads/LAU-NUONG-QUY-NHON-730x550.jpg', 'id_danh_muc_cha' => '8', 'tinh_trang' => '1'],
            ['id' => '9', 'ten_danh_muc' => 'Lẩu', 'slug_danh_muc' => Str::slug('Lẩu'), 'hinh_anh' => 'https://i-giadinh.vnecdn.net/2020/04/30/3-1588208127-6777-1588208230.jpg', 'id_danh_muc_cha' => '8', 'tinh_trang' => '1'],
            ['id' => '10', 'ten_danh_muc' => 'Đồ ăn dinh dưỡng', 'slug_danh_muc' => Str::slug('Đồ ăn dinh dưỡng'), 'hinh_anh' => 'https://fiti.vn/wp-content/uploads/2021/08/bua-an-day-du-dinh-duong-3.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '11', 'ten_danh_muc' => 'Salad', 'slug_danh_muc' => Str::slug('Salad'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2022/05/16/1432739/bat-mi-cach-lam-salad-hy-lap-don-gian-gion-mat-cuc-bo-duong-202205160929278475.jpg', 'id_danh_muc_cha' => '10', 'tinh_trang' => '1'],
            ['id' => '12', 'ten_danh_muc' => 'Poke', 'slug_danh_muc' => Str::slug('Poke'), 'hinh_anh' => 'https://media-cdn.tripadvisor.com/media/photo-s/13/f5/85/64/getlstd-property-photo.jpg', 'id_danh_muc_cha' => '10', 'tinh_trang' => '1'],
            ['id' => '13', 'ten_danh_muc' => 'Đồ uống không cồn', 'slug_danh_muc' => Str::slug('Đồ uống không cồn'), 'hinh_anh' => 'https://aglobal.vn/upload/images/%C4%91%E1%BB%93%20u%E1%BB%91ng%20kh%C3%B4ng%20c%E1%BB%93n%20l%C3%A0%20g%C3%AC.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '14', 'ten_danh_muc' => 'Đồ uống có ga', 'slug_danh_muc' => Str::slug('Đồ uống có ga'), 'hinh_anh' => 'https://cdn.tgdd.vn/2021/05/content/1-800x450-54.jpg', 'id_danh_muc_cha' => '13', 'tinh_trang' => '1'],
            ['id' => '15', 'ten_danh_muc' => 'Sữa', 'slug_danh_muc' => Str::slug('Sữa'), 'hinh_anh' => 'https://static-images.vnncdn.net/files/publish/2023/10/17/sua-de-1274.jpg', 'id_danh_muc_cha' => '13', 'tinh_trang' => '1'],
            ['id' => '16', 'ten_danh_muc' => 'Trà sữa', 'slug_danh_muc' => Str::slug('Trà sữa'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2021/08/10/1374160/hoc-cach-pha-tra-sua-o-long-dai-loan-thom-ngon-chuan-vi-ai-cung-me-202108100039248020.jpg', 'id_danh_muc_cha' => '13', 'tinh_trang' => '1'],
            ['id' => '17', 'ten_danh_muc' => 'Cà phê', 'slug_danh_muc' => Str::slug('Cà phê'), 'hinh_anh' => 'https://nld.mediacdn.vn/291774122806476800/2022/12/25/5545256-1671941139696557765119.jpg', 'id_danh_muc_cha' => '13', 'tinh_trang' => '1'],
            ['id' => '18', 'ten_danh_muc' => 'Trà', 'slug_danh_muc' => Str::slug('Trà'), 'hinh_anh' => 'https://cdn.tgdd.vn/2021/12/CookDish/15-meo-uong-tra-dung-cach-tot-cho-suc-khoe-ban-can-biet-avt-1200x676.jpg', 'id_danh_muc_cha' => '13', 'tinh_trang' => '1'],
            ['id' => '19', 'ten_danh_muc' => 'Nước ép & sinh tố', 'slug_danh_muc' => Str::slug('Nước ép & sinh tố'), 'hinh_anh' => 'https://phadincoffee.com/wp-content/uploads/2022/10/coc-sinh-to-1.jpg', 'id_danh_muc_cha' => '13', 'tinh_trang' => '1'],
            ['id' => '20', 'ten_danh_muc' => 'Cơm', 'slug_danh_muc' => Str::slug('Cơm'), 'hinh_anh' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg/1200px-C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '21', 'ten_danh_muc' => 'Xôi', 'slug_danh_muc' => Str::slug('Xôi'), 'hinh_anh' => 'https://i-giadinh.vnecdn.net/2021/10/08/nh1-1633673448-8968-1633673738.jpg', 'id_danh_muc_cha' => '20', 'tinh_trang' => '1'],
            ['id' => '22', 'ten_danh_muc' => 'Cơm tấm', 'slug_danh_muc' => Str::slug('Cơm tấm'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2021/08/09/1373996/tu-lam-com-tam-suon-trung-don-gian-thom-ngon-nhu-ngoai-hang-202201071248422991.jpg', 'id_danh_muc_cha' => '20', 'tinh_trang' => '1'],
            ['id' => '23', 'ten_danh_muc' => 'Cơm rang', 'slug_danh_muc' => Str::slug('Cơm rang'), 'hinh_anh' => 'https://bepxua.vn/wp-content/uploads/2022/07/rang-com-vang-uom-5.jpg', 'id_danh_muc_cha' => '20', 'tinh_trang' => '1'],
            ['id' => '24', 'ten_danh_muc' => 'Cơm cháy', 'slug_danh_muc' => Str::slug('Cơm cháy'), 'hinh_anh' => 'https://i.ytimg.com/vi/pZ7iVXBkRKU/maxresdefault.jpg', 'id_danh_muc_cha' => '20', 'tinh_trang' => '1'],
            ['id' => '25', 'ten_danh_muc' => 'Cơm văn phòng', 'slug_danh_muc' => Str::slug('Cơm văn phòng'), 'hinh_anh' => 'https://menuonline.vn/images/upload/news/901460992-com-trua-van-phong-0.jpg', 'id_danh_muc_cha' => '20', 'tinh_trang' => '1'],
            ['id' => '26', 'ten_danh_muc' => 'Cơm gia đình', 'slug_danh_muc' => Str::slug('Cơm gia đình'), 'hinh_anh' => 'https://vnn-imgs-a1.vgcloud.vn/znews-photo.zadn.vn/w860/Uploaded/spivpdiv/2021_07_15/165294459_4019912714741174_7141174881389299271_n_1.jpeg', 'id_danh_muc_cha' => '20', 'tinh_trang' => '1'],
            ['id' => '27', 'ten_danh_muc' => 'Đồ ăn vặt', 'slug_danh_muc' => Str::slug('Đồ ăn vặt'), 'hinh_anh' => 'https://suno.vn/blog/wp-content/uploads/2017/09/4-bi-quyet-ban-do-an-vat-qua-mang-kiem-tien-trieu-moi-ngay.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '28', 'ten_danh_muc' => 'Xiên que', 'slug_danh_muc' => Str::slug('Xiên que'), 'hinh_anh' => 'https://giochabanhmi.com/upload/images/xien-que-an-vat.jpg', 'id_danh_muc_cha' => '27', 'tinh_trang' => '1'],
            ['id' => '29', 'ten_danh_muc' => 'Bánh tráng', 'slug_danh_muc' => Str::slug('Bánh tráng'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2021/09/29/1386493/cach-lam-banh-trang-tron-gion-ngon-doc-la-mon-an-vat-cuc-de-lam-202109291231250246.jpg', 'id_danh_muc_cha' => '27', 'tinh_trang' => '1'],
            ['id' => '30', 'ten_danh_muc' => 'Các món cuốn', 'slug_danh_muc' => Str::slug('Các món cuốn'), 'hinh_anh' => 'https://vnn-imgs-f.vgcloud.vn/2022/01/25/16/mon-cuon-thuy-nguyen-hoang-thuy-van.jpg', 'id_danh_muc_cha' => '27', 'tinh_trang' => '1'],
            ['id' => '31', 'ten_danh_muc' => 'Tráng miệng ', 'slug_danh_muc' => Str::slug('Tráng miệng '), 'hinh_anh' => 'https://cdn.alongwalk.info/vn/wp-content/uploads/2022/04/05040214/image-kham-pha-8-mon-trang-mieng-noi-tieng-o-duc-ngon-den-lim-tim-164908093440737.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '32', 'ten_danh_muc' => 'Chè', 'slug_danh_muc' => Str::slug('Chè'), 'hinh_anh' => 'https://cdn.eva.vn/upload/3-2023/images/2023-07-06/3-cach-lam-che-thai-thom-ngon-mat-lanh-cho-ngay-he-nong-nuc-cach-lam-che-thai-eva-009-1688635042-913-width599height395.jpg', 'id_danh_muc_cha' => '31', 'tinh_trang' => '1'],
            ['id' => '33', 'ten_danh_muc' => 'Kem', 'slug_danh_muc' => Str::slug('Kem'), 'hinh_anh' => 'https://file.hstatic.net/200000648353/file/vo_oc_que_de_bang_786f29722efb42aba871aa79746e1bf1.jpg', 'id_danh_muc_cha' => '31', 'tinh_trang' => '1'],
            ['id' => '34', 'ten_danh_muc' => 'Rau câu/Bánh flan', 'slug_danh_muc' => Str::slug('Rau câu/Bánh flan'), 'hinh_anh' => 'https://daylambanhngon.com/public/backend/filemanager/source/raucauflancheese/rau-cau-flan-cheese-ngon-600x400.jpg', 'id_danh_muc_cha' => '31', 'tinh_trang' => '1'],
            ['id' => '35', 'ten_danh_muc' => 'Trái cây', 'slug_danh_muc' => Str::slug('Trái cây'), 'hinh_anh' => 'https://vcdn-suckhoe.vnecdn.net/2022/04/10/image001-3764-1649564089.png', 'id_danh_muc_cha' => '31', 'tinh_trang' => '1'],
            ['id' => '36', 'ten_danh_muc' => 'Sữa chua', 'slug_danh_muc' => Str::slug('Sữa chua'), 'hinh_anh' => 'https://media-cdn-v2.laodong.vn/Storage/NewsPortal/2023/4/15/1180314/Sua-Chua.jpg', 'id_danh_muc_cha' => '31', 'tinh_trang' => '1'],
            ['id' => '37', 'ten_danh_muc' => 'Đồ ăn nhanh', 'slug_danh_muc' => Str::slug('Đồ ăn nhanh'), 'hinh_anh' => 'https://www.cet.edu.vn/wp-content/uploads/2019/04/fastfood-la-gi.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '38', 'ten_danh_muc' => 'Pizza', 'slug_danh_muc' => Str::slug('Pizza'), 'hinh_anh' => 'https://thucphamsieuthi.vn/wp-content/uploads/2021/08/banh-pizza-hai-san-dong-lanh.jpg', 'id_danh_muc_cha' => '37', 'tinh_trang' => '1'],
            ['id' => '39', 'ten_danh_muc' => 'Bugger', 'slug_danh_muc' => Str::slug('Bugger'), 'hinh_anh' => 'https://static.wixstatic.com/media/3c3642_a1c9d91d67c1440687852666174541b9~mv2.jpg/v1/fill/w_800,h_800,al_c,q_85/3c3642_a1c9d91d67c1440687852666174541b9~mv2.jpg', 'id_danh_muc_cha' => '37', 'tinh_trang' => '1'],
            ['id' => '40', 'ten_danh_muc' => 'Pasta', 'slug_danh_muc' => Str::slug('Pasta'), 'hinh_anh' => 'https://www.washingtonpost.com/resizer/E4Zygqr-5dBR09mfDV1WZ2TVioc=/arc-anglerfish-washpost-prod-washpost/public/HJRCQ6AIMT54I3ONNQLAPOZA2Y.jpg', 'id_danh_muc_cha' => '37', 'tinh_trang' => '1'],
            ['id' => '41', 'ten_danh_muc' => 'Gà rán', 'slug_danh_muc' => Str::slug('Gà rán'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2017/03/22/963765/cach-lam-ga-ran-thom-ngon-8_760x450.jpg', 'id_danh_muc_cha' => '37', 'tinh_trang' => '1'],
            ['id' => '42', 'ten_danh_muc' => 'Các món ăn từ thịt', 'slug_danh_muc' => Str::slug('Các món ăn từ thịt'), 'hinh_anh' => 'https://ramseysattheclub.com/wp-content/uploads/2020/02/31.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '43', 'ten_danh_muc' => 'Gà', 'slug_danh_muc' => Str::slug('Gà'), 'hinh_anh' => 'https://hawonkoo.vn/medias/hwks1/images/2023/09/cach-lam-ga-nuong-da-gion-bang-noi-chien-khong-dau.jpg', 'id_danh_muc_cha' => '42', 'tinh_trang' => '1'],
            ['id' => '44', 'ten_danh_muc' => 'Heo', 'slug_danh_muc' => Str::slug('Heo'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2022/06/29/1443581/cach-uop-thit-heo-quay-da-gion-vang-rum-vi-ngon-dam-da-202206300705513803.jpg', 'id_danh_muc_cha' => '42', 'tinh_trang' => '1'],
            ['id' => '45', 'ten_danh_muc' => 'Bò', 'slug_danh_muc' => Str::slug('Bò'), 'hinh_anh' => 'https://vietair.com.vn/Media/Images/be-thui-o2.jpg?p=1&w=412', 'id_danh_muc_cha' => '42', 'tinh_trang' => '1'],
            ['id' => '46', 'ten_danh_muc' => 'Vịt', 'slug_danh_muc' => Str::slug('Vịt'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2021/08/04/1372934/cong-thuc-lam-vit-quay-tieu-ngon-bat-bai-202201070922187050.jpg', 'id_danh_muc_cha' => '42', 'tinh_trang' => '1'],
            ['id' => '47', 'ten_danh_muc' => 'Mì Quảng', 'slug_danh_muc' => Str::slug('Mì Quảng'), 'hinh_anh' => 'https://images2.thanhnien.vn/528068263637045248/2024/11/12/1000022316-1731386167793124667085.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            // Thêm danh mục mới phù hợp với các món ăn đã tạo
            ['id' => '48', 'ten_danh_muc' => 'Bún & Phở', 'slug_danh_muc' => Str::slug('Bún & Phở'), 'hinh_anh' => 'https://cdn.khamphadanang.vn/wp-content/uploads/2024/01/bun-bo-da-nang-1.jpg?strip=all&lossy=1&ssl=1', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '49', 'ten_danh_muc' => 'Bún bò Huế', 'slug_danh_muc' => Str::slug('Bún bò Huế'), 'hinh_anh' => 'https://hoasenfoods.vn/wp-content/uploads/2024/01/bun-bo-hue.jpg', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '50', 'ten_danh_muc' => 'Phở', 'slug_danh_muc' => Str::slug('Phở'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2022/01/25/1412805/cach-nau-pho-bo-nam-dinh-chuan-vi-thom-ngon-nhu-ngoai-hang-202201250230038502.jpg', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '51', 'ten_danh_muc' => 'Bún chả', 'slug_danh_muc' => Str::slug('Bún chả'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2019/06/27/1175792/cach-nau-bun-bo-tai-an-mot-cai-la-te-tai-ca-nguoi-202208301428003234.jpg', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '52', 'ten_danh_muc' => 'Bún riêu', 'slug_danh_muc' => Str::slug('Bún riêu'), 'hinh_anh' => 'https://i.ytimg.com/vi/Xb-s5pPlbbc/maxresdefault.jpg', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '53', 'ten_danh_muc' => 'Bún mắm', 'slug_danh_muc' => Str::slug('Bún mắm'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2019/06/27/1175792/cach-nau-bun-bo-tai-an-mot-cai-la-te-tai-ca-nguoi-202208301428003234.jpg', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '54', 'ten_danh_muc' => 'Bún thịt nướng', 'slug_danh_muc' => Str::slug('Bún thịt nướng'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2021/08/11/1374456/cach-lam-bun-tron-thit-nuong-thom-ngon-hap-dan-tai-nha-202201051116113726.jpg', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '55', 'ten_danh_muc' => 'Bún bò Nam Bộ', 'slug_danh_muc' => Str::slug('Bún bò Nam Bộ'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2019/06/27/1175792/cach-nau-bun-bo-tai-an-mot-cai-la-te-tai-ca-nguoi-202208301428003234.jpg', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '56', 'ten_danh_muc' => 'Bún mọc', 'slug_danh_muc' => Str::slug('Bún mọc'), 'hinh_anh' => 'https://cdn.tgdd.vn/Files/2019/06/27/1175792/cach-nau-bun-bo-tai-an-mot-cai-la-te-tai-ca-nguoi-202208301428003234.jpg', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '57', 'ten_danh_muc' => 'Bún chả các loại', 'slug_danh_muc' => Str::slug('Bún chả các loại'), 'hinh_anh' => 'https://kenh14cdn.com/2018/photo1514890097406-1514890097406.png', 'id_danh_muc_cha' => '48', 'tinh_trang' => '1'],
            ['id' => '58', 'ten_danh_muc' => 'Món ăn đặc sản', 'slug_danh_muc' => Str::slug('Món ăn đặc sản'), 'hinh_anh' => 'https://cdn.khamphadanang.vn/wp-content/uploads/2024/01/bun-bo-da-nang-1.jpg?strip=all&lossy=1&ssl=1', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '59', 'ten_danh_muc' => 'Món ăn chay', 'slug_danh_muc' => Str::slug('Món ăn chay'), 'hinh_anh' => 'https://cdn.khamphadanang.vn/wp-content/uploads/2024/01/bun-cha-da-nang-1.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
            ['id' => '60', 'ten_danh_muc' => 'Món ăn theo mùa', 'slug_danh_muc' => Str::slug('Món ăn theo mùa'), 'hinh_anh' => 'https://cdn.khamphadanang.vn/wp-content/uploads/2024/01/bun-rieu-da-nang-1.jpg', 'id_danh_muc_cha' => null, 'tinh_trang' => '1'],
        ]);

    }
}
