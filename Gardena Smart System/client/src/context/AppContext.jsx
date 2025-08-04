import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNotificationContext } from './NotificationContext';
import getMainDeviceId from '@/utils/getMainDeviceId';
import { transformGardenaData } from '@/utils/gardenaDataTransformer';
import { apiClient } from '@/utils/apiClient';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
	const [devices, setDevices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
	const [isAuthenticated, setIsAuthenticated] = useState(null);
	const [user, setUser] = useState(null);

	const { addNotificationToBell, showToastNotification } = useNotificationContext();

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
	};

	const fetchGardenaDevices = useCallback(async () => {
		if (!isAuthenticated) return;
		try {
			setLoading(true);
			setError(null);
			// Użycie apiClient zamiast fetch
			const rawData = await apiClient('/api/gardena/devices');
			const finalDevices = transformGardenaData(rawData);

			setDevices(finalDevices);
			console.log('[AppContext] Urządzenia załadowane:', finalDevices);
		} catch (err) {
			setError(`Failed to fetch devices: ${err.message}.`);
			console.error('[AppContext] Błąd ładowania urządzeń:', err);
		} finally {
			setLoading(false);
		}
	}, [isAuthenticated]);

	//Funkcje do zarządzania autoryzacją
	const checkAuthStatus = useCallback(async () => {
		try {
			// Użycie apiClient zamiast fetch
			const data = await apiClient('/api/check-auth');
			if (data.isAuthenticated) {
				setIsAuthenticated(true);
				setUser(data.username);
			} else {
				setIsAuthenticated(false);
				setUser(null);
			}
		} catch (err) {
			console.error('Błąd sprawdzania statusu autoryzacji:', err);
			setIsAuthenticated(false);
			setUser(null);
		}
	}, []);

	useEffect(() => {
		if (isAuthenticated) {
			fetchGardenaDevices();
		}
	}, [isAuthenticated, fetchGardenaDevices]);

	const login = username => {
		setIsAuthenticated(true);
		setUser(username);
	};

	const logout = async () => {
		try {
			//Użycie apiClient zamiast fetch
			await apiClient('/api/logout', { method: 'POST' });
		} catch (err) {
			console.error('Błąd podczas wylogowywania:', err);
		} finally {
			setIsAuthenticated(false);
			setUser(null);
			setDevices([]);
		}
	};

	useEffect(() => {
		checkAuthStatus();
	}, [checkAuthStatus]);

	useEffect(() => {
		if (isAuthenticated) {
			// Dynamiczne tworzenie adresu URL dla WebSocket w zależności od środowiska
			const isProduction = import.meta.env.PROD;
			const backendUrl = isProduction ? import.meta.env.VITE_BACKEND_URL : 'http://localhost:3001';

			if (!backendUrl) {
				console.error(
					'Adres backendu (VITE_BACKEND_URL) nie jest zdefiniowany! Połączenie WebSocket nie zostanie nawiązane.'
				);
				return;
			}

			const socketUrl = new URL(backendUrl);
			const wsProtocol = socketUrl.protocol === 'https:' ? 'wss' : 'ws';
			const socket = new WebSocket(`${wsProtocol}://${socketUrl.host}`);

			socket.onopen = () => console.log('[WebSocket] Połączono z serwerem.');
			socket.onclose = event => console.log('[WebSocket] Rozłączono.', event.code, event.reason);
			socket.onerror = err => console.error('[WebSocket] Błąd:', err);

			socket.onmessage = event => {
				try {
					const updatedService = JSON.parse(event.data);
					console.log('[WebSocket Message Received Raw]', updatedService);

					const mainDeviceIdToUpdate = getMainDeviceId(updatedService);

					if (!mainDeviceIdToUpdate) {
						console.warn(
							'[AppContext] Nie mogę zidentyfikować ID głównego urządzenia dla aktualizacji:',
							updatedService
						);
						return;
					}

					setDevices(prevDevices => {
						return prevDevices.map(device => {
							if (device.id === mainDeviceIdToUpdate) {
								const newDevice = JSON.parse(JSON.stringify(device));

								if (
									['DEVICE', 'MOWER', 'POWER_SOCKET', 'SMART_IRRIGATION_CONTROL', 'COMMON', 'VALVE_SET'].includes(
										updatedService.type
									)
								) {
									Object.assign(newDevice.attributes, updatedService.attributes);
								}

								if (updatedService.type === 'VALVE' && newDevice.type === 'SMART_WATERING_COMPUTER') {
									newDevice._valveServices = newDevice._valveServices.map(valve => {
										if (valve.id === updatedService.id) {
											return { ...valve, attributes: { ...valve.attributes, ...updatedService.attributes } };
										}
										return valve;
									});
								}
								return newDevice;
							}
							return device;
						});
					});
				} catch (e) {
					console.error('[AppContext] Błąd przetwarzania wiadomości WebSocket:', e);
					showToastNotification('Wystąpił błąd podczas aktualizacji danych urządzenia z serwera.', 'error');
				}
			};

			return () => {
				console.log('[WebSocket] Zamykam połączenie...');
				socket.close();
			};
		}
	}, [isAuthenticated, showToastNotification]);

	const prevDevicesRef = useRef([]);

	useEffect(() => {
		if (isAuthenticated && prevDevicesRef.current.length > 0) {
			devices.forEach(currentDevice => {
				const prevDevice = prevDevicesRef.current.find(d => d.id === currentDevice.id);

				if (prevDevice && currentDevice.type === 'MOWER') {
					const wasMowing = ['mowing', 'ok_cutting'].includes(prevDevice.attributes?.activity?.value);
					const isNowParkedOrCharging = ['parked', 'charging'].includes(currentDevice.attributes?.activity?.value);

					if (wasMowing && isNowParkedOrCharging) {
						addNotificationToBell(`Kosiarka "${currentDevice.displayName}" zakończyła koszenie.`, 'success');
						showToastNotification(`Kosiarka "${currentDevice.displayName}" zakończyła koszenie.`, 'success');
					}
				}
			});
		}
		prevDevicesRef.current = devices;
	}, [devices, isAuthenticated, addNotificationToBell, showToastNotification]);

	const value = {
		devices,
		loading,
		error,
		theme,
		toggleTheme,
		fetchGardenaDevices,
		isAuthenticated,
		user,
		login,
		logout,
		checkAuthStatus,
	};

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
	return useContext(AppContext);
};
