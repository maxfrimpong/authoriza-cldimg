
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';
import { LogOut, LayoutDashboard, RefreshCw, Bell, Check, X, User as UserIcon, Menu, Moon, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChatWidget } from './ChatWidget';
import { Toaster } from 'react-hot-toast';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { user, activeRole, switchRole, logout, notifications, markAsRead, markAllAsRead, logoUrl, copyrightText, theme, toggleTheme } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Filter notifications for current user
  const myNotifications = notifications.filter(n => n.userId === user?.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  if (!user || !activeRole) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</div>;
  }

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'My Profile', icon: UserIcon, path: '/profile' },
  ];

  const handleNotificationClick = (id: string, metadata?: { requestId?: string }) => {
      markAsRead(id);
      setShowNotifications(false);
      if (metadata?.requestId) {
          navigate(`/?requestId=${metadata.requestId}`);
      }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
      e.stopPropagation();
      markAllAsRead();
  };

  const NotificationPanel = () => (
    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Notifications</h3>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs text-brand-teal hover:text-brand-dark dark:hover:text-teal-400 font-medium">
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {myNotifications.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-xs">No notifications</div>
        ) : (
          myNotifications.map(notification => (
            <div 
              key={notification.id} 
              onClick={() => handleNotificationClick(notification.id, notification.metadata)}
              className={`p-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${!notification.isRead ? 'bg-brand-teal/5 dark:bg-teal-900/20' : ''}`}
            >
              <div className="flex gap-3">
                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-brand-orange' : 'bg-transparent'}`} />
                <div>
                   <p className={`text-sm ${!notification.isRead ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                     {notification.message}
                   </p>
                   <p className="text-xs text-gray-400 mt-1">
                     {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · {new Date(notification.createdAt).toLocaleDateString()}
                   </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Pop-up Toaster */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-brand-dark text-white flex flex-col 
        transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        md:translate-x-0 md:static md:inset-auto md:flex-shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-white/10 flex flex-col relative">
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="absolute top-4 right-4 text-white/50 hover:text-white md:hidden"
          >
            <X size={20} />
          </button>
          
          <div className="bg-white p-3 rounded-lg w-full flex items-center justify-center mb-4 shadow-sm h-20">
             <img src={logoUrl} alt="Organization Logo" className="max-h-full max-w-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white pl-1">
            Authoriza
          </h1>
          <p className="text-brand-teal text-xs mt-1 pl-1">YOTA Payment Request System</p>
        </div>

        {/* Role Switcher if applicable */}
        {user.roles.length > 1 && (
           <div className="px-6 py-4 bg-black/20 border-b border-white/10">
              <label className="text-xs text-brand-teal font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1">
                 <RefreshCw size={10} /> Switch View
              </label>
              <select 
                value={activeRole}
                onChange={(e) => switchRole(e.target.value as Role)}
                className="w-full bg-brand-dark text-white text-xs border border-white/20 rounded p-2 focus:ring-1 focus:ring-brand-teal focus:outline-none dark:bg-gray-800 dark:border-gray-600"
              >
                  {user.roles.map(r => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
              </select>
           </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-brand-teal text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto md:hidden">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 bg-black/20 hover:bg-black/40 py-2 rounded-md text-sm transition-colors text-gray-300 hover:text-white"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen relative w-full">
          
          {/* Desktop Header */}
          <header className="hidden md:flex justify-between items-center py-4 px-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {location.pathname === '/profile' ? 'User Profile' : 
                 activeRole === Role.ADMIN ? 'System Administration' : 
                 activeRole === Role.APPROVER ? 'Executive Portal' : 
                 activeRole === Role.AUTHORIZER ? 'Authorizer Dashboard' : 
                 activeRole === Role.AUDITOR ? 'Auditor Access Portal' : 
                 activeRole === Role.SUPERVISOR ? 'Supervisor Dashboard' : 'Staff Dashboard'}
              </h2>
              
              <div className="flex items-center space-x-6">
                  {/* Theme Toggle */}
                  <button 
                    onClick={toggleTheme}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none"
                    title="Toggle Theme"
                  >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                  </button>

                  {/* Notification Bell */}
                  <div className="relative" ref={notificationRef}>
                      <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none"
                      >
                          <Bell size={20} />
                          {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-brand-orange rounded-full border-2 border-white dark:border-gray-800"></span>
                          )}
                      </button>
                      {showNotifications && <NotificationPanel />}
                  </div>

                  {/* User Profile Snippet */}
                  <Link to="/profile" className="flex items-center space-x-3 pl-6 border-l border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-2 rounded-lg cursor-pointer">
                     <div className="text-right">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.department}</p>
                     </div>
                     <div className="w-9 h-9 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold border-2 border-white dark:border-gray-600 shadow-sm overflow-hidden">
                        {user.profilePictureUrl ? (
                            <img src={user.profilePictureUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            user.name.charAt(0)
                        )}
                     </div>
                  </Link>

                  {/* Sign Out Button (Desktop) */}
                  <button
                    onClick={logout}
                    className="flex items-center justify-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={20} />
                  </button>
              </div>
          </header>

          {/* Mobile Header */}
          <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-brand-dark z-30 flex items-center justify-between px-4 shadow-md">
            <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="text-white hover:bg-white/10 p-2 rounded-md focus:outline-none"
                >
                  <Menu size={24} />
                </button>
                <div className="bg-white p-1 rounded h-8 w-20 flex items-center justify-center">
                   <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={toggleTheme}
                    className="text-white hover:bg-white/10 p-2 rounded-full focus:outline-none"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <Link to="/profile" className="text-gray-300 hover:text-white flex items-center">
                    <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold border border-white/20 overflow-hidden bg-white/10">
                        {user.profilePictureUrl ? (
                            <img src={user.profilePictureUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={16} className="text-white" />
                        )}
                    </div>
                </Link>
                <div className="relative" ref={notificationRef}>
                      <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-gray-300 hover:bg-white/10 rounded-full transition-colors"
                      >
                          <Bell size={20} />
                          {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-brand-orange rounded-full border-2 border-brand-dark"></span>
                          )}
                      </button>
                      {showNotifications && <NotificationPanel />}
                </div>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto md:pt-0 pt-16 bg-gray-50 dark:bg-gray-900 relative flex flex-col w-full transition-colors duration-200">
            <div className="max-w-7xl mx-auto p-4 md:p-8 w-full flex-grow text-gray-900 dark:text-gray-100">
              {children}
            </div>
            <footer className="py-6 text-center border-t border-gray-200/50 dark:border-gray-700/50 mt-auto bg-gray-50/50 dark:bg-gray-900/50 px-4">
                <p className="text-xs text-gray-400 break-words" dangerouslySetInnerHTML={{ __html: copyrightText }}></p>
            </footer>
          </main>

          {/* Chat Widget */}
          <ChatWidget />
      </div>
    </div>
  );
};
