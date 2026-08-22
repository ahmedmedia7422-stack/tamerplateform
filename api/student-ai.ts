import { generateContentWithFallback } from "./_ai.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, chatHistory } = req.body || {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "الرجاء كتابة السؤال أولاً" });
    }

    const systemInstruction = `أنت المساعد التعليمي الذكي "مساعد لغة الضاد" الخاص بمنصة الأستاذ أحمد تامر المتخصصة في تدريس اللغة العربية (النحو، البلاغة، الأدب، النصوص، القراءة، التعبير، والقواعد الإملائية) لجميع المراحل التعليمية.
مهمتك شرح وتبسيط قواعد اللغة العربية وإعراب الجمل وتحليل الصور البلاغية بأسلوب مشجع ومبسط ومتقن، مع ضرب أمثلة واضحة وشواهد شعرية وقرآنية مناسبة.`;

    let formattedContents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        if (msg && (msg.role === "user" || msg.role === "model") && msg.content) {
          formattedContents.push({
            role: msg.role === "model" ? "model" : "user",
            parts: [{ text: String(msg.content) }]
          });
        }
      }
    }

    formattedContents.push({
      role: "user",
      parts: [{ text: prompt.trim() }]
    });

    const result = await generateContentWithFallback({
      model: "gemini-3.6-flash",
      contents: formattedContents,
      config: {
        systemInstruction
      }
    });

    const replyText = result?.text || "عذراً يا بطل، لم أستطع توليد إجابة مناسبة حالياً. حاول مرة أخرى!";
    return res.json({ response: replyText });
  } catch (error: any) {
    console.error("Student AI error:", error);
    return res.status(500).json({ 
      error: error?.message || "حدث خطأ في الاتصال بالمساعد الذكي." 
    });
  }
}
