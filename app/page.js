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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '' });
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ eventId: '', name: '', email: '', dept: '' });

  // AI State
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  const primaryColor = "#5849ff";

  // --- DATABASE SYNC LOGIC ---
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/db');
        const data = await res.json();
        if (data.events) setEvents(data.events);
        if (data.participants) setParticipants(data.participants);
      } catch (e) { console.error("Database load failed", e); }
      setIsLoading(false);
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

  // --- LOGIC ---
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
    setNewEvent({ title: '', date: '', location: '' });
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
    if(!regForm.eventId) return alert("Select an event");
    const newList = [...participants, { ...regForm, id: Date.now().toString(), status: 'REGISTERED' }];
    setParticipants(newList);
    syncToDb(null, newList);
    setRegForm({ eventId: '', name: '', email: '', dept: '' });
    alert("Registered Successfully!");
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
        body: JSON.stringify({ promptText: `Events: ${events.length}, Users: ${participants.length}. Return JSON: {"estimatedTurnout": number, "confidence": "string", "trend": "string"}` })
      });
      setPredictionResult(await res.json());
    } catch (e) { alert("AI Service Unavailable"); }
    finally { setIsPredicting(false); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participants.filter(p => p.eventId === selectedEventId));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "Attendance_Report.xlsx");
  };

  const attendanceRate = participants.length > 0 
    ? ((participants.filter(p => p.status === 'CHECKED IN').length / participants.length) * 100).toFixed(0) 
    : 0;

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-indigo-500">Connecting...</div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-10 rounded-[40px] shadow-2xl w-full max-w-md border bg-white border-gray-100 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold bg-indigo-600">📅</div>
          <h1 className="text-3xl font-black mb-8">EventEase</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && <input required className="w-full p-4 border rounded-2xl outline-none" placeholder="Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
            <input required type="email" className="w-full p-4 border rounded-2xl outline-none" placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
            <input required type="password" className="w-full p-4 border rounded-2xl outline-none" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">
                {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-indigo-600 font-bold underline text-sm">
            {authMode === 'login' ? 'New here? Create Account' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r h-screen p-6 flex flex-col fixed left-0 top-0 z-40 bg-white">
        <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-indigo-600">📅</div>
          <span className="text-xl font-bold">EventEase</span>
        </div>
        <nav className="flex-1 space-y-1">
          {['dashboard', 'events', 'registration', 'attendance'].map((id) => (
            <button key={id} onClick={() => setView(id)} className={`w-full text-left px-4 py-3 rounded-xl capitalize font-bold transition-all ${view === id ? `bg-indigo-50 text-indigo-600` : `text-gray-500 hover:bg-gray-50`}`}>
              {id}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t text-sm"><p className="font-bold truncate">{currentUser.name}</p><button onClick={() => setIsLoggedIn(false)} className="text-red-500 font-bold text-xs">LOGOUT</button></div>
      </aside>

      <main className="ml-64 p-12 w-full">
        <header className="flex justify-between items-center mb-10">
          <div><h1 className="text-3xl font-bold capitalize">{view}</h1><p className="text-sm text-gray-500">Manage your event ecosystem efficiently.</p></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNewEventModal(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">+ New Event</button>
          </div>
        </header>

        {/* DASHBOARD VIEW - AS PER SCREENSHOT */}
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-4 gap-6">
              {[
                { l: 'Total Events', v: events.length, i: '📅', c: 'text-blue-500 border-blue-100 bg-blue-50/20' },
                { l: 'Total Participants', v: participants.length, i: '👥', c: 'text-emerald-500 border-emerald-100 bg-emerald-50/20' },
                { l: 'Attendance Rate', v: `${attendanceRate}%`, i: '🎯', c: 'text-orange-500 border-orange-100 bg-orange-50/20' },
                { l: 'Active Depts', v: new Set(participants.map(p => p.dept)).size, i: '📈', c: 'text-indigo-500 border-indigo-100 bg-indigo-50/20' }
              ].map((s, i) => (
                <div key={i} className="p-6 rounded-[24px] border border-gray-100 bg-white shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border mb-4 ${s.c}`}>{s.i}</div>
                  <p className="text-xs font-bold text-gray-400 mb-1">{s.l}</p>
                  <h2 className="text-3xl font-bold">{s.v}</h2>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
               <div className="col-span-2 p-8 rounded-[32px] border border-gray-100 bg-white shadow-sm h-64 flex flex-col justify-center items-center text-gray-400">
                  <p className="font-bold">Department Distribution</p>
                  <p className="text-xs">No data available yet.</p>
               </div>
               <div className="p-8 rounded-[32px] border border-gray-100 bg-white shadow-sm h-64 flex flex-col">
                  <h3 className="font-bold mb-4">Upcoming Events</h3>
                  {events.length > 0 ? events.slice(0, 3).map(e => <div key={e.id} className="text-sm font-bold p-2">{e.title}</div>) : <p className="text-xs text-gray-400 text-center m-auto">No events scheduled.</p>}
               </div>
            </div>

            <div className="p-10 rounded-[32px] text-white flex flex-col gap-4 shadow-xl" style={{ backgroundColor: primaryColor }}>
               <h3 className="text-xl font-bold flex items-center gap-2">📈 AI Attendance Prediction</h3>
               <p className="opacity-80 max-w-lg text-sm">Get AI-powered insights based on historical data.</p>
               {!predictionResult ? (
                 <button onClick={handleAIAnalysis} disabled={isPredicting} className="bg-white/20 px-8 py-3 rounded-2xl font-bold w-fit hover:bg-white/30">
                    {isPredicting ? 'Analyzing...' : 'Generate Prediction'}
                 </button>
               ) : (
                 <div className="bg-white/10 p-6 rounded-2xl border border-white/20 space-y-2">
                    <p className="text-2xl font-black">Turnout: {predictionResult.estimatedTurnout}</p>
                    <p className="text-xs italic opacity-90">{predictionResult.trend}</p>
                    <button onClick={()=>setPredictionResult(null)} className="text-[10px] underline uppercase font-bold opacity-60">Reset</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* EVENTS VIEW - RESTORED */}
        {view === 'events' && (
          <div className="grid grid-cols-3 gap-6 animate-in fade-in">
             {events.map(e => (
               <div key={e.id} className="rounded-[32px] border bg-white shadow-sm group relative overflow-hidden">
                  <div className="h-44 bg-slate-100 relative">
                      <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=500" className="w-full h-full object-cover" alt="event" />
                      <button onClick={() => handleDeleteEvent(e.id)} className="absolute top-4 right-4 bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">✕</button>
                  </div>
                  <div className="p-6 font-bold text-lg">{e.title}</div>
               </div>
             ))}
          </div>
        )}

        {/* REGISTRATION VIEW - RESTORED */}
        {view === 'registration' && (
          <div className="max-w-4xl mx-auto flex flex-col items-center animate-in fade-in pt-10">
            <h2 className="text-5xl font-bold mb-20 text-center">Event Registration</h2>
            <form onSubmit={handleRegister} className="w-full max-w-3xl space-y-12 bg-white p-20 rounded-[48px] shadow-sm border">
               <select required className="w-full p-6 bg-gray-50 border rounded-[24px] outline-none" value={regForm.eventId} onChange={e=>setRegForm({...regForm, eventId:e.target.value})}>
                  <option value="">Choose an event...</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
               </select>
               <div className="grid grid-cols-2 gap-8">
                  <input required className="w-full p-6 border rounded-[24px]" placeholder="Name" value={regForm.name} onChange={e=>setRegForm({...regForm, name:e.target.value})} />
                  <input required type="email" className="w-full p-6 border rounded-[24px]" placeholder="Email" value={regForm.email} onChange={e=>setRegForm({...regForm, email:e.target.value})} />
               </div>
               <input className="w-full p-6 border rounded-[24px]" placeholder="Department" value={regForm.dept} onChange={e=>setRegForm({...regForm, dept:e.target.value})} />
               <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[28px] font-bold text-2xl shadow-xl transition-all active:scale-95">Register Now</button>
            </form>
          </div>
        )}

        {/* ATTENDANCE VIEW - RESTORED */}
        {view === 'attendance' && (
          <div className="space-y-8 animate-in fade-in">
             <select className="w-full p-5 border rounded-2xl bg-white shadow-sm" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                <option value="">Select Event to Track...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
             </select>
             {selectedEventId && (
                <div className="bg-white rounded-[32px] border overflow-hidden shadow-sm">
                   <div className="p-10 flex justify-between border-b"><h3 className="font-bold text-xl">Participant List</h3><button onClick={exportExcel} className="text-indigo-600 font-bold">📄 Export Excel</button></div>
                   <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-widest"><tr className="border-b">
                        <th className="p-6 px-10">Name</th><th className="p-6 px-10">Status</th><th className="p-6 px-10 text-right">Action</th>
                      </tr></thead>
                      <tbody>{participants.filter(p => p.eventId === selectedEventId).map(p => (
                        <tr key={p.id} className="border-b font-bold">
                          <td className="p-6 px-10">{p.name}</td>
                          <td className="p-6 px-10"><span className={`px-3 py-1 rounded-full text-[10px] uppercase ${p.status==='CHECKED IN' ? 'bg-indigo-100 text-indigo-600':'bg-emerald-100 text-emerald-600'}`}>{p.status}</span></td>
                          <td className="p-6 px-10 text-right"><button onClick={()=>handleCheckIn(p.id)} disabled={p.status==='CHECKED IN'} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs disabled:bg-gray-100 disabled:text-gray-400">Check In</button></td>
                        </tr>
                      ))}</tbody>
                   </table>
                </div>
             )}
          </div>
        )}
      </main>

      {/* MODAL */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="p-10 rounded-[40px] max-w-md w-full bg-white shadow-2xl animate-in zoom-in-95">
            <h2 className="text-3xl font-bold mb-8">New Event</h2>
            <input autoFocus className="w-full p-4 border rounded-2xl outline-none" placeholder="Title" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} />
            <div className="flex gap-4 pt-6"><button onClick={()=>setShowNewEventModal(false)} className="flex-1 py-4 font-bold border rounded-2xl">Cancel</button><button onClick={handleAddEvent} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
}