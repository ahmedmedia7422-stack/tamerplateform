import { Type } from "@google/genai";
import { generateContentWithFallback } from "./_ai.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, className, difficulty, topic, numQuestions, customText } = req.body || {};

    if (action !== "generate_quiz") {
      return res.status(400).json({ error: "إجراء غير معروف" });
    }

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "موضوع الاختبار مطلوب!" });
    }

    const count = Number(numQuestions) || 5;
    const gradeClass = className || "الصف الأول الثانوي";
    const level = difficulty || "متوسط";

    const systemInstruction = `أنت الخبير التعليمي ومصمم الامتحانات التفاعلية في مادة اللغة العربية (النحو، البلاغة، الأدب، النصوص، القراءة، التعبير، والقواعد الإملائية) للمراحل التعليمية (الابتدائية، الإعدادية، الثانوية).
يقوم المعلم الأستاذ أحمد تامر بطلب توليد أسئلة اختيار من متعدد (MCQ) دقيقة ومضبوطة بالشكل ومناسبة لمنهج اللغة العربية.

تعليمات:
1. اكتب الأسئلة والخيارات بلغة عربية فصحى مشكولة ومضبوطة نحوباً وبلاغياً.
2. يجب إرجاع كائن JSON يحتوي على القائمة "questions" بأسئلة الامتحان والخيارات الأربعة وإجابة صحيحة محددة بـ (أ، ب، ج، د) أو بنص الخيار الصحيح.`;

    const promptText = `قم بتوليد ${count} أسئلة اختيار من متعدد للمرحلة: ${gradeClass}، لموضوع: (${topic})، بمستوى صعوبة: (${level}).
${customText ? `ملاحظات أو نص إضافي من المعلم: ${customText}` : ""}`;

    const result = await generateContentWithFallback({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question_text: { type: Type.STRING, description: "نص السؤال بالعربية مع تعريب كافة الرموز والقوانين" },
                  choice_a: { type: Type.STRING, description: "الخيار الأول (أ)" },
                  choice_b: { type: Type.STRING, description: "الخيار الثاني (ب)" },
                  choice_c: { type: Type.STRING, description: "الخيار الثالث (ج)" },
                  choice_d: { type: Type.STRING, description: "الخيار الرابع (د)" },
                  correct_answer: { type: Type.STRING, description: "الحرف الصحيح للأنسب مثل 'أ' أو 'ب' أو 'ج' أو 'د' أو نص الخيار الصحيح" }
                },
                required: ["question_text", "choice_a", "choice_b", "choice_c", "choice_d", "correct_answer"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    let questionsData = [];
    try {
      const parsed = JSON.parse(result.text || "{}");
      questionsData = parsed.questions || [];
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", e);
      return res.status(500).json({ error: "فشل في تحويل استجابة الذكاء الاصطناعي إلى أسئلة." });
    }

    return res.json({ questions: questionsData });
  } catch (error: any) {
    console.error("Teacher AI error:", error);
    return res.status(500).json({ 
      error: error?.message || "حدث خطأ أثناء إنشاء الأسئلة بالذكاء الاصطناعي." 
    });
  }
}
