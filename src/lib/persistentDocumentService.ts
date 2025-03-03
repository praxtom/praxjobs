import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { authService } from './auth';

export interface PersistentDocument {
  content: string;
  lastUpdated: number;
  type: 'resume' | 'coverLetter';
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
  private static COLLECTION = 'userDocuments';
  private static RESUMES_COLLECTION = 'userResumes';
  private static USAGE_TRACKING_COLLECTION = 'userUsageTracking';

  static async saveDocument(content: string, type: 'resume' | 'coverLetter') {
    try {
      const user = await authService.getCurrentUser();

      // Save to local storage
      localStorage.setItem(`user${type.charAt(0).toUpperCase() + type.slice(1)}`, JSON.stringify({
        content,
        lastUpdated: Date.now(),
        type,
        source: user ? 'firebase' : 'local'
      }));

      // Save to Firebase if user is logged in
      if (user) {
        const userDocRef = doc(db, this.COLLECTION, `${user.uid}_${type}`);
        await setDoc(userDocRef, {
          content,
          lastUpdated: Timestamp.now(),
          type
        });
      }
    } catch (error) {
      console.error(`Error saving ${type}:`, error);
    }
  }

  static async loadDocument(type: 'resume' | 'coverLetter'): Promise<string | null> {
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
      const storedDoc = localStorage.getItem(`user${type.charAt(0).toUpperCase() + type.slice(1)}`);
      if (storedDoc) {
        const parsedDoc = JSON.parse(storedDoc);
        return parsedDoc.content;
      }

      return null;
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      return null;
    }
  }

  static async syncDocuments() {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Sync Resume
      const localResume = localStorage.getItem('userResume');
      if (localResume) {
        const parsedResume = JSON.parse(localResume);
        await this.saveDocument(parsedResume.content, 'resume');
      }

      // Sync Cover Letter
      const localCoverLetter = localStorage.getItem('userCoverLetter');
      if (localCoverLetter) {
        const parsedCoverLetter = JSON.parse(localCoverLetter);
        await this.saveDocument(parsedCoverLetter.content, 'coverLetter');
      }
    } catch (error) {
      console.error('Error syncing documents:', error);
    }
  }

  // New resume management methods
  static async createResume(resumeData: Omit<Resume, 'id'>) {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Generate custom ID: username-documentname
      const username = user.displayName?.toLowerCase().replace(/\s+/g, '-') || 'user';
      const documentName = resumeData.name.toLowerCase().replace(/\s+/g, '-');
      const customId = `${username}-${documentName}`;

      const resumeRef = doc(collection(db, this.RESUMES_COLLECTION), customId);
      const newResume = {
        ...resumeData,
        id: customId,
        userId: user.uid,
        createdAt: Date.now()
      };

      await setDoc(resumeRef, newResume);
      return newResume;
    } catch (error) {
      console.error('Error creating resume:', error);
      throw error;
    }
  }

  static async updateResume(id: string, resumeData: Partial<Resume>) {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const resumeRef = doc(db, this.RESUMES_COLLECTION, id);
      const currentResume = await getDoc(resumeRef);
      if (!currentResume.exists()) throw new Error('Resume not found');

      await setDoc(resumeRef, {
        ...resumeData,
        lastUpdated: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating resume:', error);
      throw error;
    }
  }

  static async deleteResume(id: string) {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      await deleteDoc(doc(db, this.RESUMES_COLLECTION, id));
    } catch (error) {
      console.error('Error deleting resume:', error);
      throw error;
    }
  }

  static async loadAllResumes(): Promise<Resume[]> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return [];

      const resumesQuery = query(
        collection(db, this.RESUMES_COLLECTION),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(resumesQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Resume));
    } catch (error) {
      console.error('Error loading resumes:', error);
      return [];
    }
  }

  static async deleteUserData(userId: string) {
    try {
      // Delete user profile from users collection
      await deleteDoc(doc(db, 'users', userId));

      // Delete user subscription
      await deleteDoc(doc(db, 'userSubscriptions', userId));

      // Delete documents from userDocuments collection
      const documentsQuery = query(
        collection(db, this.COLLECTION), 
        where('userId', '==', userId)
      );
      const documentSnapshots = await getDocs(documentsQuery);
      
      // Delete each document
      const deletePromises = documentSnapshots.docs.map(async (document) => {
        await deleteDoc(document.ref);
      });
      await Promise.all(deletePromises);

      // Delete resumes from userResumes collection
      const resumesQuery = query(
        collection(db, this.RESUMES_COLLECTION), 
        where('userId', '==', userId)
      );
      const resumeSnapshots = await getDocs(resumesQuery);
      
      // Delete each resume
      const resumeDeletePromises = resumeSnapshots.docs.map(async (resume) => {
        await deleteDoc(resume.ref);
      });
      await Promise.all(resumeDeletePromises);

      // Delete usage tracking data from userUsageTracking collection
      const usageTrackingQuery = query(
        collection(db, this.USAGE_TRACKING_COLLECTION), 
        where('userId', '==', userId)
      );
      const usageTrackingSnapshots = await getDocs(usageTrackingQuery);
      
      // Delete each usage tracking data
      const usageTrackingDeletePromises = usageTrackingSnapshots.docs.map(async (usageTracking) => {
        await deleteDoc(usageTracking.ref);
      });
      await Promise.all(usageTrackingDeletePromises);

      // Clear local storage
      localStorage.removeItem('userResume');
      localStorage.removeItem('userCoverLetter');
      localStorage.removeItem('userJobTracker');
      localStorage.removeItem('userUsageTracking');

      console.log('Successfully deleted all user data for:', userId);
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }
}
