import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from "react-router-dom";
import { useAppData, ProjectData, MediaItem } from "../context/AppDataContext";
import { storage } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { isSocialVideo } from "../utils/embed";
import { SocialThumbnail } from "../components/SocialThumbnail";
import {
  Shield,
  Eye,
  EyeOff,
  LogOut,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  Video,
  Upload,
  Layout,
  Type,
  Briefcase,
  User,
  Settings,
  MessageSquare,
  Mail,
  Star,
  GripVertical,
  Search,
  Filter,
  Cloud,
  Navigation,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Play,
  Check
} from "lucide-react";

type Tab = 'hero' | 'trust' | 'featured' | 'about' | 'process' | 'contact' | 'pageTitle' | 'reviews' | 'theme' | 'navigation' | 'security';

function TechnologiesInput({
  value,
  onChange,
  className
}: {
  value: string[];
  onChange: (tech: string[]) => void;
  className?: string;
}) {
  const [text, setText] = useState(() => (value || []).join(', '));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      const currentParsed = text.split(',').map(t => t.trim()).filter(Boolean);
      const incoming = value || [];
      if (JSON.stringify(currentParsed) !== JSON.stringify(incoming)) {
        setText(incoming.join(', '));
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);
    const parsed = newText.split(',').map(t => t.trim()).filter(Boolean);
    onChange(parsed);
  };

  const parsedTags = text.split(',').map(t => t.trim()).filter(Boolean);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={text}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="e.g. React, Tailwind CSS, TypeScript, Next.js"
        className={className}
      />
      {parsedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {parsedTags.map((tag, i) => (
            <span key={i} className="px-2.5 py-1 bg-zinc-900 text-zinc-300 text-xs rounded-md border border-zinc-800 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] opacity-80" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ParagraphsInput({
  value,
  onChange,
  className
}: {
  value: string[];
  onChange: (content: string[]) => void;
  className?: string;
}) {
  const [text, setText] = useState(() => (value || []).join('\n\n'));

  useEffect(() => {
    const currentParsed = text.split('\n\n').filter(Boolean);
    const incoming = value || [];
    if (JSON.stringify(currentParsed) !== JSON.stringify(incoming)) {
      setText(incoming.join('\n\n'));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    const parsed = newText.split('\n\n').filter(Boolean);
    onChange(parsed);
  };

  return (
    <textarea
      value={text}
      onChange={handleChange}
      className={className}
    />
  );
}

function DropZone({ 
  onDropFile, 
  children,
  className = ""
}: { 
  onDropFile: (file: File) => void, 
  children: React.ReactNode,
  className?: string
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFile(e.dataTransfer.files[0]);
    }
  };
  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`transition-all rounded-xl ${isDragOver ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-zinc-950 bg-[var(--color-primary)]/10' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin, isAuthReady, logout, data, updateData, updateProject, addProject, deleteProject, reorderProjects, showNotification } = useAppData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('hero');
  const [showCloudinaryConfig, setShowCloudinaryConfig] = useState(false);
  const [draggedProjectIndex, setDraggedProjectIndex] = useState<number | null>(null);
  const [draggedMediaIndex, setDraggedMediaIndex] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isTestingCloudinary, setIsTestingCloudinary] = useState(false);
  const [cloudinaryForm, setCloudinaryForm] = useState({
    cloudName: data.cloudinary?.cloudName || '',
    uploadPreset: data.cloudinary?.uploadPreset || ''
  });
  const [videoSizeModal, setVideoSizeModal] = useState<{
    isOpen: boolean;
    file: File | null;
    target: { section: string; index?: number; isSecond?: boolean } | null;
    isError: boolean;
    errorMessage?: string;
  }>({
    isOpen: false,
    file: null,
    target: null,
    isError: false
  });
  const [cloudinaryTestResult, setCloudinaryTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync with data changes
  useEffect(() => {
    if (data.cloudinary) {
      setCloudinaryForm({
        cloudName: data.cloudinary.cloudName || '',
        uploadPreset: data.cloudinary.uploadPreset || ''
      });
    }
  }, [data.cloudinary]);

  const testCloudinary = async () => {
    const cloudName = (cloudinaryForm.cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
    const uploadPreset = (cloudinaryForm.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();

    if (!cloudName || !uploadPreset) {
      setCloudinaryTestResult({
        success: false,
        message: 'Please enter both Cloud Name and Upload Preset first.'
      });
      return;
    }

    setIsTestingCloudinary(true);
    setCloudinaryTestResult(null);

    try {
      // Create a minimal 1x1 test image blob
      const base64Pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const res = await fetch(base64Pixel);
      const blob = await res.blob();
      const testFile = new File([blob], 'cloudinary-test.png', { type: 'image/png' });

      let testSuccess = false;
      let note = '';

      try {
        const formData = new FormData();
        formData.append('file', testFile);
        formData.append('upload_preset', uploadPreset);
        formData.append('resource_type', 'auto');

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: formData
        });

        const cloudData = await cloudRes.json();
        if (cloudRes.ok && (cloudData.secure_url || cloudData.url)) {
          testSuccess = true;
          note = 'Direct browser upload to Cloudinary verified successfully!';
        } else {
          throw new Error(cloudData.error?.message || `HTTP ${cloudRes.status}`);
        }
      } catch (directErr: any) {
        // Try server-side proxy
        const formData = new FormData();
        formData.append('file', testFile);
        formData.append('cloudName', cloudName);
        formData.append('uploadPreset', uploadPreset);
        formData.append('resourceType', 'auto');

        const proxyRes = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData
        });

        const proxyData = await proxyRes.json();
        if (proxyRes.ok && proxyData.url) {
          testSuccess = true;
          note = 'Verified via server proxy (bypasses browser CORS & chunking limits)!';
        } else {
          throw new Error(proxyData.error || directErr.message || 'Verification failed');
        }
      }

      if (testSuccess) {
        setCloudinaryTestResult({
          success: true,
          message: `Connection successful! ${note}`
        });
        showNotification('Cloudinary connection verified!', 'success');
      }
    } catch (err: any) {
      setCloudinaryTestResult({
        success: false,
        message: `Connection failed: ${err.message || 'Invalid Cloud Name or Upload Preset. Make sure your preset is set to "Unsigned" in Cloudinary settings.'}`
      });
      showNotification(`Cloudinary test failed: ${err.message}`, 'error');
    } finally {
      setIsTestingCloudinary(false);
    }
  };

  const saveCloudinarySettings = () => {
    updateData({
      cloudinary: {
        cloudName: cloudinaryForm.cloudName.trim(),
        uploadPreset: cloudinaryForm.uploadPreset.trim()
      }
    });
    setShowCloudinaryConfig(false);
    showNotification('Cloudinary settings saved!', 'success');
  };
  const [uploadTarget, setUploadTargetState] = useState<{
    section: 'project' | 'hero' | 'trust' | 'about' | 'process' | 'contact' | 'pageTitle' | 'process_modal';
    index?: number;
    isSecond?: boolean;
  } | null>(null);
  const uploadTargetRef = useRef<{
    section: 'project' | 'hero' | 'trust' | 'about' | 'process' | 'contact' | 'pageTitle' | 'process_modal';
    index?: number;
    isSecond?: boolean;
  } | null>(null);

  const setUploadTarget = (target: { section: 'project' | 'hero' | 'trust' | 'about' | 'process' | 'contact' | 'pageTitle' | 'process_modal', index?: number, isSecond?: boolean } | null) => {
    uploadTargetRef.current = target;
    setUploadTargetState(target);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [stepModal, setStepModal] = useState<{
    isOpen: boolean;
    data: any;
  }>({
    isOpen: false,
    data: { title: '', description: '', media: { url: '', type: 'image' } }
  });

  const confirmAction = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, onCancel });
  };
  
  // Local state for editing sections
  const [heroData, setHeroData] = useState(data.hero);
  const [trustData, setTrustData] = useState(data.trust);
  const [featuredWorkData, setFeaturedWorkData] = useState(data.featuredWork);
  const [aboutData, setAboutData] = useState({ ...data.about, experience: data.about.experience || [] });
  const [processData, setProcessData] = useState(data.process);
  const [contactData, setContactData] = useState(data.contact);
  const [pageTitleData, setPageTitleData] = useState(data.pageTitle);
  const [themeData, setThemeData] = useState(data.theme);
  const [navigationData, setNavigationData] = useState(data.navigation || { about: true, process: true, reviews: true, particles: true, loadingScreen: true, loadingGreetings: true });
  const [reviewsData, setReviewsData] = useState(data.reviews);
  const [reviewsSearchQuery, setReviewsSearchQuery] = useState('');
  const [reviewsSearchFilter, setReviewsSearchFilter] = useState<'all' | 'name' | 'role'>('all');

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      navigate("/admin/login");
    }
  }, [isAdmin, isAuthReady, navigate]);

  useEffect(() => {
    if (selectedProjectId) {
      setEditingProject(data.projects[selectedProjectId]);
    } else {
      setEditingProject(null);
    }
  }, [selectedProjectId, data.projects]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const hasUnsavedChanges = useMemo(() => {
    try {
      if (activeTab === 'hero') return JSON.stringify(heroData) !== JSON.stringify(data.hero);
      if (activeTab === 'trust') return JSON.stringify(trustData) !== JSON.stringify(data.trust);
      if (activeTab === 'featured') return JSON.stringify(featuredWorkData) !== JSON.stringify(data.featuredWork) || (selectedProjectId !== null && JSON.stringify(editingProject) !== JSON.stringify(data.projects[selectedProjectId]));
      if (activeTab === 'about') return JSON.stringify(aboutData) !== JSON.stringify(data.about);
      if (activeTab === 'process') return JSON.stringify(processData) !== JSON.stringify(data.process);
      if (activeTab === 'contact') return JSON.stringify(contactData) !== JSON.stringify(data.contact);
      if (activeTab === 'pageTitle') return JSON.stringify(pageTitleData) !== JSON.stringify(data.pageTitle);
      if (activeTab === 'theme') return JSON.stringify(themeData) !== JSON.stringify(data.theme);
      if (activeTab === 'navigation') return JSON.stringify(navigationData) !== JSON.stringify(data.navigation);
      if (activeTab === 'reviews') return JSON.stringify(reviewsData) !== JSON.stringify(data.reviews);
      return false;
    } catch (e) {
      return false;
    }
  }, [activeTab, heroData, trustData, featuredWorkData, aboutData, processData, contactData, pageTitleData, themeData, navigationData, reviewsData, editingProject, selectedProjectId, data]);

  if (!isAdmin) return null;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  const handleLogout = () => {
    if (isUploading) {
      if (!window.confirm("Media upload is in progress. Are you sure you want to log out and exit?")) {
        return;
      }
    }
    navigate("/");
    logout();
  };

  const handleSaveSection = (section: keyof typeof data, sectionData: any) => {
    // Deep clone to avoid mutating state directly
    const processedData = JSON.parse(JSON.stringify(sectionData));
    
    // Helper to process arrays
    const processArray = (arr: any[]) => {
      if (!arr) return arr;
      const newItems = arr.filter(item => item.isNew).map(item => { const { isNew, ...rest } = item; return rest; });
      const oldItems = arr.filter(item => !item.isNew);
      return [...oldItems, ...newItems];
    };

    // Process specific arrays based on section
    if (section === 'about' && processedData.experience) {
      processedData.experience = processArray(processedData.experience);
    } else if (section === 'process') {
      if (processedData.steps) processedData.steps = processArray(processedData.steps);
      if (processedData.media) processedData.media = processArray(processedData.media);
    } else if (section === 'reviews' && processedData.list) {
      processedData.list = processArray(processedData.list);
    } else if (section === 'contact') {
      if (processedData.media) processedData.media = processArray(processedData.media);
      if (processedData.socials) processedData.socials = processArray(processedData.socials);
    }

    if (section === 'about') {
      updateData({ [section]: processedData });
      setAboutData(processedData);
      showNotification('About Me section updated successfully!', 'success');
      return;
    }

    if (section === 'contact' && processedData.email !== data.contact.email) {
      updateData({ [section]: processedData });
      setContactData(processedData);
      showNotification('Contact email updated successfully!', 'success');
      return;
    }

    updateData({ [section]: processedData });
    
    // Also update the local state so the UI reflects the new order
    
    if (section === 'process') setProcessData(processedData);
    if (section === 'reviews') setReviewsData(processedData);
    if (section === 'contact') setContactData(processedData);

    showNotification(`${String(section).charAt(0).toUpperCase() + String(section).slice(1)} section updated successfully!`, 'success');
  };

  const handleSaveProject = () => {
    if (selectedProjectId && editingProject) {
      const processedProject = JSON.parse(JSON.stringify(editingProject));
      if (processedProject.images) {
        const newItems = processedProject.images.filter((item: any) => item.isNew).map((item: any) => { const { isNew, ...rest } = item; return rest; });
        const oldItems = processedProject.images.filter((item: any) => !item.isNew);
        processedProject.images = [...oldItems, ...newItems];
      }
      updateProject(selectedProjectId, processedProject);
      setEditingProject(processedProject);
      showNotification("Project updated successfully!", 'success');
    }
  };

  const deleteMediaFromServer = async (url: string) => {
    if (!url) return;
    
    if (url.startsWith('/uploads/')) {
      try {
        await fetch('/api/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });
      } catch (error) {
        console.error('Failed to delete media from server:', error);
      }
    } else if (url.includes('firebasestorage.googleapis.com') && storage) {
      try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
      } catch (error) {
        console.error('Failed to delete media from Firebase Storage:', error);
      }
    }
  };

  const handleAddProject = () => {
    const newId = `project-${Date.now()}`;
    const newProject: ProjectData = {
      title: "New Project",
      description: "Short description",
      longDescription: "About the project",
      role: "Role",
      timeline: "Timeline",
      tech: ["React", "Tailwind"],
      images: [],
      galleryGrid: "md:grid-cols-2"
    };
    addProject(newId, newProject);
    setSelectedProjectId(newId);
    showNotification("New project added!", 'success');
  };

  const handleDeleteProject = (id: string) => {
    confirmAction(
      "Delete Project",
      "Are you sure you want to delete this project? This action cannot be undone.",
      () => {
        const projectToDelete = data.projects[id];
        if (projectToDelete && projectToDelete.images) {
          projectToDelete.images.forEach(img => {
            if (img.url) deleteMediaFromServer(img.url);
          });
        }
        deleteProject(id);
        if (selectedProjectId === id) {
          setSelectedProjectId(null);
        }
        showNotification("Project deleted.", 'success');
      }
    );
  };

  const updateMedia = (index: number, field: keyof MediaItem, value: string) => {
    setEditingProject((prev) => {
      if (!prev) return prev;
      const newImages = [...prev.images];
      newImages[index] = { ...newImages[index], [field]: value };
      return { ...prev, images: newImages };
    });
  };

  const addMedia = () => {
    setEditingProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        images: [
          { type: "image", url: "", className: "w-full h-auto", isNew: true } as any,
          ...prev.images,
        ],
      };
    });
  };

  const removeMedia = (index: number) => {
    confirmAction(
      "Delete Media",
      "Are you sure you want to delete this media file?",
      () => {
        setEditingProject((prev) => {
          if (!prev) return prev;
          const newImages = [...prev.images];
          const removed = newImages.splice(index, 1)[0];
          if (removed && removed.url) {
            deleteMediaFromServer(removed.url);
          }
          return { ...prev, images: newImages };
        });
      }
    );
  };

  const handleReorderMedia = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || !editingProject) return;
    setEditingProject((prev) => {
      if (!prev) return prev;
      const newImages = [...prev.images];
      const [draggedItem] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, draggedItem);
      return { ...prev, images: newImages };
    });
  };

  const handleSetAsFirstMedia = (index: number) => {
    if (index === 0 || !editingProject) return;
    handleReorderMedia(index, 0);
    showNotification("Moved to 1st position (Project Page Initial Video/Cover)", 'success');
  };

  const handleUploadClick = (target: { section: 'project' | 'hero' | 'trust' | 'about' | 'process' | 'contact' | 'pageTitle' | 'process_modal', index?: number, isSecond?: boolean }) => {
    setUploadTarget(target);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
      
      const handleFocus = () => {
        window.removeEventListener('focus', handleFocus);
        setTimeout(() => {
          if (fileInputRef.current && fileInputRef.current.files?.length === 0) {
            setUploadTarget(null);
          }
        }, 500);
      };
      window.addEventListener('focus', handleFocus);
    }
  };

  const compressVideoFile = async (
    file: File,
    onProgress: (percent: number, status: string) => void
  ): Promise<File> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      const fileUrl = URL.createObjectURL(file);
      video.src = fileUrl;

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration || 10;
          let targetWidth = video.videoWidth || 1920;
          let targetHeight = video.videoHeight || 1080;

          // Downscale high res (4K) to 1080p for web
          if (targetWidth > 1920 || targetHeight > 1080) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * 1920) / targetWidth);
              targetWidth = 1920;
            } else {
              targetWidth = Math.round((targetWidth * 1080) / targetHeight);
              targetHeight = 1080;
            }
          }
          targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
          targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d', { alpha: false });

          if (!ctx) {
            URL.revokeObjectURL(fileUrl);
            return resolve(file);
          }

          const stream = canvas.captureStream(30);

          // Calculate bitrate to guarantee under 70MB (Cloudinary free tier is 100MB)
          const targetBytes = Math.min(65 * 1024 * 1024, (70 * 1024 * 1024));
          const calculatedBitrate = Math.max(1200000, Math.min(3800000, Math.floor((targetBytes * 8) / Math.max(duration, 5))));

          let mimeType = 'video/webm;codecs=vp9,opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm;codecs=vp8,opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'video/webm';
              if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/mp4';
              }
            }
          }

          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
            videoBitsPerSecond: calculatedBitrate
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            URL.revokeObjectURL(fileUrl);
            const compressedBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'video/mp4' });
            const extension = mediaRecorder.mimeType?.includes('webm') ? '.webm' : '.mp4';
            const newName = file.name.replace(/\.[^/.]+$/, "") + '_web' + extension;
            const compressedFile = new File([compressedBlob], newName, { type: compressedBlob.type });
            console.log(`Video compressed from ${(file.size / (1024 * 1024)).toFixed(1)}MB to ${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB`);
            resolve(compressedFile);
          };

          mediaRecorder.onerror = (err) => {
            console.warn("MediaRecorder error:", err);
            URL.revokeObjectURL(fileUrl);
            resolve(file);
          };

          mediaRecorder.start(200);
          try {
            if (Number.isFinite(video.duration) && video.duration > 0) {
              video.currentTime = 0;
            }
          } catch (seekErr) {
            console.warn("Could not seek video to 0:", seekErr);
          }
          await video.play();

          let animFrameId: number;
          const drawFrame = () => {
            if (video.paused || video.ended) return;
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            const current = video.currentTime;
            const currentProgress = (Number.isFinite(current) && Number.isFinite(duration) && duration > 0)
              ? Math.min(99, Math.round((current / duration) * 100))
              : 50;
            onProgress(currentProgress, `Optimizing video for Cloudinary (${currentProgress}%)...`);
            animFrameId = requestAnimationFrame(drawFrame);
          };
          drawFrame();

          video.onended = () => {
            cancelAnimationFrame(animFrameId);
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          };
        } catch (err) {
          console.warn("Video optimization error, fallback to original", err);
          URL.revokeObjectURL(fileUrl);
          resolve(file);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(fileUrl);
        resolve(file);
      };
    });
  };

  const performUpload = async (
    file: File,
    target: { section: string, index?: number, isSecond?: boolean },
    shouldCompressVideo: boolean = false
  ) => {
    setUploadProgress(0);
    setIsUploading(true);
    try {
      let fileToUpload = file;
      const isVideo = file.type.startsWith("video/") || !!file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i);
      
      // Perform video optimization if requested
      if (isVideo && shouldCompressVideo) {
        setUploadStatusText('Preparing video optimizer...');
        fileToUpload = await compressVideoFile(fileToUpload, (pct, status) => {
          setUploadProgress(pct);
          setUploadStatusText(status);
        });
      }

      // Auto-compress large images (> 9.5MB to be safe under Cloudinary's 10MB limit)
      if (!isVideo && file.size > 9.5 * 1024 * 1024) {
        try {
          fileToUpload = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const maxDim = 2560; // Max reasonable dimension
                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round(height * (maxDim / width));
                    width = maxDim;
                  } else {
                    width = Math.round(width * (maxDim / height));
                    height = maxDim;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                  if (blob) {
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
                  } else {
                    resolve(file);
                  }
                }, 'image/jpeg', 0.85);
              };
              img.onerror = () => resolve(file);
              img.src = e.target?.result as string;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
          });
        } catch(e) {
          console.warn("Failed to compress image, trying original", e);
        }
      }

      let url = "";
      const mediaType = isVideo ? "video" : "image";

      const cloudName = (data.cloudinary?.cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
      const uploadPreset = (data.cloudinary?.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim();

      if (!cloudName || !uploadPreset) {
        showNotification("Cloudinary credentials required. Please configure your Cloud Name and Unsigned Upload Preset in Storage Settings.", "error");
        setShowCloudinaryConfig(true);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatusText('');
        return;
      }

      const resourceType = isVideo ? 'video' : 'auto';

      // Direct client-to-Cloudinary chunked uploader (handles 400MB+ videos easily)
      const uploadDirectChunked = async (): Promise<string> => {
        const fileSize = fileToUpload.size;
        const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per chunk
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
        const uniqueId = `cl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

        console.log(`Starting direct Cloudinary chunked upload (${(fileSize / (1024 * 1024)).toFixed(1)} MB in ${totalChunks} chunks)`);

        let lastResult: any = null;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
          const chunkBlob = fileToUpload.slice(start, end + 1);

          let chunkSuccess = false;
          let attempt = 0;
          let lastErr: any = null;

          while (attempt < 3 && !chunkSuccess) {
            attempt++;
            try {
              const result = await new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append('file', chunkBlob, fileToUpload.name);
                formData.append('upload_preset', uploadPreset);
                formData.append('resource_type', resourceType);

                xhr.open('POST', endpoint);
                xhr.setRequestHeader('X-Unique-Upload-Id', uniqueId);
                xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                xhr.timeout = 180000; // 3 min timeout per chunk

                xhr.upload.onprogress = (e) => {
                  if (e.lengthComputable) {
                    const currentLoaded = start + e.loaded;
                    const percent = Math.min(99, Math.round((currentLoaded / fileSize) * 100));
                    const mbLoaded = (currentLoaded / (1024 * 1024)).toFixed(1);
                    const mbTotal = (fileSize / (1024 * 1024)).toFixed(1);
                    setUploadProgress(percent);
                    setUploadStatusText(`Uploading chunk ${i + 1}/${totalChunks} (${mbLoaded}MB / ${mbTotal}MB)`);
                  }
                };

                xhr.onload = () => {
                  if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                      const json = JSON.parse(xhr.responseText);
                      resolve(json);
                    } catch {
                      resolve({ done: false });
                    }
                  } else {
                    try {
                      const errJson = JSON.parse(xhr.responseText);
                      reject(new Error(errJson.error?.message || `Cloudinary rejected with HTTP ${xhr.status}`));
                    } catch {
                      reject(new Error(`Cloudinary returned HTTP status ${xhr.status}`));
                    }
                  }
                };

                xhr.onerror = () => reject(new Error(`Network error uploading chunk ${i + 1}`));
                xhr.ontimeout = () => reject(new Error(`Timeout uploading chunk ${i + 1}`));
                xhr.send(formData);
              });

              lastResult = result;
              chunkSuccess = true;
            } catch (err: any) {
              lastErr = err;
              console.warn(`Chunk ${i + 1}/${totalChunks} attempt ${attempt} failed:`, err);
              if (attempt < 3) {
                setUploadStatusText(`Retrying chunk ${i + 1}/${totalChunks} (attempt ${attempt + 1})...`);
                await new Promise((r) => setTimeout(r, 1500 * attempt));
              }
            }
          }

          if (!chunkSuccess) {
            throw new Error(lastErr?.message || `Failed to upload chunk ${i + 1}/${totalChunks} to Cloudinary`);
          }
        }

        setUploadProgress(100);
        setUploadStatusText('Processing media in Cloudinary...');

        if (lastResult && (lastResult.secure_url || lastResult.url)) {
          return lastResult.secure_url || lastResult.url;
        }

        throw new Error('Cloudinary processed chunks but did not return a secure URL.');
      };

      // Server proxy chunked fallback (in case browser has CORS or strict firewall)
      const uploadProxyChunked = async (): Promise<string> => {
        return new Promise((resolve, reject) => {
          setUploadStatusText('Streaming via server proxy to Cloudinary...');
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('cloudName', cloudName);
          formData.append('uploadPreset', uploadPreset);
          formData.append('resourceType', resourceType);

          xhr.open('POST', '/api/upload/cloudinary');
          xhr.timeout = 300000; // 5 min timeout for entire file transfer

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentComplete);
              const mbLoaded = (event.loaded / (1024 * 1024)).toFixed(1);
              const mbTotal = (event.total / (1024 * 1024)).toFixed(1);
              setUploadStatusText(`Streaming to Cloudinary (${mbLoaded}MB / ${mbTotal}MB)`);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                if (response.url) {
                  resolve(response.url);
                } else {
                  reject(new Error('No media URL in server proxy response'));
                }
              } catch {
                reject(new Error('Invalid response from Cloudinary server proxy'));
              }
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.error || `Server proxy returned HTTP ${xhr.status}`));
              } catch {
                reject(new Error(`Server proxy failed with HTTP ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Network error during Cloudinary proxy upload'));
          xhr.ontimeout = () => reject(new Error('Upload timed out during Cloudinary proxy upload'));
          xhr.send(formData);
        });
      };

      try {
        // Attempt direct chunked upload first (fastest, direct streaming)
        url = await uploadDirectChunked();
      } catch (directErr: any) {
        console.warn("Direct Cloudinary chunked upload failed, trying server-side chunked proxy...", directErr);
        try {
          // Attempt server-side chunked upload proxy
          url = await uploadProxyChunked();
        } catch (proxyErr: any) {
          console.error("Both direct and server-side Cloudinary uploads failed:", proxyErr);
          throw new Error(`Cloudinary upload failed: ${directErr.message || proxyErr.message}`);
        }
      }

      switch (target.section) {
        case 'project':
          if (target.index !== undefined) {
            if (target.isSecond) {
              const oldUrl = editingProject?.images[target.index]?.secondUrl;
              if (oldUrl) deleteMediaFromServer(oldUrl);
              updateMedia(target.index, "secondUrl", url);
            } else {
              const currentMedia = editingProject?.images[target.index];
              const oldUrl = currentMedia?.url;
              if (oldUrl) deleteMediaFromServer(oldUrl);
              updateMedia(target.index, "url", url);
              if (currentMedia?.type !== 'comparison') {
                updateMedia(target.index, "type", mediaType);
              }
            }
          }
          break;
        case 'hero':
          if (heroData.media.url) deleteMediaFromServer(heroData.media.url);
          setHeroData(prev => ({ ...prev, media: { ...prev.media, url, type: mediaType } }));
          break;
        case 'trust':
          if (trustData.authorImage) deleteMediaFromServer(trustData.authorImage);
          setTrustData(prev => ({ ...prev, authorImage: url }));
          break;
        case 'about':
          if (aboutData.image) deleteMediaFromServer(aboutData.image);
          setAboutData(prev => ({ ...prev, image: url }));
          break;
        case 'process':
          if (target.index !== undefined) {
            setProcessData(prev => {
              const newSteps = [...prev.steps];
              const oldUrl = newSteps[target.index]?.media?.url;
              if (oldUrl) deleteMediaFromServer(oldUrl);
              newSteps[target.index] = {
                ...newSteps[target.index], 
                media: { 
                  type: mediaType, 
                  url, 
                  className: newSteps[target.index]?.media?.className || '' 
                } 
              };
              return { ...prev, steps: newSteps };
            });
          }
          break;
        case 'contact':
          if (target.index !== undefined) {
            setContactData(prev => {
              const newMedia = [...prev.media];
              const oldUrl = newMedia[target.index]?.url;
              if (oldUrl) deleteMediaFromServer(oldUrl);
              newMedia[target.index] = { ...newMedia[target.index], url, type: mediaType };
              return { ...prev, media: newMedia };
            });
          }
          break;
        case 'process_modal':
          const oldModalUrl = stepModal.data?.media?.url;
          if (oldModalUrl) deleteMediaFromServer(oldModalUrl);
          setStepModal(prev => ({
            ...prev,
            data: { ...prev.data, media: { ...prev.data?.media, url, type: mediaType } }
          }));
          break;
        case 'pageTitle':
          if (pageTitleData.logo) deleteMediaFromServer(pageTitleData.logo);
          setPageTitleData(prev => ({ ...prev, logo: url }));
          break;
      }
      showNotification("Media uploaded successfully", "success");
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file. Please try again.";
      
      // If error is Cloudinary video file size limit (100MB free tier), open the optimization helper
      if (
        (errorMessage.toLowerCase().includes('limit for video') ||
        errorMessage.toLowerCase().includes('file size') ||
        errorMessage.toLowerCase().includes('104857600') ||
        errorMessage.toLowerCase().includes('exceeds allowed limit')) &&
        file
      ) {
        setVideoSizeModal({
          isOpen: true,
          file,
          target,
          isError: true,
          errorMessage
        });
      } else {
        showNotification(errorMessage, "error");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusText('');
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTargetRef.current;
    
    if (!file || !target) {
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    await processSelectedFile(file, target);
  };

  const handleDirectDrop = async (file: File, target: { section: 'project' | 'hero' | 'trust' | 'about' | 'process' | 'contact' | 'pageTitle' | 'process_modal', index?: number, isSecond?: boolean }) => {
    if (isUploading) {
      showNotification("Media upload is in progress.", "error");
      return;
    }
    setUploadTarget(target);
    await processSelectedFile(file, target);
  };

  const processSelectedFile = async (file: File, target: { section: 'project' | 'hero' | 'trust' | 'about' | 'process' | 'contact' | 'pageTitle' | 'process_modal', index?: number, isSecond?: boolean }) => {
    if (target.section === 'project' && target.index !== undefined) {
      const currentMedia = editingProject?.images[target.index];
      const isImage = file.type.startsWith('image/') || !!file.name.match(/\.(png|jpe?g|gif|svg|webp)$/i);

      if (currentMedia) {
        if (currentMedia.type === 'comparison' && !isImage) {
          showNotification("Please upload an image file for comparison.", "error");
          setUploadTarget(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      }
    }

    const isVideo = file.type.startsWith('video/') || !!file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i);

    // If a video is larger than 95MB, proactively offer web optimization to prevent Cloudinary's 100MB free cap failure
    if (isVideo && file.size > 95 * 1024 * 1024) {
      setVideoSizeModal({
        isOpen: true,
        file,
        target,
        isError: false
      });
      return;
    }

    let hasExistingMedia = false;
    switch (target.section) {
      case 'project':
        if (target.isSecond) {
          hasExistingMedia = !!(target.index !== undefined && editingProject?.images[target.index]?.secondUrl);
        } else {
          hasExistingMedia = !!(target.index !== undefined && editingProject?.images[target.index]?.url);
        }
        break;
      case 'hero':
        hasExistingMedia = !!heroData.media.url;
        break;
      case 'trust':
        hasExistingMedia = !!trustData.authorImage;
        break;
      case 'about':
        hasExistingMedia = !!aboutData.image;
        break;
      case 'process':
        hasExistingMedia = !!(target.index !== undefined && processData.steps[target.index]?.media?.url);
        break;
      case 'contact':
        hasExistingMedia = !!(target.index !== undefined && contactData.media[target.index]?.url);
        break;
      case 'process_modal':
        hasExistingMedia = !!stepModal.data?.media?.url;
        break;
      case 'pageTitle':
        hasExistingMedia = !!pageTitleData.logo;
        break;
    }

    if (hasExistingMedia) {
      confirmAction(
        "Replace Media",
        "Are you sure you want to replace this media? The existing file will be permanently deleted from online storage.",
        () => performUpload(file, target),
        () => {
          setUploadTarget(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      );
    } else {
      performUpload(file, target);
    }
  };

  const handleSaveActiveTab = () => {
    if (isUploading) {
      showNotification("Please wait for media upload to finish before saving.", "error");
      return;
    }
    switch (activeTab) {
      case 'hero': handleSaveSection('hero', heroData); break;
      case 'trust': handleSaveSection('trust', trustData); break;
      case 'featured': 
        if (selectedProjectId !== null) {
            handleSaveProject();
        } else {
            handleSaveSection('featuredWork', featuredWorkData);
        }
        break;
      case 'about': handleSaveSection('about', aboutData); break;
      case 'process': handleSaveSection('process', processData); break;
      case 'contact': handleSaveSection('contact', contactData); break;
      case 'pageTitle': handleSaveSection('pageTitle', pageTitleData); break;
      case 'theme': handleSaveSection('theme', themeData); break;
      case 'navigation': handleSaveSection('navigation', navigationData); break;
      case 'reviews': handleSaveSection('reviews', reviewsData); break;
    }
  };

  const renderTabs = () => {
    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
      { id: 'hero', label: 'Hero', icon: <Layout className="w-4 h-4" /> },
      { id: 'trust', label: 'Trust', icon: <Star className="w-4 h-4" /> },
      { id: 'featured', label: 'Featured Work', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'about', label: 'About', icon: <User className="w-4 h-4" /> },
      { id: 'process', label: 'Process', icon: <Settings className="w-4 h-4" /> },
      { id: 'contact', label: 'Contact', icon: <Mail className="w-4 h-4" /> },
      { id: 'pageTitle', label: 'Page Title', icon: <Type className="w-4 h-4" /> },
      { id: 'reviews', label: 'Reviews', icon: <MessageSquare className="w-4 h-4" /> },
      { id: 'theme', label: 'Theme', icon: <Settings className="w-4 h-4" /> },
      { id: 'navigation', label: 'Navigation', icon: <Navigation className="w-4 h-4" /> },
      { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    ];

    return (
      <div className="flex flex-nowrap overflow-x-auto gap-2 mb-8 border-b border-zinc-800 pb-4 no-scrollbar scroll-smooth">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (isUploading) {
                if (!window.confirm("Media upload is in progress. If you leave this tab, the upload might be interrupted or changes might be lost. Do you want to proceed?")) {
                  return;
                }
              }
              setActiveTab(tab.id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === tab.id 
                ? 'border' 
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
            style={activeTab === tab.id ? { backgroundColor: `${data.theme.primaryColor}1a`, color: data.theme.primaryColor, borderColor: `${data.theme.primaryColor}80` } : {}}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderHeroTab = () => (
    <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Hero Section</h2>
      </div>
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Label (e.g., Digital Architect)</label>
            <input type="text" value={heroData.label || ''} onChange={e => setHeroData({...heroData, label: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Floating Text (use newline to separate)</label>
            <textarea value={heroData.floatingText || ''} onChange={e => setHeroData({...heroData, floatingText: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[80px]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Title (use `accent` for accent color)</label>
          <input type="text" value={heroData.title} onChange={e => setHeroData({...heroData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Subtitle</label>
          <textarea value={heroData.subtitle} onChange={e => setHeroData({...heroData, subtitle: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[100px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Primary Button Text</label>
            <input type="text" value={heroData.buttonText} onChange={e => setHeroData({...heroData, buttonText: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Primary Button Link</label>
            <input type="text" value={heroData.buttonLink} onChange={e => setHeroData({...heroData, buttonLink: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Secondary Button Text</label>
            <input type="text" value={heroData.secondaryButtonText} onChange={e => setHeroData({...heroData, secondaryButtonText: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Secondary Button Link</label>
            <input type="text" value={heroData.secondaryButtonLink} onChange={e => setHeroData({...heroData, secondaryButtonLink: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
        </div>
        <div className="pt-4 border-t border-zinc-800">
          <h3 className="text-lg font-medium mb-4">Hero Media</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Media</label>
              <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'hero' })}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => handleUploadClick({ section: 'hero' })} disabled={uploadTarget?.section === 'hero'} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium">
                  {uploadTarget?.section === 'hero' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                      <span className="text-xs font-mono">{uploadProgress}%</span>
                    </div>
                  ) : <Upload className="w-5 h-5" />}
                  Upload File
                </button>
                <div className="flex items-center text-zinc-500 text-sm font-medium">OR</div>
                <input type="text" value={heroData.media.url} onChange={e => setHeroData({...heroData, media: {...heroData.media, url: e.target.value}})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="Paste external URL..." />
                {heroData.media.url && (
                  <button 
                    onClick={() => confirmAction(
                      "Delete Hero Media",
                      "Are you sure you want to permanently delete this hero media?",
                      () => {
                        deleteMediaFromServer(heroData.media.url);
                        setHeroData({...heroData, media: {...heroData.media, url: ''}});
                      }
                    )}
                    className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </DropZone>
          </div>
          <div className="w-32">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Type</label>
              <select value={heroData.media.type} onChange={e => setHeroData({...heroData, media: {...heroData.media, type: e.target.value as 'image'|'video'}})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]">
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrustTab = () => (
    <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Trust Section</h2>
      </div>
      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Label</label>
          <input type="text" value={trustData.label || ''} onChange={e => setTrustData({...trustData, label: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Title (use `accent` for accent color)</label>
          <input type="text" value={trustData.title} onChange={e => setTrustData({...trustData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Quote</label>
          <textarea value={trustData.quote} onChange={e => setTrustData({...trustData, quote: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[100px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Author Name</label>
            <input type="text" value={trustData.authorName} onChange={e => setTrustData({...trustData, authorName: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Author Role</label>
            <input type="text" value={trustData.authorRole} onChange={e => setTrustData({...trustData, authorRole: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Author Image</label>
          <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'trust' })}>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => handleUploadClick({ section: 'trust' })} disabled={uploadTarget?.section === 'trust'} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium">
              {uploadTarget?.section === 'trust' ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-xs font-mono">{uploadProgress}%</span>
                </div>
              ) : <Upload className="w-5 h-5" />}
              Upload File
            </button>
            <div className="flex items-center text-zinc-500 text-sm font-medium">OR</div>
            <input type="text" value={trustData.authorImage} onChange={e => setTrustData({...trustData, authorImage: e.target.value})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="Paste external URL..." />
            {trustData.authorImage && (
              <button 
                onClick={() => confirmAction(
                  "Delete Author Image",
                  "Are you sure you want to permanently delete this author image?",
                  () => {
                    deleteMediaFromServer(trustData.authorImage);
                    setTrustData({...trustData, authorImage: ''});
                  }
                )}
                className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          </DropZone>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Logos</label>
          <div className="space-y-4">
            {trustData.logos.map((logo, index) => {
              const isObj = typeof logo === 'object';
              const image = isObj ? logo.image : logo;
              const link = isObj ? logo.link || '' : '';
              return (
                <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <input 
                      type="text" 
                      value={image} 
                      onChange={e => {
                        const newLogos = [...trustData.logos];
                        newLogos[index] = { image: e.target.value, link };
                        setTrustData({...trustData, logos: newLogos});
                      }} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] text-sm" 
                      placeholder="Logo Image URL or Text" 
                    />
                    <input 
                      type="text" 
                      value={link} 
                      onChange={e => {
                        const newLogos = [...trustData.logos];
                        newLogos[index] = { image, link: e.target.value };
                        setTrustData({...trustData, logos: newLogos});
                      }} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] text-sm" 
                      placeholder="Optional Link URL (e.g., https://example.com)" 
                    />
                  </div>
                  <button 
                    onClick={() => confirmAction(
                      "Delete Logo",
                      "Are you sure you want to permanently delete this logo?",
                      () => {
                        if (image) deleteMediaFromServer(image);
                        const newLogos = [...trustData.logos];
                        newLogos.splice(index, 1);
                        setTrustData({...trustData, logos: newLogos});
                      }
                    )}
                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-900 rounded-lg transition-colors h-fit"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
            <button 
              onClick={() => setTrustData({...trustData, logos: [...trustData.logos, { image: '', link: '' }]})}
              className="w-full py-3 border-2 border-dashed border-zinc-800 text-zinc-500 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Logo
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeaturedTab = () => (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">Featured Work Section</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Label (use `accent` for accent color)</label>
          <input type="text" value={featuredWorkData.label || ''} onChange={e => setFeaturedWorkData({...featuredWorkData, label: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Section Title (use `accent` for accent color)</label>
          <input type="text" value={featuredWorkData.title} onChange={e => setFeaturedWorkData({...featuredWorkData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-400 uppercase tracking-wider text-sm">Projects</h2>
            <button onClick={() => {
              if (isUploading) {
                if (!window.confirm("Media upload is in progress. If you add a new project, you will switch to it and the upload might be interrupted or changes might be lost. Do you want to proceed?")) {
                  return;
                }
              }
              handleAddProject();
            }} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {(data.projectOrder || []).map((id, index) => (
              <div 
                key={id} 
                className={`flex items-center gap-2 ${draggedProjectIndex === index ? 'opacity-50' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDraggedProjectIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedProjectIndex === null || draggedProjectIndex === index) return;
                  const newOrder = [...(data.projectOrder || [])];
                  const draggedItem = newOrder[draggedProjectIndex];
                  newOrder.splice(draggedProjectIndex, 1);
                  newOrder.splice(index, 0, draggedItem);
                  reorderProjects(newOrder);
                  setDraggedProjectIndex(null);
                }}
                onDragEnd={() => setDraggedProjectIndex(null)}
              >
                <div className="cursor-grab active:cursor-grabbing p-2 text-zinc-500 hover:text-zinc-300">
                  <GripVertical className="w-4 h-4" />
                </div>
                <button
                  onClick={() => {
                    if (isUploading) {
                      if (!window.confirm("Media upload is in progress. If you switch projects, the upload might be interrupted or changes might be lost. Do you want to proceed?")) {
                        return;
                      }
                    }
                    setSelectedProjectId(id);
                  }}
                  className={`flex-1 text-left px-4 py-3 rounded-lg transition-colors border ${
                    selectedProjectId === id
                      ? ""
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  }`}
                  style={selectedProjectId === id ? { backgroundColor: `${data.theme.primaryColor}1a`, color: data.theme.primaryColor, borderColor: `${data.theme.primaryColor}80` } : {}}
                >
                  {data.projects[id]?.title || 'Unknown'}
                </button>
                <button onClick={() => handleDeleteProject(id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {editingProject ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <h2 className="text-2xl font-bold">Editing: {editingProject.title}</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Title (use `accent` for accent color)</label>
                  <input type="text" value={editingProject.title} onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Short Description (for home page) (use `accent` for accent color)</label>
                  <textarea value={editingProject.description} onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[80px]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">About the Project (use `accent` for accent color)</label>
                  <textarea value={editingProject.longDescription} onChange={(e) => setEditingProject({ ...editingProject, longDescription: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[120px]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
                    <input type="text" value={editingProject.role} onChange={(e) => setEditingProject({ ...editingProject, role: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Timeline</label>
                    <input type="text" value={editingProject.timeline} onChange={(e) => setEditingProject({ ...editingProject, timeline: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Technologies (comma separated)</label>
                  <TechnologiesInput 
                    value={editingProject.tech || []} 
                    onChange={(newTech) => setEditingProject({ ...editingProject, tech: newTech })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" 
                  />
                </div>

                <div className="pt-8 border-t border-zinc-800">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-bold">Media Files & Sequence</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        The <strong className="text-[var(--color-primary)] font-semibold">1st item (#1)</strong> is the initial video/media shown on the project page and 3D carousel.
                      </p>
                    </div>
                    <button onClick={addMedia} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors text-sm">
                      <Plus className="w-4 h-4" /> Add Media
                    </button>
                  </div>

                  {/* Draggable Media Sequence Strip */}
                  {editingProject.images.length > 0 && (
                    <div className="mb-6 p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-[var(--color-primary)]" />
                          <h4 className="text-sm font-bold text-zinc-100">
                            Draggable Carousel Order
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                            Live Connected
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Drag cards horizontally to reorder what video displays first.
                        </p>
                      </div>

                      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                        {editingProject.images.map((media, index) => (
                          <div
                            key={index}
                            draggable
                            onDragStart={(e) => {
                              setDraggedMediaIndex(index);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedMediaIndex !== null && draggedMediaIndex !== index) {
                                handleReorderMedia(draggedMediaIndex, index);
                                setDraggedMediaIndex(null);
                              }
                            }}
                            onDragEnd={() => setDraggedMediaIndex(null)}
                            className={`flex-shrink-0 w-36 sm:w-44 bg-zinc-900/90 border rounded-xl p-2.5 transition-all duration-200 flex flex-col group cursor-grab active:cursor-grabbing select-none relative ${
                              draggedMediaIndex === index
                                ? 'opacity-40 scale-95 border-dashed border-[var(--color-primary)]'
                                : index === 0
                                ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/30'
                                : 'border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                index === 0
                                  ? 'bg-[var(--color-primary)] text-zinc-950 font-extrabold'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                #{index + 1} {index === 0 && '★ 1st Video'}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReorderMedia(index, index - 1);
                                    }}
                                    title="Move left"
                                    className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {index < editingProject.images.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReorderMedia(index, index + 1);
                                    }}
                                    title="Move right"
                                    className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="w-full h-24 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center relative mb-2">
                              {media.type === "image" ? (
                                media.url ? (
                                  <img loading="lazy" src={media.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover pointer-events-none" />
                                ) : (
                                  <ImageIcon className="w-6 h-6 text-zinc-700" />
                                )
                              ) : media.url ? (
                                isSocialVideo(media.url) ? (
                                  <SocialThumbnail url={media.url} customThumbnail={media.thumbnailUrl || (media as any).poster} className="w-full h-full object-cover pointer-events-none" autoPlay={false} />
                                ) : (
                                  <video src={media.url} poster={media.thumbnailUrl || (media as any).poster} muted playsInline className="w-full h-full object-cover pointer-events-none" />
                                )
                              ) : (
                                <Video className="w-6 h-6 text-zinc-700" />
                              )}
                              {media.type === 'video' && (
                                <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex items-center gap-1 pointer-events-none">
                                  <Play className="w-2.5 h-2.5 fill-current" /> Video
                                </div>
                              )}
                            </div>

                            {index !== 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetAsFirstMedia(index);
                                }}
                                className="w-full mt-auto py-1 px-2 text-[10px] font-medium bg-zinc-800 hover:bg-[var(--color-primary)] hover:text-zinc-950 text-zinc-300 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Star className="w-3 h-3" /> Set as 1st Video
                              </button>
                            ) : (
                              <div className="w-full mt-auto py-1 px-2 text-[10px] font-bold text-center text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded border border-[var(--color-primary)]/20">
                                ✓ Active 1st Video
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {editingProject.images.map((media, index) => (
                      <div 
                        key={index} 
                        draggable
                        onDragStart={(e) => {
                          if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).closest('button')) {
                            e.preventDefault();
                            return;
                          }
                          setDraggedMediaIndex(index);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedMediaIndex !== null && draggedMediaIndex !== index) {
                            handleReorderMedia(draggedMediaIndex, index);
                            setDraggedMediaIndex(null);
                          }
                        }}
                        onDragEnd={() => setDraggedMediaIndex(null)}
                        className={`bg-zinc-950 border rounded-xl p-4 transition-all duration-200 ${
                          draggedMediaIndex === index
                            ? 'opacity-40 border-dashed border-[var(--color-primary)]'
                            : index === 0
                            ? 'border-[var(--color-primary)]/70 ring-1 ring-[var(--color-primary)]/20 shadow-lg'
                            : 'border-zinc-800'
                        }`}
                      >
                        {/* Reorder Header Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-900">
                          <div className="flex items-center gap-2">
                            <div className="cursor-grab active:cursor-grabbing p-1.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-900 transition-colors" title="Drag card to reorder">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                              index === 0 
                                ? 'bg-[var(--color-primary)] text-zinc-950 font-extrabold'
                                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                            }`}>
                              {index === 0 ? '★ 1st Video (Initial View on Project Page)' : `Media #${index + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetAsFirstMedia(index)}
                                className="px-2 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-950 bg-zinc-900 hover:bg-[var(--color-primary)] border border-zinc-800 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                title="Move this video to the first position"
                              >
                                <Star className="w-3 h-3" /> Set as 1st Video
                              </button>
                            )}
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleReorderMedia(index, index - 1)}
                                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {index < editingProject.images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleReorderMedia(index, index + 1)}
                                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => removeMedia(index)} 
                              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors border border-red-500/20 ml-1 cursor-pointer" 
                              title="Delete media"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          <div className="w-full md:w-32 h-32 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800 flex items-center justify-center">
                            {media.type === "image" ? (
                              media.url ? <img loading="lazy" src={media.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-zinc-700" />
                            ) : media.url ? (
                              isSocialVideo(media.url) ? (
                                <SocialThumbnail url={media.url} customThumbnail={media.thumbnailUrl || (media as any).poster} className="w-full h-full object-cover" />
                              ) : (
                                <video src={media.url} poster={media.thumbnailUrl || (media as any).poster} autoPlay muted loop playsInline className="w-full h-full object-contain" />
                              )
                            ) : (
                              <Video className="w-8 h-8 text-zinc-700" />
                            )}
                          </div>

                          <div className="flex-1 space-y-4 w-full">
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Type</label>
                                <select 
                                  value={media.type} 
                                  onChange={(e) => updateMedia(index, "type", e.target.value)} 
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]"
                                >
                                  <option value="image">Image</option>
                                  <option value="video">Video</option>
                                  <option value="comparison">Before/After Comparison</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-zinc-500 mb-1">
                                {media.type === 'comparison' ? 'First Image (Before)' : 'Media Source'}
                              </label>
                              <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'project', index })}>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <button onClick={() => handleUploadClick({ section: 'project', index })} disabled={uploadTarget?.section === 'project' && uploadTarget?.index === index && !uploadTarget?.isSecond} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium">
                                  {uploadTarget?.section === 'project' && uploadTarget?.index === index && !uploadTarget?.isSecond ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                                      <span className="text-xs font-mono">{uploadProgress}%</span>
                                    </div>
                                  ) : <Upload className="w-5 h-5" />}
                                  Upload File
                                </button>
                                <div className="flex items-center text-zinc-500 text-xs font-medium">OR</div>
                                <input type="text" value={media.url} onChange={(e) => {
                                  const url = e.target.value;
                                  updateMedia(index, "url", url);
                                  if (media.type !== 'comparison') {
                                    const isVideo = url.match(/\.(mp4|webm|ogg|mov|mkv|avi|m4v)$/i) || url.includes('video') || isSocialVideo(url);
                                    updateMedia(index, "type", isVideo ? "video" : "image");
                                  }
                                }} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="Paste external URL..." />
                              </div>
                              </DropZone>
                            </div>

                            {media.type === 'video' && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-medium text-zinc-400">
                                    Video Thumbnail / Poster <span className="text-zinc-500 text-[11px]">(Auto-detected for Google Drive & YouTube, or custom)</span>
                                  </label>
                                  {media.thumbnailUrl && (
                                    <button 
                                      type="button" 
                                      onClick={() => updateMedia(index, "thumbnailUrl", "")} 
                                      className="text-[10px] text-zinc-500 hover:text-red-400"
                                    >
                                      Reset to Auto
                                    </button>
                                  )}
                                </div>
                                <input 
                                  type="text" 
                                  value={media.thumbnailUrl || ''} 
                                  onChange={(e) => updateMedia(index, "thumbnailUrl", e.target.value)} 
                                  placeholder={media.url?.includes('drive.google.com') ? "Auto: Google Drive HD Thumbnail" : "Optional custom thumbnail URL..."} 
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] placeholder:text-zinc-600" 
                                />
                              </div>
                            )}

                            {media.type === 'comparison' && (
                              <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Second Image (After)</label>
                                <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'project', index, isSecond: true })}>
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <button onClick={() => handleUploadClick({ section: 'project', index, isSecond: true })} disabled={uploadTarget?.section === 'project' && uploadTarget?.index === index && uploadTarget?.isSecond} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium">
                                    {uploadTarget?.section === 'project' && uploadTarget?.index === index && uploadTarget?.isSecond ? (
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                                        <span className="text-xs font-mono">{uploadProgress}%</span>
                                      </div>
                                    ) : <Upload className="w-5 h-5" />}
                                    Upload File
                                  </button>
                                  <div className="flex items-center text-zinc-500 text-xs font-medium">OR</div>
                                  <input type="text" value={media.secondUrl || ''} onChange={(e) => updateMedia(index, "secondUrl", e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="Paste external URL..." />
                                </div>
                                </DropZone>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {editingProject.images.length === 0 && (
                      <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">No media files added yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
              Select a project from the sidebar to edit its details and media.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAboutTab = () => (
    <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">About Section</h2>
      </div>
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Label (e.g., ABOUT ME) (use `accent` for accent color)</label>
            <input type="text" value={aboutData.label || ''} onChange={e => setAboutData({...aboutData, label: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Floating Text (use newline to separate) (use `accent` for accent color)</label>
            <textarea value={aboutData.floatingText || ''} onChange={e => setAboutData({...aboutData, floatingText: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[80px]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Title (use `accent` for accent color)</label>
          <input type="text" value={aboutData.title} onChange={e => setAboutData({...aboutData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Content (Paragraphs separated by newlines) (use `accent` for accent color)</label>
          <ParagraphsInput 
            value={aboutData.content || []} 
            onChange={newContent => setAboutData({ ...aboutData, content: newContent })} 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[200px]" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Image</label>
          <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'about' })}>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => handleUploadClick({ section: 'about' })} disabled={uploadTarget?.section === 'about'} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium">
              {uploadTarget?.section === 'about' ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-xs font-mono">{uploadProgress}%</span>
                </div>
              ) : <Upload className="w-5 h-5" />}
              Upload File
            </button>
            <div className="flex items-center text-zinc-500 text-sm font-medium">OR</div>
            <input type="text" value={aboutData.image} onChange={e => setAboutData({...aboutData, image: e.target.value})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="Paste external URL..." />
            {aboutData.image && (
              <button 
                onClick={() => confirmAction(
                  "Delete About Image",
                  "Are you sure you want to permanently delete this image?",
                  () => {
                    deleteMediaFromServer(aboutData.image);
                    setAboutData({...aboutData, image: ''});
                  }
                )}
                className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          </DropZone>
        </div>

        <div className="pt-6 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold">Experience Timeline</h3>
            <button onClick={() => setAboutData({...aboutData, experience: [{ id: Date.now().toString(), year: new Date().getFullYear().toString(), month: 'Jan', role: 'Role', company: 'Company', description: 'Description', isNew: true } as any, ...(aboutData.experience || [])]})} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors text-sm">
              <Plus className="w-4 h-4" /> Add Experience
            </button>
          </div>
          <div className="space-y-4">
            {(aboutData.experience || []).map((exp, index) => (
              <div key={exp.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                <button onClick={() => {
                  confirmAction("Delete Experience", "Are you sure you want to delete this experience record?", () => {
                    setAboutData({...aboutData, experience: aboutData.experience?.filter((_, i) => i !== index)});
                  });
                }} className="absolute top-4 right-4 text-red-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid gap-4 pr-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Year</label>
                      <input type="text" value={exp.year} onChange={e => {
                        setAboutData(prev => {
                          const newExp = [...(prev.experience || [])];
                          newExp[index] = { ...newExp[index], year: e.target.value };
                          return { ...prev, experience: newExp };
                        });
                      }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Month</label>
                      <input type="text" value={exp.month} onChange={e => {
                        setAboutData(prev => {
                          const newExp = [...(prev.experience || [])];
                          newExp[index] = { ...newExp[index], month: e.target.value };
                          return { ...prev, experience: newExp };
                        });
                      }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Role (use `accent` for accent color)</label>
                      <input type="text" value={exp.role} onChange={e => {
                        setAboutData(prev => {
                          const newExp = [...(prev.experience || [])];
                          newExp[index] = { ...newExp[index], role: e.target.value };
                          return { ...prev, experience: newExp };
                        });
                      }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Company (use `accent` for accent color)</label>
                      <input type="text" value={exp.company} onChange={e => {
                        setAboutData(prev => {
                          const newExp = [...(prev.experience || [])];
                          newExp[index] = { ...newExp[index], company: e.target.value };
                          return { ...prev, experience: newExp };
                        });
                      }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
                    <textarea value={exp.description} onChange={e => {
                      setAboutData(prev => {
                        const newExp = [...(prev.experience || [])];
                        newExp[index] = { ...newExp[index], description: e.target.value };
                        return { ...prev, experience: newExp };
                      });
                    }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[80px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProcessTab = () => (
    <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Process Section</h2>
      </div>
      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Label (use `accent` for accent color)</label>
          <input type="text" value={processData.label || ''} onChange={e => setProcessData({...processData, label: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Title (use `accent` for accent color)</label>
          <input type="text" value={processData.title} onChange={e => setProcessData({...processData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Subtitle (use `accent` for accent color)</label>
          <textarea value={processData.subtitle} onChange={e => setProcessData({...processData, subtitle: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[100px]" />
        </div>
        
        <div className="pt-6 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold">Steps</h3>
            <button onClick={() => {
              setStepModal({ isOpen: true, data: { title: '', description: '', media: { url: '', type: 'image' } } });
            }} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors text-sm">
              <Plus className="w-4 h-4" /> Add Step
            </button>
          </div>
          <div className="space-y-4">
            {processData.steps.map((step, index) => (
              <div key={index} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                <button onClick={() => {
                  confirmAction("Delete Step", "Are you sure you want to delete this step?", () => {
                    setProcessData({...processData, steps: processData.steps.filter((_, i) => i !== index)});
                  });
                }} className="absolute top-4 right-4 text-red-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid gap-4 pr-8">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Step Title (use `accent` for accent color)</label>
                    <input type="text" value={step.title} onChange={e => {
                      setProcessData(prev => {
                        const newSteps = [...prev.steps];
                        newSteps[index] = { ...newSteps[index], title: e.target.value };
                        return { ...prev, steps: newSteps };
                      });
                    }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Step Description (use `accent` for accent color)</label>
                    <textarea value={step.description} onChange={e => {
                      setProcessData(prev => {
                        const newSteps = [...prev.steps];
                        newSteps[index] = { ...newSteps[index], description: e.target.value };
                        return { ...prev, steps: newSteps };
                      });
                    }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[80px]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Step Media (Optional)</label>
                    <div className="flex flex-col gap-3">
                        <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'process', index })}>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => handleUploadClick({ section: 'process', index })} disabled={uploadTarget?.section === 'process' && uploadTarget?.index === index} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium text-sm">
                              {uploadTarget?.section === 'process' && uploadTarget?.index === index ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                                  <span className="font-mono">{uploadProgress}%</span>
                                </div>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  {step.media?.url ? 'Change Media' : 'Upload Media'}
                                </>
                              )}
                            </button>
                            <div className="flex items-center text-zinc-500 text-xs font-medium">OR</div>
                            <input type="text" value={step.media?.url || ''} onChange={e => {
                              setProcessData(prev => {
                                const newSteps = [...prev.steps];
                                const currentStep = { ...newSteps[index] };
                                if (!currentStep.media) currentStep.media = { type: 'image', url: '', className: '' };
                                currentStep.media = {
                                  ...currentStep.media,
                                  url: e.target.value,
                                  type: e.target.value.match(/\.(mp4|webm|ogg|mov|mkv|avi|m4v)$/i) ? 'video' : 'image'
                                };
                                newSteps[index] = currentStep;
                                return { ...prev, steps: newSteps };
                              });
                            }} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] text-sm" placeholder="Paste external URL..." />
                            
                            {step.media?.url && (
                                <button onClick={() => {
                                    confirmAction("Delete Media", "Remove media from this step?", () => {
                                        if (step.media?.url) deleteMediaFromServer(step.media.url);
                                        setProcessData(prev => {
                                          const newSteps = [...prev.steps];
                                          const currentStep = { ...newSteps[index] };
                                          delete currentStep.media;
                                          newSteps[index] = currentStep;
                                          return { ...prev, steps: newSteps };
                                        });
                                    });
                                }} className="text-red-500 hover:text-red-400 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        </DropZone>
                        {step.media?.url && (
                            <div className="w-full max-w-[200px] aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 mt-2">
                                {step.media.type === 'video' ? (
                                    isSocialVideo(step.media.url) ? (
                                        <SocialThumbnail url={step.media.url} className="w-full h-full object-cover opacity-60" />
                                    ) : (
                                        <video src={step.media.url} className="w-full h-full object-cover opacity-60" controls muted />
                                    )
                                ) : (
                                    <img loading="lazy" src={step.media.url} alt="Step preview" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                                )}
                            </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Contact Section</h2>
      </div>
      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Label (e.g., Connect) (use `accent` for accent color)</label>
          <input type="text" value={contactData.label || ''} onChange={e => setContactData({...contactData, label: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Title (use `accent` for accent color)</label>
          <input type="text" value={contactData.title} onChange={e => setContactData({...contactData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Subtitle (use `accent` for accent color)</label>
          <textarea value={contactData.subtitle} onChange={e => setContactData({...contactData, subtitle: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[100px]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address (Where forms will be sent)</label>
          <input type="email" value={contactData.email} onChange={e => setContactData({...contactData, email: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Address / Location (Displayed in Footer)</label>
          <input type="text" value={contactData.address || ''} onChange={e => setContactData({...contactData, address: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="e.g. Manila, Philippines" />
        </div>
        <div className="pt-6 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold">Social Links</h3>
            <button onClick={() => setContactData({...contactData, socials: [{ platform: 'Twitter', url: '', username: '', isNew: true } as any, ...(contactData.socials || [])]})} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors text-sm">
              <Plus className="w-4 h-4" /> Add Social
            </button>
          </div>
          <div className="space-y-4">
            {(contactData.socials || []).map((social, index) => (
              <div key={index} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                <button onClick={() => {
                  confirmAction("Delete Social Link", "Are you sure you want to delete this social link?", () => {
                    setContactData({...contactData, socials: contactData.socials.filter((_, i) => i !== index)});
                  });
                }} className="absolute top-4 right-4 text-red-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid gap-4 pr-8 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Platform</label>
                    <select value={social.platform} onChange={e => {
                      setContactData(prev => {
                        const newSocials = [...prev.socials];
                        newSocials[index] = { ...newSocials[index], platform: e.target.value as any };
                        return { ...prev, socials: newSocials };
                      });
                    }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]">
                      <option value="Twitter">Twitter / X</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="GitHub">GitHub</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Dribbble">Dribbble</option>
                      <option value="Behance">Behance</option>
                      <option value="Website">Website</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Username / Handle</label>
                    <input type="text" value={social.username || ''} onChange={e => {
                      setContactData(prev => {
                        const newSocials = [...prev.socials];
                        newSocials[index] = { ...newSocials[index], username: e.target.value };
                        return { ...prev, socials: newSocials };
                      });
                    }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="@username" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">URL</label>
                    <input type="text" value={social.url} onChange={e => {
                      setContactData(prev => {
                        const newSocials = [...prev.socials];
                        newSocials[index] = { ...newSocials[index], url: e.target.value };
                        return { ...prev, socials: newSocials };
                      });
                    }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="https://..." />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold">Media Files</h3>
            <button onClick={() => setContactData({...contactData, media: [{ type: 'image', url: '', className: 'w-full h-auto', isNew: true } as any, ...(contactData.media || [])]})} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors text-sm">
              <Plus className="w-4 h-4" /> Add Media
            </button>
          </div>
          <div className="space-y-4">
            {(contactData.media || []).map((media, index) => (
              <div key={index} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                <button onClick={() => {
                  const mediaToDelete = contactData.media[index];
                  confirmAction(
                    "Delete Media",
                    "Are you sure you want to permanently delete this media file?",
                    () => {
                      if (mediaToDelete && mediaToDelete.url) {
                        deleteMediaFromServer(mediaToDelete.url);
                      }
                      setContactData({...contactData, media: contactData.media.filter((_, i) => i !== index)});
                    }
                  );
                }} className="absolute top-4 right-4 text-red-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid gap-4 pr-8">
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Media Source</label>
                      <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'contact', index })}>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => handleUploadClick({ section: 'contact', index })} disabled={uploadTarget?.section === 'contact' && uploadTarget?.index === index} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium">
                          {uploadTarget?.section === 'contact' && uploadTarget?.index === index ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                              <span className="text-xs font-mono">{uploadProgress}%</span>
                            </div>
                          ) : <Upload className="w-5 h-5" />}
                          Upload File
                        </button>
                        <div className="flex items-center text-zinc-500 text-xs font-medium">OR</div>
                        <input type="text" value={media.url} onChange={e => {
                          setContactData(prev => {
                            const newMedia = [...prev.media];
                            newMedia[index] = { ...newMedia[index], url: e.target.value };
                            return { ...prev, media: newMedia };
                          });
                        }} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="Paste external URL..." />
                      </div>
                      </DropZone>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPageTitleTab = () => (
    <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Page Title & Logo</h2>
      </div>
      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Site Title (use `accent` for accent color)</label>
          <input type="text" value={pageTitleData.title} onChange={e => setPageTitleData({...pageTitleData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Logo</label>
          <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'pageTitle' })}>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => handleUploadClick({ section: 'pageTitle' })} disabled={uploadTarget?.section === 'pageTitle'} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium">
              {uploadTarget?.section === 'pageTitle' ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-xs font-mono">{uploadProgress}%</span>
                </div>
              ) : <Upload className="w-5 h-5" />}
              Upload File
            </button>
            <div className="flex items-center text-zinc-500 text-sm font-medium">OR</div>
            <input type="text" value={pageTitleData.logo || ''} onChange={e => setPageTitleData({...pageTitleData, logo: e.target.value})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="Paste external URL..." />
            {pageTitleData.logo && (
              <button 
                onClick={() => confirmAction(
                  "Delete Logo",
                  "Are you sure you want to permanently delete this logo?",
                  () => {
                    deleteMediaFromServer(pageTitleData.logo!);
                    setPageTitleData({...pageTitleData, logo: ''});
                  }
                )}
                className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          </DropZone>
        </div>
      </div>
    </div>
  );

  const renderThemeTab = () => (
    <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Theme Settings</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Primary Color (Hex)</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input type="color" value={themeData.primaryColor} onChange={e => setThemeData({...themeData, primaryColor: e.target.value})} className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0" />
            <input type="text" value={themeData.primaryColor} onChange={e => setThemeData({...themeData, primaryColor: e.target.value})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <p className="text-xs text-zinc-500 mt-2">Currently selected: <span className="font-mono px-1 py-0.5 rounded" style={{ backgroundColor: themeData.primaryColor, color: '#fff' }}>{themeData.primaryColor}</span></p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Cursor Color (Hex)</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input type="color" value={themeData.cursorColor} onChange={e => setThemeData({...themeData, cursorColor: e.target.value})} className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0" />
            <input type="text" value={themeData.cursorColor} onChange={e => setThemeData({...themeData, cursorColor: e.target.value})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Background Color (Hex)</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input type="color" value={themeData.backgroundColor} onChange={e => setThemeData({...themeData, backgroundColor: e.target.value})} className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0" />
            <input type="text" value={themeData.backgroundColor} onChange={e => setThemeData({...themeData, backgroundColor: e.target.value})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Header Color (Hex)</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input type="color" value={themeData.headerColor || '#09090b'} onChange={e => setThemeData({...themeData, headerColor: e.target.value})} className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0" />
            <input type="text" value={themeData.headerColor || '#09090b'} onChange={e => setThemeData({...themeData, headerColor: e.target.value})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Footer Color (Hex)</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input type="color" value={themeData.footerColor || '#09090b'} onChange={e => setThemeData({...themeData, footerColor: e.target.value})} className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0" />
            <input type="text" value={themeData.footerColor || '#09090b'} onChange={e => setThemeData({...themeData, footerColor: e.target.value})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Interactive Animations Speed</label>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <input 
              type="range" 
              min="1" 
              max="5" 
              step="1" 
              value={themeData.animationSpeed || 3} 
              onChange={e => setThemeData({...themeData, animationSpeed: parseInt(e.target.value)})} 
              className="flex-1 accent-[var(--color-primary)] h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
            />
            <span className="text-zinc-50 font-mono w-12 text-center">{themeData.animationSpeed || 3}x</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">1 = Slowest, 5 = Fastest. Default is 3x (Normal).</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Default Theme Mode</label>
          <select 
            value={themeData.defaultMode || 'dark'} 
            onChange={e => setThemeData({...themeData, defaultMode: e.target.value as 'light' | 'dark'})} 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="dark">Dark Mode</option>
            <option value="light">Light Mode</option>
          </select>
          <p className="text-xs text-zinc-500 mt-2">The theme mode visitors will see when they first visit your site.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Loading Screen Greeting</label>
          <input 
            type="text" 
            value={themeData.loadingText || 'ENJOY!'} 
            onChange={e => setThemeData({...themeData, loadingText: e.target.value})} 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="ENJOY!"
          />
          <p className="text-xs text-zinc-500 mt-2">The large greeting text shown right before the landing page appears.</p>
        </div>
      </div>
    </div>
  );

  const renderReviewsTab = () => {
    const filteredReviews = reviewsData.list.filter(review => {
      const query = reviewsSearchQuery.toLowerCase();
      if (!query) return true;
      
      if (reviewsSearchFilter === 'name') {
        return review.clientName.toLowerCase().includes(query);
      } else if (reviewsSearchFilter === 'role') {
        return review.clientRole.toLowerCase().includes(query);
      } else {
        return review.clientName.toLowerCase().includes(query) || 
               review.clientRole.toLowerCase().includes(query) ||
               review.content.toLowerCase().includes(query);
      }
    });

    return (
    <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Reviews Section</h2>
      </div>
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-zinc-400">Review Submissions Quota</label>
          <input 
            type="number" 
            min="0" 
            value={reviewsData.submissionLimit || 0} 
            onChange={e => setReviewsData({...reviewsData, submissionLimit: parseInt(e.target.value) || 0})} 
            className="w-24 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white" 
          />
          <span className="text-xs text-zinc-500">Set to 0 to lock the review form.</span>
        </div>
        
        <div className="pt-6 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold">Testimonials</h3>
            <div className="flex items-center gap-3">
              <Link to="/for-client" className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-zinc-950 font-bold hover:brightness-110 rounded-lg transition-all text-sm">
                <ArrowRight className="w-4 h-4" /> FOR CLIENT
              </Link>
              <button onClick={() => setReviewsData({...reviewsData, list: [{ id: Date.now().toString(), clientName: 'New Client', clientRole: 'Role', content: 'Review content', rating: 5, date: new Date().toISOString().split('T')[0], isNew: true } as any, ...reviewsData.list]})} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors text-sm">
                <Plus className="w-4 h-4" /> Add Review
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={reviewsSearchQuery}
                onChange={(e) => setReviewsSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                style={{ '--tw-ring-color': themeData.primaryColor } as React.CSSProperties}
              />
            </div>
            <div className="relative min-w-[160px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <select
                value={reviewsSearchFilter}
                onChange={(e) => setReviewsSearchFilter(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="role">Role/Company</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredReviews.map((review) => {
              const index = reviewsData.list.findIndex(r => r.id === review.id);
              return (
              <div key={review.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                <button onClick={() => {
                  confirmAction("Delete Review", "Are you sure you want to delete this review?", () => {
                    setReviewsData({...reviewsData, list: reviewsData.list.filter((_, i) => i !== index)});
                  });
                }} className="absolute top-4 right-4 text-red-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid gap-4 pr-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Client Name (use `accent` for accent color)</label>
                      <input type="text" value={review.clientName} onChange={e => {
                        setReviewsData(prev => {
                          const newList = [...prev.list];
                          newList[index] = { ...newList[index], clientName: e.target.value };
                          return { ...prev, list: newList };
                        });
                      }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Client Role (use `accent` for accent color)</label>
                      <input type="text" value={review.clientRole} onChange={e => {
                        setReviewsData(prev => {
                          const newList = [...prev.list];
                          newList[index] = { ...newList[index], clientRole: e.target.value };
                          return { ...prev, list: newList };
                        });
                      }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Date</label>
                      <input type="text" value={review.date || ''} onChange={e => {
                        setReviewsData(prev => {
                          const newList = [...prev.list];
                          newList[index] = { ...newList[index], date: e.target.value };
                          return { ...prev, list: newList };
                        });
                      }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Rating (1-5)</label>
                      <input type="number" min="1" max="5" value={review.rating} onChange={e => {
                        setReviewsData(prev => {
                          const newList = [...prev.list];
                          newList[index] = { ...newList[index], rating: Number(e.target.value) };
                          return { ...prev, list: newList };
                        });
                      }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Review Content (use `accent` for accent color)</label>
                    <textarea value={review.content} onChange={e => {
                      setReviewsData(prev => {
                        const newList = [...prev.list];
                        newList[index] = { ...newList[index], content: e.target.value };
                        return { ...prev, list: newList };
                      });
                    }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[80px]" />
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
  };

  const testCloudinaryConnection = async () => {
    // Function removed as per user request
  };

  const renderSecurityTab = () => (
    <div className="space-y-8">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-zinc-800">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" />
            Security Settings
          </h2>
        </div>
        
        <div className="space-y-6">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-emerald-400 font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Firebase Authentication Active
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Your account is secured with Google Sign-In. Only authorized administrators can access this dashboard.
            </p>
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-bold mb-4">Authorized Administrators</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">{data.contact.email}</p>
                    <p className="text-xs text-zinc-500">Primary Administrator (Owner)</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-500/20">
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const isCloudinaryConfigured = (data.cloudinary.cloudName && data.cloudinary.uploadPreset) || (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 lg:px-12 w-full mx-auto min-h-[90vh]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 border-b border-zinc-800 pb-6 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={() => setShowCloudinaryConfig(true)}
            className="group cursor-pointer transition-transform hover:scale-105"
            title="Click to configure Cloudinary Storage"
          >
            {isCloudinaryConfigured ? (
              <span className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                Cloudinary Active
                <Settings className="w-3 h-3 ml-0.5 opacity-60 group-hover:opacity-100" />
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors" title="Configure Cloudinary for permanent cloud media storage.">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                Temporary Local Storage
                <Settings className="w-3 h-3 ml-0.5 opacity-60 group-hover:opacity-100" />
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCloudinaryConfig(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-zinc-300 hover:text-white text-sm font-medium"
          >
            <Cloud className="w-4 h-4 text-emerald-400" /> Storage Settings
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-red-400 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Global Note about Accent Color */}
      <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-blue-400">
        <Type className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-bold">Pro Tip:</span> You can apply the accent color to any text field by wrapping the word in backticks. For example, <code className="bg-blue-500/20 px-1 rounded">`Digital` Architect</code> will render "Digital" in the accent color.
        </div>
      </div>

      {renderTabs()}

      <div className="mt-8">
        {activeTab === 'hero' && renderHeroTab()}
        {activeTab === 'trust' && renderTrustTab()}
        {activeTab === 'featured' && renderFeaturedTab()}
        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'process' && renderProcessTab()}
        {activeTab === 'contact' && renderContactTab()}
        {activeTab === 'pageTitle' && renderPageTitleTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
        {activeTab === 'theme' && renderThemeTab()}
        {activeTab === 'navigation' && (
          <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6">Navigation Visibility</h2>
            <p className="text-zinc-400 mb-6">Toggle the visibility of sections in the main navigation and footer.</p>
            <div className="space-y-4 max-w-md">
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <h3 className="font-semibold text-zinc-100">About Section</h3>
                  <p className="text-xs text-zinc-500">Show in header and footer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavigationData({ ...navigationData, about: !navigationData.about })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${navigationData.about ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${navigationData.about ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <h3 className="font-semibold text-zinc-100">Process Section</h3>
                  <p className="text-xs text-zinc-500">Show in header and footer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavigationData({ ...navigationData, process: !navigationData.process })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${navigationData.process ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${navigationData.process ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <h3 className="font-semibold text-zinc-100">Reviews Section</h3>
                  <p className="text-xs text-zinc-500">Show in header and footer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavigationData({ ...navigationData, reviews: !navigationData.reviews })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${navigationData.reviews ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${navigationData.reviews ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-100">Background Moving Particles</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      (navigationData.particles ?? true) 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {(navigationData.particles ?? true) ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Hide or unhide the animated floating particles in the background</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavigationData({ ...navigationData, particles: !(navigationData.particles ?? true) })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${(navigationData.particles ?? true) ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  aria-label="Toggle background particles"
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${(navigationData.particles ?? true) ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-100">Loading Screen (When Reload)</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      (navigationData.loadingScreen ?? true) 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {(navigationData.loadingScreen ?? true) ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Hide or unhide the initial animated loading screen when the website loads or reloads</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavigationData({ ...navigationData, loadingScreen: !(navigationData.loadingScreen ?? true) })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${(navigationData.loadingScreen ?? true) ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  aria-label="Toggle loading screen on reload"
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${(navigationData.loadingScreen ?? true) ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-100">Loading Screen Greetings</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      (navigationData.loadingGreetings ?? true) 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {(navigationData.loadingGreetings ?? true) ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Hide or unhide the greeting text (e.g. "{themeData.loadingText || 'ENJOY!'}") after loading reaches 100%</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavigationData({ ...navigationData, loadingGreetings: !(navigationData.loadingGreetings ?? true) })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${(navigationData.loadingGreetings ?? true) ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  aria-label="Toggle loading screen greetings"
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${(navigationData.loadingGreetings ?? true) ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'security' && renderSecurityTab()}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*,.png,.jpg,.jpeg,.gif,.svg,.webp,.mp4,.mov,.webm,.mkv,.avi,.m4v"
      />

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
            <p className="text-zinc-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {stepModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add Process Step</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Step Title</label>
                <input type="text" value={stepModal.data.title} onChange={e => setStepModal(prev => ({ ...prev, data: { ...prev.data, title: e.target.value } }))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="E.g., Discovery" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Step Description</label>
                <textarea value={stepModal.data.description} onChange={e => setStepModal(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[100px]" placeholder="Describe what happens in this step..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Step Media (Optional)</label>
                <div className="flex flex-col gap-3">
                   <DropZone onDropFile={(file) => handleDirectDrop(file, { section: 'process_modal', index: 0 })}>
                   <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => handleUploadClick({ section: 'process_modal', index: 0 })} disabled={uploadTarget?.section === 'process_modal'} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 whitespace-nowrap font-medium text-sm">
                          {uploadTarget?.section === 'process_modal' ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-zinc-400 border-t-emerald-400 rounded-full animate-spin" />
                              <span className="font-mono">{uploadProgress}%</span>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              {stepModal.data.media?.url ? 'Change Media' : 'Upload Media'}
                            </>
                          )}
                        </button>
                        <div className="flex items-center text-zinc-500 text-xs font-medium">OR</div>
                        <input type="text" value={stepModal.data.media?.url || ''} onChange={e => {
                          const url = e.target.value;
                          setStepModal(prev => ({
                            ...prev,
                            data: {
                              ...prev.data,
                              media: { url, type: (url.match(/\.(mp4|webm|ogg|mov|mkv|avi|m4v)$/i) || isSocialVideo(url)) ? 'video' : 'image' }
                            }
                          }));
                        }} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] text-sm" placeholder="Paste external URL..." />
                        
                        {stepModal.data.media?.url && (
                            <button onClick={() => {
                                confirmAction("Delete Media", "Remove media from this new step?", () => {
                                    if (stepModal.data.media?.url) deleteMediaFromServer(stepModal.data.media.url);
                                    setStepModal(prev => ({
                                      ...prev,
                                      data: { ...prev.data, media: { url: '', type: 'image' } }
                                    }));
                                });
                            }} className="text-red-500 hover:text-red-400 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    </DropZone>
                    {stepModal.data.media?.url && (
                        <div className="w-full max-w-[200px] aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 mt-2">
                            {stepModal.data.media.type === 'video' ? (
                                isSocialVideo(stepModal.data.media.url) ? (
                                    <SocialThumbnail url={stepModal.data.media.url} className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <video src={stepModal.data.media.url} className="w-full h-full object-cover opacity-60" controls muted />
                                )
                            ) : (
                                <img loading="lazy" src={stepModal.data.media.url} alt="Step preview" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                            )}
                        </div>
                    )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-800">
               <button onClick={() => setStepModal(prev => ({ ...prev, isOpen: false }))} className="px-5 py-2 text-zinc-400 hover:text-white transition-colors">Cancel</button>
               <button onClick={() => {
                  setProcessData(prev => ({
                    ...prev,
                    steps: [...prev.steps, {
                      title: stepModal.data.title || 'New Step',
                      description: stepModal.data.description,
                      media: stepModal.data.media?.url ? stepModal.data.media : undefined,
                      isNew: true
                    } as any]
                  }));
                  setStepModal(prev => ({ ...prev, isOpen: false }));
               }} className="px-6 py-2 bg-[var(--color-primary)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity">Add Step to Bottom</button>
            </div>
          </div>
        </div>
      )}
      {/* Cloudinary Storage Configuration Modal */}
      {showCloudinaryConfig && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Media Storage Settings</h3>
                  <p className="text-xs text-zinc-400">Configure Cloudinary for permanent cloud video & image storage</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowCloudinaryConfig(false);
                  setCloudinaryTestResult(null);
                }}
                className="text-zinc-500 hover:text-zinc-200 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex flex-col gap-1.5 leading-relaxed">
                <span className="font-semibold text-blue-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> High-Performance Video Uploads
                </span>
                <span>
                  Videos and images are uploaded directly or proxied through our backend server with automatic fallback to local storage so uploads never fail.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Cloudinary Cloud Name
                </label>
                <input
                  type="text"
                  value={cloudinaryForm.cloudName}
                  onChange={(e) => {
                    setCloudinaryForm(prev => ({ ...prev, cloudName: e.target.value }));
                    setCloudinaryTestResult(null);
                  }}
                  placeholder="e.g. your-cloud-name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Unsigned Upload Preset
                </label>
                <input
                  type="text"
                  value={cloudinaryForm.uploadPreset}
                  onChange={(e) => {
                    setCloudinaryForm(prev => ({ ...prev, uploadPreset: e.target.value }));
                    setCloudinaryTestResult(null);
                  }}
                  placeholder="e.g. ml_default or your unsigned preset name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] font-mono text-sm"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  In Cloudinary Console &gt; Settings &gt; Upload, make sure your preset Signing Mode is set to <strong>Unsigned</strong>.
                </p>
              </div>

              {cloudinaryTestResult && (
                <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  cloudinaryTestResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {cloudinaryTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  )}
                  <span>{cloudinaryTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={testCloudinary}
                disabled={isTestingCloudinary}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isTestingCloudinary ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Test Connection
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCloudinaryConfig(false);
                    setCloudinaryTestResult(null);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCloudinarySettings}
                  className="px-5 py-2 bg-[var(--color-primary)] text-zinc-950 font-bold rounded-xl text-xs hover:opacity-90 transition-opacity"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Size & Optimization Modal for Cloudinary */}
      {videoSizeModal.isOpen && videoSizeModal.file && videoSizeModal.target && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {videoSizeModal.isError ? "Cloudinary Video Size Exceeded" : "Large Video Detected (Cloudinary Optimization)"}
                </h3>
                <p className="text-xs text-zinc-400 truncate max-w-[280px]">File: {videoSizeModal.file.name}</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-4 text-xs space-y-2.5">
              <div className="flex justify-between text-zinc-300">
                <span>Selected Video Size:</span>
                <span className="font-mono font-bold text-amber-400">{(videoSizeModal.file.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Cloudinary Free Tier Limit:</span>
                <span className="font-mono font-bold text-zinc-300">100 MB max (104,857,600 bytes)</span>
              </div>
              <p className="text-zinc-400 pt-2 border-t border-zinc-800 leading-relaxed">
                Cloudinary Free accounts limit video uploads to 100MB. To ensure smooth playback and instant loading on your site, you can compress this video directly in your browser with no quality loss.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const { file, target } = videoSizeModal;
                  setVideoSizeModal(prev => ({ ...prev, isOpen: false }));
                  if (file && target) {
                    performUpload(file, target, true /* shouldCompressVideo */);
                  }
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                ⚡ Optimize & Upload to Cloudinary (Recommended)
              </button>

              <button
                type="button"
                onClick={() => {
                  const { file, target } = videoSizeModal;
                  setVideoSizeModal(prev => ({ ...prev, isOpen: false }));
                  if (file && target) {
                    performUpload(file, target, false /* forceOriginal */);
                  }
                }}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-colors cursor-pointer"
              >
                Upload Raw Original (Cloudinary Paid Plan)
              </button>

              <button
                type="button"
                onClick={() => {
                  setVideoSizeModal(prev => ({ ...prev, isOpen: false, file: null, target: null }));
                  setUploadTarget(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs font-medium text-center transition-colors cursor-pointer"
              >
                Cancel (Paste External URL Instead)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Uploading Floating Overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] w-[92%] max-w-md bg-zinc-900 border border-emerald-500/40 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold text-white">Uploading to Cloudinary</span>
              </div>
              <span className="text-sm font-bold font-mono text-emerald-400">{uploadProgress}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800 mb-2">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            <p className="text-xs text-zinc-400 truncate font-mono">
              {uploadStatusText || 'Preparing chunks...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Save Action */}
      <AnimatePresence>
        {hasUnsavedChanges && activeTab !== 'security' && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3 pointer-events-none"
          >
            <div className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-xl shadow-xl pointer-events-auto flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <span className="font-medium tracking-tight">Unsaved changes detected</span>
            </div>
            <button 
               onClick={handleSaveActiveTab} 
               className="flex items-center gap-2 px-8 py-4 bg-[var(--color-primary)] hover:opacity-90 text-zinc-950 font-bold rounded-full shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)] transition-all hover:scale-105 pointer-events-auto active:scale-95"
               style={{ '--color-primary': themeData.primaryColor } as any}
            >
              <Save className="w-5 h-5" /> 
              Save Changes
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
