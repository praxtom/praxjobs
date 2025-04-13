import { atom } from "nanostores";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import {
  initializeFirebase,
  getCurrentUser as firebaseGetCurrentUser,
} from "./firebase";

// Session timeout in milliseconds (24 hours)
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

// Create an atom for the auth state
export const authStore = atom<{
  user: User | null;
  loading: boolean;
  lastActivity: number | null;
  subscriptionExpired: boolean;
}>({
  user: null,
  loading: true,
  lastActivity: null,
  subscriptionExpired: false,
});

// Function to update last activity
export const updateLastActivity = () => {
  const currentState = authStore.get();
  if (currentState.user) {
    authStore.set({
      ...currentState,
      subscriptionExpired: false,
      lastActivity: Date.now(),
    });

    // Removed global exposure: window.authStore = authStore;
  }
};

// Initialize Firebase instance
let firebaseInstance: ReturnType<typeof initializeFirebase> | null = null;

// Add a persistent storage mechanism for user data
const USER_STORAGE_KEY = "astro_resume_user_data";

// Enhanced user data storage function
export function storeUserData(user: User | null) {
  if (typeof window !== "undefined") {
    try {
      if (user) {
        localStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            timestamp: Date.now(),
          })
        );
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (error) {
      // console.error('Error storing user data:', error);
    }
  }
}

// Enhanced user data retrieval function
export function getStoredUserData(): {
  uid: string;
  displayName: string | null;
  email: string | null;
} | null {
  if (typeof window !== "undefined") {
    try {
      const storedData = localStorage.getItem(USER_STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Optional: Add expiration logic if needed
        return parsedData;
      }
    } catch (error) {
      // console.error('Error retrieving user data:', error);
    }
  }
  return null;
}

// Modify getCurrentUser to use persistent storage
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window !== "undefined") {
    try {
      // First, check persistent storage
      const storedUser = getStoredUserData();

      // If stored user exists and is recent, return it
      if (storedUser) {
        return {
          uid: storedUser.uid,
          displayName: storedUser.displayName,
          email: storedUser.email,
        } as User;
      }

      // Fallback to Firebase authentication
      const auth = firebaseInstance?.auth ?? null;
      if (auth) {
        const user = await firebaseGetCurrentUser(auth);

        // Store user data if found
        if (user) {
          storeUserData(user);
        }

        return user;
      }
    } catch (error) {
      // console.error('User retrieval error:', error);
    }
  }
  return null;
}

// Initialize auth state on client side
if (typeof window !== "undefined") {
  firebaseInstance = initializeFirebase();
  const auth = firebaseInstance?.auth ?? null;

  if (auth) {
    // Immediately try to get current user to reduce loading time
    getCurrentUser()
      .then((user) => {
        authStore.set({
          user,
          loading: false,
          lastActivity: user ? Date.now() : null,
          subscriptionExpired: false,
        });
      })
      .catch((error) => {
        // console.error('Initial user retrieval error:', error);
        authStore.set({
          user: null,
          loading: false,
          lastActivity: null,
          subscriptionExpired: false,
        });
      });

    // Listen for auth state changes
    onAuthStateChanged(
      auth,
      (user) => {
        // Update both nanostore and persistent storage
        authStore.set({
          user,
          loading: false,
          lastActivity: user ? Date.now() : null,
          subscriptionExpired: false,
        });

        storeUserData(user);
      },
      (error) => {
        // console.error('Auth state change error:', error);
        authStore.set({
          user: null,
          loading: false,
          lastActivity: null,
          subscriptionExpired: false,
        });
      }
    );
  }
}

// Function to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    // First, check stored user data
    const storedUser = getStoredUserData();
    if (storedUser) {
      return true;
    }

    // If no stored user, check Firebase authentication
    if (typeof window !== "undefined") {
      const firebaseInstance = initializeFirebase();
      const auth = firebaseInstance?.auth ?? null;

      if (!auth) {
        // console.error('Firebase auth not initialized');
        return false;
      }

      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            unsubscribe();
            if (user) {
              // Store user data if authenticated
              storeUserData(user);
              resolve(true);
            } else {
              resolve(false);
            }
          },
          (error) => {
            // console.error('Authentication state check error:', error);
            resolve(false);
          }
        );
      });
    }

    return false;
  } catch (error) {
    // console.error('Authentication check error:', error);
    return false;
  }
}

// Function to get current authenticated user
export async function getAuthenticatedUser(): Promise<User | null> {
  const currentState = authStore.get();

  // If user is already loaded and session is valid
  if (currentState.user) {
    const isSessionValid = currentState.lastActivity
      ? Date.now() - currentState.lastActivity < SESSION_TIMEOUT
      : false;

    if (isSessionValid) return currentState.user;
  }

  // If user is not loaded or session expired, try to get current user
  const auth = firebaseInstance?.auth ?? null;

  if (!auth) return null;

  try {
    const user = await getCurrentUser();

    if (user) {
      // Update store with new user and reset last activity
      authStore.set({
        user,
        loading: false,
        lastActivity: Date.now(),
        subscriptionExpired: false,
      });
    }

    return user;
  } catch {
    return null;
  }
}
