'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function EventEaseApp() {
  // --- AUTH & USER STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');

  // --- APP DATA STATE ---
  const [view, setView] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', capacity: '100' });
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ eventId: '', name: '', email: '', dept: '' });

  // AI State
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  const primaryColor = "#5849ff";

  // --- 1. DATABASE SYNC LOGIC ---

  // Load data from DB on start
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

  // Sync current state to DB
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

  // --- 2. AUTHENTICATION LOGIC ---
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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setView('dashboard');
  };

  // --- 3. APP FUNCTIONALITY ---

  const handleAddEvent = () => {
    if (!newEvent.title) return;
    const newList = [...events, { ...newEvent, id: Date.now().toString() }];
    setEvents(newList);
    syncToDb(newList, null);
    setShowNewEventModal(false);
    setNewEvent({ title: '', date: '', location: '', capacity: '100' });
  };

  const handleDeleteEvent = (id) => {
    if (window.confirm("Delete this event?")) {
      const newList = events.filter(e => e.id !== id);
      setEvents(newList);
      syncToDb(newList, null);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regForm.eventId || !regForm.name) return alert("Please fill all fields");
    const newList = [...participants, { ...regForm, id: Date.now().toString(), status: 'REGISTERED' }];
    setParticipants(newList);
    syncToDb(null, newList);
    setRegForm({ eventId: '', name: '', email: '', dept: '' });
    alert("Registration Successful!");
  };

  const handleCheckIn = (pId) => {
    const newList = participants.map(p => p.id === pId ? { ...p, status: 'CHECKED IN' } : p);
    setParticipants(newList);
    syncToDb(null, newList);
  };

  const handleGeneratePrediction = async () => {
    setIsPredicting(true);
    const eventNames = events.map(e => e.title).join(', ');
    const promptText = `Analyze for EventEase: Events: ${eventNames}, Registrations: ${participants.length}. Return JSON: {"estimatedTurnout": number, "confidence": "string", "trend": "string", "emailDraft": "string"}`;

    try {
      const res = await fetch('/api/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText })
      });
      const data = await res.json();
      setPredictionResult(data);
    } catch (e) { alert("AI Service Unavailable"); }
    finally { setIsPredicting(false); }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participants.filter(p => p.eventId === selectedEventId));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "Attendance_Report.xlsx");
  };

  // --- 4. RENDERERS ---

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-indigo-500 animate-pulse">Connecting to Vercel...</div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-10 rounded-[40px] shadow-2xl w-full max-w-md border bg-white border-gray-100">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold shadow-xl" style={{backgroundColor: primaryColor}}>📅</div>
          <h1 className="text-3xl font-black mb-2 text-center">EventEase</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">
            {authMode === 'login' ? 'Sign in to manage your events' : 'Create your admin account'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <input required className="w-full p-4 border rounded-2xl outline-none" placeholder="Full Name" 
                onChange={(e) => setAuthForm({...authForm, name: e.target.value})} />
            )}
            <input required type="email" className="w-full p-4 border rounded-2xl outline-none" placeholder="Email Address" 
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})} />
            <input required type="password" className="w-full p-4 border rounded-2xl outline-none" placeholder="Password" 
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})} />
            
            {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
            
            <button type="submit" className="w-full py-4 text-white rounded-2xl font-bold shadow-lg transition-transform active:scale-95" style={{backgroundColor: primaryColor }}>
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            {authMode === 'login' ? "New here?" : "Already have an account?"}{' '}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="font-bold text-indigo-600 underline">
              {authMode === 'login' ? 'Create Account' : 'Login instead'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r h-screen p-6 flex flex-col fixed left-0 top-0 z-40 bg-white border-gray-100">
        <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaryColor }}>📅</div>
          <span className="text-xl font-bold">EventEase</span>
        </div>
        <nav className="flex-1 space-y-1">
          {['dashboard', 'events', 'registration', 'attendance'].map((id) => (
            <button key={id} onClick={() => setView(id)} className={`w-full text-left px-4 py-3 rounded-xl font-medium capitalize transition-all ${view === id ? `bg-indigo-50 text-indigo-600` : `text-gray-500 hover:bg-gray-50`}`}>
              {id}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Admin</p>
          <p className="text-sm font-bold truncate mb-3">{currentUser?.name || currentUser?.email}</p>
          <button onClick={handleLogout} className="text-red-500 text-xs font-bold uppercase hover:underline">Logout</button>
        </div>
      </aside>

      <main className="ml-64 p-12">
        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold">Welcome, {currentUser?.name?.split(' ')[0]}! 👋</h1>
            <div className="grid grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl border bg-white shadow-sm"><p className="text-xs font-bold text-gray-500">Events</p><h2 className="text-2xl font-bold">{events.length}</h2></div>
              <div className="p-6 rounded-3xl border bg-white shadow-sm"><p className="text-xs font-bold text-gray-500">Registrations</p><h2 className="text-2xl font-bold">{participants.length}</h2></div>
            </div>

            <div className="p-10 rounded-[32px] text-white flex flex-col gap-4 shadow-xl" style={{ backgroundColor: primaryColor }}>
               <h3 className="text-xl font-bold">✨ Gemini AI Event Insights</h3>
               {!predictionResult ? (
                 <button onClick={handleGeneratePrediction} disabled={isPredicting} className="bg-white text-indigo-600 w-fit px-8 py-3 rounded-2xl font-bold shadow-lg">
                   {isPredicting ? '🧠 Analyzing Data...' : '📊 Run AI Prediction'}
                 </button>
               ) : (
                 <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl space-y-4 border border-white/20 animate-in zoom-in-95">
                    <div className="flex justify-between">
                        <div><p className="text-xs font-bold opacity-60">Predicted Turnout</p><h4 className="text-3xl font-black">{predictionResult.estimatedTurnout}</h4></div>
                        <div className="text-right"><p className="text-xs font-bold opacity-60">Confidence</p><h4 className="text-xl font-bold">{predictionResult.confidence}</h4></div>
                    </div>
                    <p className="text-sm font-bold border-t border-white/10 pt-3">📊 {predictionResult.trend}</p>
                    <p className="text-xs italic opacity-90 leading-relaxed italic">"{predictionResult.emailDraft}"</p>
                    <button onClick={() => setPredictionResult(null)} className="text-[10px] uppercase font-bold underline opacity-60">Reset</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* EVENTS VIEW */}
        {view === 'events' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center"><h1 className="text-3xl font-bold">Events</h1><button onClick={() => setShowNewEventModal(true)} className="px-6 py-2.5 text-white rounded-xl font-bold shadow-lg" style={{backgroundColor: primaryColor}}>+ New Event</button></div>
             <div className="grid grid-cols-3 gap-6">
               {events.map(e => (
                 <div key={e.id} className="rounded-[32px] border bg-white shadow-sm overflow-hidden relative group">
                    <div className="h-44 bg-slate-100 relative">
                        <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=500" className="w-full h-full object-cover" alt="event" />
                        <button onClick={() => handleDeleteEvent(e.id)} className="absolute top-4 right-4 bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </div>
                    <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900">{e.title}</h3>
                        <p className="text-sm text-gray-500">{e.location || 'No venue set'}</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* REGISTRATION VIEW */}
        {view === 'registration' && (
          <div className="max-w-3xl mx-auto pt-10">
            <h2 className="text-4xl font-bold text-center mb-12">Event Registration</h2>
            <form onSubmit={handleRegister} className="bg-white p-12 rounded-[40px] shadow-sm border border-gray-50 space-y-6">
               <select required className="w-full p-5 border rounded-2xl outline-none bg-gray-50" value={regForm.eventId} onChange={(e)=>setRegForm({...regForm, eventId: e.target.value})}>
                  <option value="">Select Event...</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
               </select>
               <input required className="w-full p-5 border rounded-2xl outline-none" placeholder="Full Name" value={regForm.name} onChange={(e)=>setRegForm({...regForm, name: e.target.value})} />
               <input required type="email" className="w-full p-5 border rounded-2xl outline-none" placeholder="Email Address" value={regForm.email} onChange={(e)=>setRegForm({...regForm, email: e.target.value})} />
               <input className="w-full p-5 border rounded-2xl outline-none" placeholder="Department" value={regForm.dept} onChange={(e)=>setRegForm({...regForm, dept: e.target.value})} />
               <button type="submit" className="w-full py-5 text-white rounded-3xl font-bold text-xl shadow-xl transition-all active:scale-95" style={{backgroundColor: primaryColor}}>Submit Registration</button>
            </form>
          </div>
        )}

        {/* ATTENDANCE VIEW */}
        {view === 'attendance' && (
          <div className="space-y-8">
             <h1 className="text-3xl font-bold">Attendance</h1>
             <select className="w-full p-5 border rounded-2xl bg-white shadow-sm" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                <option value="">Choose an event to track...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
             </select>
             
             {selectedEventId && (
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                   <div className="p-8 flex justify-between items-center border-b">
                      <h3 className="font-bold text-xl">Participant List</h3>
                      <button onClick={exportToExcel} className="text-indigo-600 font-bold hover:underline">📄 Export to Excel</button>
                   </div>
                   <table className="w-full text-left">
                      <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                        <tr><th className="p-6 px-10">Name</th><th className="p-6 px-10">Dept</th><th className="p-6 px-10">Status</th><th className="p-6 px-10 text-right">Action</th></tr>
                      </thead>
                      <tbody>
                        {participants.filter(p => p.eventId === selectedEventId).map(p => (
                          <tr key={p.id} className="border-t hover:bg-gray-50">
                            <td className="p-6 px-10 font-bold">{p.name}</td>
                            <td className="p-6 px-10 text-sm text-gray-500">{p.dept}</td>
                            <td className="p-6 px-10"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${p.status === 'CHECKED IN' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>{p.status}</span></td>
                            <td className="p-6 px-10 text-right">
                               <button onClick={()=>handleCheckIn(p.id)} disabled={p.status === 'CHECKED IN'} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-bold transition-all disabled:bg-gray-100 disabled:text-gray-400">Check In</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             )}
          </div>
        )}
      </main>

      {/* NEW EVENT MODAL */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="p-10 rounded-[40px] max-w-md w-full bg-white shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <h2 className="text-3xl font-bold mb-8">Create Event</h2>
            <div className="space-y-5">
               <input autoFocus className="w-full p-4 border rounded-2xl outline-none" placeholder="Title" value={newEvent.title} onChange={(e)=>setNewEvent({...newEvent, title: e.target.value})} />
               <input type="date" className="w-full p-4 border rounded-2xl outline-none" value={newEvent.date} onChange={(e)=>setNewEvent({...newEvent, date: e.target.value})} />
               <input className="w-full p-4 border rounded-2xl outline-none" placeholder="Venue Location" value={newEvent.location} onChange={(e)=>setNewEvent({...newEvent, location: e.target.value})} />
               <div className="flex gap-4 pt-4">
                 <button onClick={()=>setShowNewEventModal(false)} className="flex-1 py-4 font-bold border rounded-2xl bg-gray-50">Cancel</button>
                 <button onClick={handleAddEvent} className="flex-1 py-4 text-white rounded-2xl font-bold shadow-lg" style={{ backgroundColor: primaryColor }}>Create</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}