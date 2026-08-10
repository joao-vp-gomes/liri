// frontend/src/App.tsx


import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthProtectedRoute } from './components/AuthProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import SignInPage from './pages/SignInPage/SignInPage';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';
import HomePage from './pages/HomePage/HomePage';
import UserProtectedRoute from './components/UserProtectedRoute/UserProtectedRoute';
import ModerationPage from './pages/ModerationPage/ModerationPage';
import { userValidation } from './utils/userValidation';
import Header from './components/Header/Header';
import CodexPage from './pages/CodexPage/CodexPage';


const AppRoutes: React.FC = () => {

    const { account, loading } = useAuth();
    if (loading) return null;

    return (
        <Routes>

            <Route 
                path="/codex" 
                element={
                    <AuthProtectedRoute>
                        <CodexPage />
                    </AuthProtectedRoute>
                } 
            />

            <Route
                path="/moderation"
                element={
                    <AuthProtectedRoute>
                        <UserProtectedRoute returnHome={true} validation={userValidation(account, ['admin'], 'OR', null)} >
                            <ModerationPage />
                        </UserProtectedRoute>
                    </AuthProtectedRoute>
                }
            />

            <Route
                path="/signin"
                element={
                    account?.user ? 
                    <Navigate to="/home" replace /> : 
                    <SignInPage />
                }
            />

            <Route
                path="/home"
                element={
                    <AuthProtectedRoute>
                        <HomePage />
                    </AuthProtectedRoute>
                }
            />

            <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
    );
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <LanguageProvider>
                    <Header />
                    <AppRoutes />
                </LanguageProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}


export default App;