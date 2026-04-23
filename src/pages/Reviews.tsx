import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { Star, Send, Search, Filter, Lock, CheckCircle2, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { formatTextWithAccent } from '../utils/formatText';
import { Magnetic } from '../components/Magnetic';

export default function Reviews() {
  const { data, addReview } = useAppData();
  const speed = data.theme.animationSpeed || 1;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'name' | 'role'>('all');
  const [formData, setFormData] = useState({
    clientName: '',
    clientRole: '',
    content: '',
    rating: 5
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const constraintsRef = useRef(null);
  const dragControls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);

  const filteredReviews = useMemo(() => {
    return data.reviews.list.filter(review => {
      const query = searchQuery.toLowerCase();
      if (!query) return true;
      
      if (searchFilter === 'name') {
        return review.clientName.toLowerCase().includes(query);
      } else if (searchFilter === 'role') {
        return review.clientRole.toLowerCase().includes(query);
      } else {
        return review.clientName.toLowerCase().includes(query) || 
               review.clientRole.toLowerCase().includes(query) ||
               review.content.toLowerCase().includes(query);
      }
    });
  }, [data.reviews.list, searchQuery, searchFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.reviews.enabled) return;
    setIsSubmitting(true);
    
    // Simulate network delay
    setTimeout(() => {
      addReview(formData);
      setFormData({ clientName: '', clientRole: '', content: '', rating: 5 });
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setIsModalOpen(false);
      }, 2500);
    }, 1500);
  };

  const renderFormContent = () => (
    <div className={`p-10 rounded-[2.5rem] glass border border-zinc-800/50 shadow-2xl relative overflow-hidden ${!data.reviews.enabled ? 'opacity-75 cursor-not-allowed' : ''}`}>
      {/* Form Background Accent */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-primary)] opacity-[0.05] blur-[60px] pointer-events-none" style={{ '--color-primary': data.theme.primaryColor } as any} />
      
      {!data.reviews.enabled && (
        <div className="absolute inset-0 z-[100] backdrop-blur-[8px] bg-zinc-950/80 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-8 border border-zinc-800 shadow-2xl rotate-12">
            <Lock className="w-10 h-10 text-zinc-500" />
          </div>
          <h3 className="text-3xl font-bold mb-4 text-white tracking-tight">Access Denied</h3>
          <p className="text-zinc-400 text-sm mb-8 max-w-[280px] mx-auto leading-relaxed">
            Review system is currently in maintenance mode. Please check back later.
          </p>
          <div className="px-6 py-3 bg-zinc-900/50 border border-zinc-800 rounded-full text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
            System Status: Locked
          </div>
        </div>
      )}

      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] backdrop-blur-xl bg-zinc-950/90 flex flex-col items-center justify-center p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </motion.div>
            <h3 className="text-3xl font-bold mb-4 text-white tracking-tight">Review Posted!</h3>
            <p className="text-zinc-400 text-sm mb-8 max-w-[280px] mx-auto leading-relaxed">
              Thank you for your feedback. Your review has been added successfully.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="text-3xl font-bold mb-8 tracking-tight">Leave a Review</h2>
      
      <form onSubmit={handleSubmit} className={`flex flex-col gap-6 ${!data.reviews.enabled ? 'pointer-events-none select-none opacity-50' : ''}`}>
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Rating</label>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Magnetic strength={0.3} key={star}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="focus:outline-none group"
                    disabled={!data.reviews.enabled}
                  >
                    <Star
                      className={`w-8 h-8 transition-all duration-300 ${star <= formData.rating ? 'fill-current scale-110' : 'text-zinc-800 group-hover:text-zinc-600'}`}
                      style={{ 
                        color: star <= formData.rating ? data.theme.primaryColor : undefined,
                        filter: star <= formData.rating ? `drop-shadow(0 0 10px ${data.theme.primaryColor}60)` : undefined
                      }}
                    />
                  </button>
                </Magnetic>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                id="clientName"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                placeholder="Your Name"
                disabled={!data.reviews.enabled}
              />
            </div>

            <div className="relative group">
              <input
                type="text"
                id="clientRole"
                required
                value={formData.clientRole}
                onChange={(e) => setFormData({ ...formData, clientRole: e.target.value })}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                placeholder="Role / Company"
                disabled={!data.reviews.enabled}
              />
            </div>

            <div className="relative group">
              <textarea
                id="content"
                required
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all resize-none placeholder:text-zinc-700"
                placeholder="Share your experience..."
                disabled={!data.reviews.enabled}
              />
            </div>
          </div>

          <Magnetic strength={0.15}>
            <button
              type="submit"
              disabled={isSubmitting || !data.reviews.enabled || isSubmitted}
              className="relative flex items-center justify-center gap-3 w-full py-5 rounded-2xl text-zinc-950 font-bold transition-all overflow-hidden group disabled:opacity-50"
              style={{ backgroundColor: isSubmitted ? '#10b981' : data.theme.primaryColor }}
            >
              <AnimatePresence mode="wait">
                {isSubmitting ? (
                  <motion.div
                    key="submitting"
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                    <span>Processing...</span>
                  </motion.div>
                ) : isSubmitted ? (
                  <motion.div
                    key="submitted"
                    initial={{ opacity: 0, filter: "blur(10px)", y: 10 }}
                    animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Review Posted</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span>Publish Review</span>
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </Magnetic>
        </div>
      </form>
    </div>
  );

  return (
    <div className="pt-40 pb-32 px-4 md:px-8 lg:px-12 w-full mx-auto min-h-screen relative">
      {/* Background Accents */}
      <div className="absolute top-20 left-0 w-[150vw] sm:w-[500px] h-[500px] bg-[var(--color-primary)] opacity-[0.02] blur-[150px] pointer-events-none" style={{ '--color-primary': data.theme.primaryColor } as any} />
      
      <motion.div
        initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
        animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
        transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
        className="mb-24 relative z-10"
      >
        <div className="inline-block px-3 py-1 rounded-full border border-zinc-800 text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 bg-zinc-900/50">
          Testimonials
        </div>
        <div className="flex flex-col xl:flex-row xl:items-center gap-6 mb-8">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-[1]">
            {formatTextWithAccent("Client `Reviews`", data.theme.primaryColor)}
          </h1>
          <div className="flex items-center gap-4 xl:ml-8">
            <Star className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 fill-current" style={{ color: data.theme.primaryColor }} />
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-7xl md:text-8xl font-bold text-zinc-100 leading-[1] tracking-tighter">
                  {data.reviews.list.length > 0 ? (data.reviews.list.reduce((acc, review) => acc + review.rating, 0) / data.reviews.list.length).toFixed(1) : "0.0"}
                </span>
                <span className="text-2xl sm:text-4xl text-zinc-600 font-bold">/5</span>
              </div>
              <span className="text-xs sm:text-sm text-zinc-500 font-medium uppercase tracking-widest mt-2">Overall Rating</span>
            </div>
          </div>
        </div>
        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl font-light leading-relaxed">
          Voices of those I've collaborated with. Transparent feedback from real projects.
        </p>
      </motion.div>

      <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-16 items-start relative z-10">
        {/* Left Column - Reviews List */}
        <div className="lg:col-span-7 flex flex-col gap-8 w-full min-w-0">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4 glass p-2 rounded-2xl border-zinc-800/50">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none rounded-xl pl-12 pr-4 py-3 text-zinc-50 focus:outline-none transition-colors text-sm"
              />
            </div>
            <div className="relative min-w-[160px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <select
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value as any)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl pl-12 pr-8 py-3 text-zinc-300 focus:outline-none transition-colors appearance-none cursor-pointer text-sm"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="role">Role/Company</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px]">▼</div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {filteredReviews.length === 0 ? (
              <div className="p-12 rounded-3xl glass border border-zinc-800/50 text-center">
                <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
                  {searchQuery ? "No matches found in database" : "Database empty. Awaiting input..."}
                </p>
              </div>
            ) : (
              filteredReviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, filter: "blur(10px)", x: -20 }}
                  whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, x: 0 }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="p-8 rounded-3xl glass border border-zinc-800/50 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 font-mono text-4xl select-none">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 transition-all duration-500 ${i < review.rating ? 'fill-current' : 'text-zinc-800'}`}
                        style={{ 
                          color: i < review.rating ? data.theme.primaryColor : undefined,
                          filter: i < review.rating ? `drop-shadow(0 0 5px ${data.theme.primaryColor}40)` : undefined
                        }}
                      />
                    ))}
                  </div>
                  
                  <p className="text-xl text-zinc-300 mb-8 leading-relaxed font-light italic">
                    "{formatTextWithAccent(review.content, data.theme.primaryColor)}"
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-zinc-800/50 pt-6">
                    <div>
                      <div className="font-bold text-zinc-100 tracking-tight">{formatTextWithAccent(review.clientName, data.theme.primaryColor)}</div>
                      <div className="text-sm text-zinc-500 font-mono uppercase tracking-tighter">{formatTextWithAccent(review.clientRole, data.theme.primaryColor)}</div>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                      {new Date(review.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Add Review Form (Desktop) */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-32 w-full z-10">
          {renderFormContent()}
        </div>
      </div>

      {/* Mobile Floating Button */}
      <div className="lg:hidden fixed top-32 bottom-6 left-6 right-6 pointer-events-none z-[110]" ref={constraintsRef}>
        <motion.div
          drag
          dragConstraints={constraintsRef}
          dragMomentum={false}
          animate={dragControls}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(e, info) => {
            setTimeout(() => setIsDragging(false), 100); // Small delay to prevent click after drag
            const screenWidth = window.innerWidth;
            if (info.point.x < screenWidth / 2) {
              dragControls.start({ x: -(screenWidth - 112), transition: { type: "spring", stiffness: 300, damping: 20 } });
            } else {
              dragControls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
            }
          }}
          className="absolute top-0 right-0 pointer-events-auto"
        >
          <motion.button
            animate={{ 
              scale: [1, 1.08, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            whileHover={{ scale: 1.1, opacity: 1, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.9, opacity: 1, transition: { duration: 0.2 } }}
            onClick={() => {
              if (!isDragging) setIsModalOpen(!isModalOpen);
            }}
            className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-zinc-950"
            style={{ backgroundColor: data.theme.primaryColor }}
          >
            <Star className="w-8 h-8 fill-current" />
          </motion.button>
        </motion.div>
      </div>

      {/* Mobile Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm lg:hidden"
          >
            <motion.div
              initial={{ clipPath: 'circle(0% at 100% 100%)', opacity: 0 }}
              animate={{ clipPath: 'circle(150% at 100% 100%)', opacity: 1 }}
              exit={{ clipPath: 'circle(0% at 100% 100%)', opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md relative z-50"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 z-[60] w-10 h-10 bg-zinc-800/90 backdrop-blur-md rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors border border-zinc-700/50 shadow-xl"
              >
                <X className="w-5 h-5" />
              </button>
              {renderFormContent()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
