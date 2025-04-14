import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
  type AuthError,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { PersistentDocumentService } from "./persistentDocumentService";
import { TierManagementService } from "./tierManagement";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

// Ensure Firebase is only initialized once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Custom type guard to check if error is an AuthError
function isAuthError(error: unknown): error is AuthError {
  return error instanceof Error && "code" in error && "message" in error;
}

// Get base URL for API endpoints
function getBaseUrl(): string {
  // For server-side rendering or environments without window
  if (typeof window === "undefined") {
    return import.meta.env.PUBLIC_BASE_URL || "http://localhost:8888";
  }

  // For client-side rendering
  // In production (e.g., on Netlify), we want to use the Netlify Functions endpoint
  if (import.meta.env.PROD) {
    return "https://praxjobs.netlify.app/.netlify/functions";
  }

  // For development with Netlify CLI
  return "http://localhost:8888/.netlify/functions";
}

// Centralized API request function
async function apiRequest(
  endpoint: string,
  method: "POST" | "GET",
  body?: any,
  token?: string // Optional: pass token for Authorization header
) {
  try {
    const url = `${getBaseUrl()}/auth/${endpoint}`;
    console.log("[apiRequest Debug] Sending request:", {
      // Added debug log
      url,
      method,
      tokenProvided: !!token,
      bodyKeys: body ? Object.keys(body) : null,
    });
    // console.log("API Request", { // Removed for prod
    //   url,
    //   method,
    //   body: body ? JSON.stringify(body) : "No body",
    //   timestamp: new Date().toISOString(),
    // });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error("API Request Failed", { // Keep minimal for prod
      //   status: response.status,
      //   statusText: response.statusText,
      //   errorText,
      //   timestamp: new Date().toISOString(),
      // });
      throw new Error(`API request failed: ${errorText}`); // Keep error throwing
    }

    return await response.json();
  } catch (error) {
    // console.error("API Request Error", { // Keep minimal for prod
    //   error: error instanceof Error ? error.message : "Unknown error",
    //   stack: error instanceof Error ? error.stack : "No stack trace",
    //   timestamp: new Date().toISOString(),
    // });
    throw error; // Keep error throwing
  }
}

class AuthService {
  private app: FirebaseApp;
  private auth: ReturnType<typeof getAuth>;
  private initialized: boolean = false;
  private googleProvider: GoogleAuthProvider;
  private loginCallbacks: (() => void)[] = [];

  constructor() {
    this.app = app;
    this.auth = auth;
    this.googleProvider = new GoogleAuthProvider();
    this.initialize();
  }

  private initPromise: Promise<void> | null = null;

  private initialize() {
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve) => {
        try {
          // Setup auth state listener
          onAuthStateChanged(
            this.auth,
            (user) => {
              this.initialized = true;
              // console.log( // Removed for prod
              //   "[AuthService] Auth state changed:",
              //   user ? user.uid : "No user"
              // );
              this.loginCallbacks.forEach((callback) => callback());
              resolve();
            },
            (error) => {
              // console.error("[AuthService] Auth state change error:", error); // Keep minimal for prod
              this.initialized = false;
              resolve(); // Resolve anyway to prevent hanging
            }
          );
        } catch (error) {
          console.error("[AuthService] Initialization error:", error);
          resolve(); // Resolve anyway to prevent hanging
        }
      });
    }
    return this.initPromise;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // Wait for initialization
      await this.initPromise;

      // Get user from auth
      const user = this.auth.currentUser;

      // if (!user && !this.initialized) { // Removed console.warn for prod
      //   console.warn("[AuthService] Auth not fully initialized");
      // }

      return user;
    } catch (error) {
      console.error("[AuthService] Error getting current user:", error);
      return null;
    }
  }

  public async signInWithGoogle(): Promise<User | null> {
    try {
      // console.log("Starting Google Sign-In process", { // Removed for prod
      //   timestamp: new Date().toISOString(),
      //   windowDefined: typeof window !== "undefined",
      //   baseUrl: getBaseUrl(),
      // });

      // Ensure browser persistence is set
      await setPersistence(this.auth, browserLocalPersistence);

      const result = await signInWithPopup(this.auth, this.googleProvider);

      // Additional validation
      if (!result.user) {
        throw new Error("No user returned from Google sign-in");
      }

      // Email reuse eligibility check removed since account deletion is disabled

      // Get and set the auth token via API
      const token = await result.user.getIdToken();
      console.log(
        "[AuthService Debug] Got Firebase ID Token:",
        token ? token.substring(0, 20) + "..." : "null"
      ); // Log token (truncated)
      // Send token in Authorization header (and body for backward compatibility)
      console.log("[AuthService Debug] Calling API /login with token...");
      await apiRequest("login", "POST", { token }, token);

      // Initialize user data in Firestore
      const db = getFirestore();
      const userRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const timestamp = Timestamp.now();
        // Create basic user document without subscription info
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: timestamp,
          lastLoginAt: timestamp,
        });

        // Initialize user subscription
        await TierManagementService.initUserTierProfile(result.user.uid);
      }

      return result.user;
    } catch (error) {
      let userFriendlyMessage =
        "An unexpected error occurred during Google Sign-In. Please try again.";

      console.error("[Google Sign-In Error]", {
        errorType: error instanceof Error ? error.name : "Unknown Error",
        message: error instanceof Error ? error.message : "No error message",
        stack: error instanceof Error ? error.stack : "No stack trace",
        code: (error as any)?.code,
        timestamp: new Date().toISOString(),
      });

      if (isAuthError(error)) {
        switch ((error as any).code) {
          case "auth/popup-closed-by-user":
            userFriendlyMessage =
              "Google Sign-In was cancelled. Please try again.";
            break;
          case "auth/popup-blocked":
            userFriendlyMessage =
              "Popup blocked. Please allow popups for this site.";
            break;
          case "auth/network-request-failed":
            userFriendlyMessage =
              "Network error. Please check your internet connection.";
            break;
          case "auth/cancelled-popup-request":
            userFriendlyMessage =
              "Sign-in request was interrupted. Please try again.";
            break;
        }
      }

      const authError = new Error(userFriendlyMessage);
      authError.name = "GoogleSignInError";
      throw authError;
    }
  }

  public async signUpWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<User | null> {
    try {
      // Set persistence before sign up
      await setPersistence(this.auth, browserLocalPersistence);

      // Use Firebase's createUserWithEmailAndPassword method
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const user = userCredential.user;

      // Record email history and create user document
      const db = this.getFirestoreInstance();
      const timestamp = Timestamp.now();

      // Create basic user document without subscription info
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || user.email,
        photoURL: user.photoURL || "",
        createdAt: timestamp,
        lastLoginAt: timestamp,
      });

      // Record email history

      // Get and set the auth token via API
      const token = await user.getIdToken();
      await apiRequest("login", "POST", { token });

      // Initialize user subscription
      await TierManagementService.initUserTierProfile(user.uid);

      return user;
    } catch (error) {
      throw error;
    }
  }

  public async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<User | null> {
    try {
      // Set persistence before sign in
      await setPersistence(this.auth, browserLocalPersistence);

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const user = userCredential.user;

      // Get and set the auth token via API
      const token = await user.getIdToken();
      await apiRequest("login", "POST", { token });

      // Log successful login
      // console.log("Email sign-in successful", { // Removed for prod
      //   uid: user.uid,
      //   email: user.email,
      //   timestamp: new Date().toISOString(),
      // });

      return user;
    } catch (error) {
      // User-friendly error messages
      let userFriendlyMessage =
        "An unexpected error occurred. Please try again.";

      if (isAuthError(error)) {
        switch (error.code) {
          case "auth/invalid-credential":
            userFriendlyMessage =
              "Invalid email or password. Please check and try again.";
            break;
          case "auth/user-not-found":
            userFriendlyMessage =
              "No account found with this email. Please sign up.";
            break;
          case "auth/wrong-password":
            userFriendlyMessage = "Incorrect password. Please try again.";
            break;
          case "auth/too-many-requests":
            userFriendlyMessage =
              "Too many login attempts. Please try again later.";
            break;
          case "auth/network-request-failed":
            userFriendlyMessage =
              "Network error. Please check your internet connection.";
            break;
        }
      }

      // Comprehensive error logging
      // console.error("Email Sign-In Error", { // Keep minimal for prod
      //   errorType: error instanceof Error ? error.name : "Unknown Error",
      //   message: error instanceof Error ? error.message : "No error message",
      //   stack: error instanceof Error ? error.stack : "No stack trace",
      //   userFriendlyMessage,
      //   timestamp: new Date().toISOString(),
      // });

      // Throw with user-friendly message
      const authError = new Error(userFriendlyMessage);
      authError.name = "AuthenticationError";
      throw authError;
    }
  }

  public async resetPassword(email: string): Promise<void> {
    try {
      // Use Firebase's sendPasswordResetEmail method
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      throw error;
    }
  }

  public async signOut(): Promise<void> {
    try {
      await signOut(this.auth);

      // Clear auth cookie via API
      await apiRequest("logout", "POST");
    } catch (error) {
      throw error; // Keep error throwing
    }
  }

  private getFirestoreInstance() {
    return getFirestore(this.app);
  }

  public addLoginCallback(callback: () => void) {
    this.loginCallbacks.push(callback);
  }
}

const authService = new AuthService();

async function onUserLogin() {
  try {
    await PersistentDocumentService.syncDocuments();

    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const userId = user.uid;
      const subscriptionProfile =
        await TierManagementService.getUserTierProfile(userId);

      const startDate = subscriptionProfile.subscriptionStartDate;
      const endDate = subscriptionProfile.subscriptionEndDate;
      const paymentStatus = subscriptionProfile.paymentStatus;

      if (
        paymentStatus === "active" &&
        endDate &&
        endDate.toDate() < new Date()
      ) {
        console.log(
          `[Subscription Check] Subscription expired. Downgrading user tier...`
        );
        await TierManagementService.downgradeUserTier(userId);
      } else {
      }
    }
  } catch (error) {
    console.error(
      "Error syncing documents or checking subscription expiry on login:",
      error
    );
  }
}

authService.addLoginCallback(onUserLogin);

export {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
  type AuthError,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
} from "firebase/auth";

export { authService, type AuthService };
