import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import ErrorPage from "./pages/ErrorPage";
import ProtectedRoute from "./context/ProtectedRoute";
import "./index.css";

function RootLayout() {
    return (
        <AuthProvider>
            <Outlet />
        </AuthProvider>
    );
}

// 2. Define the Router Configuration
const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        errorElement: <ErrorPage />, // activates useRouteError() for crashes & 404s
        children: [
            {
                path: "/",
                element: (
                    <ProtectedRoute>
                        <HomePage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/login",
                element: <LoginPage />,
            },
            {
                path: "/settings",
                element: (
                    <ProtectedRoute>
                        <SettingsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/history",
                element: (
                    <ProtectedRoute>
                        <HistoryPage />
                    </ProtectedRoute>
                ),
            },
        ],
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;