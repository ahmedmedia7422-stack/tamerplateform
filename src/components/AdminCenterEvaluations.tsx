import React, { useState, useEffect } from 'react';
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
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Calendar,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  Layers,
  Sparkles,
  MessageCircle,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ShieldAlert,
  Clock,
  Sliders
} from 'lucide-react';

const CLASSES_LIST = [
  { id: '1إعدادي', label: 'الصف الأول الإعدادي', shortLabel: '1 إعدادي', icon: '🧪', color: 'from-cyan-950 to-slate-900 border-cyan-500/40 text-cyan-400' },
  { id: '2إعدادي', label: 'الصف الثاني الإعدادي', shortLabel: '2 إعدادي', icon: '🔬', color: 'from-emerald-950 to-slate-900 border-emerald-500/40 text-emerald-400' },
  { id: '3إعدادي', label: 'الصف الثالث الإعدادي', shortLabel: '3 إعدادي', icon: '⚗️', color: 'from-amber-950 to-slate-900 border-amber-500/40 text-amber-400' },
  { id: '1ثانوي', label: 'الصف الأول الثانوي', shortLabel: '1 ثانوي', icon: '⚛️', color: 'from-indigo-950 to-slate-900 border-indigo-500/40 text-indigo-400' },
  { id: '2ثانوي', label: 'الصف الثاني الثانوي', shortLabel: '2 ثانوي', icon: '🧬', color: 'from-violet-950 to-slate-900 border-violet-500/40 text-violet-400' },
  { id: '3ثانوي', label: 'الصف الثالث الثانوي', shortLabel: '3 ثانوي', icon: '🔮', color: 'from-rose-950 to-slate-900 border-rose-500/40 text-rose-400' }
];

const MONTH_NAMES = [
  "أكتوبر", "نوفمبر", "ديسمبر", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر"
];

const ALL_WEEK_DAYS = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة"
];

export default function AdminCenterEvaluations() {
  // Settings & Active Month State
  const [activeMonth, setActiveMonth] = useState<string>('مارس');
  const [isSavingMonth, setIsSavingMonth] = useState<boolean>(false);

  // Class Selection & Groups State
  const [selectedClass, setSelectedClass] = useState<string>('الصف الأول الإعدادي');
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);

  // Group Form State (Adding / Editing)
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [groupEditingId, setGroupEditingId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    group_name: '',
    class_name: 'الصف الأول الإعدادي',
    selected_days: ['السبت', 'الثلاثاء'] as string[]
  });

  // Edit Student Group Modal State
  const [editingStudentGroup, setEditingStudentGroup] = useState<any | null>(null);
  const [targetNewGroup, setTargetNewGroup] = useState<string>('');
  const [isSavingStudentGroup, setIsSavingStudentGroup] = useState<boolean>(false);

  // Students & Bulk Evaluations State
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bulkSessionNum, setBulkSessionNum] = useState<number | string>(1);
  const [isCompExam, setIsCompExam] = useState<boolean>(false);
  
  // Custom Max Degrees per session
  const [bulkMaxHomework, setBulkMaxHomework] = useState<number | string>(10);
  const [bulkMaxRecitation, setBulkMaxRecitation] = useState<number | string>(10);
  const [bulkMaxExam, setBulkMaxExam] = useState<number | string>(20);
  const [bulkMaxCompExam, setBulkMaxCompExam] = useState<number | string>(50);

  // Local state for table evaluation entries
  // Structure: { [studentCode]: { absent: boolean, homework: number, recitation: number, exam: number, compExam: number } }
  const [bulkEntries, setBulkEntries] = useState<{ [key: string]: any }>({});
  const [isSavingBulk, setIsSavingBulk] = useState<boolean>(false);

  // Individual Student History Drawer State
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<any | null>(null);
  const [studentHistoryRecords, setStudentHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Single student evaluation saving state
  const [savingSingleId, setSavingSingleId] = useState<string | null>(null);

  // Edit existing evaluation record state
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [isSavingRecordEdit, setIsSavingRecordEdit] = useState<boolean>(false);

  // Add new individual evaluation state
  const [showAddSingleModal, setShowAddSingleModal] = useState<boolean>(false);
  const [newSingleRecord, setNewSingleRecord] = useState({
    lesson_date: new Date().toISOString().split('T')[0],
    lesson_month: activeMonth,
    lesson_number: 1,
    attendance: 'حضر',
    homework_degree: 0,
    max_homework_degree: 10,
    recitation_degree: 0,
    max_recitation_degree: 10,
    exam_degree: 0,
    max_exam_degree: 20,
    comprehensive_exam_degree: '' as any,
    max_comprehensive_exam_degree: 50
  });
  const [isAddingSingleRecord, setIsAddingSingleRecord] = useState<boolean>(false);

  // Load Active Month & Groups from Firestore
  useEffect(() => {
    fetchActiveMonth();
    fetchGroups();
    fetchRegisteredStudents();
  }, []);

  const fetchActiveMonth = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'center_active_month'));
      if (snap.exists() && snap.data().active_month) {
        setActiveMonth(snap.data().active_month);
      }
    } catch (e) {
      console.error("Error fetching active month:", e);
    }
  };

  const handleSaveActiveMonth = async () => {
    setIsSavingMonth(true);
    try {
      await setDoc(doc(db, 'settings', 'center_active_month'), {
        active_month: activeMonth,
        updatedAt: new Date().toISOString()
      });
      alert(`✅ تم تحديث تثبيت شهر (${activeMonth}) بنجاح ليظهر كالشهر النشط لجميع الطلاب!`);
    } catch (e) {
      console.error("Error saving active month:", e);
      alert("حدث خطأ أثناء حفظ الشهر النشط.");
    } finally {
      setIsSavingMonth(false);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const snap = await getDocs(collection(db, 'center_groups'));
      const list = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setGroups(list);
    } catch (e) {
      console.error("Error loading groups:", e);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchRegisteredStudents = async () => {
    try {
      const snap = await getDocs(collection(db, 'students'));
      const list = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setRegisteredStudents(list);
    } catch (e) {
      console.error("Error loading students:", e);
    }
  };

  // Toggle individual day selection
  const handleToggleDay = (day: string) => {
    setGroupForm(prev => {
      const currentDays = prev.selected_days || [];
      const exists = currentDays.includes(day);
      if (exists) {
        return { ...prev, selected_days: currentDays.filter(d => d !== day) };
      } else {
        return { ...prev, selected_days: [...currentDays, day] };
      }
    });
  };

  // Handle Adding or Editing a Group
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.group_name.trim()) return;

    const daysList = groupForm.selected_days || [];
    const dayStr = daysList.length > 0
      ? daysList.join(' و ')
      : 'جميع الأيام';

    try {
      if (groupEditingId) {
        await updateDoc(doc(db, 'center_groups', groupEditingId), {
          group_name: groupForm.group_name.trim(),
          class_name: groupForm.class_name,
          day_of_week: dayStr,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'center_groups'), {
          group_name: groupForm.group_name.trim(),
          class_name: groupForm.class_name,
          day_of_week: dayStr,
          createdAt: new Date().toISOString()
        });
      }
      setShowGroupModal(false);
      setGroupEditingId(null);
      setGroupForm({ group_name: '', class_name: selectedClass, selected_days: ['السبت', 'الثلاثاء'] });
      fetchGroups();
    } catch (e) {
      console.error("Error saving group:", e);
      alert("حدث خطأ أثناء حفظ المجموعة.");
    }
  };

  // Open & Save Student Group Edit
  const handleOpenChangeStudentGroup = (student: any) => {
    setEditingStudentGroup(student);
    setTargetNewGroup(student.group_name || student.groupName || '');
  };

  const handleSaveStudentGroupChange = async () => {
    if (!editingStudentGroup || !targetNewGroup.trim()) return;
    setIsSavingStudentGroup(true);
    try {
      await updateDoc(doc(db, 'students', editingStudentGroup.id), {
        group_name: targetNewGroup.trim(),
        groupName: targetNewGroup.trim(),
        updatedAt: new Date().toISOString()
      });
      alert(`✅ تم نقل الطالب (${editingStudentGroup.name}) إلى مجموعة (${targetNewGroup.trim()}) بنجاح!`);
      setEditingStudentGroup(null);
      fetchRegisteredStudents();
    } catch (e) {
      console.error("Error changing student group:", e);
      alert("حدث خطأ أثناء تغيير مجموعة الطالب.");
    } finally {
      setIsSavingStudentGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه المجموعة؟")) {
      try {
        await deleteDoc(doc(db, 'center_groups', groupId));
        fetchGroups();
      } catch (e) {
        console.error("Error deleting group:", e);
      }
    }
  };

  // Filter students by selected Class, Group & Search Term (Name or Code)
  const filteredStudentsForBulk = registeredStudents.filter(s => {
    const matchesClass = s.class_name === selectedClass || s.className === selectedClass;
    if (!matchesClass) return false;

    if (selectedGroupFilter !== 'all') {
      const matchesGroup = s.group_name === selectedGroupFilter || s.groupName === selectedGroupFilter;
      if (!matchesGroup) return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const sName = (s.name || '').toLowerCase();
      const sCode = (s.code || '').toLowerCase();
      const sPhone = (s.phone || s.phone_parent || '').toLowerCase();
      return sName.includes(q) || sCode.includes(q) || sPhone.includes(q);
    }

    return true;
  });

  // Handle entry change in bulk table
  const handleBulkEntryChange = (codeOrId: string, field: string, value: any) => {
    setBulkEntries(prev => {
      const current = prev[codeOrId] || { absent: false, homework: 0, recitation: 0, exam: 0, compExam: 0 };
      return {
        ...prev,
        [codeOrId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Save Bulk Evaluation & Attendance to Firestore
  const handleSaveBulkEvaluations = async () => {
    if (filteredStudentsForBulk.length === 0) {
      alert("لا يوجد طلاب مسجلون في هذه المجموعة/الصف لإضافة التقييمات لهم.");
      return;
    }

    setIsSavingBulk(true);
    try {
      const batch = writeBatch(db);

      filteredStudentsForBulk.forEach(student => {
        const key = student.code || student.id;
        const entry = bulkEntries[key] || { absent: false, homework: 0, recitation: 0, exam: 0, compExam: 0 };
        const isAbsent = entry.absent;

        const recordRef = doc(collection(db, 'center_records'));
        batch.set(recordRef, {
          student_id: student.id,
          student_code: student.code || 'غير محدد',
          student_name: student.name || 'طالب',
          group_name: student.group_name || student.groupName || selectedGroupFilter,
          class_name: selectedClass,
          lesson_date: bulkDate,
          lesson_month: activeMonth,
          lesson_number: Number(bulkSessionNum) || 1,
          attendance: isAbsent ? 'غاب' : 'حضر',
          homework_degree: isAbsent ? 0 : (Number(entry.homework) || 0),
          max_homework_degree: Number(bulkMaxHomework) || 10,
          recitation_degree: isAbsent ? 0 : (Number(entry.recitation) || 0),
          max_recitation_degree: Number(bulkMaxRecitation) || 10,
          exam_degree: isAbsent ? 0 : (Number(entry.exam) || 0),
          max_exam_degree: Number(bulkMaxExam) || 20,
          comprehensive_exam_degree: isAbsent ? 0 : (isCompExam ? (Number(entry.compExam) || 0) : null),
          max_comprehensive_exam_degree: isCompExam ? (Number(bulkMaxCompExam) || 50) : null,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      alert(`✅ تم حفظ تقييمات وجدول غياب جميع الطلاب (${filteredStudentsForBulk.length} طالب) لشهر (${activeMonth}) بنجاح!`);
      setBulkEntries({});
    } catch (e) {
      console.error("Error saving bulk evaluations:", e);
      alert("حدث خطأ أثناء حفظ التقييمات الجماعية.");
    } finally {
      setIsSavingBulk(false);
    }
  };

  // View Student Record History
  const handleOpenStudentHistory = async (student: any) => {
    setSelectedStudentForHistory(student);
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'center_records'),
        where('student_code', '==', student.code || '')
      );
      const snap = await getDocs(q);
      const recs = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setStudentHistoryRecords(recs.sort((a: any, b: any) => new Date(b.lesson_date).getTime() - new Date(a.lesson_date).getTime()));
    } catch (e) {
      console.error("Error fetching student records:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm("حذف هذا السجل؟")) {
      try {
        await deleteDoc(doc(db, 'center_records', recordId));
        if (selectedStudentForHistory) {
          handleOpenStudentHistory(selectedStudentForHistory);
        }
      } catch (e) {
        console.error("Error deleting record:", e);
      }
    }
  };

  // Save Individual Evaluation for Single Student from row
  const handleSaveSingleStudentEvaluation = async (student: any) => {
    const key = student.code || student.id;
    const entry = bulkEntries[key] || { absent: false, homework: 0, recitation: 0, exam: 0, compExam: 0 };
    const isAbsent = entry.absent;

    setSavingSingleId(key);
    try {
      await addDoc(collection(db, 'center_records'), {
        student_id: student.id,
        student_code: student.code || 'غير محدد',
        student_name: student.name || 'طالب',
        group_name: student.group_name || student.groupName || selectedGroupFilter,
        class_name: student.class_name || student.className || selectedClass,
        lesson_date: bulkDate,
        lesson_month: activeMonth,
        lesson_number: Number(bulkSessionNum) || 1,
        attendance: isAbsent ? 'غاب' : 'حضر',
        homework_degree: isAbsent ? 0 : (Number(entry.homework) || 0),
        max_homework_degree: Number(bulkMaxHomework) || 10,
        recitation_degree: isAbsent ? 0 : (Number(entry.recitation) || 0),
        max_recitation_degree: Number(bulkMaxRecitation) || 10,
        exam_degree: isAbsent ? 0 : (Number(entry.exam) || 0),
        max_exam_degree: Number(bulkMaxExam) || 20,
        comprehensive_exam_degree: isAbsent ? 0 : (isCompExam ? (Number(entry.compExam) || 0) : null),
        max_comprehensive_exam_degree: isCompExam ? (Number(bulkMaxCompExam) || 50) : null,
        createdAt: new Date().toISOString()
      });
      alert(`✅ تم حفظ تقييم الطالب (${student.name}) بنجاح!`);
    } catch (e) {
      console.error("Error saving single evaluation:", e);
      alert("حدث خطأ أثناء حفظ التقييم الفردي.");
    } finally {
      setSavingSingleId(null);
    }
  };

  // Create a new evaluation record for a student from history modal
  const handleCreateSingleRecordForStudent = async () => {
    if (!selectedStudentForHistory) return;
    setIsAddingSingleRecord(true);
    try {
      const isAbsent = newSingleRecord.attendance === 'غاب';
      await addDoc(collection(db, 'center_records'), {
        student_id: selectedStudentForHistory.id,
        student_code: selectedStudentForHistory.code || 'غير محدد',
        student_name: selectedStudentForHistory.name || 'طالب',
        group_name: selectedStudentForHistory.group_name || selectedStudentForHistory.groupName || '',
        class_name: selectedStudentForHistory.class_name || selectedStudentForHistory.className || selectedClass,
        lesson_date: newSingleRecord.lesson_date || bulkDate,
        lesson_month: newSingleRecord.lesson_month || activeMonth,
        lesson_number: Number(newSingleRecord.lesson_number) || 1,
        attendance: newSingleRecord.attendance,
        homework_degree: isAbsent ? 0 : (Number(newSingleRecord.homework_degree) || 0),
        max_homework_degree: Number(newSingleRecord.max_homework_degree) || 10,
        recitation_degree: isAbsent ? 0 : (Number(newSingleRecord.recitation_degree) || 0),
        max_recitation_degree: Number(newSingleRecord.max_recitation_degree) || 10,
        exam_degree: isAbsent ? 0 : (Number(newSingleRecord.exam_degree) || 0),
        max_exam_degree: Number(newSingleRecord.max_exam_degree) || 20,
        comprehensive_exam_degree: isAbsent ? 0 : (newSingleRecord.comprehensive_exam_degree !== '' ? (Number(newSingleRecord.comprehensive_exam_degree) || 0) : null),
        max_comprehensive_exam_degree: newSingleRecord.comprehensive_exam_degree !== '' ? (Number(newSingleRecord.max_comprehensive_exam_degree) || 50) : null,
        createdAt: new Date().toISOString()
      });
      alert(`✅ تم إضافة التقييم الفردي للطالب (${selectedStudentForHistory.name}) بنجاح!`);
      setShowAddSingleModal(false);
      handleOpenStudentHistory(selectedStudentForHistory);
    } catch (e) {
      console.error("Error adding single record:", e);
      alert("حدث خطأ أثناء إضافة التقييم الفردي.");
    } finally {
      setIsAddingSingleRecord(false);
    }
  };

  // Update an existing saved evaluation record
  const handleUpdateSavedRecord = async () => {
    if (!editingRecord) return;
    setIsSavingRecordEdit(true);
    try {
      const isAbsent = editingRecord.attendance === 'غاب';
      await updateDoc(doc(db, 'center_records', editingRecord.id), {
        attendance: editingRecord.attendance,
        homework_degree: isAbsent ? 0 : (Number(editingRecord.homework_degree) || 0),
        max_homework_degree: Number(editingRecord.max_homework_degree) || 10,
        recitation_degree: isAbsent ? 0 : (Number(editingRecord.recitation_degree) || 0),
        max_recitation_degree: Number(editingRecord.max_recitation_degree) || 10,
        exam_degree: isAbsent ? 0 : (Number(editingRecord.exam_degree) || 0),
        max_exam_degree: Number(editingRecord.max_exam_degree) || 20,
        comprehensive_exam_degree: isAbsent ? 0 : (editingRecord.comprehensive_exam_degree !== null && editingRecord.comprehensive_exam_degree !== '' ? (Number(editingRecord.comprehensive_exam_degree) || 0) : null),
        max_comprehensive_exam_degree: editingRecord.comprehensive_exam_degree !== null && editingRecord.comprehensive_exam_degree !== '' ? (Number(editingRecord.max_comprehensive_exam_degree) || 50) : null,
        lesson_number: Number(editingRecord.lesson_number) || 1,
        lesson_month: editingRecord.lesson_month || activeMonth,
        lesson_date: editingRecord.lesson_date || new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      });
      alert("✅ تم تعديل سجل التقييم بنجاح!");
      setEditingRecord(null);
      if (selectedStudentForHistory) {
        handleOpenStudentHistory(selectedStudentForHistory);
      }
    } catch (e) {
      console.error("Error updating saved record:", e);
      alert("حدث خطأ أثناء تعديل تقييم الطالب.");
    } finally {
      setIsSavingRecordEdit(false);
    }
  };

  // Send WhatsApp Parent Report
  const handleSendWhatsAppReport = async (student: any) => {
    const parentPhone = student.phone || student.phone_parent || '';
    if (!parentPhone) {
      alert("رقم ولي الأمر غير مسجل لهذا الطالب.");
      return;
    }

    try {
      const q = query(collection(db, 'center_records'), where('student_code', '==', student.code));
      const snap = await getDocs(q);
      const allRecords = snap.docs.map(docSnap => docSnap.data());

      // Sort records to find the LAST evaluation (latest session)
      const sortedRecords = [...allRecords].sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.lesson_date || 0).getTime();
        const timeB = new Date(b.createdAt || b.lesson_date || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return (Number(b.lesson_number) || 0) - (Number(a.lesson_number) || 0);
      });

      const lastRecord = sortedRecords[0];

      let formattedPhone = parentPhone.replace(/\D/g, '');
      if (formattedPhone.startsWith('01')) formattedPhone = '2' + formattedPhone;

      let msg = `*تقرير تقييم الطالب: ${student.name}* 🧪\n`;
      msg += `📌 *الصف:* ${student.class_name || student.className || selectedClass}\n`;
      if (student.group_name || student.groupName) {
        msg += `👥 *المجموعة:* ${student.group_name || student.groupName}\n`;
      }
      msg += `\n`;

      if (lastRecord) {
        const maxHw = lastRecord.max_homework_degree || 10;
        const maxRec = lastRecord.max_recitation_degree || 10;
        const maxEx = lastRecord.max_exam_degree || 20;
        const maxComp = lastRecord.max_comprehensive_exam_degree || 50;

        msg += `📝 *بيانات تقييم أحدث حصة (${lastRecord.lesson_date || 'غير محدد'} - حصة رقم ${lastRecord.lesson_number || 1}):*\n`;
        msg += `• 👤 *الحالة:* ${lastRecord.attendance === 'حضر' ? '✅ حضر' : '❌ غاب'}\n`;
        if (lastRecord.attendance === 'حضر') {
          msg += `• 📚 *درجة الواجب:* ${lastRecord.homework_degree ?? 0} / ${maxHw}\n`;
          msg += `• 🗣️ *درجة التسميع:* ${lastRecord.recitation_degree ?? 0} / ${maxRec}\n`;
          msg += `• ✍️ *درجة الامتحان:* ${lastRecord.exam_degree ?? 0} / ${maxEx}\n`;
          if (lastRecord.comprehensive_exam_degree !== null && lastRecord.comprehensive_exam_degree !== undefined && lastRecord.comprehensive_exam_degree !== '') {
            msg += `• 🌟 *الامتحان الشامل:* ${lastRecord.comprehensive_exam_degree} / ${maxComp}\n`;
          }
          const sessionTotal = (Number(lastRecord.homework_degree) || 0) + (Number(lastRecord.recitation_degree) || 0) + (Number(lastRecord.exam_degree) || 0) + (Number(lastRecord.comprehensive_exam_degree) || 0);
          const sessionMaxTotal = maxHw + maxRec + maxEx + (lastRecord.comprehensive_exam_degree ? maxComp : 0);
          msg += `• 🎯 *مجموع تقييم الحصة:* ${sessionTotal} / ${sessionMaxTotal}\n`;
        }
      } else {
        msg += `⚠️ *لم يتم تسجيل تقييمات سابقة للطالب بعد.*\n`;
      }

      msg += `\n*مع تحيات الأستاذ أحمد تامر - لغة الضاد* 📖✨`;

      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (e) {
      console.error("WhatsApp report error:", e);
      alert("حدث خطأ أثناء إعداد تقرير الواتساب.");
    }
  };

  // Get Groups belonging to currently selected Class
  const currentClassGroups = groups.filter(g => g.class_name === selectedClass);

  return (
    <div className="space-y-8 text-right font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 border border-amber-500/40 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400">
              <GraduationCap className="w-10 h-10" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black bg-amber-500 text-stone-950 px-3 py-0.5 rounded-full uppercase tracking-wider">
                  إدارة تقييم طلاب السنتر
                </span>
                <span className="text-xs font-bold text-amber-300">
                  نظام السجلات والدرجات التلقائي 🧪
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                لوحة المجموعات والتقييمات الجماعية
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                حدد الشهر النشط، اختر الصف والمجموعة، وسجّل درجات الواجب والتسميع والامتحانات والغياب في مكان واحد.
              </p>
            </div>
          </div>

          {/* Active Month Control Card */}
          <div className="bg-stone-950/80 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>الشهر النشط:</span>
            </div>
            <select
              value={activeMonth}
              onChange={(e) => setActiveMonth(e.target.value)}
              className="bg-stone-900 border border-stone-700 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-amber-500"
            >
              {MONTH_NAMES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button
              onClick={handleSaveActiveMonth}
              disabled={isSavingMonth}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition text-xs flex items-center gap-1 shadow-lg shrink-0"
            >
              {isSavingMonth ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              تثبيت الشهر
            </button>
          </div>
        </div>
      </div>

      {/* 1. Interactive Classes / Grades Cards Grid (الصفوف متقسمة أيقونات) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            اختر الصف الدراسي لإدارة المجموعات والتقييم:
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CLASSES_LIST.map(cls => {
            const isSelected = selectedClass === cls.label;
            const classGroupCount = groups.filter(g => g.class_name === cls.label).length;

            return (
              <motion.button
                key={cls.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedClass(cls.label);
                  setSelectedGroupFilter('all');
                }}
                className={`p-4 rounded-2xl border-2 transition-all text-right flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? `bg-gradient-to-br ${cls.color} shadow-xl scale-105 ring-2 ring-amber-400/50`
                    : 'bg-stone-900/80 border-stone-800 hover:border-stone-700 text-stone-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-2xl">{cls.icon}</span>
                  <span className="text-[10px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded-full text-stone-300">
                    {classGroupCount} مجموعات
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">{cls.shortLabel}</h4>
                  <p className="text-[10px] text-stone-400 mt-0.5 truncate">{cls.label}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 2. Groups Management Bar for Selected Class */}
      <div className="bg-stone-900/90 border border-stone-800 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              مجموعات ({selectedClass})
            </h3>
            <p className="text-xs text-stone-400">المجموعات المضافة والمواعيد الخاصة بهذا الصف</p>
          </div>

          <button
            onClick={() => {
              setGroupEditingId(null);
              setGroupForm({ group_name: '', class_name: selectedClass, day_of_week: 'السبت والثلثاء' });
              setShowGroupModal(true);
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition text-xs flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            إضافة مجموعة جديدة
          </button>
        </div>

        {/* Groups List Pills */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
          <button
            onClick={() => setSelectedGroupFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              selectedGroupFilter === 'all'
                ? 'bg-amber-500 text-stone-950 font-black shadow-lg'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span>كل مجموعات الصف</span>
            <span className="bg-stone-950/40 px-2 py-0.5 rounded-md text-[10px]">
              ({filteredStudentsForBulk.length} طالب)
            </span>
          </button>

          {currentClassGroups.map(grp => {
            const isSelected = selectedGroupFilter === grp.group_name;
            const studentCountInGroup = registeredStudents.filter(
              s => (s.class_name === selectedClass || s.className === selectedClass) &&
                   (s.group_name === grp.group_name || s.groupName === grp.group_name)
            ).length;

            return (
              <div
                key={grp.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                    : 'bg-stone-800/80 border-stone-700/60 text-stone-300'
                }`}
              >
                <button
                  onClick={() => setSelectedGroupFilter(grp.group_name)}
                  className="text-xs font-bold flex items-center gap-2 whitespace-nowrap"
                >
                  <span>{grp.group_name}</span>
                  <span className="text-[10px] text-stone-400 font-mono">({grp.day_of_week})</span>
                  <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono text-[10px]">
                    {studentCountInGroup} طالب
                  </span>
                </button>

                <div className="flex items-center gap-1 border-r border-stone-700 pr-2 mr-1">
                  <button
                    onClick={() => {
                      setGroupEditingId(grp.id);
                      setGroupForm({
                        group_name: grp.group_name,
                        class_name: grp.class_name,
                        selected_days: grp.day_of_week ? grp.day_of_week.split(' و ') : ['السبت', 'الثلاثاء']
                      });
                      setShowGroupModal(true);
                    }}
                    className="p-1 hover:text-amber-400 text-stone-400 transition"
                    title="تعديل"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(grp.id)}
                    className="p-1 hover:text-rose-400 text-stone-400 transition"
                    title="حذف"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Bulk Quick Evaluation & Attendance Entry Table (الغياب السريع والتقييم الجماعي) */}
      <div className="bg-stone-900/90 border border-stone-800 p-6 rounded-3xl space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              الغياب السريع ورصد التقييمات الجماعي
            </h3>
            <p className="text-xs text-stone-400">
              اختر تاريخ الحصة ورقمها ورصّد الحضور والواجب والتسميع والامتحانات لطلاب ({selectedClass})
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
            {/* Search Student Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="تصفية بالاسم أو الكود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 focus:border-amber-500 text-white text-xs font-bold pr-9 pl-8 py-2 rounded-xl outline-none transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="bg-stone-950 border border-stone-700 text-white text-xs font-bold px-3 py-2 rounded-xl outline-none"
            />
            <div className="flex items-center gap-1 bg-stone-950 border border-stone-700 px-3 py-1.5 rounded-xl text-xs text-stone-300 font-bold">
              <span>حصة رقم:</span>
              <input
                type="number"
                value={bulkSessionNum}
                onChange={(e) => setBulkSessionNum(e.target.value)}
                className="w-12 bg-transparent text-center font-bold text-amber-400 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/40 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isCompExam}
                onChange={(e) => setIsCompExam(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-stone-700 focus:ring-amber-500"
              />
              <span>امتحان شامل؟</span>
            </label>
          </div>
        </div>

        {/* Custom Max Degrees Controls Bar */}
        <div className="bg-stone-950/80 border border-amber-500/20 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <Sliders className="w-4 h-4" />
            <span>تخصيص الدرجات النهائية (العظمى) لهذه الحصة:</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 px-2.5 py-1 rounded-xl">
              <span className="text-cyan-300 font-bold">واجب:</span>
              <input
                type="number"
                value={bulkMaxHomework}
                onChange={(e) => setBulkMaxHomework(e.target.value)}
                className="w-12 bg-transparent text-center font-bold text-white outline-none font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 px-2.5 py-1 rounded-xl">
              <span className="text-indigo-300 font-bold">تسميع:</span>
              <input
                type="number"
                value={bulkMaxRecitation}
                onChange={(e) => setBulkMaxRecitation(e.target.value)}
                className="w-12 bg-transparent text-center font-bold text-white outline-none font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 px-2.5 py-1 rounded-xl">
              <span className="text-amber-300 font-bold">امتحان:</span>
              <input
                type="number"
                value={bulkMaxExam}
                onChange={(e) => setBulkMaxExam(e.target.value)}
                className="w-12 bg-transparent text-center font-bold text-white outline-none font-mono"
              />
            </div>
            {isCompExam && (
              <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-600/50 px-2.5 py-1 rounded-xl">
                <span className="text-amber-400 font-bold">شامل:</span>
                <input
                  type="number"
                  value={bulkMaxCompExam}
                  onChange={(e) => setBulkMaxCompExam(e.target.value)}
                  className="w-12 bg-transparent text-center font-bold text-amber-300 outline-none font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Student Evaluation Rows */}
        {filteredStudentsForBulk.length === 0 ? (
          <div className="p-12 text-center bg-stone-950/60 rounded-2xl border border-dashed border-stone-800 space-y-2">
            <Users className="w-10 h-10 text-stone-600 mx-auto" />
            <h4 className="text-stone-300 font-bold">لا يوجد طلاب مسجلون في هذا الصف/المجموعة بعد.</h4>
            <p className="text-xs text-stone-500">يمكنك إضافة طلاب جدد وتسكينهم في هذه المجموعة من لسان تبويب (الطلاب المسجلين).</p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar border border-stone-800 rounded-2xl">
            <table className="w-full text-right text-xs whitespace-nowrap">
              <thead className="bg-stone-950 text-stone-400 font-bold border-b border-stone-800">
                <tr>
                  <th className="p-3">الكود</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">المجموعة</th>
                  <th className="p-3 text-center text-rose-400">تسجيل غياب ❌</th>
                  <th className="p-3 text-center">درجة الواجب ({bulkMaxHomework})</th>
                  <th className="p-3 text-center">درجة التسميع ({bulkMaxRecitation})</th>
                  <th className="p-3 text-center">امتحان الحصة ({bulkMaxExam})</th>
                  {isCompExam && <th className="p-3 text-center text-amber-400">الامتحان الشامل ({bulkMaxCompExam})</th>}
                  <th className="p-3 text-center">السجل والمتابعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredStudentsForBulk.map(student => {
                  const key = student.code || student.id;
                  const entry = bulkEntries[key] || { absent: false, homework: 0, recitation: 0, exam: 0, compExam: 0 };
                  const isAbsent = entry.absent;

                  return (
                    <tr key={key} className={`transition-colors ${isAbsent ? 'bg-rose-950/20' : 'hover:bg-stone-800/40'}`}>
                      <td className="p-3 font-mono font-bold text-rose-400">{student.code || '-'}</td>
                      <td className="p-3 font-bold text-white">{student.name}</td>
                      <td className="p-3 text-stone-400">{student.group_name || student.groupName || '-'}</td>

                      {/* Absent Toggle */}
                      <td className="p-3 text-center">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAbsent}
                            onChange={(e) => handleBulkEntryChange(key, 'absent', e.target.checked)}
                            className="w-5 h-5 text-rose-500 rounded border-stone-700 focus:ring-rose-500 cursor-pointer"
                          />
                          <span className={`text-[11px] font-bold ${isAbsent ? 'text-rose-400' : 'text-stone-500'}`}>
                            {isAbsent ? 'غاب ❌' : 'حضر ✅'}
                          </span>
                        </label>
                      </td>

                      {/* Homework Degree */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          disabled={isAbsent}
                          value={isAbsent ? 0 : (entry.homework ?? '')}
                          onChange={(e) => handleBulkEntryChange(key, 'homework', e.target.value)}
                          placeholder="0-10"
                          className="w-16 bg-stone-950 border border-stone-700 rounded-lg p-1.5 text-center font-mono font-bold text-cyan-300 outline-none focus:border-cyan-500 disabled:opacity-30"
                        />
                      </td>

                      {/* Recitation Degree */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          disabled={isAbsent}
                          value={isAbsent ? 0 : (entry.recitation ?? '')}
                          onChange={(e) => handleBulkEntryChange(key, 'recitation', e.target.value)}
                          placeholder="0-10"
                          className="w-16 bg-stone-950 border border-stone-700 rounded-lg p-1.5 text-center font-mono font-bold text-indigo-300 outline-none focus:border-indigo-500 disabled:opacity-30"
                        />
                      </td>

                      {/* Exam Degree */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          disabled={isAbsent}
                          value={isAbsent ? 0 : (entry.exam ?? '')}
                          onChange={(e) => handleBulkEntryChange(key, 'exam', e.target.value)}
                          placeholder="0-20"
                          className="w-16 bg-stone-950 border border-stone-700 rounded-lg p-1.5 text-center font-mono font-bold text-amber-300 outline-none focus:border-amber-500 disabled:opacity-30"
                        />
                      </td>

                      {/* Comprehensive Exam Degree */}
                      {isCompExam && (
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            disabled={isAbsent}
                            value={isAbsent ? 0 : (entry.compExam ?? '')}
                            onChange={(e) => handleBulkEntryChange(key, 'compExam', e.target.value)}
                            placeholder="0-50"
                            className="w-16 bg-amber-950/60 border border-amber-500/50 rounded-lg p-1.5 text-center font-mono font-bold text-amber-300 outline-none focus:border-amber-400 disabled:opacity-30"
                          />
                        </td>
                      )}

                      {/* Actions */}
                      <td className="p-3 text-center space-x-1.5 space-x-reverse">
                        <button
                          onClick={() => handleSaveSingleStudentEvaluation(student)}
                          disabled={savingSingleId === key}
                          className="px-2.5 py-1 bg-cyan-950/90 text-cyan-300 border border-cyan-700/80 hover:bg-cyan-900 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                          title="حفظ تقييم هذا الطالب فقط"
                        >
                          {savingSingleId === key ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          حفظ للطالب
                        </button>
                        <button
                          onClick={() => handleOpenChangeStudentGroup(student)}
                          className="px-2 py-1 bg-amber-950/80 text-amber-300 border border-amber-800/80 hover:bg-amber-900 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                          title="تغيير مجموعة الطالب"
                        >
                          <Edit2 className="w-3 h-3" />
                          المجموعة
                        </button>
                        <button
                          onClick={() => handleOpenStudentHistory(student)}
                          className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg font-bold text-[11px] transition"
                        >
                          السجل والتعديل
                        </button>
                        <button
                          onClick={() => handleSendWhatsAppReport(student)}
                          className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 rounded-lg font-bold text-[11px] transition flex items-center gap-1 inline-flex"
                        >
                          <MessageCircle className="w-3 h-3" />
                          واتساب
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleSaveBulkEvaluations}
            disabled={isSavingBulk || filteredStudentsForBulk.length === 0}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-2xl shadow-xl transition flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {isSavingBulk ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            حفظ سجل التقييمات والغياب الجماعي ({filteredStudentsForBulk.length} طالب) لشهر ({activeMonth})
          </button>
        </div>
      </div>

      {/* Add / Edit Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-lg w-full space-y-5 text-right shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-black text-white text-base">
                {groupEditingId ? 'تعديل بيانات المجموعة' : 'إضافة مجموعة جديدة'}
              </h3>
              <button onClick={() => setShowGroupModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1">اسم المجموعة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مجموعة التفوق أو السبت والثلثاء 4 مساءً"
                  value={groupForm.group_name}
                  onChange={(e) => setGroupForm({ ...groupForm, group_name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1">الصف الدراسي</label>
                <select
                  value={groupForm.class_name}
                  onChange={(e) => setGroupForm({ ...groupForm, class_name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-bold"
                >
                  {CLASSES_LIST.map(c => (
                    <option key={c.id} value={c.label}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 mb-2">
                  حدد أيام المجموعة (اختر الأيام المناسبة):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_WEEK_DAYS.map(day => {
                    const isChecked = (groupForm.selected_days || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        <span>{day}</span>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-amber-500 border-amber-400 text-stone-950' : 'border-stone-700'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {(groupForm.selected_days || []).length > 0 && (
                  <div className="text-[11px] text-amber-400 font-mono mt-2 bg-amber-950/30 border border-amber-900/40 p-2 rounded-lg">
                    الأيام المحددة للمجموعة: <span className="font-bold text-white">{(groupForm.selected_days || []).join(' و ')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition"
                >
                  حفظ المجموعة
                </button>
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="py-3 px-5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Student Group Modal */}
      {editingStudentGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-5 text-right shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-black text-white text-base">
                تغيير مجموعة الطالب: {editingStudentGroup.name}
              </h3>
              <button onClick={() => setEditingStudentGroup(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1">اختر المجموعة الجديدة من المجموعات المتاحة:</label>
                <select
                  value={targetNewGroup}
                  onChange={(e) => setTargetNewGroup(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-bold"
                >
                  <option value="" disabled>اختر الموعد/المجموعة...</option>
                  {groups
                    .filter(g => g.class_name === editingStudentGroup.class_name || g.class_name === editingStudentGroup.className)
                    .map(g => (
                      <option key={g.id} value={g.group_name}>
                        {g.group_name} ({g.day_of_week})
                      </option>
                    ))}
                  {groups.length === 0 && (
                    <>
                      <option value="مجموعة السبت والثلثاء">مجموعة السبت والثلثاء</option>
                      <option value="مجموعة الأحد والأربعاء">مجموعة الأحد والأربعاء</option>
                      <option value="مجموعة الإثنين والخميس">مجموعة الإثنين والخميس</option>
                      <option value="مجموعة الجمعة">مجموعة الجمعة</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1">أو كتابة اسم مجموعة مخصص:</label>
                <input
                  type="text"
                  placeholder="اسم المجموعة..."
                  value={targetNewGroup}
                  onChange={(e) => setTargetNewGroup(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveStudentGroupChange}
                  disabled={isSavingStudentGroup || !targetNewGroup.trim()}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSavingStudentGroup ? 'جاري الحفظ...' : 'تحديث مجموعة الطالب'}
                </button>
                <button
                  onClick={() => setEditingStudentGroup(null)}
                  className="py-3 px-5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Individual Student History Modal */}
      {selectedStudentForHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 text-right shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <span>سجل تقييمات الطالب: {selectedStudentForHistory.name}</span>
                </h3>
                <p className="text-xs text-stone-400 font-mono mt-0.5">
                  كود الطالب: {selectedStudentForHistory.code} • {selectedStudentForHistory.group_name || selectedStudentForHistory.groupName || ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNewSingleRecord({
                      lesson_date: new Date().toISOString().split('T')[0],
                      lesson_month: activeMonth,
                      lesson_number: (studentHistoryRecords.length + 1),
                      attendance: 'حضر',
                      homework_degree: 0,
                      recitation_degree: 0,
                      exam_degree: 0,
                      comprehensive_exam_degree: ''
                    });
                    setShowAddSingleModal(true);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition flex items-center gap-1 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  تقييم جديد للطالب
                </button>
                <button
                  onClick={() => setSelectedStudentForHistory(null)}
                  className="p-2 text-stone-400 hover:text-white bg-stone-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-stone-400 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
                <p className="text-xs font-bold">جاري تحميل سجل التقييمات...</p>
              </div>
            ) : studentHistoryRecords.length === 0 ? (
              <div className="p-8 text-center bg-stone-950 rounded-2xl text-stone-400 text-xs space-y-3">
                <p>لا توجد سجلات تقييم لهذا الطالب بعد.</p>
                <button
                  onClick={() => {
                    setNewSingleRecord({
                      lesson_date: new Date().toISOString().split('T')[0],
                      lesson_month: activeMonth,
                      lesson_number: 1,
                      attendance: 'حضر',
                      homework_degree: 0,
                      recitation_degree: 0,
                      exam_degree: 0,
                      comprehensive_exam_degree: ''
                    });
                    setShowAddSingleModal(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  إضافة أول تقييم لهذا الطالب
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {studentHistoryRecords.map(rec => (
                  <div key={rec.id} className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between items-center gap-4 hover:border-stone-700 transition">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          حصة #{rec.lesson_number}
                        </span>
                        <span className="text-xs text-stone-400">({rec.lesson_month})</span>
                        <span className="text-[11px] text-stone-500 font-mono">{rec.lesson_date || ''}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          rec.attendance === 'حضر' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {rec.attendance}
                        </span>
                      </div>
                      {rec.attendance === 'حضر' && (
                        <div className="flex flex-wrap gap-3 text-[11px] text-stone-300 font-mono mt-1">
                          <span>واجب: {rec.homework_degree}/{rec.max_homework_degree || 10}</span>
                          <span>تسميع: {rec.recitation_degree}/{rec.max_recitation_degree || 10}</span>
                          <span>امتحان: {rec.exam_degree}/{rec.max_exam_degree || 20}</span>
                          {rec.comprehensive_exam_degree !== null && rec.comprehensive_exam_degree !== undefined && rec.comprehensive_exam_degree !== '' && (
                            <span>شامل: {rec.comprehensive_exam_degree}/{rec.max_comprehensive_exam_degree || 50}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingRecord({
                          ...rec,
                          max_homework_degree: rec.max_homework_degree || 10,
                          max_recitation_degree: rec.max_recitation_degree || 10,
                          max_exam_degree: rec.max_exam_degree || 20,
                          max_comprehensive_exam_degree: rec.max_comprehensive_exam_degree || 50
                        })}
                        className="px-2.5 py-1 text-amber-400 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 rounded-xl transition flex items-center gap-1 text-[11px] font-bold"
                        title="تعديل هذا التقييم الفردي"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition"
                        title="حذف هذا الدرس"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Edit Saved Evaluation Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-lg w-full space-y-4 text-right shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                تعديل تقييم الطالب: {editingRecord.student_name}
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">رقم الحصة / الدرس</label>
                <input
                  type="number"
                  value={editingRecord.lesson_number || 1}
                  onChange={(e) => setEditingRecord({ ...editingRecord, lesson_number: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">الشهر</label>
                <select
                  value={editingRecord.lesson_month || activeMonth}
                  onChange={(e) => setEditingRecord({ ...editingRecord, lesson_month: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 font-bold text-white outline-none focus:border-amber-500"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">تاريخ الحصة</label>
                <input
                  type="date"
                  value={editingRecord.lesson_date || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, lesson_date: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">حالة الحضور</label>
                <select
                  value={editingRecord.attendance || 'حضر'}
                  onChange={(e) => setEditingRecord({ ...editingRecord, attendance: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 font-bold text-white outline-none focus:border-amber-500"
                >
                  <option value="حضر">حضر ✅</option>
                  <option value="غاب">غاب ❌</option>
                </select>
              </div>
            </div>

            {editingRecord.attendance === 'حضر' && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-cyan-300 font-bold">
                    <span>درجة الواجب</span>
                    <span className="text-[11px] text-stone-400">الدرجة المكتسبة / الدرجة النهائية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="درجة الطالب"
                      value={editingRecord.homework_degree ?? 0}
                      onChange={(e) => setEditingRecord({ ...editingRecord, homework_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-cyan-300 outline-none focus:border-cyan-500 font-mono text-center"
                    />
                    <input
                      type="number"
                      placeholder="الدرجة العظمى (مثلاً 10)"
                      value={editingRecord.max_homework_degree ?? 10}
                      onChange={(e) => setEditingRecord({ ...editingRecord, max_homework_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-stone-300 outline-none focus:border-cyan-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-indigo-300 font-bold">
                    <span>درجة التسميع</span>
                    <span className="text-[11px] text-stone-400">الدرجة المكتسبة / الدرجة النهائية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="درجة الطالب"
                      value={editingRecord.recitation_degree ?? 0}
                      onChange={(e) => setEditingRecord({ ...editingRecord, recitation_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-indigo-300 outline-none focus:border-indigo-500 font-mono text-center"
                    />
                    <input
                      type="number"
                      placeholder="الدرجة العظمى (مثلاً 10)"
                      value={editingRecord.max_recitation_degree ?? 10}
                      onChange={(e) => setEditingRecord({ ...editingRecord, max_recitation_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-stone-300 outline-none focus:border-indigo-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-amber-300 font-bold">
                    <span>درجة الامتحان</span>
                    <span className="text-[11px] text-stone-400">الدرجة المكتسبة / الدرجة النهائية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="درجة الطالب"
                      value={editingRecord.exam_degree ?? 0}
                      onChange={(e) => setEditingRecord({ ...editingRecord, exam_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-amber-300 outline-none focus:border-amber-500 font-mono text-center"
                    />
                    <input
                      type="number"
                      placeholder="الدرجة العظمى (مثلاً 20)"
                      value={editingRecord.max_exam_degree ?? 20}
                      onChange={(e) => setEditingRecord({ ...editingRecord, max_exam_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-stone-300 outline-none focus:border-amber-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-amber-400 font-bold">
                    <span>الامتحان الشامل (اختياري)</span>
                    <span className="text-[11px] text-amber-300/70">الدرجة المكتسبة / الدرجة النهائية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="درجة الطالب (أو اتركه فارغاً)"
                      value={editingRecord.comprehensive_exam_degree ?? ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, comprehensive_exam_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-amber-700/60 rounded-xl p-2 font-bold text-amber-300 outline-none focus:border-amber-400 font-mono text-center"
                    />
                    <input
                      type="number"
                      placeholder="الدرجة العظمى (مثلاً 50)"
                      value={editingRecord.max_comprehensive_exam_degree ?? 50}
                      onChange={(e) => setEditingRecord({ ...editingRecord, max_comprehensive_exam_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-amber-700/60 rounded-xl p-2 font-bold text-stone-300 outline-none focus:border-amber-400 font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-stone-800">
              <button
                onClick={handleUpdateSavedRecord}
                disabled={isSavingRecordEdit}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isSavingRecordEdit ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ التعديلات
              </button>
              <button
                onClick={() => setEditingRecord(null)}
                className="py-3 px-5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl text-xs transition"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Single Evaluation Modal */}
      {showAddSingleModal && selectedStudentForHistory && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-lg w-full space-y-4 text-right shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                إضافة تقييم فردي للطالب: {selectedStudentForHistory.name}
              </h3>
              <button onClick={() => setShowAddSingleModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">رقم الحصة / الدرس</label>
                <input
                  type="number"
                  value={newSingleRecord.lesson_number}
                  onChange={(e) => setNewSingleRecord({ ...newSingleRecord, lesson_number: Number(e.target.value) })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">الشهر</label>
                <select
                  value={newSingleRecord.lesson_month}
                  onChange={(e) => setNewSingleRecord({ ...newSingleRecord, lesson_month: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 font-bold text-white outline-none focus:border-amber-500"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">تاريخ الحصة</label>
                <input
                  type="date"
                  value={newSingleRecord.lesson_date}
                  onChange={(e) => setNewSingleRecord({ ...newSingleRecord, lesson_date: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">حالة الحضور</label>
                <select
                  value={newSingleRecord.attendance}
                  onChange={(e) => setNewSingleRecord({ ...newSingleRecord, attendance: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 font-bold text-white outline-none focus:border-amber-500"
                >
                  <option value="حضر">حضر ✅</option>
                  <option value="غاب">غاب ❌</option>
                </select>
              </div>
            </div>

            {newSingleRecord.attendance === 'حضر' && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-cyan-300 font-bold">
                    <span>درجة الواجب</span>
                    <span className="text-[11px] text-stone-400">الدرجة المكتسبة / الدرجة النهائية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="درجة الطالب"
                      value={newSingleRecord.homework_degree}
                      onChange={(e) => setNewSingleRecord({ ...newSingleRecord, homework_degree: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-cyan-300 outline-none focus:border-cyan-500 font-mono text-center"
                    />
                    <input
                      type="number"
                      placeholder="الدرجة العظمى (مثلاً 10)"
                      value={newSingleRecord.max_homework_degree}
                      onChange={(e) => setNewSingleRecord({ ...newSingleRecord, max_homework_degree: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-stone-300 outline-none focus:border-cyan-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-indigo-300 font-bold">
                    <span>درجة التسميع</span>
                    <span className="text-[11px] text-stone-400">الدرجة المكتسبة / الدرجة النهائية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="درجة الطالب"
                      value={newSingleRecord.recitation_degree}
                      onChange={(e) => setNewSingleRecord({ ...newSingleRecord, recitation_degree: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-indigo-300 outline-none focus:border-indigo-500 font-mono text-center"
                    />
                    <input
                      type="number"
                      placeholder="الدرجة العظمى (مثلاً 10)"
                      value={newSingleRecord.max_recitation_degree}
                      onChange={(e) => setNewSingleRecord({ ...newSingleRecord, max_recitation_degree: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-stone-300 outline-none focus:border-indigo-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-amber-300 font-bold">
                    <span>درجة الامتحان</span>
                    <span className="text-[11px] text-stone-400">الدرجة المكتسبة / الدرجة النهائية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="درجة الطالب"
                      value={newSingleRecord.exam_degree}
                      onChange={(e) => setNewSingleRecord({ ...newSingleRecord, exam_degree: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-amber-300 outline-none focus:border-amber-500 font-mono text-center"
                    />
                    <input
                      type="number"
                      placeholder="الدرجة العظمى (مثلاً 20)"
                      value={newSingleRecord.max_exam_degree}
                      onChange={(e) => setNewSingleRecord({ ...newSingleRecord, max_exam_degree: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 font-bold text-stone-300 outline-none focus:border-amber-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-amber-400 font-bold">
                    <span>الامتحان الشامل (اختياري)</span>
                    <span className="text-[11px] text-amber-300/70">الدرجة المكتسبة / الدرجة النهائية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="درجة الطالب (أو اتركه فارغاً)"
                      value={newSingleRecord.comprehensive_exam_degree}
                      onChange={(e) => setNewSingleRecord({ ...newSingleRecord, comprehensive_exam_degree: e.target.value })}
                      className="w-full bg-stone-900 border border-amber-700/60 rounded-xl p-2 font-bold text-amber-300 outline-none focus:border-amber-400 font-mono text-center"
                    />
                    <input
                      type="number"
                      placeholder="الدرجة العظمى (مثلاً 50)"
                      value={newSingleRecord.max_comprehensive_exam_degree}
                      onChange={(e) => setNewSingleRecord({ ...newSingleRecord, max_comprehensive_exam_degree: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-amber-700/60 rounded-xl p-2 font-bold text-stone-300 outline-none focus:border-amber-400 font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-stone-800">
              <button
                onClick={handleCreateSingleRecordForStudent}
                disabled={isAddingSingleRecord}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isAddingSingleRecord ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ التقييم الفردي
              </button>
              <button
                onClick={() => setShowAddSingleModal(false)}
                className="py-3 px-5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl text-xs transition"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
