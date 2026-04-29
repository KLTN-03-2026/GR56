<?php

namespace App\Http\Requests\QuanAn;

use Illuminate\Foundation\Http\FormRequest;

class CauHinhQuanAnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'gio_mo_cua'    => 'required',
            'gio_dong_cua'  => 'required',
            'dia_chi'       => 'required|min:5|max:255',
            'toa_do_x'      => 'required|numeric',
            'toa_do_y'      => 'required|numeric',
        ];
    }

    public function messages()
    {
        return [
            'required'          => ':attribute không được để trống',
            'min'               => ':attribute không được nhỏ hơn :min ký tự',
            'max'               => ':attribute không được lớn hơn :max ký tự',
            'date_format'       => ':attribute không đúng định dạng',
            'greater_than'      => ':attribute phải lớn hơn :other',
            'numeric'           => ':attribute phải là số',
        ];
    }

    public function attributes()
    {
        return [
            'gio_mo'   => 'Giờ mở',
            'gio_dong' => 'Giờ đóng',
            'dia_chi'  => 'Địa chỉ',
            'toa_do_x' => 'Tọa độ X',
            'toa_do_y' => 'Tọa độ Y',
        ];
    }
}
