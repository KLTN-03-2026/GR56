<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

class ThemMoiVoucherRequest extends FormRequest
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
            'ma_code'               => 'required|unique:vouchers,ma_code',
            'thoi_gian_bat_dau'     => 'required|date',
            'thoi_gian_ket_thuc'    => 'required|date|after:thoi_gian_bat_dau',
            'loai_giam'             => 'required|integer',
            'so_giam_gia'           => 'required|numeric|min:0',
            'so_tien_toi_da'        => 'required|numeric|min:0',
            'don_hang_toi_thieu'    => 'required|numeric|min:0',
        ];
    }
    public function messages()
    {
        return [
        'ma_code.required'          => 'Mã code là bắt buộc.',
        'ma_code.unique'            => 'Mã code này đã tồn tại.',

        'thoi_gian_bat_dau.required' => 'Thời gian bắt đầu là bắt buộc.',
        'thoi_gian_bat_dau.date'    => 'Thời gian bắt đầu phải là định dạng ngày hợp lệ.',

        'thoi_gian_ket_thuc.required' => 'Thời gian kết thúc là bắt buộc.',
        'thoi_gian_ket_thuc.date'   => 'Thời gian kết thúc phải là định dạng ngày hợp lệ.',
        'thoi_gian_ket_thuc.after'  => 'Thời gian kết thúc phải sau thời gian bắt đầu.',

        'loai_giam.required'        => 'Loại giảm giá là bắt buộc.',
        'loai_giam.integer'         => 'Loại giảm giá phải là số nguyên.',

        'so_giam_gia.required'      => 'Số giảm giá là bắt buộc.',
        'so_giam_gia.numeric'       => 'Số giảm giá phải là số.',
        'so_giam_gia.min'           => 'Số giảm giá phải lớn hơn hoặc bằng 0.',

        'so_tien_toi_da.required'   => 'Số tiền tối đa là bắt buộc.',
        'so_tien_toi_da.numeric'    => 'Số tiền tối đa phải là số.',
        'so_tien_toi_da.min'        => 'Số tiền tối đa phải lớn hơn hoặc bằng 0.',

        'don_hang_toi_thieu.required'   => 'Đơn hàng tối thiểu là bắt buộc.',
        'don_hang_toi_thieu.numeric'    => 'Đơn hàng tối thiểu phải là số.',
        'don_hang_toi_thieu.min'        => 'Đơn hàng tối thiểu phải lớn hơn hoặc bằng 0.',

        ];
    }
}
