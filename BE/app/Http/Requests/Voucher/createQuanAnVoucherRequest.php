<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

class createQuanAnVoucherRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ma_code'               => "required|min:3|unique:vouchers,ma_code",
            'thoi_gian_bat_dau'     => "required|date",
            'thoi_gian_ket_thuc'    => "required|date|after:thoi_gian_bat_dau",
            'loai_giam'             => "required|integer",
            'so_giam_gia'           => "required|min:1",
            'so_tien_toi_da'        => "required|min:1",
            'don_hang_toi_thieu'    => "required|min:1",
            'tinh_trang'            => "required|boolean"
        ];
    }

    public function messages(): array
    {
        return [
            'ma_code.required'               => 'Mã code không được để trống',
            'ma_code.min'                    => 'Mã code phải có ít nhất 3 ký tự',
            'ma_code.unique'                 => 'Mã code đã tồn tại trong hệ thống',
            'thoi_gian_bat_dau.date'         => 'Thời gian bắt đầu không đúng định dạng',
            'thoi_gian_ket_thuc.date'        => 'Thời gian kết thúc không đúng định dạng',
            'loai_giam.integer'              => 'Loại giảm phải là số',
            'so_giam_gia.min'                => 'Số giảm giá phải lớn hơn 0',
            'thoi_gian_bat_dau.required'     => 'Thời gian bắt đầu không được để trống',
            'thoi_gian_ket_thuc.required'    => 'Thời gian kết thúc không được để trống',
            'thoi_gian_ket_thuc.after'       => 'Thời gian kết thúc phải sau thời gian bắt đầu',
            'loai_giam.required'             => 'Loại giảm không được để trống',
            'so_giam_gia.required'           => 'Số giảm giá không được để trống',
            'so_tien_toi_da.required'        => 'Số tiền tối đa không được để trống',
            'so_tien_toi_da.min'             => 'Số tiền tối đa phải lớn hơn 0',
            'don_hang_toi_thieu.required'    => 'Đơn hàng tối thiểu không được để trống',
            'don_hang_toi_thieu.min'         => 'Đơn hàng tối thiểu phải lớn hơn 0',
            'tinh_trang.required'             => 'Tình trạng không được để trống',
            'tinh_trang.boolean'              => 'Tình trạng phải là true hoặc false'
        ];
    }

}
