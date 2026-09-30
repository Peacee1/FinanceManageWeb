const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');

/**
 * Phân tích tài chính bằng Google Gemini AI.
 * Lấy dữ liệu thu chi 30 ngày gần nhất của user, gửi cho AI để nhận gợi ý.
 * POST /api/ai/analyze
 */
const analyzeFinances = async (req, res) => {
  const userId = req.user.userId;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: 'Chức năng AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.' });
  }

  try {
    // Lấy thông tin cơ bản của user
    const userResult = await db.query(
      'SELECT name, salary FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    const user = userResult.rows[0];

    // Lấy giao dịch 30 ngày gần nhất
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const txResult = await db.query(
      `SELECT type, amount, category, date
       FROM transactions
       WHERE user_id = $1 AND business_id IS NULL AND date >= $2
       ORDER BY date DESC`,
      [userId, thirtyDaysAgo.toISOString()]
    );

    const transactions = txResult.rows;

    if (transactions.length === 0) {
      return res.status(200).json({
        analysis: 'Bạn chưa có giao dịch nào trong 30 ngày qua. Hãy thêm thu chi để AI có thể phân tích và đưa ra gợi ý cho bạn nhé! 📊'
      });
    }

    // Tổng hợp số liệu
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + parseInt(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + parseInt(t.amount), 0);

    // Gom theo danh mục chi tiêu
    const expenseByCategory = {};
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        if (!expenseByCategory[t.category]) {
          expenseByCategory[t.category] = 0;
        }
        expenseByCategory[t.category] += parseInt(t.amount);
      });

    // Sắp xếp danh mục theo mức chi nhiều nhất
    const topCategories = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amount]) => `- ${cat}: ${amount.toLocaleString('vi-VN')} VNĐ (${totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0}%)`)
      .join('\n');

    const balance = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

    // Xây dựng prompt gửi cho Gemini
    const prompt = `Bạn là một chuyên gia tư vấn tài chính cá nhân chuyên nghiệp và thân thiện, am hiểu về văn hóa chi tiêu của người Việt Nam. Hãy phân tích tình hình tài chính sau đây và đưa ra nhận xét, gợi ý cụ thể bằng tiếng Việt.

**DỮ LIỆU TÀI CHÍNH 30 NGÀY GẦN NHẤT:**
- Tổng thu nhập: ${totalIncome.toLocaleString('vi-VN')} VNĐ
- Tổng chi tiêu: ${totalExpense.toLocaleString('vi-VN')} VNĐ
- Số dư còn lại: ${balance.toLocaleString('vi-VN')} VNĐ
- Tỷ lệ tiết kiệm: ${savingRate}%
- Số giao dịch: ${transactions.length}

**CHI TIÊU THEO DANH MỤC (Top 5):**
${topCategories || 'Không có dữ liệu'}

**YÊU CẦU:**
Hãy viết một bản phân tích ngắn gọn, dễ hiểu với các phần sau:

1. **Tổng quan** (1-2 câu nhận xét tổng thể về tình hình tài chính)
2. **Điểm tốt** (nếu có - những gì đang làm đúng)
3. **Điểm cần cải thiện** (nếu có - những danh mục chi tiêu bất thường hoặc quá cao)
4. **Gợi ý cụ thể** (2-3 hành động thiết thực để cải thiện tài chính tháng tới)

Lưu ý:
- Sử dụng emoji phù hợp để bài viết sinh động
- Tham chiếu quy tắc 50/30/20 khi phù hợp
- Tông giọng thân thiện, tích cực, khích lệ
- Không quá 300 từ`;

    // Gọi Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

    const result = await model.generateContent(prompt, { timeout: 30000 });
    const analysisText = result.response.text();

    res.json({ analysis: analysisText });

  } catch (error) {
    console.error('Lỗi AI phân tích tài chính:', error.message);
    if (error.message && error.message.includes('API_KEY_INVALID')) {
      return res.status(503).json({ message: 'API Key Gemini không hợp lệ. Vui lòng kiểm tra lại cấu hình.' });
    }
    res.status(500).json({ message: 'Đã xảy ra lỗi khi phân tích. Vui lòng thử lại sau.' });
  }
};

module.exports = { analyzeFinances };
