<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

class CapNhatVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'                    => 'required|integer|exists:vouchers,id',
            'ma_code'               => 'required|unique:vouchers,ma_code,' . $this->id,
            'thoi_gian_bat_dau'     => 'required|date',
            'thoi_gian_ket_thuc'    => 'required|date|after:thoi_gian_bat_dau',
            'loai_giam'             => 'required',
            'so_giam_gia'           => 'required|numeric|min:0',
            'so_tien_toi_da'        => 'required|numeric|min:0',
            'don_hang_toi_thieu'    => 'required|numeric|min:0',
            'tinh_trang'            => 'required|boolean',
        ];
    }
    public function messages()
    {
        return [
            'id.required' => 'Voucher cần cập nhật không được để trống.',
            'id.integer' => 'Voucher cần cập nhật phải là số nguyên.',
            'id.exists' => 'Voucher cần cập nhật không tồn tại.',

            'ma_code.required' => 'Mã code là bắt buộc.',
            'ma_code.unique' => 'Mã code này đã tồn tại.',

            'thoi_gian_bat_dau.required' => 'Thời gian bắt đầu là bắt buộc.',
            'thoi_gian_bat_dau.date' => 'Thời gian bắt đầu phải là định dạng ngày hợp lệ.',

            'thoi_gian_ket_thuc.required' => 'Thời gian kết thúc là bắt buộc.',
            'thoi_gian_ket_thuc.date' => 'Thời gian kết thúc phải là định dạng ngày hợp lệ.',
            'thoi_gian_ket_thuc.after' => 'Thời gian kết thúc phải sau thời gian bắt đầu.',

            'loai_giam.required' => 'Loại giảm giá là bắt buộc.',

            'so_giam_gia.required' => 'Số giảm giá là bắt buộc.',
            'so_giam_gia.numeric' => 'Số giảm giá phải là số.',
            'so_giam_gia.min' => 'Số giảm giá phải lớn hơn hoặc bằng 0.',

            'so_tien_toi_da.required' => 'Số tiền tối đa là bắt buộc.',
            'so_tien_toi_da.numeric' => 'Số tiền tối đa phải là số.',
            'so_tien_toi_da.min' => 'Số tiền tối đa phải lớn hơn hoặc bằng 0.',

            'don_hang_toi_thieu.required' => 'Đơn hàng tối thiểu là bắt buộc.',
            'don_hang_toi_thieu.numeric' => 'Đơn hàng tối thiểu phải là số.',
            'don_hang_toi_thieu.min' => 'Đơn hàng tối thiểu phải lớn hơn hoặc bằng 0.',

            'tinh_trang.required' => 'Trạng thái là bắt buộc.',
            'tinh_trang.boolean' => 'Trạng thái phải là Hoạt động hoặc tạm dừng.',
        ];
    }
}
