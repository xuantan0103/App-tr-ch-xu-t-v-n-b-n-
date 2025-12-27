import XLSX from 'xlsx';
import { ExtractedDocument, ExcelExportConfig } from '../types';

export const exportToExcel = (
  data: ExtractedDocument[], 
  fileName: string = 'ket_qua_trich_xuat',
  config: ExcelExportConfig
) => {
  // Map data to Vietnamese headers
  const formattedData = data.map(item => ({
    "Số ký hiệu văn bản": item.symbol,
    "Ngày tháng của văn bản": item.date,
    "Trích yếu nội dung văn bản": item.summary,
    "Cơ quan ban hành": item.authority
  }));

  // Create worksheet from json
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // --- Apply Styling ---
  const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
  
  // Define border style if enabled
  const borderStyle = config.allBorders ? {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  } : {};

  // Define base font style
  const fontStyle = {
    name: config.fontName,
    sz: config.fontSize,
  };

  // Iterate over every cell to apply styles
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;

      const cell = worksheet[cellAddress];
      
      // Initialize style object if not present
      if (!cell.s) cell.s = {};

      // 1. Apply Font
      cell.s.font = { ...fontStyle };
      
      // 2. Apply Borders
      if (config.allBorders) {
        cell.s.border = borderStyle;
      }

      // 3. Apply Alignment
      // Default vertical center
      cell.s.alignment = { 
        vertical: "center",
        wrapText: config.wrapText 
      };

      // Header specific styles (First row)
      if (R === 0) {
        cell.s.font = { ...fontStyle, bold: true };
        cell.s.alignment = { 
          horizontal: "center", 
          vertical: "center", 
          wrapText: true 
        };
        cell.s.fill = { fgColor: { rgb: "EFEFEF" } }; // Light gray background for header
      }
    }
  }

  // Set Column Widths
  // Roughly 1 character ~ 7-8 pixels. Times New Roman 14 is wider.
  // We bump up the widths a bit to accommodate size 14.
  const wscols = [
    { wch: 25 }, // Symbol
    { wch: 25 }, // Date
    { wch: 80 }, // Summary (wider for wrap text)
    { wch: 40 }, // Authority
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu");

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};