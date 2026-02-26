'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function EventEaseApp() {
  // --- STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  
  // App Data
  const [events, setEvents] = useState([
    { id: '1', title: 'School Presentation', date: '2025-12-31T10:00', location: 'Main Hall', capacity: '100' },
    { id: '2', title: 'Annual Gala', date: '2025-12-25T18:00', location: 'Grand Ballroom', capacity: '200' }
  ]);
  const [participants, setParticipants] = useState([
    { id: '101', eventId: '1', name: 'setsunana', email: 'setsunana@email.com', dept: 'IT Department', status: 'REGISTERED' }
  ]);

  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '2025-12-31T00:00', location: '', capacity: '100' });

  // AI State
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  const primaryColor = "#5849ff";

  // --- LOGIC ---
  const handlePageChange = (newView) => {
    setView(newView);
    setSearchTerm('');
    setIsSearchOpen(false);
  };

  const handleAddEvent = () => {
    if (!newEvent.title) return;
    setEvents([...events, { ...newEvent, id: Date.now().toString() }]);
    setShowNewEventModal(false);
    setNewEvent({ title: '', date: '2025-12-31T00:00', location: '', capacity: '100' });
  };

  const handleDeleteEvent = (id) => {
    if(window.confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const handleCheckIn = (participantId) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, status: 'CHECKED IN' } : p
    ));
  };

  // --- NEW SECURE AI PREDICTION CALL (Calls your Vercel API Route) ---
  const handleGeneratePrediction = async () => {
    setIsPredicting(true);
    
    const eventList = events.map(e => e.title).join(', ');
    const depts = participants.map(p => p.dept).join(', ');

    const promptText = `
      Act as an expert analyst for EventEase. 
      Data: Events: ${eventList}, Departments: ${depts}, Total Registrations: ${participants.length}
      Generate turnout prediction, trend analysis, and a reminder email draft.
      Return ONLY a JSON object: {"estimatedTurnout": number, "confidence": "string", "trend": "string", "emailDraft": "string"}
    `;

    try {
      // ✅ Now calling our own internal API endpoint created in Step 2
      const response = await fetch('/api/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText })
      });

      if (!response.ok) throw new Error("Server error or missing API Key");

      const data = await response.json();
      setPredictionResult(data);
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI Analysis failed. Make sure you set GEMINI_API_KEY in Vercel Settings.");
    } finally {
      setIsPredicting(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participants);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "EventEase_Report.xlsx");
  };

  // --- UI RENDER ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-12 rounded-[40px] shadow-2xl w-full max-w-md text-center border bg-white border-gray-100">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold" style={{backgroundColor: primaryColor}}>📅</div>
          <h1 className="text-4xl font-black mb-10 text-gray-900">EventEase</h1>
          <button onClick={() => setIsLoggedIn(true)} className="w-full py-4 text-white rounded-2xl font-bold text-lg shadow-xl" style={{backgroundColor: primaryColor }}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r h-screen p-6 flex flex-col fixed left-0 top-0 z-40 bg-white border-gray-100">
        <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => handlePageChange('dashboard')}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaryColor }}>📅</div>
          <span className="text-xl font-bold text-gray-900">EventEase</span>
        </div>
        <nav className="flex-1 space-y-1">
          {['dashboard', 'events', 'registration', 'attendance'].map((id) => (
            <button key={id} onClick={() => handlePageChange(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium capitalize transition-all ${view === id ? `bg-indigo-50 text-indigo-600` : `text-gray-500 hover:bg-gray-50`}`}>
              {id === 'dashboard' ? '📊' : id === 'events' ? '📅' : id === 'registration' ? '👥' : '✔️'} {id}
            </button>
          ))}
        </nav>
        <button onClick={() => setIsLoggedIn(false)} className="mt-4 p-4 text-red-500 font-bold text-[10px] uppercase tracking-widest text-center">Logout</button>
      </aside>

      <main className="ml-64 p-12">
        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
            
            <div className="grid grid-cols-4 gap-6">
              {[{l:'Events', v:events.length, i:'📅', c:'bg-blue-50 text-blue-500'}, {l:'Participants', v:participants.length, i:'👥', c:'bg-emerald-50 text-emerald-500'}, {l:'Attendance', v:'100%', i:'🎯', c:'bg-orange-50 text-orange-500'}, {l:'Active Depts', v:'1', i:'📈', c:'bg-indigo-50 text-indigo-500'}].map((s,i) => (
                <div key={i} className="p-6 rounded-3xl border bg-white border-gray-100 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.c}`}>{s.i}</div>
                  <p className="text-xs font-bold mb-1 text-gray-500">{s.l}</p>
                  <h2 className="text-2xl font-bold text-gray-900">{s.v}</h2>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
               <div className="col-span-2 space-y-6">
                  {/* AI INTEGRATION CARD */}
                  <div className="p-10 rounded-[32px] text-white flex flex-col gap-4 shadow-xl relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
                     <h3 className="text-xl font-bold">✨ Gemini Secure AI Suite</h3>
                     <p className="opacity-80 max-w-lg text-sm font-medium leading-relaxed">Analyzing data through secure Vercel API routes.</p>
                     {!predictionResult ? (
                       <button onClick={handleGeneratePrediction} disabled={isPredicting} className="bg-white text-indigo-600 w-fit px-8 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95">
                         {isPredicting ? '🧠 Analyzing...' : '🚀 Run Secure AI Analysis'}
                       </button>
                     ) : (
                       <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 animate-in fade-in zoom-in-95 space-y-4">
                          <div className="flex justify-between items-start">
                             <div><p className="text-[10px] font-bold opacity-60">Turnout Prediction</p><h4 className="text-3xl font-black">{predictionResult.estimatedTurnout}</h4></div>
                             <div className="text-right"><p className="text-[10px] font-bold opacity-60">AI Confidence</p><h4 className="text-xl font-bold">{predictionResult.confidence}</h4></div>
                          </div>
                          <p className="text-sm font-bold border-t border-white/10 pt-4">📊 {predictionResult.trend}</p>
                          <p className="text-xs italic opacity-90">Draft: "{predictionResult.emailDraft}"</p>
                          <button onClick={() => setPredictionResult(null)} className="mt-2 text-[10px] font-bold uppercase underline opacity-60">Reset</button>
                       </div>
                     )}
                  </div>
               </div>

               <div className="p-8 rounded-[32px] border bg-white border-gray-100 shadow-sm">
                  <h3 className="font-bold mb-8 text-slate-800">Upcoming Events</h3>
                  {events.map(e => (
                    <div key={e.id} className="flex items-center gap-4 mb-6">
                       <div className="bg-gray-50 p-2 rounded-xl text-center min-w-[50px] font-bold text-gray-800">31</div>
                       <div className="flex-1 text-sm font-bold text-gray-800">{e.title}</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* EVENTS VIEW */}
        {view === 'events' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-8">
               <h1 className="text-3xl font-bold">Events</h1>
               <button onClick={() => setShowNewEventModal(true)} className="px-5 py-2.5 text-white rounded-xl font-bold" style={{backgroundColor: primaryColor}}>+ New Event</button>
             </div>
             <div className="grid grid-cols-3 gap-6">
               {events.map(e => (
                 <div key={e.id} className="rounded-[32px] border bg-white border-gray-100 shadow-sm overflow-hidden relative group">
                    <div className="h-44 bg-slate-200 relative">
                        <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=500" className="w-full h-full object-cover" alt="Event" />
                        <button onClick={() => handleDeleteEvent(e.id)} className="absolute top-4 right-4 bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </div>
                    <div className="p-6"><h3 className="font-bold text-lg text-gray-900">{e.title}</h3></div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* REGISTRATION VIEW */}
        {view === 'registration' && (
          <div className="max-w-4xl mx-auto flex flex-col items-center animate-in fade-in duration-500 pt-10">
            <h2 className="text-5xl font-bold text-[#0f172a] mb-20 text-center">Event Registration</h2>
            <div className="w-full max-w-3xl space-y-12 bg-white p-20 rounded-[48px] shadow-sm border border-gray-50">
              <select className="w-full p-6 bg-[#fcfdfe] border border-gray-100 rounded-[24px] outline-none">
                  <option>Choose an event...</option>
                  {events.map(e => <option key={e.id}>{e.title}</option>)}
              </select>
              <input className="w-full p-6 bg-[#fcfdfe] border border-gray-100 rounded-[24px] outline-none" placeholder="Full Name" />
              <input className="w-full p-6 bg-[#fcfdfe] border border-gray-100 rounded-[24px] outline-none" placeholder="Department" />
              <button className="w-full py-6 text-white rounded-[28px] font-bold text-2xl shadow-xl transition-all active:scale-95" style={{ backgroundColor: primaryColor }}>Register Now</button>
            </div>
          </div>
        )}

        {/* ATTENDANCE VIEW */}
        {view === 'attendance' && (
          <div className="space-y-8">
             <h1 className="text-3xl font-bold">Attendance Tracking</h1>
             <select className="w-full p-4 border rounded-xl" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                <option value="">Select Event to Track...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
             </select>
             {selectedEventId && (
                <div className="rounded-[24px] border bg-white border-gray-100 shadow-sm overflow-hidden">
                   <div className="p-10 flex justify-between items-center border-b border-gray-50">
                      <h3 className="font-bold text-xl">Participant List</h3>
                      <button onClick={exportToExcel} className="text-indigo-500 font-bold">📄 Export Excel</button>
                   </div>
                   <table className="w-full text-left">
                      <thead className="bg-gray-50/5 text-gray-500 text-xs font-bold uppercase">
                        <tr><th className="p-6 px-10">Name</th><th className="p-6 px-10">Status</th><th className="p-6 px-10 text-right">Action</th></tr>
                      </thead>
                      <tbody>
                        {participants.map(p => (
                          <tr key={p.id} className="border-t border-gray-50">
                            <td className="p-6 px-10 font-bold">{p.name}</td>
                            <td className="p-6 px-10"><span className="bg-emerald-100/30 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{p.status}</span></td>
                            <td className="p-6 px-10 text-right"><button onClick={() => handleCheckIn(p.id)} disabled={p.status === 'CHECKED IN'} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-bold disabled:bg-gray-200">Check In</button></td>
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
          <div className="p-10 rounded-[28px] max-w-md w-full bg-white shadow-2xl animate-in zoom-in-95 border border-gray-100">
            <h2 className="text-3xl font-bold mb-8">Create New Event</h2>
            <div className="space-y-5">
               <input autoFocus className="w-full p-4 border border-indigo-50 rounded-xl outline-none" placeholder="Event Title" value={newEvent.title} onChange={(e)=>setNewEvent({...newEvent, title:e.target.value})} />
               <div className="flex gap-4 pt-4">
                 <button onClick={()=>setShowNewEventModal(false)} className="flex-1 py-4 font-bold border border-gray-100 rounded-2xl">Cancel</button>
                 <button onClick={handleAddEvent} className="flex-1 py-4 text-white rounded-2xl font-bold shadow-lg" style={{ backgroundColor: primaryColor }}>Create</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}