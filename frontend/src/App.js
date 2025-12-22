import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./context/ProtectedRoute";
import "./index.css";

function App() {
  return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
  );
}

export default App;
