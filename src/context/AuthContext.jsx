import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged, updateProfile } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function loginAnonymously(nickname) {
    try {
      const userCredential = await signInAnonymously(auth);
      // Wait for auth state change to capture the user
      // Optionally update profile if we want to store nickname in Auth
      // But we mostly store it in Firestore 'players' collection
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      throw error;
    }
  }

  const value = {
    currentUser,
    loginAnonymously
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
