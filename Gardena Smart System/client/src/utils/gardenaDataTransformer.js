/**
 * Przekształca surowe dane z API Gardena (z tablicy 'included')
 * w ustrukturyzowaną listę urządzeń gotową do użycia w aplikacji.
 * @param {object} rawData - Surowy obiekt odpowiedzi z API Gardena.
 * @returns {Array} - Przetworzona tablica obiektów urządzeń.
 */
export const transformGardenaData = rawData => {
	const allIncluded = rawData?.included || [];
	const consolidatedDevicesMap = new Map();

	// Inicjalizacja mapy głównymi urządzeniami
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

	// Agregacja danych z różnych serwisów do głównych urządzeń
	allIncluded.forEach(item => {
		const parentDeviceId = item.relationships?.device?.data?.id;
		const targetDevice = consolidatedDevicesMap.get(parentDeviceId || item.id);
		if (!targetDevice) return;

		targetDevice._serviceTypes.add(item.type);
		if (item.attributes) {
			Object.assign(targetDevice.attributes, item.attributes);
		}

		if (item.type === 'COMMON' && item.attributes?.name?.value) {
			targetDevice._displayName = item.attributes.name.value;
			targetDevice._commonServiceId = item.id;
		}

		if (item.type === 'VALVE' && targetDevice._valveServices) {
			targetDevice._valveServices.set(item.id, { id: item.id, type: item.type, attributes: item.attributes });
		}
	});

	// Finalne przetworzenie i określenie typu każdego urządzenia
	const finalDevices = Array.from(consolidatedDevicesMap.values()).map(device => {
		const serviceTypes = device._serviceTypes;
		let determinedType = 'DEVICE';
		if (serviceTypes.has('MOWER')) {
			determinedType = 'MOWER';
		} else if (
			serviceTypes.has('VALVE_SET') ||
			serviceTypes.has('VALVE') ||
			serviceTypes.has('SMART_IRRIGATION_CONTROL')
		) {
			determinedType = 'SMART_WATERING_COMPUTER';
		} else if (serviceTypes.has('POWER_SOCKET')) {
			determinedType = 'SMART_PLUG';
		}

		// Specjalna obsługa dla sterowników nawadniania bez zewnętrznych zaworów
		if (determinedType === 'SMART_WATERING_COMPUTER' && device._valveServices.size === 0) {
			device._valveServices.set(device.id, {
				id: device.id,
				type: 'SELF_VALVE',
				attributes: device.attributes,
			});
		}

		return {
			id: device.id,
			type: determinedType,
			displayName: device._displayName,
			commonServiceId: device._commonServiceId,
			attributes: device.attributes,
			relationships: device.relationships,
			_valveServices: Array.from(device._valveServices.values()),
		};
	});

	return finalDevices;
};
