import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Leaf, MessageSquare, Package, RefreshCcw, ShoppingBag, ShoppingCart, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../api/apiConfig';
import { useToast } from '../../ui/Toast';
import OrderInvoiceModal from '../../ui/OrderInvoiceModal';
import Modal from '../../ui/Modal';

type OrderFilter = 'All' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

const statusClassMap: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const FarmerOrdersPageV2: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderFilter>('All');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
  const [declineTargetOrder, setDeclineTargetOrder] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineReasonError, setDeclineReasonError] = useState('');

  const userId = localStorage.getItem('agrilink_id');

  const fetchOrders = async () => {
    if (!userId) {
      showError('User session expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/purchases/farmer/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load requests.');
      setOrders(data.orders || []);
    } catch (err: any) {
      showError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const onOrderUpdated = () => fetchOrders();
    window.addEventListener('order-updated', onOrderUpdated);
    window.addEventListener('agrilink-new-order', onOrderUpdated);
    return () => {
      window.removeEventListener('order-updated', onOrderUpdated);
      window.removeEventListener('agrilink-new-order', onOrderUpdated);
    };
  }, [userId]);

  const handleUpdateStatus = async (
    orderId: number,
    newStatus: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled',
    declineReasonText?: string
  ) => {
    try {
      setUpdatingOrderId(orderId);
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/purchases/status/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, u_id: userId, declineReason: declineReasonText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request update failed.');
      if (newStatus === 'Cancelled') {
        success('Request declined.');
      } else if (newStatus === 'Pending') {
        success('Order confirmation reverted to pending.');
      } else {
        success(`Request marked as ${newStatus}.`);
      }
      await fetchOrders();
      window.dispatchEvent(new CustomEvent('order-updated'));
    } catch (err: any) {
      showError(err.message || 'Request update failed.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openDeclineModal = (order: any) => {
    setDeclineTargetOrder(order);
    setDeclineReason('');
    setDeclineReasonError('');
  };

  const handleConfirmDecline = async () => {
    if (!declineTargetOrder) return;
    const reason = declineReason.trim();
    if (!reason) {
      setDeclineReasonError('Decline reason is required.');
      return;
    }
    setDeclineReasonError('');
    await handleUpdateStatus(Number(declineTargetOrder.req_id), 'Cancelled', reason);
    setDeclineTargetOrder(null);
    setDeclineReason('');
    setDeclineReasonError('');
  };

  const goToMessageBuyer = (order: any) => {
    const buyerId = Number(order.buyer_id);
    if (!Number.isFinite(buyerId) || buyerId <= 0) {
      showError('Unable to open buyer conversation for this order.');
      return;
    }

    const params = new URLSearchParams();
    params.set('contactId', String(buyerId));
    params.set('orderId', String(order.req_id || ''));
    params.set('productId', String(order.product_id || ''));
    params.set('productName', String(order.p_name || 'Product'));
    params.set('productImage', String(order.p_image || ''));
    params.set('productPrice', String(order.p_price || 0));
    params.set('productUnit', String(order.p_unit || 'unit'));

    const hasDeclineReason = String(order.req_status || '').toLowerCase() === 'cancelled' && String(order.decline_reason || '').trim();
    if (hasDeclineReason) {
      params.set(
        'prefill',
        `Hi ${order.buyer_first || 'Buyer'}, regarding order #${order.req_id} for ${order.p_name}, I had to decline this request. Reason: ${String(order.decline_reason).trim()}`
      );
    } else {
      params.set(
        'prefill',
        `Hi ${order.buyer_first || 'Buyer'}, regarding order #${order.req_id} for ${order.p_name}.`
      );
    }

    navigate(`/messages?${params.toString()}`);
  };

  const filteredOrders = useMemo(() => orders.filter((o) => filter === 'All' || o.req_status === filter), [orders, filter]);

  const getHarvestDate = (order: any) => {
    const raw = order?.harvest_date;
    if (!raw) return null;
    const dt = new Date(raw);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const isHarvestTimePassed = (order: any) => {
    const harvestDate = getHarvestDate(order);
    if (!harvestDate) return true;
    return Date.now() >= harvestDate.getTime();
  };

  const counts = useMemo(() => {
    const pending = orders.filter((o) => o.req_status === 'Pending').length;
    const confirmed = orders.filter((o) => o.req_status === 'Confirmed').length;
    const completed = orders.filter((o) => o.req_status === 'Completed').length;
    return { pending, confirmed, completed, total: orders.length };
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <div className="max-w-[1600px] mx-auto px-4 pt-10 pb-8">
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white mb-8 shadow-xl border border-emerald-300/30 bg-gradient-to-r from-[#0f2f0f] via-[#1f5c1b] to-[#2f7a24]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_45%)]" />
          <div className="absolute -bottom-8 left-0 w-[60%] h-24 rounded-[100%] bg-[#b9e57a]/20 blur-xl" />
          <div className="absolute -bottom-10 right-0 w-[52%] h-24 rounded-[100%] bg-[#86c640]/20 blur-xl" />
          <div className="relative z-10">
            <p className="text-[11px] uppercase tracking-[0.22em] text-green-100/90 font-semibold mb-2">AgriLink Farmer</p>
            <h1 className="text-3xl md:text-4xl font-black leading-tight">Orders</h1>
            <p className="text-white/90 mt-2 max-w-2xl">Review buyer requests, confirm availability, and complete orders smoothly.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-900">Orders Overview</h2>
            <p className="text-gray-500 mt-1">Review, confirm, and complete product requests from buyers.</p>
          </div>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Total Requests', value: counts.total, subtitle: 'All time requests', icon: ShoppingBag, tone: 'emerald' },
            { title: 'Waiting Approval', value: counts.pending, subtitle: 'Needs action', icon: Clock3, tone: 'amber' },
            { title: 'In Progress', value: counts.confirmed, subtitle: 'Confirmed orders', icon: Package, tone: 'green' },
            { title: 'Completed', value: counts.completed, subtitle: 'Successfully fulfilled', icon: CheckCircle2, tone: 'emerald' },
          ].map((stat) => (
            <div
              key={stat.title}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md min-h-[170px] ${
                stat.tone === 'amber'
                  ? 'border-amber-200 bg-gradient-to-br from-white via-white to-amber-50'
                  : 'border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50'
              }`}
            >
              <div className="absolute inset-y-0 -right-8 w-1/2 flex items-center justify-end opacity-12 pointer-events-none">
                <Leaf className={`w-36 h-36 ${stat.tone === 'amber' ? 'text-amber-500' : 'text-emerald-600'}`} />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center mb-5 shadow-sm">
                    <stat.icon className={`w-6 h-6 ${stat.tone === 'amber' ? 'text-amber-600' : 'text-emerald-700'}`} />
                  </div>
                  <p className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                    stat.tone === 'amber'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {stat.title}
                  </p>
                </div>
                <div className="mt-4">
                  <p className={`text-[40px] leading-none font-black tracking-tighter ${stat.tone === 'amber' ? 'text-amber-700' : 'text-emerald-800'}`}>{stat.value}</p>
                  <p className="text-sm text-gray-600 mt-2 font-bold tracking-wide">{stat.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
                  filter === item
                    ? 'bg-[#5ba409] text-white border-[#5ba409]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 w-fit">
            {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'} shown
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 h-32 flex items-center gap-6">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-50 rounded w-1/4" />
                  <div className="h-6 bg-gray-50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <ShoppingCart className="w-8 h-8 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-semibold">No {filter === 'All' ? '' : filter.toLowerCase()} requests found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order) => {
              const total = Number(order.quantity || 0) * Number(order.p_price || 0);
              const busy = updatingOrderId === order.req_id;
              const isPending = order.req_status === 'Pending';
              const isConfirmed = order.req_status === 'Confirmed';
              const harvestDate = getHarvestDate(order);
              const harvestPassed = isHarvestTimePassed(order);
              const harvestLabel = harvestDate ? harvestDate.toLocaleString() : null;

              return (
                <div
                  key={order.req_id}
                  className={`group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-emerald-200 transition-all duration-300 ${order.req_status === 'Completed' ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (order.req_status === 'Completed') {
                      setInvoiceOrder(order);
                    }
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-[#F9FBE7] border border-[#E1EEB4] flex items-center justify-center shrink-0 shadow-inner">
                        <ShoppingBag className="w-8 h-8 text-[#5ba409]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5ba409] bg-[#F9FBE7] px-3 py-1 rounded-full">Request #{order.req_id}</span>
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border shadow-sm ${statusClassMap[order.req_status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {order.req_status}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">
                          {order.buyer_first} {order.buyer_last}
                        </h3>
                        <p className="text-gray-500 font-bold text-sm mt-0.5">{order.p_name} ({order.quantity} {order.p_unit})</p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs font-black text-[#5ba409] uppercase tracking-wide">PHP {total.toLocaleString()}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5" />
                            {new Date(order.req_date).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {isPending && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => handleUpdateStatus(order.req_id, 'Confirmed')}
                            className="px-5 py-2.5 rounded-xl bg-[#5ba409] hover:bg-[#4d8f08] disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Confirm Order
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => openDeclineModal(order)}
                            className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-60 text-red-700 text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => handleUpdateStatus(order.req_id, 'Pending')}
                            className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 disabled:opacity-60 text-gray-700 text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <RefreshCcw className="w-4 h-4" />
                            Revert to Pending
                          </button>
                          <button
                            disabled={busy || !harvestPassed}
                            onClick={() => handleUpdateStatus(order.req_id, 'Completed')}
                            className="px-5 py-2.5 rounded-xl bg-[#2f6f2a] hover:bg-[#275f23] disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                            title={!harvestPassed && harvestLabel ? `Available after ${harvestLabel}` : 'Mark Completed'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {harvestPassed ? 'Mark Completed' : 'Wait Harvest Time'}
                          </button>
                        </>
                      )}

                      {order.req_status === 'Completed' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInvoiceOrder(order);
                          }}
                          className="px-4 py-2.5 rounded-xl border border-[#5ba409]/30 bg-[#f6fbe9] hover:bg-[#eaf8d5] text-[#3f7606] text-[11px] font-black uppercase tracking-widest transition-all"
                        >
                          View Order Details
                        </button>
                      )}

                      <button
                        onClick={() => goToMessageBuyer(order)}
                        className="p-3 sm:px-5 sm:py-2.5 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 text-gray-500 hover:text-[#5ba409] transition-all flex items-center gap-2 group/msg"
                      >
                        <MessageSquare className="w-5 h-5 group-hover/msg:rotate-12 transition-transform" />
                        <span className="hidden sm:inline text-[11px] font-black uppercase tracking-widest">Message Buyer</span>
                      </button>
                    </div>
                  </div>
                  {isConfirmed && !harvestPassed && harvestLabel && (
                    <p className="mt-3 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
                      Completion is locked until harvest time: {harvestLabel}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <OrderInvoiceModal
        isOpen={Boolean(invoiceOrder)}
        onClose={() => setInvoiceOrder(null)}
        order={invoiceOrder}
        viewerRole="farmer"
      />

      <Modal
        isOpen={Boolean(declineTargetOrder)}
        onClose={() => {
          setDeclineTargetOrder(null);
          setDeclineReason('');
          setDeclineReasonError('');
        }}
        title="Decline Order"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Provide a reason for declining order <span className="font-semibold">#{declineTargetOrder?.req_id}</span>. This reason will be sent to the buyer.
          </p>
          <textarea
            value={declineReason}
            onChange={(e) => {
              setDeclineReason(e.target.value);
              if (declineReasonError) setDeclineReasonError('');
            }}
            placeholder="Enter decline reason..."
            rows={4}
            className={`w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${
              declineReasonError
                ? 'border border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
            }`}
          />
          {declineReasonError && <p className="text-xs font-semibold text-red-600">{declineReasonError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDeclineTargetOrder(null);
                setDeclineReason('');
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDecline}
              disabled={updatingOrderId === Number(declineTargetOrder?.req_id)}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {updatingOrderId === Number(declineTargetOrder?.req_id) ? 'Declining...' : 'Confirm Decline'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FarmerOrdersPageV2;
