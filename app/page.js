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
    { id: '1', title: 'School Presentation', date: '2025-12-31T10:00', location: 'Main Hall', capacity: '100', category: 'school' },
    { id: '2', title: 'Annual Gala', date: '2025-12-25T18:00', location: 'Grand Ballroom', capacity: '200', category: 'social' }
  ]);
  const [participants, setParticipants] = useState([
    { id: '101', eventId: '1', name: 'setsunana', email: 'setsunana@fsdfds', dept: 'sfsfsdf', status: 'REGISTERED' }
  ]);

  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '2025-12-31T00:00', location: '', capacity: '100' });

  const primaryColor = "#5849ff";

  // --- LOGIC ---
  const handlePageChange = (newView) => {
    setView(newView);
    setSearchTerm('');
    setIsSearchOpen(false);
  };

  const handleAddEvent = () => {
    if (!newEvent.title) return;
    setEvents([...events, { ...newEvent, id: Date.now().toString(), category: 'school' }]);
    setShowNewEventModal(false);
    setNewEvent({ title: '', date: '2025-12-31T00:00', location: '', capacity: '100' });
  };

  // ADDED: Delete Logic
  const handleDeleteEvent = (id) => {
    if(window.confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participants);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "EventEase_Report.xlsx");
  };

  const filteredParticipants = participants.filter(p => 
    p.eventId === selectedEventId && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- UI COMPONENTS ---
  const Sidebar = () => (
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
  );

  const Header = ({ title }) => {
    const showSearch = view === 'events' || view === 'attendance';
    return (
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">Manage your event ecosystem efficiently.</p>
        </div>
        <div className="flex items-center gap-3">
          {showSearch && (
            <div className={`flex items-center gap-2 border rounded-xl transition-all duration-300 overflow-hidden bg-white border-gray-100 shadow-sm ${isSearchOpen ? 'w-64' : 'w-10'}`}>
              <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-gray-500">🔍</button>
              {isSearchOpen && <input autoFocus type="text" placeholder="Search..." className="bg-transparent outline-none text-sm w-full pr-3 text-gray-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />}
            </div>
          )}
          <button onClick={() => setShowNewEventModal(true)} className="px-5 py-2.5 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95" style={{ backgroundColor: primaryColor }}>+ New Event</button>
        </div>
      </header>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-12 rounded-[40px] shadow-2xl w-full max-w-md text-center border bg-white border-gray-100">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold shadow-2xl" style={{backgroundColor: primaryColor}}>📅</div>
          <h1 className="text-4xl font-black mb-10 text-gray-900">EventEase</h1>
          <button onClick={() => setIsLoggedIn(true)} className="w-full py-4 text-white rounded-2xl font-bold text-lg shadow-xl" style={{backgroundColor: primaryColor }}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans selection:bg-indigo-100">
      <Sidebar />
      <main className="ml-64 p-12">
        
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Header title="Dashboard" />
            <div className="grid grid-cols-4 gap-6">
              {[{l:'Total Events', v:events.length, i:'📅', c:'bg-blue-50 text-blue-500'}, {l:'Total Participants', v:participants.length, i:'👥', c:'bg-emerald-50 text-emerald-500'}, {l:'Attendance Rate', v:'100%', i:'🎯', c:'bg-orange-50 text-orange-500'}, {l:'Active Depts', v:'1', i:'📈', c:'bg-indigo-50 text-indigo-500'}].map((s,i) => (
                <div key={i} className="p-6 rounded-3xl border bg-white border-gray-100 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.c}`}>{s.i}</div>
                  <p className="text-xs font-bold mb-1 text-gray-500 tracking-tight">{s.l}</p>
                  <h2 className="text-2xl font-bold text-gray-900">{s.v}</h2>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
               <div className="col-span-2 space-y-6">
                  <div className="p-8 rounded-[32px] border bg-white border-gray-100 shadow-sm">
                     <h3 className="font-bold mb-6 text-slate-800">Department Distribution</h3>
                     <div className="space-y-4">
                        <div className="flex justify-between text-xs font-bold text-slate-800"><span>sfsfsdf</span><span className="text-slate-400 font-medium tracking-tighter">{participants.length} participants</span></div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width: '100%'}}></div></div>
                     </div>
                  </div>
                  <div className="p-10 rounded-[32px] text-white flex flex-col gap-4 shadow-xl" style={{ backgroundColor: primaryColor }}>
                     <h3 className="text-xl font-bold">📈 AI Attendance Prediction</h3>
                     <p className="opacity-80 max-w-lg text-sm font-medium leading-relaxed">Get AI-powered insights for your next event based on historical data.</p>
                     <button className="bg-white text-indigo-600 w-fit px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-gray-50">📊 Generate Prediction</button>
                  </div>
               </div>
               <div className="p-8 rounded-[32px] border bg-white border-gray-100 shadow-sm">
                  <h3 className="font-bold mb-8 text-slate-800">Upcoming Events</h3>
                  {events.map(e => (
                    <div key={e.id} className="flex items-center gap-4 mb-6">
                       <div className="bg-gray-50 p-2 rounded-xl text-center min-w-[50px]"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">DEC</p><p className="text-lg font-bold">31</p></div>
                       <div className="flex-1 text-sm font-bold text-gray-800">{e.title}<p className="text-[10px] text-indigo-500 uppercase">school</p></div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {view === 'registration' && (
          <div className="max-w-4xl mx-auto flex flex-col items-center animate-in fade-in duration-500">
            <div className="w-full flex justify-between items-start mb-12">
              <div><h1 className="text-4xl font-bold text-gray-900">Register</h1><p className="text-gray-500 font-medium mt-1">Manage your ecosystem efficiently.</p></div>
              <button onClick={()=>setShowNewEventModal(true)} className="px-6 py-3 text-white rounded-xl font-bold shadow-lg shadow-indigo-100" style={{ backgroundColor: primaryColor }}>+ New Event</button>
            </div>
            <div className="w-full p-24 rounded-[48px] shadow-sm border border-gray-50 bg-white flex flex-col items-center">
              <h2 className="text-5xl font-bold text-[#0f172a] mb-20 tracking-tight">Event Registration</h2>
              <div className="w-full max-w-3xl space-y-12">
                <div><label className="block text-sm font-bold text-gray-900 mb-3 ml-1">Select Event</label>
                  <select className="w-full p-6 bg-[#fcfdfe] border border-gray-100 rounded-[24px] outline-none text-gray-300 appearance-none cursor-pointer">
                    <option>Choose an event...</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <input className="w-full p-6 bg-[#fcfdfe] border border-gray-100 rounded-[24px] outline-none text-gray-700 placeholder:text-gray-200" placeholder="John Doe" />
                  <input className="w-full p-6 bg-[#fcfdfe] border border-gray-100 rounded-[24px] outline-none text-gray-700 placeholder:text-gray-200" placeholder="john@example.com" />
                </div>
                <input className="w-full p-6 bg-[#fcfdfe] border border-gray-100 rounded-[24px] outline-none text-gray-700 placeholder:text-gray-200" placeholder="Computer Science" />
                <button className="w-full py-6 text-white rounded-[28px] font-bold text-2xl shadow-2xl shadow-indigo-100 mt-12 transition-all active:scale-95" style={{ backgroundColor: primaryColor }}>Register Now</button>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS VIEW (ADDED DELETE BUTTON) */}
        {view === 'events' && (
          <div className="space-y-6">
             <Header title="Events" />
             <div className="grid grid-cols-3 gap-6">
               {events.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase())).map(e => (
                 <div key={e.id} className="rounded-[32px] border bg-white border-gray-100 shadow-sm overflow-hidden relative group">
                    <div className="h-44 bg-slate-200 relative">
                        <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover" alt="Event" />
                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDeleteEvent(e.id)} 
                          className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          ✕
                        </button>
                    </div>
                    <div className="p-6">
                        <h3 className="font-bold text-lg mb-2 text-gray-900">{e.title}</h3>
                        <p className="text-gray-500 font-medium">{new Date(e.date).toLocaleDateString()}</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {view === 'attendance' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <Header title="Attendance" />
             <div className="p-10 rounded-[24px] border bg-white border-gray-100 shadow-sm">
                <label className="block text-sm font-bold mb-4 text-gray-900 uppercase tracking-tight">Select Event to Track Attendance</label>
                <select className="w-full p-4 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-400" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                   <option value="">Choose an event...</option>
                   {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
             </div>
             {selectedEventId && (
                <div className="rounded-[24px] border bg-white border-gray-100 shadow-sm overflow-hidden">
                   <div className="p-10 flex justify-between items-center border-b border-gray-50">
                      <h3 className="font-bold text-xl text-gray-900">Participant List</h3>
                      <button onClick={exportToExcel} className="text-indigo-500 font-bold text-sm flex items-center gap-2">📄 Export Report</button>
                   </div>
                   <table className="w-full text-left">
                      <thead className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50/5">
                        <tr><th className="p-6 px-10">Name</th><th className="p-6 px-10">Department</th><th className="p-6 px-10">Status</th><th className="p-6 px-10 text-right">Action</th></tr>
                      </thead>
                      <tbody>
                        {filteredParticipants.map(p => (
                          <tr key={p.id} className="border-t border-gray-50">
                            <td className="p-6 px-10">
                               <div className="font-bold text-gray-900">{p.name}</div>
                               <div className="text-[10px] text-gray-400 font-medium">{p.email}</div>
                            </td>
                            <td className="p-6 px-10 font-medium text-gray-500">{p.dept}</td>
                            <td className="p-6 px-10"><span className="bg-emerald-100/30 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{p.status}</span></td>
                            <td className="p-6 px-10 text-right"><button className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-bold">Check In</button></td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             )}
          </div>
        )}
      </main>

      {/* NEW EVENT MODAL (UPDATED TO MATCH IMAGE) */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="p-10 rounded-[28px] max-w-md w-full shadow-2xl border bg-white border-gray-100 animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-bold mb-8 text-gray-900">Create New Event</h2>
            <div className="space-y-5">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Event Title</label>
                  <input autoFocus className="w-full p-4 border border-gray-100 rounded-xl outline-none focus:border-indigo-500" placeholder="e.g. Workshop" value={newEvent.title} onChange={(e)=>setNewEvent({...newEvent, title:e.target.value})} />
               </div>
               
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Date</label>
                  <input type="datetime-local" className="w-full p-4 border border-gray-100 rounded-xl outline-none focus:border-indigo-500 text-gray-500" value={newEvent.date} onChange={(e)=>setNewEvent({...newEvent, date:e.target.value})} />
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Location</label>
                  <input className="w-full p-4 border border-gray-100 rounded-xl outline-none focus:border-indigo-500" placeholder="Venue location" value={newEvent.location} onChange={(e)=>setNewEvent({...newEvent, location:e.target.value})} />
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Capacity</label>
                  <input type="number" className="w-full p-4 border border-gray-100 rounded-xl outline-none focus:border-indigo-500" value={newEvent.capacity} onChange={(e)=>setNewEvent({...newEvent, capacity:e.target.value})} />
               </div>

               <div className="flex gap-4 pt-4">
                 <button onClick={()=>setShowNewEventModal(false)} className="flex-1 py-4 font-bold text-gray-600 border border-gray-100 rounded-2xl hover:bg-gray-50">Cancel</button>
                 <button onClick={handleAddEvent} className="flex-1 py-4 text-white rounded-2xl font-bold shadow-lg transition-transform active:scale-95" style={{ backgroundColor: primaryColor }}>Create</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}