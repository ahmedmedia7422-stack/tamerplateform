import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import CryptoJS from 'crypto-js';
import { Scanner } from '@yudiel/react-qr-scanner';
import { 
  Shield, 
  Trophy, 
  Play, 
  Plus, 
  Trash2, 
  FileSignature, 
  Users, 
  Video, 
  Search, 
  Filter, 
  Settings, 
  Award, 
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Cpu,
  ArrowLeft,
  ChevronRight,
  QrCode,
  ScanLine,
  Check,
  Database,
  MessageCircle,
  MessageSquare,
  LogOut,
  Clock,
  Calendar,
  BarChart3,
  AlertTriangle,
  X,
  Image as ImageIcon,
  Upload,
  Save,
  RotateCcw,
  GraduationCap,
  Crown,
  Lock,
  Unlock,
  Ban,
  UserX,
  Send,
  ShieldAlert
} from 'lucide-react';
import AlchemiyaStudentDashboard from './AlchemiyaStudentDashboard';
import AdminCenterEvaluations from './AdminCenterEvaluations';

const SECRET_KEY = "JamalAcademy_Secret_2026";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [authorized, setAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Nav Tabs
  const [activeTab, setActiveTab] = useState<'stats' | 'groups' | 'alchemiya' | 'students' | 'videos' | 'quizzes' | 'results' | 'rankings' | 'scanner' | 'messages' | 'banner' | 'community_chats'>('stats');

  // Group Management State
  const [selectedGroupClassFilter, setSelectedGroupClassFilter] = useState<string>('all');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    group_name: '',
    class_name: 'الصف الأول الثانوي',
    day_of_week: 'السبت والأربعاء',
    time: '04:00 مساءً',
    notes: ''
  });
  const [isSavingGroup, setIsSavingGroup] = useState<boolean>(false);

  const handleOpenAddGroupModal = () => {
    setEditingGroup(null);
    setGroupFormData({
      group_name: '',
      class_name: selectedGroupClassFilter !== 'all' ? selectedGroupClassFilter : 'الصف الأول الثانوي',
      day_of_week: 'السبت والأربعاء',
      time: '04:00 مساءً',
      notes: ''
    });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroupModal = (group: any) => {
    setEditingGroup(group);
    setGroupFormData({
      group_name: group.group_name || '',
      class_name: group.class_name || 'الصف الأول الثانوي',
      day_of_week: group.day_of_week || 'السبت والأربعاء',
      time: group.time || '04:00 مساءً',
      notes: group.notes || ''
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.group_name.trim() || !groupFormData.class_name) {
      alert("يرجى كتابة اسم المجموعة واختيار الصف الدراسي");
      return;
    }
    setIsSavingGroup(true);
    try {
      if (editingGroup?.id) {
        await updateDoc(doc(db, 'center_groups', editingGroup.id), {
          group_name: groupFormData.group_name.trim(),
          class_name: groupFormData.class_name,
          day_of_week: groupFormData.day_of_week.trim(),
          time: groupFormData.time.trim(),
          notes: groupFormData.notes.trim(),
          updatedAt: new Date().toISOString()
        });
        setChatToastNotice("تم تحديث بيانات المجموعة بنجاح! 🟢");
      } else {
        await addDoc(collection(db, 'center_groups'), {
          group_name: groupFormData.group_name.trim(),
          class_name: groupFormData.class_name,
          day_of_week: groupFormData.day_of_week.trim(),
          time: groupFormData.time.trim(),
          notes: groupFormData.notes.trim(),
          createdAt: new Date().toISOString()
        });
        setChatToastNotice("تم إضافة المجموعة الجديدة بنجاح! 🎉");
      }
      setTimeout(() => setChatToastNotice(null), 4000);
      setIsGroupModalOpen(false);
      await fetchAdminData();
    } catch (err) {
      console.error("Error saving group:", err);
      alert("حدث خطأ أثناء حفظ المجموعة.");
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`هل أنت متأكد من حذف المجموعة (${groupName})؟`)) return;
    try {
      await deleteDoc(doc(db, 'center_groups', groupId));
      setChatToastNotice(`تم حذف المجموعة (${groupName}) بنجاح.`);
      setTimeout(() => setChatToastNotice(null), 4000);
      await fetchAdminData();
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("حدث خطأ أثناء حذف المجموعة.");
    }
  };

  // Community Chats Management State
  const [chatSelectedGroup, setChatSelectedGroup] = useState('مجموعة السبت والثلثاء');
  const [chatSelectedClass, setChatSelectedClass] = useState('الصف الأول الثانوي');
  const [adminChatMessages, setAdminChatMessages] = useState<any[]>([]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [isChatClosedForSelectedClass, setIsChatClosedForSelectedClass] = useState(false);
  const [isSendingAdminChat, setIsSendingAdminChat] = useState(false);
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<{
    id?: string;
    code: string;
    name: string;
    className: string;
    is_chat_banned?: boolean;
    is_banned?: boolean;
    messageDocId?: string;
  } | null>(null);
  const adminChatEndRef = useRef<HTMLDivElement | null>(null);

  // Real Database state
  const [students, setStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchStudent, setSearchStudent] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [centerGroups, setCenterGroups] = useState<any[]>([]);

  // Scanner State
  const [scanResult, setScanResult] = useState<any>(null);

  // Edit States
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editStudentData, setEditStudentData] = useState<any>({});
  
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editQuestionData, setEditQuestionData] = useState<any>({});

  const handleSaveQuestionEdit = async (questionId: string) => {
    try {
      if (selectedQuiz) {
        await updateDoc(doc(db, 'quizzes', selectedQuiz.id, 'questions', questionId), {
          question_text: editQuestionData.question_text,
          choice_a: editQuestionData.choice_a,
          choice_b: editQuestionData.choice_b,
          choice_c: editQuestionData.choice_c,
          choice_d: editQuestionData.choice_d,
          correct_answer: editQuestionData.correct_answer
        });
        alert("تم تحديث السؤال بنجاح!");
        setEditingQuestion(null);
        handleOpenQuizDetails(selectedQuiz); // Refresh questions
      }
    } catch (err) {
      console.error("Error updating question", err);
      alert("حدث خطأ أثناء تحديث السؤال.");
    }
  };

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      try {
        const decrypted = CryptoJS.AES.decrypt(result[0].rawValue, SECRET_KEY).toString(CryptoJS.enc.Utf8);
        const data = JSON.parse(decrypted);
        setScanResult(data);
      } catch (err) {
        console.error("Invalid QR code", err);
      }
    }
  };

  // Video Form
  const [newVideo, setNewVideo] = useState({ title: '', className: 'الصف الأول الثانوي', url: '' });
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Quiz Form
  const [newQuiz, setNewQuiz] = useState<{ quiz_name: string; className: string; duration_minutes: number | string }>({
    quiz_name: '',
    className: 'الصف الأول الثانوي',
    duration_minutes: 20
  });
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

  // Result details & Analytics state
  const [selectedResultDetails, setSelectedResultDetails] = useState<any | null>(null);
  const [resultsSubTab, setResultsSubTab] = useState<'list' | 'analytics'>('list');
  const [analyticsSelectedQuizId, setAnalyticsSelectedQuizId] = useState<string>('all');

  // Active Quiz details state
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    choice_a: '',
    choice_b: '',
    choice_c: '',
    choice_d: '',
    correct_answer: 'A'
  });

  // Teacher AI Quiz Generator State
  const [aiTopic, setAiTopic] = useState('');
  const [aiClass, setAiClass] = useState('الصف الأول الثانوي');
  const [aiDifficulty, setAiDifficulty] = useState('Intermediate');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiCustomText, setAiCustomText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Hero Banner Customization State
  const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=2000&auto=format&fit=crop';
  const [heroBanner, setHeroBanner] = useState({
    imageUrl: DEFAULT_HERO_IMAGE,
    badgeText: 'معلم اللغة العربية ولغة الضاد',
    mainTitle: 'مرحباً بك في <span class="text-amber-400">منصة لغة الضاد</span>',
    description: 'رحلتك نحو التفوق والدرجات النهائية في مادة اللغة العربية (النحو، البلاغة، الأدب، والنصوص) بأسلوب الأستاذ أحمد تامر المبتكر.'
  });

  // Teacher Profile Card Customization State
  const DEFAULT_TEACHER_IMAGE = '/teacher.png';
  const [teacherCard, setTeacherCard] = useState({
    imageUrl: DEFAULT_TEACHER_IMAGE,
    badgeText: 'معلم لغة الضاد',
    name: 'الأستاذ أحمد تامر',
    subtitle: 'خبير تدريس مادة اللغة العربية للمراحل الإعدادية والثانوية',
    quote: 'لغة الضاد بحرٌ من الفصاحة والبيان، وقواعد النحو مفتاح الفهم والإتقان. تعلم بشغف لتتفوق!'
  });

  const [isSavingHero, setIsSavingHero] = useState(false);
  const [heroSaveSuccess, setHeroSaveSuccess] = useState(false);

  const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleHeroImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file, 1200, 1000, 0.8);
      setHeroBanner(prev => ({ ...prev, imageUrl: compressedDataUrl }));
    } catch (err) {
      console.error("Error compressing image:", err);
      alert("تعذر معالجة الصورة، يرجى اختيار صورة أخرى.");
    }
  };

  const handleTeacherImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file, 600, 600, 0.85);
      setTeacherCard(prev => ({ ...prev, imageUrl: compressedDataUrl }));
    } catch (err) {
      console.error("Error compressing image:", err);
      alert("تعذر معالجة الصورة، يرجى اختيار صورة أخرى.");
    }
  };

  const handleSaveHeroBanner = async () => {
    setIsSavingHero(true);
    try {
      await setDoc(doc(db, 'settings', 'hero'), {
        imageUrl: heroBanner.imageUrl,
        badgeText: heroBanner.badgeText,
        mainTitle: heroBanner.mainTitle,
        description: heroBanner.description,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'settings', 'teacher'), {
        imageUrl: teacherCard.imageUrl,
        badgeText: teacherCard.badgeText,
        name: teacherCard.name,
        subtitle: teacherCard.subtitle,
        quote: teacherCard.quote,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setHeroSaveSuccess(true);
      setTimeout(() => setHeroSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Error saving hero banner or teacher settings:", err);
      alert(`حدث خطأ أثناء حفظ التغييرات: ${err?.message || 'يرجى المحاولة مرة أخرى'}`);
    } finally {
      setIsSavingHero(false);
    }
  };

  // Rankings state
  const [rankings, setRankings] = useState<any[]>([]);
  const [rankClass, setRankClass] = useState('all');
  const [rankGroup, setRankGroup] = useState('all');

  useEffect(() => {
    if (localStorage.getItem('jamal_admin_auth') === 'true') {
      setAuthorized(true);
      fetchAdminData();
    }
  }, []);

  const handleSaveStudentEdit = async (studentId: string) => {
    try {
      const trimmedPass = (editStudentData.password || '').trim();
      if (!trimmedPass) {
        alert("يرجى إدخال كلمة مرور للطالب.");
        return;
      }

      // Check if another student has the same password
      const passQuery = query(collection(db, 'students'), where('password', '==', trimmedPass));
      const passSnap = await getDocs(passQuery);
      const duplicateDoc = passSnap.docs.find(d => d.id !== studentId);
      if (duplicateDoc) {
        alert(`⚠️ كلمة المرور "${trimmedPass}" مستخدمة بالفعل لطالب آخر (${duplicateDoc.data().name})! لا يُسمح بتكرار كلمات المرور لأن تسجيل الدخول يتم بكلمة المرور فقط.`);
        return;
      }

      await updateDoc(doc(db, 'students', studentId), {
        name: editStudentData.name,
        password: trimmedPass,
        phone: editStudentData.phone,
        class_name: editStudentData.class_name,
        className: editStudentData.class_name,
        group_name: editStudentData.group_name,
        groupName: editStudentData.group_name
      });
      alert("تم تحديث بيانات الطالب والمجموعة بنجاح!");
      setEditingStudent(null);
      fetchAdminData();
    } catch (err) {
      console.error("Error updating student", err);
      alert("حدث خطأ أثناء التحديث.");
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === 'admin' && adminPass === 'tamer$321') {
      localStorage.setItem('jamal_admin_auth', 'true');
      setAuthorized(true);
      setLoginError(false);
      fetchAdminData();
    } else {
      setLoginError(true);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('jamal_admin_auth');
    setAuthorized(false);
    onLogout();
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const studentSnap = await getDocs(collection(db, 'students'));
      const sList = studentSnap.docs.map(docSnap => {
        const data = docSnap.data();
        const rawCode = data.code ? String(data.code) : '';
        const cleanCode = rawCode.replace(/\D/g, '') || rawCode;

        // Auto-update Firestore if code contains non-digit letters
        if (/\D/.test(rawCode) && cleanCode) {
          updateDoc(doc(db, 'students', docSnap.id), { code: cleanCode }).catch(() => {});
        }

        return { id: docSnap.id, ...data, code: cleanCode };
      });
      setStudents(sList);

      // Fetch Center Groups
      const groupSnap = await getDocs(collection(db, 'center_groups'));
      const gList = groupSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCenterGroups(gList);

      // 2. Fetch Quizzes
      const quizSnap = await getDocs(collection(db, 'quizzes'));
      const qList = quizSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(qList);

      // 3. Fetch Videos
      const videoSnap = await getDocs(collection(db, 'videos'));
      const vList = videoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(vList);

      // 4. Fetch Results
      const resultSnap = await getDocs(collection(db, 'results'));
      const rList = resultSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(rList);

      const msgSnap = await getDocs(collection(db, 'messages'));
      const msgList = msgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      // 5. Fetch Hero & Teacher Settings
      const heroSnap = await getDoc(doc(db, 'settings', 'hero'));
      if (heroSnap.exists()) {
        const data = heroSnap.data();
        setHeroBanner({
          imageUrl: data.imageUrl || DEFAULT_HERO_IMAGE,
          badgeText: data.badgeText || 'معلم اللغة العربية ولغة الضاد',
          mainTitle: data.mainTitle || 'مرحباً بك في <span class="text-amber-400">منصة لغة الضاد</span>',
          description: data.description || 'رحلتك نحو التفوق والدرجات النهائية في مادة اللغة العربية (النحو، البلاغة، الأدب، والنصوص) بأسلوب الأستاذ أحمد تامر المبتكر.'
        });
      }

      const teacherSnap = await getDoc(doc(db, 'settings', 'teacher'));
      if (teacherSnap.exists()) {
        const tData = teacherSnap.data();
        setTeacherCard({
          imageUrl: tData.imageUrl || DEFAULT_TEACHER_IMAGE,
          badgeText: tData.badgeText || 'معلم لغة الضاد',
          name: tData.name || 'الأستاذ أحمد تامر',
          subtitle: tData.subtitle || 'خبير تدريس مادة اللغة العربية للمراحل الإعدادية والثانوية',
          quote: tData.quote || 'لغة الضاد بحرٌ من الفصاحة والبيان، وقواعد النحو مفتاح الفهم والإتقان. تعلم بشغف لتتفوق!'
        });
      }

    } catch (err) {
      console.error("Error loading admin datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for community messages in Admin Dashboard
  useEffect(() => {
    if (!authorized || activeTab !== 'community_chats' || !chatSelectedGroup) return;

    const q = query(
      collection(db, 'grade_chats'),
      where('group_name', '==', chatSelectedGroup)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => a.timestamp_num - b.timestamp_num);
      setAdminChatMessages(msgs);
      setTimeout(() => {
        adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [authorized, activeTab, chatSelectedGroup]);

  // Real-time listener for chat settings (open/closed) in Admin Dashboard
  useEffect(() => {
    if (!authorized || activeTab !== 'community_chats' || !chatSelectedGroup) return;

    const docRef = doc(db, 'chat_settings', chatSelectedGroup);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsChatClosedForSelectedClass(!!docSnap.data()?.is_closed);
      } else {
        setIsChatClosedForSelectedClass(false);
      }
    });

    return () => unsubscribe();
  }, [authorized, activeTab, chatSelectedGroup]);

  const [isTogglingChatStatus, setIsTogglingChatStatus] = useState(false);
  const [chatToastNotice, setChatToastNotice] = useState<string | null>(null);

  // Toggle chat status open/closed for group
  const handleToggleChatOpenClose = async () => {
    if (isTogglingChatStatus || !chatSelectedGroup) return;
    const newClosedStatus = !isChatClosedForSelectedClass;
    setIsTogglingChatStatus(true);
    setChatToastNotice(null);

    try {
      await setDoc(doc(db, 'chat_settings', chatSelectedGroup), {
        is_closed: newClosedStatus,
        group_name: chatSelectedGroup,
        updatedAt: new Date().toISOString(),
        updatedBy: 'الأستاذ أحمد تامر'
      });
      const msg = `تم ${newClosedStatus ? "إغلاق 🔒" : "فتح 🔓"} الشات بنجاح لمجموعة (${chatSelectedGroup})`;
      setChatToastNotice(msg);
      setTimeout(() => setChatToastNotice(null), 4000);
    } catch (err) {
      console.error("Error toggling chat status:", err);
      setChatToastNotice("حدث خطأ أثناء تعديل حالة الشات.");
      setTimeout(() => setChatToastNotice(null), 4000);
    } finally {
      setIsTogglingChatStatus(false);
    }
  };

  // Send admin message to group chat
  const handleSendAdminChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim() || isSendingAdminChat || !chatSelectedGroup) return;

    const text = adminChatInput.trim();
    setAdminChatInput('');
    setIsSendingAdminChat(true);

    const targetGroupObj = centerGroups.find(g => g.group_name === chatSelectedGroup);

    try {
      await addDoc(collection(db, 'grade_chats'), {
        group_name: chatSelectedGroup,
        class_name: targetGroupObj?.class_name || chatSelectedClass || 'عام',
        student_code: 'ADMIN',
        student_name: 'الأستاذ أحمد تامر (المعلم) 👑',
        avatar: 'crown',
        is_admin: true,
        text,
        timestamp_num: Date.now(),
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error sending admin chat message:", err);
      alert("حدث خطأ أثناء إرسال الرسالة.");
    } finally {
      setIsSendingAdminChat(false);
    }
  };

  // Ban actions
  const handleSetStudentBanType = async (type: 'chat' | 'platform' | 'unban') => {
    if (!selectedStudentForAction) return;

    const { id, code, name } = selectedStudentForAction;
    try {
      let studentDocRef = null;
      if (id) {
        studentDocRef = doc(db, 'students', id);
      } else if (code) {
        const q = query(collection(db, 'students'), where('code', '==', code));
        const snap = await getDocs(q);
        if (!snap.empty) {
          studentDocRef = doc(db, 'students', snap.docs[0].id);
        }
      }

      if (!studentDocRef) {
        setChatToastNotice("لم يتم العثور على سجل الطالب في قاعدة البيانات.");
        setTimeout(() => setChatToastNotice(null), 4000);
        return;
      }

      if (type === 'chat') {
        await updateDoc(studentDocRef, {
          is_chat_banned: true,
          is_banned: false
        });
        setChatToastNotice(`تم حظر الطالب (${name}) من إرسال الرسائل في الشات فقط!`);
      } else if (type === 'platform') {
        await updateDoc(studentDocRef, {
          is_banned: true,
          is_chat_banned: true
        });
        setChatToastNotice(`تم حظر الطالب (${name}) بالكامل من المنصة!`);
      } else if (type === 'unban') {
        await updateDoc(studentDocRef, {
          is_banned: false,
          is_chat_banned: false
        });
        setChatToastNotice(`تم إلغاء كافة الحظورات عن الطالب (${name})!`);
      }

      setTimeout(() => setChatToastNotice(null), 4000);
      setSelectedStudentForAction(null);
      await fetchAdminData();
    } catch (err) {
      console.error("Error setting student ban:", err);
      setChatToastNotice("حدث خطأ أثناء تنفيذ الإجراء.");
      setTimeout(() => setChatToastNotice(null), 4000);
    }
  };

  const handleDeleteChatMessageDoc = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'grade_chats', docId));
      setChatToastNotice("تم حذف الرسالة بنجاح!");
      setTimeout(() => setChatToastNotice(null), 4000);
      if (selectedStudentForAction?.messageDocId === docId) {
        setSelectedStudentForAction(null);
      }
    } catch (err) {
      console.error("Error deleting chat message:", err);
    }
  };

  // Student Messages Management Actions
  const handleToggleMessageSelect = (id: string) => {
    setSelectedMessageIds(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllMessages = () => {
    if (selectedMessageIds.length === messages.length) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(messages.map(msg => msg.id));
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessageIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من رغبتك في حذف ${selectedMessageIds.length} رسالة محددة؟`)) return;
    
    try {
      setLoading(true);
      await Promise.all(
        selectedMessageIds.map(id => deleteDoc(doc(db, 'messages', id)))
      );
      setSelectedMessageIds([]);
      await fetchAdminData();
      alert("تم حذف الرسائل المحددة بنجاح!");
    } catch (err) {
      console.error("Error deleting messages:", err);
      alert("حدث خطأ أثناء محاولة حذف بعض الرسائل.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingleMessage = async (id: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذه الرسالة؟")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'messages', id));
      setSelectedMessageIds(prev => prev.filter(mid => mid !== id));
      await fetchAdminData();
      alert("تم حذف الرسالة بنجاح!");
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("حدث خطأ أثناء محاولة حذف الرسالة.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudentBan = async (studentId: string, currentBanStatus: boolean) => {
    const actionText = currentBanStatus ? "إلغاء حظر" : "حظر";
    if (!confirm(`هل أنت متأكد من رغبتك في ${actionText} هذا الطالب؟`)) return;
    
    try {
      setLoading(true);
      await updateDoc(doc(db, 'students', studentId), {
        is_banned: !currentBanStatus
      });
      alert(`تم ${currentBanStatus ? "إلغاء حظر" : "حظر"} الطالب بنجاح!`);
      await fetchAdminData();
    } catch (err) {
      console.error("Error toggling student ban status:", err);
      alert("حدث خطأ أثناء محاولة تعديل حالة الحظر.");
    } finally {
      setLoading(false);
    }
  };

  // Video Actions
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideo.title || !newVideo.url) {
      alert("يرجى ملء كافة تفاصيل الفيديو!");
      return;
    }
    setIsUploadingVideo(true);
    try {
      const docRef = await addDoc(collection(db, 'videos'), {
        title: newVideo.title,
        class_name: newVideo.className,
        youtube_url: newVideo.url,
        createdAt: new Date().toISOString()
      });
      setVideos(prev => [...prev, {
        id: docRef.id,
        title: newVideo.title,
        class_name: newVideo.className,
        youtube_url: newVideo.url,
        createdAt: new Date().toISOString()
      }]);
      setNewVideo({ title: '', className: 'الصف الأول الثانوي', url: '' });
      alert("تم رفع المحاضرة بنجاح!");
    } catch (err) {
      console.error("Error adding video:", err);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المحاضرة؟")) return;
    try {
      await deleteDoc(doc(db, 'videos', id));
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error("Error deleting video:", err);
    }
  };

  // Quiz Actions
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuiz.quiz_name) {
      alert("يرجى إدخال اسم الاختبار!");
      return;
    }
    setIsCreatingQuiz(true);
    try {
      const durationNum = Number(newQuiz.duration_minutes) || 20;
      const docRef = await addDoc(collection(db, 'quizzes'), {
        quiz_name: newQuiz.quiz_name,
        class_name: newQuiz.className,
        duration_minutes: durationNum,
        is_active: false,
        createdAt: new Date().toISOString()
      });
      const created = {
        id: docRef.id,
        quiz_name: newQuiz.quiz_name,
        class_name: newQuiz.className,
        duration_minutes: durationNum,
        is_active: false,
        createdAt: new Date().toISOString()
      };
      setQuizzes(prev => [...prev, created]);
      setNewQuiz({ quiz_name: '', className: 'الصف الأول الثانوي', duration_minutes: 20 });
      alert("تم إنشاء الاختبار بنجاح! يرجى إضافة الأسئلة إليه الآن.");
    } catch (err) {
      console.error("Error creating quiz:", err);
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const toggleQuizStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'quizzes', id), { is_active: !currentStatus });
      setQuizzes(prev => prev.map(q => q.id === id ? { ...q, is_active: !currentStatus } : q));
    } catch (err) {
      console.error("Error updating quiz status:", err);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار بالكامل بجميع أسئلته؟")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', id));
      setQuizzes(prev => prev.filter(q => q.id !== id));
      if (selectedQuiz?.id === id) {
        setSelectedQuiz(null);
      }
    } catch (err) {
      console.error("Error deleting quiz:", err);
    }
  };

  // Question Management within selected Quiz
  const handleOpenQuizDetails = async (quiz: any) => {
    setSelectedQuiz(quiz);
    setLoading(true);
    try {
      const qSnap = await getDocs(collection(db, 'quizzes', quiz.id, 'questions'));
      const list = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizQuestions(list);
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const { question_text, choice_a, choice_b, choice_c, choice_d, correct_answer } = newQuestion;
    if (!question_text || !choice_a || !choice_b || !choice_c || !choice_d) {
      alert("يرجى ملء كافة تفاصيل السؤال!");
      return;
    }

    try {
      const colRef = collection(db, 'quizzes', selectedQuiz.id, 'questions');
      const docRef = await addDoc(colRef, {
        question_text,
        choice_a,
        choice_b,
        choice_c,
        choice_d,
        correct_answer
      });
      setQuizQuestions(prev => [...prev, {
        id: docRef.id,
        question_text,
        choice_a,
        choice_b,
        choice_c,
        choice_d,
        correct_answer
      }]);
      setNewQuestion({
        question_text: '',
        choice_a: '',
        choice_b: '',
        choice_c: '',
        choice_d: '',
        correct_answer: 'A'
      });
    } catch (err) {
      console.error("Error adding question:", err);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("هل تريد حذف هذا السؤال؟")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', selectedQuiz.id, 'questions', qId));
      setQuizQuestions(prev => prev.filter(q => q.id !== qId));
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  // Teacher AI Generator
  const handleGenerateAiQuiz = async () => {
    if (!aiTopic.trim()) {
      alert("يرجى إدخال الموضوع لإنشاء الأسئلة!");
      return;
    }
    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/teacher-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_quiz',
          className: aiClass,
          difficulty: aiDifficulty,
          topic: aiTopic,
          numQuestions: aiNumQuestions,
          customText: aiCustomText
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

      if (data.questions && Array.isArray(data.questions)) {
        const batch = quizQuestions;
        const colRef = collection(db, 'quizzes', selectedQuiz.id, 'questions');

        for (const q of data.questions) {
          const docRef = await addDoc(colRef, {
            question_text: q.question_text,
            choice_a: q.choice_a,
            choice_b: q.choice_b,
            choice_c: q.choice_c,
            choice_d: q.choice_d,
            correct_answer: q.correct_answer
          });
          batch.push({
            id: docRef.id,
            question_text: q.question_text,
            choice_a: q.choice_a,
            choice_b: q.choice_b,
            choice_c: q.choice_c,
            choice_d: q.choice_d,
            correct_answer: q.correct_answer
          });
        }

        setQuizQuestions([...batch]);
        setAiTopic('');
        setAiCustomText('');
        alert(`تم توليد ${data.questions.length} أسئلة بنجاح بالذكاء الاصطناعي وإضافتها للاختبار!`);
      } else {
        throw new Error("تنسيق الاستجابة من الذكاء الاصطناعي غير صالح");
      }

    } catch (err: any) {
      console.error("Error generating AI quiz:", err);
      alert("حدث خطأ أثناء توليد الأسئلة: " + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Rankings logic
  const handleGenerateRankings = () => {
    const studentMap: { [key: string]: any } = {};

    const filteredResults = results.filter(r => {
      const classMatch = rankClass === 'all' || r.class_name === rankClass;
      const groupMatch = rankGroup === 'all' || r.group_name === rankGroup;
      return classMatch && groupMatch;
    });

    filteredResults.forEach(r => {
      if (!studentMap[r.student_code]) {
        studentMap[r.student_code] = {
          name: r.student_name,
          code: r.student_code,
          className: r.class_name,
          groupName: r.group_name,
          totalScore: 0
        };
      }
      studentMap[r.student_code].totalScore += r.score;
    });

    const sorted = Object.values(studentMap).sort((a: any, b: any) => b.totalScore - a.totalScore);
    setRankings(sorted);
  };

  // Custom filters for students and past score archives
  const filteredStudents = students.filter(s => {
    const sName = (s.name || '').toLowerCase();
    const sCode = (s.code || '').toLowerCase();
    const sPhone = (s.phone || '').toLowerCase();
    const queryMatch = sName.includes(searchStudent.toLowerCase()) || sCode.includes(searchStudent.toLowerCase()) || sPhone.includes(searchStudent.toLowerCase());
    const classMatch = filterClass === 'all' || s.class_name === filterClass;
    const groupMatch = filterGroup === 'all' || s.group_name === filterGroup;
    return queryMatch && classMatch && groupMatch;
  });

  const filteredResults = results.filter(r => {
    const sName = (r.student_name || '').toLowerCase();
    const sCode = (r.student_code || '').toLowerCase();
    const queryMatch = sName.includes(searchStudent.toLowerCase()) || sCode.includes(searchStudent.toLowerCase());
    const classMatch = filterClass === 'all' || r.class_name === filterClass;
    const groupMatch = filterGroup === 'all' || r.group_name === filterGroup;
    return queryMatch && classMatch && groupMatch;
  });

  if (!authorized) {
    return (
      
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-sm bg-white/95 backdrop-blur-2xl border border-amber-200 shadow-2xl p-8 text-center rounded-3xl relative overflow-hidden">
          
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/40 via-sky-50/20 to-transparent pointer-events-none"></div>

          <div className="relative z-10">
            <div className="inline-block bg-amber-100 border border-amber-300 px-6 py-2 rounded-full mb-6 backdrop-blur-md shadow-sm">
              <span className="text-xs font-bold text-amber-800 tracking-widest">
                إدارة المنصة التعليمية 👑
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-6">دخول الإدارة</h2>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="text"
                required
                placeholder="اسم المستخدم"
                className="w-full bg-white border border-slate-300 focus:border-amber-500 text-slate-900 rounded-xl p-4 text-center font-bold outline-none transition text-lg shadow-sm"
                value={adminUser}
                onChange={e => setAdminUser(e.target.value)}
              />
              <input
                type="password"
                required
                placeholder="كلمة المرور السرية"
                className="w-full bg-white border border-slate-300 focus:border-amber-500 text-slate-900 rounded-xl p-4 text-center font-bold outline-none transition text-lg shadow-sm"
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-4 rounded-xl text-xl transition shadow-lg shadow-amber-500/20 mt-2"
              >
                تسجيل الدخول
              </button>
            </form>
            {loginError && (
              <p className="text-rose-600 font-bold mt-4 text-sm bg-rose-50 border border-rose-200 p-2.5 rounded-xl">رمز الدخول أو الاسم غير صحيح!</p>
            )}
          </div>
        </div>
      </div>

    );
  }

  return (
    <div className="min-h-screen text-slate-800">
      
      {/* Top Banner Control Header */}
      <nav className="border-b border-amber-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3.5 py-1.5 rounded-lg shadow-md">
                <span className="font-sans font-black text-white text-base tracking-widest">لوحة التحكم</span>
              </div>
              <span className="font-black text-amber-700 text-sm tracking-widest hidden md:inline">
                بوابة إدارة المنصة والعمليات التعليمية
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={fetchAdminData}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition rounded-xl border border-slate-200"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={handleAdminLogout}
                className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-xl text-sm font-black transition shadow-sm"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed right-0 top-20 bottom-0 w-64 bg-stone-950/80 border-l border-gray-800 backdrop-blur-xl flex-col p-6 z-30 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest mb-6 border-b border-gray-800 pb-2">أقسام لوحة التحكم</h3>
          {[
            { id: 'stats', label: 'لوحة التحكم', icon: Shield },
            { id: 'groups', label: 'إدارة المجاميع 👥', icon: Users },
            { id: 'community_chats', label: 'شاتات المجتمعات 💬', icon: MessageSquare },
            { id: 'alchemiya', label: 'تقييم طلاب السنتر', icon: GraduationCap },
            { id: 'banner', label: 'تعديل بنر الهوم', icon: ImageIcon },
            { id: 'scanner', label: 'مسح النتائج (QR)', icon: QrCode },
            { id: 'students', label: 'الطلاب المسجلين', icon: Users },
            { id: 'quizzes', label: 'بنك الامتحانات', icon: FileSignature },
            { id: 'videos', label: 'إدارة الفيديوهات', icon: Video },
            { id: 'results', label: 'سجلات الدرجات', icon: Database },
            { id: 'rankings', label: 'لوحة الشرف', icon: Trophy },
            { id: 'messages', label: 'صندوق الرسائل', icon: MessageCircle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedQuiz(null); // Clear selected quiz detail state on navigation
                }}
                className={`w-full flex items-center gap-3 py-4 px-4 rounded-xl text-sm font-black transition ${
                  activeTab === tab.id
                    ? 'bg-amber-600 text-stone-100 shadow-lg'
                    : 'text-gray-400 hover:text-stone-100 hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-stone-950/95 border-t border-gray-800 backdrop-blur-xl z-50 overflow-x-auto scrollbar-none">
        <div className="flex justify-start items-center h-20 px-4 gap-4 whitespace-nowrap min-w-max">
          {[
            { id: 'stats', label: 'لوحة التحكم', icon: Shield },
            { id: 'groups', label: 'المجاميع', icon: Users },
            { id: 'community_chats', label: 'الشاتات', icon: MessageSquare },
            { id: 'alchemiya', label: 'تقييمات السنتر', icon: GraduationCap },
            { id: 'banner', label: 'البنر', icon: ImageIcon },
            { id: 'scanner', label: 'مسح النتائج (QR)', icon: QrCode },
            { id: 'students', label: 'الطلاب', icon: Users },
            { id: 'quizzes', label: 'الامتحانات', icon: FileSignature },
            { id: 'videos', label: 'الفيديوهات', icon: Video },
            { id: 'results', label: 'الدرجات', icon: Database },
            { id: 'rankings', label: 'الشرف', icon: Trophy },
            { id: 'messages', label: 'الرسائل', icon: MessageCircle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedQuiz(null);
                }}
                className={`flex flex-col items-center justify-center py-2 px-3 space-y-1 transition rounded-xl ${
                  activeTab === tab.id
                    ? 'text-amber-500 bg-red-950/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-black">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8 lg:pr-[18rem]">

        {/* Content Tabs Switch */}
        <div>
          {activeTab === 'groups' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-stone-950/80 border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
                <div className="space-y-2 text-right">
                  <span className="inline-flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 font-extrabold text-xs px-3 py-1 rounded-full">
                    <Users className="w-4 h-4 text-cyan-400" /> تنظيم السنتر والمجموعات
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-stone-100 flex items-center gap-2">
                    إدارة المجاميع والمواعيد 👥
                  </h3>
                  <p className="text-sm font-bold text-gray-400 max-w-2xl leading-relaxed">
                    من هنا يمكنك إضافة وتعديل مجاميع الدروس والسنتر (تحديد اسم الصف، اسم المجموعة، أيام الحضور، والمواعيد). يظهر هذا القائمة تلقائياً للطلاب أثناء تسجيل الحساب جديد لتسهيل اختيار المواعيد المناسبة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddGroupModal}
                  className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 transition active:scale-95 shrink-0 cursor-pointer"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>إضافة مجموعة جديدة</span>
                </button>
              </div>

              {/* Filter By Class */}
              <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-stone-300 font-bold text-sm w-full md:w-auto">
                  <Filter className="w-4 h-4 text-cyan-400" />
                  <span>تصفية حسب الصف الدراسي:</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'جميع الصفوف' },
                    { id: 'الصف الأول الإعدادي', label: '١ إعدادي' },
                    { id: 'الصف الثاني الإعدادي', label: '٢ إعدادي' },
                    { id: 'الصف الثالث الإعدادي', label: '٣ إعدادي' },
                    { id: 'الصف الأول الثانوي', label: '١ ثانوي' },
                    { id: 'الصف الثاني الثانوي', label: '٢ ثانوي' },
                    { id: 'الصف الثالث الثانوي', label: '٣ ثانوي' },
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedGroupClassFilter(c.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                        selectedGroupClassFilter === c.id
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Groups List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {centerGroups
                  .filter(g => selectedGroupClassFilter === 'all' || g.class_name === selectedGroupClassFilter)
                  .map(group => {
                    const enrolledCount = students.filter(s => 
                      s.class_name === group.class_name && 
                      (s.group_name === group.group_name || s.groupName === group.group_name)
                    ).length;

                    return (
                      <div 
                        key={group.id} 
                        className="bg-stone-950/80 border border-stone-800 hover:border-cyan-500/50 rounded-3xl p-6 space-y-4 transition-all duration-300 shadow-xl flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-3">
                            <div>
                              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 mb-1 inline-block">
                                {group.class_name}
                              </span>
                              <h4 className="text-xl font-black text-stone-100">{group.group_name}</h4>
                            </div>
                            <span className="text-xs font-black bg-stone-900 border border-stone-700 text-stone-300 px-3 py-1 rounded-xl flex items-center gap-1 shrink-0">
                              <Users className="w-3.5 h-3.5 text-cyan-400" />
                              {enrolledCount} طالب
                            </span>
                          </div>

                          <div className="space-y-2 text-sm font-bold text-stone-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>أيام الحضور: <strong className="text-stone-100">{group.day_of_week || 'غير محدد'}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span>التوقيت / الموعد: <strong className="text-stone-100">{group.time || 'غير محدد'}</strong></span>
                            </div>
                            {group.notes && (
                              <div className="flex items-start gap-2 text-xs text-stone-400 pt-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <span>ملاحظات: {group.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-stone-900">
                          <button
                            type="button"
                            onClick={() => handleOpenEditGroupModal(group)}
                            className="flex-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-black py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>تعديل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group.id, group.group_name)}
                            className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-black px-3 py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {centerGroups.filter(g => selectedGroupClassFilter === 'all' || g.class_name === selectedGroupClassFilter).length === 0 && (
                  <div className="col-span-full bg-stone-950/40 border border-stone-800/80 rounded-3xl p-12 text-center space-y-4">
                    <Users className="w-12 h-12 text-stone-600 mx-auto" />
                    <h4 className="text-stone-300 font-black text-lg">لا توجد مجاميع مضافة في هذا الصف حالياً</h4>
                    <p className="text-stone-500 text-xs font-bold max-w-md mx-auto">
                      قم بإضافة مجموعة جديدة ليتمكن الطلاب في هذا الصف من اختيارها أثناء تسجيل الحساب.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddGroupModal}
                      className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> إضافة مجموعة الآن
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'community_chats' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-stone-950/80 border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
                <div className="space-y-2 text-right">
                  <span className="inline-flex items-center gap-1.5 bg-amber-950/80 border border-amber-500/50 text-amber-400 font-extrabold text-xs px-3 py-1 rounded-full">
                    <Crown className="w-4 h-4 text-amber-400" /> غرف مجتمعات الصفوف والشاتات المباشرة
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-stone-100 flex items-center gap-2">
                    المحادثة المباشرة وإدارة الشاتات 💬
                  </h3>
                  <p className="text-sm font-bold text-gray-400 max-w-xl leading-relaxed">
                    يمكنك كأدمن الدخول والمشاركة في شات أي صف، توجيه الطلاب، وحظر أي طالب (حظر من الشات فقط أو حظر من المنصة)، والتحكم بفتح أو إغلاق الشات عامة.
                  </p>
                </div>

                {/* Group Selector & Open/Close Toggle Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-black text-cyan-400 text-right">اختر المجموعــة:</span>
                    <select
                      value={chatSelectedGroup}
                      onChange={(e) => setChatSelectedGroup(e.target.value)}
                      className="bg-stone-900 border-2 border-gray-700 text-stone-100 font-bold p-3.5 rounded-2xl outline-none focus:border-amber-500 transition text-right cursor-pointer"
                    >
                      {centerGroups.map(g => (
                        <option key={g.id} value={g.group_name} className="bg-stone-900 text-stone-100">
                          {g.group_name} — {g.class_name} ({g.day_of_week || ''})
                        </option>
                      ))}
                      {centerGroups.length === 0 && (
                        <>
                          <option value="مجموعة السبت والثلثاء" className="bg-stone-900 text-stone-100">مجموعة السبت والثلثاء</option>
                          <option value="مجموعة الأحد والأربعاء" className="bg-stone-900 text-stone-100">مجموعة الأحد والأربعاء</option>
                          <option value="مجموعة الإثنين والخميس" className="bg-stone-900 text-stone-100">مجموعة الإثنين والخميس</option>
                          <option value="مجموعة السنتر" className="bg-stone-900 text-stone-100">مجموعة السنتر</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Current Status Badge & Action Button */}
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-4 py-1.5 rounded-xl border text-xs font-black flex items-center gap-2 ${
                      isChatClosedForSelectedClass
                        ? 'bg-rose-950/90 border-rose-600 text-rose-300 animate-pulse'
                        : 'bg-emerald-950/90 border-emerald-600 text-emerald-300'
                    }`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${isChatClosedForSelectedClass ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                      <span>الحالة: {isChatClosedForSelectedClass ? '🔒 مَغْلَق للطلاب' : '🟢 مَفْتُوح للطلاب'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleChatOpenClose}
                      disabled={isTogglingChatStatus}
                      className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition shadow-xl border-2 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isChatClosedForSelectedClass
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-stone-100 border-emerald-400 shadow-emerald-950/50'
                          : 'bg-rose-600 hover:bg-rose-500 text-stone-100 border-rose-400 shadow-rose-950/50'
                      }`}
                    >
                      {isTogglingChatStatus ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جاري التحديث...</span>
                        </>
                      ) : isChatClosedForSelectedClass ? (
                        <>
                          <Unlock className="w-5 h-5" />
                          <span>فتح الشات للمجموعة 🔓</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          <span>إغلاق الشات عن المجموعة 🔒</span>
                        </>
                      )}
                    </button>

                    {chatToastNotice && (
                      <div className="bg-amber-500/20 border border-amber-500 text-amber-300 font-black text-xs px-3 py-1.5 rounded-xl animate-fade-in text-center">
                        {chatToastNotice}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Container */}
              <div className="bg-stone-900 border border-stone-800 shadow-2xl rounded-3xl flex flex-col h-[70vh] overflow-hidden">
                {/* Chat Sub-Header */}
                <div className="bg-stone-950 p-4 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl border ${
                      isChatClosedForSelectedClass 
                        ? 'bg-rose-950/60 border-rose-800 text-rose-400' 
                        : 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                    }`}>
                      {isChatClosedForSelectedClass ? <Lock className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                    </div>
                    <div className="text-right">
                      <h4 className="text-stone-100 font-black text-base md:text-lg flex items-center gap-2">
                        شات مجتمع: <span className="text-amber-400">{chatSelectedGroup}</span>
                      </h4>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">
                        {isChatClosedForSelectedClass 
                          ? '🔴 الشات مغلق حالياً عن طلاب هذه المجموعة (يمكنك الكتابة بصفتك القائد)' 
                          : '🟢 الشات مفتوح ومتاح لطلاب هذه المجموعة لإرسال الرسائل'}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-black text-stone-400 bg-white/5 border border-gray-800 px-3 py-1.5 rounded-xl">
                    {adminChatMessages.length} رسالة
                  </span>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-950/30">
                  {adminChatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-6">
                      <MessageCircle className="w-12 h-12 text-gray-600" />
                      <h5 className="text-gray-400 font-black text-lg">لا توجد رسائل في شات {chatSelectedGroup} حتى الآن</h5>
                      <p className="text-xs text-gray-500 max-w-sm">
                        قم بكتابة أول رسالة لتشجيع الطلاب أو توجيه تعليمات خاصة بالصف.
                      </p>
                    </div>
                  ) : (
                    adminChatMessages.map((msg) => {
                      const isAdminMsg = msg.is_admin || msg.student_code === 'ADMIN';

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-3 max-w-[90%] md:max-w-[75%] ${
                            isAdminMsg ? 'mr-auto flex-row-reverse w-full' : 'ml-auto'
                          }`}
                        >
                          <div className={`h-11 w-11 rounded-2xl border-2 flex items-center justify-center text-xl shadow-md shrink-0 ${
                            isAdminMsg ? 'bg-amber-950 border-amber-400' : 'bg-stone-950 border-gray-800'
                          }`}>
                            {isAdminMsg ? '👑' : '👤'}
                          </div>

                          <div className="space-y-1 text-right flex-1">
                            <div className="flex items-center gap-2 justify-end flex-wrap">
                              <span className="text-[10px] text-gray-500 font-bold">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>

                              <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${
                                isAdminMsg 
                                  ? 'text-amber-300 bg-amber-950/90 border-amber-500/50' 
                                  : 'text-stone-200 bg-white/5 border-gray-800'
                              }`}>
                                {msg.student_name}
                                {!isAdminMsg && <span className="text-[10px] font-mono text-gray-400 mr-1">({msg.student_code})</span>}
                              </span>
                            </div>

                            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed border relative group ${
                              isAdminMsg
                                ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-stone-900 text-amber-100 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                : 'bg-stone-950/90 text-stone-100 border-gray-800'
                            }`}>
                              <p className="font-sans font-bold select-text whitespace-pre-wrap">{msg.text}</p>

                              {/* Admin Action Buttons for non-admin messages */}
                              {!isAdminMsg && (
                                <div className="mt-3 pt-2 border-t border-gray-800/80 flex items-center gap-2 justify-end flex-wrap">
                                  <button
                                    onClick={() => setSelectedStudentForAction({
                                      code: msg.student_code,
                                      name: msg.student_name,
                                      className: chatSelectedClass,
                                      messageDocId: msg.id
                                    })}
                                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black px-3 py-1 rounded-xl transition flex items-center gap-1"
                                  >
                                    <Ban className="w-3.5 h-3.5 text-amber-400" />
                                    <span>إدارة/حظر الطالب</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteChatMessageDoc(msg.id)}
                                    className="bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-black px-2.5 py-1 rounded-xl transition flex items-center gap-1"
                                    title="حذف الرسالة"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>حذف</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={adminChatEndRef} />
                </div>

                {/* Admin Message Input */}
                <form onSubmit={handleSendAdminChatMessage} className="p-4 bg-stone-950 border-t border-gray-900 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3.5 rounded-2xl outline-none transition text-right placeholder-gray-500 text-sm md:text-base"
                    placeholder={`اكتب توجيهاً أو رسالة بصفتك الأستاذ أحمد تامر في شات (${chatSelectedClass})...`}
                    value={adminChatInput}
                    onChange={(e) => setAdminChatInput(e.target.value)}
                    disabled={isSendingAdminChat}
                  />
                  <button
                    type="submit"
                    disabled={isSendingAdminChat || !adminChatInput.trim()}
                    className="bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 px-6 py-3.5 rounded-2xl text-stone-100 font-black transition flex items-center justify-center shadow-lg shrink-0 gap-2"
                  >
                    {isSendingAdminChat ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5 transform rotate-180" />
                        <span className="hidden sm:inline">إرسال كالمعلم</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>
          )}

          {activeTab === 'alchemiya' && (
            <AdminCenterEvaluations />
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              
              {/* Statistics Panel Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl text-center relative overflow-hidden">
                  <Users className="w-8 h-8 text-sky-400 mx-auto mb-2" />
                  <span className="text-xs font-black text-gray-500 uppercase block">إجمالي طلاب الأكاديمية</span>
                  <span className="text-4xl font-black text-stone-100 mt-1 block">{students.length}</span>
                </div>

                <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl text-center relative overflow-hidden">
                  <FileSignature className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <span className="text-xs font-black text-gray-500 uppercase block">الاختبارات المنشأة</span>
                  <span className="text-4xl font-black text-stone-100 mt-1 block">{quizzes.length}</span>
                </div>

                <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl text-center relative overflow-hidden">
                  <Play className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <span className="text-xs font-black text-gray-500 uppercase block">فيديوهات المحاضرات</span>
                  <span className="text-4xl font-black text-stone-100 mt-1 block">{videos.length}</span>
                </div>

                <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl text-center relative overflow-hidden">
                  <Database className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <span className="text-xs font-black text-gray-500 uppercase block">محاولات الامتحانات</span>
                  <span className="text-4xl font-black text-stone-100 mt-1 block">{results.length}</span>
                </div>
              </div>

              {/* Quick actions panel */}
              <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl">
                <h4 className="font-sans font-black text-stone-100 text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                  غرفة العمليات وأدوات التحكم
                </h4>
                <p className="text-sm text-gray-400 font-bold leading-relaxed text-right">
                  مرحباً بك يا أستاذ أحمد تامر في قاعدة إدارة العمليات التعليمية لمنصة لغة الضاد. يمكنك استخدام لوحة التحكم العليا لرفع محاضرات الفيديو لصفوف معينة، إنشاء اختبارات قصيرة وإضافة الأسئلة يدوياً أو بواسطة الذكاء الاصطناعي، ومراقبة درجات الطلاب بدقة تامة وإدارة تقييمات طلاب السنتر وطباعة كروت الطلاب ونتائج الامتحانات.
                </p>
              </div>

            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="bg-stone-950 border border-gray-800 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-amber-600/20 rounded-xl">
                  <ScanLine className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tight">مسح درجات الطلاب</h2>
                  <p className="text-gray-400 text-sm mt-1">قم بمسح كود الـ QR الخاص بالطالب بعد إنهاء الامتحان في السنتر</p>
                </div>
              </div>
              
              <div className="max-w-md mx-auto aspect-square overflow-hidden rounded-2xl border border-stone-800 relative bg-stone-950">
                <Scanner 
                  onScan={handleScan}
                  components={{
                    audio: true,
                    torch: true
                  }}
                  formats={["qr_code"]}
                />
                {scanResult && (
                  <div className="absolute inset-0 bg-stone-950/95 flex flex-col items-center justify-center p-6 z-10 text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-stone-100" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">تم تسجيل النتيجة!</h3>
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full text-right space-y-3 mb-6">
                      <p className="text-gray-400 text-sm">الطالب: <span className="text-stone-100 font-bold block mt-1">{scanResult.student_name}</span></p>
                      <p className="text-gray-400 text-sm">الكود: <span className="text-stone-100 font-bold block mt-1">{scanResult.student_code}</span></p>
                      <p className="text-gray-400 text-sm">الصف: <span className="text-stone-100 font-bold block mt-1">{scanResult.class_name}</span></p>
                      <p className="text-gray-400 text-sm">النتيجة: <span className="text-green-500 font-black block mt-1 text-xl">{scanResult.score}</span></p>
                      <p className="text-gray-400 text-sm">الوقت: <span className="text-stone-100 font-bold block mt-1">{new Date(scanResult.timestamp).toLocaleString('ar-EG')}</span></p>
                    </div>
                    <button 
                      onClick={() => setScanResult(null)}
                      className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-stone-100 font-bold transition w-full shadow-lg"
                    >
                      مسح طالب آخر
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              
              {/* Search and filter UI */}
              <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3 rounded-xl outline-none transition text-right"
                    placeholder="ابحث بالاسم، الكود، أو الهاتف..."
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                  />
                  <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                </div>

                <select
                  className="bg-stone-950 border-2 border-gray-800 focus:border-amber-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                >
                  <option value="all">كل الصفوف الدراسية</option>
                  <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                  <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                  <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                  <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                  <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                  <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                </select>

                <select
                  className="bg-stone-950 border-2 border-gray-800 focus:border-amber-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={filterGroup}
                  onChange={e => setFilterGroup(e.target.value)}
                >
                  <option value="all">كل المجموعات (الأيام)</option>
                  {centerGroups.map(g => (
                    <option key={g.id} value={g.group_name}>
                      {g.group_name} ({g.class_name})
                    </option>
                  ))}
                  <option value="السبت">السبت</option>
                  <option value="الأحد">الأحد</option>
                  <option value="الإثنين">الإثنين</option>
                  <option value="الثلاثاء">الثلاثاء</option>
                  <option value="الأربعاء">الأربعاء</option>
                  <option value="الخميس">الخميس</option>
                  <option value="الجمعة">الجمعة</option>
                </select>
              </div>

              {/* Students directory list */}
              <div className="bg-stone-950/60 border border-gray-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950 text-gray-400 font-bold text-sm">
                      <th className="p-4">كود الطالب</th>
                      <th className="p-4">اسم الطالب</th>
                      <th className="p-4">كلمة المرور</th>
                      <th className="p-4">رقم الهاتف</th>
                      <th className="p-4">الصف</th>
                      <th className="p-4">المجموعة</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500 font-bold text-sm">
                          لا يوجد طلاب مسجلين يطابقون خيارات البحث الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => (
                        <tr key={s.id || idx} className="border-b border-gray-900 hover:bg-white/5 transition font-bold text-sm">
                          <td className="p-4 font-mono text-amber-500">{s.code}</td>
                          {editingStudent === s.id ? (
                            <>
                              <td className="p-4"><input className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded" value={editStudentData.name} onChange={(e) => setEditStudentData({...editStudentData, name: e.target.value})} /></td>
                              <td className="p-4"><input className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded" value={editStudentData.password || ''} onChange={(e) => setEditStudentData({...editStudentData, password: e.target.value})} /></td>
                              <td className="p-4"><input className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded" value={editStudentData.phone} onChange={(e) => setEditStudentData({...editStudentData, phone: e.target.value})} /></td>
                              <td className="p-4">
                                <select className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded" value={editStudentData.class_name} onChange={(e) => setEditStudentData({...editStudentData, class_name: e.target.value})}>
                                  <option value="الصف الأول الابتدائي">الأول الابتدائي</option>
                                  <option value="الصف الثاني الابتدائي">الثاني الابتدائي</option>
                                  <option value="الصف الثالث الابتدائي">الثالث الابتدائي</option>
                                  <option value="الصف الرابع الابتدائي">الرابع الابتدائي</option>
                                  <option value="الصف الخامس الابتدائي">الخامس الابتدائي</option>
                                  <option value="الصف السادس الابتدائي">السادس الابتدائي</option>
                                  <option value="الصف الأول الإعدادي">الأول الإعدادي</option>
                                  <option value="الصف الثاني الإعدادي">الثاني الإعدادي</option>
                                  <option value="الصف الثالث الإعدادي">الثالث الإعدادي</option>
                                  <option value="الصف الأول الثانوي">الأول الثانوي</option>
                                  <option value="الصف الثاني الثانوي">الثاني الثانوي</option>
                                  <option value="الصف الثالث الثانوي">الثالث الثانوي</option>
                                </select>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1.5 min-w-[160px]">
                                  <select
                                    className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1.5 rounded text-xs font-bold"
                                    value={editStudentData.group_name || editStudentData.groupName || ''}
                                    onChange={(e) => setEditStudentData({
                                      ...editStudentData,
                                      group_name: e.target.value,
                                      groupName: e.target.value
                                    })}
                                  >
                                    <option value="" disabled>اختر المجموعة...</option>
                                    {centerGroups
                                      .filter(g => !editStudentData.class_name || g.class_name === editStudentData.class_name)
                                      .map(g => (
                                        <option key={g.id} value={g.group_name}>
                                          {g.group_name} ({g.day_of_week})
                                        </option>
                                      ))}
                                    {centerGroups.length === 0 && (
                                      <>
                                        <option value="مجموعة السبت والثلثاء">مجموعة السبت والثلثاء</option>
                                        <option value="مجموعة الأحد والأربعاء">مجموعة الأحد والأربعاء</option>
                                        <option value="مجموعة الإثنين والخميس">مجموعة الإثنين والخميس</option>
                                        <option value="مجموعة الجمعة">مجموعة الجمعة</option>
                                      </>
                                    )}
                                    {editStudentData.group_name && !centerGroups.some(g => g.group_name === editStudentData.group_name) && (
                                      <option value={editStudentData.group_name}>{editStudentData.group_name}</option>
                                    )}
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="أو اكتب اسم مجموعة مخصص..."
                                    value={editStudentData.group_name || ''}
                                    onChange={(e) => setEditStudentData({
                                      ...editStudentData,
                                      group_name: e.target.value,
                                      groupName: e.target.value
                                    })}
                                    className="w-full bg-stone-950 border border-stone-800 text-stone-300 px-2 py-1 rounded text-[11px] font-bold"
                                  />
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <button onClick={() => handleSaveStudentEdit(s.id)} className="bg-green-600 hover:bg-green-500 text-stone-100 px-3 py-1 rounded text-xs ml-2">حفظ</button>
                                <button onClick={() => setEditingStudent(null)} className="bg-gray-600 hover:bg-gray-500 text-stone-100 px-3 py-1 rounded text-xs">إلغاء</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-4 text-stone-100 uppercase">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{s.name}</span>
                                  {s.is_banned && (
                                    <span className="bg-red-950/80 border border-red-700 text-red-300 text-[10px] px-2 py-0.5 rounded-md font-black animate-pulse">
                                      محظور منصة 🛑
                                    </span>
                                  )}
                                  {!s.is_banned && s.is_chat_banned && (
                                    <span className="bg-amber-950/80 border border-amber-700 text-amber-300 text-[10px] px-2 py-0.5 rounded-md font-black">
                                      محظور شات 🚫
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 font-mono text-sky-400">{s.password || 'بلا كلمة مرور'}</td>
                              <td className="p-4 text-gray-400 font-mono">{s.phone}</td>
                              <td className="p-4 text-gray-300">{s.class_name}</td>
                              <td className="p-4 text-gray-300">{s.group_name}</td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                  <button 
                                    onClick={() => {
                                      setEditingStudent(s.id);
                                      setEditStudentData(s);
                                    }} 
                                    className="text-gray-400 hover:text-stone-100 transition text-xs font-bold"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    onClick={() => setSelectedStudentForAction({
                                      id: s.id,
                                      code: s.code,
                                      name: s.name,
                                      className: s.class_name || s.className || '',
                                      is_chat_banned: !!s.is_chat_banned,
                                      is_banned: !!s.is_banned
                                    })}
                                    className="text-xs px-2.5 py-1 rounded-xl border border-amber-600/80 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 font-black transition flex items-center gap-1"
                                  >
                                    <Ban className="w-3 h-3" />
                                    <span>إدارة الحظر</span>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'videos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Add lecture panel */}
              <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl h-fit">
                <h4 className="font-sans font-black text-stone-100 text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                  رفع محاضرة جديدة للأبطال
                </h4>

                <form onSubmit={handleAddVideo} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">عنوان المحاضرة</label>
                    <input
                      type="text"
                      required
                      placeholder="عنوان المحاضرة بالتفصيل"
                      className="w-full bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3 rounded-xl outline-none"
                      value={newVideo.title}
                      onChange={e => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">الصف الدراسي المستهدف</label>
                    <select
                      className="w-full bg-stone-950 border-2 border-gray-800 focus:border-amber-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                      value={newVideo.className}
                      onChange={e => setNewVideo(prev => ({ ...prev, className: e.target.value }))}
                    >
                      <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                      <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                      <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                      <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                      <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                      <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                      <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                      <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                      <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                      <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                      <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                      <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">رابط فيديو يوتيوب (YouTube URL)</label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل رابط يوتيوب (Youtube URL)"
                      className="w-full bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3 rounded-xl outline-none text-left"
                      dir="ltr"
                      value={newVideo.url}
                      onChange={e => setNewVideo(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploadingVideo}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-100 font-black py-3 rounded-xl transition"
                  >
                    {isUploadingVideo ? 'جاري الرفع...' : 'رفع المحاضرة'}
                  </button>
                </form>
              </div>

              {/* Uploaded lectures list */}
              <div className="lg:col-span-2 bg-stone-950/60 border border-gray-800 p-6 rounded-2xl">
                <h4 className="font-sans font-black text-stone-100 text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                  المحاضرات الحالية المرفوعة على المنصة
                </h4>

                {videos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 font-bold text-sm">
                    لا توجد محاضرات مرفوعة حالياً.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {videos.map(v => (
                      <div key={v.id} className="bg-white/5 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                        <div className="text-right">
                          <span className="text-md font-bold text-stone-100 block">{v.title}</span>
                          <span className="text-xs bg-red-950 text-amber-400 border border-red-900/40 px-2 py-0.5 rounded inline-block mt-2 font-mono">
                            {v.class_name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteVideo(v.id)}
                          className="text-rose-500 hover:text-rose-400 p-2 border border-rose-950/40 hover:bg-rose-950/20 rounded-xl transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              
              {!selectedQuiz ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Create quiz form */}
                  <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl h-fit">
                    <h4 className="font-sans font-black text-stone-100 text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      تهيئة وإنشاء اختبار جديد
                    </h4>

                    <form onSubmit={handleCreateQuiz} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">اسم الاختبار</label>
                        <input
                          type="text"
                          required
                          placeholder="اسم الاختبار، مثل: مراجعة قواعد الوحدة الأولى"
                          className="w-full bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3 rounded-xl outline-none"
                          value={newQuiz.quiz_name}
                          onChange={e => setNewQuiz(prev => ({ ...prev, quiz_name: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">الصف الدراسي المستهدف</label>
                        <select
                          className="w-full bg-stone-950 border-2 border-gray-800 focus:border-amber-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                          value={newQuiz.className}
                          onChange={e => setNewQuiz(prev => ({ ...prev, className: e.target.value }))}
                        >
                          <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                          <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                          <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                          <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                          <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                          <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                          <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                          <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                          <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                          <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                          <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                          <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">مدة الاختبار (بالدقائق)</label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          required
                          placeholder="المدة بالدقائق، مثلاً: 20"
                          className="w-full bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3 rounded-xl outline-none"
                          value={newQuiz.duration_minutes}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const val = e.target.value;
                            setNewQuiz(prev => ({
                              ...prev,
                              duration_minutes: val === '' ? '' : Math.max(0, parseInt(val) || 0)
                            }));
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isCreatingQuiz}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-stone-100 font-black py-3 rounded-xl transition"
                      >
                        {isCreatingQuiz ? 'جاري الإنشاء...' : 'إنشاء الاختبار'}
                      </button>
                    </form>
                  </div>

                  {/* Quizzes list */}
                  <div className="lg:col-span-2 bg-stone-950/60 border border-gray-800 p-6 rounded-2xl">
                    <h4 className="font-sans font-black text-stone-100 text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      بنك الاختبارات والامتحانات الحالية
                    </h4>

                    {quizzes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 font-bold text-sm">
                        لا توجد اختبارات منشأة بعد.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {quizzes.map(q => (
                          <div key={q.id} className="bg-white/5 border border-gray-800 p-5 rounded-2xl flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                                  q.is_active 
                                    ? 'bg-green-950/40 text-green-400 border-green-900/60' 
                                    : 'bg-gray-900 text-gray-400 border-gray-800'
                                }`}>
                                  {q.is_active ? 'نشط ومتاح' : 'غير نشط'}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded">
                                    ⏳ {q.duration_minutes || 20} دقيقة
                                  </span>
                                  <span className="text-xs font-black text-gray-500">{q.class_name}</span>
                                </div>
                              </div>
                              <h5 className="text-lg font-black text-stone-100 mb-6 leading-snug">{q.quiz_name}</h5>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenQuizDetails(q)}
                                className="flex-1 bg-white text-black hover:bg-gray-200 py-2.5 rounded-xl font-black transition text-center text-sm"
                              >
                                إدارة الأسئلة
                              </button>

                              <button
                                onClick={() => toggleQuizStatus(q.id, q.is_active)}
                                className={`p-2.5 rounded-xl border transition ${
                                  q.is_active 
                                    ? 'border-green-900 text-green-400 hover:bg-green-950/20' 
                                    : 'border-gray-800 text-gray-400 hover:bg-gray-800'
                                }`}
                              >
                                {q.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                              </button>

                              <button
                                onClick={() => handleDeleteQuiz(q.id)}
                                className="p-2.5 rounded-xl border border-rose-900/40 text-rose-500 hover:bg-rose-950/20 transition"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Detailed quiz view */}
                  <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
                    <button
                      onClick={() => setSelectedQuiz(null)}
                      className="text-gray-400 hover:text-stone-100 flex items-center gap-2 font-black transition text-sm"
                    >
                      <ArrowLeft className="w-5 h-5" /> عودة لقائمة الاختبارات
                    </button>

                    <h4 className="text-xl md:text-2xl font-black text-stone-100 italic uppercase">
                      الاختبار: {selectedQuiz.quiz_name} ({quizQuestions.length} أسئلة)
                    </h4>
                  </div>

                  {/* AI Question Generator Box */}
                  <div className="bg-gradient-to-r from-cyan-950/40 via-stone-950/80 to-purple-950/40 border-2 border-cyan-500/30 p-6 rounded-2xl h-fit max-w-3xl mx-auto shadow-2xl relative overflow-hidden mb-6">
                    <div className="flex items-center gap-3 border-b border-cyan-800/40 pb-3 mb-4">
                      <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/40">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h5 className="font-sans font-black text-stone-100 text-lg tracking-wide">
                          توليد أسئلة الاختبار بالذكاء الاصطناعي (AI) 🤖✨
                        </h5>
                        <p className="text-xs font-bold text-cyan-300">
                          أنشئ أسئلة اختيار من متعدد مع تعريب الرموز والقوانين تلقائياً إضافةً إلى هذا الاختبار مباشرة
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-cyan-300 uppercase mb-1 text-right">عنوان الموضوع / المفهوم العلمي</label>
                        <input
                          type="text"
                          placeholder="مثال: التفاعلات الكيميائية والموازنة، قانون أوم، المقاومة والتوصيل..."
                          className="w-full bg-stone-900/90 border-2 border-stone-700 focus:border-cyan-400 text-stone-100 font-bold p-3 rounded-xl outline-none text-right"
                          value={aiTopic}
                          onChange={e => setAiTopic(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-black text-stone-400 mb-1 text-right">الصف الدراسي</label>
                          <select
                            className="w-full bg-stone-900 border-2 border-stone-700 text-stone-100 rounded-xl p-2.5 text-xs font-bold outline-none"
                            value={aiClass}
                            onChange={e => setAiClass(e.target.value)}
                          >
                            <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                            <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                            <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                            <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                            <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                            <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-stone-400 mb-1 text-right">مستوى الصعوبة</label>
                          <select
                            className="w-full bg-stone-900 border-2 border-stone-700 text-stone-100 rounded-xl p-2.5 text-xs font-bold outline-none"
                            value={aiDifficulty}
                            onChange={e => setAiDifficulty(e.target.value)}
                          >
                            <option value="سهل">سهل (أساسي)</option>
                            <option value="متوسط">متوسط (منهجي)</option>
                            <option value="متقدم">متقدم (للمتفوقين)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-stone-400 mb-1 text-right">عدد الأسئلة</label>
                          <select
                            className="w-full bg-stone-900 border-2 border-stone-700 text-stone-100 rounded-xl p-2.5 text-xs font-bold outline-none"
                            value={aiNumQuestions}
                            onChange={e => setAiNumQuestions(Number(e.target.value))}
                          >
                            <option value={3}>3 أسئلة</option>
                            <option value={5}>5 أسئلة</option>
                            <option value={10}>10 أسئلة</option>
                            <option value={15}>15 سؤالاً</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-stone-400 mb-1 text-right">نص إضافي أو مقتطف من كتاب (اختياري)</label>
                        <textarea
                          rows={2}
                          placeholder="يمكنك لصق فقرة أو قوانين معينة ترغب أن يستند إليها الذكاء الاصطناعي..."
                          className="w-full bg-stone-900/90 border-2 border-stone-700 focus:border-cyan-400 text-stone-100 font-bold p-3 rounded-xl outline-none text-right text-xs"
                          value={aiCustomText}
                          onChange={e => setAiCustomText(e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateAiQuiz}
                        disabled={isGeneratingAi}
                        className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 rounded-xl transition shadow-xl text-base flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isGeneratingAi ? (
                          <>
                            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            جاري إنشاء الأسئلة بالذكاء الاصطناعي...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            توليد وإضافة الأسئلة للاختبار بالذكاء الاصطناعي
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Manual question addition */}
                  <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl h-fit max-w-3xl mx-auto">
                    <h5 className="font-sans font-black text-stone-100 text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      إضافة سؤال جديد للاختبار ✍️
                    </h5>

                    <form onSubmit={handleAddQuestion} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">نص السؤال</label>
                        <input
                          type="text"
                          required
                          placeholder="أدخل نص السؤال في اللغة العربية (مثال: ما إعراب كلمة 'العلمُ' في جملة 'العلمُ نورٌ'؟)"
                          className="w-full bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3 rounded-xl outline-none text-right"
                          value={newQuestion.question_text}
                          onChange={e => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="text"
                          required
                          placeholder="الخيار أ"
                          className="bg-white/5 border-2 border-gray-800 focus:border-cyan-500 text-stone-100 font-bold p-3 rounded-xl outline-none text-right"
                          value={newQuestion.choice_a}
                          onChange={e => setNewQuestion(prev => ({ ...prev, choice_a: e.target.value }))}
                        />
                        <input
                          type="text"
                          required
                          placeholder="الخيار ب"
                          className="bg-white/5 border-2 border-gray-800 focus:border-cyan-500 text-stone-100 font-bold p-3 rounded-xl outline-none text-right"
                          value={newQuestion.choice_b}
                          onChange={e => setNewQuestion(prev => ({ ...prev, choice_b: e.target.value }))}
                        />
                        <input
                          type="text"
                          required
                          placeholder="الخيار ج"
                          className="bg-white/5 border-2 border-gray-800 focus:border-cyan-500 text-stone-100 font-bold p-3 rounded-xl outline-none text-right"
                          value={newQuestion.choice_c}
                          onChange={e => setNewQuestion(prev => ({ ...prev, choice_c: e.target.value }))}
                        />
                        <input
                          type="text"
                          required
                          placeholder="الخيار د"
                          className="bg-white/5 border-2 border-gray-800 focus:border-cyan-500 text-stone-100 font-bold p-3 rounded-xl outline-none text-right"
                          value={newQuestion.choice_d}
                          onChange={e => setNewQuestion(prev => ({ ...prev, choice_d: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">الإجابة الصحيحة</label>
                        <select
                          className="w-full bg-stone-950 border-2 border-gray-800 focus:border-cyan-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                          value={newQuestion.correct_answer}
                          onChange={e => setNewQuestion(prev => ({ ...prev, correct_answer: e.target.value }))}
                        >
                          <option value="A">الإجابة الصحيحة: أ</option>
                          <option value="B">الإجابة الصحيحة: ب</option>
                          <option value="C">الإجابة الصحيحة: ج</option>
                          <option value="D">الإجابة الصحيحة: د</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-stone-100 font-black py-3.5 rounded-xl transition shadow-lg text-base"
                      >
                        إضافة السؤال للاختبار
                      </button>
                    </form>
                  </div>

                  {/* Questions List */}
                  <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl">
                    <h4 className="font-sans font-black text-stone-100 text-lg tracking-wider mb-4 border-b border-gray-800 pb-3">
                      أسئلة الاختبار الحالي المنشأة
                    </h4>

                    {quizQuestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 font-bold text-sm">
                        لا توجد أسئلة مضافة في هذا الاختبار حالياً.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {quizQuestions.map((q, idx) => (
                          <div key={q.id || idx} className="bg-white/5 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                            {editingQuestion === q.id ? (
                              <div className="flex-1 text-right pl-4 space-y-2">
                                <input className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded text-sm mb-2" value={editQuestionData.question_text} onChange={(e) => setEditQuestionData({...editQuestionData, question_text: e.target.value})} />
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <input className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded" value={editQuestionData.choice_a} onChange={(e) => setEditQuestionData({...editQuestionData, choice_a: e.target.value})} placeholder="الخيار أ" />
                                  <input className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded" value={editQuestionData.choice_b} onChange={(e) => setEditQuestionData({...editQuestionData, choice_b: e.target.value})} placeholder="الخيار ب" />
                                  <input className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded" value={editQuestionData.choice_c} onChange={(e) => setEditQuestionData({...editQuestionData, choice_c: e.target.value})} placeholder="الخيار ج" />
                                  <input className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded" value={editQuestionData.choice_d} onChange={(e) => setEditQuestionData({...editQuestionData, choice_d: e.target.value})} placeholder="الخيار د" />
                                </div>
                                <select className="w-full bg-gray-900 border border-gray-700 text-stone-100 px-2 py-1 rounded text-xs mt-2" value={editQuestionData.correct_answer} onChange={(e) => setEditQuestionData({...editQuestionData, correct_answer: e.target.value})}>
                                  <option value="A">الخيار الصحيح: أ</option>
                                  <option value="B">الخيار الصحيح: ب</option>
                                  <option value="C">الخيار الصحيح: ج</option>
                                  <option value="D">الخيار الصحيح: د</option>
                                </select>
                                <div className="mt-2 flex gap-2">
                                  <button onClick={() => handleSaveQuestionEdit(q.id)} className="bg-green-600 hover:bg-green-500 text-stone-100 px-3 py-1 rounded text-xs font-bold">حفظ التعديلات</button>
                                  <button onClick={() => setEditingQuestion(null)} className="bg-gray-600 hover:bg-gray-500 text-stone-100 px-3 py-1 rounded text-xs font-bold">إلغاء</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-right">
                                  <span className="text-md font-bold text-stone-100 block">
                                    {idx + 1}. {q.question_text}
                                  </span>
                                  <span className="text-xs text-green-400 font-bold block mt-2">
                                    الخيار الصحيح: {q.correct_answer === "A" ? "أ" : q.correct_answer === "B" ? "ب" : q.correct_answer === "C" ? "ج" : "د"}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingQuestion(q.id);
                                      setEditQuestionData(q);
                                    }}
                                    className="text-gray-400 hover:text-stone-100 p-2 border border-gray-800 hover:bg-gray-800 rounded-xl transition text-xs font-bold"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="text-rose-500 hover:text-rose-400 p-2 border border-rose-950/40 hover:bg-rose-950/20 rounded-xl transition"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-6">

              {/* Subtab Navigation */}
              <div className="flex border-b border-gray-800 gap-4 pb-2">
                <button
                  onClick={() => setResultsSubTab('list')}
                  className={`px-6 py-3 rounded-xl font-black transition text-sm flex items-center gap-2 ${
                    resultsSubTab === 'list'
                      ? 'bg-amber-600 text-stone-100 shadow-lg'
                      : 'bg-stone-900 border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" /> سجل نتائج ودرجات الطلاب
                </button>

                <button
                  onClick={() => setResultsSubTab('analytics')}
                  className={`px-6 py-3 rounded-xl font-black transition text-sm flex items-center gap-2 ${
                    resultsSubTab === 'analytics'
                      ? 'bg-amber-600 text-stone-100 shadow-lg'
                      : 'bg-stone-900 border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" /> تحليلات الأسئلة الأكثر خطأً للطلاب 📊
                </button>
              </div>
              
              {/* Search and filter UI */}
              <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-white/5 border-2 border-gray-800 focus:border-amber-500 text-stone-100 font-bold p-3 rounded-xl outline-none transition text-right"
                    placeholder="ابحث بالاسم أو الكود..."
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                  />
                  <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                </div>

                <select
                  className="bg-stone-950 border-2 border-gray-800 focus:border-amber-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                >
                  <option value="all">كل الصفوف الدراسية</option>
                  <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                  <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                  <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                  <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                  <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                  <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                </select>

                <select
                  className="bg-stone-950 border-2 border-gray-800 focus:border-amber-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={filterGroup}
                  onChange={e => setFilterGroup(e.target.value)}
                >
                  <option value="all">كل المجموعات (الأيام)</option>
                  <option value="السبت">السبت</option>
                  <option value="الأحد">الأحد</option>
                  <option value="الإثنين">الإثنين</option>
                  <option value="الثلاثاء">الثلاثاء</option>
                  <option value="الأربعاء">الأربعاء</option>
                  <option value="الخميس">الخميس</option>
                  <option value="الجمعة">الجمعة</option>
                </select>
              </div>

              {resultsSubTab === 'list' && (
                <div className="bg-stone-950/60 border border-gray-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950 text-gray-400 font-bold text-sm">
                        <th className="p-4">كود البطل</th>
                        <th className="p-4">الاسم</th>
                        <th className="p-4">الاختبار</th>
                        <th className="p-4">الصف والمجموعة</th>
                        <th className="p-4">الدرجة</th>
                        <th className="p-4">إجابات الطالب والتصحيح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500 font-bold text-sm">
                            لا توجد سجلات درجات تطابق معايير البحث الحالية.
                          </td>
                        </tr>
                      ) : (
                        filteredResults.map((r, idx) => (
                          <tr key={r.id || idx} className="border-b border-gray-900 hover:bg-white/5 transition font-bold text-sm">
                            <td className="p-4 font-mono text-amber-500">{r.student_code}</td>
                            <td className="p-4 text-stone-100 uppercase">{r.student_name}</td>
                            <td className="p-4 text-gray-300">{r.quiz_name}</td>
                            <td className="p-4 text-gray-400">
                              {r.class_name} <br />
                              <span className="text-xs text-gray-500">مجموعة: {r.group_name}</span>
                            </td>
                            <td className="p-4">
                              <span className="bg-rose-950 text-rose-400 border border-rose-900/40 px-3 py-1.5 rounded-lg font-mono">
                                {r.score} / {r.total_questions} درجة
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => setSelectedResultDetails(r)}
                                className="bg-amber-600/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5"
                              >
                                <Eye className="w-4 h-4" /> عرض أخطاء وإجابات الطالب
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {resultsSubTab === 'analytics' && (() => {
                // Filter student results matching filter criteria
                const questionsMap: Record<string, {
                  question_text: string;
                  correct_answer: string;
                  quiz_name: string;
                  choice_a: string;
                  choice_b: string;
                  choice_c: string;
                  choice_d: string;
                  total_answers: number;
                  wrong_count: number;
                  choices_chosen: Record<string, number>;
                }> = {};

                const targetResults = analyticsSelectedQuizId === 'all'
                  ? filteredResults
                  : filteredResults.filter(r => r.quiz_id === analyticsSelectedQuizId);

                targetResults.forEach(r => {
                  if (Array.isArray(r.student_answers)) {
                    r.student_answers.forEach((ans: any) => {
                      const key = ans.question_id || ans.question_text;
                      if (!key) return;
                      if (!questionsMap[key]) {
                        questionsMap[key] = {
                          question_text: ans.question_text,
                          correct_answer: ans.correct_answer,
                          quiz_name: r.quiz_name,
                          choice_a: ans.choice_a || '',
                          choice_b: ans.choice_b || '',
                          choice_c: ans.choice_c || '',
                          choice_d: ans.choice_d || '',
                          total_answers: 0,
                          wrong_count: 0,
                          choices_chosen: { A: 0, B: 0, C: 0, D: 0, 'لم يجب': 0 }
                        };
                      }
                      questionsMap[key].total_answers += 1;
                      if (ans.selected_answer !== ans.correct_answer) {
                        questionsMap[key].wrong_count += 1;
                      }
                      const chosen = ans.selected_answer || 'لم يجب';
                      questionsMap[key].choices_chosen[chosen] = (questionsMap[key].choices_chosen[chosen] || 0) + 1;
                    });
                  }
                });

                const sortedMissed = Object.values(questionsMap).sort((a, b) => {
                  const rateA = a.total_answers ? (a.wrong_count / a.total_answers) : 0;
                  const rateB = b.total_answers ? (b.wrong_count / b.total_answers) : 0;
                  return rateB - rateA;
                });

                return (
                  <div className="space-y-6">
                    {/* Quiz Filter dropdown for Analytics */}
                    <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h4 className="text-xl font-black text-stone-100 flex items-center gap-2">
                          <BarChart3 className="w-6 h-6 text-amber-500" /> تحليل أكثر الأسئلة صعوبة وأخطاءً
                        </h4>
                        <p className="text-xs text-stone-400 mt-1">
                          يساعدك هذا التحليل الفوري في معرفة الأسئلة النقاط المفصلية التي يخطئ فيها الطلاب لإعادة شرحها وتوضيحها.
                        </p>
                      </div>

                      <div className="w-full md:w-auto">
                        <select
                          className="w-full bg-stone-950 border-2 border-amber-600/60 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                          value={analyticsSelectedQuizId}
                          onChange={e => setAnalyticsSelectedQuizId(e.target.value)}
                        >
                          <option value="all">تحديد اختبار معين للتحليل (الكل)</option>
                          {quizzes.map(q => (
                            <option key={q.id} value={q.id}>{q.quiz_name} ({q.class_name})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {sortedMissed.length === 0 ? (
                      <div className="bg-stone-950/60 border border-gray-800 p-12 rounded-2xl text-center text-stone-500 font-bold">
                        لا توجد إجابات مسجلة تفصيلية لهذا الاختبار حتى الآن. بمجرد أن يؤدي الطلاب الاختبار ستظهر تحليلات الأخطاء فوراً.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sortedMissed.map((q, idx) => {
                          const errorPercentage = Math.round((q.wrong_count / q.total_answers) * 100);
                          return (
                            <div key={idx} className="bg-stone-950/80 border border-gray-800 p-6 rounded-2xl space-y-4">
                              <div className="flex flex-wrap justify-between items-start gap-2">
                                <div className="space-y-1">
                                  <span className="text-xs font-black bg-rose-950 border border-rose-900 text-rose-400 px-2.5 py-1 rounded inline-block">
                                    المرتبة #{idx + 1} في الأخطاء
                                  </span>
                                  <h5 className="text-lg font-black text-stone-100">{q.question_text}</h5>
                                  <span className="text-xs text-stone-500 font-bold block">الاختبار: {q.quiz_name}</span>
                                </div>

                                <div className="text-right">
                                  <span className="text-2xl font-mono font-black text-rose-400 block">
                                    %{errorPercentage} خطأ
                                  </span>
                                  <span className="text-xs text-stone-400 block">
                                    أخطأ فيه {q.wrong_count} من أصل {q.total_answers} طالب
                                  </span>
                                </div>
                              </div>

                              {/* Error Progress Bar */}
                              <div className="w-full bg-stone-900 h-3 rounded-full overflow-hidden border border-gray-800">
                                <div
                                  className="bg-gradient-to-r from-amber-500 to-rose-600 h-full transition-all duration-500"
                                  style={{ width: `${errorPercentage}%` }}
                                />
                              </div>

                              {/* Choices breakdown */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                {[
                                  { label: 'A', text: q.choice_a, isCorrect: q.correct_answer === 'A', count: q.choices_chosen['A'] || 0 },
                                  { label: 'B', text: q.choice_b, isCorrect: q.correct_answer === 'B', count: q.choices_chosen['B'] || 0 },
                                  { label: 'C', text: q.choice_c, isCorrect: q.correct_answer === 'C', count: q.choices_chosen['C'] || 0 },
                                  { label: 'D', text: q.choice_d, isCorrect: q.correct_answer === 'D', count: q.choices_chosen['D'] || 0 },
                                ].map(c => (
                                  <div
                                    key={c.label}
                                    className={`p-3 rounded-xl border text-right ${
                                      c.isCorrect
                                        ? 'bg-green-950/40 border-green-600/60 text-green-300'
                                        : 'bg-stone-900/60 border-stone-800 text-stone-300'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center text-xs font-black mb-1">
                                      <span>الخيار {c.label} {c.isCorrect && '✓ الإجابة الصحيحة'}</span>
                                      <span className="font-mono text-amber-400">{c.count} طالب</span>
                                    </div>
                                    <p className="text-xs font-medium line-clamp-2">{c.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )}

          {activeTab === 'rankings' && (
            <div className="space-y-6">
              
              {/* Rankings generator form */}
              <div className="bg-stone-950/60 border border-gray-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  className="bg-stone-950 border-2 border-gray-800 focus:border-amber-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={rankClass}
                  onChange={e => setRankClass(e.target.value)}
                >
                  <option value="all">كل الصفوف الدراسية (عام)</option>
                  <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                  <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                  <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                  <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                  <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                  <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                </select>

                <select
                  className="bg-stone-950 border-2 border-gray-800 focus:border-amber-500 text-stone-100 rounded-xl p-3 font-bold outline-none cursor-pointer"
                  value={rankGroup}
                  onChange={e => setRankGroup(e.target.value)}
                >
                  <option value="all">كل المجموعات (الأيام)</option>
                  <option value="السبت">السبت</option>
                  <option value="الأحد">الأحد</option>
                  <option value="الإثنين">الإثنين</option>
                  <option value="الثلاثاء">الثلاثاء</option>
                  <option value="الأربعاء">الأربعاء</option>
                  <option value="الخميس">الخميس</option>
                  <option value="الجمعة">الجمعة</option>
                </select>

                <button
                  type="button"
                  onClick={handleGenerateRankings}
                  className="bg-amber-600 hover:bg-amber-500 text-stone-100 font-black py-3 rounded-xl transition text-md uppercase flex items-center justify-center gap-2 shadow-lg"
                >
                  توليد لوحة الشرف للأبطال <Trophy className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                </button>
              </div>

              {/* Leaderboard Podium */}
              <div className="bg-stone-950/60 border border-gray-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950 text-gray-400 font-bold text-sm">
                      <th className="p-4 text-center">الترتيب</th>
                      <th className="p-4">كود واسم الطالب</th>
                      <th className="p-4">المرحلة الدراسية</th>
                      <th className="p-4 text-center">مجموع النقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 font-bold text-sm">
                          يرجى اختيار الصف والمجموعة للبدء في توليد لوحة الشرف للأبطال!
                        </td>
                      </tr>
                    ) : (
                      rankings.map((r, idx) => {
                        let styleClass = "";
                        let rankIcon = `#${idx + 1}`;
                        if (idx === 0) {
                          styleClass = "bg-amber-950/20 text-yellow-300";
                          rankIcon = "🏆 #1";
                        } else if (idx === 1) {
                          styleClass = "bg-slate-900/30 text-slate-300";
                          rankIcon = "🥈 #2";
                        } else if (idx === 2) {
                          styleClass = "bg-amber-950/20 text-amber-500";
                          rankIcon = "🥉 #3";
                        }

                        return (
                          <tr key={idx} className={`border-b border-gray-900 hover:bg-white/5 transition font-bold text-sm ${styleClass}`}>
                            <td className="p-4 text-center font-black">{rankIcon}</td>
                            <td className="p-4">
                              <span className="text-stone-100 block uppercase">{r.name}</span>
                              <span className="text-xs text-amber-500 font-mono mt-0.5 block">{r.code}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-gray-300 block">{r.className}</span>
                              <span className="text-xs text-gray-500 mt-0.5 block">مجموعة: {r.groupName}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="bg-amber-600 text-stone-100 border-2 border-black px-3 py-1 font-black rounded font-mono">
                                {r.totalScore}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Tab: Messages */}
          {activeTab === 'messages' && (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-black text-stone-100 italic tracking-widest uppercase flex items-center gap-2">
                  <span className="bg-rose-600 w-2 h-8 block"></span>
                  رسائل الطلاب والإنذارات الحية
                </h2>
                
                {messages.length > 0 && (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={handleToggleSelectAllMessages}
                      className="bg-gray-800 hover:bg-gray-750 text-stone-100 font-bold px-4 py-2 rounded-xl text-xs transition border border-gray-700 flex items-center gap-1.5"
                    >
                      {selectedMessageIds.length === messages.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                    </button>
                    {selectedMessageIds.length > 0 && (
                      <button
                        onClick={handleDeleteSelectedMessages}
                        className="bg-amber-600 hover:bg-amber-500 text-stone-100 font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-red-600/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف المحدد ({selectedMessageIds.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 font-bold">لا توجد رسائل حالياً.</div>
                ) : (
                  messages.map(msg => {
                    const isSelected = selectedMessageIds.includes(msg.id);
                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleToggleMessageSelect(msg.id)}
                        className={`cursor-pointer transition duration-300 bg-stone-950/50 border rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-start relative overflow-hidden ${
                          isSelected ? 'border-rose-500 bg-rose-950/10' : 'border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        <div className="flex items-center justify-center shrink-0 mt-1 md:mt-2">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-rose-600 border-rose-500 text-stone-100 scale-110' : 'border-gray-700 bg-stone-950/50'
                          }`}>
                            {isSelected && <Check className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Message content */}
                        <div className="flex-1 text-right w-full">
                          {msg.is_anonymous && (
                            <div className="absolute top-0 left-12 bg-gray-800 text-gray-300 text-[10px] font-black px-3 py-1 rounded-b-xl border-l border-r border-b border-gray-700">
                              مجهول
                            </div>
                          )}
                          {!msg.is_anonymous && (
                            <div className="absolute top-0 left-12 bg-sky-900/40 text-sky-300 text-[10px] font-black px-3 py-1 rounded-b-xl border-l border-r border-b border-sky-800">
                              باسم الطالب
                            </div>
                          )}

                          {/* Instant single delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingleMessage(msg.id);
                            }}
                            className="absolute left-3 top-3 p-2 rounded-lg bg-gray-900/60 hover:bg-amber-600/20 text-gray-500 hover:text-amber-500 border border-gray-800/80 hover:border-red-900/50 transition"
                            title="حذف الرسالة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="flex justify-between items-start mb-4 pr-1">
                            <div className="text-right">
                              <span className={`block font-black text-lg ${msg.is_anonymous ? 'text-gray-400' : 'text-stone-100'}`}>
                                {msg.student_name}
                              </span>
                              {!msg.is_anonymous && (
                                <span className="text-xs text-sky-400 font-mono block mt-1">{msg.student_code} | {msg.class_name}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-bold ml-12" dir="ltr">
                              {new Date(msg.timestamp).toLocaleString('ar-EG')}
                            </span>
                          </div>
                          
                          <div className="bg-gray-850 p-4 rounded-xl border border-gray-800 text-right">
                            <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed font-semibold">
                              {msg.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'banner' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900 border border-amber-600/30 p-6 rounded-2xl shadow-xl">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <ImageIcon className="w-7 h-7 text-amber-500" />
                    تخصيص صورة الغلاف وبطاقة المعلم
                  </h2>
                  <p className="text-sm text-stone-400 mt-1">
                    يمكنك تغيير صورة الغلاف وصورة المعلم الشخصية والنصوص الظاهرة للطالب فورياً.
                  </p>
                </div>
                <button
                  onClick={handleSaveHeroBanner}
                  disabled={isSavingHero}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl shadow-lg transition duration-200 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-5 h-5" />
                  {isSavingHero ? 'جاري الحفظ...' : 'حفظ الكل'}
                </button>
              </div>

              {heroSaveSuccess && (
                <div className="bg-green-950 border border-green-700 text-green-300 p-4 rounded-xl text-center font-bold">
                  ✓ تم حفظ إعدادات البنر وصورة المعلم بنجاح وستظهر فوراً لجميع الطلاب!
                </div>
              )}

              {/* Live Preview Card */}
              <div className="bg-stone-900/60 border border-stone-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-stone-300 font-bold text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-500" />
                  1. معاينة حية لبنر الغلاف الرئيسي devant الطلاب:
                </h3>

                <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl group min-h-[350px] flex items-end">
                  <div className="absolute inset-0 bg-stone-950">
                    <img 
                      src={heroBanner.imageUrl || DEFAULT_HERO_IMAGE} 
                      alt="Hero Banner Preview" 
                      className="w-full h-full object-cover opacity-60 transition-transform duration-1000 ease-in-out"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_HERO_IMAGE;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent"></div>
                  </div>
                  
                  <div className="relative z-10 p-6 md:p-10 w-full text-right">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-amber-600/20 border border-amber-500/50 text-amber-400 font-bold text-xs tracking-widest mb-3 backdrop-blur-sm">
                      {heroBanner.badgeText || 'مؤسس مصر الحديثة'}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight" dangerouslySetInnerHTML={{ __html: heroBanner.mainTitle || 'مرحباً بك' }}>
                    </h2>
                    <p className="text-base md:text-lg text-stone-300 max-w-2xl font-medium leading-relaxed ml-auto">
                      {heroBanner.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Controls for Hero Banner */}
              <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-6">
                <h3 className="text-stone-200 font-black text-lg border-b border-stone-800 pb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" />
                  إعدادات وعناصر الغلاف
                </h3>

                {/* Image Upload / URL Controls */}
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-stone-300">
                    اختيار صورة الغلاف:
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option A: Upload File */}
                    <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-xs font-bold text-amber-400 block mb-1">رفع صورة غلاف من جهازك 📁</span>
                        <p className="text-xs text-stone-400">اختر صورة من هاتفك أو جهازك (JPG, PNG, WEBP)</p>
                      </div>
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-bold rounded-xl border border-stone-700 transition">
                        <Upload className="w-4 h-4 text-amber-500" />
                        <span>اختر ملف صورة الغلاف...</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleHeroImageFileUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    {/* Option B: Direct URL */}
                    <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-xs font-bold text-amber-400 block mb-1">أو رابط صورة مباشر من الإنترنت 🔗</span>
                        <p className="text-xs text-stone-400">ألصق رابط صورة (URL)</p>
                      </div>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={heroBanner.imageUrl.startsWith('data:') ? '' : heroBanner.imageUrl}
                        onChange={e => setHeroBanner(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-sm p-3 rounded-xl outline-none focus:border-amber-500 font-mono text-left"
                      />
                    </div>
                  </div>

                  {/* Reset Image Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setHeroBanner(prev => ({ ...prev, imageUrl: DEFAULT_HERO_IMAGE }))}
                      className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-amber-400 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      استعادة صورة غلاف محمد علي باشا الافتراضية
                    </button>
                  </div>
                </div>

                {/* Text Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-800">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-300">الشارة العلوية (Badge):</label>
                    <input
                      type="text"
                      value={heroBanner.badgeText}
                      onChange={e => setHeroBanner(prev => ({ ...prev, badgeText: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 text-stone-100 font-bold p-3 rounded-xl outline-none focus:border-amber-500"
                      placeholder="مثلاً: مؤسس مصر الحديثة"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-300">العنوان الرئيسي (يدعم HTML بسيط):</label>
                    <input
                      type="text"
                      value={heroBanner.mainTitle}
                      onChange={e => setHeroBanner(prev => ({ ...prev, mainTitle: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 text-stone-100 font-bold p-3 rounded-xl outline-none focus:border-amber-500"
                      placeholder='مثلاً: مرحباً بك يا <span class="text-amber-500">زعيم المستقبل</span>'
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-stone-300">الوصف الرئيسي:</label>
                  <textarea
                    rows={3}
                    value={heroBanner.description}
                    onChange={e => setHeroBanner(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-100 font-medium p-3 rounded-xl outline-none focus:border-amber-500 resize-none"
                    placeholder="اكتب وصف الغلاف..."
                  />
                </div>
              </div>

              {/* Section 2: Teacher Profile Card Customization */}
              <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-6">
                <h3 className="text-stone-200 font-black text-lg border-b border-stone-800 pb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  2. تخصيص صورة وصندوق المعلم
                </h3>

                {/* Teacher Card Live Preview */}
                <div className="bg-stone-950 border border-stone-800 p-6 rounded-2xl max-w-sm mx-auto text-center space-y-4 relative shadow-xl">
                  <span className="text-xs font-black text-amber-500 bg-amber-950/40 border border-amber-900/60 px-4 py-1 rounded-full uppercase tracking-widest inline-block shadow-lg">
                    {teacherCard.badgeText || 'مؤسس الأكاديمية'}
                  </span>
                  
                  <div className="w-36 h-36 rounded-full border-4 border-stone-800 mx-auto relative p-1 shadow-2xl">
                    <div className="w-full h-full rounded-full border-2 border-dashed border-amber-500/50 p-1 overflow-hidden">
                      <img
                        src={teacherCard.imageUrl || DEFAULT_TEACHER_IMAGE}
                        alt="Teacher Portrait"
                        onError={(e) => { e.currentTarget.src = DEFAULT_TEACHER_IMAGE; }}
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  
                  <h4 className="text-xl font-black text-white">
                    {teacherCard.name || 'الأستاذ أحمد تامر'}
                  </h4>
                  <p className="text-xs font-bold text-amber-400/80">
                    {teacherCard.subtitle || 'خبير تدريس مادة اللغة العربية'}
                  </p>
                  
                  <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl text-xs text-stone-300 font-bold leading-relaxed text-right relative">
                    "{teacherCard.quote}"
                  </div>
                </div>

                {/* Image Controls */}
                <div className="space-y-4 pt-2">
                  <label className="block text-sm font-bold text-stone-300">
                    اختيار صورة المعلم الشخصية:
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Upload File */}
                    <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-xs font-bold text-amber-400 block mb-1">رفع صورة المعلم من جهازك 📸</span>
                        <p className="text-xs text-stone-400">اختر صورة شخصية (JPG, PNG, WEBP)</p>
                      </div>
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-bold rounded-xl border border-stone-700 transition">
                        <Upload className="w-4 h-4 text-amber-500" />
                        <span>اختر ملف صورة المعلم...</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleTeacherImageFileUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    {/* Direct URL */}
                    <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-xs font-bold text-amber-400 block mb-1">أو رابط صورة المعلم من الإنترنت 🔗</span>
                        <p className="text-xs text-stone-400">ألصق رابط صورة مباشر (URL)</p>
                      </div>
                      <input
                        type="url"
                        placeholder="https://example.com/teacher.jpg"
                        value={teacherCard.imageUrl.startsWith('data:') ? '' : teacherCard.imageUrl}
                        onChange={e => setTeacherCard(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-sm p-3 rounded-xl outline-none focus:border-amber-500 font-mono text-left"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setTeacherCard(prev => ({ ...prev, imageUrl: DEFAULT_TEACHER_IMAGE }))}
                      className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-amber-400 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      استعادة صورة المعلم الافتراضية
                    </button>
                  </div>
                </div>

                {/* Text fields for teacher */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-stone-800">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-300">اسم المعلم:</label>
                    <input
                      type="text"
                      value={teacherCard.name}
                      onChange={e => setTeacherCard(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 text-stone-100 font-bold p-3 rounded-xl outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-300">الشارة العلوية:</label>
                    <input
                      type="text"
                      value={teacherCard.badgeText}
                      onChange={e => setTeacherCard(prev => ({ ...prev, badgeText: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 text-stone-100 font-bold p-3 rounded-xl outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-300">اللقب / الوصف القصير:</label>
                    <input
                      type="text"
                      value={teacherCard.subtitle}
                      onChange={e => setTeacherCard(prev => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 text-stone-100 font-bold p-3 rounded-xl outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-stone-300">المقولة الملهمة للمعلم:</label>
                  <textarea
                    rows={2}
                    value={teacherCard.quote}
                    onChange={e => setTeacherCard(prev => ({ ...prev, quote: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-100 font-medium p-3 rounded-xl outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveHeroBanner}
                    disabled={isSavingHero}
                    className="flex items-center gap-2 px-8 py-3.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl shadow-lg transition duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-5 h-5" />
                    {isSavingHero ? 'جاري الحفظ...' : 'حفظ الكل (البنر وبطاقة المعلم)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Result Details & Mistakes Modal */}
      <AnimatePresence>
        {selectedResultDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/90 backdrop-blur-lg flex items-center justify-center p-4"
          >
            <div className="w-full max-w-3xl bg-stone-900 border border-amber-600/50 shadow-2xl rounded-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-6">
                <div>
                  <span className="text-xs font-black bg-amber-600 text-stone-100 px-2.5 py-1 rounded">
                    سجل إجابات وأخطاء البطل
                  </span>
                  <h3 className="text-2xl font-black text-stone-100 mt-2">
                    {selectedResultDetails.student_name} ({selectedResultDetails.student_code})
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    الاختبار: {selectedResultDetails.quiz_name} | الصف: {selectedResultDetails.class_name} ({selectedResultDetails.group_name})
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-rose-950 border border-rose-900 text-rose-400 px-4 py-2 rounded-xl font-mono font-black text-lg">
                    {selectedResultDetails.score} / {selectedResultDetails.total_questions} درجة
                  </div>
                  <button
                    onClick={() => setSelectedResultDetails(null)}
                    className="p-2 bg-stone-800 hover:bg-stone-700 text-gray-300 rounded-xl transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {!Array.isArray(selectedResultDetails.student_answers) || selectedResultDetails.student_answers.length === 0 ? (
                <div className="text-center py-12 text-stone-500 font-bold">
                  لا توجد تفاصيل إجابات محفوظة لهذا السجل (تم أداء هذا الاختبار قبل تحديث نظام تتبع الإجابات التفصيلي).
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedResultDetails.student_answers.map((ans: any, idx: number) => {
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
                            {isCorrect ? 'إجابة صحيحة ✓' : 'إجابة خاطئة ✗'}
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
                                      اختيار الطالب
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT GROUP MODAL */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-950 border border-stone-800 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl text-right"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <h3 className="text-xl font-black text-stone-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  {editingGroup ? 'تعديل بيانات المجموعة' : 'إضافة مجموعة جديدة ➕'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-100 rounded-xl hover:bg-stone-900 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-cyan-400 uppercase tracking-wider mb-2">
                    الصف الدراسي
                  </label>
                  <select
                    required
                    value={groupFormData.class_name}
                    onChange={e => setGroupFormData({ ...groupFormData, class_name: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-700 focus:border-cyan-400 text-stone-100 rounded-2xl p-3.5 font-bold outline-none text-right transition cursor-pointer"
                  >
                    <optgroup label="المرحلة الإعدادية" className="text-stone-900 bg-white font-bold">
                      <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                      <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                      <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                    </optgroup>
                    <optgroup label="المرحلة الثانوية" className="text-stone-900 bg-white font-bold">
                      <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                      <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                      <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-cyan-400 uppercase tracking-wider mb-2">
                    اسم المجموعة (مثال: مجموعة أ - السبت والثلثاء)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب اسم المجموعة هنا..."
                    value={groupFormData.group_name}
                    onChange={e => setGroupFormData({ ...groupFormData, group_name: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-700 focus:border-cyan-400 text-stone-100 rounded-2xl p-3.5 font-bold outline-none text-right transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-cyan-400 uppercase tracking-wider mb-2">
                      أيام الحضور
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: السبت والأربعاء"
                      value={groupFormData.day_of_week}
                      onChange={e => setGroupFormData({ ...groupFormData, day_of_week: e.target.value })}
                      className="w-full bg-stone-900 border border-stone-700 focus:border-cyan-400 text-stone-100 rounded-2xl p-3.5 font-bold outline-none text-right transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-cyan-400 uppercase tracking-wider mb-2">
                      التوقيت / الموعد
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 04:00 مساءً"
                      value={groupFormData.time}
                      onChange={e => setGroupFormData({ ...groupFormData, time: e.target.value })}
                      className="w-full bg-stone-900 border border-stone-700 focus:border-cyan-400 text-stone-100 rounded-2xl p-3.5 font-bold outline-none text-right transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-wider mb-2">
                    ملاحظات أو القاعة/السنتر (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: القاعة الرئيسية - سنتر الأمل"
                    value={groupFormData.notes}
                    onChange={e => setGroupFormData({ ...groupFormData, notes: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-700 focus:border-cyan-400 text-stone-100 rounded-2xl p-3.5 font-bold outline-none text-right transition text-xs"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-stone-800">
                  <button
                    type="submit"
                    disabled={isSavingGroup}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    {isSavingGroup ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <span>{editingGroup ? 'تحديث المجموعة' : 'إضافة المجموعة'}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGroupModalOpen(false)}
                    className="px-5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-black py-3.5 rounded-2xl transition text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Student Ban & Action Modal */}
      <AnimatePresence>
        {selectedStudentForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-right space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <button
                  onClick={() => setSelectedStudentForAction(null)}
                  className="p-2 text-gray-400 hover:text-stone-100 rounded-xl bg-white/5 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/40 text-amber-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-stone-100">إجراءات الحظر وإدارة الطالب</h3>
                    <p className="text-xs text-gray-400 font-bold mt-0.5">اختر نوع الحظر والإجراء المطلوب تنفيذه</p>
                  </div>
                </div>
              </div>

              {/* Student Info Card */}
              <div className="bg-stone-900 border border-gray-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-amber-400 font-mono">{selectedStudentForAction.code}</span>
                  <span className="text-gray-400">كود الطالب:</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-stone-100">{selectedStudentForAction.name}</span>
                  <span className="text-gray-400">اسم الطالب:</span>
                </div>
                {selectedStudentForAction.className && (
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-sky-400">{selectedStudentForAction.className}</span>
                    <span className="text-gray-400">الصف الدراسي:</span>
                  </div>
                )}
              </div>

              {/* Ban Action Buttons */}
              <div className="space-y-3">
                <p className="text-xs font-black text-gray-300">اختر نوع الحظر المطلوب تنفيذه فوراً:</p>

                <button
                  onClick={() => handleSetStudentBanType('chat')}
                  className="w-full bg-amber-950/80 hover:bg-amber-900/90 border-2 border-amber-600/80 text-amber-200 p-4 rounded-2xl font-black text-right transition flex items-start gap-3 shadow-lg cursor-pointer"
                >
                  <Ban className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm font-black text-amber-300">🚫 حظر من الشات فقط</span>
                    <span className="block text-xs font-bold text-gray-400 mt-1 leading-relaxed">
                      يُمنع الطالب من كتابة أي رسالة في شات الصف فقط، مع إمكانية استخدام المنصة بشكل كامل ودخول الامتحان وفيديوهات الدروس.
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSetStudentBanType('platform')}
                  className="w-full bg-rose-950/80 hover:bg-rose-900/90 border-2 border-rose-600/80 text-rose-200 p-4 rounded-2xl font-black text-right transition flex items-start gap-3 shadow-lg cursor-pointer"
                >
                  <UserX className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm font-black text-rose-300">⛔ حظر شامل من المنصة بالكامل</span>
                    <span className="block text-xs font-bold text-gray-400 mt-1 leading-relaxed">
                      يتم حظر حساب الطالب بالكامل من المنصة وتسجيل خروجه فوراً ومنعه من تسجيل الدخول نهائياً.
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleSetStudentBanType('unban')}
                  className="w-full bg-emerald-950/80 hover:bg-emerald-900/90 border-2 border-emerald-600/80 text-emerald-200 p-4 rounded-2xl font-black text-right transition flex items-start gap-3 shadow-lg cursor-pointer"
                >
                  <Check className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm font-black text-emerald-300">✅ إلغاء كافة الحظورات (تفعيل الحساب)</span>
                    <span className="block text-xs font-bold text-gray-400 mt-1 leading-relaxed">
                      إلغاء حظر الشات وحظر المنصة وإعادة تفعيل حماس الطالب.
                    </span>
                  </div>
                </button>

                {selectedStudentForAction.messageDocId && (
                  <button
                    onClick={() => handleDeleteChatMessageDoc(selectedStudentForAction.messageDocId!)}
                    className="w-full bg-stone-900 hover:bg-stone-800 border border-gray-700 text-gray-300 p-3 rounded-2xl font-bold text-center text-xs transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>حذف هذه الرسالة المحددة من الشات</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {chatToastNotice && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-stone-900 border-2 border-amber-500 text-amber-300 px-6 py-3 rounded-2xl font-black text-sm shadow-2xl flex items-center gap-3"
          >
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>{chatToastNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
