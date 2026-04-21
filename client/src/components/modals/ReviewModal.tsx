import React, { useState } from 'react';
import { Star, MessageSquare, UserRound } from 'lucide-react';
import Modal from '../ui/Modal';
import { API_BASE_URL, getFullImageUrl } from '../../api/apiConfig';
import { useToast } from '../ui/Toast';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    req_id: number;
    farmer_id?: number | string;
    farmer_first?: string;
    farmer_last?: string;
    p_id?: number | string;
    product_id?: number | string;
    p_name?: string;
    p_image?: string;
    has_farmer_review?: number | boolean;
  } | null;
  onSuccess?: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, order, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  if (!order) return null;

  const farmerName = `${order.farmer_first || ''} ${order.farmer_last || ''}`.trim() || 'Farmer';

  const handleSubmit = async () => {
    const token = localStorage.getItem('agrilink_token');
    if (!token) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a comment.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/farmer-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reqId: Number(order.req_id),
          rating,
          comment: comment.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Failed to submit review.');
        return;
      }

      toast.success('Farmer service review submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      toast.error('Network error while submitting review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" title="Review Farmer Service">
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="h-12 w-12 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
            {order.p_image ? (
              <img src={getFullImageUrl(order.p_image)} alt={order.p_name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-slate-300">
                <UserRound size={20} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{farmerName}</p>
            <p className="text-xs text-slate-500">Order #{order.req_id} • {order.p_name || 'Order item'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">How would you rate this farmer's service?</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  className={`transition-all hover:scale-110 ${s <= rating ? 'text-[#5ba409]' : 'text-slate-200'}`}
                >
                  <Star size={32} className={s <= rating ? 'fill-current' : ''} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Tell us more about your experience</p>
            <div className="relative">
              <MessageSquare size={16} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was communication, reliability, and overall service quality?"
                className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#5ba409] focus:ring-2 focus:ring-[#eaf8d5]"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !comment.trim()}
            className="flex-1 px-4 py-3 rounded-xl bg-[#5ba409] text-white text-sm font-semibold hover:bg-[#4d8f08] disabled:opacity-60 shadow-sm shadow-[#3f7606]/15"
          >
            {loading ? 'Submitting...' : 'Post Review'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReviewModal;
