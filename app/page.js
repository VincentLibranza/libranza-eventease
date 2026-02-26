'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function EventEaseApp() {
  // --- AUTH & USER STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');

  // --- APP DATA STATE ---
  const [view, setView] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', capacity: '100' });
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ eventId: '', name: '', email: '', dept: '' });

  // AI State
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  const primaryColor = "#5849ff";

  // --- 1. DATABASE & LINK DETECTION LOGIC ---
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/db');
        const data = await res.json();
        if (data.events) setEvents(data.events);
        if (data.participants) setParticipants(data.participants);

        // SAFE URL CHECK (Prevents Vercel Crash)
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const eventIdFromUrl = params.get('event');
          if (eventIdFromUrl) {
            setAuthMode('public_register');
            setRegForm(prev => ({ ...prev, eventId: eventIdFromUrl }));
          }
        }

      } catch (e) { 
        console.error("Database load failed", e); 
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const syncToDb = async (updatedEvents, updatedParticipants) => {
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          events: updatedEvents || events, 
          participants: updatedParticipants || participants 
        })
      });
    } catch (e) { console.error("Database sync failed", e); }
  };

  // --- 2. LOGIC FUNCTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: authMode, ...authForm })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
      } else {
        setIsLoggedIn(true);
        setCurrentUser(data.user);
      }
    } catch (err) { setAuthError('Could not connect to server.'); }
  };

  const handleAddEvent = () => {
    if (!newEvent.title) return;
    const newList = [...events, { ...newEvent, id: Date.now().toString() }];
    setEvents(newList);
    syncToDb(newList, null);
    setShowNewEventModal(false);
    setNewEvent({ title: '', date: '', location: '', capacity: '100' });
  };

  const handleDeleteEvent = (id) => {
    if (confirm("Delete this event?")) {
      const newList = events.filter(e => e.id !== id);
      setEvents(newList);
      syncToDb(newList, null);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if(!regForm.eventId) return alert("Please select an event");
    const newList = [...participants, { ...regForm, id: Date.now().toString(), status: 'REGISTERED' }];
    setParticipants(newList);
    syncToDb(null, newList);
    setRegForm({ eventId: '', name: '', email: '', dept: '' });
    alert("Successfully Registered!");
    if (authMode === 'public_register') {
        if (typeof window !== 'undefined') window.history.replaceState({}, '', '/'); 
        setAuthMode('login');
    }
  };

  const handleCopyLink = (id) => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/?event=${id}`;
      navigator.clipboard.writeText(link);
      alert("Registration link copied!");
    }
  };

  const handleCheckIn = (pId) => {
    const newList = participants.map(p => p.id === pId ? { ...p, status: 'CHECKED IN' } : p);
    setParticipants(newList);
    syncToDb(null, newList);
  };

  const handleAIAnalysis = async () => {
    setIsPredicting(true);
    try {
      const res = await fetch('/api/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: `Events: ${events.length}, Regs: ${participants.length}` })
      });
      setPredictionResult(await res.json());
    } catch (e) { alert("AI Error"); }
    finally { setIsPredicting(false); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participants.filter(p => p.eventId === selectedEventId));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "Report.xlsx");
  };

  // --- RENDERERS ---

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-indigo-600 bg-white">Loading EventEase...</div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-10 rounded-[40px] shadow-2xl w-full max-w-md border bg-white border-gray-100">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold bg-indigo-600">📅</div>
          <h1 className="text-3xl font-black mb-8 text-center text-gray-900">EventEase</h1>
          
          {authMode === 'public_register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
               <p className="text-center font-black text-gray-900 mb-4">Event Registration</p>
               <select required className="w-full p-4 border rounded-2xl text-gray-900 font-bold outline-none bg-gray-50" value={regForm.eventId} onChange={e=>setRegForm({...regForm, eventId:e.target.value})}>
                  <option value="">Choose an Event</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
               </select>
               <input required className="w-full p-4 border rounded-2xl text-gray-900 font-bold" placeholder="Full Name" value={regForm.name} onChange={e=>setRegForm({...regForm, name:e.target.value})} />
               <input required type="email" className="w-full p-4 border rounded-2xl text-gray-900 font-bold" placeholder="Email" value={regForm.email} onChange={e=>setRegForm({...regForm, email:e.target.value})} />
               <input className="w-full p-4 border rounded-2xl text-gray-900 font-bold" placeholder="Department" value={regForm.dept} onChange={e=>setRegForm({...regForm, dept:e.target.value})} />
               <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Submit Registration</button>
               <button type="button" onClick={()=>{setAuthMode('login'); window.history.replaceState({}, '', '/');}} className="w-full text-center text-sm font-black text-gray-400">Cancel</button>
            </form>
          ) : (
            <>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && <input required className="w-full p-4 border border-gray-300 rounded-2xl text-gray-900 font-black" placeholder="Admin Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
                <input required type="email" className="w-full p-4 border border-gray-300 rounded-2xl text-gray-900 font-black" placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                <input required type="password" className="w-full p-4 border border-gray-300 rounded-2xl text-gray-900 font-black" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                {authError && <p className="text-red-600 text-xs font-black text-center">{authError}</p>}
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">
                    {authMode === 'login' ? 'Sign In' : 'Create Admin Account'}
                </button>
              </form>
              <div className="mt-6 flex flex-col gap-3 text-center">
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-indigo-700 font-black underline text-sm">
                  {authMode === 'login' ? 'New Admin? Register' : 'Login instead'}
                </button>
                <button onClick={() => setAuthMode('public_register')} className="text-gray-900 font-black text-sm hover:text-indigo-600 mt-2">
                   🎟️ Join an Event
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <aside className="w-64 border-r h-screen p-6 flex flex-col fixed left-0 top-0 z-40 bg-white">
        <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-indigo-600">📅</div>
          <span className="text-xl font-black text-gray-900">EventEase</span>
        </div>
        <nav className="flex-1 space-y-1">
          {['dashboard', 'events', 'registration', 'attendance'].map((id) => (
            <button key={id} onClick={() => setView(id)} className={`w-full text-left px-4 py-3 rounded-xl capitalize font-black transition-all ${view === id ? `bg-indigo-50 text-indigo-600` : `text-gray-700 hover:bg-gray-100`}`}>
              {id}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t text-sm">
          <p className="font-black text-gray-900 truncate">{currentUser?.name || currentUser?.email}</p>
          <button onClick={() => setIsLoggedIn(false)} className="text-red-600 font-black text-xs hover:underline uppercase">Logout</button>
        </div>
      </aside>

      <main className="ml-64 p-12 w-full">
        <header className="flex justify-between items-center mb-10">
          <div><h1 className="text-3xl font-black text-gray-900 capitalize">{view}</h1><p className="text-sm text-gray-600 font-black">Manage your ecosystem efficiently.</p></div>
          <button onClick={() => setShowNewEventModal(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">+ New Event</button>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-4 gap-6">
              {[
                { l: 'Total Events', v: events.length, i: '📅', c: 'text-blue-600 border-blue-200 bg-blue-50/40' },
                { l: 'Total Participants', v: participants.length, i: '👥', c: 'text-emerald-600 border-emerald-200 bg-emerald-50/40' },
                { l: 'Attendance Rate', v: `${participants.length > 0 ? (participants.filter(p => p.status === 'CHECKED IN').length / participants.length * 100).toFixed(0) : 0}%`, i: '🎯', c: 'text-orange-600 border-orange-200 bg-orange-50/40' },
                { l: 'Active Depts', v: new Set(participants.map(p => p.dept)).size, i: '📈', c: 'text-indigo-600 border-indigo-200 bg-indigo-50/40' }
              ].map((s, i) => (
                <div key={i} className="p-6 rounded-[24px] border border-gray-200 bg-white shadow-sm flex flex-col gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${s.c}`}>{s.i}</div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase mb-1">{s.l}</p>
                    <h2 className="text-3xl font-black text-gray-900">{s.v}</h2>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 rounded-[32px] text-white flex flex-col gap-4 shadow-xl" style={{ backgroundColor: primaryColor }}>
               <h3 className="text-xl font-black flex items-center gap-2">📈 AI Prediction</h3>
               {!predictionResult ? (
                 <button onClick={handleAIAnalysis} disabled={isPredicting} className="bg-white text-indigo-700 px-8 py-3 rounded-2xl font-black w-fit hover:bg-gray-100 shadow-md">
                    {isPredicting ? '🧠 Thinking...' : 'Generate Prediction'}
                 </button>
               ) : (
                 <div className="bg-white/10 p-6 rounded-2xl border border-white/20 space-y-2">
                    <p className="text-2xl font-black">Turnout Prediction: {predictionResult?.estimatedTurnout}</p>
                    <p className="text-sm font-bold">{predictionResult?.trend}</p>
                    <button onClick={()=>setPredictionResult(null)} className="text-[10px] underline uppercase font-black text-white/80">Reset</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {view === 'events' && (
          <div className="grid grid-cols-3 gap-6 animate-in fade-in">
             {events.map(e => (
               <div key={e.id} className="rounded-[32px] border border-gray-200 bg-white shadow-sm group relative overflow-hidden">
                  <div className="h-44 bg-slate-100 relative">
                      <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="event" />
                      <button onClick={() => handleDeleteEvent(e.id)} className="absolute top-4 right-4 bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg font-black">✕</button>
                      <button onClick={() => handleCopyLink(e.id)} className="absolute bottom-4 left-4 bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black shadow-md border">🔗 Copy Link</button>
                  </div>
                  <div className="p-6 font-black text-gray-900 text-lg">{e.title}</div>
               </div>
             ))}
          </div>
        )}

        {view === 'registration' && (
          <div className="max-w-4xl mx-auto pt-10">
            <h2 className="text-5xl font-black mb-10 text-center text-gray-900">Registration</h2>
            <form onSubmit={handleRegister} className="w-full max-w-3xl space-y-12 bg-white p-20 rounded-[48px] shadow-sm border border-gray-200">
               <select required className="w-full p-6 bg-gray-50 border border-gray-300 rounded-[24px] outline-none text-gray-900 font-black" value={regForm.eventId} onChange={e=>setRegForm({...regForm, eventId:e.target.value})}>
                  <option value="">Select Event...</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
               </select>
               <input required className="w-full p-6 border border-gray-300 rounded-[24px] text-gray-900 font-black" placeholder="Name" value={regForm.name} onChange={e=>setRegForm({...regForm, name:e.target.value})} />
               <input required type="email" className="w-full p-6 border border-gray-300 rounded-[24px] text-gray-900 font-black" placeholder="Email" value={regForm.email} onChange={e=>setRegForm({...regForm, email:e.target.value})} />
               <input className="w-full p-6 border border-gray-300 rounded-[24px] text-gray-900 font-black" placeholder="Department" value={regForm.dept} onChange={e=>setRegForm({...regForm, dept:e.target.value})} />
               <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[28px] font-black text-2xl shadow-xl transition-all active:scale-95">Register Now</button>
            </form>
          </div>
        )}

        {view === 'attendance' && (
          <div className="space-y-8 animate-in fade-in">
             <select className="w-full p-5 border border-gray-300 rounded-2xl bg-white shadow-sm text-gray-900 font-black" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                <option value="">Tracking Event...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
             </select>
             {selectedEventId && (
                <div className="bg-white rounded-[32px] border border-gray-200 overflow-hidden shadow-sm">
                   <div className="p-10 flex justify-between border-b items-center"><h3 className="font-black text-gray-900 text-xl">Participant List</h3><button onClick={exportExcel} className="text-indigo-700 font-black hover:underline">📄 Export Excel</button></div>
                   <table className="w-full text-left font-black">
                      <thead className="bg-gray-100 text-[11px] uppercase text-gray-700 tracking-widest"><tr className="border-b"><th className="p-6 px-10">Name</th><th className="p-6 px-10 text-right">Action</th></tr></thead>
                      <tbody>{participants.filter(p => p.eventId === selectedEventId).map(p => (
                        <tr key={p.id} className="border-b"><td className="p-6 px-10 text-gray-900">{p.name}</td><td className="p-6 px-10 text-right"><button onClick={()=>handleCheckIn(p.id)} disabled={p.status==='CHECKED IN'} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black disabled:bg-gray-200">{p.status === 'CHECKED IN' ? 'Checked' : 'Check In'}</button></td></tr>
                      ))}</tbody>
                   </table>
                </div>
             )}
          </div>
        )}
      </main>

      {/* NEW EVENT MODAL */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="p-10 rounded-[24px] max-w-lg w-full bg-white shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-gray-900 mb-8 text-left">New Event</h2>
            <div className="space-y-5 text-left font-black">
               <div><label className="text-gray-600">Event Title</label><input autoFocus className="w-full p-4 border rounded-xl outline-none" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} /></div>
               <div><label className="text-gray-600">Date</label><input type="datetime-local" className="w-full p-4 border rounded-xl text-gray-900 font-bold" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date:e.target.value})} /></div>
               <div className="flex gap-4 pt-4"><button onClick={()=>setShowNewEventModal(false)} className="flex-1 py-4 border rounded-2xl text-gray-700 font-black">Cancel</button><button onClick={handleAddEvent} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black">Create</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}