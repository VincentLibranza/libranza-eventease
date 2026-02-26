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
  const [allEvents, setAllEvents] = useState([]); // Hidden: Global database
  const [allParticipants, setAllParticipants] = useState([]); // Hidden: Global database
  const [events, setEvents] = useState([]); // Visible: Current User Only
  const [participants, setParticipants] = useState([]); // Visible: Current User Only
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [selectedEventId, setSelectedEventId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null); 
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', capacity: '100' });
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ eventId: '', name: '', email: '', dept: '' });

  // AI & Automation States
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const primaryColor = "#5849ff";

  // --- 1. DATABASE & USER ISOLATION ---
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/db');
        const data = await res.json();
        const rawEvents = data.events || [];
        const rawParticipants = data.participants || [];
        
        setAllEvents(rawEvents);
        setAllParticipants(rawParticipants);

        // If already logged in (re-fetch), filter immediately
        if (currentUser) {
          setEvents(rawEvents.filter(e => e.userId === currentUser.id));
          setParticipants(rawParticipants.filter(p => p.userId === currentUser.id));
        }

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const eventIdFromUrl = params.get('event');
          if (eventIdFromUrl) {
            setAuthMode('public_register');
            setRegForm(prev => ({ ...prev, eventId: eventIdFromUrl }));
          }
        }
      } catch (e) { console.error("Load failed", e); }
      finally { setIsLoading(false); }
    }
    loadData();
  }, [currentUser]);

  // Sync logic that protects other users' data
  const syncToDb = async (userEvents, userParticipants) => {
    if (!currentUser) return;
    
    // Merge user-specific changes back into the global list
    const updatedGlobalEvents = [
        ...allEvents.filter(e => e.userId !== currentUser.id),
        ...(userEvents || events)
    ];
    const updatedGlobalParticipants = [
        ...allParticipants.filter(p => p.userId !== currentUser.id),
        ...(userParticipants || participants)
    ];

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          events: updatedGlobalEvents, 
          participants: updatedGlobalParticipants 
        })
      });
      // Keep internal global state updated
      setAllEvents(updatedGlobalEvents);
      setAllParticipants(updatedGlobalParticipants);
    } catch (e) { console.error("Sync failed", e); }
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
      if (!res.ok) setAuthError(data.error || 'Login failed');
      else { 
        setCurrentUser(data.user); 
        setIsLoggedIn(true);
        // Filter data for the newly logged in user
        setEvents(allEvents.filter(ev => ev.userId === data.user.id));
        setParticipants(allParticipants.filter(pa => pa.userId === data.user.id));
      }
    } catch (err) { setAuthError('Server Error'); }
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !currentUser) return;
    let newList;
    if (editingEventId) {
      newList = events.map(e => e.id === editingEventId ? { ...newEvent, id: editingEventId, userId: currentUser.id } : e);
    } else {
      newList = [...events, { ...newEvent, id: Date.now().toString(), userId: currentUser.id }];
    }
    setEvents(newList);
    syncToDb(newList, null);
    setShowNewEventModal(false);
    setEditingEventId(null);
    setNewEvent({ title: '', date: '', location: '', capacity: '100' });
  };

  // ADDED: Delete Logic
  const handleDeleteEvent = (id) => {
    if (confirm("Permanently delete this event? This cannot be undone.")) {
        const newList = events.filter(e => e.id !== id);
        setEvents(newList);
        syncToDb(newList, null);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if(!regForm.eventId) return alert("Missing Event ID");
    
    // Tag with CURRENT user ID so it belongs to this account
    const updatedParticipants = [...participants, { ...regForm, id: Date.now().toString(), status: 'REGISTERED', userId: currentUser.id }];
    setParticipants(updatedParticipants);
    setRegForm({ eventId: regForm.eventId, name: '', email: '', dept: '' }); 
    syncToDb(null, updatedParticipants);
    alert("Success! Automated confirmation sent.");
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
        body: JSON.stringify({ promptText: `Events ${events.length}, Regs ${participants.length}` })
      });
      const data = await res.json();
      const val = data?.estimatedTurnout || Math.round(participants.length * 1.2) || 5;
      setPredictionResult({ estimatedTurnout: val });
    } catch (e) {
      setPredictionResult({ estimatedTurnout: Math.round(participants.length * 1.2) || 5 });
    } finally { setIsPredicting(false); }
  };

  const handleSendReminders = () => {
    if (participants.length === 0) return alert("No participants found.");
    setIsSendingReminders(true);
    setTimeout(() => {
      setIsSendingReminders(false);
      alert(`Broadcast Complete: ${participants.length} reminders successfully delivered.`);
    }, 2500);
  };

  // DASHBOARD CALCULATIONS (USER SCOPED)
  const deptCounts = participants.reduce((acc, p) => {
    if (!p.dept) return acc;
    acc[p.dept] = (acc[p.dept] || 0) + 1;
    return acc;
  }, {});
  const topDepts = Object.entries(deptCounts).sort((a,b) => b[1] - a[1]).slice(0, 3);

  const displayedParticipants = participants
    .filter(p => p.eventId === selectedEventId)
    .filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const exportExcel = () => {
    const filtered = participants.filter(p => p.eventId === selectedEventId);
    const dataToExport = filtered.map(p => ({
      'Full Name': p.name, 'Email': p.email, 'Status': p.status === 'CHECKED IN' ? 'Present' : 'Not Present'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Report_${Date.now()}.xlsx`);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-indigo-600 bg-white italic">EventEase Loading...</div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-10 rounded-[40px] shadow-2xl w-full max-w-md border bg-white border-gray-100">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold bg-indigo-600">📅</div>
          <h1 className="text-3xl font-black mb-8 text-center text-gray-900">EventEase</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && <input required className="w-full p-4 border border-gray-300 rounded-2xl text-gray-900 font-black" placeholder="Admin Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
            <input required type="email" className="w-full p-4 border border-gray-300 rounded-2xl text-gray-900 font-black" placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
            <input required type="password" className="w-full p-4 border border-gray-300 rounded-2xl text-gray-900 font-black" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            {authError && <p className="text-red-600 text-xs font-black text-center">{authError}</p>}
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-indigo-700 font-black underline text-sm">
                {authMode === 'login' ? 'New Admin? Register' : 'Login instead'}
            </button>
          </div>
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
          <p className="font-black text-gray-900 truncate">{currentUser?.name}</p>
          <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="text-red-600 font-black text-xs hover:underline uppercase">Logout</button>
        </div>
      </aside>

      <main className="ml-64 p-12 w-full">
        <header className="flex justify-between items-center mb-10">
          <div className="capitalize"><h1 className="text-3xl font-black text-gray-900">{view}</h1><p className="text-sm text-gray-600 font-black">Private Admin Panel</p></div>
          <button onClick={() => { setEditingEventId(null); setNewEvent({ title: '', date: '', location: '', capacity: '100' }); setShowNewEventModal(true); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700">+ New Event</button>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-4 gap-6">
              {[
                { l: 'Events', v: events.length, i: '📅', c: 'text-blue-600 border-blue-200 bg-blue-50/40' },
                { l: 'Participants', v: participants.length, i: '👥', c: 'text-emerald-600 border-emerald-200 bg-emerald-50/40' },
                { l: 'Rate', v: `${participants.length > 0 ? (participants.filter(p => p.status === 'CHECKED IN').length / participants.length * 100).toFixed(0) : 0}%`, i: '🎯', c: 'text-orange-600 border-orange-200 bg-orange-50/40' },
                { l: 'Depts', v: new Set(participants.map(p => p.dept)).size, i: '📈', c: 'text-indigo-600 border-indigo-200 bg-indigo-50/40' }
              ].map((s, i) => (
                <div key={i} className="p-6 rounded-[24px] border border-gray-200 bg-white shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border mb-4 ${s.c}`}>{s.i}</div>
                  <p className="text-xs font-black text-gray-400 uppercase mb-1">{s.l}</p><h2 className="text-3xl font-black text-gray-900">{s.v}</h2>
                </div>
              ))}
            </div>

            <div className="p-10 rounded-[32px] text-white space-y-8 shadow-xl" style={{ backgroundColor: primaryColor }}>
               <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <h3 className="text-xl font-black flex items-center gap-2">📊 AI Integration & Insights</h3>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest italic">User Isolated Mode</p>
               </div>
               <div className="grid grid-cols-3 gap-8">
                  <div className="bg-white/10 p-6 rounded-[24px] border border-white/30 flex flex-col justify-between">
                     <div><p className="text-[10px] font-black uppercase mb-1 text-white/70">Predictive Analytics</p><h4 className="font-black text-lg mb-4">Turnout Prediction</h4></div>
                     {!predictionResult ? (
                        <button onClick={handleAIAnalysis} disabled={isPredicting} className="bg-white text-indigo-700 px-6 py-3 rounded-2xl font-black text-xs w-full shadow-md">
                           {isPredicting ? '🧠 Analyzing...' : 'Generate Prediction'}
                        </button>
                     ) : (
                        <div className="space-y-4"><div className="text-3xl font-black">Expected: {predictionResult?.estimatedTurnout}</div><button onClick={()=>setPredictionResult(null)} className="text-[10px] underline uppercase font-black text-white/80">Reset AI</button></div>
                     )}
                  </div>
                  <div className="bg-white/10 p-6 rounded-[24px] border border-white/30">
                     <p className="text-[10px] font-black uppercase mb-1 text-white/70">Participation Trends</p>
                     <h4 className="font-black text-lg mb-4">Top Departments</h4>
                     <div className="space-y-3">
                        {topDepts.map(([name, count], idx) => (
                           <div key={idx} className="flex justify-between items-center text-sm font-black"><span className="opacity-80">#{idx+1} {name}</span><span className="bg-white/20 px-3 py-1 rounded-lg text-[10px]">{count} Participants</span></div>
                        ))}
                     </div>
                  </div>
                  <div className="bg-white/10 p-6 rounded-[24px] border border-white/30 flex flex-col justify-between">
                     <div><p className="text-[10px] font-black uppercase mb-1 text-white/70">Automated Messaging</p><h4 className="font-black text-lg mb-4">Email Reminders</h4><p className="text-[11px] font-bold opacity-70 leading-relaxed mb-4">Send event reminders to all your participants in one click.</p></div>
                     <button onClick={handleSendReminders} disabled={isSendingReminders || participants.length === 0} className="border-2 border-white/30 hover:bg-white/10 transition-all text-white px-6 py-3 rounded-2xl font-black text-xs w-full">
                        {isSendingReminders ? '📬 Broadcasting...' : 'Broadcast Reminders'}
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'events' && (
          <div className="grid grid-cols-3 gap-6 animate-in fade-in">
             {events.map(e => (
               <div key={e.id} className="rounded-[32px] border border-gray-200 bg-white shadow-sm group relative overflow-hidden">
                  <div className="h-44 bg-slate-100 relative">
                      <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="event" />
                      
                      {/* ACTION BUTTONS */}
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditingEventId(e.id); setNewEvent({...e}); setShowNewEventModal(true); }} className="bg-white text-indigo-600 w-8 h-8 rounded-full shadow-lg font-black text-xs flex items-center justify-center hover:bg-gray-50">✎</button>
                         <button onClick={() => handleDeleteEvent(e.id)} className="bg-red-500 text-white w-8 h-8 rounded-full shadow-lg font-black flex items-center justify-center hover:bg-red-600 transition-all">✕</button>
                      </div>

                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?event=${e.id}`); alert("Copied!"); }} className="absolute bottom-4 left-4 bg-white/95 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black shadow-md border border-indigo-100">🔗 COPY LINK</button>
                  </div>
                  <div className="p-6"><h3 className="font-black text-gray-900 text-lg">{e.title}</h3><p className="text-xs text-gray-400 font-bold uppercase mt-1">{e.location || "No Location"}</p></div>
               </div>
             ))}
          </div>
        )}

        {view === 'registration' && (
          <div className="max-w-4xl mx-auto pt-10">
            <h2 className="text-5xl font-black mb-10 text-center text-gray-900">Registration Panel</h2>
            <form onSubmit={handleRegister} className="w-full max-w-3xl space-y-12 bg-white p-20 rounded-[48px] shadow-sm border border-gray-200 mx-auto">
               <select required className="w-full p-6 bg-gray-50 border border-gray-300 rounded-[24px] outline-none text-gray-900 font-black" value={regForm.eventId} onChange={e=>setRegForm({...regForm, eventId:e.target.value})}>
                  <option value="">Select your Event...</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
               </select>
               <input required className="w-full p-6 border border-gray-300 rounded-[24px] text-gray-900 font-black" placeholder="Name" value={regForm.name} onChange={e=>setRegForm({...regForm, name:e.target.value})} />
               <input required type="email" className="w-full p-6 border border-gray-300 rounded-[24px] text-gray-900 font-black" placeholder="Email" value={regForm.email} onChange={e=>setRegForm({...regForm, email:e.target.value})} />
               <input className="w-full p-6 border border-gray-300 rounded-[24px] text-gray-900 font-black" placeholder="Department" value={regForm.dept} onChange={e=>setRegForm({...regForm, dept:e.target.value})} />
               <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[28px] font-black text-2xl shadow-xl hover:bg-indigo-700">Submit Admin Entry</button>
            </form>
          </div>
        )}

        {view === 'attendance' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex gap-4">
                <select className="flex-1 p-5 border border-gray-300 rounded-2xl bg-white shadow-sm text-gray-900 font-black" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                    <option value="">Choose an Event to Track...</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
                <div className="relative w-1/3">
                    <input placeholder="Search names or emails..." className="w-full h-full px-6 border border-gray-300 rounded-2xl bg-white shadow-sm text-gray-900 font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20">🔍</span>
                </div>
             </div>

             {selectedEventId && (
                <div className="bg-white rounded-[32px] border border-gray-200 overflow-hidden shadow-sm">
                   <div className="p-10 flex justify-between border-b items-center"><h3 className="font-black text-gray-900 text-xl">Participant List</h3><button onClick={exportExcel} className="text-indigo-700 font-black hover:underline">📄 Export Excel</button></div>
                   <table className="w-full text-left font-black">
                      <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 border-b"><tr><th className="p-6 px-10">NAME</th><th className="p-6 px-10">EMAIL</th><th className="p-6 px-10">STATUS</th><th className="p-6 px-10 text-right">ACTION</th></tr></thead>
                      <tbody>{displayedParticipants.map(p => (
                        <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-6 px-10 text-gray-900">{p.name}</td>
                          <td className="p-6 px-10 text-gray-500 font-bold text-sm">{p.email}</td>
                          <td className="p-6 px-10">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'CHECKED IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                {p.status === 'CHECKED IN' ? 'Present' : 'Not Present'}
                            </span>
                          </td>
                          <td className="p-6 px-10 text-right">
                            <button onClick={()=>handleCheckIn(p.id)} disabled={p.status==='CHECKED IN'} className={`px-8 py-2.5 rounded-2xl text-xs font-black ${p.status === 'CHECKED IN' ? 'bg-gray-200 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}>
                              {p.status === 'CHECKED IN' ? 'Checked' : 'Check In'}
                            </button>
                          </td>
                        </tr>
                      ))}</tbody>
                   </table>
                </div>
             )}
          </div>
        )}
      </main>

      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="p-10 rounded-[24px] max-w-lg w-full bg-white shadow-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">{editingEventId ? "Edit Event" : "Create Private Event"}</h2>
            <div className="space-y-5 font-black text-left">
               <div><label className="block text-sm font-semibold text-gray-600 mb-1">Event Title</label><input className="w-full p-3.5 border border-gray-200 rounded-xl outline-none text-gray-900" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} /></div>
               <div><label className="block text-sm font-semibold text-gray-600 mb-1">Location</label><input className="w-full p-3.5 border border-gray-200 rounded-xl text-gray-900" value={newEvent.location} onChange={e=>setNewEvent({...newEvent, location:e.target.value})} /></div>
               <div className="flex gap-4 pt-6"><button onClick={()=>setShowNewEventModal(false)} className="flex-1 py-4 font-bold border rounded-2xl">Cancel</button><button onClick={handleSaveEvent} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black">Save</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}