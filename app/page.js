'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function EventEaseApp() {
  // --- AUTH STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');

  // --- APP STATE ---
  const [view, setView] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '2025-12-31', location: '' });
  const [predictionResult, setPredictionResult] = useState(null);

  const primaryColor = "#5849ff";

  // --- DATABASE SYNC ---
  useEffect(() => {
    async function loadData() {
      const res = await fetch('/api/db');
      const data = await res.json();
      if (data.events) setEvents(data.events);
      if (data.participants) setParticipants(data.participants);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const syncToDb = async (updatedEvents, updatedParticipants) => {
    await fetch('/api/db', {
      method: 'POST',
      body: JSON.stringify({ events: updatedEvents || events, participants: updatedParticipants || participants })
    });
  };

  // --- AUTH LOGIC ---
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
      if (data.error) {
        setAuthError(data.error);
      } else {
        setIsLoggedIn(true);
        setCurrentUser(data.user);
      }
    } catch (err) { setAuthError('Connection failed'); }
  };

  // --- APP LOGIC ---
  const handleAddEvent = () => {
    if (!newEvent.title) return;
    const newList = [...events, { ...newEvent, id: Date.now().toString() }];
    setEvents(newList);
    syncToDb(newList, null);
    setShowNewEventModal(false);
  };

  const handleCheckIn = (pId) => {
    const newList = participants.map(p => p.id === pId ? { ...p, status: 'CHECKED IN' } : p);
    setParticipants(newList);
    syncToDb(null, newList);
  };

  // --- RENDER LOGIN/SIGNUP ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-12 rounded-[40px] shadow-2xl w-full max-w-md border bg-white border-gray-100">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold" style={{backgroundColor: primaryColor}}>📅</div>
          <h1 className="text-3xl font-black mb-2 text-center text-gray-900">EventEase</h1>
          <p className="text-center text-gray-500 mb-8 text-sm font-medium">
            {authMode === 'login' ? 'Welcome back! Please sign in.' : 'Create an account to get started.'}
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
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="font-bold text-indigo-600 underline">
              {authMode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900">
      <aside className="w-64 border-r h-screen p-6 flex flex-col fixed left-0 top-0 bg-white">
        <div className="flex items-center gap-2 mb-10"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{backgroundColor: primaryColor}}>📅</div><span className="text-xl font-bold">EventEase</span></div>
        <nav className="flex-1 space-y-1">
          {['dashboard', 'events', 'registration', 'attendance'].map((id) => (
            <button key={id} onClick={() => setView(id)} className={`w-full text-left px-4 py-3 rounded-xl font-medium capitalize ${view === id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'}`}>{id}</button>
          ))}
        </nav>
        <div className="border-t pt-4">
            <p className="text-xs font-bold text-gray-400 mb-2">LOGGED IN AS</p>
            <p className="text-sm font-bold truncate">{currentUser?.name || currentUser?.email}</p>
            <button onClick={() => setIsLoggedIn(false)} className="text-red-500 text-xs font-bold mt-2 uppercase tracking-widest">Logout</button>
        </div>
      </aside>

      <main className="ml-64 p-12">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Hello, {currentUser?.name?.split(' ')[0] || 'User'}! 👋</h1>
            <div className="grid grid-cols-4 gap-6">
                <div className="p-6 rounded-3xl border bg-white shadow-sm"><p className="text-xs font-bold text-gray-400">Total Events</p><h2 className="text-2xl font-bold">{events.length}</h2></div>
                <div className="p-6 rounded-3xl border bg-white shadow-sm"><p className="text-xs font-bold text-gray-400">Total Participants</p><h2 className="text-2xl font-bold">{participants.length}</h2></div>
            </div>
          </div>
        )}
        
        {/* ... Include your previous Events, Registration, and Attendance logic here ... */}
        {view === 'events' && <div className="p-10 text-gray-400">Click Dashboard to see stats. Your existing event list code goes here.</div>}
      </main>
    </div>
  );
}