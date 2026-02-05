import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import ErrorPage from "./pages/ErrorPage";
import ProtectedRoute from "./context/ProtectedRoute";
import Layout from "./components/Layout";
import "./index.css";

function RootLayout() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Outlet />
            </AuthProvider>
        </ThemeProvider>
    );
}

// 2. Define the Router Configuration
const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "/login",
                element: <LoginPage />,
            },
            {
                // Protected Layout Route
                element: (
                    <ProtectedRoute>
                        <Layout>
                            <Outlet />
                        </Layout>
                    </ProtectedRoute>
                ),
                children: [
                    { path: "/", element: <HomePage /> },
                    { path: "/settings", element: <SettingsPage /> },
                    { path: "/history", element: <HistoryPage /> },
                ],
            },
        ],
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;