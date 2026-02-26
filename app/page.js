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

  // --- AUTHENTICATION LOGIC ---
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

  // --- APP FUNCTIONALITY ---
  const handleAddEvent = () => {
    if (!newEvent.title) return;
    const newList = [...events, { ...newEvent, id: Date.now().toString() }];
    setEvents(newList);
    syncToDb(newList, null);
    setShowNewEventModal(false);
    setNewEvent({ title: '', date: '', location: '' });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const newList = [...participants, { ...regForm, id: Date.now().toString(), status: 'REGISTERED' }];
    setParticipants(newList);
    syncToDb(null, newList);
    setRegForm({ eventId: '', name: '', email: '', dept: '' });
    alert("Registered!");
  };

  const handleAIAnalysis = async () => {
    setIsPredicting(true);
    try {
      const res = await fetch('/api/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: `Events: ${events.length}, Regs: ${participants.length}. Return turnout JSON.` })
      });
      setPredictionResult(await res.json());
    } catch (e) { alert("AI Service Error"); }
    finally { setIsPredicting(false); }
  };

  // Calculations for Stat Cards
  const attendanceRate = participants.length > 0 
    ? ((participants.filter(p => p.status === 'CHECKED IN').length / participants.length) * 100).toFixed(0) 
    : 0;
  const activeDepts = new Set(participants.map(p => p.dept).filter(d => d)).size;

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-indigo-500">Loading Dashboard...</div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-10 rounded-[40px] shadow-2xl w-full max-w-md border bg-white border-gray-100">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold bg-indigo-600">📅</div>
          <h1 className="text-3xl font-black mb-8 text-center">EventEase</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && <input required className="w-full p-4 border rounded-2xl outline-none" placeholder="Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
            <input required type="email" className="w-full p-4 border rounded-2xl outline-none" placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
            <input required type="password" className="w-full p-4 border rounded-2xl outline-none" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
            <button type="submit" className="w-full py-4 text-white rounded-2xl font-bold bg-indigo-600">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-6 text-sm text-indigo-600 font-bold underline">
            {authMode === 'login' ? 'New here? Sign Up' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className="w-64 border-r h-screen p-6 flex flex-col fixed left-0 top-0 z-40 bg-white border-gray-100">
        <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-indigo-600">📅</div>
          <span className="text-xl font-bold text-gray-900">EventEase</span>
        </div>
        <nav className="flex-1 space-y-1">
          {['dashboard', 'events', 'registration', 'attendance'].map((id) => (
            <button key={id} onClick={() => setView(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium capitalize transition-all ${view === id ? `bg-indigo-50 text-indigo-600` : `text-gray-500 hover:bg-gray-50`}`}>
               {id === 'dashboard' ? '📊' : id === 'events' ? '📅' : id === 'registration' ? '👥' : '✔️'} {id}
            </button>
          ))}
        </nav>
        <button onClick={() => setIsLoggedIn(false)} className="mt-4 p-4 text-red-500 font-bold text-[10px] uppercase tracking-widest text-center">Logout</button>
      </aside>

      <main className="ml-64 p-12">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">{view}</h1>
            <p className="text-sm text-gray-500">Manage your event ecosystem efficiently.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2.5 border border-gray-200 rounded-xl bg-white text-gray-400 hover:bg-gray-50 shadow-sm transition-all">🔍</button>
            <button onClick={() => setShowNewEventModal(true)} className="px-5 py-2.5 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700">+ New Event</button>
          </div>
        </header>

        {/* DASHBOARD VIEW RESTORED */}
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { l: 'Total Events', v: events.length, i: '📅', c: 'text-blue-500 border-blue-100 bg-blue-50/20' },
                { l: 'Total Participants', v: participants.length, i: '👥', c: 'text-emerald-500 border-emerald-100 bg-emerald-50/20' },
                { l: 'Attendance Rate', v: `${attendanceRate}%`, i: '🎯', c: 'text-orange-500 border-orange-100 bg-orange-50/20' },
                { l: 'Active Depts', v: activeDepts, i: '📈', c: 'text-indigo-500 border-indigo-100 bg-indigo-50/20' }
              ].map((s, i) => (
                <div key={i} className="p-6 rounded-[24px] border border-gray-100 bg-white shadow-sm flex flex-col gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${s.c}`}>{s.i}</div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 tracking-tight mb-1">{s.l}</p>
                    <h2 className="text-3xl font-bold text-gray-900">{s.v}</h2>
                  </div>
                </div>
              ))}
            </div>

            {/* Middle Section */}
            <div className="grid grid-cols-3 gap-6">
               <div className="col-span-2 p-8 rounded-[32px] border border-gray-100 bg-white shadow-sm h-64 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800">Department Distribution</h3>
                    <span className="text-gray-300">📈</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-medium">
                    {participants.length > 0 ? "Data visualization loading..." : "No data available yet."}
                  </div>
               </div>

               <div className="p-8 rounded-[32px] border border-gray-100 bg-white shadow-sm flex flex-col h-64">
                  <h3 className="font-bold text-gray-800 mb-6">Upcoming Events</h3>
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-medium">
                    {events.length > 0 
                      ? events.slice(0, 3).map(e => <div key={e.id} className="text-gray-900 font-bold mb-2">{e.title}</div>)
                      : "No events scheduled."
                    }
                  </div>
               </div>
            </div>

            {/* Bottom Section - AI Card */}
            <div className="p-10 rounded-[32px] text-white flex flex-col gap-5 shadow-xl transition-all" style={{ backgroundColor: primaryColor }}>
               <div className="flex items-center gap-3">
                  <span className="text-2xl">📈</span>
                  <h3 className="text-xl font-bold">AI Attendance Prediction</h3>
               </div>
               <p className="opacity-80 max-w-lg text-sm font-medium leading-relaxed">
                  Get AI-powered insights for your next event based on historical data and participant trends.
               </p>
               
               {!predictionResult ? (
                 <button onClick={handleAIAnalysis} disabled={isPredicting} className="w-fit px-8 py-3.5 rounded-2xl font-bold bg-white/20 hover:bg-white/30 transition-all flex items-center gap-2 disabled:opacity-50">
                   <span>{isPredicting ? '🧠' : '📈'}</span>
                   {isPredicting ? 'Analyzing Data...' : 'Generate Prediction'}
                 </button>
               ) : (
                 <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 animate-in zoom-in-95 space-y-3">
                    <div className="flex justify-between">
                        <div><p className="text-xs font-bold opacity-60 uppercase">Predicted Turnout</p><h4 className="text-4xl font-black">{predictionResult.estimatedTurnout}</h4></div>
                        <div className="text-right"><p className="text-xs font-bold opacity-60 uppercase">Accuracy</p><h4 className="text-xl font-bold">{predictionResult.confidence}</h4></div>
                    </div>
                    <p className="text-sm border-t border-white/10 pt-3 italic font-medium opacity-90">"{predictionResult.trend}"</p>
                    <button onClick={() => setPredictionResult(null)} className="text-[10px] uppercase font-bold tracking-widest opacity-60 hover:opacity-100">Reset Analysis</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Other views remain logic-heavy but minimal UI as requested */}
        {view === 'events' && (
           <div className="grid grid-cols-3 gap-6">
               {events.map(e => (
                 <div key={e.id} className="p-6 rounded-3xl border bg-white shadow-sm font-bold">{e.title}</div>
               ))}
           </div>
        )}
      </main>

      {/* NEW EVENT MODAL */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="p-10 rounded-[40px] max-w-md w-full bg-white shadow-2xl animate-in zoom-in-95 border border-gray-100">
            <h2 className="text-2xl font-bold mb-8">Create New Event</h2>
            <div className="space-y-4">
               <input autoFocus className="w-full p-4 border border-gray-100 rounded-2xl outline-none focus:border-indigo-500" placeholder="Title" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title: e.target.value})} />
               <div className="flex gap-4 pt-4">
                 <button onClick={()=>setShowNewEventModal(false)} className="flex-1 py-4 font-bold border rounded-2xl bg-gray-50">Cancel</button>
                 <button onClick={handleAddEvent} className="flex-1 py-4 text-white rounded-2xl font-bold bg-indigo-600">Create</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}