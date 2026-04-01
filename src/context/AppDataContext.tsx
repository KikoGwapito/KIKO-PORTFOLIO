import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { db, auth, isConfigValid } from '../firebase';

export type MediaItem = {
  type: 'image' | 'video' | 'comparison';
  url: string;
  secondUrl?: string;
  className: string;
};

export type ProjectData = {
  title: string;
  description: string;
  longDescription: string;
  images: MediaItem[];
  galleryGrid: string;
  role: string;
  timeline: string;
  tech: string[];
};

export type HeroData = {
  label: string;
  scrollText: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  media: MediaItem;
  floatingText?: string;
};

export type TrustLogo = {
  image: string;
  link?: string;
};

export type TrustData = {
  label: string;
  title: string;
  logos: (string | TrustLogo)[];
  quote: string;
  authorName: string;
  authorRole: string;
  authorImage: string;
};

export type FeaturedWorkData = {
  label: string;
  title: string;
};

export type PageTitleData = {
  title: string;
  logo: string;
};

export type Experience = {
  id: string;
  year: string;
  month: string;
  role: string;
  company: string;
  description: string;
};

export type AboutData = {
  label?: string;
  title: string;
  content: string[];
  image: string;
  experience?: Experience[];
  floatingText?: string;
};

export type ProcessData = {
  label: string;
  title: string;
  subtitle: string;
  steps: { title: string; description: string; }[];
  media: MediaItem[];
};

export type ContactData = {
  label?: string;
  title: string;
  subtitle: string;
  email: string;
  address?: string;
  socials: { platform: string; url: string; username: string; }[];
  media: MediaItem[];
};

export type ThemeSettings = {
  primaryColor: string;
  cursorColor: string;
  backgroundColor: string;
  headerColor: string;
  footerColor: string;
  animationSpeed: number;
  defaultMode?: 'light' | 'dark';
};

export type Review = {
  id: string;
  clientName: string;
  clientRole: string;
  content: string;
  rating: number;
  date: string;
};

export type ReviewsData = {
  enabled: boolean;
  list: Review[];
};

export type CloudinarySettings = {
  cloudName: string;
  uploadPreset: string;
};

export type AppData = {
  hero: HeroData;
  trust: TrustData;
  featuredWork: FeaturedWorkData;
  pageTitle: PageTitleData;
  about: AboutData;
  process: ProcessData;
  contact: ContactData;
  theme: ThemeSettings;
  reviews: ReviewsData;
  projects: Record<string, ProjectData>;
  projectOrder: string[];
  cloudinary: CloudinarySettings;
};

const defaultProjects: Record<string, ProjectData> = {
  'fintech': {
    title: 'Fintech Dashboard',
    description: 'Redesigned the core user flow, resulting in a 42% increase in successful onboarding completions.',
    longDescription: 'For this fintech startup, the primary challenge was a high drop-off rate during the complex KYC (Know Your Customer) onboarding process. By breaking down the forms into manageable, bite-sized steps and introducing real-time validation with clear error states, we significantly reduced cognitive load. The result was a 42% increase in completed onboardings and a 30% reduction in support tickets related to account creation.',
    images: [
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', className: 'col-span-1 md:col-span-2 aspect-[16/9]' },
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', className: 'col-span-1 aspect-[16/9]' },
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', className: 'col-span-1 aspect-[16/9]' },
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', className: 'col-span-1 md:col-span-2 aspect-[21/9]' },
    ],
    galleryGrid: 'md:grid-cols-2',
    role: 'Lead UX/UI Designer',
    timeline: '3 Months',
    tech: ['React', 'TypeScript', 'Tailwind CSS', 'Recharts']
  },
  'ecommerce': {
    title: 'E-Commerce Platform',
    description: 'Optimized checkout architecture and mobile responsiveness, dropping cart abandonment by 18%.',
    longDescription: 'A major retail brand was experiencing high cart abandonment on mobile devices. I led the frontend rebuild of their checkout flow, implementing a single-page checkout experience with Apple Pay and Google Pay integration. We also optimized image loading and reduced the JavaScript bundle size by 40%, leading to a sub-second time-to-interactive on 3G networks.',
    images: [
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', className: 'col-span-1 aspect-[9/16]' },
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', className: 'col-span-1 aspect-[9/16]' },
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', className: 'col-span-1 aspect-[9/16]' },
    ],
    galleryGrid: 'md:grid-cols-3',
    role: 'Frontend Engineer',
    timeline: '4 Months',
    tech: ['Next.js', 'Stripe', 'Zustand', 'Framer Motion']
  },
  'saas': {
    title: 'SaaS Marketing Site',
    description: 'Built a blazing fast static site with Next.js, achieving 100/100 Lighthouse scores across the board.',
    longDescription: 'This B2B SaaS company needed a marketing site that reflected the speed and reliability of their core product. I architected a static site using Next.js and MDX for their blog. By heavily utilizing Next.js Image optimization, strict component lazy loading, and edge caching, we achieved perfect Lighthouse scores, which directly contributed to a 25% increase in organic search traffic.',
    images: [
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', className: 'col-span-1 md:col-span-2 aspect-[16/9]' },
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', className: 'col-span-1 aspect-[16/9]' },
      { type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', className: 'col-span-1 aspect-[16/9]' },
    ],
    galleryGrid: 'md:grid-cols-2',
    role: 'Full Stack Developer',
    timeline: '2 Months',
    tech: ['Next.js', 'Tailwind CSS', 'MDX', 'Vercel']
  },
  'healthtech': {
    title: 'HealthTech App',
    description: 'Implemented an accessible component library compliant with WCAG 2.1 AA standards.',
    longDescription: 'In the healthcare sector, accessibility is not just a feature—it is a requirement. I was brought in to audit and rebuild the core UI components of a patient portal. I established a comprehensive design system with strict contrast ratios, full keyboard navigability, and robust screen reader support. The new system was adopted across 4 different product teams.',
    images: [
      { type: 'image', url: 'https://picsum.photos/seed/health_landscape/1200/800', className: 'col-span-1 md:col-span-2 aspect-[16/9]' },
      { type: 'image', url: 'https://picsum.photos/seed/health_portrait/800/1200', className: 'col-span-1 aspect-[3/4]' },
      { type: 'image', url: 'https://picsum.photos/seed/health_square/800/800', className: 'col-span-1 aspect-square' },
      { type: 'image', url: 'https://picsum.photos/seed/health_wide/1200/500', className: 'col-span-1 md:col-span-2 aspect-[21/9]' },
    ],
    galleryGrid: 'md:grid-cols-3',
    role: 'Accessibility Consultant',
    timeline: '6 Months',
    tech: ['React', 'TypeScript', 'Jest', 'Storybook']
  }
};

const defaultData: AppData = {
  hero: {
    label: 'Digital Architect',
    scrollText: 'Scroll',
    title: 'I build digital experiences that convert.',
    subtitle: 'Senior Frontend Developer & CRO Specialist. I transform complex problems into elegant, high-performance web applications that drive business growth.',
    buttonText: 'View My Work',
    buttonLink: '#work',
    secondaryButtonText: 'Read My Process',
    secondaryButtonLink: '/process',
    media: { type: 'image', url: 'https://picsum.photos/seed/workspace/800/1000', className: '' },
    floatingText: 'AVAILABLE FOR\nNew Projects'
  },
  trust: {
    label: 'Trusted by innovative teams',
    title: 'Trusted by innovative teams',
    logos: ['ACME Corp', 'GlobalTech', 'Nexus', 'Stark'],
    quote: '"The attention to detail and focus on performance completely transformed our conversion rates. An absolute game-changer for our product."',
    authorName: 'Sarah Jenkins',
    authorRole: 'VP of Product, TechFlow',
    authorImage: 'https://picsum.photos/seed/portrait/100/100'
  },
  featuredWork: {
    label: 'Featured Work',
    title: 'Featured Work'
  },
  pageTitle: {
    title: '`GWAPITO` PORTFOLIO',
    logo: ''
  },
  about: {
    label: 'ABOUT ME',
    title: 'About Me',
    content: ['I am a passionate developer with a keen eye for design and a focus on performance.'],
    image: '',
    floatingText: 'BASED IN\nEarth, Digital Space'
  },
  process: {
    label: 'How I Work',
    title: 'My Process',
    subtitle: 'I follow a user-centered design process, starting with research and ending with a polished, accessible product.',
    steps: [],
    media: []
  },
  contact: {
    label: 'Connect',
    title: 'Get in Touch',
    subtitle: 'I am always open to discussing new projects, creative ideas or opportunities to be part of your visions.',
    email: 'francisestologa@gmail.com',
    address: 'Manila, Philippines',
    socials: [],
    media: []
  },
  theme: {
    primaryColor: '#10b981', // emerald-500
    cursorColor: '#10b981',
    backgroundColor: '#09090b', // zinc-950
    headerColor: '#09090b', // zinc-950
    footerColor: '#09090b', // zinc-950
    animationSpeed: 3,
    defaultMode: 'dark'
  },
  reviews: {
    enabled: true,
    list: []
  },
  projects: defaultProjects,
  projectOrder: ['fintech', 'ecommerce', 'saas', 'healthtech'],
  cloudinary: {
    cloudName: '',
    uploadPreset: ''
  }
};

export type NotificationType = 'success' | 'error' | 'info';

type AppDataContextType = {
  isAdmin: boolean;
  isAuthReady: boolean;
  login: () => Promise<boolean>;
  logout: () => void;
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  updateProject: (id: string, project: ProjectData) => void;
  addProject: (id: string, project: ProjectData) => void;
  deleteProject: (id: string) => void;
  reorderProjects: (newOrder: string[]) => void;
  addReview: (review: Omit<Review, 'id' | 'date'>) => void;
  notification: { message: string, type: NotificationType } | null;
  showNotification: (message: string, type: NotificationType) => void;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);
  const [data, setData] = useState<AppData>(defaultData);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection() {
      if (!isConfigValid || !db) return;
      try {
        await getDocFromServer(doc(db, 'settings', 'main'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Track auth state
  useEffect(() => {
    if (!isConfigValid || !auth) {
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthReady(true);
      if (user) {
        if (user.email === 'francisestologa@gmail.com' && user.emailVerified) {
          setIsAdmin(true);
          localStorage.setItem('portfolio_admin', 'true');
        } else {
          setIsAdmin(false);
          localStorage.removeItem('portfolio_admin');
          showNotification(`Unauthorized user: ${user.email}. Please use the admin email.`, 'error');
        }
      } else {
        setIsAdmin(false);
        localStorage.removeItem('portfolio_admin');
      }
    });
    return () => unsubscribe();
  }, []);

  // Load data from Firestore
  useEffect(() => {
    if (!isAuthReady || !isConfigValid || !db) {
      if (isAuthReady) setIsDataLoaded(true);
      return;
    }

    const settingsRef = doc(db, 'settings', 'main');
    const projectsRef = collection(db, 'projects');
    const reviewsRef = collection(db, 'reviews');

    // Sync settings
    const unsubSettings = onSnapshot(settingsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data();
        setData(prev => {
          const newState = { ...prev, ...settings };
          // Special handling for reviews to preserve the list
          if (settings.reviews) {
            newState.reviews = {
              ...prev.reviews,
              ...settings.reviews
            };
          }
          return newState;
        });
      } else if (isAdmin) {
        // Seed settings if they don't exist and user is admin
        const { projects, reviews, ...settings } = defaultData;
        try {
          await setDoc(settingsRef, settings);
          showNotification('Initial settings seeded to Firestore', 'info');
        } catch (error) {
          console.error('Failed to seed settings', error);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/main'));

    // Sync projects
    const unsubProjects = onSnapshot(projectsRef, async (snapshot) => {
      if (snapshot.empty && isAdmin) {
        // Seed projects if they don't exist and user is admin
        try {
          const batch = writeBatch(db);
          Object.entries(defaultData.projects).forEach(([id, project]) => {
            batch.set(doc(db, 'projects', id), project);
          });
          await batch.commit();
          showNotification('Initial projects seeded to Firestore', 'info');
        } catch (error) {
          console.error('Failed to seed projects', error);
        }
      } else {
        const projects: Record<string, ProjectData> = {};
        snapshot.docs.forEach(doc => {
          projects[doc.id] = doc.data() as ProjectData;
        });
        setData(prev => ({ ...prev, projects: { ...prev.projects, ...projects } }));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'projects'));

    // Sync reviews
    const unsubReviews = onSnapshot(query(reviewsRef, orderBy('date', 'desc')), (snapshot) => {
      const reviews: Review[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setData(prev => ({ ...prev, reviews: { ...prev.reviews, list: reviews } }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'reviews'));

    setIsDataLoaded(true);

    return () => {
      unsubSettings();
      unsubProjects();
      unsubReviews();
    };
  }, [isAuthReady]);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  const login = async () => {
    if (!isConfigValid || !auth) {
      showNotification('Firebase configuration is missing. Please set it in the Settings menu.', 'error');
      return false;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Auth state listener will handle isAdmin setting
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (error.code === 'auth/unauthorized-domain') {
        showNotification('Unauthorized Domain: Please add this URL to your Firebase Console authorized domains.', 'error');
        console.error('ACTION REQUIRED: Add this domain to Firebase Console > Authentication > Settings > Authorized domains:', window.location.hostname);
      } else if (error.code === 'auth/popup-closed-by-user') {
        showNotification('Login cancelled: Popup was closed.', 'info');
      } else {
        showNotification(`Login failed: ${error.message || 'Unknown error'}`, 'error');
      }
      return false;
    }
  };

  const logout = async () => {
    if (!isConfigValid || !auth) {
      setIsAdmin(false);
      localStorage.removeItem('portfolio_admin');
      return;
    }
    try {
      await signOut(auth);
      setIsAdmin(false);
      localStorage.removeItem('portfolio_admin');
      showNotification('Logged out', 'info');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const updateData = async (newData: Partial<AppData>) => {
    if (!isAdmin) return;
    
    const batch = writeBatch(db);
    const settingsRef = doc(db, 'settings', 'main');
    const { projects, reviews, ...settingsToSave } = { ...data, ...newData };
    
    // If reviews.enabled is being updated, include it in settingsToSave
    if (newData.reviews && typeof newData.reviews.enabled === 'boolean') {
      (settingsToSave as any).reviews = { enabled: newData.reviews.enabled };
    }
    
    batch.set(settingsRef, settingsToSave, { merge: true });

    // Handle reviews list if present
    if (newData.reviews && newData.reviews.list) {
      const currentReviewIds = data.reviews.list.map(r => r.id);
      const newReviewIds = newData.reviews.list.map(r => r.id);
      
      const deletedIds = currentReviewIds.filter(id => !newReviewIds.includes(id));
      
      deletedIds.forEach(id => {
        batch.delete(doc(db, 'reviews', id));
      });
      
      newData.reviews.list.forEach(review => {
        batch.set(doc(db, 'reviews', review.id), review);
      });
    }
    
    try {
      await batch.commit();
      showNotification('Settings saved to cloud', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/main');
    }
  };

  const updateProject = async (id: string, project: ProjectData) => {
    if (!isAdmin) return;
    
    const projectRef = doc(db, 'projects', id);
    try {
      await setDoc(projectRef, project);
      showNotification('Project updated in cloud', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${id}`);
    }
  };

  const addProject = async (id: string, project: ProjectData) => {
    if (!isAdmin) return;
    
    const projectRef = doc(db, 'projects', id);
    const settingsRef = doc(db, 'settings', 'main');
    
    try {
      const batch = writeBatch(db);
      batch.set(projectRef, project);
      batch.set(settingsRef, { projectOrder: [...data.projectOrder, id] }, { merge: true });
      await batch.commit();
      showNotification('Project added to cloud', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'projects');
    }
  };

  const deleteProject = async (id: string) => {
    if (!isAdmin) return;
    
    const projectRef = doc(db, 'projects', id);
    const settingsRef = doc(db, 'settings', 'main');
    
    try {
      const batch = writeBatch(db);
      batch.delete(projectRef);
      batch.set(settingsRef, { projectOrder: data.projectOrder.filter(pId => pId !== id) }, { merge: true });
      await batch.commit();
      showNotification('Project deleted from cloud', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${id}`);
    }
  };

  const reorderProjects = async (newOrder: string[]) => {
    if (!isAdmin) return;
    
    const settingsRef = doc(db, 'settings', 'main');
    try {
      await setDoc(settingsRef, { projectOrder: newOrder }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/main');
    }
  };

  const addReview = async (review: Omit<Review, 'id' | 'date'>) => {
    const id = Date.now().toString();
    const date = new Date().toISOString().split('T')[0];
    const reviewRef = doc(db, 'reviews', id);
    
    try {
      await setDoc(reviewRef, { ...review, id, date });
      showNotification('Review submitted successfully!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reviews/${id}`);
    }
  };

  return (
    <AppDataContext.Provider value={{ 
      isAdmin, isAuthReady, login, logout, data, updateData, 
      updateProject, addProject, deleteProject, reorderProjects,
      addReview,
      notification, showNotification
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
