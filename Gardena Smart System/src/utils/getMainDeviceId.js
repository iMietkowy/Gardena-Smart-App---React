const getMainDeviceId = updatedService => {
	// 1. Sprawdź, czy usługa ma bezpośredni związek z urządzeniem nadrzędnym
	if (updatedService.relationships?.device?.data?.id) {
		return updatedService.relationships.device.data.id;
	}
	// 2. Sprawdź, czy sama usługa jest głównym urządzeniem lub jej usługą "COMMON"
	if (
		['DEVICE', 'MOWER', 'POWER_SOCKET', 'SMART_IRRIGATION_CONTROL', 'COMMON', 'VALVE_SET'].includes(updatedService.type)
	) {
		return updatedService.id;
	}
	// 3. Obsłuż usługi podrzędne, które mają ID w formacie 'glownyId:podrzędnyId'
	if (updatedService.id.includes(':')) {
		const parts = updatedService.id.split(':');
		// Zmodyfikowany warunek, aby uwzględniał UUID jako 36 znaków
		if (parts[0].length === 36) {
			return parts[0];
		}
	}
	return null; // Zwróć null, jeśli nie można zidentyfikować głównego ID
};

export default getMainDeviceId;
