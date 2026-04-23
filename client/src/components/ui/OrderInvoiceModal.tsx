import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, FileText, Package, User } from 'lucide-react';
import Modal from './Modal';
import { getFullImageUrl } from '../../api/apiConfig';

type OrderLike = {
  req_id?: number | string;
  req_status?: string;
  decline_reason?: string;
  req_date?: string;
  completed_at?: string;
  invoice_number?: string;
  product_id?: number | string;
  p_id?: number | string;
  p_name?: string;
  p_image?: string;
  quantity?: number | string;
  p_unit?: string;
  p_price?: number | string;
  buyer_first?: string;
  buyer_last?: string;
  buyer_first_name?: string;
  buyer_last_name?: string;
  farmer_first?: string;
  farmer_last?: string;
  farmer_first_name?: string;
  farmer_last_name?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  order: OrderLike | null;
  viewerRole: 'buyer' | 'farmer';
};

const formatCurrency = (value: unknown) => {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const normalizeStatus = (status?: string) => {
  const raw = String(status || 'Pending').trim();
  const lower = raw.toLowerCase();
  if (lower === 'confirmed') return 'Confirmed';
  if (lower === 'completed') return 'Completed';
  if (lower === 'cancelled' || lower === 'canceled') return 'Cancelled';
  if (lower === 'declined' || lower === 'rejected') return 'Declined';
  return 'Pending';
};

const buildPersonName = (
  first?: string,
  last?: string,
  fallback = 'Not available'
) => {
  const fullName = `${String(first || '').trim()} ${String(last || '').trim()}`.trim();
  return fullName || fallback;
};

const statusClassMap: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  Declined: 'bg-rose-50 text-rose-700 border-rose-200',
};

const OrderInvoiceModal: React.FC<Props> = ({ isOpen, onClose, order, viewerRole }) => {
  if (!order) return null;

  const reqId = Number(order.req_id || 0);
  const invoiceNumber = String(order.invoice_number || '').trim();
  const status = normalizeStatus(order.req_status);
  const declineReason = String(order.decline_reason || '').trim();
  const isCompleted = status === 'Completed';
  const isPending = status === 'Pending';
  const isConfirmed = status === 'Confirmed';
  const isCancelled = status === 'Cancelled';
  const isDeclined = status === 'Declined';
  const isFarmerDeclined = (isDeclined || isCancelled) && Boolean(declineReason);
  const displayStatus = isFarmerDeclined ? 'Declined' : status;
  const isInvoiceMode = isCompleted;
  const completedTime = order.completed_at;
  const completedTimeLabel =
    isCompleted && !completedTime ? 'Not captured (legacy order)' : formatDateTime(completedTime);

  const productId = String(order.product_id || order.p_id || '').trim();
  const quantity = Number(order.quantity || 0);
  const unitPrice = Number(order.p_price || 0);
  const subtotal = quantity * unitPrice;
  const totalAmount = subtotal;

  const buyerName = buildPersonName(
    order.buyer_first || order.buyer_first_name,
    order.buyer_last || order.buyer_last_name,
    viewerRole === 'buyer' ? 'You' : 'Buyer not available'
  );
  const farmerName = buildPersonName(
    order.farmer_first || order.farmer_first_name,
    order.farmer_last || order.farmer_last_name,
    viewerRole === 'farmer' ? 'You' : 'Farmer not available'
  );
  const viewerLabel = viewerRole === 'farmer' ? 'Farmer Copy' : 'Buyer Copy';

  const timeline = [
    { label: 'Requested', value: formatDateTime(order.req_date), done: true },
    ...(isPending
      ? [{ label: 'Confirmed', value: 'Waiting for farmer action', done: false }]
      : []),
    ...(isConfirmed || isCompleted
      ? [{ label: 'Confirmed', value: `Confirmed by Farmer (${farmerName})`, done: true }]
      : []),
    ...(isFarmerDeclined
      ? [{ label: 'Declined', value: `Reason: ${declineReason}`, done: true }]
      : []),
    ...(isCancelled && !isFarmerDeclined
      ? [{ label: 'Cancelled', value: 'Order was cancelled.', done: true }]
      : []),
    ...(isDeclined && !isFarmerDeclined
      ? [{ label: 'Declined', value: 'Order was declined by farmer.', done: true }]
      : []),
    ...(isCompleted
      ? [{ label: 'Completed', value: completedTimeLabel, done: true }]
      : []),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="inline-flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#4d8f08]" />
          <span>{isInvoiceMode ? 'Order Details' : 'Order Overview'}</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#d8ebbf] bg-[#f6fbe9] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#4d8f08]">{viewerLabel}</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">Order #{reqId}</h3>
              {isInvoiceMode && invoiceNumber && (
                <p className="mt-1 text-xs font-semibold text-[#4d8f08]">Order ID: {invoiceNumber}</p>
              )}
            </div>
            <div className="text-right space-y-1">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClassMap[displayStatus] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                {displayStatus}
              </span>
              <p className="text-[11px] text-slate-500">Requested: {formatDateTime(order.req_date)}</p>
              <p className="text-[11px] text-slate-500">Completed: {completedTimeLabel}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold text-slate-500 inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> Buyer</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{buyerName}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold text-slate-500 inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> Farmer</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{farmerName}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 inline-flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Item Snapshot</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{order.p_name || 'Product'}</p>
              {productId && <p className="text-[11px] text-slate-500 mt-1">Product ID: {productId}</p>}
            </div>
            {order.p_image ? (
              <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img
                  src={getFullImageUrl(order.p_image)}
                  alt={order.p_name || 'Product'}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[11px] text-slate-500">Quantity</p>
              <p className="font-semibold text-slate-900">{quantity} {order.p_unit || ''}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Unit Price</p>
              <p className="font-semibold text-slate-900">PHP {formatCurrency(unitPrice)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Subtotal</p>
              <p className="font-semibold text-slate-900">PHP {formatCurrency(subtotal)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-bold text-slate-500 inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Order Timeline</p>
          <div className="mt-3 space-y-2">
            {timeline.map((step) => (
              <div key={step.label} className="flex items-start gap-2 text-xs">
                {step.done ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" /> : <Clock3 className="mt-0.5 h-3.5 w-3.5 text-slate-400" />}
                <div>
                  <p className="font-semibold text-slate-900">{step.label}</p>
                  <p className="text-slate-500">{step.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-bold text-slate-500">Payment Summary</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-slate-700">
              <span>Subtotal</span>
              <span>PHP {formatCurrency(subtotal)}</span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex items-center justify-between font-black text-[#3f7606]">
              <span>Total</span>
              <span>PHP {formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OrderInvoiceModal;
