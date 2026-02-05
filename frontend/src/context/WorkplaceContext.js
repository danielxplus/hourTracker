import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/client';

const WorkplaceContext = createContext(null);

export function WorkplaceProvider({ children }) {
    const [workplaces, setWorkplaces] = useState([]);
    const [activeWorkplaceId, setActiveWorkplaceId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadWorkplaces = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/workplaces');
            const data = res.data || [];
            if (data.length > 0) {
                setWorkplaces(data);

                // Try to recover active from localStorage
                const storedId = localStorage.getItem('activeWorkplaceId');
                const found = data.find(w => String(w.id) === storedId);

                if (found) {
                    setActiveWorkplaceId(found.id);
                } else if (!activeWorkplaceId) {
                    // Default to first found (or default flag if we had one sorted)
                    // The backend returns user workplaces. Default is usually good to start.
                    const defaultWp = data.find(w => w.isDefault) || data[0];
                    setActiveWorkplaceId(defaultWp.id);
                }
            } else {
                setWorkplaces([]);
                setActiveWorkplaceId(null);
            }
        } catch (err) {
            console.error("Failed to load workplaces", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadWorkplaces();
    }, []);

    useEffect(() => {
        if (activeWorkplaceId) {
            localStorage.setItem('activeWorkplaceId', String(activeWorkplaceId));
        }
    }, [activeWorkplaceId]);

    const activeWorkplace = workplaces.find(w => w.id === activeWorkplaceId);

    const refreshWorkplaces = () => loadWorkplaces();

    return (
        <WorkplaceContext.Provider value={{
            workplaces,
            activeWorkplaceId,
            setActiveWorkplaceId,
            activeWorkplace,
            isLoading,
            refreshWorkplaces
        }}>
            {children}
        </WorkplaceContext.Provider>
    );
}

export function useWorkplace() {
    return useContext(WorkplaceContext);
}
