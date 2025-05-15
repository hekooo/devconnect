import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import dart from 'highlight.js/lib/languages/dart';
import go from 'highlight.js/lib/languages/go';
import graphql from 'highlight.js/lib/languages/graphql';
import 'highlight.js/styles/github-dark.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, Plus, Image as ImageIcon, Code, Quote, List, ListOrdered, Minus, Eye, Edit2 } from 'lucide-react';
import supabase from '../../lib/supabase';

// Create lowlight instance with additional languages
const lowlight = createLowlight(common);
lowlight.register('javascript', javascript);
lowlight.register('bash', bash);
lowlight.register('css', css);
lowlight.register('dart', dart);
lowlight.register('go', go);
lowlight.register('graphql', graphql);

interface FormValues {
  title: string;
  status: 'draft' | 'published';
  tags: string;
  content: string;
}

// Create a shared component for blog content rendering
export const BlogContent: React.FC<{
  title: string;
  content: string;
  coverUrl?: string | null;
  className?: string;
}> = ({ title, content, coverUrl, className = '' }) => {
  return (
    <div className={`blog-content ${className}`}>
      <h1 className="text-4xl font-serif font-bold mb-6">{title || 'Untitled'}</h1>
      
      {coverUrl && (
        <div className="mb-8">
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-auto max-h-[420px] object-cover rounded"
          />
        </div>
      )}
      
      <div 
        className="prose prose-lg max-w-none font-serif prose-headings:font-serif prose-p:font-serif prose-p:text-xl prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

const BlogEditor: React.FC<{ initialId?: string }> = ({ initialId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { status: 'draft', tags: '', title: '', content: '' },
  });

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [insertMenuPosition, setInsertMenuPosition] = useState({ x: 0, y: 0 });
  const [showPlusButton, setShowPlusButton] = useState(false);
  const [plusButtonPosition, setPlusButtonPosition] = useState({ x: 0, y: 0 });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Watch for content and title changes
  const title = watch('title');
  const content = watch('content');

  // Check for mobile/desktop on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { HTMLAttributes: { class: 'list-disc pl-6' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-6' } },
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-gray-300 pl-4 italic' } },
        codeBlock: false,
        horizontalRule: { HTMLAttributes: { class: 'my-4 border-t border-gray-300' } },
      }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'heading' ? 'Title' : 'Tell your story...',
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary-600 hover:text-primary-800 underline' },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: 'mx-auto my-6 max-w-full rounded' },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-800 text-gray-100 p-4 rounded my-4 overflow-x-auto',
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none font-serif min-h-[300px] prose-p:text-xl prose-p:leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      setValue('content', editor.getHTML());
    },
  });

  // Handle cover image upload
  const handleCoverUpload = async (file: File) => {
    if (!user) return;
    
    try {
      // Create a preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Read file content for upload
      const contentReader = new FileReader();
      const fileContentPromise = new Promise((resolve) => {
        contentReader.onloadend = () => resolve(contentReader.result);
        contentReader.readAsArrayBuffer(file);
      });

      const fileContent = await fileContentPromise;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      // Create a blob with the correct content type
      const blob = new Blob([fileContent as ArrayBuffer], { type: file.type });

      const { error: uploadError } = await supabase.storage
        .from('blog-covers')
        .upload(fileName, blob, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-covers')
        .getPublicUrl(fileName);

      setCoverUrl(publicUrl);
      addToast({
        type: 'success',
        message: 'Cover image uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading cover:', error);
      addToast({
        type: 'error',
        message: 'Failed to upload cover image',
      });
    }
  };

  const handleInsertClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setInsertMenuPosition({ x: rect.left, y: rect.bottom + window.scrollY });
    setShowInsertMenu(true);
  };

  const insertBlock = (type: string) => {
    if (!editor) return;

    switch (type) {
      case 'image':
        fileInputRef.current?.click();
        break;
      case 'code':
        editor.chain().focus().setCodeBlock().run();
        break;
      case 'quote':
        editor.chain().focus().setBlockquote().run();
        break;
      case 'bullet-list':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'ordered-list':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'divider':
        editor.chain().focus().setHorizontalRule().run();
        break;
    }
    setShowInsertMenu(false);
  };

  // Load existing blog if editing
  useEffect(() => {
    if (initialId && editor) {
      supabase
        .from('posts')
        .select('*')
        .eq('id', initialId)
        .single()
        .then(({ data }) => {
          if (data) {
            setValue('title', data.title);
            setValue('status', data.status === 'published' ? 'published' : 'draft');
            setValue('tags', (data.tags || []).join(', '));
            setValue('content', data.content_html || '');
            editor.commands.setContent(data.content_html || '');
            if (data.images?.[0]) {
              setCoverUrl(data.images[0]);
              setCoverPreview(data.images[0]);
            }
          }
        });
    }
  }, [initialId, editor, setValue]);

  // Show plus button when cursor is at the beginning of a line
  useEffect(() => {
    if (!editor) return;

    const handleKeyUp = () => {
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      
      // Check if cursor is at the beginning of a block
      if ($from.parentOffset === 0) {
        const domNode = editor.view.domAtPos($from.pos).node as HTMLElement;
        const rect = domNode.getBoundingClientRect();
        
        setPlusButtonPosition({
          x: rect.left - 30,
          y: rect.top + window.scrollY
        });
        setShowPlusButton(true);
      } else {
        setShowPlusButton(false);
      }
    };

    editor.on('selectionUpdate', handleKeyUp);
    
    return () => {
      editor.off('selectionUpdate', handleKeyUp);
    };
  }, [editor]);

  const onSubmit = async (data: FormValues) => {
    if (!user || !editor) return;

    setIsSubmitting(true);
    try {
      const payload = {
        id: initialId,
        user_id: user.id,
        title: data.title,
        content: editor.getHTML(),
        content_html: editor.getHTML(),
        images: coverUrl ? [coverUrl] : [],
        post_type: 'blog',
        status: data.status,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      const { data: saved, error } = await supabase
        .from('posts')
        .upsert(payload)
        .select('id')
        .single();

      if (error) throw error;

      addToast({
        type: 'success',
        message: data.status === 'published' ? 'Published!' : 'Draft saved.',
      });

      navigate(`/blogs/${saved.id}`);
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to save blog post',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="max-w-[1200px] mx-auto pb-20">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCoverUpload(file);
        }}
        accept="image/*"
        className="hidden"
      />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-dark-100 border-b z-50">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 flex items-center"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Preview toggle button */}
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center text-sm border rounded-full px-3 py-1 ${
                isPreviewMode 
                  ? 'bg-gray-100 border-gray-300' 
                  : 'bg-white border-gray-300'
              }`}
            >
              {isPreviewMode ? (
                <>
                  <Edit2 className="h-4 w-4 mr-1" />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  <span>Preview</span>
                </>
              )}
            </button>

            <select
              {...register('status')}
              className="text-sm border rounded-full px-3 py-1 bg-gray-100 dark:bg-dark-300 border-transparent focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Publish</option>
            </select>

            <button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className={`text-sm rounded-full px-4 py-1 font-medium flex items-center ${
                watch('status') === 'published'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSubmitting
                ? 'Saving...'
                : watch('status') === 'published'
                ? 'Publish'
                : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="pt-20">
        {/* Title input */}
        <div className="pb-6">
          <input
            {...register('title', { required: 'Title is required' })}
            placeholder="Title"
            className="w-full text-4xl font-serif font-bold placeholder-gray-400 outline-none border-none focus:ring-0"
          />
          {errors.title && <p className="text-red-600 mt-2">{errors.title.message}</p>}
        </div>

        {/* Cover image */}
        {coverPreview ? (
          <div className="relative group mb-6">
            <img
              src={coverPreview}
              className="w-full h-auto max-h-[420px] object-cover rounded"
              alt="Cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white rounded-full shadow-md text-sm font-medium"
              >
                Change cover
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed rounded flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
            >
              <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
              <span className="text-gray-500">Add a cover image</span>
            </button>
          </div>
        )}

        {/* Mobile: Toggle between edit and preview */}
        {isMobile ? (
          <>
            <AnimatePresence mode="wait">
              {isPreviewMode ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <BlogContent 
                    title={title} 
                    content={content} 
                    coverUrl={coverPreview} 
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative"
                >
                  {/* Editor content */}
                  <div className="relative group" ref={editorRef}>
                    {showPlusButton && (
                      <button
                        type="button"
                        onClick={handleInsertClick}
                        className="absolute -left-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ top: plusButtonPosition.y }}
                      >
                        <Plus className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                    
                    <EditorContent editor={editor} />
                    
                    {/* Insert menu */}
                    <AnimatePresence>
                      {showInsertMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                          style={{ top: insertMenuPosition.y, left: insertMenuPosition.x }}
                        >
                          <button
                            type="button"
                            onClick={() => insertBlock('image')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            <ImageIcon className="h-4 w-4" />
                            Image
                          </button>
                          <button
                            type="button"
                            onClick={() => insertBlock('code')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            <Code className="h-4 w-4" />
                            Code
                          </button>
                          <button
                            type="button"
                            onClick={() => insertBlock('quote')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            <Quote className="h-4 w-4" />
                            Quote
                          </button>
                          <button
                            type="button"
                            onClick={() => insertBlock('bullet-list')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            <List className="h-4 w-4" />
                            Bullet List
                          </button>
                          <button
                            type="button"
                            onClick={() => insertBlock('ordered-list')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            <ListOrdered className="h-4 w-4" />
                            Numbered List
                          </button>
                          <button
                            type="button"
                            onClick={() => insertBlock('divider')}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            <Minus className="h-4 w-4" />
                            Divider
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          // Desktop: Side-by-side view
          <div className="flex gap-6">
            <div className={`${isPreviewMode ? 'w-1/2' : 'w-full'} transition-all duration-300 relative group`}>
              {/* Editor content */}
              <div className="relative" ref={editorRef}>
                {showPlusButton && (
                  <button
                    type="button"
                    onClick={handleInsertClick}
                    className="absolute -left-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ top: plusButtonPosition.y }}
                  >
                    <Plus className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
                
                <EditorContent editor={editor} />
                
                {/* Insert menu */}
                <AnimatePresence>
                  {showInsertMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                      style={{ top: insertMenuPosition.y, left: insertMenuPosition.x }}
                    >
                      <button
                        type="button"
                        onClick={() => insertBlock('image')}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Image
                      </button>
                      <button
                        type="button"
                        onClick={() => insertBlock('code')}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <Code className="h-4 w-4" />
                        Code
                      </button>
                      <button
                        type="button"
                        onClick={() => insertBlock('quote')}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <Quote className="h-4 w-4" />
                        Quote
                      </button>
                      <button
                        type="button"
                        onClick={() => insertBlock('bullet-list')}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <List className="h-4 w-4" />
                        Bullet List
                      </button>
                      <button
                        type="button"
                        onClick={() => insertBlock('ordered-list')}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <ListOrdered className="h-4 w-4" />
                        Numbered List
                      </button>
                      <button
                        type="button"
                        onClick={() => insertBlock('divider')}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                        Divider
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Preview pane (desktop only) */}
            {isPreviewMode && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '50%' }}
                className="border-l pl-6 overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 14rem)' }}
                ref={previewRef}
              >
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-medium mb-4 text-gray-500">Preview</h2>
                  <BlogContent 
                    title={title} 
                    content={content} 
                    coverUrl={coverPreview} 
                  />
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="mt-8">
          <input
            {...register('tags')}
            placeholder="Add up to 5 tags..."
            className="w-full px-0 py-2 border-b focus:outline-none focus:border-black placeholder-gray-400 text-sm"
          />
          <p className="text-gray-500 text-xs mt-1">Tags help readers discover your story</p>
        </div>
      </form>
    </div>
  );
};

export default BlogEditor;