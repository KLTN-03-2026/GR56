/**
 * FoodBee — Export PDF Utility
 * Dùng html2canvas + jsPDF để capture DOM và xuất PDF
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Xuất một DOM element ra file PDF
 * @param {HTMLElement} element   - Element cần capture
 * @param {string}      filename  - Tên file (không cần .pdf)
 * @param {object}      options
 * @param {boolean}     options.landscape - Ngang (true) hay dọc (false)
 * @param {Function}    options.onStart   - Callback khi bắt đầu
 * @param {Function}    options.onDone    - Callback khi xong
 */
export async function exportElementToPDF(element, filename = 'BaoCao', options = {}) {
  const { landscape = true, onStart, onDone } = options;

  if (!element) {
    console.error('[exportPDF] Element not found');
    return;
  }

  onStart?.();

  try {
    // Capture DOM thành canvas
    const canvas = await html2canvas(element, {
      scale: 2,              // Độ phân giải x2 cho nét
      useCORS: true,         // Cho phép load ảnh cross-origin
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const orientation = landscape ? 'l' : 'p';
    const pdf = new jsPDF(orientation, 'mm', 'a4');

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    const ratio = canvas.width / canvas.height;
    const imgW = pdfW;
    const imgH = imgW / ratio;

    let yOffset = 0;
    let heightLeft = imgH;

    // Thêm trang đầu
    pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
    heightLeft -= pdfH;

    // Nếu nội dung dài hơn 1 trang → tự động thêm trang
    while (heightLeft > 0) {
      yOffset -= pdfH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, yOffset, imgW, imgH);
      heightLeft -= pdfH;
    }

    pdf.save(`${filename}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.pdf`);
  } catch (err) {
    console.error('[exportPDF] Error:', err);
  } finally {
    onDone?.();
  }
}

/**
 * Component nút Export PDF — style nhất quán với ExcelButton
 */
export function PDFButton({ onClick, disabled, loading, label = 'Export PDF' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', color: '#fff' }}
    >
      {loading
        ? <i className="fa-solid fa-spinner fa-spin" />
        : <i className="fa-solid fa-file-pdf" />}
      {label}
    </button>
  );
}
