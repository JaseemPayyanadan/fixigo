import { logger } from './logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      logger.info('API Request', { url, method: options.method || 'GET' });

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new ApiError(
          data.code || 'UNKNOWN_ERROR',
          data.message || 'An unexpected error occurred',
          data.details
        );

        logger.error('API Error', error, {
          url,
          status: response.status,
          statusText: response.statusText,
          data
        });

        throw error;
      }

      logger.info('API Response', { url, success: true });

      return {
        success: true,
        data,
        message: data.message
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const apiError = new ApiError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network error occurred',
        { originalError: error }
      );

      logger.error('API Network Error', apiError, { url });

      throw apiError;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Firebase-specific API utilities
export class FirebaseApiClient {
  private db: any;
  private auth: any;

  constructor(db: any, auth: any) {
    this.db = db;
    this.auth = auth;
  }

  async getDocument<T>(collection: string, id: string): Promise<T | null> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(this.db, collection, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }

      return null;
    } catch (error) {
      logger.error('Firebase getDocument error', error as Error, { collection, id });
      throw new ApiError('FIRESTORE_ERROR', 'Failed to fetch document', { collection, id });
    }
  }

  async getDocuments<T>(collection: string, query?: any): Promise<T[]> {
    try {
      const { collection: firestoreCollection, getDocs, query: firestoreQuery, where } = await import('firebase/firestore');
      
      const collectionRef = firestoreCollection(this.db, collection);
      
      if (query) {
        const queryConstraints = Object.entries(query).map(([field, value]) => where(field, '==', value));
        const q = firestoreQuery(collectionRef, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      } else {
        const querySnapshot = await getDocs(collectionRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      }
    } catch (error) {
      logger.error('Firebase getDocuments error', error as Error, { collection, query });
      throw new ApiError('FIRESTORE_ERROR', 'Failed to fetch documents', { collection, query });
    }
  }

  async createDocument<T>(collection: string, data: any): Promise<string> {
    try {
      const { collection: firestoreCollection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(firestoreCollection(this.db, collection), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      logger.error('Firebase createDocument error', error as Error, { collection, data });
      throw new ApiError('FIRESTORE_ERROR', 'Failed to create document', { collection, data });
    }
  }

  async updateDocument<T>(collection: string, id: string, data: any): Promise<void> {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const docRef = doc(this.db, collection, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Firebase updateDocument error', error as Error, { collection, id, data });
      throw new ApiError('FIRESTORE_ERROR', 'Failed to update document', { collection, id, data });
    }
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const docRef = doc(this.db, collection, id);
      await deleteDoc(docRef);
    } catch (error) {
      logger.error('Firebase deleteDocument error', error as Error, { collection, id });
      throw new ApiError('FIRESTORE_ERROR', 'Failed to delete document', { collection, id });
    }
  }
} 