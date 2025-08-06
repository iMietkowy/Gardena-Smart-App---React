import React, { createContext, useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useNotificationContext } from './NotificationContext';
import getMainDeviceId from '@/utils/getMainDeviceId';
import { transformGardenaData } from '@/utils/gardenaDataTransformer';
import { apiClient } from '@/utils/apiClient';
import { getMowerErrorInfo } from '@/utils/statusUtils';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
	const [devices, setDevices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
	const [isAuthenticated, setIsAuthenticated] = useState(null);
	const [user, setUser] = useState(null);

	const { addNotificationToBell, showToastNotification } = useNotificationContext();
	const wsRef = useRef(null); 
	const isClosingRef = useRef(false); 

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

	const checkAuthStatus = useCallback(async () => {
		try {
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

	// --- LOGIKA WEBSOCKET Z OBSŁUGĄ CYKLU ŻYCIA ---
	useEffect(() => {
		if (isAuthenticated === true) {
			const backendUrl = import.meta.env.VITE_BACKEND_URL;
			
			let wsUrl;
			if (backendUrl) {
				const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
				wsUrl = `${wsProtocol}://${new URL(backendUrl).host}/ws`;
			} else {
				// Logika dla środowiska produkcyjnego (Render.com)
				const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
				wsUrl = `${wsProtocol}://${window.location.host}/ws`;
			}

			console.log('[AppContext] Uwierzytelniono. Próba połączenia z WebSocket pod adresem:', wsUrl);
			
			const socket = new WebSocket(wsUrl);
			wsRef.current = socket; 

			socket.onopen = () => console.log('[WebSocket] Połączono z serwerem.');
			
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
						const nextDevices = prevDevices.map(device => {
							if (device.id === mainDeviceIdToUpdate) {
								const newDevice = { ...device };
								
								// Aktualizacja atrybutów głównego urządzenia
								if (
									['DEVICE', 'MOWER', 'POWER_SOCKET', 'SMART_IRRIGATION_CONTROL', 'COMMON', 'VALVE_SET'].includes(
										updatedService.type
									)
								) {
									newDevice.attributes = { ...newDevice.attributes, ...updatedService.attributes };
								}

								// Aktualizacja atrybutów zaworów
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
						return nextDevices;
					});
				} catch (e) {
					console.error('[AppContext] Błąd przetwarzania wiadomości WebSocket:', e);
					showToastNotification('Wystąpił błąd podczas aktualizacji danych urządzenia z serwera.', 'error');
				}
			};

			socket.onclose = event => {
				if (!isClosingRef.current) {
					console.log(`[WebSocket] Rozłączono: ${event.code}. Ponowna próba za 5 sekund...`);
					setTimeout(() => {
						if (isAuthenticated) {
							console.log('[WebSocket] Ponowna próba połączenia...');
							fetchGardenaDevices();
						}
					}, 5000);
				}
			};
			socket.onerror = err => console.error('[WebSocket] Błąd:', err);

			return () => {
				if (socket.readyState === WebSocket.OPEN) {
					isClosingRef.current = true;
					console.log('[WebSocket] Zamykam połączenie...');
					socket.close();
				}
			};
		}
	}, [isAuthenticated, showToastNotification, fetchGardenaDevices]);

	const prevDevicesRef = useRef([]);

	useEffect(() => {
		// Uruchomienie tej logiki tylko po początkowym załadowaniu urządzeń i gdy użytkownik jest uwierzytelniony
		if (isAuthenticated && devices.length > 0 && prevDevicesRef.current.length > 0) { 
			devices.forEach(currentDevice => {
				const prevDevice = prevDevicesRef.current.find(d => d.id === currentDevice.id);

				if (!prevDevice) return; 

				// Logika powiadomień dla kosiarek
				if (currentDevice.type === 'MOWER') {
					// Zaktualizowano: Rozszerzono stany "było koszenie", aby uwzględnić również stany przejściowe po koszeniu
					const wasMowingOrSearching = ['mowing', 'ok_cutting', 'ok_searching'].includes(prevDevice.attributes?.activity?.value?.toLowerCase());
					
					const isNowParkedOrCharging = [
						'parked', 
						'charging', 
						'parked_autotimer', 
						'parked_frost',     
						'parked_timer',
						'parked_until_next_task',
						'parked_until_further_notice'
					].includes(currentDevice.attributes?.activity?.value?.toLowerCase());

					if (wasMowingOrSearching && isNowParkedOrCharging) { 
						addNotificationToBell(`Kosiarka "${currentDevice.displayName}" zakończyła koszenie.`, 'success');
						showToastNotification(`Kosiarka "${currentDevice.displayName}" zakończyła koszenie.`, 'success');
					}

					// --- Powiadomienie o błędzie kosiarki ---
					const wasOkState = prevDevice.attributes?.state?.value?.toLowerCase() === 'ok';
					const isNowErrorOrWarningState = ['error', 'warning'].includes(currentDevice.attributes?.state?.value?.toLowerCase());
					const errorMessage = getMowerErrorInfo(currentDevice.attributes?.lastErrorCode?.value);

					if (wasOkState && isNowErrorOrWarningState && errorMessage) {
						addNotificationToBell(`Błąd kosiarki "${currentDevice.displayName}": ${errorMessage}`, 'error');
						showToastNotification(`Błąd kosiarki "${currentDevice.displayName}": ${errorMessage}`, 'error');
					}
					
				}

				// --- LOGIKA POWIADOMIEŃ DLA STEROWNIKÓW NAWADNIANIA ---
				if (currentDevice.type === 'SMART_WATERING_COMPUTER') {
					const prevValves = prevDevice._valveServices || [];
					const currentValves = currentDevice._valveServices || [];

					currentValves.forEach(currentValve => {
						const prevValve = prevValves.find(v => v.id === currentValve.id);
						if (!prevValve) return; 

						const wasWatering = ['manual_watering', 'scheduled_watering', 'running', 'open'].includes(prevValve.attributes?.activity?.value?.toLowerCase());
						const isNowClosed = ['closed'].includes(currentValve.attributes?.activity?.value?.toLowerCase());

						if (wasWatering && isNowClosed) {
							const valveName = currentValve.attributes?.name?.value || `Zawór ${currentValve.id.split(':').pop()}`;
							addNotificationToBell(`Podlewanie przez "${valveName}" zakończyło się.`, 'success');
							showToastNotification(`Podlewanie przez "${valveName}" zakończyło się.`, 'success');
						}
					});
				}
			
			});
		}
		// Zawsze aktualizuj ref, aby mieć aktualny stan poprzednich urządzeń
		prevDevicesRef.current = devices;
	}, [devices, isAuthenticated, addNotificationToBell, showToastNotification]);

	const value = useMemo(() => ({
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
	}), [
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
	]);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
	return useContext(AppContext);
};
