import * as XLSX from 'xlsx';

// Fallback for different build systems (Vite/Webpack/CommonJS)
const lib = XLSX?.utils ? XLSX : (XLSX?.default?.utils ? XLSX.default : XLSX);

/**
 * Xuất dữ liệu ra file Excel (.xlsx)
 * @param {Array} data       - Mảng dữ liệu
 * @param {Array} columns    - [{ label: 'Tên cột', key: 'field', width: 20, format: (val, row) => val }]
 * @param {string} fileName  - Tên file (không cần .xlsx)
 * @param {string} sheetName - Tên sheet trong file Excel
 */
export const exportToExcel = (data, columns, fileName = 'export', sheetName = 'Data') => {
  if (!data || data.length === 0) {
    alert('Không có dữ liệu để xuất!');
    return;
  }

  // Header row
  const headers = columns.map(c => c.label);

  // Data rows
  const rows = data.map(item =>
    columns.map(c => {
      const val = item[c.key];
      if (c.format) return c.format(val, item);
      return val ?? '';
    })
  );

  const wsData = [headers, ...rows];
  const ws = lib.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width || 20 }));

  // Create workbook
  const wb = lib.utils.book_new();
  lib.utils.book_append_sheet(wb, ws, sheetName);

  // Timestamp for filename
  const now = new Date();
  const ts = `${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}`;
  lib.writeFile(wb, `FOODBEE_${fileName}_${ts}.xlsx`);
};

/**
 * Nút Xuất Excel dùng chung cho các trang Admin
 */
export function ExcelButton({ onClick, label = 'Xuất Excel', disabled = false, color = 'emerald' }) {
  const colorMap = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    green:   'bg-green-600 hover:bg-green-700',
    blue:    'bg-blue-600 hover:bg-blue-700',
    rose:    'bg-rose-500 hover:bg-rose-600',
    purple:  'bg-purple-600 hover:bg-purple-700',
  };
  const cls = colorMap[color] || colorMap.emerald;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl ${cls} text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <i className="fa-solid fa-file-excel" />
      {label}
    </button>
  );
}
