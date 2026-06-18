import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppNotification } from '../firebase/types';

interface NotificationContextProps {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: AppNotification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // Track the timestamp of when this provider mounted to avoid fetching old notifications.
  const [mountTime] = useState<Timestamp>(Timestamp.now());

  // Helper to add notification while preventing duplicates
  const addNotification = (newNotif: AppNotification) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === newNotif.id)) return prev;
      // Keep sorted by newest first
      const updated = [newNotif, ...prev];
      updated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return updated;
    });
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    // 1. Listen to Top-ups (approvals, rejections, or new pending kiosk requests)
    const topupsQuery = query(
      collection(db, 'topups'),
      where('createdAt', '>=', mountTime)
    );

    const unsubscribeTopups = onSnapshot(topupsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        
        // We only care about added or modified requests that happened AFTER we mounted
        if (change.type === 'added' || change.type === 'modified') {
          let title = 'Top-Up Update';
          let message = 'A top-up request has been updated.';
          let status: AppNotification['status'] = 'pending';

          if (data.status === 'pending' && data.source === 'kiosk') {
            title = 'New Top-Up Request';
            message = `${data.userName} requested ₱${data.amount.toFixed(2)}`;
            status = 'pending';
          } else if (data.status === 'approved') {
            title = 'Top-Up Approved';
            message = `₱${data.amount.toFixed(2)} top-up for ${data.userName} was approved.`;
            status = 'approved';
          } else if (data.status === 'rejected') {
            title = 'Top-Up Rejected';
            message = `₱${data.amount.toFixed(2)} top-up for ${data.userName} was rejected.`;
            status = 'rejected';
          }

          addNotification({
            id: `topup_${change.doc.id}_${data.status}`, // Composite ID prevents duplicates while allowing status change notifications
            title,
            message,
            type: 'topup',
            status,
            createdAt: new Date(), // We use the exact time it was received in the UI
            isRead: false,
          });
        }
      });
    }, (error) => {
      console.error('Error listening to topups for notifications:', error);
    });

    // 2. Listen to Orders (new kiosk transactions)
    const ordersQuery = query(
      collection(db, 'orders'),
      where('createdAt', '>=', mountTime)
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          addNotification({
            id: `order_${change.doc.id}`,
            title: 'New Order Received',
            message: `Order ${data.orderId || change.doc.id} received for ₱${(data.totalAmount || 0).toFixed(2)}`,
            type: 'order',
            status: 'new',
            createdAt: new Date(),
            isRead: false,
          });
        }
      });
    }, (error) => {
      console.error('Error listening to orders for notifications:', error);
    });

    return () => {
      unsubscribeTopups();
      unsubscribeOrders();
    };
  }, [mountTime]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextProps => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
