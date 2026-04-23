import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from "react-router-dom";
import { useAppData, ProjectData, MediaItem } from "../context/AppDataContext";
import { storage } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
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
  Cloud
} from "lucide-react";

type Tab = 'hero' | 'trust' | 'featured' | 'about' | 'process' | 'contact' | 'pageTitle' | 'reviews' | 'theme' | 'security';



export default function AdminDashboard() {
  const { isAdmin, isAuthReady, logout, data, updateData, updateProject, addProject, deleteProject, reorderProjects, showNotification } = useAppData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('hero');
  const [showCloudinaryConfig, setShowCloudinaryConfig] = useState(false);
  const [draggedProjectIndex, setDraggedProjectIndex] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isTestingCloudinary, setIsTestingCloudinary] = useState(false);
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
      if (activeTab === 'reviews') return JSON.stringify(reviewsData) !== JSON.stringify(data.reviews);
      return false;
    } catch (e) {
      return false;
    }
  }, [activeTab, heroData, trustData, featuredWorkData, aboutData, processData, contactData, pageTitleData, themeData, reviewsData, editingProject, selectedProjectId, data]);

  if (!isAdmin) return null;

  const handleLogout = () => {
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
    if (section === 'about') setAboutData(processedData);
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

  const performUpload = async (file: File, target: { section: string, index?: number, isSecond?: boolean }) => {
    setUploadProgress(0);
    try {
      let url = "";
      const isVideo = file.type.startsWith("video/");
      const mediaType = isVideo ? "video" : "image";

      const cloudName = data.cloudinary.cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = data.cloudinary.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (cloudName && uploadPreset) {
        // Upload to Cloudinary using XMLHttpRequest for progress tracking
        url = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);

          const resourceType = isVideo ? 'video' : 'image';
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentComplete);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              resolve(response.secure_url);
            } else {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error?.message || 'Cloudinary upload failed'));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
          xhr.send(formData);
        });
      } else if (storage) {
        // Upload to Firebase Storage
        url = await new Promise((resolve, reject) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const extension = file.name.split('.').pop();
          const fileName = `uploads/${uniqueSuffix}.${extension}`;
          const storageRef = ref(storage!, fileName);
          const uploadTask = uploadBytesResumable(storageRef, file);

          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(progress);
            }, 
            (error) => {
              reject(error);
            }, 
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      } else {
        // Fallback to local server upload
        url = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('file', file);

          xhr.open('POST', '/api/upload');

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentComplete);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              resolve(response.url);
            } else {
              reject(new Error('Local upload failed'));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during local upload'));
          xhr.send(formData);
        });
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
      showNotification("Failed to upload file. Please try again.", "error");
    } finally {
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

    if (target.section === 'project' && target.index !== undefined) {
      const currentMedia = editingProject?.images[target.index];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (currentMedia) {
        if (currentMedia.type === 'image' && !isImage) {
          showNotification("Please upload an image file.", "error");
          setUploadTarget(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        if (currentMedia.type === 'video' && !isVideo) {
          showNotification("Please upload a video file.", "error");
          setUploadTarget(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        if (currentMedia.type === 'comparison' && !isImage) {
          showNotification("Please upload an image file for comparison.", "error");
          setUploadTarget(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      }
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
      { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    ];

    return (
      <div className="flex flex-nowrap overflow-x-auto gap-2 mb-8 border-b border-zinc-800 pb-4 no-scrollbar scroll-smooth">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Scroll Text</label>
            <input type="text" value={heroData.scrollText || ''} onChange={e => setHeroData({...heroData, scrollText: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
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
            <button onClick={handleAddProject} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors">
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
                  onClick={() => setSelectedProjectId(id)}
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
                  <input type="text" value={editingProject.tech.join(', ')} onChange={(e) => setEditingProject({ ...editingProject, tech: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" />
                </div>

                <div className="pt-8 border-t border-zinc-800">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-xl font-bold">Media Files</h3>
                    <button onClick={addMedia} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors text-sm">
                      <Plus className="w-4 h-4" /> Add Media
                    </button>
                  </div>

                  <div className="space-y-6">
                    {editingProject.images.map((media, index) => (
                      <div key={index} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start">
                        <div className="w-full md:w-32 h-32 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800 flex items-center justify-center">
                          {media.type === "image" ? (
                            media.url ? <img src={media.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-zinc-700" />
                          ) : media.url ? (
                            <video src={media.url} autoPlay muted loop playsInline className="w-full h-full object-contain" />
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
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!!media.url}
                                title={media.url ? "Cannot change type after file is uploaded" : ""}
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
                              <input type="text" value={media.url} onChange={(e) => updateMedia(index, "url", e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)]" placeholder="Paste external URL..." />
                              {media.type !== 'comparison' && (
                                <button onClick={() => removeMedia(index)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20" title="Remove media">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {media.type === 'comparison' && (
                            <div>
                              <label className="block text-xs font-medium text-zinc-500 mb-1">Second Image (After)</label>
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
                                <button onClick={() => removeMedia(index)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20" title="Remove media">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          )}
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
          <textarea value={aboutData.content.join('\n\n')} onChange={e => setAboutData({...aboutData, content: e.target.value.split('\n\n').filter(Boolean)})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-[var(--color-primary)] min-h-[200px]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Image</label>
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
                                  type: e.target.value.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image'
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
                        {step.media?.url && (
                            <div className="w-full max-w-[200px] aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 mt-2">
                                {step.media.type === 'video' ? (
                                    <video src={step.media.url} className="w-full h-full object-cover opacity-60" controls muted />
                                ) : (
                                    <img src={step.media.url} alt="Step preview" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
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
          <label className="text-sm font-medium text-zinc-400">Enable Review Submissions (Unlock Form)</label>
          <input type="checkbox" checked={reviewsData.enabled} onChange={e => setReviewsData({...reviewsData, enabled: e.target.checked})} className="w-5 h-5 accent-[var(--color-primary)]" />
        </div>
        
        <div className="pt-6 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold">Testimonials</h3>
            <button onClick={() => setReviewsData({...reviewsData, list: [{ id: Date.now().toString(), clientName: 'New Client', clientRole: 'Role', content: 'Review content', rating: 5, date: new Date().toISOString().split('T')[0], isNew: true } as any, ...reviewsData.list]})} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg transition-colors text-sm">
              <Plus className="w-4 h-4" /> Add Review
            </button>
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
          {isCloudinaryConfigured ? (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              Cloudinary Active
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-medium flex items-center gap-1.5" title="Uploads are temporary and will be lost on server restart. Configure Cloudinary for permanent storage.">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
              Temporary Local Storage
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
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
        {activeTab === 'security' && renderSecurityTab()}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*"
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
                              media: { url, type: url.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image' }
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
                    {stepModal.data.media?.url && (
                        <div className="w-full max-w-[200px] aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 mt-2">
                            {stepModal.data.media.type === 'video' ? (
                                <video src={stepModal.data.media.url} className="w-full h-full object-cover opacity-60" controls muted />
                            ) : (
                                <img src={stepModal.data.media.url} alt="Step preview" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
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
