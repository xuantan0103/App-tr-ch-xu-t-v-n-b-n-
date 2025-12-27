
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedDocument } from "../types";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(new Error("Lỗi khi đọc file từ thiết bị."));
  });
};

const documentSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description: "Số ký hiệu văn bản (Ví dụ: 123/QĐ-UBND). Nếu không có số hiệu, ghi 'Không số'.",
      },
      date: {
        type: Type.STRING,
        description: "Ngày tháng văn bản dạng 'DD/MM/YYYY'. Bắt đầu bằng dấu nháy đơn '.",
      },
      summary: {
        type: Type.STRING,
        description: "Trích yếu nội dung văn bản. Ghi rõ loại văn bản và nội dung chính. Ví dụ: 'Quyết định về việc bổ nhiệm...'.",
      },
      authority: {
        type: Type.STRING,
        description: "Cơ quan ban hành văn bản hoặc tổ chức lập văn bản.",
      },
    },
    required: ["symbol", "date", "summary", "authority"],
  },
};

export const extractDataFromPdf = async (file: File): Promise<ExtractedDocument[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key chưa được cấu hình.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = await fileToBase64(file);

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          },
          {
            text: `Bạn là một trợ lý AI chuyên gia về lưu trữ văn thư và hành chính. 
            NHIỆM VỤ: Quét toàn bộ tệp PDF này để bóc tách thông tin của TẤT CẢ các văn bản hành chính có trong file (bao gồm Quyết định, Chỉ thị, Thông báo, Biên bản, Tờ trình, Công văn, Sổ sách...).
            
            QUY TẮC TRÍCH XUẤT NGHIÊM NGẶT:
            1. PHẢN ÁNH ĐẦY ĐỦ: Không được bỏ sót bất kỳ văn bản nào có trong file PDF. Nếu một file chứa nhiều văn bản nối tiếp nhau, hãy bóc tách từng cái một.
            2. SỐ KÝ HIỆU: Trích xuất chính xác số và ký hiệu. Nếu văn bản không có số (như biên bản), ghi "Không số".
            3. NGÀY THÁNG: Chuyển đổi về định dạng DD/MM/YYYY và LUÔN THÊM dấu nháy đơn (') ở đầu để hỗ trợ định dạng Excel (Ví dụ: '25/12/2023).
            4. TRÍCH YẾU: Ghi ngắn gọn nhưng đầy đủ loại văn bản và nội dung cốt lõi. Chỉ viết hoa chữ cái đầu tiên của câu.
            5. CƠ QUAN BAN HÀNH: Ghi đúng tên cơ quan, tổ chức ban hành văn bản.
            
            Trả về kết quả dưới dạng mảng JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: documentSchema,
        thinkingConfig: { thinkingBudget: 15000 }
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Hệ thống không tìm thấy nội dung văn bản hành chính nào phù hợp.");
    }

    let data = JSON.parse(jsonText) as ExtractedDocument[];
    
    return data.map(doc => ({
      ...doc,
      date: doc.date.startsWith("'") ? doc.date : `'${doc.date}`
    }));

  } catch (error: any) {
    console.error("Extraction Error:", error);
    throw new Error(error.message || "Đã xảy ra lỗi khi phân tích tệp PDF.");
  }
};
