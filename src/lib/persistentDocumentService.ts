import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { authService } from "./auth";

export interface PersistentDocument {
  content: string;
  lastUpdated: number;
  type: "resume" | "coverLetter";
}

export interface Resume {
  id: string;
  name: string;
  content: string;
  lastUpdated: number;
  userId?: string;
  createdAt: number;
}

export class PersistentDocumentService {
  private static COLLECTION = "userDocuments";
  private static RESUMES_COLLECTION = "userResumes";
  private static USAGE_TRACKING_COLLECTION = "userUsageTracking"; // Added for deletion logic

  static async saveDocument(content: string, type: "resume" | "coverLetter") {
    try {
      const user = await authService.getCurrentUser();

      // Save to local storage
      localStorage.setItem(
        `user${type.charAt(0).toUpperCase() + type.slice(1)}`,
        JSON.stringify({
          content,
          lastUpdated: Date.now(),
          type,
          source: user ? "firebase" : "local",
        })
      );

      // Save to Firebase if user is logged in
      if (user) {
        // Use the specific format for document ID if needed, or just the UID
        const userDocRef = doc(db, this.COLLECTION, `${user.uid}_${type}`);
        await setDoc(
          userDocRef,
          {
            content,
            lastUpdated: Timestamp.now(),
            type,
            userId: user.uid, // Explicitly add userId for queries in deleteUserData
          },
          { merge: true }
        ); // Use merge:true if you only want to update these fields
      }
    } catch (error) {
      // Removed console.error(`Error saving ${type}:`, error);
      // Decide if this error should be thrown or handled silently
      // throw new Error(`Failed to save ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async loadDocument(
    type: "resume" | "coverLetter"
  ): Promise<string | null> {
    try {
      const user = await authService.getCurrentUser();

      // Priority 1: Try Firebase for logged-in users
      if (user) {
        const userDocRef = doc(db, this.COLLECTION, `${user.uid}_${type}`);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          return docSnap.data().content;
        }
      }

      // Priority 2: Check local storage
      const storedDoc = localStorage.getItem(
        `user${type.charAt(0).toUpperCase() + type.slice(1)}`
      );
      if (storedDoc) {
        const parsedDoc = JSON.parse(storedDoc);
        // Optionally check timestamp or source if needed for more complex logic
        return parsedDoc.content;
      }

      return null;
    } catch (error) {
      // Removed console.error(`Error loading ${type}:`, error);
      // Return null or throw depending on desired behavior
      return null;
    }
  }

  static async syncDocuments() {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return; // Only sync if user is logged in

      // Sync Resume from local to Firebase
      const localResume = localStorage.getItem("userResume");
      if (localResume) {
        const parsedResume = JSON.parse(localResume);
        // Potentially check timestamps before overwriting Firebase
        await this.saveDocument(parsedResume.content, "resume");
      }

      // Sync Cover Letter from local to Firebase
      const localCoverLetter = localStorage.getItem("userCoverLetter");
      if (localCoverLetter) {
        const parsedCoverLetter = JSON.parse(localCoverLetter);
        // Potentially check timestamps before overwriting Firebase
        await this.saveDocument(parsedCoverLetter.content, "coverLetter");
      }
    } catch (error) {
      // Removed console.error('Error syncing documents:', error);
      // Consider throwing or logging to an error service
    }
  }

  // New resume management methods
  static async createResume(
    resumeData: Omit<Resume, "id" | "createdAt" | "lastUpdated"> & {
      name: string;
    }
  ) {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Generate custom ID: username-documentname (or use Firestore auto-ID)
      // Using auto-ID might be simpler: const resumeRef = doc(collection(db, this.RESUMES_COLLECTION));
      const username =
        user.displayName?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "user";
      const documentName = resumeData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      // Ensure uniqueness or handle potential collisions if using custom IDs heavily
      const customId = `${username}-${documentName}-${Date.now()}`; // Add timestamp for uniqueness

      const resumeRef = doc(db, this.RESUMES_COLLECTION, customId);

      const newResume: Resume = {
        ...resumeData,
        id: resumeRef.id, // Use the actual ID generated by Firestore or the custom one
        userId: user.uid,
        createdAt: Date.now(),
        lastUpdated: Date.now(), // Set initial lastUpdated
      };

      await setDoc(resumeRef, newResume);
      return newResume;
    } catch (error) {
      // Removed console.error('Error creating resume:', error);
      throw error; // Re-throw error to be handled by the caller
    }
  }

  static async updateResume(
    id: string,
    resumeData: Partial<Omit<Resume, "id" | "userId" | "createdAt">>
  ) {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      const resumeRef = doc(db, this.RESUMES_COLLECTION, id);
      // Optional: Add a check to ensure the user owns this document before updating
      // const currentResume = await getDoc(resumeRef);
      // if (!currentResume.exists() || currentResume.data().userId !== user.uid) {
      //   throw new Error('Resume not found or permission denied');
      // }

      await setDoc(
        resumeRef,
        {
          ...resumeData,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    } catch (error) {
      // Removed console.error('Error updating resume:', error);
      throw error; // Re-throw error
    }
  }

  static async deleteResume(id: string) {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      const resumeRef = doc(db, this.RESUMES_COLLECTION, id);
      // Optional: Add a check to ensure the user owns this document before deleting
      // const currentResume = await getDoc(resumeRef);
      // if (!currentResume.exists() || currentResume.data().userId !== user.uid) {
      //   throw new Error('Resume not found or permission denied');
      // }

      await deleteDoc(resumeRef);
    } catch (error) {
      // Removed console.error('Error deleting resume:', error);
      throw error; // Re-throw error
    }
  }

  static async loadAllResumes(): Promise<Resume[]> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return []; // Return empty array if not logged in

      const resumesQuery = query(
        collection(db, this.RESUMES_COLLECTION),
        where("userId", "==", user.uid)
        // Consider adding orderBy('lastUpdated', 'desc') or similar
      );

      const querySnapshot = await getDocs(resumesQuery);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Resume)
      );
    } catch (error) {
      // Removed console.error('Error loading resumes:', error);
      // Return empty array or throw depending on requirements
      return [];
    }
  }

  static async deleteUserData(userId: string) {
    try {
      if (!userId || typeof userId !== "string" || userId.trim() === "") {
        console.error("deleteUserData called with invalid userId:", userId);
        return;
      }

      console.log(
        "[DeleteUserData] Attempting to delete data for userId:",
        userId
      );

      // 1. Delete user profile document (if you have one)
      try {
        const userProfileRef = doc(db, "users", userId);
        await deleteDoc(userProfileRef);
        console.log("[DeleteUserData] Deleted user profile");
      } catch (e) {
        console.error("[DeleteUserData] Error deleting user profile:", e);
      }

      // 2. Delete user subscription document
      try {
        const userSubscriptionRef = doc(db, "userSubscriptions", userId);
        await deleteDoc(userSubscriptionRef);
        console.log("[DeleteUserData] Deleted user subscription");
      } catch (e) {
        console.error("[DeleteUserData] Error deleting user subscription:", e);
      }

      // Helper function to delete documents from a collection based on userId query
      const deleteCollectionDocs = async (collectionName: string) => {
        const q = query(
          collection(db, collectionName),
          where("userId", "==", userId)
        );
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map((docSnapshot) =>
          deleteDoc(docSnapshot.ref)
        );
        await Promise.all(deletePromises);
      };

      // 3. Delete documents from userDocuments collection
      // Note: Ensure 'userId' field exists in userDocuments for this query to work
      await deleteCollectionDocs(this.COLLECTION);

      // 4. Delete resumes from userResumes collection
      await deleteCollectionDocs(this.RESUMES_COLLECTION);

      // 5. Delete usage tracking data from userUsageTracking collection
      await deleteCollectionDocs(this.USAGE_TRACKING_COLLECTION);

      // 6. Clear relevant local storage items
      // Be specific to avoid clearing unrelated data
      localStorage.removeItem("userResume");
      localStorage.removeItem("userCoverLetter");
      localStorage.removeItem("userJobTracker"); // Assuming this is related
      localStorage.removeItem("userUsageTracking"); // Assuming this is related

      // Removed console.log('Successfully deleted all user data for:', userId);
    } catch (error) {
      // Removed console.error('Error deleting user data:', error);
      // Throw error to indicate failure to the caller (e.g., the auth service)
      throw new Error(
        `Failed to delete user data for ${userId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
