import React, { useState, useEffect } from 'react';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import AppDownloadPrompt from './components/AppDownloadPrompt';

export default function App() {
  const [portal, setPortal] = useState<'student' | 'admin'>('student');
  const [theme, setTheme] = useState<'khemiai_dark' | 'atomic_glow' | 'deep_emerald'>('khemiai_dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('khemiai_theme') as 'khemiai_dark' | 'atomic_glow' | 'deep_emerald';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: 'khemiai_dark' | 'atomic_glow' | 'deep_emerald') => {
    setTheme(newTheme);
    localStorage.setItem('khemiai_theme', newTheme);
  };

  // URL query parameter check & pathname check to isolate admin area
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const isAdminParam = 
      queryParams.get('admin') === 'true' || 
      queryParams.get('admin') === '' || 
      window.location.search.includes('admin') ||
      queryParams.get('role') === 'admin' || 
      queryParams.get('portal') === 'admin';
    const isAdminPath = 
      window.location.pathname === '/admin' || 
      window.location.pathname.startsWith('/admin/') ||
      window.location.hash.includes('admin');

    if (isAdminParam || isAdminPath) {
      setPortal('admin');
    } else {
      setPortal('student');
    }
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem('jamal_admin_auth');
    // Keep or set the admin query param so we always stay on the admin panel login screen
    const url = new URL(window.location.href);
    url.searchParams.set('admin', 'true');
    url.searchParams.delete('role');
    url.searchParams.delete('portal');
    window.history.replaceState({}, '', url.toString());
    setPortal('admin');
  };

  const handleStudentLogout = () => {
    localStorage.removeItem('jamal_student');
    window.location.reload();
  };

  const getBackgroundDetails = () => {
    if (theme === 'atomic_glow') {
      return {
        overlay: 'bg-amber-50/85',
        image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2000&auto=format&fit=crop'
      };
    }
    if (theme === 'deep_emerald') {
      return {
        overlay: 'bg-emerald-50/85',
        image: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop'
      };
    }
    return {
      overlay: 'bg-slate-50/90',
      image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop'
    };
  };

  const bgDetails = getBackgroundDetails();

  return (
    <div className="min-h-screen relative font-sans text-slate-800 overflow-x-hidden bg-gradient-to-br from-amber-50/40 via-sky-50/30 to-emerald-50/40 w-full max-w-full">
      {/* Cheerful Soft Background Accents */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${bgDetails.image})` }}
      ></div>
      {/* Light Cheerful Overlay */}
      <div className={`absolute inset-0 ${bgDetails.overlay} backdrop-blur-[2px] transition-colors duration-1000 pointer-events-none`}></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200/20 via-sky-100/10 to-transparent pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-full">
        {portal === 'student' && <AppDownloadPrompt />}
        
        {portal === 'student' && (
          <StudentDashboard onLogout={handleStudentLogout} currentTheme={theme} onThemeChange={handleThemeChange} />
        )}
        {portal === 'admin' && (
          <AdminDashboard onLogout={handleAdminLogout} />
        )}
      </div>
    </div>
  );
}