import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/client';

const WorkplaceContext = createContext(null);

export function WorkplaceProvider({ children }) {
    const [workplaces, setWorkplaces] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [activeWorkplaceId, setActiveWorkplaceId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadWorkplaces = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/workplaces');
            const data = res.data || [];
            setWorkplaces(data);

            if (data.length > 0) {
                // Try to recover active from localStorage
                const storedId = localStorage.getItem('activeWorkplaceId');
                const found = data.find(w => String(w.id) === storedId);

                if (found) {
                    setActiveWorkplaceId(found.id);
                } else {
                    // Default to first found (or default flag if we had one sorted)
                    const defaultWp = data.find(w => w.isDefault) || data[0];
                    setActiveWorkplaceId(defaultWp.id);
                }
            } else {
                setActiveWorkplaceId(null);
            }
        } catch (err) {
            console.error("Failed to load workplaces", err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTemplates = async () => {
        try {
            const res = await api.get('/workplaces/templates');
            setTemplates(res.data || []);
        } catch (err) {
            console.error("Failed to load templates", err);
        }
    };

    const selectTemplate = async (templateId) => {
        try {
            setIsLoading(true);
            const res = await api.post(`/workplaces/select?templateId=${templateId}`);
            const newWp = res.data;

            // Refresh list
            const updatedRes = await api.get('/workplaces');
            const updatedData = updatedRes.data || [];
            setWorkplaces(updatedData);

            // Set as active
            setActiveWorkplaceId(newWp.id);
            return newWp;
        } catch (err) {
            console.error("Failed to select template", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadWorkplaces();
        loadTemplates();
    }, []);

    useEffect(() => {
        if (activeWorkplaceId) {
            localStorage.setItem('activeWorkplaceId', String(activeWorkplaceId));
        }
    }, [activeWorkplaceId]);

    const activeWorkplace = workplaces.find(w => w.id === activeWorkplaceId);

    const refreshWorkplaces = () => {
        loadWorkplaces();
        loadTemplates();
    };

    return (
        <WorkplaceContext.Provider value={{
            workplaces,
            templates,
            activeWorkplaceId,
            setActiveWorkplaceId,
            activeWorkplace,
            isLoading,
            refreshWorkplaces,
            selectTemplate
        }}>
            {children}
        </WorkplaceContext.Provider>
    );
}

export function useWorkplace() {
    return useContext(WorkplaceContext);
}
