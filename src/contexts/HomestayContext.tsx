import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Homestay, Room } from '../types';
import { api } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface HomestayContextType {
  homestays: Homestay[];
  allHomestays: Homestay[];
  rooms: Room[];
  activeHomestayId: string;
  activeHomestay: Homestay | undefined;
  setActiveHomestayId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const HomestayContext = createContext<HomestayContextType | undefined>(undefined);

export const HomestayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, profile } = useAuth();
  const [allHomestays, setAllHomestays] = useState<Homestay[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeHomestayId, setActiveHomestayId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const [hData, rData] = await Promise.all([
        api.getHomestays(),
        api.getRooms('all'),
      ]);
      setAllHomestays(hData);
      setRooms(rData);
    } catch (err) {
      console.error('Error loading homestay data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [role, profile?.id]);

  // If user is manager and has specific assigned homestays, restrict visible homestays
  const accessibleHomestays = useMemo(() => {
    if (role === 'super_admin' || role === 'owner') {
      return allHomestays;
    }
    // Manager: check assigned_homestay_ids
    if (profile?.assigned_homestay_ids && profile.assigned_homestay_ids.length > 0) {
      return allHomestays.filter((h) => profile.assigned_homestay_ids!.includes(h.id));
    }
    return allHomestays;
  }, [allHomestays, role, profile?.assigned_homestay_ids]);

  // Ensure activeHomestayId is valid
  useEffect(() => {
    if (role === 'manager' && accessibleHomestays.length > 0) {
      if (activeHomestayId !== 'all' && !accessibleHomestays.some((h) => h.id === activeHomestayId)) {
        setActiveHomestayId(accessibleHomestays[0].id);
      }
    }
  }, [role, accessibleHomestays, activeHomestayId]);

  const activeHomestay = useMemo(() => {
    if (activeHomestayId === 'all') return undefined;
    return allHomestays.find((h) => h.id === activeHomestayId);
  }, [allHomestays, activeHomestayId]);

  return (
    <HomestayContext.Provider
      value={{
        homestays: accessibleHomestays,
        allHomestays,
        rooms,
        activeHomestayId,
        activeHomestay,
        setActiveHomestayId,
        loading,
        refresh: fetchProperties,
      }}
    >
      {children}
    </HomestayContext.Provider>
  );
};

export const useHomestay = () => {
  const context = useContext(HomestayContext);
  if (!context) throw new Error('useHomestay must be used within a HomestayProvider');
  return context;
};
