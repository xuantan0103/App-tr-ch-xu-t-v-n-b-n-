
import React, { useState, useRef, useEffect } from 'react';
import { extractDataFromPdf } from './services/geminiService';
import { DataTable } from './components/DataTable';
import { BannerCarousel } from './components/BannerCarousel';
import { exportToExcel } from './utils/excelExport';
import { ExtractedDocument, ProcessingStatus, ExcelExportConfig, ThemeConfig, User, UserRole, HistoryItem } from './types';
import { 
  FileUp, FileSpreadsheet, Loader2, AlertCircle, FileText, CheckCircle2, 
  Trash2, Check, Copy, RotateCcw, Palette, PaintBucket, 
  LogOut, UserPlus, Users, LayoutDashboard, Key, User as UserIcon,
  ShieldCheck, Eye, EyeOff, Info, Lock, Settings, X, Sparkles, RefreshCw,
  UploadCloud, History, Clock, Calendar, SearchCheck, BookOpenCheck,
  MousePointer2, Zap, FileCheck, ClipboardList, ChevronRight
} from 'lucide-react';

const THEMES: ThemeConfig[] = [
  { id: 'blue', name: 'Xanh dương', primary: 'blue', gray: 'slate' },
  { id: 'emerald', name: 'Thiên nhiên', primary: 'emerald', gray: 'zinc' },
  { id: 'violet', name: 'Sáng tạo', primary: 'violet', gray: 'slate' },
  { id: 'rose', name: 'Nổi bật', primary: 'rose', gray: 'stone' },
  { id: 'amber', name: 'Mặc định', primary: 'amber', gray: 'neutral' },
];

const BACKGROUND_OPTIONS = [
  { color: '#FFFFCC', name: 'Vàng kem' },
  { color: '#FFFFFF', name: 'Trắng' },
  { color: '#F0F9FF', name: 'Xanh trời' },
  { color: '#F0FDF4', name: 'Xanh lá' },
  { color: '#FFF1F2', name: 'Hồng phấn' },
  { color: '#FAF5FF', name: 'Tím nhạt' },
  { color: '#F3F4F6', name: 'Xám ghi' },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('app_users');
    const NEW_MASTER_USER = { 
      id: 'admin-1', 
      username: 'Tanpham0103', 
      password: '01032001', 
      role: 'admin' as UserRole, 
      createdAt: Date.now() 
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const adminIdx = parsed.findIndex((u: User) => u.id === 'admin-1');
        if (adminIdx !== -1) {
          // Luôn cập nhật thông tin Master Admin mới nhất
          parsed[adminIdx].username = NEW_MASTER_USER.username;
          parsed[adminIdx].password = NEW_MASTER_USER.password;
        } else {
          parsed.unshift(NEW_MASTER_USER);
        }
        return parsed;
      } catch (e) { console.error(e); }
    }
    return [NEW_MASTER_USER];
  });
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'extract' | 'admin'>('extract');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adminMsg, setAdminMsg] = useState({ text: '', type: 'success' });

  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedDocument[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('app_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [backgroundColor, setBackgroundColor] = useState<string>(() => localStorage.getItem('app_bg_color') || '#FFFFCC');
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => {
    const savedThemeId = localStorage.getItem('app_theme_id');
    if (savedThemeId) {
      const found = THEMES.find(t => t.id === savedThemeId);
      if (found) return found;
    }
    return THEMES[4];
  });

  const [excelConfig] = useState<ExcelExportConfig>({ fontName: 'Times New Roman', fontSize: 14, wrapText: true, allBorders: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const configPanelRef = useRef<HTMLDivElement>(null);
  const p = currentTheme.primary;
  const g = currentTheme.gray;

  useEffect(() => { localStorage.setItem('app_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('app_history', JSON.stringify(history)); }, [history]);

  useEffect(() => {
    const session = localStorage.getItem('app_session');
    if (session) {
      try {
        const loggedUser = JSON.parse(session);
        const validUser = users.find(u => u.username === loggedUser.username && u.password === loggedUser.password);
        if (validUser) setCurrentUser(validUser);
        else localStorage.removeItem('app_session');
      } catch (e) { localStorage.removeItem('app_session'); }
    }
    setIsAuthLoading(false);
  }, [users]);

  useEffect(() => { localStorage.setItem('app_bg_color', backgroundColor); }, [backgroundColor]);
  useEffect(() => { localStorage.setItem('app_theme_id', currentTheme.id); }, [currentTheme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configPanelRef.current && !configPanelRef.current.contains(event.target as Node)) {
        setShowConfigPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let interval: any;
    if (status === ProcessingStatus.PROCESSING) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => (prev >= 98 ? 98 : prev + (prev > 80 ? 0.5 : 2)));
      }, 600);
    } else if (status === ProcessingStatus.SUCCESS) {
      setProgress(100);
      notify("Bóc tách thành công!", "success");
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [status]);

  const notify = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 4000);
  };

  const isMasterAdmin = currentUser?.id === 'admin-1';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const user = users.find(u => u.username === loginUsername && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('app_session', JSON.stringify(user));
      notify(`Chào mừng trở lại, ${user.username}!`, "success");
    } else setLoginError('Tài khoản hoặc mật khẩu không chính xác.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_session');
    setView('extract');
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg({ text: '', type: 'success' });
    
    if (users.find(u => u.username === newUsername)) {
      setAdminMsg({ text: 'Tên đăng nhập đã tồn tại.', type: 'error' });
      return;
    }
    
    const newUser: User = {
      id: crypto.randomUUID(),
      username: newUsername,
      password: newPassword,
      role: 'admin',
      createdAt: Date.now()
    };
    
    setUsers(prev => [...prev, newUser]);
    setNewUsername('');
    setNewPassword('');
    setAdminMsg({ text: 'Đã tạo tài khoản thành công.', type: 'success' });
    notify("Cấp tài khoản mới thành công", "success");
  };

  const handleResetPassword = (userId: string) => {
    if (!resetPasswordValue.trim()) {
      notify("Vui lòng nhập mật khẩu mới", "error");
      return;
    }
    
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: resetPasswordValue } : u));
    setResettingUserId(null);
    setResetPasswordValue('');
    notify("Đã thay đổi mật khẩu thành công", "success");
  };

  const deleteUser = (userId: string) => {
    if (userId === 'admin-1') return;
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      notify("Đã xóa tài khoản thành công", "info");
    }
  };

  const processFile = async (fileToProcess: File) => {
    if (fileToProcess.type !== 'application/pdf') {
      setStatus(ProcessingStatus.ERROR);
      setErrorMessage('Định dạng file không được hỗ trợ. Vui lòng chọn file PDF.');
      notify("File không hợp lệ!", "error");
      return;
    }
    setFile(fileToProcess);
    setStatus(ProcessingStatus.PROCESSING);
    setErrorMessage('');
    setExtractedData([]);
    
    try {
      const data = await extractDataFromPdf(fileToProcess);
      
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fileName: fileToProcess.name,
        data: data
      };
      setHistory(prev => [newHistoryItem, ...prev]);

      setExtractedData(data);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (error: any) {
      setStatus(ProcessingStatus.ERROR);
      setErrorMessage(error.message);
      notify("Lỗi trích xuất!", "error");
    }
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setExtractedData(item.data);
    setStatus(ProcessingStatus.SUCCESS);
    const mockFile = new File([""], item.fileName, { type: "application/pdf" });
    setFile(mockFile);
    setShowHistory(false);
    notify("Đã khôi phục dữ liệu lịch sử", "info");
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
      setHistory(prev => prev.filter(item => item.id !== id));
      notify("Đã xóa bản ghi lịch sử", "info");
    }
  };

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0F172A] px-4 font-sans">
        <style>{`
          .login-gradient-blob {
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0) 70%);
            border-radius: 50%;
            filter: blur(40px);
            z-index: 1;
            animation: floating-blob 20s infinite alternate;
          }
          @keyframes floating-blob {
            from { transform: translate(-10%, -10%) scale(1); }
            to { transform: translate(10%, 10%) scale(1.1); }
          }
          .login-card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .login-input {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .login-input:focus {
            border-color: #3B82F6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
            background: rgba(15, 23, 42, 0.8);
          }
          .login-button {
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            transition: all 0.3s ease;
          }
          .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
          }
          .stagger-in {
            animation: staggerIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
            transform: translateY(20px);
          }
          @keyframes staggerIn {
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="login-gradient-blob top-[-10%] left-[-10%]"></div>
        <div className="login-gradient-blob bottom-[-10%] right-[-10%]" style={{ animationDelay: '-10s' }}></div>

        <div className="relative z-10 w-full max-w-lg">
          <div className="login-card rounded-[2.5rem] p-10 md:p-14 text-white">
            <div className="text-center mb-12 stagger-in" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex p-5 rounded-3xl bg-blue-600/20 mb-6 border border-blue-500/30">
                <ShieldCheck size={48} className="text-blue-400" />
              </div>
              <h1 className="text-4xl font-black tracking-tight mb-3">DocuExtract <span className="text-blue-500">AI</span></h1>
              <p className="text-slate-400 text-lg font-medium">Hệ thống bóc tách văn bản nghiệp vụ</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8 stagger-in" style={{ animationDelay: '0.2s' }}>
              <div className="space-y-2.5">
                <label className="text-sm font-bold text-slate-300 ml-1 uppercase tracking-widest">Tài khoản quản trị</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input 
                    type="text" 
                    required 
                    value={loginUsername} 
                    onChange={e => setLoginUsername(e.target.value)} 
                    className="login-input w-full rounded-2xl py-4 pl-12 pr-4 outline-none text-white placeholder:text-slate-600 font-bold" 
                    placeholder="Tên đăng nhập" 
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-sm font-bold text-slate-300 ml-1 uppercase tracking-widest">Mật khẩu hệ thống</label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)} 
                    className="login-input w-full rounded-2xl py-4 pl-12 pr-14 outline-none text-white placeholder:text-slate-600 font-bold" 
                    placeholder="Mật khẩu" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3 animate-pulse">
                  <AlertCircle size={20} />
                  {loginError}
                </div>
              )}

              <button 
                type="submit" 
                className="login-button w-full py-5 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                Xác thực truy cập
                <ChevronRight size={20} />
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-white/5 text-center stagger-in" style={{ animationDelay: '0.3s' }}>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">© 2024 DocuExtract Enterprise Edition</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans relative text-${g}-900 transition-all duration-500`}>
      <style>{`
        @keyframes marquee-lr { 0% { transform: translateX(-100%); } 100% { transform: translateX(100vw); } }
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.2); opacity: 0; } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes scan-line { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes floating { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .animate-blob { animation: blob 7s infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s infinite ease-in-out; }
        .animate-scan { animation: scan-line 3s infinite linear; }
        .animate-float { animation: floating 3s infinite ease-in-out; }
        .drag-glow { box-shadow: 0 0 50px -10px var(--tw-shadow-color); }
        .notification-in { animation: slideInTop 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
        @keyframes slideInTop { from { transform: translateY(-100%) translateX(-50%); opacity: 0; } to { transform: translateY(0) translateX(-50%); opacity: 1; } }
      `}</style>

      {showNotification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm min-w-[300px] border notification-in transition-all
          ${showNotification.type === 'success' ? 'bg-green-600 text-white border-green-500' : 
            showNotification.type === 'error' ? 'bg-red-600 text-white border-red-500' : 
            'bg-blue-600 text-white border-blue-500'}`}>
          {showNotification.type === 'success' ? <CheckCircle2 size={20} /> : 
           showNotification.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
          {showNotification.message}
        </div>
      )}

      <div className="fixed inset-0 z-0 transition-colors duration-700" style={{ backgroundColor }} />
      
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-lg">
            <div className={`w-8 h-8 rounded-full bg-${p}-100 flex items-center justify-center text-${p}-600`}><UserIcon size={16} /></div>
            <div className="flex flex-col"><span className="text-xs font-bold text-slate-400">ADMIN</span><span className="text-sm font-semibold text-slate-700">{currentUser.username}</span></div>
          </div>
          <div className="flex bg-white/90 backdrop-blur-md rounded-full border border-slate-200 shadow-lg p-1">
            <button onClick={() => setView('extract')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'extract' ? `bg-${p}-600 text-white shadow-md` : 'text-slate-500 hover:bg-slate-50'}`}>Công cụ</button>
            <button onClick={() => setView('admin')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'admin' ? `bg-${p}-600 text-white shadow-md` : 'text-slate-500 hover:bg-slate-50'}`}>Quản lý</button>
          </div>
        </div>
        
        <div className="flex gap-2 pointer-events-auto">
          <button 
             onClick={() => setShowHistory(true)}
             className={`p-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full shadow-lg text-slate-600 hover:text-${p}-600 transition-all active:scale-90`}
             title="Lịch sử trích xuất"
          >
             <History size={20} />
          </button>

          <div className="relative" ref={configPanelRef}>
            <button 
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className={`p-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full shadow-lg text-slate-600 hover:text-${p}-600 transition-all active:scale-90`}
            >
              <Settings size={20} />
            </button>
            
            {showConfigPanel && (
              <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-200 z-[100]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Palette size={18} className={`text-${p}-500`} />Tùy chỉnh giao diện</h3>
                  <button onClick={() => setShowConfigPanel(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Màu sắc chủ đạo</label>
                    <div className="flex flex-wrap gap-3">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setCurrentTheme(t)}
                          className={`group relative flex items-center justify-center p-1 rounded-xl transition-all ${currentTheme.id === t.id ? `ring-2 ring-${t.primary}-500 ring-offset-2` : 'hover:scale-110'}`}
                          title={t.name}
                        >
                          <div className={`w-10 h-10 rounded-lg bg-${t.primary}-500 shadow-sm`} />
                          {currentTheme.id === t.id && <Check size={14} className="absolute text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Màu nền trang</label>
                    <div className="grid grid-cols-4 gap-3">
                      {BACKGROUND_OPTIONS.map((bg) => (
                        <button
                          key={bg.color}
                          onClick={() => setBackgroundColor(bg.color)}
                          className={`w-full aspect-square rounded-lg border shadow-sm transition-all ${backgroundColor === bg.color ? 'ring-2 ring-blue-500 ring-offset-2 scale-95 border-blue-200' : 'border-slate-200 hover:scale-105'}`}
                          style={{ backgroundColor: bg.color }}
                          title={bg.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button onClick={handleLogout} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg font-bold transition-all active:scale-95 flex items-center justify-center">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10 pt-16">
        {view === 'extract' ? (
          <>
            <BannerCarousel theme={currentTheme} />
            <div className="text-center mb-10">
              <h1 className={`text-3xl sm:text-5xl font-black text-${g}-900 tracking-tight`}>Hệ thống trích xuất <br/><span className={`text-${p}-600 underline decoration-${p}-200 decoration-8 underline-offset-8`}>văn bản hành chính</span></h1>
              <p className="text-slate-500 mt-6 font-medium max-w-2xl mx-auto leading-relaxed">Sử dụng Trí tuệ nhân tạo thế hệ mới để bóc tách chính xác số ký hiệu, ngày tháng, nội dung trích yếu của hàng trăm văn bản chỉ trong tích tắc.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white overflow-hidden mb-12 relative">
              <div className="p-10">
                <div 
                  className={`group relative border-4 border-dashed rounded-[2rem] p-16 text-center transition-all duration-700 overflow-hidden
                    ${status === ProcessingStatus.PROCESSING ? 'opacity-70 cursor-wait' : 'cursor-pointer'} 
                    ${isDragging ? `border-${p}-500 bg-${p}-50/50 scale-[1.01] drag-glow shadow-${p}-400/50` : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'}`} 
                  onClick={() => status !== ProcessingStatus.PROCESSING && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); if (status !== ProcessingStatus.PROCESSING) setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (status !== ProcessingStatus.PROCESSING && e.dataTransfer.files?.[0]) {
                      const droppedFile = e.dataTransfer.files[0];
                      processFile(droppedFile);
                    }
                  }}
                >
                  {/* High-tech scanning effect during processing */}
                  {status === ProcessingStatus.PROCESSING && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan z-30 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  )}

                  {/* Drag and Drop Overlay */}
                  <div className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-500 pointer-events-none 
                    ${isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <div className="flex flex-col items-center gap-6">
                      <div className={`p-10 rounded-full bg-${p}-600 text-white shadow-2xl animate-bounce-slow flex items-center justify-center ring-8 ring-${p}-100`}>
                        <Zap size={64} fill="currentColor" />
                      </div>
                      <div className="bg-white px-8 py-4 rounded-3xl shadow-xl border border-slate-100 flex items-center gap-3">
                        <MousePointer2 size={24} className={`text-${p}-500`} />
                        <span className={`font-black text-2xl text-slate-800 tracking-tight`}>Thả file để bắt đầu!</span>
                      </div>
                    </div>
                  </div>

                  <input type="file" ref={fileInputRef} onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); }} className="hidden" accept=".pdf" />
                  
                  <div className={`flex flex-col items-center space-y-6 transition-all duration-700 ${isDragging ? 'scale-90 opacity-0 blur-md translate-y-10' : ''}`}>
                    <div className={`relative p-8 rounded-[2rem] transition-all duration-700 shadow-lg ${file ? `bg-${p}-600 text-white` : 'bg-slate-100 text-slate-400 group-hover:scale-110 group-hover:rotate-3'}`}>
                      {status === ProcessingStatus.PROCESSING ? (
                        <div className="relative p-2">
                           <Loader2 className="animate-spin" size={64} strokeWidth={2.5} />
                           <SearchCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" size={24} />
                        </div>
                      ) : (
                        <>
                          <div className={`absolute -inset-4 rounded-[2rem] bg-${p}-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                          <UploadCloud size={64} strokeWidth={1.5} className="relative z-10 animate-float" />
                        </>
                      )}
                    </div>
                    
                    <div className="max-w-md">
                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                           <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 mb-2">
                              <FileCheck size={16} className="text-green-500" />
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{file.name.split('.').pop()}</span>
                           </div>
                           <h3 className="text-2xl font-black text-slate-800 tracking-tight truncate max-w-xs">{file.name}</h3>
                           <p className="text-slate-500 font-medium">
                            {status === ProcessingStatus.SUCCESS ? "Đã hoàn tất trích xuất dữ liệu" : 
                             status === ProcessingStatus.PROCESSING ? "Hệ thống AI đang phân tích đa tầng nội dung..." : 
                             "Tệp đã được sẵn sàng"}
                           </p>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Kéo & Thả tệp PDF tại đây</h3>
                          <p className="text-slate-500 mt-2 font-medium leading-relaxed">Hoặc nhấp vào đây để chọn tệp từ máy tính. <br/>Hỗ trợ bóc tách tất cả các loại văn bản hành chính.</p>
                        </>
                      )}
                    </div>

                    {status === ProcessingStatus.PROCESSING && (
                      <div className="w-full max-w-lg mt-8 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-1 relative">
                          <div className={`h-full bg-gradient-to-r from-${p}-400 via-${p}-600 to-${p}-400 bg-[length:200%_100%] animate-[shimmer_2s_infinite] rounded-full transition-all duration-500 ease-out`} style={{ width: `${progress}%` }}>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-4 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-${p}-500 animate-pulse`}></div>
                            <p className={`text-sm font-black text-${p}-700 uppercase tracking-widest`}>{progress}% Hoàn thành</p>
                          </div>
                          <p className="text-xs font-bold text-slate-400 italic">Đang sử dụng Gemini 3 Pro AI Engine</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {status === ProcessingStatus.ERROR && (
                  <div className="mt-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem] flex items-center gap-5 text-red-700 animate-in fade-in slide-in-from-top-6 duration-700 shadow-lg shadow-red-100/50">
                    <div className="p-4 bg-red-100 rounded-2xl text-red-600 shadow-inner"><AlertCircle size={32} /></div>
                    <div className="flex-1">
                      <p className="text-lg font-black tracking-tight">Cảnh báo lỗi</p>
                      <p className="text-sm font-medium opacity-80 mt-1">{errorMessage}</p>
                    </div>
                    <button onClick={() => { setStatus(ProcessingStatus.IDLE); setFile(null); }} className="p-3 hover:bg-red-200 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                )}

                {status === ProcessingStatus.SUCCESS && extractedData.length > 0 && (
                  <div className="mt-10 flex flex-wrap gap-5 justify-center animate-in fade-in zoom-in-95 duration-700">
                    <button 
                      onClick={() => {
                        exportToExcel(extractedData, file?.name.replace('.pdf', '') || 'van_ban', excelConfig);
                        notify("Đã tải xuống file Excel báo cáo", "success");
                      }} 
                      className="flex items-center gap-4 px-12 py-5 bg-green-600 hover:bg-green-500 text-white rounded-3xl font-black shadow-2xl shadow-green-600/30 transition-all hover:-translate-y-1 active:scale-95 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>
                      <FileSpreadsheet size={24} className="group-hover:rotate-12 transition-transform relative z-10" />
                      <span className="relative z-10 text-lg">XUẤT BÁO CÁO EXCEL</span>
                    </button>
                    <button 
                      onClick={() => { setFile(null); setExtractedData([]); setStatus(ProcessingStatus.IDLE); notify("Đã dọn dẹp kết quả hiện tại", "info"); }} 
                      className="flex items-center gap-3 px-10 py-5 bg-white hover:bg-slate-50 text-slate-700 rounded-3xl font-black transition-all hover:-translate-y-1 active:scale-95 border border-slate-200 shadow-xl"
                    >
                      <RotateCcw size={20} className="group-hover:rotate-[-45deg] transition-transform" />LÀM MỚI
                    </button>
                  </div>
                )}
              </div>
              
              <div ref={resultsRef} className="bg-slate-50/70 p-10 border-t border-slate-200 min-h-[500px] relative">
                {/* Background Pattern for Results Area */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 bg-white text-${p}-600 rounded-2xl shadow-xl border border-slate-100`}><ClipboardList size={28} /></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tighter">
                        Kết quả bóc tách
                        {status === ProcessingStatus.SUCCESS && <Sparkles size={24} className="text-yellow-500 animate-pulse" />}
                        </h2>
                        <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Hệ thống đã nhận diện được {extractedData.length} văn bản</p>
                    </div>
                  </div>
                  {extractedData.length > 0 && (
                    <div className="flex gap-3 w-full md:w-auto">
                      <button 
                        onClick={async () => { 
                          const text = extractedData.map(d => `${d.symbol}\t${d.date}\t${d.summary}\t${d.authority}`).join('\n'); 
                          await navigator.clipboard.writeText(text); 
                          setCopySuccess(true); 
                          notify("Đã sao chép vào Clipboard", "success");
                          setTimeout(() => setCopySuccess(false), 2000); 
                        }} 
                        className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-black transition-all shadow-xl ${copySuccess ? 'bg-green-100 text-green-700 border-green-200' : `bg-white text-${p}-700 border border-${p}-100 hover:border-${p}-300 hover:-translate-y-1`}`}
                      >
                        {copySuccess ? <Check size={20} /> : <Copy size={20} />}
                        {copySuccess ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP TSV'}
                      </button>
                    </div>
                  )}
                </div>
                <DataTable data={extractedData} theme={currentTheme} />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                <div className="flex items-center gap-6 bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 min-w-[300px]">
                   <div className={`p-5 bg-${p}-100 text-${p}-600 rounded-3xl shadow-inner`}><Users size={32}/></div>
                   <div>
                     <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Hệ thống quản trị</p>
                     <p className="text-3xl font-black text-slate-800">{users.length} Thành viên</p>
                   </div>
                </div>
                <div className="bg-blue-600 p-8 rounded-[2rem] shadow-xl text-white flex-1 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={120} /></div>
                   <h2 className="text-2xl font-black tracking-tight mb-2">Trung tâm kiểm soát</h2>
                   <p className="text-blue-100 font-medium opacity-80">Quản lý quyền truy cập và giám sát hệ thống bóc tách văn bản DocuExtract AI.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 relative">
                <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><UserPlus className={`text-${p}-500`} />Cấp tài khoản mới</h3>
                {isMasterAdmin ? (
                  <form onSubmit={handleCreateAdmin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập</label>
                      <input type="text" required value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold" placeholder="username" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu khởi tạo</label>
                      <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold" placeholder="••••••••" />
                    </div>
                    <button type="submit" className={`w-full py-5 bg-${p}-600 hover:bg-${p}-700 text-white font-black rounded-2xl shadow-xl shadow-${p}-600/20 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm`}>
                      Xác nhận tạo
                    </button>
                    {adminMsg.text && <p className={`text-sm font-bold text-center mt-4 p-3 rounded-xl ${adminMsg.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{adminMsg.text}</p>}
                  </form>
                ) : (
                  <div className="text-center p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100">
                       <Lock className="text-slate-400" size={32} />
                    </div>
                    <p className="text-lg font-black text-slate-800">Quyền hạn hạn chế</p>
                    <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">Chỉ có tài khoản Master Admin mới có thể thực hiện thao tác quản lý thành viên.</p>
                  </div>
                )}
              </div>
              
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 h-fit">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Users className={`text-${p}-500`} />Danh sách Quản trị viên</h3>
                  <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cập nhật {new Date().toLocaleDateString('vi-VN')}</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b-2 border-slate-50">
                        <th className="pb-6 text-xs font-black text-slate-400 uppercase tracking-widest">Thông tin tài khoản</th>
                        <th className="pb-6 text-xs font-black text-slate-400 uppercase tracking-widest">Phân quyền</th>
                        <th className="pb-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Tùy chọn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map(u => (
                        <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-6 pr-4">
                            <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 rounded-2xl bg-${p}-50 flex items-center justify-center text-${p}-600 font-black text-lg shadow-sm border border-${p}-100`}>
                                 {u.username.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                 <p className="font-black text-slate-800 text-lg flex items-center gap-2">
                                   {u.username} 
                                   {u.id === 'admin-1' && <Zap size={16} className="text-amber-500 fill-amber-500" title="Master Account" />}
                                 </p>
                                 <p className="text-xs font-medium text-slate-400">ID: {u.id.slice(0, 8)}</p>
                               </div>
                            </div>
                          </td>
                          <td className="py-6">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${u.id === 'admin-1' ? 'bg-purple-600 text-white border-purple-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                              {u.id === 'admin-1' ? 'Master Admin' : 'Hệ thống Admin'}
                            </span>
                          </td>
                          <td className="py-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {isMasterAdmin && u.id !== 'admin-1' ? (
                                <>
                                  {resettingUserId === u.id ? (
                                    <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
                                      <input 
                                        type="text" 
                                        placeholder="Mật khẩu mới"
                                        value={resetPasswordValue}
                                        onChange={(e) => setResetPasswordValue(e.target.value)}
                                        className="text-xs px-4 py-2 border border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold w-40"
                                      />
                                      <button 
                                        onClick={() => handleResetPassword(u.id)}
                                        className="p-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl shadow-lg transition-all"
                                        title="Lưu mật khẩu"
                                      >
                                        <Check size={18} strokeWidth={3} />
                                      </button>
                                      <button 
                                        onClick={() => { setResettingUserId(null); setResetPasswordValue(''); }}
                                        className="p-2.5 bg-slate-200 text-slate-500 hover:bg-slate-300 rounded-xl transition-all"
                                        title="Hủy"
                                      >
                                        <X size={18} strokeWidth={3} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => setResettingUserId(u.id)} 
                                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                                        title="Thay đổi mật khẩu"
                                      >
                                        <RefreshCw size={22} />
                                      </button>
                                      <button 
                                        onClick={() => deleteUser(u.id)} 
                                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                        title="Vô hiệu hóa tài khoản"
                                      >
                                        <Trash2 size={22} />
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-300" title="Tài khoản hệ thống - Không thể chỉnh sửa">
                                   <Lock size={20} />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                <div className="flex items-center gap-6">
                  <div className={`p-5 bg-${p}-600 text-white rounded-3xl shadow-2xl shadow-${p}-600/30 animate-float`}><History size={32} /></div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Thư viện trích xuất</h3>
                    <p className="text-slate-500 font-medium text-lg">Khôi phục nhanh chóng các phiên làm việc trước đó</p>
                  </div>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-4 hover:bg-white hover:shadow-lg rounded-full transition-all text-slate-400 hover:text-slate-600 bg-slate-100"><X size={32}/></button>
              </div>
              
              <div className="overflow-y-auto p-10 space-y-5 bg-slate-50/50 flex-1">
                 {history.length === 0 ? (
                    <div className="text-center py-24 text-slate-400">
                       <div className="bg-white w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl border border-slate-100 opacity-50">
                         <Clock size={64} />
                       </div>
                       <p className="text-xl font-bold">Chưa có dữ liệu lịch sử</p>
                       <p className="mt-2 font-medium">Bắt đầu trích xuất văn bản để lưu trữ lịch sử tại đây.</p>
                    </div>
                 ) : (
                   history.map((item) => (
                      <div key={item.id} className="group bg-white border border-white p-6 rounded-3xl hover:shadow-2xl hover:border-blue-100 transition-all duration-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                         <div className="flex items-center gap-6 overflow-hidden flex-1">
                            <div className={`p-5 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-${p}-600 group-hover:text-white group-hover:shadow-xl transition-all duration-500`}>
                               <FileText size={28} />
                            </div>
                            <div className="min-w-0">
                               <h4 className="text-xl font-black text-slate-800 truncate tracking-tight">{item.fileName}</h4>
                               <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400 mt-2">
                                  <span className="flex items-center gap-2 font-bold"><Calendar size={16} className={`text-${p}-500`} /> {new Date(item.timestamp).toLocaleString('vi-VN')}</span>
                                  <span className="flex items-center gap-2 font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-600"><CheckCircle2 size={16} className="text-green-500" /> {item.data.length} văn bản</span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button 
                               onClick={() => handleRestoreHistory(item)}
                               className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-slate-100 hover:bg-${p}-600 hover:text-white text-slate-600 rounded-2xl font-black text-sm transition-all shadow-sm hover:shadow-xl group/btn`}
                            >
                               <Eye size={20} className="group-hover/btn:scale-110 transition-transform" /> <span className="uppercase tracking-widest">Xem lại</span>
                            </button>
                            <button 
                               onClick={(e) => handleDeleteHistory(item.id, e)}
                               className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all hover:shadow-md"
                               title="Gỡ khỏi thư viện"
                            >
                               <Trash2 size={24} />
                            </button>
                         </div>
                      </div>
                   ))
                 )}
              </div>
              
              {history.length > 0 && (
                <div className="p-8 border-t border-slate-100 bg-white flex justify-end">
                   <button 
                      onClick={() => { if(window.confirm("Xóa toàn bộ thư viện lịch sử?")) { setHistory([]); notify("Đã xóa sạch lịch sử", "info"); } }}
                      className="text-red-500 text-sm font-black hover:underline flex items-center gap-2 uppercase tracking-widest"
                   >
                      <Trash2 size={18} /> Xóa vĩnh viễn tất cả
                   </button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
