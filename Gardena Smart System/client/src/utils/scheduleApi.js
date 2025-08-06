/**
 * Generyczna funkcja pomocnicza do wykonywania zapytań fetch.
 * @param {string} url - Adres URL endpointu.
 * @param {object} options - Opcje dla zapytania fetch.
 * @returns {Promise<any>} - Obietnica z danymi w formacie JSON.
 */
const apiClient = async (url, options = {}) => {
	const response = await fetch(url, options);
	if (!response.ok) {
		// Próbuje sparsować błąd z ciała odpowiedzi, jeśli istnieje
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error || `Błąd serwera: ${response.status}`);
	}
	// Zwraca dane JSON, jeśli odpowiedź jest poprawna, nawet jeśli pusta
	return response.json().catch(() => ({}));
};

// Wwszystkie funkcje do zarządzania harmonogramami
export const getSchedules = () => {
	return apiClient('/api/schedules', { cache: 'no-cache' });
};

export const addSchedule = newSchedule => {
	return apiClient('/api/schedules', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(newSchedule),
	});
};

export const toggleSchedule = (id, enabled) => {
	return apiClient(`/api/schedules/${id}/toggle`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ enabled }),
	});
};

export const deleteSchedule = id => {
	return apiClient(`/api/schedules/${id}`, { method: 'DELETE' });
};

export const disableScheduleOnce = id => {
	return apiClient(`/api/schedules/${id}/disable-once`, { method: 'PATCH' });
};

export const performMassAction = (actionType, deviceId) => {
	const isAll = deviceId === 'all';
	let url = '';

	switch (actionType) {
		case 'delete':
			url = isAll ? '/api/schedules/all' : `/api/schedules/device/${deviceId}`;
			return apiClient(url, { method: 'DELETE' });
		case 'disable':
			url = isAll ? '/api/schedules/all/disable' : `/api/schedules/device/${deviceId}/disable`;
			return apiClient(url, { method: 'PATCH' });
		case 'enable':
			url = isAll ? '/api/schedules/all/enable' : `/api/schedules/device/${deviceId}/enable`;
			return apiClient(url, { method: 'PATCH' });
		default:
			throw new Error('Nieznana akcja masowa');
	}
};