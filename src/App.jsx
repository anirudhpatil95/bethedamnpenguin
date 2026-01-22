import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Upload, X, Facebook, Twitter, Linkedin, Send, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://erqplzfrkjhmeepidhmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycXBsemZya2pobWVlcGlkaG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTQyMDQsImV4cCI6MjA4NDYzMDIwNH0.LDN4bjjg-YnGe8PSL2gNdfa9AM30jeUwUy2SSJ-55v8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [stories, setStories] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedStory, setSelectedStory] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingStory, setEditingStory] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    checkUser();
    loadStories();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user ?? null);
  };

  const loadStories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        profiles:user_id (name),
        likes (user_id),
        comments (id, content, created_at, profiles:user_id (name))
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStories(data);
    }
    setLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 2);
    setImageFiles(files);
    
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreview(previews);
  };

  const uploadImages = async () => {
    const uploadedUrls = [];
    
    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${currentUser?.id || 'anonymous'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('story-images')
        .upload(filePath, file);

      if (!uploadError) {
        const { data } = supabase.storage
          .from('story-images')
          .getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl);
      }
    }

    return uploadedUrls;
  };

  const createStory = async () => {
    if (!title.trim() || !content.trim()) {
      showMessage('error', 'Please fill in all fields');
      return;
    }

    const imageUrls = await uploadImages();

    const { error } = await supabase
      .from('stories')
      .insert([{
        title: title.trim(),
        content: content.trim(),
        images: imageUrls,
        user_id: currentUser?.id || null
      }]);

    if (error) {
      showMessage('error', 'Failed to create story');
    } else {
      showMessage('success', 'Story published successfully!');
      setShowCreateModal(false);
      resetForm();
      loadStories();
    }
  };

  const updateStory = async () => {
    if (!title.trim() || !content.trim()) {
      showMessage('error', 'Please fill in all fields');
      return;
    }

    let imageUrls = editingStory.images || [];
    
    if (imageFiles.length > 0) {
      imageUrls = await uploadImages();
    }

    const { error } = await supabase
      .from('stories')
      .update({
        title: title.trim(),
        content: content.trim(),
        images: imageUrls
      })
      .eq('id', editingStory.id);

    if (error) {
      showMessage('error', 'Failed to update story');
    } else {
      showMessage('success', 'Story updated successfully!');
      setShowCreateModal(false);
      setEditingStory(null);
      resetForm();
      loadStories();
    }
  };

  const deleteStory = async (storyId) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      showMessage('error', 'Failed to delete story');
    } else {
      showMessage('success', 'Story deleted successfully!');
      loadStories();
    }
  };

  const startEdit = (story) => {
    setEditingStory(story);
    setTitle(story.title);
    setContent(story.content);
    setImagePreview(story.images || []);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageFiles([]);
    setImagePreview([]);
    setEditingStory(null);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showMessage('error', 'Please fill in all fields');
      return;
    }

    if (authMode === 'signup') {
      if (!name) {
        showMessage('error', 'Please enter your name');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) {
        showMessage('error', error.message);
      } else {
        await supabase.from('profiles').insert([{ id: data.user.id, name }]);
        showMessage('success', 'Check your email to verify your account!');
        setShowAuthModal(false);
        setEmail('');
        setPassword('');
        setName('');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        showMessage('error', error.message);
      } else {
        showMessage('success', 'Welcome back!');
        setShowAuthModal(false);
        setEmail('');
        setPassword('');
      }
    }
  };

  const toggleLike = async (storyId) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const story = stories.find(s => s.id === storyId);
    const hasLiked = story.likes?.some(like => like.user_id === currentUser.id);

    if (hasLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('story_id', storyId)
        .eq('user_id', currentUser.id);
    } else {
      await supabase
        .from('likes')
        .insert([{ story_id: storyId, user_id: currentUser.id }]);
    }

    loadStories();
  };

  const addComment = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (!newComment.trim() || !selectedStory) return;

    const { error } = await supabase
      .from('comments')
      .insert([{
        story_id: selectedStory.id,
        user_id: currentUser.id,
        content: newComment.trim()
      }]);

    if (!error) {
      setNewComment('');
      loadStories();
      const updatedStory = stories.find(s => s.id === selectedStory.id);
      if (updatedStory) {
        const { data } = await supabase
          .from('stories')
          .select(`
            *,
            profiles:user_id (name),
            likes (user_id),
            comments (id, content, created_at, profiles:user_id (name))
          `)
          .eq('id', selectedStory.id)
          .single();
        setSelectedStory(data);
      }
    }
  };

  const shareStory = (story, platform) => {
    const url = window.location.href;
    const text = `${story.title} - Be The Damn Penguin`;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    showMessage('success', 'Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50 to-slate-50">
      {/* Message Banner */}
      {message.text && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Be The Damn Penguin</h1>
            <p className="text-sm text-slate-600">Share your inspiring journey</p>
          </div>
          <div className="flex gap-3">
            {currentUser ? (
              <>
                <span className="text-sm text-slate-600 self-center">
                  Hi, {currentUser.user_metadata?.name || currentUser.email}!
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => { setShowAuthModal(true); setAuthMode('login'); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Login
              </button>
            )}
            <button
              onClick={() => { setShowCreateModal(true); resetForm(); }}
              className="px-6 py-2 bg-gradient-to-r from-slate-700 to-blue-600 text-white rounded-lg hover:from-slate-800 hover:to-blue-700 transition-all shadow-md"
            >
              Share Your Story
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div 
        className="relative h-96 bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=1200)',
          backgroundPosition: 'center 40%'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900/40"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h2 className="text-5xl font-bold mb-4 drop-shadow-lg">
            Every Step Counts
          </h2>
          <p className="text-xl max-w-2xl mx-auto drop-shadow-md">
            Just like penguins marching across Antarctica, your journey matters. 
            Share your story of determination, courage, and perseverance.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {stories.map(story => (
              <article key={story.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-2xl font-bold text-slate-800 flex-1">{story.title}</h3>
                    {currentUser?.id === story.user_id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(story)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteStory(story.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-500 mb-3">
                    By {story.profiles?.name || 'Anonymous'} • {new Date(story.created_at).toLocaleDateString()}
                  </p>
                  
                  <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">{story.content}</p>
                  
                  {story.images?.length > 0 && (
                    <div className={`grid ${story.images.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-4`}>
                      {story.images.map((img, idx) => (
                        <img key={idx} src={img} alt="" className="w-full rounded-lg object-cover max-h-96" />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => toggleLike(story.id)}
                      className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors"
                    >
                      <Heart className={`w-5 h-5 ${story.likes?.some(l => l.user_id === currentUser?.id) ? 'fill-red-600 text-red-600' : ''}`} />
                      <span>{story.likes?.length || 0}</span>
                    </button>
                    <button
                      onClick={() => setSelectedStory(story)}
                      className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{story.comments?.length || 0}</span>
                    </button>
                    <div className="relative group">
                      <button className="flex items-center gap-2 text-slate-600 hover:text-green-600 transition-colors">
                        <Share2 className="w-5 h-5" />
                        <span>Share</span>
                      </button>
                      <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg p-2 hidden group-hover:flex gap-2">
                        <button onClick={() => shareStory(story, 'facebook')} className="p-2 hover:bg-slate-100 rounded">
                          <Facebook className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => shareStory(story, 'twitter')} className="p-2 hover:bg-slate-100 rounded">
                          <Twitter className="w-4 h-4 text-sky-500" />
                        </button>
                        <button onClick={() => shareStory(story, 'linkedin')} className="p-2 hover:bg-slate-100 rounded">
                          <Linkedin className="w-4 h-4 text-blue-700" />
                        </button>
                        <button onClick={() => shareStory(story, 'reddit')} className="p-2 hover:bg-slate-100 rounded">
                          <Send className="w-4 h-4 text-orange-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {stories.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg">No stories yet. Be the first to share your journey!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create/Edit Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingStory ? 'Edit Your Story' : 'Share Your Story'}
                </h2>
                <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Give your story a title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Story</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Share your journey of determination and perseverance..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Images (up to 2)</label>
                  <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 mr-2" />
                    <span className="text-slate-600">Click to upload images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {imagePreview.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {imagePreview.map((img, idx) => (
                        <img key={idx} src={img} alt="" className="w-full h-32 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={editingStory ? updateStory : createStory}
                  disabled={!title.trim() || !content.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-slate-700 to-blue-600 text-white rounded-lg hover:from-slate-800 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {editingStory ? 'Update Story' : 'Publish Story'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {authMode === 'login' ? 'Login' : 'Sign Up'}
                </h2>
                <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your name"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  onClick={handleAuth}
                  className="w-full px-6 py-3 bg-gradient-to-r from-slate-700 to-blue-600 text-white rounded-lg hover:from-slate-800 hover:to-blue-700 transition-all font-medium"
                >
                  {authMode === 'login' ? 'Login' : 'Sign Up'}
                </button>

                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="w-full text-sm text-slate-600 hover:text-slate-800"
                >
                  {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Comments</h2>
                <button onClick={() => setSelectedStory(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {selectedStory.comments?.map(comment => (
                  <div key={comment.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-800">{comment.profiles?.name || 'User'}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-700">{comment.content}</p>
                  </div>
                ))}
                {(!selectedStory.comments || selectedStory.comments.length === 0) && (
                  <p className="text-center text-slate-500 py-8">No comments yet. Be the first to comment!</p>
                )}
              </div>

              {currentUser ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addComment()}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a comment..."
                  />
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-slate-700 to-blue-600 text-white rounded-lg hover:from-slate-800 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post
                  </button>
                </div>
              ) : (
                <p className="text-center text-slate-600">
                  Please <button onClick={() => { setSelectedStory(null); setShowAuthModal(true); }} className="text-blue-600 hover:underline">login</button> to comment
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
