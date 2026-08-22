import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import {
  Sparkles,
  Trophy,
  Award,
  Zap,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Users,
  BookOpen,
  Flame,
  Star,
  RefreshCw,
  AlertCircle,
  GraduationCap
} from 'lucide-react';

export interface ArabicEvaluationRecord {
  id: string;
  student_id?: string;
  student_code?: string;
  student_name?: string;
  lesson_number: number | string;
  lesson_date: string;
  lesson_month: string;
  attendance: 'حضر' | 'غاب';
  homework_degree: number;
  max_homework_degree?: number;
  recitation_degree: number;
  max_recitation_degree?: number;
  exam_degree: number;
  max_exam_degree?: number;
  comprehensive_exam_degree?: number | null;
  max_comprehensive_exam_degree?: number | null;
  teacher_note?: string;
}

export interface CenterEvaluationProps {
  currentStudent?: any;
  onClose?: () => void;
}

const MONTH_NAMES = [
  "أكتوبر", "نوفمبر", "ديسمبر", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر"
];

export default function ArabicStudentEvaluationView({ currentStudent, onClose }: CenterEvaluationProps) {
  const [activeMonth, setActiveMonth] = useState<string>('مارس');
  const [selectedMonth, setSelectedMonth] = useState<string>('مارس');
  const [loading, setLoading] = useState<boolean>(true);

  const studentCode = currentStudent?.code || currentStudent?.student_code || '';
  const studentName = currentStudent?.name || currentStudent?.student_name || 'طالب لغة الضاد';
  const groupName = currentStudent?.groupName || currentStudent?.group_name || 'مجموعة السنتر';
  const className = currentStudent?.className || currentStudent?.class_name || 'الصف الدراسي';

  const [studentRecords, setStudentRecords] = useState<ArabicEvaluationRecord[]>([]);
  const [groupRecords, setGroupRecords] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCenterData() {
      setLoading(true);
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'center_active_month'));
        let currentActive = 'مارس';
        if (settingsSnap.exists() && settingsSnap.data().active_month) {
          currentActive = settingsSnap.data().active_month;
        }
        
        if (isMounted) {
          setActiveMonth(currentActive);
          setSelectedMonth(currentActive);
        }

        if (studentCode || currentStudent?.id) {
          const recordsRef = collection(db, 'center_records');
          
          let qStudent = query(recordsRef, where('student_code', '==', studentCode));
          let snap = await getDocs(qStudent);

          if (snap.empty && currentStudent?.id) {
            qStudent = query(recordsRef, where('student_id', '==', currentStudent.id));
            snap = await getDocs(qStudent);
          }

          if (snap.empty && studentName) {
            qStudent = query(recordsRef, where('student_name', '==', studentName));
            snap = await getDocs(qStudent);
          }

          const myRecs: ArabicEvaluationRecord[] = snap.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as ArabicEvaluationRecord));

          if (isMounted) {
            setStudentRecords(myRecs);
          }

          if (groupName) {
            const qGroup = query(recordsRef, where('group_name', '==', groupName));
            const groupSnap = await getDocs(qGroup);
            const gRecs = groupSnap.docs.map(docSnap => docSnap.data());
            if (isMounted) {
              setGroupRecords(gRecs);
            }
          }
        }
      } catch (err) {
        console.error("Error loading student evaluations:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCenterData();

    return () => { isMounted = false; };
  }, [studentCode, currentStudent, groupName, refreshKey]);

  const filteredMonthRecords = useMemo(() => {
    return studentRecords.filter(r => r.lesson_month === selectedMonth);
  }, [studentRecords, selectedMonth]);

  const computedStats = useMemo(() => {
    const records = filteredMonthRecords;
    const totalLessons = records.length;
    let attendedLessons = 0;
    let absentLessons = 0;
    let totalEarned = 0;

    records.forEach(r => {
      if (r.attendance === 'حضر') {
        attendedLessons++;
        totalEarned += (Number(r.homework_degree) || 0) +
                       (Number(r.recitation_degree) || 0) +
                       (Number(r.exam_degree) || 0) +
                       (Number(r.comprehensive_exam_degree) || 0);
      } else {
        absentLessons++;
      }
    });

    const attendanceRate = totalLessons > 0 ? Math.round((attendedLessons / totalLessons) * 100) : 100;

    const monthGroupRecords = groupRecords.filter(r => r.lesson_month === selectedMonth);
    const studentTotalScores: { [key: string]: number } = {};

    monthGroupRecords.forEach(r => {
      const code = r.student_code || r.student_name || 'unknown';
      if (!studentTotalScores[code]) studentTotalScores[code] = 0;
      if (r.attendance === 'حضر') {
        studentTotalScores[code] += (Number(r.homework_degree) || 0) +
                                   (Number(r.recitation_degree) || 0) +
                                   (Number(r.exam_degree) || 0) +
                                   (Number(r.comprehensive_exam_degree) || 0);
      }
    });

    const groupScores = Object.values(studentTotalScores);
    const groupMaxScore = groupScores.length > 0 ? Math.max(...groupScores) : (totalEarned > 0 ? totalEarned : 100);

    const baseGroupMax = groupMaxScore > 0 ? groupMaxScore : 100;
    const relativePercentage = totalEarned > 0 ? Math.min(100, Math.round((totalEarned / baseGroupMax) * 100)) : 0;

    const sortedScores = Object.entries(studentTotalScores).sort(([, a], [, b]) => b - a);
    const myRankIndex = sortedScores.findIndex(([code]) => code === studentCode || code === studentName);
    const groupRank = myRankIndex !== -1 ? myRankIndex + 1 : 1;
    const totalStudentsInGroup = Math.max(sortedScores.length, 1);

    let tierColor: 'emerald' | 'amber' | 'rose' = 'emerald';
    let tierLabel = 'فارس متميز في لغة الضاد 🌟';
    if (relativePercentage < 50) {
      tierColor = 'rose';
      tierLabel = 'يحتاج لمزيد من المتابعة والاجتهاد ⚠️';
    } else if (relativePercentage < 85) {
      tierColor = 'amber';
      tierLabel = 'مستوى جيد ويسعى للقمة 📈';
    }

    return {
      totalLessons,
      attendedLessons,
      absentLessons,
      attendanceRate,
      totalEarned,
      groupMaxScore: baseGroupMax,
      relativePercentage,
      groupRank,
      totalStudentsInGroup,
      tierColor,
      tierLabel
    };
  }, [filteredMonthRecords, groupRecords, selectedMonth, studentCode, studentName]);

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-amber-950 border-2 border-amber-500/40 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-amber-300 shadow-inner">
              <GraduationCap className="w-10 h-10" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black bg-amber-500 text-stone-950 px-3 py-0.5 rounded-full uppercase tracking-wider">
                  سجل التقييم والمتابعة الأكاديمية
                </span>
                <span className="text-xs font-bold text-amber-300">
                  إشراف الأستاذ أحمد تامر 📜
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                بطاقة تقييم البطل: <span className="text-amber-400">{studentName}</span>
              </h2>
              <p className="text-sm font-medium text-stone-300 mt-1 flex items-center gap-3 flex-wrap">
                <span>كود الطالب: <strong className="text-amber-300 font-mono">{studentCode || 'غير محدد'}</strong></span>
                <span>•</span>
                <span>المجموعة: <strong className="text-emerald-300">{groupName}</strong></span>
                <span>•</span>
                <span>الصف: <strong className="text-amber-200">{className}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="p-3 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-700/60 rounded-xl transition flex items-center gap-2 text-xs font-bold"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition text-xs font-bold"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Month Selector Tabs */}
      <div className="bg-stone-900/90 border border-amber-900/40 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-lg">
        <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
          <Calendar className="w-5 h-5 text-amber-400" />
          <span>اختر الشهر الدراسي لعرض التقرير:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {MONTH_NAMES.map(month => {
            const isActive = month === activeMonth;
            const isSelected = month === selectedMonth;
            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/30 scale-105 font-black'
                    : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
                }`}
              >
                <span>{month}</span>
                {isActive && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/50 px-1.5 py-0.2 rounded-md font-mono">
                    الشهر الحالي
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="bg-stone-900/80 border border-stone-800 p-12 rounded-3xl text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
          <p className="text-stone-300 font-bold">جاري جلب سجلات درجات وتقييمات الطالب...</p>
        </div>
      ) : (
        <>
          {/* Main Hero Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-3xl border-2 relative overflow-hidden shadow-xl ${
                computedStats.tierColor === 'emerald'
                  ? 'bg-gradient-to-br from-emerald-950/80 to-stone-900 border-emerald-500/50'
                  : computedStats.tierColor === 'amber'
                  ? 'bg-gradient-to-br from-amber-950/80 to-stone-900 border-amber-500/50'
                  : 'bg-gradient-to-br from-rose-950/80 to-stone-900 border-rose-500/50'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 bg-white/10 rounded-2xl text-amber-300">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black font-mono text-white">
                  {computedStats.relativePercentage}%
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-300">المستوى النسبي للمجموعة</h4>
              <p className="text-xs font-semibold mt-1 text-stone-200">
                {computedStats.tierLabel}
              </p>
              <div className="w-full bg-stone-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    computedStats.tierColor === 'emerald' ? 'bg-emerald-400' : computedStats.tierColor === 'amber' ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${computedStats.relativePercentage}%` }}
                ></div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-stone-900 to-amber-950/40 border-2 border-amber-500/40 p-6 rounded-3xl relative overflow-hidden shadow-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400">
                  <Flame className="w-6 h-6" />
                </div>
                <div className="text-left font-mono">
                  <span className="text-2xl font-black text-amber-300">{computedStats.totalEarned}</span>
                  <span className="text-xs text-stone-400 font-normal"> / {computedStats.groupMaxScore}</span>
                </div>
              </div>
              <h4 className="text-xs font-bold text-stone-300">مجموع درجات الحصص</h4>
              <p className="text-xs text-stone-400 mt-1">مقارنة بأعلى درجة محققة في {groupName}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-amber-950/60 to-stone-900 border-2 border-amber-500/40 p-6 rounded-3xl relative overflow-hidden shadow-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black font-mono text-amber-300">
                  #{computedStats.groupRank}
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-300">الترتيب في المجموعة</h4>
              <p className="text-xs text-stone-400 mt-1">من إجمالي {computedStats.totalStudentsInGroup} طالب</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-emerald-950/60 to-stone-900 border-2 border-emerald-500/40 p-6 rounded-3xl relative overflow-hidden shadow-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black font-mono text-emerald-300">
                  {computedStats.attendanceRate}%
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-300">نسبة الحضور والانضباط</h4>
              <p className="text-xs text-emerald-400 mt-1">
                حضر {computedStats.attendedLessons} حصص • غاب {computedStats.absentLessons} حصة
              </p>
            </motion.div>
          </div>

          {/* Lessons & Evaluations Breakdown List */}
          <div className="bg-stone-900/90 border border-stone-800 p-6 rounded-3xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">سجل حصص وتقييمات شهر ({selectedMonth})</h3>
                  <p className="text-xs text-stone-400">تفاصيل الواجب، التسميع، إملاء/نحو، وامتحان الحصة</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-950 border border-amber-700/60 text-amber-300 px-3 py-1 rounded-full font-mono">
                {filteredMonthRecords.length} حصة مسجلة
              </span>
            </div>

            {filteredMonthRecords.length === 0 ? (
              <div className="p-12 text-center bg-stone-950/60 rounded-2xl border border-dashed border-stone-800 space-y-3">
                <AlertCircle className="w-12 h-12 text-stone-600 mx-auto" />
                <h4 className="text-stone-300 font-bold">لا توجد تقييمات مسجلة لشهر ({selectedMonth}) حتى الآن.</h4>
                <p className="text-xs text-stone-500">سيقوم الأستاذ أحمد تامر ومساعدوه برصد درجات الحصص فور انتهائها.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMonthRecords.map((record, index) => {
                  const isAttended = record.attendance === 'حضر';
                  return (
                    <motion.div
                      key={record.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-5 rounded-2xl border transition-all ${
                        isAttended
                          ? 'bg-stone-950/80 border-amber-900/40 hover:border-amber-500/60'
                          : 'bg-rose-950/30 border-rose-900/60 hover:border-rose-500/60'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-stone-800/80 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-mono font-black text-xs flex items-center justify-center border border-amber-500/30">
                            #{record.lesson_number || index + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-white text-sm">
                              الحصة رقم {record.lesson_number || index + 1}
                            </h4>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {record.lesson_date || 'تاريخ غير محدد'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                            isAttended
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {isAttended ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              حضر ✅
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              غاب ❌
                            </>
                          )}
                        </span>
                      </div>

                      {isAttended ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                          <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                            <span className="text-[10px] text-stone-400 block font-bold mb-0.5">الواجب</span>
                            <span className="text-sm font-black font-mono text-cyan-300">
                              {record.homework_degree ?? 0} <span className="text-[10px] text-stone-500 font-normal">/{record.max_homework_degree || 10}</span>
                            </span>
                          </div>

                          <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                            <span className="text-[10px] text-stone-400 block font-bold mb-0.5">التسميع</span>
                            <span className="text-sm font-black font-mono text-indigo-300">
                              {record.recitation_degree ?? 0} <span className="text-[10px] text-stone-500 font-normal">/{record.max_recitation_degree || 10}</span>
                            </span>
                          </div>

                          <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                            <span className="text-[10px] text-stone-400 block font-bold mb-0.5">امتحان الحصة</span>
                            <span className="text-sm font-black font-mono text-amber-300">
                              {record.exam_degree ?? 0} <span className="text-[10px] text-stone-500 font-normal">/{record.max_exam_degree || 20}</span>
                            </span>
                          </div>

                          <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                            <span className="text-[10px] text-amber-400 block font-bold mb-0.5">الامتحان الشامل</span>
                            <span className="text-sm font-black font-mono text-emerald-300">
                              {record.comprehensive_exam_degree !== null && record.comprehensive_exam_degree !== undefined && record.comprehensive_exam_degree !== '' ? `${record.comprehensive_exam_degree} /${record.max_comprehensive_exam_degree || 50}` : '-'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-900/50 text-center">
                          <p className="text-xs text-rose-300 font-bold">
                            تم تسجيل غياب في هذه الحصة.
                          </p>
                        </div>
                      )}

                      {record.teacher_note && (
                        <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-xs text-amber-300 flex items-center gap-1.5 bg-amber-950/20 p-2 rounded-xl">
                          <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>ملاحظة الأستاذ أحمد تامر: {record.teacher_note}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
