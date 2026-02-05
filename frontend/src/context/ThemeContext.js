import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const ThemeContext = createContext(null);

// Theme definitions with all CSS variables
const themes = {
    default: {
        name: "ברירת מחדל",
        description: "ערכת נושא ברירת המחדל",
        vars: {
            '--bg-primary': '#ffffff',
            '--bg-secondary': '#f4f4f5',
            '--bg-tertiary': '#fafafa',
            '--text-primary': '#18181b',
            '--text-secondary': '#52525b',
            '--text-tertiary': '#a1a1aa',
            '--text-inverse': '#fafafa',
            '--text-inverse-light': '#d4d4d8',
            '--border-primary': '#e4e4e7',
            '--border-secondary': '#f4f4f5',
            '--accent-primary': '#059669',
            '--accent-secondary': '#9333ea',
            '--accent-primary-bg': '#d1fae5',
            '--accent-secondary-bg': '#f3e8ff',
            '--card-bg': '#ffffff',
            '--card-border': 'rgba(228, 228, 231, 0.6)',
            '--nav-bg': 'rgba(255, 255, 255, 0.8)',
            '--modal-overlay': 'rgba(0, 0, 0, 0.3)',
        }
    },
    light: {
        name: "בהיר",
        description: "ערכת נושא בהירה ונקייה",
        vars: {
            '--bg-primary': '#fafafa',
            '--bg-secondary': '#f0f0f0',
            '--bg-tertiary': '#e5e5e5',
            '--text-primary': '#171717',
            '--text-secondary': '#525252',
            '--text-tertiary': '#a3a3a3',
            '--text-inverse': '#fafafa',
            '--text-inverse-light': '#d4d4d8',
            '--border-primary': '#d4d4d4',
            '--border-secondary': '#e5e5e5',
            '--accent-primary': '#0891b2',
            '--accent-secondary': '#7c3aed',
            '--accent-primary-bg': '#cffafe',
            '--accent-secondary-bg': '#ede9fe',
            '--card-bg': '#ffffff',
            '--card-border': 'rgba(212, 212, 212, 0.6)',
            '--nav-bg': 'rgba(255, 255, 255, 0.9)',
            '--modal-overlay': 'rgba(0, 0, 0, 0.25)',
        }
    },
    dark: {
        name: "כהה",
        description: "ערכת נושא כהה ונעימה לעיניים",
        vars: {
            '--bg-primary': '#18181b',
            '--bg-secondary': '#27272a',
            '--bg-tertiary': '#3f3f46',
            '--text-primary': '#fafafa',
            '--text-secondary': '#d4d4d8',
            '--text-tertiary': '#a1a1aa',
            '--border-primary': '#3f3f46',
            '--text-inverse': '#171717',
            '--text-inverse-light': '#3f3f46',
            '--border-secondary': '#1b1b1e',
            '--accent-primary': '#10b981',
            '--accent-secondary': '#a855f7',
            '--accent-primary-bg': '#064e3b',
            '--accent-secondary-bg': '#581c87',
            '--card-bg': '#1b1b1e',
            '--card-border': 'rgba(63, 63, 70, 0.6)',
            '--nav-bg': 'rgba(24, 24, 27, 0.8)',
            '--modal-overlay': 'rgba(0, 0, 0, 0.6)',
        }
    },
    'pitch-black': {
        name: "שחור מוחלט",
        description: "ערכת נושא שחורה לחיסכון בסוללה",
        vars: {
            '--bg-primary': '#000000',
            '--bg-secondary': '#0a0a0a',
            '--bg-tertiary': '#171717',
            '--text-primary': '#ffffff',
            '--text-secondary': '#e5e5e5',
            '--text-tertiary': '#a3a3a3',
            '--text-inverse': '#171717',
            '--text-inverse-light': '#3f3f46',
            '--border-primary': '#262626',
            '--border-secondary': '#171717',
            '--accent-primary': '#22c55e',
            '--accent-secondary': '#9f39ff',
            '--accent-primary-bg': '#052e16',
            '--accent-secondary-bg': '#4c1d95',
            '--card-bg': '#0a0a0a',
            '--card-border': 'rgba(38, 38, 38, 0.6)',
            '--nav-bg': 'rgba(0, 0, 0, 0.9)',
            '--modal-overlay': 'rgba(0, 0, 0, 0.8)',
        }
    }
};

export function ThemeProvider({ children }) {
    const [currentTheme, setCurrentTheme] = useState('default');
    const [isLoading, setIsLoading] = useState(true);

    // Load theme from user settings
    useEffect(() => {
        async function loadTheme() {
            try {
                const res = await api.get("/settings");
                const savedTheme = res.data.themePreference || 'default';
                if (themes[savedTheme]) {
                    setCurrentTheme(savedTheme);
                    applyTheme(savedTheme);
                }
            } catch (error) {
                console.error("Failed to load theme:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadTheme();
    }, []);

    // Apply theme CSS variables to document root
    const applyTheme = (themeName) => {
        const theme = themes[themeName];
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme.vars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    };

    // Update theme and save to backend
    const updateTheme = async (themeName) => {
        if (!themes[themeName]) return;

        setCurrentTheme(themeName);
        applyTheme(themeName);

        try {
            await api.post("/settings", { themePreference: themeName });
        } catch (error) {
            console.error("Failed to save theme:", error);
        }
    };

    return (
        <ThemeContext.Provider value={{
            currentTheme,
            updateTheme,
            themes,
            isLoading
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}
