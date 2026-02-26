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
  
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null); 
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', capacity: '100' });
  
  const [regForm, setRegForm] = useState({ eventId: '', name: '', email: '', dept: '' });
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  const primaryColor = "#5849ff";

  // --- DATABASE SYNC ---
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/db');
        const data = await res.json();
        if (data.events) setEvents(data.events);
        if (data.participants) setParticipants(data.participants);

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
    } catch (e) { console.error("Sync failed", e); }
  };

  // --- LOGIC FUNCTIONS ---
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
      else { setIsLoggedIn(true); setCurrentUser(data.user); }
    } catch (err) { setAuthError('Server Error'); }
  };

  const handleSaveEvent = () => {
    if (!newEvent.title) return;
    let newList;
    if (editingEventId) {
      newList = events.map(e => e.id === editingEventId ? { ...newEvent, id: editingEventId } : e);
    } else {
      newList = [...events, { ...newEvent, id: Date.now().toString() }];
    }
    setEvents(newList);
    syncToDb(newList, null);
    setShowNewEventModal(false);
    setEditingEventId(null);
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
    const updatedParticipants = [...participants, { ...regForm, id: Date.now().toString(), status: 'REGISTERED' }];
    setParticipants(updatedParticipants);
    setRegForm({ eventId: regForm.eventId, name: '', email: '', dept: '' }); 
    syncToDb(null, updatedParticipants);
    alert("Registered!");
    if (authMode === 'public_register') {
        if (typeof window !== 'undefined') window.history.replaceState({}, '', '/'); 
        setAuthMode('login');
    }
  };

  const handleCheckIn = (pId) => {
    const newList = participants.map(p => p.id === pId ? { ...p, status: 'CHECKED IN' } : p);
    setParticipants(newList);
    syncToDb(null, newList);
  };

  const exportExcel = () => {
    const filtered = participants.filter(p => p.eventId === selectedEventId);
    const dataToExport = filtered.map(p => ({
      'Name': p.name,
      'Email': p.email,
      'Department': p.dept,
      'Attendance': p.status === 'CHECKED IN' ? 'Present' : 'Registered Only'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `Report_${Date.now()}.xlsx`);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-indigo-600 bg-white">Connecting...</div>;

  if (!isLoggedIn) {
    const activeEventTitle = events.find(e => e.id === regForm.eventId)?.title;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-10 rounded-[40px] shadow-2xl w-full max-w-md border bg-white border-gray-100">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold bg-indigo-600">📅</div>
          <h1 className="text-3xl font-black mb-8 text-center text-gray-900">EventEase</h1>
          {authMode === 'public_register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
               <div className="bg-indigo-50 border p-5 rounded-2xl text-center mb-4"><h2 className="text-xl font-black text-gray-900">{activeEventTitle || "Select Event"}</h2></div>
               <input required className="w-full p-4 border rounded-2xl font-bold" placeholder="Full Name" value={regForm.name} onChange={e=>setRegForm({...regForm, name:e.target.value})} />
               <input required type="email" className="w-full p-4 border rounded-2xl font-bold" placeholder="Email" value={regForm.email} onChange={e=>setRegForm({...regForm, email:e.target.value})} />
               <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black">Submit Registration</button>
               <button type="button" onClick={()=>{setAuthMode('login'); window.history.replaceState({}, '', '/');}} className="w-full text-center text-sm font-black text-gray-400">Cancel</button>
            </form>
          ) : (
            <>
              <form onSubmit={handleAuth} className="space-y-4">
                <input required type="email" className="w-full p-4 border border-gray-300 rounded-2xl font-black" placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                <input required type="password" className="w-full p-4 border border-gray-300 rounded-2xl font-black" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                {authError && <p className="text-red-600 text-xs font-black text-center">{authError}</p>}
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black">Sign In</button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <aside className="w-64 border-r h-screen p-6 flex flex-col fixed bg-white">
        <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-indigo-600">📅</div>
          <span className="text-xl font-black text-gray-900">EventEase</span>
        </div>
        <nav className="flex-1 space-y-1">
          {['dashboard', 'events', 'registration', 'attendance'].map((id) => (
            <button key={id} onClick={() => setView(id)} className={`w-full text-left px-4 py-3 rounded-xl capitalize font-black transition-all ${view === id ? `bg-indigo-50 text-indigo-600` : `text-gray-900 hover:bg-gray-100`}`}>
              {id}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t text-sm"><p className="font-black text-gray-900 truncate">{currentUser?.name}</p><button onClick={() => setIsLoggedIn(false)} className="text-red-600 font-black text-xs hover:underline uppercase">Logout</button></div>
      </aside>

      <main className="ml-64 p-12 w-full">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 capitalize">{view}</h1>
          <button onClick={() => { setEditingEventId(null); setNewEvent({ title: '', date: '', location: '', capacity: '100' }); setShowNewEventModal(true); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">+ New Event</button>
        </header>

        {/* DASHBOARD VIEW */}
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
                  <div><p className="text-xs font-black text-gray-500 uppercase mb-1">{s.l}</p><h2 className="text-3xl font-black text-gray-900">{s.v}</h2></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EVENTS VIEW */}
        {view === 'events' && (
          <div className="grid grid-cols-3 gap-6 animate-in fade-in">
             {events.map(e => (
               <div key={e.id} className="rounded-[32px] border border-gray-200 bg-white shadow-sm group relative overflow-hidden">
                  <div className="h-44 bg-slate-100 relative">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditingEventId(e.id); setNewEvent({ title: e.title, date: e.date, location: e.location, capacity: e.capacity }); setShowNewEventModal(true); }} className="bg-white text-indigo-600 w-8 h-8 rounded-full shadow-lg font-black text-xs">✎</button>
                         <button onClick={() => handleDeleteEvent(e.id)} className="bg-red-500 text-white w-8 h-8 rounded-full shadow-lg font-black">✕</button>
                      </div>
                  </div>
                  <div className="p-6 font-black text-gray-900 text-lg">{e.title}</div>
               </div>
             ))}
          </div>
        )}

        {/* 🛑 ATTENDANCE VIEW - UPDATED AS PER YOUR LAST REQUEST */}
        {view === 'attendance' && (
          <div className="space-y-8 animate-in fade-in">
             <select 
                className="w-full p-5 border-2 border-black rounded-2xl bg-white shadow-sm text-gray-900 font-black" 
                value={selectedEventId} 
                onChange={e => setSelectedEventId(e.target.value)}
             >
                <option value="">Select Event to Track...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
             </select>

             {selectedEventId && (
                <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm p-2">
                   <div className="p-10 flex justify-between items-center">
                      <h3 className="font-black text-gray-900 text-2xl">Participant List</h3>
                      <button onClick={exportExcel} className="text-indigo-700 font-black text-lg flex items-center gap-2">📄 Export Excel</button>
                   </div>
                   <table className="w-full text-left font-black">
                      <thead className="bg-gray-100 text-[11px] uppercase text-gray-500 border-b">
                        <tr><th className="p-6 px-10">NAME</th><th className="p-6 px-10 text-right">ACTION</th></tr>
                      </thead>
                      <tbody>{participants.filter(p => p.eventId === selectedEventId).map(p => (
                        <tr key={p.id} className="border-b">
                          <td className="p-6 px-10 text-gray-900 text-lg font-bold">{p.name}</td>
                          <td className="p-6 px-10 text-right">
                             <button 
                               onClick={()=>handleCheckIn(p.id)} 
                               disabled={p.status==='CHECKED IN'} 
                               className={`px-8 py-2.5 rounded-2xl font-black text-sm transition-all ${p.status === 'CHECKED IN' ? 'bg-gray-200 text-white' : 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700'}`}
                             >
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

      {/* MODAL */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="p-10 rounded-[24px] max-w-lg w-full bg-white shadow-2xl animate-in zoom-in-95 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">{editingEventId ? "Edit Event" : "Create New Event"}</h2>
            <div className="space-y-5 text-left font-black">
               <div><label className="text-gray-500 text-sm mb-1 block">Event Title</label><input autoFocus className="w-full p-4 border border-gray-200 rounded-xl outline-none font-bold text-gray-900 focus:border-indigo-500" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title:e.target.value})} /></div>
               <div><label className="text-gray-500 text-sm mb-1 block">Date</label><input type="datetime-local" className="w-full p-4 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-indigo-500" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date:e.target.value})} /></div>
               <div><label className="text-gray-500 text-sm mb-1 block">Location</label><input className="w-full p-4 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-indigo-500" value={newEvent.location} onChange={e=>setNewEvent({...newEvent, location:e.target.value})} /></div>
               <div><label className="text-gray-500 text-sm mb-1 block">Capacity</label><input type="number" className="w-full p-4 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-indigo-500" value={newEvent.capacity} onChange={e=>setNewEvent({...newEvent, capacity:e.target.value})} /></div>
               <div className="flex gap-4 pt-6"><button onClick={()=>{setShowNewEventModal(false); setEditingEventId(null);}} className="flex-1 py-4 border border-gray-200 rounded-2xl text-gray-700 font-black">Cancel</button><button onClick={handleSaveEvent} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg"> {editingEventId ? "Save" : "Create"}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}