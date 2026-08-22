import express from "express";
import studentAiHandler from "./student-ai.js";
import teacherAiHandler from "./teacher-ai.js";
import verifyChatHandler from "./verify-chat.js";
import healthHandler from "./health.js";

export const app = express();

app.use((req: any, res, next) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return next();
  }
  express.json()(req, res, next);
});

// Register modular handlers on the Express app
app.get("/api/health", healthHandler);
app.post("/api/student-ai", studentAiHandler);
app.post("/api/teacher-ai", teacherAiHandler);
app.post("/api/verify-chat", verifyChatHandler);

// Handler wrapper for Vercel functions mapping to root index
export default function handler(req: any, res: any) {
  return app(req, res);
}
