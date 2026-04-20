import React, { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function NotificationDrawer({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead }) {
  const navigate = useNavigate();
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/10" 
        onClick={onClose} 
      />
      
      {/* Drawer/Dropdown */}
      <div className="fixed md:absolute top-20 md:top-full left-4 right-4 md:left-auto md:right-0 md:mt-4 md:w-[380px] bg-white rounded-2xl md:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[70] animate-in slide-in-from-top-4 duration-300">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0">
          <div>
            <h3 className="text-lg font-black text-slate-900">Notifikasi</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                {unreadCount} Belum Terbaca
              </p>
              {unreadCount > 0 && (
                <button 
                  onClick={onMarkAllAsRead}
                  className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter hover:text-emerald-800 transition-colors"
                >
                  Tandai Semua Dibaca
                </button>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[450px] overflow-y-auto p-2 space-y-1 bg-slate-50/30">
          {notifications.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold text-sm">Belum ada notifikasi</p>
              <p className="text-slate-400 text-xs mt-1">Kami akan memberitahumu saat ada aktivitas penting.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id}
                className={`p-4 rounded-2xl transition-all border border-transparent ${
                  n.isRead ? 'bg-transparent text-slate-500' : 'bg-white shadow-sm border-slate-100 text-slate-900'
                } hover:border-[#008647]/20 cursor-pointer group`}
                onClick={() => onMarkAsRead(n.id)}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    n.type === 'alert' ? 'bg-rose-50 text-rose-500' : 
                    n.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                    'bg-blue-50 text-blue-500'
                  }`}>
                    {n.type === 'alert' ? <AlertTriangle className="w-5 h-5" /> : 
                     n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                     <Info className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm leading-snug ${n.isRead ? 'font-medium' : 'font-black'}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                       {(() => {
                         try {
                           const d = new Date(n.timestamp);
                           if (isNaN(d.getTime())) return 'Baru saja';
                           return format(d, 'HH:mm', { locale: id });
                         } catch (e) { return '--:--'; }
                       })()} 
                       <span className="w-1 h-1 bg-slate-300 rounded-full" />
                       {(() => {
                         try {
                           const d = new Date(n.timestamp);
                           if (isNaN(d.getTime())) return '';
                           return format(d, 'dd MMM yyyy', { locale: id });
                         } catch (e) { return ''; }
                       })()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-[#008647] rounded-full mt-2" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-50">
            <button 
              onClick={() => {
                onClose();
                navigate('/notifications');
              }}
              className="w-full py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-[#008647] transition-all"
            >
              Lihat Semua Notifikasi
            </button>
          </div>
        )}
      </div>
    </>
  );
}
