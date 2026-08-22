import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, CheckCircle2 } from 'lucide-react';

const APK_DOWNLOAD_URL = "https://github.com/U-WWW/el5emya2e-apk/releases/download/apk/default.apk";

export function isAndroidWebView(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  
  // 1. Check for custom Android JavaScript interfaces injected by Android native webview apps
  if (
    (window as any).Android !== undefined || 
    (window as any).AndroidInterface !== undefined || 
    (window as any).jsBridge !== undefined ||
    (window as any).flutter_inappwebview !== undefined ||
    (window as any).ReactNativeWebView !== undefined
  ) {
    return true;
  }

  // 2. Check if user agent indicates Android device
  const isAndroid = ua.includes('android');
  if (!isAndroid) return false;

  // 3. Check for Android WebView signatures in UserAgent
  const isWv = /\bwv\b/.test(ua) || ua.includes('; wv') || ua.includes('(wv)');
  const isVersionChrome = ua.includes('version/') && ua.includes('chrome/');
  const isStandalone = Boolean((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches);

  const searchParams = new URLSearchParams(window.location.search);
  const isAppQuery = searchParams.get('app') === 'true' || searchParams.get('webview') === 'true' || searchParams.get('is_apk') === 'true';

  return isWv || isVersionChrome || isStandalone || isAppQuery;
}

export default function AppDownloadPrompt() {
  const [inWebView, setInWebView] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  useEffect(() => {
    // Check WebView state
    const detectedWebView = isAndroidWebView();
    setInWebView(detectedWebView);

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('khemiai_apk_prompt_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // DO NOT show anything if the user is using the Android WebView / App!
  if (inWebView) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('khemiai_apk_prompt_dismissed', 'true');
  };

  return (
    <div className="relative z-50 w-full max-w-full overflow-hidden">
      {/* Top Fixed / Sticky Banner */}
      {!isDismissed ? (
        <div className="w-full bg-gradient-to-r from-amber-50 via-sky-50 to-emerald-50 border-b border-amber-200 text-slate-800 shadow-sm px-3 py-2.5 sm:px-6 relative transition-all">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-right">
            
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="p-2 bg-amber-100 border border-amber-300 rounded-xl shrink-0 text-amber-700 shadow-inner">
                <Smartphone className="w-5 h-5 animate-pulse" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-xs sm:text-base text-slate-900 tracking-wide">
                    تطبيق الأندرويد الرسمي 📱
                  </span>
                  <span className="bg-amber-200/70 border border-amber-300 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-600" /> تحميل مباشر
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 font-medium hidden sm:block">
                  حمل التطبيق للوصول السريع، مشاهدة الدروس بدون تقطيع، وتلقي إشعارات الحصص أولاً بأول!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                download="Elkhemiaey.apk"
                className="flex-1 md:flex-none bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5 border border-amber-300/40 transform active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل التطبيق (APK)</span>
              </a>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition cursor-pointer"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* Floating Pill Button if dismissed so user can still access the download link */
        <div className="fixed bottom-4 left-4 z-40 max-w-[calc(100vw-32px)] pointer-events-auto">
          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            download="Elkhemiaey.apk"
            className="flex items-center gap-1.5 bg-white/95 hover:bg-amber-50 border border-amber-300 text-amber-800 px-3 py-2 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 transform active:scale-95 text-xs font-bold"
            title="تحميل تطبيق الأندرويد الرسمي"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="whitespace-nowrap">تطبيق الأندرويد</span>
            <Download className="w-3 h-3 text-emerald-600 shrink-0" />
          </a>
        </div>
      )}
    </div>
  );
}
