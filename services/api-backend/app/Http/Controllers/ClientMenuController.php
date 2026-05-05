<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ClientMenuController extends Controller
{
    public function getData()
    {
        $data = \App\Models\ClientMenu::orderBy('thu_tu', 'ASC')->get();
        return response()->json([
            'status' => true,
            'data'   => $data,
        ]);
    }

    public function getDataClient()
    {
        $data = \App\Models\ClientMenu::where('tinh_trang', 1)->orderBy('thu_tu', 'ASC')->get();
        return response()->json([
            'status' => true,
            'data'   => $data,
        ]);
    }

    public function create(Request $request)
    {
        $data = $request->all();
        \App\Models\ClientMenu::create($data);
        return response()->json([
            'status'  => true,
            'message' => 'Đã thêm mới menu thành công!',
        ]);
    }

    public function delete(Request $request)
    {
        $clientMenu = \App\Models\ClientMenu::find($request->id);
        if ($clientMenu) {
            $clientMenu->delete();
            return response()->json([
                'status'  => true,
                'message' => 'Đã xóa menu thành công!',
            ]);
        }
        return response()->json([
            'status'  => false,
            'message' => 'Menu không tồn tại!',
        ]);
    }

    public function update(Request $request)
    {
        $clientMenu = \App\Models\ClientMenu::find($request->id);
        if ($clientMenu) {
            $clientMenu->update($request->all());
            return response()->json([
                'status'  => true,
                'message' => 'Đã cập nhật menu thành công!',
            ]);
        }
        return response()->json([
            'status'  => false,
            'message' => 'Menu không tồn tại!',
        ]);
    }

    public function changeStatus(Request $request)
    {
        $clientMenu = \App\Models\ClientMenu::find($request->id);
        if ($clientMenu) {
            $clientMenu->tinh_trang = !$clientMenu->tinh_trang;
            $clientMenu->save();
            return response()->json([
                'status'  => true,
                'message' => 'Đã đổi trạng thái thành công!',
            ]);
        }
        return response()->json([
            'status'  => false,
            'message' => 'Menu không tồn tại!',
        ]);
    }

    public function updateOrder(Request $request)
    {
        $menus = $request->menus;
        foreach ($menus as $index => $menu) {
            $clientMenu = \App\Models\ClientMenu::find($menu['id']);
            if ($clientMenu) {
                $clientMenu->thu_tu = $index + 1;
                $clientMenu->save();
            }
        }
        return response()->json([
            'status'  => true,
            'message' => 'Đã cập nhật thứ tự thành công!',
        ]);
    }
}
