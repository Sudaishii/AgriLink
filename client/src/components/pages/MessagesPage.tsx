import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Circle, Clock, ExternalLink, ImagePlus, Search, Send, User, X, Package, ShoppingBag, Loader2 } from 'lucide-react';
import type { Conversation, Message } from '../../types';
import { API_BASE_URL, getFullImageUrl } from '../../api/apiConfig';
import { useMessaging } from '../../contexts/MessagingContext';
import ProductDetailModal from '../ui/ProductDetailModal';

interface MessagesPageProps {
  userType?: string;
}

interface ContactProfile {
  id: number;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  image_path?: string;
  role?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zip_code?: string;
}

const LAST_CONTACT_STORAGE_KEY = 'agrilink_lastMessageContactId';

const isImageValue = (value?: string | null) => {
  if (!value) return false;
  const v = value.trim().replace(/\\/g, '/').toLowerCase();
  if (v.length <= 2) return false;
  return (
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('/uploads') ||
    v.startsWith('uploads/') ||
    (v.includes('/') && !v.includes(' ')) ||
    v.includes('.jpg') ||
    v.includes('.jpeg') ||
    v.includes('.png') ||
    v.includes('.webp') ||
    v.includes('.gif') ||
    v.includes('.avif') ||
    v.includes('.bmp') ||
    v.includes('.svg')
  );
};

const initialsFromName = (name: string) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase() || '?';
};

const normalizePreviewText = (value: string) => {
  let raw = String(value || '').trim();
  if (!raw) return '';

  // Clean up technical product tags for the preview: [[product:id:name:path:price:unit]] -> [name]
  raw = raw.replace(/\[\[product:.*?:(.*?)(?::.*?)?\]\]/g, '[$1]');

  const lowered = raw.toLowerCase();
  if (lowered.includes('[[image]]')) return 'Sent an image';
  if (lowered.includes('blob:')) return 'Sent an image';

  return raw;
};

const MessagesPage: React.FC<MessagesPageProps> = ({ userType = 'buyer' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFarmer = userType.toLowerCase() === 'farmer';

  const {
    conversations,
    isReady,
    error,
    refreshConversations,
    getCachedThread,
    getThreadMessages,
    refreshThreadMessages,
    markRead,
    sendChatMessage,
    ensureConversation,
    threadsVersion,
    isUserOnline,
  } = useMessaging();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [conversationNotice, setConversationNotice] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [contactProfiles, setContactProfiles] = useState<Record<string, ContactProfile>>({});
  const [linkedProductsMap, setLinkedProductsMap] = useState<Record<string, any>>({});

  // Product Linking State
  const [isProductLinkerOpen, setIsProductLinkerOpen] = useState(false);
  const [farmerProducts, setFarmerProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Product Detail Modal State (for linked products)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const hydratedParticipantsRef = useRef<Set<string>>(new Set());
  const contactProfilesRef = useRef<Record<string, ContactProfile>>({});
  const pendingProfileFetchesRef = useRef<Map<string, Promise<ContactProfile | null>>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const appliedContextDraftRef = useRef('');

  const myUserId = useMemo(() => {
    return Number(localStorage.getItem('agrilink_id') || localStorage.getItem('agrilink_userId') || 0);
  }, []);

  const contactIdParam = searchParams.get('contactId');
  const contactId = Number(contactIdParam);
  const prefillContactName = String(searchParams.get('contactName') || '').trim();
  const prefillContactImage = String(searchParams.get('contactImage') || '').trim();
  const prefillContactRole = String(searchParams.get('contactRole') || '').trim();
  const orderIdParam = String(searchParams.get('orderId') || '').trim();
  const productIdParam = String(searchParams.get('productId') || '').trim();
  const productNameParam = String(searchParams.get('productName') || '').trim();
  const productImageParam = String(searchParams.get('productImage') || '').trim();
  const productPriceParam = String(searchParams.get('productPrice') || '').trim();
  const productUnitParam = String(searchParams.get('productUnit') || '').trim();
  const prefillMessageParam = String(searchParams.get('prefill') || '').trim();

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.participantName.toLowerCase().includes(q));
  }, [conversations, searchTerm]);

  const totalUnread = useMemo(
    () => conversations.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0),
    [conversations]
  );

  const isDraftConversation = useMemo(() => {
    const selectedId = String(selectedConversation?.participantId || '').trim();
    if (!selectedId) return false;
    return !conversations.some((c) => String(c.participantId || '').trim() === selectedId);
  }, [conversations, selectedConversation?.participantId]);

  const isConversationLoading = !isReady && conversations.length === 0;
  const hasConversationError = Boolean(error);

  const buildPlaceholderConversation = useCallback((id: number): Conversation => {
    return {
      id: String(id),
      participantId: String(id),
      participantName: prefillContactName || 'Loading user...',
      participantType: prefillContactRole || 'user',
      participantImage: prefillContactImage || '?',
      lastMessage: '',
      lastMessageTime: '',
      unreadCount: 0,
    };
  }, [prefillContactImage, prefillContactName, prefillContactRole]);

  const fetchBestContactProfile = useCallback(async (participantId: number): Promise<ContactProfile | null> => {
    if (!Number.isFinite(participantId) || participantId <= 0) return null;

    const token = localStorage.getItem('agrilink_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    try {
      const contactResponse = await fetch(`${API_BASE_URL}/users/contact/${participantId}`, { headers });
      const contactProfile = contactResponse.ok ? ((await contactResponse.json()) as ContactProfile) : null;
      const hasImage = Boolean(String(contactProfile?.profile_image || contactProfile?.image_path || '').trim());

      if (!hasImage) {
        const userResponse = await fetch(`${API_BASE_URL}/users/${participantId}`, { headers });
        if (userResponse.ok) {
          const userProfile = (await userResponse.json()) as ContactProfile;
          return {
            ...(contactProfile || { id: participantId }),
            ...userProfile,
            profile_image: userProfile.profile_image || userProfile.image_path || contactProfile?.profile_image || contactProfile?.image_path,
          };
        }
      }

      return contactProfile;
    } catch {
      return null;
    }
  }, []);

  const fetchContactProfile = useCallback(async (participantId: number): Promise<ContactProfile | null> => {
    if (!Number.isFinite(participantId) || participantId <= 0) return null;

    const cacheKey = String(participantId);
    if (contactProfilesRef.current[cacheKey]) return contactProfilesRef.current[cacheKey];

    const inFlight = pendingProfileFetchesRef.current.get(cacheKey);
    if (inFlight) return inFlight;

    const request = (async () => {
      try {
        const profile = await fetchBestContactProfile(participantId);
        if (!profile) return null;
        contactProfilesRef.current = { ...contactProfilesRef.current, [cacheKey]: profile };
        setContactProfiles((prev) => ({ ...prev, [cacheKey]: profile }));
        return profile;
      } catch {
        return null;
      } finally {
        pendingProfileFetchesRef.current.delete(cacheKey);
      }
    })();

    pendingProfileFetchesRef.current.set(cacheKey, request);
    return request;
  }, [fetchBestContactProfile]);

  const openParticipantProfile = useCallback(
    async (conv: Conversation | null) => {
      const pid = Number(conv?.participantId);
      if (!Number.isFinite(pid) || pid <= 0) return;

      let participantRole = String(conv?.participantType || '').toLowerCase();
      if (!participantRole || participantRole === 'user') {
        const profile = await fetchContactProfile(pid);
        participantRole = String(profile?.role || participantRole).toLowerCase();
      }

      if (participantRole === 'farmer') {
        navigate(`/profile/${pid}`);
        return;
      }

      navigate(`/profile/buyer/${pid}`);
    },
    [fetchContactProfile, navigate]
  );

  const clearAttachment = useCallback(() => {
    setAttachmentFile(null);
    setAttachmentPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const handlePickAttachment = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachmentChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setConversationNotice('Only image attachments are supported.');
      return;
    }

    setConversationNotice('');

    const nextPreview = URL.createObjectURL(file);
    setAttachmentPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return nextPreview;
    });
    setAttachmentFile(file);
  }, []);

  const handleSendMessage = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const editor = editorRef.current;
      if (!editor) return;

      const html = editor.innerHTML;

      // 🚀 SaaS Professional: Extract and Expand badges from ContentEditable
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const badges = tempDiv.querySelectorAll('span[data-product-id]');
      badges.forEach(badge => {
        const id = badge.getAttribute('data-product-id');
        const product = linkedProductsMap[id || ''];
        if (product) {
          const tag = `[[product:${product.p_id}:${product.p_name}:${product.p_image || ''}:${product.p_price || 0}:${product.p_unit || 'unit'}]]`;
          badge.replaceWith(tag);
        }
      });

      const expandedText = tempDiv.innerText.trim();
      
      // If we have an image, we allow empty text. If no image, we need text.
      if (!expandedText && !attachmentFile) return;

      const otherUserId = Number(selectedConversation?.participantId);
      if (!Number.isFinite(otherUserId) || otherUserId <= 0 || otherUserId === myUserId) return;

      const text = expandedText;
      const image = attachmentFile;

      setMessageText('');
      editor.innerHTML = ''; // Clear the editor
      setLinkedProductsMap({});
      setAttachmentFile(null);
      setAttachmentPreview((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });

      try {
        await sendChatMessage(otherUserId, text, image);
        setConversationNotice('');
      } catch (err) {
        console.error(err);
        setConversationNotice('Failed to send message. Please try again.');
        setMessageText(text);

        if (image) {
          const restoredPreview = URL.createObjectURL(image);
          setAttachmentFile(image);
          setAttachmentPreview(restoredPreview);
        }
      }
    },
    [attachmentFile, myUserId, selectedConversation?.participantId, sendChatMessage, linkedProductsMap]
  );

  const fetchFarmerProducts = useCallback(async (farmerId: number) => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/farmer/${farmerId}`);
      if (response.ok) {
        const data = await response.json();
        const products = data.products || data;
        // Only show active products
        setFarmerProducts(Array.isArray(products) ? products.filter((p: any) => p.p_status === 'active') : []);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const handleOpenProductLinker = useCallback(() => {
    const farmerId = Number(selectedConversation?.participantId);
    if (farmerId && !isFarmer) {
      setIsProductLinkerOpen(!isProductLinkerOpen);
      if (!isProductLinkerOpen) {
        fetchFarmerProducts(farmerId);
      }
    }
  }, [isProductLinkerOpen, selectedConversation?.participantId, isFarmer, fetchFarmerProducts]);

  const insertProductBadge = useCallback((product: any) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const badgeHtml = `<span contenteditable="false" data-product-id="${product.p_id}" class="inline-block bg-emerald-50 text-emerald-700 px-2 leading-6 h-6 rounded-md border border-emerald-100 font-bold mx-1 select-none pointer-events-none" style="vertical-align: top; font-size: 11px;">${product.p_name}</span>&nbsp;`;

    setLinkedProductsMap(prev => ({
      ...prev,
      [product.p_id]: product
    }));

    document.execCommand('insertHTML', false, badgeHtml);

    // 🚀 Sync the messageText state so the Send button enables immediately
    if (editorRef.current) {
      setMessageText(editorRef.current.innerText);
    }

  }, []);

  const insertProductLink = useCallback((product: any) => {
    insertProductBadge(product);
    setIsProductLinkerOpen(false);
    setProductSearch('');
  }, [insertProductBadge]);

  const handleLinkClick = useCallback(async (productId: string, productName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedProductForModal(data.product);
        setIsProductModalOpen(true);
      } else {
        navigate(`/product/${productId}`);
      }
    } catch (err) {
      console.error('Failed to fetch product details for modal', err);
      navigate(`/product/${productId}`);
    }
  }, [navigate]);

  const renderMessageTextWithLinks = (content: string, isMe: boolean) => {
    const parts = content.split(/(\[\[product:.*?\]\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[[product:') && part.endsWith(']]')) {
        return null;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderProductRichCards = (content: string, isMe: boolean) => {
    const matches = Array.from(content.matchAll(/\[\[product:(.*?)\]\]/g));
    if (matches.length === 0) return null;

    return (
      <div className="mt-2.5 space-y-2.5">
        {matches.map((match, idx) => {
          const inner = match[1];
          const fields = inner.split(':');

          if (fields.length < 5) return null;

          const id = fields[0];
          const name = fields[1];
          const image = fields[2];
          const price = fields[3];
          const unit = fields[4];

          return (
            <button
              key={`${id}-${idx}`}
              onClick={() => handleLinkClick(id, name)}
              className={`
                flex items-center gap-3.5 p-3 rounded-2xl border transition-all text-left group w-full max-w-[320px] shadow-sm
                bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md
              `}
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50 shadow-inner">
                {image && image !== 'null' && image !== 'undefined' ? (
                  <img src={getFullImageUrl(image)} alt={name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={24} /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold truncate mb-0.5 text-slate-900 group-hover:text-emerald-700">{name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-black text-slate-900">PHP {Number(price).toLocaleString()}</span>
                  <span className="text-[11px] font-medium opacity-50 text-slate-500">/ {unit}</span>
                </div>
                <div className="mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-600 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                  View Details <ExternalLink size={10} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      localStorage.setItem(LAST_CONTACT_STORAGE_KEY, String(conv.participantId));
      setSelectedConversation(conv);
      setConversationNotice('');
      navigate(`/messages?contactId=${conv.participantId}`, { replace: true });
    },
    [navigate]
  );

  const handleBackToList = useCallback(() => {
    setSelectedConversation(null);
    navigate('/messages', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    if (!Number.isFinite(contactId) || contactId <= 0) {
      if (isMounted) setSelectedConversation(null);
      return () => {
        isMounted = false;
      };
    }

    const idStr = String(contactId);
    localStorage.setItem(LAST_CONTACT_STORAGE_KEY, idStr);

    const existing = conversations.find((c) => c.participantId === idStr);
    if (existing) {
      if (selectedConversation?.participantId !== idStr && isMounted) {
        setSelectedConversation(existing);
      }
      return () => {
        isMounted = false;
      };
    }

    const placeholder = buildPlaceholderConversation(contactId);

    if (isMounted) {
      setSelectedConversation(placeholder);
    }
    ensureConversation(placeholder);

    fetchContactProfile(contactId)
      .then((profile) => {
        if (!profile || !isMounted) return;

        const first = String(profile?.first_name || '').trim();
        const last = String(profile?.last_name || '').trim();
        const name = `${first} ${last}`.trim() || `User ${contactId}`;
        const initials = `${first[0] || ''}${last[0] || ''}`.toUpperCase() || '?';
        const image = profile?.profile_image || profile?.image_path || initials;

        setContactProfiles((prev) => ({ ...prev, [idStr]: profile as ContactProfile }));

        setSelectedConversation((prev) =>
          prev?.participantId === idStr
            ? {
              ...prev,
              participantName: name,
              participantType: String(profile?.role || 'user'),
              participantImage: image,
            }
            : prev
        );
      })
      .catch(() => null);

    return () => {
      isMounted = false;
    };
  }, [
    buildPlaceholderConversation,
    contactId,
    conversations,
    ensureConversation,
    fetchContactProfile,
    selectedConversation?.participantId,
  ]);

  useEffect(() => {
    if (!selectedConversation) return;
    if (!Number.isFinite(contactId) || contactId <= 0) return;
    if (String(selectedConversation.participantId) !== String(contactId)) return;

    const hasContext =
      Boolean(prefillMessageParam) ||
      Boolean(orderIdParam) ||
      (Boolean(productIdParam) && Boolean(productNameParam));
    if (!hasContext) return;

    const contextKey = [
      contactId,
      orderIdParam,
      productIdParam,
      productNameParam,
      productImageParam,
      productPriceParam,
      productUnitParam,
      prefillMessageParam,
    ].join('|');

    if (appliedContextDraftRef.current === contextKey) return;

    const editor = editorRef.current;
    if (!editor) return;

    editor.innerHTML = '';
    if (prefillMessageParam) {
      editor.appendChild(document.createTextNode(prefillMessageParam));
      editor.appendChild(document.createTextNode(' '));
    }

    if (productIdParam && productNameParam) {
      insertProductBadge({
        p_id: productIdParam,
        p_name: productNameParam,
        p_image: productImageParam || '',
        p_price: Number(productPriceParam || 0),
        p_unit: productUnitParam || 'unit',
      });
    } else {
      setMessageText(editor.innerText);
    }

    appliedContextDraftRef.current = contextKey;
  }, [
    contactId,
    insertProductBadge,
    orderIdParam,
    prefillMessageParam,
    productIdParam,
    productImageParam,
    productNameParam,
    productPriceParam,
    productUnitParam,
    selectedConversation,
  ]);

  useEffect(() => {
    contactProfilesRef.current = contactProfiles;
  }, [contactProfiles]);

  useEffect(() => {
    const selectedId = String(selectedConversation?.participantId || '').trim();
    if (!selectedId) return;
    const latest = conversations.find((c) => String(c.participantId) === selectedId);
    if (!latest) return;

    setSelectedConversation((prev) => {
      if (!prev) return prev;
      const changed =
        prev.participantName !== latest.participantName ||
        prev.participantImage !== latest.participantImage ||
        prev.participantType !== latest.participantType ||
        prev.lastMessage !== latest.lastMessage ||
        prev.lastMessageTime !== latest.lastMessageTime ||
        prev.unreadCount !== latest.unreadCount;
      return changed ? { ...prev, ...latest } : prev;
    });
  }, [conversations, selectedConversation?.participantId]);

  useEffect(() => {
    refreshConversations().catch(() => null);

    if (Number.isFinite(contactId) && contactId > 0) {
      refreshThreadMessages(contactId).catch(() => null);
    }
  }, [contactId, location.key, refreshConversations, refreshThreadMessages]);

  useEffect(() => {
    let isMounted = true;

    const otherUserId = Number(selectedConversation?.participantId);
    if (!selectedConversation || !otherUserId) {
      setIsLoadingThread(false);
      setMessages([]);
      return () => {
        isMounted = false;
      };
    }

    const cached = getCachedThread(otherUserId);
    if (cached) {
      setIsLoadingThread(false);
      setMessages(cached);
      markRead(otherUserId).catch(() => null);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingThread(true);

    getThreadMessages(otherUserId)
      .then((msgs) => {
        if (!isMounted) return;
        setMessages(msgs);
        return markRead(otherUserId).catch(() => null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingThread(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    getCachedThread,
    getThreadMessages,
    refreshThreadMessages,
    markRead,
    selectedConversation,
    threadsVersion,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, selectedConversation?.participantId]);

  useEffect(() => {
    return () => {
      if (attachmentPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, [attachmentPreview]);

  useEffect(() => {
    const candidates = conversations.filter((conv) => {
      const participantId = String(conv.participantId || '').trim();
      if (!participantId || hydratedParticipantsRef.current.has(participantId)) return false;
      const needsName = !String(conv.participantName || '').trim() || /^user\s+\d+$/i.test(String(conv.participantName || '').trim()) || String(conv.participantName || '').toLowerCase().includes('loading user');
      const needsImage = !String(conv.participantImage || '').trim() || String(conv.participantImage || '').trim() === '?';
      return needsName || needsImage;
    });

    if (candidates.length === 0) return;

    let isCancelled = false;

    (async () => {
      for (const conv of candidates) {
        const participantId = Number(conv.participantId);
        if (!Number.isFinite(participantId) || participantId <= 0) continue;

        const key = String(participantId);
        hydratedParticipantsRef.current.add(key);
        const profile = await fetchContactProfile(participantId);
        if (!profile || isCancelled) continue;

        const first = String(profile.first_name || '').trim();
        const last = String(profile.last_name || '').trim();
        const hydratedName = `${first} ${last}`.trim() || conv.participantName || `User ${participantId}`;
        const hydratedImage = profile.profile_image || profile.image_path || `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}` || '?';

        ensureConversation({
          ...conv,
          participantId: String(participantId),
          participantName: hydratedName,
          participantType: String(profile.role || conv.participantType || 'user'),
          participantImage: hydratedImage,
        });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [conversations, ensureConversation, fetchContactProfile]);

  return (
    <div className="relative h-full min-h-0 max-h-full bg-white rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden border border-slate-200 md:flex">
      <aside
        className={`${selectedConversation ? 'hidden md:flex' : 'flex'
          } w-full md:w-[24rem] lg:w-[26rem] border-r border-slate-200 flex-col bg-white min-h-0 overflow-hidden`}
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-gradient-to-b from-[#f7fbea] to-white">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-2">
            Messages
            {totalUnread > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                {totalUnread} New
              </span>
            )}
          </h1>

          {totalUnread > 0 && (
            <p className="text-xs font-medium text-slate-500 mb-4 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {totalUnread} unread conversation{totalUnread !== 1 ? 's' : ''}
            </p>
          )}

          <div className="relative group mt-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-600 transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-green-500/40 focus:bg-white text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {conversationNotice && (
            <p className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {conversationNotice}
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-1.5 overscroll-contain">
          {isConversationLoading && (
            <div className="h-full min-h-44 grid place-items-center text-xs font-medium text-slate-400">
              Loading conversations...
            </div>
          )}

          {!isConversationLoading && hasConversationError && (
            <div className="m-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-semibold text-rose-700 mb-2">Unable to load conversations.</p>
              <p className="text-[11px] text-rose-600 mb-3">{error}</p>
              <button
                type="button"
                onClick={() => refreshConversations().catch(() => null)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!isConversationLoading && !hasConversationError && filteredConversations.length === 0 && (
            <div className="h-full min-h-44 grid place-items-center text-xs font-medium text-slate-400">
              No conversations yet
            </div>
          )}

          {!hasConversationError &&
            filteredConversations.map((conv) => {
              const hasUnread = conv.unreadCount > 0;
              const showImage = isImageValue(conv.participantImage);

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all relative group border ${selectedConversation?.id === conv.id
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {hasUnread && <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-amber-400 rounded-full" />}

                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm overflow-hidden ${selectedConversation?.id === conv.id
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      {showImage ? (
                        <img
                          src={getFullImageUrl(conv.participantImage)}
                          alt={conv.participantName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const fallbackName = encodeURIComponent(conv.participantName || 'User');
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${fallbackName}&background=16a34a&color=ffffff&bold=true`;
                          }}
                        />
                      ) : (
                        initialsFromName(conv.participantName)
                      )}
                    </div>

                    {isUserOnline(conv.participantId) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-slate-100">
                        <Circle className="w-2.5 h-2.5 fill-green-400 text-green-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <h3
                        className={`font-black tracking-tight truncate ${selectedConversation?.id === conv.id ? 'text-slate-900' : 'text-slate-700'
                          }`}
                      >
                        {conv.participantName}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 ml-2">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <p
                      className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-400 font-normal'
                        }`}
                    >
                      {normalizePreviewText(conv.lastMessage)}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <div
                      className={`min-w-5 h-5 px-1.5 text-white text-[10px] font-semibold rounded-full flex items-center justify-center shrink-0 ${isFarmer ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                    >
                      {conv.unreadCount}
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      </aside>

      <section
        className={`${selectedConversation ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-white min-h-0 overflow-hidden`}
      >
        {selectedConversation ? (
          <>
            <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="md:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>

                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-700 font-black overflow-hidden shadow-sm border border-green-100 shrink-0">
                  {isImageValue(selectedConversation.participantImage) ? (
                    <img
                      src={getFullImageUrl(selectedConversation.participantImage)}
                      alt={selectedConversation.participantName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const fallbackName = encodeURIComponent(selectedConversation.participantName || 'User');
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${fallbackName}&background=16a34a&color=ffffff&bold=true`;
                      }}
                    />
                  ) : (
                    initialsFromName(selectedConversation.participantName)
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-black tracking-tight text-slate-900 leading-none truncate">
                    {selectedConversation.participantName}
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 truncate">
                    Chat with {selectedConversation.participantName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openParticipantProfile(selectedConversation)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <User className="h-3.5 w-3.5" />
                <span>View Profile</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </header>

            <div
              className={`flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-50/70 px-4 md:px-6 ${messages.length === 0 ? 'py-3 md:py-4' : 'py-5 md:py-6'
                }`}
            >
              {isLoadingThread && messages.length === 0 && (
                <div className="text-xs font-medium text-slate-500">Loading messages...</div>
              )}
              {!isLoadingThread && messages.length === 0 && (
                <div className="grid place-items-center min-h-[40vh] text-center">
                  <div className="max-w-sm">
                    <p className="text-sm font-semibold text-slate-600">
                      {isDraftConversation
                        ? `Start your conversation with ${selectedConversation?.participantName || 'this farmer'}.`
                        : 'No messages yet.'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {isDraftConversation ? 'Send your first message below.' : 'Send a message below to begin.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {messages.map((msg) => {
                  const isMe = Number(msg.senderId) === myUserId;
                  const hasImage = Boolean(msg.imagePath);
                  const textContent = String(msg.content || '').trim();
                  const hasText = Boolean(textContent);
                  const hasProduct = textContent.includes('[[product:');
                  const imageOnly = hasImage && !hasText;

                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${imageOnly
                            ? 'bg-transparent border-transparent p-0'
                            : hasImage || hasProduct
                              ? 'bg-white text-slate-700 rounded-xl border border-slate-200'
                              : isMe
                                ? 'bg-green-600 text-white rounded-tr-md'
                                : 'bg-white text-slate-700 rounded-tl-md border border-slate-200'
                            }`}
                        >
                          {hasImage && (
                            <img
                              src={getFullImageUrl(msg.imagePath)}
                              alt="Message attachment"
                              className={`${hasText ? 'mb-2' : ''} max-h-72 w-full max-w-[320px] rounded-xl object-cover border border-black/10`}
                            />
                          )}
                          {hasText ? (
                            <>
                              <div className="break-words whitespace-pre-wrap">
                                {renderMessageTextWithLinks(textContent, isMe)}
                              </div>
                              {renderProductRichCards(textContent, isMe)}
                            </>
                          ) : null}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 mt-1.5 px-1">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-3 md:p-4">
              {attachmentPreview && (
                <div className="mb-2 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 max-w-full">
                  <img
                    src={attachmentPreview}
                    alt="Attachment preview"
                    className="h-12 w-12 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div className="text-xs text-slate-600 min-w-0">
                    <p className="font-semibold">Image ready</p>
                    <p className="truncate">{attachmentFile?.name || 'Attachment'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                    aria-label="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="bg-white border border-slate-200 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-sm focus-within:border-emerald-500/40 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAttachmentChange}
                />

                <button
                  type="button"
                  onClick={handlePickAttachment}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                  title="Attach image"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>

                {!isFarmer && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenProductLinker}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all shrink-0 ${isProductLinkerOpen
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      title="Link a product"
                    >
                      <ShoppingBag className="h-5 w-5" />
                    </button>

                    {isProductLinkerOpen && (
                      <div className="absolute bottom-full left-0 mb-3 w-[320px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden z-[50] animate-in slide-in-from-bottom-5 duration-300">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Farmer's Listings</h4>
                            <button onClick={() => setIsProductLinkerOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                            <input
                              type="text"
                              placeholder="Search products..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500/40 transition-all font-medium"
                            />
                          </div>
                        </div>

                        <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
                          {isLoadingProducts ? (
                            <div className="py-12 flex flex-col items-center gap-2">
                              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanning inventory...</span>
                            </div>
                          ) : farmerProducts.filter(p => p.p_name.toLowerCase().includes(productSearch.toLowerCase())).length > 0 ? (
                            farmerProducts.filter(p => p.p_name.toLowerCase().includes(productSearch.toLowerCase())).map(product => (
                              <button
                                key={product.p_id}
                                onClick={() => insertProductLink(product)}
                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-50 transition-all text-left group border border-transparent hover:border-emerald-100"
                              >
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-50">
                                  {product.p_image ? (
                                    <img src={getFullImageUrl(product.p_image)} className="w-full h-full object-cover" alt={product.p_name} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={16} /></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700">{product.p_name}</p>
                                  <p className="text-[10px] font-black text-emerald-600 uppercase">PHP {product.p_price.toLocaleString()} / {product.p_unit}</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="py-12 px-6 text-center">
                              <p className="text-xs font-semibold text-slate-400">No products found matching "{productSearch}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative flex-1 min-w-0">
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={(e) => setMessageText(e.currentTarget.innerText)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500/40 transition-all min-h-[46px] max-h-[120px] overflow-y-auto break-words whitespace-pre-wrap"
                    style={{ unicodeBidi: 'plaintext' }}
                  ></div>

                  {!messageText && (
                    <span className="absolute left-4 top-3.5 text-slate-400 text-sm font-medium pointer-events-none">
                      {isFarmer ? 'Reply to buyer...' : 'Reply to farmer...'}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!messageText.trim() && !attachmentFile}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/60">
            <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-green-600 mb-6 shadow-sm">
              <Send className="w-8 h-8 rotate-12" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Select a conversation</h2>
            <p className="text-slate-500 text-sm max-w-sm">
              {isFarmer
                ? 'Choose a conversation to reply to your buyers.'
                : 'Choose a conversation from the sidebar to start messaging.'}
            </p>
          </div>
        )}
      </section>

      {/* Item Detail Preview Modal */}
      <ProductDetailModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProductForModal}
        hideMessageButton={true}
      />
    </div>
  );
};

export default MessagesPage;
