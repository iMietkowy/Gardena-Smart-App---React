import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNotificationContext } from './NotificationContext';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
	const [devices, setDevices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

	const { addNotificationToBell, showToastNotification } = useNotificationContext();

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
	};

	const fetchGardenaDevices = useCallback(async () => {
		try {
			setError(null);
			const response = await fetch('/api/gardena/devices');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP Error: ${response.status}`);
			}
			const rawData = await response.json();
			const allIncluded = rawData?.included || [];
			const consolidatedDevicesMap = new Map();

			allIncluded.forEach(item => {
				const mainDeviceTypes = ['DEVICE', 'MOWER', 'POWER_SOCKET', 'SMART_IRRIGATION_CONTROL'];
				if (mainDeviceTypes.includes(item.type)) {
					if (!consolidatedDevicesMap.has(item.id)) {
						consolidatedDevicesMap.set(item.id, {
							id: item.id,
							type: 'UNKNOWN',
							attributes: {},
							relationships: {},
							_serviceTypes: new Set(),
							_valveServices: new Map(),
							_displayName: 'N/A',
							_commonServiceId: null,
						});
					}
				}
			});

			allIncluded.forEach(item => {
				let parentDeviceId = item.relationships?.device?.data?.id;
				let targetDevice = consolidatedDevicesMap.get(parentDeviceId || item.id);
				if (!targetDevice) return;

				targetDevice._serviceTypes.add(item.type);
				if (item.attributes) {
					Object.assign(targetDevice.attributes, item.attributes);
				}

				if (item.type === 'COMMON') {
					if (item.attributes?.name?.value) {
						targetDevice._displayName = item.attributes.name.value;
					}
					targetDevice._commonServiceId = item.id;
				}

				if (item.type === 'VALVE' && targetDevice._valveServices) {
					targetDevice._valveServices.set(item.id, { id: item.id, type: item.type, attributes: item.attributes });
				}
			});

			const finalDevices = Array.from(consolidatedDevicesMap.values()).map(device => {
				const serviceTypes = device._serviceTypes;
				let determinedType = 'DEVICE';
				if (serviceTypes.has('MOWER')) determinedType = 'MOWER';
				else if (
					serviceTypes.has('VALVE_SET') ||
					serviceTypes.has('VALVE') ||
					serviceTypes.has('SMART_IRRIGATION_CONTROL')
				) {
					determinedType = 'SMART_WATERING_COMPUTER';
				} else if (serviceTypes.has('POWER_SOCKET')) determinedType = 'SMART_PLUG';

				if (determinedType === 'SMART_WATERING_COMPUTER' && device._valveServices.size === 0) {
			
					device._valveServices.set(device.id, {
						id: device.id,
						type: 'SELF_VALVE', 
						attributes: device.attributes, 
					});
				}

				return {
					...device,
					type: determinedType,
					displayName: device._displayName,
					commonServiceId: device._commonServiceId,
					_serviceTypes: undefined, 
					_displayName: undefined, 
					_valveServices: Array.from(device._valveServices.values()), 
				};
			});
			setDevices(finalDevices);
            console.log('[AppContext] Urządzenia załadowane:', finalDevices);
		} catch (err) {
			setError(`Failed to fetch devices: ${err.message}.`);
            console.error('[AppContext] Błąd ładowania urządzeń:', err);
		}
	}, []);

	useEffect(() => {
		const initialFetch = async () => {
			setLoading(true);
			await fetchGardenaDevices();
			setLoading(false);
		};
		initialFetch();

       
		const socket = new WebSocket(`ws://${window.location.hostname}:3001`);

		socket.onopen = () => console.log('[WebSocket] Połączono z serwerem.'), console.trace('no zobaczmy');
		socket.onclose = (event) => console.log('[WebSocket] Rozłączono.', event.code, event.reason, console.trace('no zobaczmy'));
		socket.onerror = err => console.error('[WebSocket] Błąd:', err);

		socket.onmessage = event => {
			try {
				const updatedService = JSON.parse(event.data);
                console.log('[WebSocket Message Received Raw]', updatedService);

				setDevices(prevDevices => {
                    let mainDeviceIdToUpdate = null;

                    
                    if (updatedService.relationships?.device?.data?.id) {
                        mainDeviceIdToUpdate = updatedService.relationships.device.data.id;
                    }
                 
                    else if (['DEVICE', 'MOWER', 'POWER_SOCKET', 'SMART_IRRIGATION_CONTROL', 'COMMON', 'VALVE_SET'].includes(updatedService.type)) {
                        mainDeviceIdToUpdate = updatedService.id;
                    }
                    
                    else if (updatedService.id.includes(':')) {
                        const parts = updatedService.id.split(':');
                        if (parts[0].length === 36) { 
                            mainDeviceIdToUpdate = parts[0];
                        }
                    }
                    
                    if (!mainDeviceIdToUpdate) {
                        console.warn('[AppContext] Nie mogę zidentyfikować ID głównego urządzenia dla aktualizacji:', updatedService);
                        return prevDevices; 
                    }

                    console.log('[AppContext] Identyfikuję główne urządzenie do aktualizacji z ID:', mainDeviceIdToUpdate);

					const oldDeviceState = prevDevices.find(d => d.id === mainDeviceIdToUpdate);

					if (!oldDeviceState) {
						console.warn('[AppContext] Otrzymano aktualizację dla nieznanego GŁÓWNEGO urządzenia:', mainDeviceIdToUpdate, 'Wiadomość:', updatedService);
						return prevDevices;
					}

					const newDevices = prevDevices.map(device => {
						if (device.id === mainDeviceIdToUpdate) {
							const newDevice = JSON.parse(JSON.stringify(device));
                            
                      
                            if (['DEVICE', 'MOWER', 'POWER_SOCKET', 'SMART_IRRIGATION_CONTROL', 'COMMON', 'VALVE_SET'].includes(updatedService.type)) {
                                Object.assign(newDevice.attributes, updatedService.attributes);
                            }

							
							if (updatedService.type === 'VALVE' && newDevice.type === 'SMART_WATERING_COMPUTER') {
								const updatedValveId = updatedService.id;
								newDevice._valveServices = newDevice._valveServices.map(valve => {
									if (valve.id === updatedValveId) {
										
										return { ...valve, attributes: { ...valve.attributes, ...updatedService.attributes } };
									}
									return valve;
								});
							}
                            
                            console.log('[AppContext] Urządzenie po aktualizacji (w setDevices):', newDevice);
							return newDevice;
						}
						return device;
					});
                    console.log('[AppContext] Nowa tablica urządzeń (w setDevices):', newDevices);
					return newDevices;
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
	}, [fetchGardenaDevices, addNotificationToBell, showToastNotification]);

    
    const prevDevicesRef = useRef([]);

    useEffect(() => {
        
        if (prevDevicesRef.current.length > 0) {
            devices.forEach(currentDevice => {
                const prevDevice = prevDevicesRef.current.find(d => d.id === currentDevice.id);

                if (prevDevice && currentDevice.type === 'MOWER') {
                    const wasMowing = prevDevice.attributes?.activity?.value === 'mowing' || prevDevice.attributes?.activity?.value === 'ok_cutting';
                    const isNowParkedOrCharging = currentDevice.attributes?.activity?.value === 'parked' || currentDevice.attributes?.activity?.value === 'charging';

                    if (wasMowing && isNowParkedOrCharging) {
                        addNotificationToBell(`Kosiarka "${currentDevice.displayName}" zakończyła koszenie.`, 'success');
                        showToastNotification(`Kosiarka "${currentDevice.displayName}" zakończyła koszenie.`, 'success');
                    }
                }
            });
        }
        
        prevDevicesRef.current = devices;
    }, [devices, addNotificationToBell, showToastNotification]);


	const value = {
		devices,
		loading,
		error,
		theme,
		toggleTheme,
		fetchGardenaDevices,
	};

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
	return useContext(AppContext);
};