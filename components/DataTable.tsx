
import React from 'react';
import { ExtractedDocument, ThemeConfig } from '../types';
import { FileSearch, ClipboardList } from 'lucide-react';

interface DataTableProps {
  data: ExtractedDocument[];
  theme: ThemeConfig;
}

export const DataTable: React.FC<DataTableProps> = ({ data, theme }) => {
  const p = theme.primary;
  const g = theme.gray;

  if (data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 px-4 text-center bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-${g}-200 animate-in fade-in zoom-in duration-500`}>
        <div className={`p-4 bg-${p}-50 text-${p}-400 rounded-full mb-4`}>
          <FileSearch size={48} strokeWidth={1.5} />
        </div>
        <h3 className={`text-xl font-bold text-${g}-800`}>Chưa có dữ liệu trích xuất</h3>
        <p className={`text-${g}-500 mt-2 max-w-xs mx-auto`}>Vui lòng tải lên file PDF để bắt đầu quá trình bóc tách thông tin văn bản hành chính.</p>
      </div>
    );
  }

  // Common border styles for administrative standard
  const borderClass = `border border-slate-300`; 
  const cellPadding = "px-4 py-3";

  return (
    <div className="overflow-hidden rounded-2xl shadow-xl bg-white border border-slate-200 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <style>{`
        .row-stagger {
          animation: slideIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
          will-change: transform, opacity;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .administrative-table th {
          background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
        }
      `}</style>
      
      <div className="overflow-x-auto">
        <table 
          className="min-w-full border-collapse text-black administrative-table"
          style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13pt' }}
        >
          <thead>
            <tr>
              <th scope="col" className={`text-center font-bold text-slate-800 ${borderClass} ${cellPadding} w-[15%] sticky top-0 z-10 shadow-sm uppercase text-xs tracking-wider`}>
                Số Ký Hiệu
              </th>
              <th scope="col" className={`text-center font-bold text-slate-800 ${borderClass} ${cellPadding} w-[15%] sticky top-0 z-10 shadow-sm uppercase text-xs tracking-wider`}>
                Ngày Tháng
              </th>
              <th scope="col" className={`text-center font-bold text-slate-800 ${borderClass} ${cellPadding} w-[50%] sticky top-0 z-10 shadow-sm uppercase text-xs tracking-wider`}>
                Trích Yếu Nội Dung
              </th>
              <th scope="col" className={`text-center font-bold text-slate-800 ${borderClass} ${cellPadding} w-[20%] sticky top-0 z-10 shadow-sm uppercase text-xs tracking-wider`}>
                Cơ Quan Ban Hành
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((doc, index) => (
              <tr 
                key={index} 
                className={`row-stagger group hover:bg-blue-50/50 transition-colors duration-200`}
                // Optimized delay for large lists: cap at 0.8s max delay to ensure responsiveness
                style={{ animationDelay: `${Math.min(index * 0.05, 0.8)}s` }}
              >
                <td className={`text-slate-900 ${borderClass} ${cellPadding} align-top font-medium group-hover:text-blue-700 transition-colors`}>
                  {doc.symbol}
                </td>
                <td className={`text-slate-900 ${borderClass} ${cellPadding} align-top text-center whitespace-nowrap`}>
                  {doc.date}
                </td>
                <td className={`text-slate-900 ${borderClass} ${cellPadding} align-top text-justify leading-relaxed`}>
                  {doc.summary}
                </td>
                <td className={`text-slate-900 ${borderClass} ${cellPadding} align-top font-medium`}>
                  {doc.authority}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className={`p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest`}>
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className={`text-${p}-500`} />
          Tổng cộng: {data.length} văn bản được tìm thấy
        </div>
        <div>DocuExtract AI Engine</div>
      </div>
    </div>
  );
};
