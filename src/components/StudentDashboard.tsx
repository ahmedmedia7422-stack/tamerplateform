import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  serverTimestamp, 
  orderBy,
  limit,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Flame, 
  Trophy, 
  Play, 
  Pause,
  BookOpen, 
  Send, 
  Smartphone, 
  User, 
  Users, 
  GraduationCap, 
  Award,
  Zap,
  ChevronLeft,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Cpu,
  Clock,
  Sparkles,
  Gamepad2,
  Home,
  MessageCircle,
  Palette,
  LogOut,
  RotateCcw,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Key,
  AlertTriangle,
  Download
} from 'lucide-react';
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import VideoPlayerModal from './VideoPlayerModal';
import EducationalGames from './EducationalGames';
import AlchemiyaStudentDashboard from './AlchemiyaStudentDashboard';
import { isAndroidWebView } from './AppDownloadPrompt';

const SECRET_KEY = "JamalAcademy_Secret_2026";

export function checkProfanity(text: string): { isBad: boolean; matchedWord?: string } {
  if (!text) return { isBad: false };
  
  const clean = text.toLowerCase();
  
  const removeDiacritics = (str: string) => str.replace(/[\u064B-\u0652]/g, "").replace(/\u0640/g, "");
  const normArabic = (str: string) => {
    let s = removeDiacritics(str);
    s = s.replace(/[أإآٱ]/g, "ا");
    s = s.replace(/ة/g, "ه");
    s = s.replace(/ى/g, "ي");
    s = s.replace(/[ؤئ]/g, "ء");
    return s;
  };

  const normalizedWithSpaces = normArabic(clean);
  const normalizedNoSpaces = normalizedWithSpaces.replace(/\s+/g, "");

  // Base Egyptian bad words (normalized)
  const badWords = [
    "كس", "طيز", "زب", "خول", "عرص", "ديوث", "قحبه", "شرموطه", "شرموط", "شراميط",
    "متناك", "منيوك", "منيك", "تناكه", "بضين", "بضان", "اهبل", "غبي", "ابنالكلب"
  ];
  
  // Exact bad phrases to check in no-space text
  const badPhrasesNoSpaces = [
    "ابنالمتناكه", "ابنالشرموطه", "ابنالاحبه", "ابنالوسخه", "ابنالمتناكة", "ابنالشرموطة", "ابنالوسخة",
    "كسمك", "كسختك", "طيزك", "امكالساقطه", "يلعنامك", "يلعنابوك", "كسختك", "كسمينامك", "كسخاله", "كسعمه"
  ];

  for (const phrase of badPhrasesNoSpaces) {
    if (normalizedNoSpaces.includes(phrase)) {
      return { isBad: true, matchedWord: phrase };
    }
  }

  const words = normalizedWithSpaces.split(/[\s\d\p{P}\p{S}]+/u).filter(Boolean);
  
  for (const word of words) {
    for (const bad of badWords) {
      if (bad === "زب") {
        if (word === "زب" || word === "زبك" || word === "زبي" || word === "زبه" || word === "الزب" || word === "الزبك" || word === "الزبي") {
          return { isBad: true, matchedWord: "زب" };
        }
      } else if (bad === "كس") {
        if (word === "كس" || word === "كسك" || word === "كسمك" || word === "كسم" || word === "كسها" || word === "الكس" || word === "كسه" || word === "كسمك" || word === "كسمكم" || word === "كسختك") {
          return { isBad: true, matchedWord: "كس" };
        }
      } else if (bad === "طيز") {
        if (word.includes("طيز")) {
          return { isBad: true, matchedWord: "طيز" };
        }
      } else if (bad === "خول") {
        if (word === "خول" || word === "خوال" || word === "الخول" || word === "خولنه") {
          return { isBad: true, matchedWord: "خول" };
        }
      } else if (bad === "عرص") {
        if (word.includes("عرص")) {
          return { isBad: true, matchedWord: "عرص" };
        }
      } else if (bad === "شرموطه" || bad === "شرموط") {
        if (word.includes("شرموط") || word.includes("شراميط")) {
          return { isBad: true, matchedWord: "شرموطة" };
        }
      } else if (bad === "متناك" || bad === "منيوك" || bad === "منيك") {
        if (word.includes("متناك") || word.includes("منيوك") || word.includes("منيك") || word.includes("تناك")) {
          return { isBad: true, matchedWord: "متناك" };
        }
      } else if (bad === "قحبه") {
        if (word.includes("قحب")) {
          return { isBad: true, matchedWord: "قحبة" };
        }
      } else if (bad === "ديوث") {
        if (word.includes("ديوث")) {
          return { isBad: true, matchedWord: "ديوث" };
        }
      } else {
        if (word === bad || (bad.length > 3 && word.includes(bad))) {
          return { isBad: true, matchedWord: bad };
        }
      }
    }
  }

  return { isBad: false };
}

interface StudentDashboardProps {
  onLogout: () => void;
  currentTheme?: string;
  onThemeChange?: (theme: any) => void;
}

export default function StudentDashboard({ onLogout, currentTheme = 'khemiai_dark', onThemeChange }: StudentDashboardProps) {
  // Authentication & Registration state
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({
    name: '',
    code: '',
    phone: '',
    className: '',
    groupName: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [newlyRegisteredStudent, setNewlyRegisteredStudent] = useState<any>(null);
  const [legacyStudentNeedPassword, setLegacyStudentNeedPassword] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Selected Avatar of the student (default is spiderman)
  const [selectedAvatar, setSelectedAvatar] = useState<string>('spiderman');

  // App Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'alchemiya' | 'missions' | 'lectures' | 'friday' | 'profile' | 'community' | 'games'>('home');

  // Real data state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [centerGroups, setCenterGroups] = useState<any[]>([]);
  
  // Active Exam state
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [examSubmittedResult, setExamSubmittedResult] = useState<any>(null);
  const [quizTimer, setQuizTimer] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Result details & 30-min lock view state
  const [viewingResultDetails, setViewingResultDetails] = useState<any | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchCenterGroups() {
      try {
        const snap = await getDocs(collection(db, 'center_groups'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCenterGroups(list);
      } catch (e) {
        console.error("Error loading center groups for registration:", e);
      }
    }
    fetchCenterGroups();
  }, []);

  // Video modal player state
  const [activeVideo, setActiveVideo] = useState<any>(null);

  // Dynamic Hero Banner & Teacher Settings
  const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=2000&auto=format&fit=crop';
  const DEFAULT_TEACHER_IMAGE = '/teacher.png';

  const SCIENCE_HERO_DEFAULTS = {
    imageUrl: DEFAULT_HERO_IMAGE,
    badgeText: 'منصة الأستاذ أحمد تامر للغة العربية 📖',
    mainTitle: 'مرحباً بك في <span class="text-amber-400">عالم لغة الضاد</span>',
    description: 'رحلتك نحو التفوق والدرجات النهائية في مادة اللغة العربية (النحو، البلاغة، الأدب، والنصوص) بأسلوب الأستاذ أحمد تامر المبتكر.'
  };

  const SCIENCE_TEACHER_DEFAULTS = {
    imageUrl: DEFAULT_TEACHER_IMAGE,
    badgeText: 'معلم لغة الضاد ✒️',
    name: 'الأستاذ أحمد تامر',
    subtitle: 'خبير تدريس مادة اللغة العربية للمراحل الإعدادية والثانوية',
    quote: 'لغة الضاد بحرٌ من الفصاحة والبيان، وقواعد النحو مفتاح الفهم والإتقان. تعلم بشغف لتتفوق!'
  };

  const [heroSettings, setHeroSettings] = useState(SCIENCE_HERO_DEFAULTS);
  const [teacherSettings, setTeacherSettings] = useState(SCIENCE_TEACHER_DEFAULTS);

  useEffect(() => {
    const unsubHero = onSnapshot(doc(db, 'settings', 'hero'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHeroSettings({
          imageUrl: data.imageUrl || DEFAULT_HERO_IMAGE,
          badgeText: data.badgeText || SCIENCE_HERO_DEFAULTS.badgeText,
          mainTitle: data.mainTitle || SCIENCE_HERO_DEFAULTS.mainTitle,
          description: data.description || SCIENCE_HERO_DEFAULTS.description
        });
      } else {
        setHeroSettings(SCIENCE_HERO_DEFAULTS);
      }
    });

    const unsubTeacher = onSnapshot(doc(db, 'settings', 'teacher'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTeacherSettings({
          imageUrl: data.imageUrl || DEFAULT_TEACHER_IMAGE,
          badgeText: data.badgeText || SCIENCE_TEACHER_DEFAULTS.badgeText,
          name: data.name || SCIENCE_TEACHER_DEFAULTS.name,
          subtitle: data.subtitle || SCIENCE_TEACHER_DEFAULTS.subtitle,
          quote: data.quote || SCIENCE_TEACHER_DEFAULTS.quote
        });
        setTeacherAvatarError(false);
      } else {
        setTeacherSettings(SCIENCE_TEACHER_DEFAULTS);
      }
    });

    return () => {
      unsubHero();
      unsubTeacher();
    };
  }, []);

  // Teacher Avatar Image error state
  const [teacherAvatarError, setTeacherAvatarError] = useState(false);

  // Chat AI state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'model', content: 'أهلاً بك يا بطل لغة الضاد! أنا "مساعدك اللغوي الذكي". كيف يمكنني مساعدتك اليوم في فهم قواعد النحو، شرح البلاغة، إعراب الجمل، ونصوص الأدب؟ 📖✨' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Community Chat state
  const [communityMessages, setCommunityMessages] = useState<any[]>([]);
  const [communityInput, setCommunityInput] = useState('');
  const [isSendingCommunityMessage, setIsSendingCommunityMessage] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const communityEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to real-time chat settings (open / closed) for student's group
  useEffect(() => {
    const studentGroup = student?.groupName || student?.group_name || student?.className;
    if (!studentGroup) return;

    const docRef = doc(db, 'chat_settings', studentGroup);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsChatClosed(!!docSnap.data()?.is_closed);
      } else if (student?.className) {
        // Fallback check if chat was closed on class-level
        const classDocRef = doc(db, 'chat_settings', student.className);
        getDoc(classDocRef).then(cSnap => {
          if (cSnap.exists()) {
            setIsChatClosed(!!cSnap.data()?.is_closed);
          } else {
            setIsChatClosed(false);
          }
        }).catch(() => setIsChatClosed(false));
      } else {
        setIsChatClosed(false);
      }
    });
    return () => unsubscribe();
  }, [student?.groupName, student?.group_name, student?.className]);

  // Subscribe to real-time student account status (is_banned, is_chat_banned)
  useEffect(() => {
    if (!student?.code) return;
    const q = query(collection(db, 'students'), where('code', '==', student.code));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.is_banned) {
          setStudent(null);
          localStorage.removeItem('jamal_student');
          alert('🚨 تم حظر حسابك بالكامل من المنصة بقرار من الأستاذ أحمد تامر.');
        } else {
          setStudent(prev => prev ? { 
            ...prev, 
            is_chat_banned: !!data.is_chat_banned,
            is_banned: !!data.is_banned
          } : null);
        }
      }
    });
    return () => unsubscribe();
  }, [student?.code]);

  // Subscribe to real-time community chat for student's group
  useEffect(() => {
    if (!student || activeTab !== 'community') return;
    
    const studentGroup = student.groupName || student.group_name || student.className || 'مجموعة السنتر';
    
    // Subscribe to messages in this specific group
    const q = query(
      collection(db, 'grade_chats'),
      where('group_name', '==', studentGroup)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort client-side to avoid needing composite index
      let msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }));

      // Sort by timestamp
      msgs.sort((a, b) => a.timestamp_num - b.timestamp_num);
        
      setCommunityMessages(msgs);
      
      // Auto-scroll to bottom of live chat
      setTimeout(() => {
        communityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Perform hourly/2-hour automatic cleanup of old messages
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.timestamp_num && data.timestamp_num < twoHoursAgo) {
          try {
            await deleteDoc(doc(db, 'grade_chats', docSnap.id));
          } catch (e) {
            console.error("Cleanup old chat error:", e);
          }
        }
      });
    }, (err) => {
      console.error("Live community chat subscription error:", err);
    });

    return () => unsubscribe();
  }, [student, activeTab]);

  // Message to Teacher state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isAnonymousMessage, setIsAnonymousMessage] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSendTeacherMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSendingMessage) return;
    setIsSendingMessage(true);
    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        student_id: student.id || 'unknown',
        student_name: isAnonymousMessage ? 'فاعل خير (مجهول)' : student.name,
        student_code: isAnonymousMessage ? 'مجهول' : student.code,
        class_name: student.className,
        timestamp: new Date().toISOString(),
        is_anonymous: isAnonymousMessage,
      });
      alert('تم إرسال رسالتك السرية بنجاح إلى القائد!');
      setShowMessageModal(false);
      setMessageText('');
      setIsAnonymousMessage(false);
    } catch (err) {
      console.error("Error sending message", err);
      alert('حدث خطأ أثناء إرسال الرسالة. حاول مرة أخرى.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleBanningStudent = async (currStudent: any, triggeredWord: string) => {
    try {
      // Find the student document and set is_banned to true
      const q = query(collection(db, 'students'), where('code', '==', currStudent.code));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const sDoc = snap.docs[0];
        await updateDoc(doc(db, 'students', sDoc.id), {
          is_banned: true
        });
      }

      // Send automated teacher message notification
      await addDoc(collection(db, 'messages'), {
        student_name: "⚠️ نظام الحماية التلقائي (الذكاء الاصطناعي)",
        student_code: "SYSTEM",
        class_name: currStudent.className,
        is_anonymous: false,
        text: `🚨 تنبيه حظر بطل: تم حظر الطالب "${currStudent.name}" (كود: ${currStudent.code}) تلقائياً ومباشرة من المنصة لمحاولته إرسال كلمة خارجة غير لائقة في شات مجتمع الطلاب.\n\nالكلمة أو المحتوى المكتشف: [ ${triggeredWord} ]\n\nنص الرسالة كاملة: "${triggeredWord}"\n\nتم اتخاذ الإجراء اللازم وإغلاق الحساب في الحال.`,
        timestamp: new Date().toISOString()
      });

      // Show alert and logout
      alert(`🚨 تم حظرك فوراً من المنصة بسبب كتابة كلمات غير لائقة أو خارجة! [ ${triggeredWord} ]\nتم إرسال بلاغ فوري ببياناتك بالكامل للأستاذ أحمد تامر.`);
      setStudent(null);
      localStorage.removeItem('jamal_student');
    } catch (e) {
      console.error("Error banning student:", e);
    }
  };

  const handleSendCommunityMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityInput.trim() || isSendingCommunityMessage) return;

    if (isChatClosed) {
      alert('🔒 الشات مغلق حالياً بقرار من الأستاذ أحمد تامر.');
      return;
    }

    if (student?.is_chat_banned) {
      alert('🚨 أنت محظور من إرسال الرسائل في الشات بقرار من الأستاذ أحمد تامر.');
      return;
    }

    const rawText = communityInput.trim();
    setCommunityInput('');
    setIsSendingCommunityMessage(true);

    try {
      // 1. Run local Egyptian profanity filter
      const localCheck = checkProfanity(rawText);
      if (localCheck.isBad) {
        await handleBanningStudent(student, localCheck.matchedWord || rawText);
        setIsSendingCommunityMessage(false);
        return;
      }

      // 2. Perform server-side AI check for extra security (phonetic bypass, severe context etc.)
      const verifyRes = await fetch('/api/verify-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData.isBad) {
          await handleBanningStudent(student, verifyData.matchedWord || rawText);
          setIsSendingCommunityMessage(false);
          return;
        }
      }

      // 3. Write message to Firestore (this guarantees live chat with no delay because of onSnapshot)
      const studentGroup = student?.groupName || student?.group_name || student?.className || 'مجموعة السنتر';
      await addDoc(collection(db, 'grade_chats'), {
        group_name: studentGroup,
        class_name: student.className,
        student_code: student.code,
        student_name: student.name,
        avatar: selectedAvatar,
        text: rawText,
        timestamp_num: Date.now(),
        createdAt: new Date().toISOString()
      });

    } catch (err: any) {
      console.error("Error sending community message:", err);
    } finally {
      setIsSendingCommunityMessage(false);
    }
  };

  // Load existing session
  useEffect(() => {
    const savedStudent = localStorage.getItem('jamal_student');
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      const cleanCode = parsed.code ? String(parsed.code).replace(/\D/g, '') || parsed.code : '';
      if (cleanCode && cleanCode !== parsed.code) {
        parsed.code = cleanCode;
        localStorage.setItem('jamal_student', JSON.stringify(parsed));
      }
      setStudent(parsed);
      setSelectedAvatar(parsed.avatar || 'spiderman');
      fetchStudentData(parsed.code, parsed.className);
    } else {
      setLoading(false);
    }
  }, []);

  // Sync scroll for chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Auto-restore active exam session on mount or student login
  useEffect(() => {
    if (!student?.code) return;

    const rawSession = localStorage.getItem('jamal_active_exam_' + student.code);
    if (!rawSession) return;

    try {
      const session = JSON.parse(rawSession);
      if (session.studentCode === student.code && session.quiz && session.quizQuestions) {
        const now = Date.now();
        const remainingMs = session.endTime - now;
        const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));

        if (remainingSecs > 0) {
          // Resume active exam session
          setActiveQuiz(session.quiz);
          setQuizQuestions(session.quizQuestions);
          setSelectedAnswers(session.selectedAnswers || {});
          setQuizTimer(remainingSecs);
        } else {
          // Time expired while off-line / closed! Auto-submit!
          alert("🚨 تنبيه: لقد انتهى وقت الاختبار المتبقي أثناء خروجك، وتم تسليم إجاباتك المسجلة تلقائياً.");
          performQuizSubmission(session.quiz, session.quizQuestions, session.selectedAnswers || {});
        }
      }
    } catch (e) {
      console.error("Error restoring active exam session:", e);
    }
  }, [student]);

  // Handle real timestamp countdown timer for active exam
  useEffect(() => {
    if (!activeQuiz || !student?.code || examSubmittedResult) return;

    const interval = setInterval(() => {
      const raw = localStorage.getItem('jamal_active_exam_' + student.code);
      if (!raw) {
        setQuizTimer(0);
        return;
      }

      try {
        const session = JSON.parse(raw);
        const now = Date.now();
        const remainingSecs = Math.max(0, Math.floor((session.endTime - now) / 1000));
        setQuizTimer(remainingSecs);

        if (remainingSecs <= 0) {
          clearInterval(interval);
          performQuizSubmission(activeQuiz, quizQuestions, selectedAnswers);
        }
      } catch (e) {
        console.error("Timer check error:", e);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuiz, student, examSubmittedResult, quizQuestions, selectedAnswers]);

  // Prevent closing / navigating away during an active exam
  useEffect(() => {
    if (!activeQuiz || examSubmittedResult) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '🚨 تنبيه: الاختبار جارٍ الآن ولا يمكنك إلغاؤه! إغلاق الصفحة لن يوقف الوقت وسيتم تسليم إجاباتك عند انتهاء الوقت.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeQuiz, examSubmittedResult]);

  const fetchStudentData = async (code: string, className: string) => {
    setLoading(true);
    try {
      const cleanCode = code ? String(code).replace(/\D/g, '') || code : code;

      // Check if student is banned first
      let studentSnap = await getDocs(query(collection(db, 'students'), where('code', '==', cleanCode)));
      if (studentSnap.empty && cleanCode !== code) {
        studentSnap = await getDocs(query(collection(db, 'students'), where('code', '==', code)));
      }
      if (!studentSnap.empty) {
        const data = studentSnap.docs[0].data();
        if (data.is_banned) {
          setStudent(null);
          localStorage.removeItem('jamal_student');
          alert('🚨 تم حظر هذا الحساب من المنصة لاستخدام كلمات غير لائقة! يرجى مراجعة الأستاذ أحمد تامر.');
          setLoading(false);
          return;
        }
      }

      // Fetch active quizzes for their class
      const qSnap = await getDocs(query(collection(db, 'quizzes'), where('class_name', '==', className), where('is_active', '==', true)));
      const qList = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(qList);

      // Fetch videos for their class
      const vSnap = await getDocs(query(collection(db, 'videos'), where('class_name', '==', className)));
      const vList = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(vList);

      // Fetch student's past results (matching both clean numeric code and legacy prefix codes)
      const rSnapAll = await getDocs(collection(db, 'results'));
      const rList = rSnapAll.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((r: any) => {
          if (!r.student_code) return false;
          if (r.student_code === cleanCode || r.student_code === code) return true;
          const rClean = String(r.student_code).replace(/\D/g, '');
          return rClean === cleanCode && rClean.length > 0;
        });

      setStudentResults(rList);

      // Calculate total points
      const totalPoints = rList.reduce((acc, curr: any) => acc + (curr.score || 0), 0);
      
      // Update local storage and student state with real cumulative score
      setStudent((prev: any) => {
        if (!prev) return null;
        const updated = { ...prev, code: cleanCode, totalScore: totalPoints };
        localStorage.setItem('jamal_student', JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      console.error("Error loading student panel:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateUniqueCode = async () => {
    // Attempt to generate a unique 5-digit numeric code up to 5 times
    for (let i = 0; i < 5; i++) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const code = `${randomNum}`;
      
      const q = query(collection(db, 'students'), where('code', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) {
        return code;
      }
    }
    // Fallback
    return `${Math.floor(10000 + Math.random() * 90000)}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    const enteredPass = loginForm.password ? loginForm.password.trim() : '';
    if (!enteredPass) {
      setLoginError('يرجى إدخال كلمة المرور الخاصة بك لتسجيل الدخول!');
      setIsSubmittingLogin(false);
      return;
    }

    try {
      // 1. Exact match query on password
      const studentSnap = await getDocs(query(collection(db, 'students'), where('password', '==', enteredPass)));
      
      let matchedDoc: any = null;
      if (!studentSnap.empty) {
        matchedDoc = studentSnap.docs[0];
      } else {
        // Fallback search across all students in case of trimmed match
        const allStudentsSnap = await getDocs(collection(db, 'students'));
        matchedDoc = allStudentsSnap.docs.find(d => {
          const docData = d.data();
          const docPass = docData.password ? String(docData.password).trim() : '';
          return docPass === enteredPass;
        });
      }

      if (!matchedDoc) {
        setLoginError('عذراً يا بطل! كلمة المرور المدخلة غير مسجلة بالأكاديمية أو غير صحيحة. يرجى التأكد من كتابة كلمة المرور بدقة أو تسجيل حساب جديد.');
        setIsSubmittingLogin(false);
        return;
      }

      const data = matchedDoc.data();
      const dbCode = data.code ? String(data.code) : '';
      const finalCleanCode = dbCode.replace(/\D/g, '') || dbCode || '101';

      if (data.is_banned) {
        setLoginError('🚨 عذراً، تم حظر هذا الحساب من المنصة نهائياً بسبب مخالفة الشروط! يرجى مراجعة الأستاذ أحمد تامر.');
        setIsSubmittingLogin(false);
        return;
      }

      // Success Login
      const savedData = { 
        id: matchedDoc.id, 
        name: data.name,
        code: finalCleanCode,
        phone: data.phone,
        className: data.class_name || data.className, 
        groupName: data.group_name || data.groupName,
        totalScore: data.total_score || 0,
        badges: data.badges || ['Iron Recruit'],
        avatar: data.avatar || 'spiderman'
      };
      localStorage.setItem('jamal_student', JSON.stringify(savedData));
      setStudent(savedData);
      setSelectedAvatar(savedData.avatar);
      await fetchStudentData(savedData.code, savedData.className);

    } catch (err: any) {
      setLoginError('خطأ أثناء الاتصال بالأكاديمية: ' + err.message);
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    const { name, phone, className, groupName, password } = loginForm;
    if (!name || !phone || !className || !groupName || !password) {
      setLoginError('يرجى ملء كافة تفاصيل البطل لتسجيل عضويتك بالأكاديمية!');
      setIsSubmittingLogin(false);
      return;
    }

    const trimmedPass = password.trim();
    if (trimmedPass.length < 3) {
      setLoginError('كلمة المرور يجب ألا تقل عن 3 أحرف أو أرقام!');
      setIsSubmittingLogin(false);
      return;
    }

    try {
      // 1. Password uniqueness validation across all registered students
      const passSnap = await getDocs(query(collection(db, 'students'), where('password', '==', trimmedPass)));
      let isDuplicate = !passSnap.empty;

      if (!isDuplicate) {
        const allStudentsSnap = await getDocs(collection(db, 'students'));
        const found = allStudentsSnap.docs.some(d => {
          const p = d.data().password ? String(d.data().password).trim() : '';
          return p === trimmedPass;
        });
        if (found) isDuplicate = true;
      }

      if (isDuplicate) {
        setLoginError('⚠️ كلمة المرور هذه محجوزة ومستخدمة بالفعل لطالب آخر! لا يجوز تكرار كلمات المرور لأن تسجيل الدخول يتم بكلمة المرور فقط. يرجى اختيار كلمة مرور فريدة ومميزة خاصة بك.');
        setIsSubmittingLogin(false);
        return;
      }

      // Create a unique student code
      const generatedCode = await generateUniqueCode();

      const newStudentDoc = {
        name: name.trim(),
        code: generatedCode,
        phone: phone.trim(),
        password: trimmedPass,
        class_name: className,
        group_name: groupName,
        total_score: 0,
        badges: ['Iron Recruit'],
        avatar: 'spiderman', // default avatar
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'students'), newStudentDoc);

      // Show the congratulatory popup modal with their newly generated credentials
      setNewlyRegisteredStudent({
        id: docRef.id,
        name: newStudentDoc.name,
        code: newStudentDoc.code,
        password: newStudentDoc.password,
        phone: newStudentDoc.phone,
        className: newStudentDoc.class_name,
        groupName: newStudentDoc.group_name,
        totalScore: 0,
        badges: ['Iron Recruit'],
        avatar: 'spiderman'
      });

    } catch (err: any) {
      setLoginError('فشل تسجيل البطل: ' + err.message);
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleUpgradeLegacyStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = newPassword.trim();
    if (!cleanPass) return;

    if (cleanPass.length < 3) {
      alert('كلمة المرور يجب ألا تقل عن 3 أحرف أو أرقام!');
      return;
    }

    try {
      // Check password uniqueness
      const passSnap = await getDocs(query(collection(db, 'students'), where('password', '==', cleanPass)));
      const duplicateDoc = passSnap.docs.find(d => d.id !== legacyStudentNeedPassword.id);
      if (duplicateDoc) {
        alert('⚠️ كلمة المرور هذه محجوزة ومستخدمة بالفعل لطالب آخر! يرجى اختيار كلمة مرور فريدة.');
        return;
      }

      await updateDoc(doc(db, 'students', legacyStudentNeedPassword.id), {
        password: cleanPass
      });

      const savedData = { 
        id: legacyStudentNeedPassword.id, 
        name: legacyStudentNeedPassword.name,
        code: legacyStudentNeedPassword.code,
        phone: legacyStudentNeedPassword.phone,
        className: legacyStudentNeedPassword.class_name, 
        groupName: legacyStudentNeedPassword.group_name,
        totalScore: legacyStudentNeedPassword.total_score || 0,
        badges: legacyStudentNeedPassword.badges || ['Iron Recruit'],
        avatar: legacyStudentNeedPassword.avatar || 'spiderman'
      };

      localStorage.setItem('jamal_student', JSON.stringify(savedData));
      setStudent(savedData);
      setSelectedAvatar(savedData.avatar);
      setLegacyStudentNeedPassword(null);
      await fetchStudentData(savedData.code, savedData.className);

    } catch (err: any) {
      alert("خطأ أثناء تعيين كلمة المرور: " + err.message);
    }
  };

  const handleSelectAvatar = async (avatarName: string) => {
    setSelectedAvatar(avatarName);
    const updatedStudent = { ...student, avatar: avatarName };
    localStorage.setItem('jamal_student', JSON.stringify(updatedStudent));
    setStudent(updatedStudent);
    
    // Save to Firestore
    try {
      if (student?.id) {
        await updateDoc(doc(db, 'students', student.id), {
          avatar: avatarName
        });
      }
    } catch (err) {
      console.error("Error saving avatar:", err);
    }
  };

  // Handle student answer selection with immediate state & localStorage session sync
  const handleSelectAnswer = (qId: string, choiceLabel: string) => {
    setSelectedAnswers(prev => {
      const next = { ...prev, [qId]: choiceLabel };
      if (student?.code) {
        const raw = localStorage.getItem('jamal_active_exam_' + student.code);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            parsed.selectedAnswers = next;
            localStorage.setItem('jamal_active_exam_' + student.code, JSON.stringify(parsed));
          } catch (e) {
            console.error("Error updating active exam session answers:", e);
          }
        }
      }
      return next;
    });
  };

  // Launch interactive mission (quiz) with mandatory lock & persistent timer
  const launchExam = async (quiz: any) => {
    // Check if already completed on this device or in past results
    const pastResult = studentResults.find(r => r.quiz_id === quiz.id);

    if (pastResult) {
      setViewingResultDetails(pastResult);
      return;
    }

    if (localStorage.getItem('jamal_completed_quiz_' + quiz.id)) {
      alert("لقد قمت بإكمال هذا الاختبار سابقاً ولا يمكنك إعادته.");
      return;
    }

    // Explicit confirmation warning before starting
    const confirmStart = confirm(
      `🚨 تنبيه هام جداً للاختبار:\n\nبمجرد بدء الاختبار ("${quiz.quiz_name}")، سيبدأ حساب الوقت فوراً ولن تتمكن من إلغاء الاختبار أو الخروج منه.\n\nحتى لو قمت بتحديث الصفحة أو إغلاق المتصفح، سيبدأ المؤقت بالتراجع وسيتم الاحتفاظ بإجاباتك وتسليم الاختبار تلقائياً عند انتهاء الوقت!\n\nهل أنت جاهز ومستعد لبدء الاختبار الآن؟`
    );
    if (!confirmStart) return;

    setLoading(true);
    try {
      // Fetch questions for this quiz
      const questionsSnap = await getDocs(collection(db, 'quizzes', quiz.id, 'questions'));
      const qList = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (qList.length === 0) {
        alert("لا توجد أسئلة متاحة في هذا الاختبار حالياً.");
        return;
      }

      const durationMins = quiz.duration_minutes ? Number(quiz.duration_minutes) : (qList.length * 5);
      const startTimeMs = Date.now();
      const endTimeMs = startTimeMs + (durationMins * 60 * 1000);

      // Save persistent exam session to localStorage
      const examSession = {
        studentCode: student.code,
        quiz,
        quizQuestions: qList,
        selectedAnswers: {},
        startTime: startTimeMs,
        endTime: endTimeMs
      };
      localStorage.setItem('jamal_active_exam_' + student.code, JSON.stringify(examSession));

      setQuizQuestions(qList);
      setSelectedAnswers({});
      setActiveQuiz(quiz);
      setExamSubmittedResult(null);
      setQuizTimer(durationMins * 60);

    } catch (err) {
      console.error("Error launching exam:", err);
      alert("حدث خطأ أثناء فتح الاختبار، يرجى إعادة المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  const submitActiveQuiz = async () => {
    if (!activeQuiz || isSubmittingExam) return;

    const unansweredCount = quizQuestions.length - Object.keys(selectedAnswers).length;
    if (quizTimer > 0 && unansweredCount > 0) {
      const confirmSubmit = confirm(`تنبيه: يوجد ${unansweredCount} أسئلة لم تجب عليها بعد!\nهل أنت متأكد من رغبتك في تسليم الاختبار الآن؟`);
      if (!confirmSubmit) return;
    }

    await performQuizSubmission(activeQuiz, quizQuestions, selectedAnswers);
  };

  const performQuizSubmission = async (quiz: any, questions: any[], answers: { [key: string]: string }) => {
    if (isSubmittingExam) return;
    setIsSubmittingExam(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    let score = 0;
    const studentAnswers = questions.map(q => {
      const isCorrect = answers[q.id] === q.correct_answer;
      if (isCorrect) score++;
      return {
        question_id: q.id || '',
        question_text: q.question_text || '',
        choice_a: q.choice_a || '',
        choice_b: q.choice_b || '',
        choice_c: q.choice_c || '',
        choice_d: q.choice_d || '',
        correct_answer: q.correct_answer || 'A',
        selected_answer: answers[q.id] || 'لم يجب'
      };
    });

    try {
      const submittedAtISO = new Date().toISOString();
      // Save result to Firestore with detailed answers
      const resultData = {
        student_code: student.code,
        student_name: student.name,
        phone: student.phone,
        class_name: student.className,
        group_name: student.groupName,
        quiz_id: quiz.id,
        quiz_name: quiz.quiz_name,
        score: score,
        total_questions: questions.length,
        submittedAt: submittedAtISO,
        student_answers: studentAnswers
      };

      const docRef = await addDoc(collection(db, 'results'), resultData);

      // Mark locally completed & remove active exam lock session
      localStorage.setItem('jamal_completed_quiz_' + quiz.id, 'true');
      localStorage.removeItem('jamal_active_exam_' + student.code);

      // Create QR Verification code
      const qrData = {
        name: student.name,
        code: student.code,
        score: `${score}/${questions.length}`,
        quiz_id: quiz.id,
        timestamp: submittedAtISO
      };
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(qrData), SECRET_KEY).toString();
      const qrUrl = await QRCode.toDataURL(encrypted);

      const savedResultWithId = { ...resultData, id: docRef.id };

      setActiveQuiz(quiz);
      setQuizQuestions(questions);
      setSelectedAnswers(answers);
      setExamSubmittedResult({
        score,
        total: questions.length,
        qrCodeUrl: qrUrl,
        code: student.code,
        resultObj: savedResultWithId
      });

      // Update local state to show completed quiz
      setStudentResults(prev => [...prev.filter(r => r.quiz_id !== quiz.id), savedResultWithId]);

      // Fetch student data to update total score
      await fetchStudentData(student.code, student.className);

    } catch (err) {
      console.error("Error submitting exam:", err);
      alert("حدث خطأ أثناء حفظ النتيجة، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmittingExam(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/student-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          chatHistory: chatMessages.slice(-4) // Send last 4 messages for context to save tokens
        })
      });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned an invalid response (Status: ${response.status})`);
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || `Server Error: ${response.status}`);
      }

      setChatMessages(prev => [...prev, { role: 'model', content: data.response }]);
    } catch (err: any) {
      const errorMessage = err.message || '';
      if (errorMessage.includes("GEMINI_API_KEY") || errorMessage.includes("missing")) {
        setChatMessages(prev => [...prev, { role: 'model', content: `⚠️ **CONFIGURATION ERROR:**\n\n${errorMessage}` }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'model', content: 'عذراً يا بطل، لقد واجهت مشكلة فنية في الاتصال بخوادم الذكاء الاصطناعي الفائقة. يرجى المحاولة مرة أخرى!' }]);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper: format timer
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Badges logic
  const getBadgeAndDescription = (score: number) => {
    if (score >= 121) return { badge: 'إمبراطور الفصاحة والبيان 👑', color: 'text-amber-400 border-amber-400', desc: 'سيد البلاغة والنحو والدرجة الكاملة بلا منازع!' };
    if (score >= 76) return { badge: 'فارس النحو والأدب 📜', color: 'text-rose-400 border-rose-400', desc: 'صاحب الإعراب والتحليلات البلاغية الفائقة.' };
    if (score >= 41) return { badge: 'خبير البلاغة والنصوص ✍️', color: 'text-sky-400 border-cyan-400', desc: 'محلل الجمل والأساليب الأدبية بذكاء.' };
    if (score >= 16) return { badge: 'باحث لغة الضاد 📖', color: 'text-amber-500 border-sky-400', desc: 'متقن قواعد اللغة والإملاء بمهارة.' };
    return { badge: 'مستكشف قواعد اللغة ✨', color: 'text-amber-500 border-amber-500', desc: 'مستكشف جديد يبدأ أولى خطواته في عالم لغة الضاد.' };
  };

  const currentLevelInfo = getBadgeAndDescription(student?.totalScore || 0);

  if (loading && !student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950">
        <div className="w-16 h-16 border-8 border-amber-500 border-t-amber-300 rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-bold tracking-widest text-amber-500 uppercase">جاري التحقق من بيانات الدخول...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center px-3 sm:px-6 py-6 sm:py-10 relative z-10 w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-2xl border border-amber-200 shadow-2xl p-4 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden box-border">
          
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 via-sky-50/20 to-transparent pointer-events-none"></div>

          <div className="text-center mb-5 sm:mb-7 relative">
            <div className="inline-block bg-amber-100 border border-amber-300 px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4 backdrop-blur-md shadow-sm">
              <span className="text-[11px] sm:text-xs font-black text-amber-800 tracking-wider">
                منصة الأستاذ أحمد تامر للغة العربية 📖
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
              بوابة فرسان لغة الضاد
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed px-1">
              ادخل بوابتك وصقل مهاراتك في اللغة العربية مع الأستاذ أحمد تامر
            </p>
          </div>

          {/* Login vs Register Tabs Selector */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl mb-5 sm:mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError('');
              }}
              className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md font-black scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setLoginError('');
              }}
              className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                authMode === 'register'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md font-black scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              تسجيل طالب جديد
            </button>
          </div>

          {loginError && (
            <div className="bg-rose-50 border-2 border-rose-300 text-rose-700 p-3.5 sm:p-4 rounded-xl text-center font-bold text-xs sm:text-sm mb-5 shadow-sm">
              {loginError}
            </div>
          )}

          {authMode === 'login' ? (
            /* LOGIN FORM - PASSWORD ONLY */
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5 text-right relative z-10">
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 sm:p-4 mb-2 shadow-sm">
                <div className="flex items-center gap-2 text-amber-900 font-black text-xs sm:text-sm mb-1">
                  <Key className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                  <span>تسجيل الدخول بكلمة المرور</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-bold leading-relaxed">
                  أدخل كلمة المرور الخاصة بحسابك المسجل للدخول فوراً إلى المنصة وبدء التعلم.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  كلمة المرور الخاصة بك (Password)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    placeholder="أدخل كلمة المرور الخاصة بحسابك..."
                    className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 text-slate-900 rounded-xl p-3.5 sm:p-4 pl-12 pr-11 font-bold outline-none transition text-right tracking-wide shadow-sm text-sm sm:text-base"
                    value={loginForm.password}
                    onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <Key className="absolute right-3.5 text-slate-400 w-5 h-5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute left-3 p-1.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    title={showLoginPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white font-black py-3.5 sm:py-4 rounded-xl shadow-lg shadow-amber-500/25 transition active:scale-[0.99] text-base sm:text-lg tracking-wide flex justify-center items-center gap-2 cursor-pointer mt-2"
              >
                {isSubmittingLogin ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    جاري التحقق والدخول...
                  </>
                ) : (
                  <>
                    الدخول للمنصة <BookOpen className="w-5 h-5 text-white" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5 text-right relative z-10">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  اسم الطالب ثلاثي بالكامل
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="أدخل اسمك بالكامل باللغة العربية"
                    className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 text-slate-900 rounded-xl p-3.5 sm:p-4 pl-11 pr-4 font-bold outline-none transition text-right shadow-sm text-sm sm:text-base"
                    value={loginForm.name}
                    onChange={e => setLoginForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <User className="absolute left-3.5 text-slate-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  رقم الهاتف للتواصل
                </label>
                <div className="relative flex items-center">
                  <input
                    type="tel"
                    required
                    placeholder="رقم هاتف الطالب أو ولي الأمر"
                    className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 text-slate-900 rounded-xl p-3.5 sm:p-4 pl-11 pr-4 font-bold outline-none transition text-right shadow-sm text-sm sm:text-base"
                    value={loginForm.phone}
                    onChange={e => setLoginForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Smartphone className="absolute left-3.5 text-slate-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-amber-700 font-bold">🔐 مفتاح دخولك للمنصة</span>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    كلمة المرور الخاصة بك
                  </label>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    required
                    minLength={3}
                    placeholder="اختر كلمة مرور خاصة بك للدخول بها..."
                    className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 text-slate-900 rounded-xl p-3.5 sm:p-4 pl-12 pr-11 font-bold outline-none transition text-right shadow-sm text-sm sm:text-base"
                    value={loginForm.password}
                    onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <Key className="absolute right-3.5 text-slate-400 w-5 h-5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute left-3 p-1.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    title={showRegisterPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mt-1 leading-relaxed">
                  ⚠️ احفظ كلمة المرور جيداً لأنها الطريقة الوحيدة لدخول حسابك.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    الصف الدراسي
                  </label>
                  <div className="relative flex items-center">
                    <select
                      required
                      className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 text-slate-900 rounded-xl p-3.5 sm:p-4 pl-11 pr-4 font-bold outline-none transition cursor-pointer appearance-none text-right shadow-sm text-sm sm:text-base"
                      value={loginForm.className}
                      onChange={e => setLoginForm(prev => ({ ...prev, className: e.target.value, groupName: '' }))}
                    >
                      <option value="" disabled className="text-slate-400">اختر الصف الدراسي...</option>
                      <optgroup label="المرحلة الابتدائية" className="text-slate-900 font-bold">
                        <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                        <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                        <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                      </optgroup>
                      <optgroup label="المرحلة الإعدادية" className="text-slate-900 font-bold">
                        <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                        <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                        <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                      </optgroup>
                      <optgroup label="المرحلة الثانوية" className="text-slate-900 font-bold">
                        <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                        <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                        <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                      </optgroup>
                    </select>
                    <GraduationCap className="absolute left-3.5 text-slate-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    المجموعة والموعد
                  </label>
                  <div className="relative flex items-center">
                    <select
                      required
                      disabled={!loginForm.className}
                      className={`w-full bg-white border-2 border-slate-300 focus:border-amber-500 text-slate-900 rounded-xl p-3.5 sm:p-4 pl-11 pr-4 font-bold outline-none transition appearance-none text-right shadow-sm text-sm sm:text-base ${
                        !loginForm.className ? 'opacity-50 cursor-not-allowed border-dashed text-slate-400' : 'cursor-pointer'
                      }`}
                      value={loginForm.groupName}
                      onChange={e => setLoginForm(prev => ({ ...prev, groupName: e.target.value }))}
                    >
                      {!loginForm.className ? (
                        <option value="" disabled className="text-slate-400">⚠️ اختر الصف أولاً...</option>
                      ) : (
                        <option value="" disabled className="text-slate-400">اختر المجموعة الخاصة بك...</option>
                      )}
                      
                      {loginForm.className && (() => {
                        const matched = centerGroups.filter(g => g.class_name === loginForm.className);
                        if (matched.length > 0) {
                          return matched.map(g => {
                            const timeInfo = [g.day_of_week, g.time].filter(Boolean).join(' • ');
                            return (
                              <option key={g.id} value={g.group_name} className="text-slate-900 font-bold">
                                {g.group_name} {timeInfo ? `(${timeInfo})` : ''}
                              </option>
                            );
                          });
                        }
                        return (
                          <>
                            <option value="مجموعة السبت والثلثاء" className="text-slate-900 font-bold">مجموعة السبت والثلثاء</option>
                            <option value="مجموعة الأحد والأربعاء" className="text-slate-900 font-bold">مجموعة الأحد والأربعاء</option>
                            <option value="مجموعة الإثنين والخميس" className="text-slate-900 font-bold">مجموعة الإثنين والخميس</option>
                            <option value="مجموعة الجمعة" className="text-slate-900 font-bold">مجموعة الجمعة</option>
                          </>
                        );
                      })()}
                    </select>
                    <Users className="absolute left-3.5 text-slate-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white font-black py-3.5 sm:py-4 rounded-xl shadow-lg shadow-amber-500/25 transition active:scale-[0.99] text-base sm:text-lg tracking-wide flex justify-center items-center gap-2 cursor-pointer mt-2"
              >
                {isSubmittingLogin ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    جاري إنشاء الحساب...
                  </>
                ) : (
                  <>
                    إنشاء حساب جديد <BookOpen className="w-5 h-5 text-white" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Optional APK Download Link for Web Browsers */}
        {!isAndroidWebView() && (
          <div className="mt-6 text-center z-10 relative w-full px-4">
            <a
              href="https://github.com/U-WWW/el5emya2e-apk/releases/download/apk/default.apk"
              target="_blank"
              rel="noopener noreferrer"
              download="Elkhemiaey.apk"
              className="inline-flex flex-wrap justify-center items-center gap-2 bg-white/95 hover:bg-amber-50 border border-amber-300 text-amber-900 px-5 py-3 rounded-2xl shadow-lg backdrop-blur-md transition-all duration-300 transform hover:scale-105 active:scale-95 font-bold text-xs sm:text-sm mx-auto"
            >
              <Smartphone className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
              <span className="text-center">تحميل تطبيق الأندرويد الرسمي (APK)</span>
              <Download className="w-4 h-4 text-emerald-600 shrink-0" />
            </a>
          </div>
        )}

        {/* CELEBRATORY REGISTER SUCCESS MODAL */}
        <AnimatePresence>
          {newlyRegisteredStudent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            >
              <div className="w-full max-w-xl bg-white border-2 border-amber-300 shadow-2xl rounded-3xl p-5 sm:p-8 relative text-center">
                <div className="inline-block bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black px-6 py-1.5 rounded-full text-sm sm:text-base shadow-md mb-4">
                  مرحباً بك في المنصة 📖
                </div>

                <div className="mb-5">
                  <div className="inline-flex p-3.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-600 mb-3 shadow-inner">
                    <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    مبارك لك يا بطل لغة الضاد!
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                    تم إنشاء حسابك في منصة الأستاذ أحمد تامر للغة العربية بنجاح. يرجى الاحتفاظ ببياناتك بعناية:
                  </p>
                </div>

                {/* THE HISTORICAL DOCUMENT DISPLAY */}
                <div className="bg-amber-50/90 text-slate-900 p-4 sm:p-6 rounded-2xl border border-amber-200 shadow-inner text-right space-y-3 mb-5 relative overflow-hidden">
                  <div className="border-b border-amber-200 pb-2 mb-2 flex items-center justify-between">
                    <span className="font-black text-xs uppercase tracking-wider text-amber-800">بطاقة هوية طالب لغة الضاد</span>
                    <span className="text-xs font-black bg-amber-600 text-white px-2.5 py-0.5 rounded-full">طالب مسجل</span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block text-slate-500">اسم الطالب</span>
                      <span className="text-base sm:text-lg font-black block text-slate-900">{newlyRegisteredStudent.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-slate-500">كود الدخول</span>
                        <span className="text-lg sm:text-xl font-mono font-black block text-amber-700 tracking-wider">
                          {newlyRegisteredStudent.code}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-slate-500">كلمة المرور</span>
                        <span className="text-lg sm:text-xl font-mono font-black block text-slate-900 tracking-wider">
                          {newlyRegisteredStudent.password}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-slate-500">الصف الدراسي</span>
                        <span className="text-xs sm:text-sm font-black block text-slate-800">{newlyRegisteredStudent.className}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-slate-500">المجموعة</span>
                        <span className="text-xs sm:text-sm font-black block text-slate-800">{newlyRegisteredStudent.groupName}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl mb-5 text-amber-900 text-xs font-bold leading-relaxed text-right">
                  ⚠️ **تنبيه هام جداً:** احفظ كلمة المرور في مكان آمن أو التقط لقطة شاشة (Screenshot). كلمة المرور هي وسيلتك الحصرية لتسجيل الدخول إلى حسابك!
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`الاسم: ${newlyRegisteredStudent.name}\nكود الدخول: ${newlyRegisteredStudent.code}\nكلمة المرور: ${newlyRegisteredStudent.password}`);
                      alert("تم نسخ بيانات الدخول بنجاح!");
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-black py-3 rounded-xl transition text-sm"
                  >
                    نسخ البيانات 📋
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Login immediately
                      localStorage.setItem('jamal_student', JSON.stringify(newlyRegisteredStudent));
                      setStudent(newlyRegisteredStudent);
                      setSelectedAvatar('spiderman');
                      setNewlyRegisteredStudent(null);
                      setAuthMode('login');
                      fetchStudentData(newlyRegisteredStudent.code, newlyRegisteredStudent.className);
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black py-3 rounded-xl shadow-md transition text-sm"
                  >
                    الدخول للمنصة 📜
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LEGACY STUDENT SECURITY PASSWORD ASSIGNMENT UPGRADE MODAL */}
        <AnimatePresence>
          {legacyStudentNeedPassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/95 backdrop-blur-lg flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-black border border-amber-500/50 shadow-2xl rounded-3xl p-6 md:p-8 text-center">
                <div className="inline-flex p-4 rounded-full bg-amber-500/10 border-2 border-amber-500 text-amber-400 mb-4 animate-pulse">
                  <Shield className="w-12 h-12" />
                </div>
                
                <h3 className="text-2xl font-black text-stone-100 italic mb-2">SECURITY PROTOCOLS INITIATED</h3>
                <p className="text-sm font-bold text-gray-400 leading-relaxed mb-6">
                  مرحباً بك مجدداً يا بطل الأكاديمية العريق! نظراً لتحديث أنظمة الأمان بالأكاديمية المشفرة وتأمين بيانات الطلاب، يرجى تعيين **كلمة مرور خاصة بك** الآن لتتمكن من حماية حسابك ودرجاتك والولوج بانتظام.
                </p>

                <form onSubmit={handleUpgradeLegacyStudentPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-amber-500 uppercase tracking-wider mb-2 text-right">
                      Define Secure Password (اختر كلمة مرور حسابك)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="أدخل كلمة مرور قوية سهلة الحفظ"
                        className="w-full bg-white/5 border-2 border-gray-700 focus:border-amber-500 text-stone-100 rounded-xl p-4 font-bold outline-none transition text-right"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <span className="absolute left-4 top-4 text-gray-500">🔑</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-100 font-black py-4 rounded-xl shadow-lg transition uppercase text-lg"
                  >
                    حفظ كلمة المرور والدخول 🚀
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  
  return (
    <div className="min-h-screen text-stone-100 flex flex-col relative z-10 font-sans">
      
      {/* Elegant Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-amber-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            <div className="flex items-center gap-6">
              {/* Logo / Brand */}
              <div className="flex flex-col">
                <span className="font-black text-xl md:text-2xl tracking-widest text-amber-600 uppercase">
                  أ. أحمد تامر
                </span>
                <span className="text-[10px] md:text-xs font-bold text-amber-700/80 tracking-widest uppercase">
                  لغة الضاد والفصاحة
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2 bg-amber-50/80 p-1.5 rounded-2xl border border-amber-200/60">
              {[
                { id: 'home', label: 'الرئيسية', icon: Home },
                { id: 'friday', label: 'المساعد الذكي (AI)', icon: Sparkles },
                { id: 'games', label: 'الألعاب التعليمية', icon: Gamepad2 },
                { id: 'alchemiya', label: 'تقييم السنتر', icon: GraduationCap },
                { id: 'missions', label: 'المهام والاختبارات', icon: BookOpen },
                { id: 'lectures', label: 'المحاضرات', icon: Play },
                { id: 'community', label: 'مجتمع الطلاب', icon: Users },
                { id: 'profile', label: 'ملفي', icon: User }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black shadow-md shadow-amber-500/25 scale-105' 
                        : 'text-stone-700 hover:text-amber-700 hover:bg-white/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-white border border-amber-200 px-4 py-2 rounded-xl shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-sm font-bold text-stone-800">{student.code}</span>
              </div>
              <button 
                onClick={onLogout}
                className="bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white p-3 rounded-xl transition shadow-sm"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation (Bottom) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-amber-200/60 pb-safe shadow-lg">
        <div className="flex justify-around items-center p-2 overflow-x-auto">
          {[
            { id: 'home', label: 'الرئيسية', icon: Home },
            { id: 'friday', label: 'ذكاء AI', icon: Sparkles },
            { id: 'games', label: 'ألعاب', icon: Gamepad2 },
            { id: 'alchemiya', label: 'السنتر', icon: GraduationCap },
            { id: 'missions', label: 'مهام', icon: BookOpen },
            { id: 'lectures', label: 'محاضرات', icon: Play },
            { id: 'profile', label: 'ملفي', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-16 ${
                  isActive ? 'text-amber-600 scale-110 font-bold' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'drop-shadow-sm' : ''}`} />
                <span className="text-[10px] font-black">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 lg:pb-8 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">

        
        {/* Active Exam Overlay Modal */}
        <AnimatePresence>
          {activeQuiz && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/95 backdrop-blur-lg flex items-center justify-center p-4"
            >
              <div className="w-full max-w-4xl bg-stone-950 border border-amber-600/50 shadow-2xl rounded-2xl p-6 md:p-8 relative">
                
                {/* Header of Active Exam */}
                <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-6">
                  <div>
                    <span className="text-xs font-black bg-amber-600 text-stone-100 px-2 py-1 rounded">
                      الاختبار الحالي
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black text-stone-100 mt-2 italic uppercase">
                      {activeQuiz.quiz_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 bg-amber-950/40 border border-amber-900/60 text-rose-400 px-4 py-2 rounded-xl font-mono text-lg font-black">
                    <Clock className="w-5 h-5 animate-pulse" />
                    {formatTimer(quizTimer)}
                  </div>
                </div>

                {!examSubmittedResult ? (
                  <>
                    {/* Security Lock Notice */}
                    <div className="mb-6 bg-amber-950/60 border border-amber-500/40 text-amber-300 p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-inner">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
                        الاختبار مقفول وقيد التنفيذ — يُحسب الوقت بانتظام ولن يتوقف عند إغلاق أو تحديث الصفحة.
                      </span>
                      <span className="bg-rose-950/80 border border-rose-800 text-rose-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                        لا يمكن الإلغاء 🔒
                      </span>
                    </div>

                    {/* Live Progress Bar */}
                    <div className="w-full bg-stone-950 h-3 border border-gray-800 rounded-full mb-8 overflow-hidden">
                      <div 
                        className="bg-amber-600 h-full transition-all duration-300"
                        style={{ width: `${(Object.keys(selectedAnswers).length / quizQuestions.length) * 100}%` }}
                      />
                    </div>

                    {/* Questions loop */}
                    <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {quizQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white/5 border border-gray-800 p-6 rounded-xl relative">
                          <span className="absolute top-4 left-4 font-mono font-black text-gray-600 text-lg">
                            Q{idx + 1}
                          </span>
                          <p className="font-bold text-lg md:text-xl text-stone-100 mb-6 pr-12 text-right">
                            {q.question_text}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { label: 'A', text: q.choice_a },
                              { label: 'B', text: q.choice_b },
                              { label: 'C', text: q.choice_c },
                              { label: 'D', text: q.choice_d }
                            ].map(choice => (
                              <button
                                key={choice.label}
                                onClick={() => handleSelectAnswer(q.id, choice.label)}
                                className={`text-right p-4 rounded-xl border-2 font-bold transition flex items-center justify-between ${
                                  selectedAnswers[q.id] === choice.label
                                    ? 'bg-rose-950/30 border-amber-600 text-stone-100'
                                    : 'bg-stone-950/40 border-gray-800 hover:border-gray-700 text-gray-300'
                                }`}
                              >
                                <span className="text-sm font-semibold">{choice.text}</span>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                  selectedAnswers[q.id] === choice.label
                                    ? 'bg-amber-600 text-stone-100'
                                    : 'bg-white/5 text-gray-500'
                                }`}>
                                  {choice.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-800 flex justify-end">
                      <button
                        onClick={submitActiveQuiz}
                        disabled={isSubmittingExam}
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 text-stone-100 font-black px-8 py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-lg shadow-[0_4px_15px_rgba(226,54,54,0.4)]"
                      >
                        {isSubmittingExam ? 'جاري الإرسال...' : 'إنهاء المهمة وتسليم الإجابات 🏁'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <div className="inline-flex p-4 rounded-full bg-green-950/50 border-2 border-green-500 text-green-400 mb-6">
                      <Trophy className="w-16 h-16 animate-bounce" />
                    </div>

                    <h4 className="text-4xl font-black text-stone-100 italic mb-2 uppercase">
                      VICTORY ACQUIRED!
                    </h4>
                    <p className="text-lg text-gray-400 font-bold mb-6">
                      تم تسجيل وحفظ نتيجتك بنجاح في قاعدة بيانات الأكاديمية المشفرة
                    </p>

                    {/* QR and Score display */}
                    <div className="inline-block bg-white p-4 rounded-2xl mb-6 border border-stone-800 shadow-xl">
                      <img src={examSubmittedResult.qrCodeUrl} alt="Verification QR" className="w-48 h-48 mx-auto" referrerPolicy="no-referrer" />
                      <span className="block mt-2 font-mono text-black font-black text-lg">
                        CODE: {examSubmittedResult.code}
                      </span>
                    </div>

                    <div className="text-5xl font-black text-amber-600 mb-6 font-mono">
                      {examSubmittedResult.score} / {examSubmittedResult.total} PTS
                    </div>

                    <button
                      onClick={() => {
                        setActiveQuiz(null);
                        setExamSubmittedResult(null);
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-stone-100 font-black px-10 py-4 rounded-xl transition text-lg"
                    >
                      العودة للرئيسية
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Player overlay */}
        <AnimatePresence>
          {activeVideo && (
            <VideoPlayerModal 
              video={activeVideo} 
              onClose={() => setActiveVideo(null)} 
            />
          )}
        </AnimatePresence>

        
        {/* Dashboard layout with 2 grid columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          
          {/* Column 1: Profile & Progress HUD */}
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            
            {/* Monumental teacher portrait */}
            <div className="bg-stone-900/80 backdrop-blur-md border border-stone-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-transparent pointer-events-none" />
              
              <div className="text-center relative z-10">
                <span className="text-xs font-black text-amber-500 bg-amber-950/40 border border-amber-900/60 px-4 py-1.5 rounded-full uppercase tracking-widest inline-block mb-6 shadow-lg">
                  {teacherSettings.badgeText || 'مؤسس الأكاديمية'}
                </span>
                
                <div className="w-40 h-40 rounded-full border-4 border-stone-800 mx-auto relative p-1 mb-6 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                  <div className="w-full h-full rounded-full border-2 border-dashed border-amber-500/50 p-1 overflow-hidden">
                    {!teacherAvatarError ? (
                      <img
                        src={teacherSettings.imageUrl || DEFAULT_TEACHER_IMAGE}
                        alt={teacherSettings.name || "Teacher Portrait"}
                        onError={() => setTeacherAvatarError(true)}
                        className="w-full h-full rounded-full object-cover transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-stone-800 flex items-center justify-center text-stone-400 text-5xl font-black italic">
                        {teacherSettings.name ? teacherSettings.name.charAt(0) : 'M'}
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-2xl font-black tracking-tight text-white mb-2">
                  {teacherSettings.name || 'الأستاذ أحمد تامر'}
                </h3>
                <p className="text-sm font-bold text-amber-400/80 mb-6">
                  {teacherSettings.subtitle || 'خبير تدريس مادة اللغة العربية'}
                </p>
                
                {/* Motivational Quote */}
                <div className="bg-stone-950/50 border border-stone-800 p-5 rounded-2xl text-center relative">
                  <span className="absolute -top-3 right-4 text-3xl text-amber-900">"</span>
                  <p className="text-xs font-bold text-stone-300 leading-relaxed text-right relative z-10">
                    {teacherSettings.quote || 'لغة الضاد بحرٌ من الفصاحة والبيان، وقواعد النحو مفتاح الفهم والإتقان.'}
                  </p>
                </div>
                
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="mt-6 w-full flex justify-center items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-bold py-4 rounded-2xl transition shadow-lg group-hover:border-amber-500/50 group-hover:text-amber-400"
                >
                  <MessageCircle className="w-5 h-5" /> مراسلة الأستاذ
                </button>
              </div>
            </div>

            {/* Teacher Message Modal */}
            <AnimatePresence>
              {showMessageModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-stone-900 border border-stone-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-rose-600" />
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-white">صندوق الرسائل</h3>
                      <button onClick={() => setShowMessageModal(false)} className="text-stone-500 hover:text-white bg-stone-800 p-2 rounded-full transition">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={handleSendTeacherMessage} className="space-y-5 text-right">
                      <textarea
                        required
                        className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-2xl p-5 text-stone-100 resize-none font-medium placeholder-stone-600 outline-none transition"
                        rows={5}
                        placeholder="اكتب رسالتك أو استفسارك هنا..."
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                      />
                      <div className="flex items-center gap-3 justify-end bg-stone-950 border border-stone-800 p-4 rounded-2xl">
                        <label htmlFor="anonymous" className="text-sm text-stone-400 font-bold cursor-pointer select-none">إرسال كرسالة مجهولة</label>
                        <input
                          id="anonymous"
                          type="checkbox"
                          className="w-5 h-5 accent-amber-600 cursor-pointer rounded bg-stone-800 border-stone-700"
                          checked={isAnonymousMessage}
                          onChange={e => setIsAnonymousMessage(e.target.checked)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSendingMessage}
                        className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black py-4 rounded-2xl text-lg transition shadow-lg"
                      >
                        {isSendingMessage ? 'جاري الإرسال...' : 'إرسال'}
                      </button>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Student statistics panel */}
            <div className="bg-stone-900/80 backdrop-blur-md border border-stone-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex justify-between items-center border-b border-stone-800 pb-4">
                <h4 className="font-black text-stone-300 text-sm tracking-widest uppercase">
                  رمز الطالب / فارس لغة الضاد 📖
                </h4>
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              
              {/* Dynamic Chemist Avatar Icon Frame */}
              <div className="flex items-center gap-5 bg-stone-950/50 border border-stone-800 p-4 rounded-2xl">
                <div className="w-16 h-16 rounded-full border-2 border-cyan-400 overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center bg-cyan-950">
                  <span className="text-3xl">
                    {selectedAvatar === 'ironman' ? '⚛️' :
                     selectedAvatar === 'captainamerica' ? '🔬' :
                     selectedAvatar === 'thor' ? '⚗️' :
                     selectedAvatar === 'blackwidow' ? '🧬' :
                     selectedAvatar === 'hulk' ? '💥' :
                     selectedAvatar === 'doctorstrange' ? '🔮' :
                     '🧪'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-amber-400 block mb-1">الرمز اللغوي الحالي</span>
                  <span className="text-base font-black text-white block">
                    {selectedAvatar === 'ironman' ? 'سيبويه (إمام النحاة) 📜' :
                     selectedAvatar === 'captainamerica' ? 'الخليل بن أحمد الفراهيدي (واضع العروض) ✍️' :
                     selectedAvatar === 'thor' ? 'أبو الطيب المتنبي (شاعر العرب) ✒️' :
                     selectedAvatar === 'blackwidow' ? 'الجاحظ (عميد البيان) 📖' :
                     selectedAvatar === 'hulk' ? 'أحمد شوقي (أمير الشعراء) 👑' :
                     selectedAvatar === 'doctorstrange' ? 'ابن جني (عالم فقه اللغة) 🔮' :
                     'ابن آجروم (صاحب الآجرومية) 📜'}
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Display */}
            <div className="bg-stone-900/80 backdrop-blur-md border border-stone-800 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center border-b border-stone-800 pb-4 mb-5">
                <h4 className="font-black text-stone-300 text-sm tracking-widest uppercase">
                  الرتبة العسكرية / العلمية
                </h4>
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex items-center gap-5 bg-stone-950/50 border border-stone-800 p-4 rounded-2xl">
                <div className="p-4 bg-amber-950/30 border border-amber-900/50 rounded-2xl text-amber-400 font-sans font-black text-3xl shadow-inner">
                  🎖️
                </div>
                <div>
                  <span className={`text-lg font-black ${currentLevelInfo.color} block mb-1`}>
                    {currentLevelInfo.badge}
                  </span>
                  <span className="text-xs font-bold text-stone-400 block leading-relaxed">
                    {currentLevelInfo.desc}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Column 2 & 3: Content area with custom Tabs */}
          <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">

          <div className="lg:col-span-2 space-y-6">
            
            {/* Tab view renders */}
            <div>
              
              {activeTab === 'home' && (
                <div className="space-y-8">
                  
                  {/* Majestic Hero Banner */}
                  <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl group min-h-[400px] flex items-end">
                    <div className="absolute inset-0 bg-stone-950">
                      <img 
                        src={heroSettings.imageUrl || DEFAULT_HERO_IMAGE} 
                        alt="Hero Banner" 
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000 ease-in-out"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_HERO_IMAGE;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent"></div>
                    </div>
                    
                    <div className="relative z-10 p-8 md:p-12 w-full text-right">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                      >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-amber-600/20 border border-amber-500/50 text-amber-400 font-bold text-xs tracking-widest mb-4 backdrop-blur-sm">
                          {heroSettings.badgeText}
                        </span>
                        <h2 
                          className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight"
                          dangerouslySetInnerHTML={{ __html: heroSettings.mainTitle }}
                        >
                        </h2>
                        <p className="text-lg md:text-xl text-stone-300 max-w-2xl font-medium leading-relaxed ml-auto">
                          {heroSettings.description}
                        </p>
                      </motion.div>
                    </div>
                  </div>

                  {/* Alchemiya Evaluation Quick Access Card */}
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setActiveTab('alchemiya')}
                    className="cursor-pointer bg-gradient-to-r from-cyan-950/80 via-slate-900 to-emerald-950/80 border-2 border-cyan-500/50 hover:border-cyan-400 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all group"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all"></div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 text-right">
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-cyan-500/20 border border-cyan-400/40 rounded-2xl text-cyan-300 shadow-inner group-hover:scale-110 transition-transform">
                          <GraduationCap className="w-10 h-10" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black bg-cyan-500 text-slate-950 px-3 py-0.5 rounded-full uppercase tracking-wider">
                              جديد - نظام التقييم
                            </span>
                            <span className="text-xs font-bold text-cyan-400 animate-pulse">
                              واجهة الطالب (لغة الضاد) 📖
                            </span>
                          </div>
                          <h3 className="text-2xl font-black text-white">
                            تقارير درجات الطالب والنسب المئوية والغياب
                          </h3>
                          <p className="text-sm font-medium text-slate-300 mt-1">
                            تتبع الأداء الشهرية والمهام الإضافية والنقاط والمعدل مع إعادة حساب التقييمات تلقائياً
                          </p>
                        </div>
                      </div>

                      <button className="whitespace-nowrap px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition shadow-lg flex items-center gap-2 text-base">
                        افتح الواجهة الآن 👈
                      </button>
                    </div>
                  </motion.div>

                  {/* AI Assistant Quick Access Card */}
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setActiveTab('friday')}
                    className="cursor-pointer bg-gradient-to-r from-amber-950/80 via-stone-900 to-sky-950/80 border-2 border-amber-500/50 hover:border-amber-400 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all group"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 text-right">
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-amber-300 shadow-inner group-hover:scale-110 transition-transform">
                          <Sparkles className="w-10 h-10 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black bg-amber-500 text-slate-950 px-3 py-0.5 rounded-full uppercase tracking-wider">
                              الذكاء الاصطناعي (AI) 🤖
                            </span>
                            <span className="text-xs font-bold text-amber-400">
                              مساعد لغة الضاد الفائق 📖
                            </span>
                          </div>
                          <h3 className="text-2xl font-black text-white">
                            اسأل المساعد اللغوي والنحوي الذكي
                          </h3>
                          <p className="text-sm font-medium text-stone-300 mt-1">
                            إعراب الجمل، شرح القواعد النحوية، البلاغة، استخراج مواطن الجمال والإجابة عن جميع أسئلتك فوراً!
                          </p>
                        </div>
                      </div>

                      <button className="whitespace-nowrap px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition shadow-lg flex items-center gap-2 text-base">
                        بدء المحادثة الآن 👈
                      </button>
                    </div>
                  </motion.div>

                  {/* Majestic Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-stone-900/80 backdrop-blur-md border border-stone-800 p-8 rounded-3xl text-center relative overflow-hidden group shadow-xl"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/10 rounded-full blur-3xl group-hover:bg-amber-600/20 transition-colors"></div>
                      <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                      <span className="text-sm font-black text-stone-400 uppercase tracking-widest block mb-2">إنجازاتك</span>
                      <span className="text-4xl font-black text-white block">
                        {studentResults.length}
                      </span>
                    </motion.div>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-stone-900/80 backdrop-blur-md border border-stone-800 p-8 rounded-3xl text-center relative overflow-hidden group shadow-xl"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-3xl group-hover:bg-rose-600/20 transition-colors"></div>
                      <BookOpen className="w-10 h-10 text-rose-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(243,33,110,0.5)]" />
                      <span className="text-sm font-black text-stone-400 uppercase tracking-widest block mb-2">المهام المتاحة</span>
                      <span className="text-4xl font-black text-white block">
                        {quizzes.length}
                      </span>
                    </motion.div>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-stone-900/80 backdrop-blur-md border border-stone-800 p-8 rounded-3xl text-center relative overflow-hidden group shadow-xl"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl group-hover:bg-emerald-600/20 transition-colors"></div>
                      <Play className="w-10 h-10 text-emerald-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                      <span className="text-sm font-black text-stone-400 uppercase tracking-widest block mb-2">المحاضرات</span>
                      <span className="text-4xl font-black text-white block">
                        {videos.length}
                      </span>
                    </motion.div>
                  </div>

                  {/* Educational Games Feature Banner */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setActiveTab('games')}
                    className="cursor-pointer bg-gradient-to-r from-teal-900/90 via-emerald-900/90 to-cyan-950 border-2 border-teal-500/40 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 group"
                  >
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl group-hover:bg-teal-400/30 transition-all pointer-events-none" />
                    
                    <div className="text-right space-y-2 z-10">
                      <span className="inline-flex items-center gap-1.5 bg-teal-400/20 border border-teal-400/40 text-teal-300 font-extrabold text-xs px-3 py-1 rounded-full">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> قسم جديد مميز
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                        قسم الألعاب التعليمية 🎮
                      </h3>
                      <p className="text-sm font-bold text-teal-200 max-w-xl leading-relaxed">
                        جرب تحدي فرز الألوان 🧪 ولغز فيزياء وتدفق المياه 💧 لتطوير مهارات التفكير العلمي والحل المنطقي للألغاز!
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('games')}
                      className="z-10 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-500/30 flex items-center gap-2 text-base shrink-0 transition"
                    >
                      <Sparkles className="w-5 h-5 fill-slate-950" />
                      <span>دخول قسم الألعاب</span>
                    </button>
                  </motion.div>

                  {/* Past attempts log */}

                  <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                    <h4 className="font-sans font-black text-stone-100 text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      سجل الاختبارات
                    </h4>

                    {studentResults.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 font-bold text-sm">
                        لم تقم بأداء أي مهام بعد. انطلق إلى قطاع الاختبارات لإثبات قوتك!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentResults.map((r: any, idx) => (
                          <div key={idx} className="bg-white/5 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                            <div className="text-right">
                              <span className="text-md font-bold text-stone-100 block">{r.quiz_name}</span>
                              <span className="text-xs text-gray-500 block mt-1">
                                {new Date(r.submittedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setViewingResultDetails(r)}
                                className="bg-amber-600/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" /> التصحيح والتقرير
                              </button>
                              <span className="bg-rose-950/40 border border-rose-900/60 text-rose-400 px-4 py-2 rounded-xl font-mono font-black">
                                {r.score} / {r.total_questions} PTS
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {activeTab === 'missions' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-sans font-black text-stone-100 text-2xl tracking-wider">
                      الاختبار الحاليS (EXAMS)
                    </h4>
                  </div>

                  {quizzes.length === 0 ? (
                    <div className="bg-stone-900 border border-stone-800 p-12 rounded-2xl text-center text-gray-500 font-bold">
                      لا توجد اختبارات نشطة في الوقت الحالي لصفك الدراسي. استرخِ وتأهب للمهام القادمة!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {quizzes.map((quiz: any) => {
                        const alreadyDone = studentResults.some(r => r.quiz_id === quiz.id);
                        return (
                          <div key={quiz.id} className="bg-stone-900 border border-stone-800 hover:border-amber-500 p-6 rounded-2xl transition">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black bg-sky-950 text-amber-500 border border-sky-800 px-2 py-1 rounded">
                                EXAM PORTAL
                              </span>
                              {quiz.duration_minutes && (
                                <span className="text-xs font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-900/60 px-2.5 py-1 rounded flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {quiz.duration_minutes} دقيقة
                                </span>
                              )}
                            </div>

                            <h5 className="text-xl font-black text-stone-100 mb-2">{quiz.quiz_name}</h5>
                            <span className="text-xs font-bold text-gray-500 block mb-6">{quiz.class_name}</span>

                            <button
                              onClick={() => launchExam(quiz)}
                              className={`w-full py-3.5 rounded-xl font-black transition text-center flex justify-center items-center gap-2 ${
                                alreadyDone
                                  ? 'bg-amber-600/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400'
                                  : 'bg-amber-600 hover:bg-amber-500 text-stone-100 shadow-md'
                              }`}
                            >
                              {alreadyDone ? (
                                <>عرض التصحيح والأخطاء <Eye className="w-4 h-4" /></>
                              ) : (
                                <>LAUNCH EXAM <Zap className="w-4 h-4" /></>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'lectures' && (
                <div className="space-y-6">
                  <h4 className="font-sans font-black text-stone-100 text-2xl tracking-wider">
                    TRAINING GROUND (LECTURES)
                  </h4>

                  {videos.length === 0 ? (
                    <div className="bg-stone-900 border border-stone-800 p-12 rounded-2xl text-center text-gray-500 font-bold">
                      لا توجد محاضرات تدريبية مرفوعة حالياً لصفك الدراسي.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {videos.map((video: any) => (
                        <div key={video.id} className="bg-stone-900 border border-stone-800 hover:border-amber-600 p-5 rounded-2xl transition flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-black bg-rose-950 text-rose-400 border border-rose-900/60 px-2.5 py-1 rounded mb-3 inline-block uppercase font-mono">
                              فيديو المحاضرة
                            </span>
                            <h5 className="text-lg font-black text-stone-100 mb-4 line-clamp-2">{video.title}</h5>
                          </div>
                          <button
                            onClick={() => setActiveVideo(video)}
                            className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-black transition flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4 fill-black text-black" /> تشغيل المحاضرة
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'friday' && (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl h-[65vh] flex flex-col overflow-hidden">
                  
                  {/* Chat Assistant Header */}
                  <div className="bg-stone-950 p-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-950/50 border border-amber-800 text-amber-400 rounded-xl">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-md font-black text-stone-100 block">المساعد اللغوي الذكي (لغة الضاد) 📖</span>
                        <span className="text-xs font-bold text-amber-400 block mt-0.5">مساعد اللغة العربية لمنصة الأستاذ أحمد تامر</span>
                      </div>
                    </div>
                  </div>

                  {/* Messages container */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {chatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 max-w-[85%] ${
                          msg.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'
                        }`}
                      >
                        <div className={`p-4 rounded-2xl font-bold leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-amber-600 text-stone-100 rounded-tr-none text-right' 
                            : 'bg-white/5 border border-gray-800 text-gray-200 rounded-tl-none text-right'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex gap-3 max-w-[80%] ml-auto">
                        <div className="bg-white/5 border border-gray-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce"></span>
                          <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce delay-150"></span>
                          <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-bounce delay-300"></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input form */}
                  <form onSubmit={handleSendChatMessage} className="p-4 bg-stone-950 border-t border-gray-800 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3 rounded-xl outline-none transition text-right"
                      placeholder="اسأل الذكاء الاصطناعي عن أي معادلة، تفاعل، تجربة، أو حل سؤال..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="bg-sky-600 hover:bg-sky-500 p-3 rounded-xl text-stone-100 font-black transition flex items-center justify-center shadow-lg"
                    >
                      <Send className="w-5 h-5 transform rotate-180" />
                    </button>
                  </form>

                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-8">
                  {/* SCIENTIST AVATAR SELECTION */}
                  <div className="bg-stone-900 border border-stone-800 shadow-xl p-6 rounded-2xl">
                    <div className="border-b-2 border-gray-800 pb-3 mb-4 text-right">
                      <h4 className="font-sans font-black text-stone-100 text-xl tracking-wider">
                        اختر رمزك المفضل من أئمة وعلماء اللغة العربية 📖
                      </h4>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        تغيير الرمز يمنحك طابعاً لغوياً وأدبياً فريداً في المنصة وصحيفة الإنجازات
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'spiderman', emoji: '📜', nameAr: 'ابن آجروم', color: 'border-amber-500 hover:border-amber-400 bg-amber-950/20' },
                        { id: 'ironman', emoji: '📜', nameAr: 'سيبويه', color: 'border-cyan-500 hover:border-cyan-400 bg-cyan-950/20' },
                        { id: 'captainamerica', emoji: '✍️', nameAr: 'الخليل بن أحمد', color: 'border-blue-500 hover:border-blue-400 bg-blue-950/20' },
                        { id: 'thor', emoji: '✒️', nameAr: 'المتنبي', color: 'border-emerald-500 hover:border-emerald-400 bg-emerald-950/20' },
                        { id: 'blackwidow', emoji: '📖', nameAr: 'الجاحظ', color: 'border-purple-500 hover:border-purple-400 bg-purple-950/20' },
                        { id: 'hulk', emoji: '👑', nameAr: 'أحمد شوقي', color: 'border-rose-500 hover:border-rose-400 bg-rose-950/20' },
                        { id: 'doctorstrange', emoji: '🔮', nameAr: 'ابن جني', color: 'border-amber-600 hover:border-amber-500 bg-amber-950/20' }
                      ].map(hero => (
                        <button
                          key={hero.id}
                          onClick={() => handleSelectAvatar(hero.id)}
                          className={`p-3 rounded-xl border-2 font-black transition flex flex-col items-center gap-1.5 ${hero.color} ${
                            selectedAvatar === hero.id
                              ? 'bg-amber-600/30 border-amber-600 scale-105 shadow-lg shadow-cyan-500/10'
                              : 'bg-stone-950/40 border-gray-800 text-gray-400'
                          }`}
                        >
                          <span className="text-3xl">{hero.emoji}</span>
                          <span className="text-xs text-stone-100 mt-1">{hero.nameAr}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PLATFORM THEME SELECTION */}
                  <div className="bg-stone-900 border border-stone-800 shadow-xl p-6 rounded-2xl lg:hidden">
                    <div className="border-b-2 border-gray-800 pb-3 mb-4 text-right">
                      <h4 className="font-sans font-black text-stone-100 text-xl tracking-wider">
                        اختر الطابع البصري للصرح (Theme)
                      </h4>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        اختر السمة البصرية والخلفية المناسبة لدراستك
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => onThemeChange?.('khemiai_dark')} className={`p-4 rounded-xl border-2 font-black transition flex flex-col justify-center items-center gap-2 ${currentTheme === 'khemiai_dark' ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-500'}`}><Palette className="w-8 h-8"/>صرح لغة الضاد</button>
                      <button onClick={() => onThemeChange?.('atomic_glow')} className={`p-4 rounded-xl border-2 font-black transition flex flex-col justify-center items-center gap-2 ${currentTheme === 'atomic_glow' ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-500'}`}><Sparkles className="w-8 h-8"/>الوهج الذهبي</button>
                      <button onClick={() => onThemeChange?.('deep_emerald')} className={`p-4 rounded-xl border-2 font-black transition flex flex-col justify-center items-center gap-2 ${currentTheme === 'deep_emerald' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-500'}`}><Cpu className="w-8 h-8"/>الزمرد الملكي</button>
                    </div>
                  </div>

                  {/* ARABIC STATS GRID */}
                  <div className="bg-stone-900 border border-stone-800 shadow-xl p-6 rounded-2xl">
                    <div className="border-b-2 border-gray-800 pb-3 mb-6 text-right">
                      <span className="text-xs font-black bg-amber-950 text-amber-400 border border-amber-800 px-3 py-1.5 rounded uppercase font-mono inline-block">
                        LEVEL 1 SCHOLAR
                      </span>
                      <h4 className="font-sans font-black text-stone-100 text-xl tracking-wider mt-2">
                        مؤشرات تفوقك اللغوي الستة 📊
                      </h4>
                      <p className="text-xs font-bold text-gray-500">
                        مستوى تفوقك الأكاديمي يتم حسابه بدقة بناءً على تفاعلك وأدائك في اختبارات ومهام اللغة العربية
                      </p>
                    </div>

                    {/* Six Powers Grid */}
                    <div className="space-y-4">
                      {[
                        {
                          name: 'الإعراب وفهم القواعد النحوية 📜',
                          pct: Math.min(25 + (student.totalScore || 0) * 1.5, 98),
                          color: 'bg-amber-600',
                          icon: '📜'
                        },
                        {
                          name: 'البلاغة ومواطن الجمال ✍️',
                          pct: Math.min(30 + studentResults.length * 15, 95),
                          color: 'bg-amber-500',
                          icon: '✍️'
                        },
                        {
                          name: 'سرعة الإجابة وحل الاختبارات ⚡',
                          pct: studentResults.length > 0 ? 88 : 40,
                          color: 'bg-sky-500',
                          icon: '⚡'
                        },
                        {
                          name: 'الالتزام والمواظبة على الحصص 🛡️',
                          pct: Math.min(45 + studentResults.length * 8, 92),
                          color: 'bg-emerald-500',
                          icon: '🛡️'
                        },
                        {
                          name: 'المشاركة الفعالة في نقاشات الضاد 💬',
                          pct: 85,
                          color: 'bg-purple-500',
                          icon: '💬'
                        },
                        {
                          name: 'نسبة التفوق اللغوي العام 🏆',
                          pct: studentResults.length > 0 ? Math.round((studentResults.reduce((acc, r) => acc + (r.score / r.total_questions), 0) / studentResults.length) * 100) : 50,
                          color: 'bg-rose-500',
                          icon: '🏆'
                        }
                      ].map((power, idx) => (
                        <div key={idx} className="bg-stone-950/40 border border-gray-800/80 p-3 rounded-xl">
                          <div className="flex justify-between items-center mb-1.5 text-right">
                            <span className="text-xs font-black text-gray-400 font-mono">
                              {power.pct}% POW
                            </span>
                            <span className="text-xs font-black text-gray-200 flex items-center gap-1">
                              {power.icon} {power.name}
                            </span>
                          </div>
                          <div className="w-full bg-stone-950 h-3 rounded-full overflow-hidden p-[2px] border border-gray-800">
                            <div
                              className={`${power.color} h-full rounded-full transition-all duration-700 shadow-inner`}
                              style={{ width: `${power.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PAST EXAM RESULTS SHEET */}
                  <div className="bg-stone-900 border border-stone-800 shadow-xl p-6 rounded-2xl">
                    <div className="border-b-2 border-gray-800 pb-3 mb-6 text-right">
                      <h4 className="font-sans font-black text-stone-100 text-xl tracking-wider">
                        أرشيف الاختبارات (سجل درجاتك واختباراتك السابقة)
                      </h4>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        جميع نتائج الاختبارات التي سلمتها بنجاح للأستاذ أحمد تامر
                      </p>
                    </div>

                    {studentResults.length === 0 ? (
                      <div className="bg-stone-900 border border-stone-800/80 p-8 rounded-xl text-center text-gray-500 font-bold">
                        لم تخض أي اختبارات قتالية بعد! اذهب لعلامة تبويب "الاختبارات" لتسجيل انتصارك الأول.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {studentResults.map((r) => {
                          const percentage = Math.round((r.score / r.total_questions) * 100);
                          let reaction = 'CRASH! KEEP TRAINING 💥';
                          let reactionColor = 'bg-amber-950/40 text-amber-400 border-amber-900/60';
                          if (percentage >= 95) {
                            reaction = 'WHAM! UNSTOPPABLE FORCE 🌌';
                            reactionColor = 'bg-amber-950/40 text-amber-400 border-amber-900/60';
                          } else if (percentage >= 80) {
                            reaction = 'ممتاز! إنجاز تاريخي ⚡';
                            reactionColor = 'bg-cyan-950/40 text-sky-400 border-cyan-900/60';
                          } else if (percentage >= 60) {
                            reaction = 'BOOM! SOLID EFFORT 🔵';
                            reactionColor = 'bg-sky-950/40 text-amber-500 border-sky-800/60';
                          }
                          return (
                            <div key={r.id} className="bg-stone-950/40 border border-gray-800/80 p-4 rounded-xl flex flex-col md:flex-row justify-between items-end md:items-center gap-4 text-right">
                              <div className="w-full md:w-auto">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${reactionColor} block md:inline-block mb-2 md:mb-0`}>
                                  {reaction}
                                </span>
                                <h5 className="text-lg font-black text-stone-100 mt-1">{r.quiz_name}</h5>
                                <span className="text-xs text-gray-500 block mt-0.5">
                                  تم التسليم في: {new Date(r.submittedAt).toLocaleDateString('ar-EG')}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-xs text-gray-500 block mb-1">GRADE ACHIEVED</span>
                                <span className="text-2xl font-mono font-black text-amber-600">
                                  {r.score} / {r.total_questions} PTS
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'community' && (
                <div className="bg-stone-900 border border-stone-800 shadow-2xl rounded-2xl flex flex-col h-[70vh] overflow-hidden">
                  {/* Header */}
                  <div className="bg-stone-950/40 border-b border-gray-950 p-4 md:p-5 flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="text-right w-full md:w-auto">
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`inline-flex h-2 w-2 rounded-full ${isChatClosed ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                        <span className={`text-xs font-black tracking-wider ${isChatClosed ? 'text-red-400' : 'text-green-400'}`}>
                          {isChatClosed ? '🔒 الشات مغلق من قِبل الإدارة' : 'LIVE CHAT ONLINE (شات تفاعلي مباشر)'}
                        </span>
                      </div>
                      <h4 className="font-sans font-black text-stone-100 text-xl md:text-2xl mt-1 flex items-center gap-2 justify-end flex-wrap">
                        <span>شات مجتمع:</span>
                        <span className="text-amber-400">{student?.groupName || student?.group_name || 'مجموعة السنتر'}</span>
                        <span className="text-stone-400 text-sm">({student?.className})</span>
                        <span>🛡️</span>
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        تواصل، اسأل زملائك، وتبادل الملاحظات الدراسية مع أبطال دفعتك!
                      </p>
                    </div>

                    <div className="bg-rose-950/30 border border-rose-900/60 p-2.5 rounded-xl text-right max-w-sm">
                      <p className="text-[10px] md:text-xs font-bold text-cyan-300 leading-relaxed">
                        ⚠️ **نظام الحماية والأمان:** الشات مراقب ذاتياً. أي محاولة لكتابة كلمة بذيئة أو خارجة تؤدي لحظر الحساب تلقائياً وفورياً وإبلاغ الأستاذ أحمد تامر.
                      </p>
                    </div>
                  </div>

                  {/* Status Banner when Closed or Banned */}
                  {isChatClosed && (
                    <div className="bg-red-950/80 border-b border-red-800 p-3 text-center text-red-200 text-xs font-black flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4 text-red-400" />
                      <span>🔒 الشات مغلق حالياً بقرار من الأستاذ أحمد تامر. يمكنك قراءة الرسائل السابقة فقط.</span>
                    </div>
                  )}

                  {!isChatClosed && student?.is_chat_banned && (
                    <div className="bg-amber-950/90 border-b border-amber-800 p-3 text-center text-amber-200 text-xs font-black flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>🚨 تم حظر حسابك من إرسال الرسائل في الشات بقرار إداري.</span>
                    </div>
                  )}

                  {/* Message stream */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-950/20">
                    {communityMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-6">
                        <div className="bg-gray-900 p-4 rounded-full border border-gray-800">
                          <MessageCircle className="w-8 h-8 text-gray-500" />
                        </div>
                        <h5 className="text-gray-300 font-black text-lg">الشات نظيف تماماً! ✨</h5>
                        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                          كن أول من يشعل شعلة الحماس ويبدأ النقاش الدراسي مع زملائه في الدفعة بصورة راقية ومفيدة.
                        </p>
                      </div>
                    ) : (
                      communityMessages.map((msg, index) => {
                        const isMe = msg.student_code === student?.code;
                        const isAdminMsg = msg.is_admin || msg.student_code === 'ADMIN';

                        const avatarEmoji = isAdminMsg 
                          ? '👑'
                          : msg.avatar === 'spiderman' ? '🦁' :
                            msg.avatar === 'ironman' ? '👑' :
                            msg.avatar === 'captainamerica' ? '🛡️' :
                            msg.avatar === 'thor' ? '⚔️' :
                            msg.avatar === 'blackwidow' ? '💅' :
                            msg.avatar === 'hulk' ? '💪' :
                            msg.avatar === 'doctorstrange' ? '🔮' : '👤';

                        const bubbleBg = isAdminMsg
                          ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-stone-900 text-amber-200 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : isMe 
                            ? 'bg-amber-600 text-stone-100 border-amber-600 shadow-[2px_2px_0px_#000]' 
                            : 'bg-white/5 text-gray-100 border-gray-800 shadow-[2px_2px_0px_#000]';

                        return (
                          <div
                            key={msg.id || index}
                            className={`flex items-start gap-2.5 max-w-[85%] md:max-w-[70%] ${isAdminMsg ? 'mr-auto flex-row-reverse w-full' : isMe ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
                          >
                            <div className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center text-xl shadow-md shrink-0 ${
                              isAdminMsg ? 'bg-amber-950 border-amber-400' : 'bg-stone-950 border-gray-800'
                            }`}>
                              {avatarEmoji}
                            </div>
                            <div className="space-y-1 text-right flex-1">
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-[10px] text-gray-500 font-bold">
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <span className={`text-xs font-black flex items-center gap-1 ${
                                  isAdminMsg ? 'text-amber-400 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded-md' : isMe ? 'text-rose-400' : 'text-amber-500'
                                }`}>
                                  {msg.student_name}
                                </span>
                              </div>
                              <div className={`p-3 rounded-2xl text-sm leading-relaxed border ${bubbleBg}`}>
                                <p className="font-sans font-bold select-text whitespace-pre-wrap">{msg.text}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={communityEndRef} />
                  </div>

                  {/* Input panel */}
                  <form onSubmit={handleSendCommunityMessage} className="p-4 bg-stone-950 border-t border-gray-900 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-white/5 border-2 border-gray-800 focus:border-amber-600 text-stone-100 font-bold p-3 rounded-xl outline-none transition text-right placeholder-gray-500 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder={
                        isChatClosed 
                          ? '🔒 الشات مغلق حالياً بقرار من الأستاذ أحمد تامر...' 
                          : student?.is_chat_banned
                          ? '🚨 تم حظرك من كتابة الرسائل في الشات...'
                          : 'اكتب رسالة محترمة ومفيدة لزملائك في الدفعة...'
                      }
                      value={communityInput}
                      onChange={e => setCommunityInput(e.target.value)}
                      disabled={isSendingCommunityMessage || isChatClosed || !!student?.is_chat_banned}
                    />
                    <button
                      type="submit"
                      disabled={isSendingCommunityMessage || !communityInput.trim() || isChatClosed || !!student?.is_chat_banned}
                      className="bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 p-3 rounded-xl text-stone-100 font-black transition flex items-center justify-center shadow-lg shrink-0"
                    >
                      {isSendingCommunityMessage ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 transform rotate-180" />
                      )}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'alchemiya' && (
                <AlchemiyaStudentDashboard currentStudent={student} />
              )}

              {activeTab === 'games' && (
                <EducationalGames
                  studentName={student?.name}
                  studentCode={student?.code}
                  studentId={student?.id}
                  onNavigateHome={() => setActiveTab('home')}
                  onNavigateResults={() => setActiveTab('missions')}
                  onNavigateProfile={() => setActiveTab('profile')}
                />
              )}
            </div>

          </div></div></div>{/* GLOBAL DESIGNER AND DEVELOPER FOOTER */}
        <div className="mt-16 pt-8 border-t border-gray-900/80 flex flex-col items-center gap-4 text-center max-w-2xl mx-auto pb-6">
          <p className="text-xs md:text-sm font-black text-gray-500 uppercase tracking-widest">
            Designed & Developed by <span className="text-amber-600 font-extrabold shadow-sm">Abdelrahman Tarek</span>
          </p>
          <a
            href="https://se-abdulrahman.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-black text-stone-100 bg-amber-600 hover:from-red-500 hover:to-rose-600 transition duration-300 px-6 py-3 rounded-xl border border-amber-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] transform hover:-translate-y-0.5"
          >
            <span>زيارة معرض أعمال المصمم 🎨</span>
          </a>
        </div>

      {/* Detailed Result Report & 30-min Lock Modal */}
      <AnimatePresence>
        {viewingResultDetails && (() => {
          const submittedTime = new Date(viewingResultDetails.submittedAt).getTime();
          const thirtyMinsMs = 30 * 60 * 1000;
          const timePassedMs = nowTimestamp - submittedTime;
          const isUnlocked = timePassedMs >= thirtyMinsMs;
          const remainingSeconds = Math.max(0, Math.floor((thirtyMinsMs - timePassedMs) / 1000));
          const remainingMins = Math.floor(remainingSeconds / 60);
          const remainingSecs = remainingSeconds % 60;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/90 backdrop-blur-lg flex items-center justify-center p-4"
            >
              <div className="w-full max-w-3xl bg-stone-900 border border-amber-600/50 shadow-2xl rounded-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-6">
                  <div>
                    <span className="text-xs font-black bg-amber-600 text-stone-100 px-2.5 py-1 rounded inline-block mb-1">
                      تقرير أداء المهمة
                    </span>
                    <h3 className="text-2xl font-black text-stone-100">{viewingResultDetails.quiz_name}</h3>
                    <p className="text-xs text-stone-400 mt-1">
                      تاريخ التسليم: {new Date(viewingResultDetails.submittedAt).toLocaleString('ar-EG')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-rose-950 border border-rose-900 text-rose-400 px-4 py-2 rounded-xl font-mono font-black text-lg">
                      {viewingResultDetails.score} / {viewingResultDetails.total_questions} PTS
                    </div>
                    <button
                      onClick={() => setViewingResultDetails(null)}
                      className="p-2 bg-stone-800 hover:bg-stone-700 text-gray-300 rounded-xl transition"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {!isUnlocked ? (
                  <div className="bg-stone-950 border-2 border-amber-600/60 p-8 rounded-2xl text-center space-y-6">
                    <div className="w-16 h-16 bg-amber-600/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/40">
                      <Lock className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-stone-100">
                        نموذج الإجابات والتصحيح التفصيلي مقفل حالياً 🔒
                      </h4>
                      <p className="text-sm text-stone-300 max-w-md mx-auto leading-relaxed font-semibold">
                        حرصاً على الشفافية وعدالة التقييم، يُفتح نموذج الإجابات والتصحيح تلقائياً بعد مرور <span className="text-amber-400 font-extrabold">30 دقيقة</span> من انتهاء تسليم الاختبار.
                      </p>
                    </div>

                    <div className="bg-stone-900 border border-gray-800 p-6 rounded-2xl inline-block max-w-xs w-full">
                      <span className="text-xs font-bold text-gray-400 block mb-2">الوقت المتبقي لفتح التصحيح:</span>
                      <div className="text-4xl font-mono font-black text-amber-400 dir-ltr tracking-wider">
                        {remainingMins}:{remainingSecs < 10 ? '0' : ''}{remainingSecs}
                      </div>
                    </div>

                    <p className="text-xs text-stone-500 font-bold">
                      يمكنك العودة إلى هذه الصفحة في أي وقت بعد انتهاء العداد لاستعراض أخطائك والإجابات الصحيحة.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-950/40 border border-green-600/60 p-4 rounded-2xl flex items-center gap-3 text-green-300 font-bold text-sm">
                      <Unlock className="w-5 h-5 shrink-0 text-green-400" />
                      <span>تم فتح نموذج التصحيح بنجاح! يمكنك الآن مراجعة إجاباتك بالتفصيل واستيعاب النقاط الصحيحة.</span>
                    </div>

                    {!Array.isArray(viewingResultDetails.student_answers) || viewingResultDetails.student_answers.length === 0 ? (
                      <div className="text-center py-8 text-stone-500 font-bold">
                        تم أداء هذا الاختبار قبل تحديث نظام حفظ الإجابات التفصيلي.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {viewingResultDetails.student_answers.map((ans: any, idx: number) => {
                          const isCorrect = ans.selected_answer === ans.correct_answer;
                          return (
                            <div
                              key={idx}
                              className={`p-5 rounded-2xl border ${
                                isCorrect
                                  ? 'bg-green-950/20 border-green-800/50'
                                  : 'bg-rose-950/20 border-rose-800/50'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <span className="font-mono text-xs font-black text-gray-400">
                                  سؤال #{idx + 1}
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                                    isCorrect
                                      ? 'bg-green-950 text-green-400 border border-green-800'
                                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                                  }`}
                                >
                                  {isCorrect ? <><CheckCircle2 className="w-4 h-4" /> إجابة صحيحة</> : <><XCircle className="w-4 h-4" /> إجابة خاطئة</>}
                                </span>
                              </div>

                              <p className="font-bold text-stone-100 text-base mb-4 text-right">
                                {ans.question_text}
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-right">
                                {[
                                  { key: 'A', text: ans.choice_a },
                                  { key: 'B', text: ans.choice_b },
                                  { key: 'C', text: ans.choice_c },
                                  { key: 'D', text: ans.choice_d },
                                ].map(c => {
                                  const isChosen = ans.selected_answer === c.key;
                                  const isAnswerCorrect = ans.correct_answer === c.key;

                                  let borderStyle = 'border-stone-800 bg-stone-950/50 text-stone-300';
                                  if (isAnswerCorrect) {
                                    borderStyle = 'border-green-500 bg-green-950/40 text-green-200 font-black';
                                  } else if (isChosen && !isAnswerCorrect) {
                                    borderStyle = 'border-rose-500 bg-rose-950/40 text-rose-200 font-black';
                                  }

                                  return (
                                    <div
                                      key={c.key}
                                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${borderStyle}`}
                                    >
                                      <span className="font-medium">{c.text}</span>
                                      <div className="flex items-center gap-1">
                                        {isChosen && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">
                                            إجابتك
                                          </span>
                                        )}
                                        <span className="font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center bg-white/5">
                                          {c.key}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      </main>
    </div>
  );
}