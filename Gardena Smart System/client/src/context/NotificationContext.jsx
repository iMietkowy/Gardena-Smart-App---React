import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';

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

	// Memoizuje funkcje za pomocą useCallback, aby miały stabilne referencje
	const addNotificationToBell = useCallback((message, type = 'info') => {
		setNotifications(prev => [
			...prev.slice(-9), // Zachowaj tylko 10 ostatnich powiadomień
			{ id: Date.now(), message, type, timestamp: new Date(), read: false },
		]);
	}, []);

	const showToastNotification = useCallback((message, type = 'info') => {
		const id = Date.now();
		setToastNotifications(prev => [...prev, { id, message, type }]);
	}, []);

	const dismissToast = useCallback(id => {
		setToastNotifications(prev => prev.filter(toast => toast.id !== id));
	}, []);

	const markNotificationAsRead = useCallback(id => {
		setNotifications(prev => prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif)));
	}, []);

	// Memoizuje obiekt 'value' za pomocą useMemo, aby zapobiec niepotrzebnym re-renderom konsumentów kontekstu
	const value = useMemo(
		() => ({
			notifications,
			toastNotifications,
			setNotifications,
			addNotificationToBell,
			showToastNotification,
			dismissToast,
			markNotificationAsRead,
		}),
		[
			notifications,
			toastNotifications,
			addNotificationToBell,
			showToastNotification,
			dismissToast,
			markNotificationAsRead,
		]
	);

	return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => {
	return useContext(NotificationContext);
};
