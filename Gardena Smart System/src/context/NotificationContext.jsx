import React, { createContext, useState, useEffect, useContext } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
	const [notifications, setNotifications] = useState(() => {
		try {
			const saved = localStorage.getItem('gardena_notifications');
			if (saved) {
				return JSON.parse(saved).map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
			}
			return [];
		} catch (e) {
			console.error('Failed to parse notifications from localStorage', e);
			return [];
		}
	});

	const [toastNotifications, setToastNotifications] = useState([]);

	useEffect(() => {
		try {
			const serializable = notifications.map(n => ({ ...n, timestamp: n.timestamp.toISOString() }));
			localStorage.setItem('gardena_notifications', JSON.stringify(serializable));
		} catch (error) {
			console.error('Error saving notifications to localStorage:', error);
		}
	}, [notifications]);

	const addNotificationToBell = (message, type = 'info') => {
		setNotifications(prev => [
			...prev.slice(-9),
			{ id: Date.now(), message, type, timestamp: new Date(), read: false },
		]);
	};

	const showToastNotification = (message, type = 'info') => {
		const id = Date.now();
		setToastNotifications(prev => [...prev, { id, message, type }]);
	};

	const dismissToast = id => {
		setToastNotifications(prev => prev.filter(toast => toast.id !== id));
	};

	const markNotificationAsRead = id => {
		setNotifications(prev => prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif)));
	};

	const value = {
		notifications,
		toastNotifications,
		setNotifications,
		addNotificationToBell,
		showToastNotification,
		dismissToast,
		markNotificationAsRead,
	};

	return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => {
	return useContext(NotificationContext);
};
