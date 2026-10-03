import React, { createContext, useContext, useState, useEffect } from 'react';

// Demo credentials — stand-ins for real auth until the backend exists.
// Shown on the sign-in screen so anyone testing the prototype can use them.
const mockUsers = [
  { username: 'operator', password: 'operator123', role: 'Operator', name: 'Ramesh Yadav' },
  { username: 'supervisor', password: 'super123', role: 'Supervisor', name: 'Suresh Chandra' },
  { username: 'admin', password: 'admin123', role: 'Admin', name: 'Vikram Gupta' },
];

const initialFieldDefs = [
  { key: 'thickness_micron', label: 'Thickness (micron)', type: 'number', required: false },
  { key: 'batch_code', label: 'Batch Code', type: 'text', required: false },
];

const initialReels = [
  {
    id: 'r1',
    sr_no: 1,
    reel_no: '1001',
    quality: 'VK',
    bf: 18,
    purchase_date: '2023-08-01',
    supplier_name: 'Alpha Papers',
    size: 100,
    gsm: 150,
    max_weight: 1000,
    previous_weight: 1000,
    customFields: { thickness_micron: 80, batch_code: 'B-1' }
  },
  {
    id: 'r2',
    sr_no: 2,
    reel_no: '1002',
    quality: 'SPECTRA',
    bf: 20,
    purchase_date: '2023-08-10',
    supplier_name: 'Beta Board',
    size: 120,
    gsm: 250,
    max_weight: 1200,
    previous_weight: 800,
    customFields: {}
  },
  {
    id: 'r3',
    sr_no: 3,
    reel_no: '1003',
    quality: 'ULTRA',
    bf: 22,
    purchase_date: '2023-07-15',
    supplier_name: 'Gamma Mills',
    size: 90,
    gsm: 300,
    max_weight: 800,
    previous_weight: 0,
    customFields: { batch_code: 'G-7' }
  }
];

const initialEvents = [
  {
    id: 'e1',
    reel_id: 'r1',
    event_type: 'CREATED',
    performed_by: 'Operator 1',
    performed_at: '2023-08-01T10:00:00Z',
    approved_by: 'Supervisor 1',
    approved_at: '2023-08-01T11:00:00Z',
    payload: { max_weight: 1000 }
  },
  {
    id: 'e2',
    reel_id: 'r2',
    event_type: 'CREATED',
    performed_by: 'Operator 1',
    performed_at: '2023-08-10T09:00:00Z',
    approved_by: 'Admin',
    approved_at: '2023-08-10T10:00:00Z',
    payload: { max_weight: 1200 }
  },
  {
    id: 'e3',
    reel_id: 'r2',
    event_type: 'USAGE_LOGGED',
    performed_by: 'Operator 2',
    performed_at: '2023-08-15T14:00:00Z',
    approved_by: null,
    approved_at: null,
    payload: { station: 'E-Flute', previous_weight: 1200, current_weight_entered: 800, used_this_time: 400 }
  }
];

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const [reels, setReels] = useState(initialReels);
  const [events, setEvents] = useState(initialEvents);
  const [fieldDefs, setFieldDefs] = useState(initialFieldDefs);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState('Operator');
  const [currentUser, setCurrentUser] = useState('');
  const [authError, setAuthError] = useState('');

  // Which modal is open right now — centralised so the sidebar's quick
  // actions and a dashboard's own buttons can open the same form.
  const [activeModal, setActiveModal] = useState(null);

  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const showToast = (message, type = 'info') => setToast({ message, type, key: Date.now() });

  const login = (username, password) => {
    const match = mockUsers.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );
    if (match) {
      setCurrentUser(match.name);
      setRole(match.role);
      setIsAuthenticated(true);
      setAuthError('');
      return true;
    }
    setAuthError('Incorrect username or password.');
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setActiveModal(null);
    setAuthError('');
  };

  const addFieldDef = (def) => {
    setFieldDefs([...fieldDefs, def]);
    showToast(`Added new field "${def.label}"`, 'success');
  };

  const createReel = (reelData) => {
    const newReelId = `r${Date.now()}`;
    const newReel = {
      ...reelData,
      id: newReelId,
      sr_no: reels.length + 1,
      previous_weight: reelData.max_weight,
    };

    const newEvent = {
      id: `e${Date.now()}`,
      reel_id: newReelId,
      event_type: 'CREATED',
      performed_by: currentUser,
      performed_at: new Date().toISOString(),
      approved_by: null,
      approved_at: null,
      payload: { max_weight: reelData.max_weight }
    };

    setReels([...reels, newReel]);
    setEvents([...events, newEvent]);
    showToast(`Reel #${reelData.reel_no} submitted — awaiting confirmation`, 'info');
  };

  const recordUsage = (reelId, station, currentWeightEntered) => {
    const reel = reels.find((r) => r.id === reelId);

    setReels((prevReels) => prevReels.map((r) => {
      if (r.id === reelId) {
        return { ...r, previous_weight: currentWeightEntered };
      }
      return r;
    }));

    const newEvent = {
      id: `e${Date.now()}`,
      reel_id: reelId,
      event_type: 'USAGE_LOGGED',
      performed_by: currentUser,
      performed_at: new Date().toISOString(),
      approved_by: null,
      approved_at: null,
      payload: {
        station,
        previous_weight: reel.previous_weight,
        current_weight_entered: currentWeightEntered,
        used_this_time: reel.previous_weight - currentWeightEntered
      }
    };

    setEvents([...events, newEvent]);
    showToast(`Usage recorded for reel #${reel.reel_no}`, 'info');
  };

  const confirmEvent = (eventId) => {
    setEvents((prevEvents) => prevEvents.map((e) => {
      if (e.id === eventId) {
        return { ...e, approved_by: currentUser, approved_at: new Date().toISOString() };
      }
      return e;
    }));
    showToast('Entry confirmed', 'success');
  };

  const declineEvent = (eventId) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    if (event.event_type === 'USAGE_LOGGED') {
      setReels((prevReels) => prevReels.map((r) => {
        if (r.id === event.reel_id) {
          return { ...r, previous_weight: event.payload.previous_weight };
        }
        return r;
      }));
    }

    setEvents((prevEvents) => prevEvents.map((e) => {
      if (e.id === eventId) {
        return { ...e, event_type: 'DECLINED_REVERTED', approved_by: currentUser, approved_at: new Date().toISOString() };
      }
      return e;
    }));
    showToast('Entry declined and reverted', 'error');
  };

  const getReelStatus = (reel) => {
    if (reel.previous_weight === reel.max_weight) return 'REEL';
    if (reel.previous_weight === 0) return 'NILL';
    return 'CUT';
  };

  const getPendingEvents = () => {
    return events.filter((e) => !e.approved_by && e.event_type !== 'DECLINED_REVERTED');
  };

  const store = {
    reels,
    events,
    fieldDefs,
    isAuthenticated,
    role,
    currentUser,
    authError,
    activeModal,
    setActiveModal,
    toast,
    login,
    logout,
    addFieldDef,
    createReel,
    recordUsage,
    confirmEvent,
    declineEvent,
    getReelStatus,
    getPendingEvents
  };

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
};
