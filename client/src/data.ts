import type { Product, OrderItem, FarmerApplication, UserData, Conversation, Message, Notification } from './types';
import tomatoImage from './assets/tomato.jpg';
import mangoImage from './assets/mango.jpg';
import grainImage from './assets/grain.jpg';
import eggImage from './assets/eggs.webp';
import lettuceImage from './assets/lettuce.jpg';
import bananaImage from './assets/banana.jpg';

// Sample Data
export const sampleProducts: Product[] = [
  { id: 1, name: 'Organic Tomatoes', price: 85, unit: 'kg', seller: 'Juan dela Cruz', location: 'Cebu City', stock: 50, image: tomatoImage, category: 'Vegetables', badges: ['Fresh Pick', 'Premium Crop'] },
  { id: 2, name: 'Fresh Mangoes', price: 120, unit: 'kg', seller: 'Maria Santos', location: 'Davao', stock: 30, image: mangoImage, category: 'Fruits', badges: ['Fresh Pick'] },
  { id: 3, name: 'Brown Rice', price: 65, unit: 'kg', seller: 'Pedro Reyes', location: 'Nueva Ecija', stock: 100, image: grainImage, category: 'Grains', badges: ['Superior Harvest'] },
  { id: 4, name: 'Fresh Eggs', price: 180, unit: 'tray', seller: 'Ana Garcia', location: 'Laguna', stock: 25, image: eggImage, category: 'Poultry', badges: ['Fresh Pick'] },
  { id: 5, name: 'Organic Lettuce', price: 75, unit: 'kg', seller: 'Jose Cruz', location: 'Baguio', stock: 40, image: lettuceImage, category: 'Vegetables', badges: ['Premium Crop'] },
  { id: 6, name: 'Bananas', price: 45, unit: 'kg', seller: 'Rosa Mendoza', location: 'Mindanao', stock: 80, image: bananaImage, category: 'Fruits', badges: ['Superior Harvest'] },
];

export const farmerOrders: OrderItem[] = [
  { id: '#ORD-001', buyer: 'Maria Santos', product: 'Organic Tomatoes', qty: '10 kg', status: 'Pending', amount: '₱850' },
  { id: '#ORD-002', buyer: 'Pedro Reyes', product: 'Fresh Mangoes', qty: '5 kg', status: 'Confirmed', amount: '₱600' },
  { id: '#ORD-003', buyer: 'Ana Garcia', product: 'Organic Lettuce', qty: '8 kg', status: 'Delivered', amount: '₱600' },
];

export const buyerOrders: OrderItem[] = [
  { id: '#ORD-105', farmer: 'Juan dela Cruz', product: 'Organic Tomatoes', items: 'Organic Tomatoes × 5kg', date: 'Feb 14, 2026', status: 'In Transit', amount: '₱425' },
  { id: '#ORD-104', farmer: 'Rosa Mendoza', product: 'Bananas', items: 'Bananas × 10kg', date: 'Feb 13, 2026', status: 'Delivered', amount: '₱450' },
  { id: '#ORD-103', farmer: 'Jose Cruz', product: 'Organic Lettuce', items: 'Organic Lettuce × 3kg', date: 'Feb 12, 2026', status: 'Delivered', amount: '₱225' },
];

export const pendingFarmers: FarmerApplication[] = [
  { name: 'Carlos Hernandez', location: 'Iloilo', products: 'Rice, Corn', date: 'Feb 14, 2026' },
  { name: 'Linda Aquino', location: 'Pangasinan', products: 'Vegetables', date: 'Feb 14, 2026' },
  { name: 'Ramon Diaz', location: 'Batangas', products: 'Fruits', date: 'Feb 13, 2026' },
];

export const users: UserData[] = [
  { name: 'Juan dela Cruz', type: 'Farmer', location: 'Cebu City', status: 'Active', badges: ['Master Farmer', 'Skilled Farmer'] },
  { name: 'Maria Santos', type: 'Buyer', location: 'Davao', status: 'Active' },
  { name: 'Pedro Reyes', type: 'Farmer', location: 'Nueva Ecija', status: 'Active', badges: ['Skilled Farmer'] },
  { name: 'Ana Garcia', type: 'Buyer', location: 'Laguna', status: 'Suspended' },
  { name: 'Hon. Roberto Gomez', type: 'Barangay Official', location: 'San Jose, Cebu', status: 'Active' },
  { name: 'Admin User', type: 'Admin', location: 'AgriLink HQ', status: 'Active' },
];

export const sampleConversations: Conversation[] = [
  {
    id: 'conv1',
    participantId: 'buyer1',
    participantName: 'Maria Santos',
    participantType: 'Buyer',
    lastMessage: 'Is the stock of tomatoes still available?',
    lastMessageTime: '10:30 AM',
    unreadCount: 2,
    participantImage: 'MS'
  },
  {
    id: 'conv2',
    participantId: 'farmer1',
    participantName: 'Juan dela Cruz',
    participantType: 'Farmer',
    lastMessage: 'Your order is ready for pickup!',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    participantImage: 'JD'
  },
  {
    id: 'conv3',
    participantId: 'buyer2',
    participantName: 'Ana Garcia',
    participantType: 'Buyer',
    lastMessage: 'Thank you for the fresh eggs!',
    lastMessageTime: 'Feb 12',
    unreadCount: 0,
    participantImage: 'AG'
  }
];

export const sampleMessages: Message[] = [
  { id: 'm1', senderId: 'buyer1', receiverId: 'me', content: 'Hello! I am interested in your organic tomatoes.', timestamp: '10:25 AM', isRead: true },
  { id: 'm2', senderId: 'me', receiverId: 'buyer1', content: 'Hi Maria! Yes, they are freshly harvested this morning.', timestamp: '10:28 AM', isRead: true },
  { id: 'm3', senderId: 'buyer1', receiverId: 'me', content: 'Is the stock of tomatoes still available?', timestamp: '10:30 AM', isRead: false },
];

export const buyerNotifications: Notification[] = [
  { id: 'bn1', userId: 'buyer', title: 'Order Shipped!', message: 'Your order #ORD-105 (Organic Tomatoes × 5kg) is on its way and will arrive today.', type: 'order', status: 'unread', timestamp: '5m ago', link: '/orders' },
  { id: 'bn2', userId: 'buyer', title: 'Message from Farmer', message: 'Juan dela Cruz: "Your tomatoes are freshly harvested and packed. Ready for pickup!"', type: 'message', status: 'unread', timestamp: '15m ago', link: '/messages' },
  { id: 'bn3', userId: 'buyer', title: 'Order Delivered ✓', message: 'Your order #ORD-104 (Bananas × 10kg) has been successfully delivered. Enjoy!', type: 'order', status: 'read', timestamp: '2h ago', link: '/orders' },
  { id: 'bn4', userId: 'buyer', title: 'Message from Farmer', message: 'Rosa Mendoza: "Thank you for your order! Come back anytime for fresh produce."', type: 'message', status: 'read', timestamp: '1d ago', link: '/messages' },
  { id: 'bn5', userId: 'buyer', title: 'Order Confirmed', message: 'Your order #ORD-106 (Brown Rice × 2kg) has been confirmed by Pedro Reyes.', type: 'order', status: 'read', timestamp: '2d ago', link: '/orders' },
];

export const farmerNotifications: Notification[] = [
  { id: 'fn1', userId: 'farmer', title: 'New Order Received 🎉', message: 'Maria Santos placed a new order for 10kg Organic Tomatoes. Total: ₱850.', type: 'order', status: 'unread', timestamp: '5m ago', link: '/farmer-orders' },
  { id: 'fn2', userId: 'farmer', title: 'Message from Buyer', message: 'Pedro Reyes: "Is the stock of Brown Rice still available? I need 20kg urgently."', type: 'message', status: 'unread', timestamp: '20m ago', link: '/messages' },
  { id: 'fn3', userId: 'farmer', title: 'Order Ready to Ship', message: 'Order #ORD-002 for Ana Garcia is awaiting your confirmation of pickup.', type: 'order', status: 'read', timestamp: '1h ago', link: '/farmer-orders' },
  { id: 'fn4', userId: 'farmer', title: 'Message from Buyer', message: 'Carlos Reyes: "Great produce! I will be ordering again next week."', type: 'message', status: 'read', timestamp: '3h ago', link: '/messages' },
  { id: 'fn5', userId: 'farmer', title: 'Brgy. Badge Awarded 🏅', message: 'Congratulations! Your listing "Organic Tomatoes" has been awarded a Brgy. Verified badge.', type: 'system', status: 'read', timestamp: '1d ago' },
];

// For legacy use
export const sampleNotifications: Notification[] = [...buyerNotifications, ...farmerNotifications];
