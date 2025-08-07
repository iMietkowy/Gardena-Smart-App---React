const statusMap = {
	// Statusy "OK" / Pozytywne
	ONLINE: { text: 'Online', className: 'status-ok' },
	OK: { text: 'W porządku', className: 'status-ok' },
	ON: { text: 'Włączony', className: 'status-ok' },
	MOWING: { text: 'Koszenie (ręczne)', className: 'status-ok' },
	OK_CUTTING: { text: 'Koszenie (harmonogram)', className: 'status-ok' },
	OK_CUTTING_TIMER_OVERRIDDEN: { text: 'Koszenie (ręczne)', className: 'status-ok' },
	CHARGING: { text: 'Ładowanie', className: 'status-ok' },
	OK_CHARGING: { text: 'Ładowanie', className: 'status-ok' },
	RUNNING: { text: 'Działa', className: 'status-ok' },
	OPEN: { text: 'Otwarte', className: 'status-ok' },
	MANUAL_WATERING: { text: 'Podlewanie (ręczne)', className: 'status-ok' },
	SCHEDULED_MOWING: { text: 'Koszenie (harmonogram)', className: 'status-ok' },
	SCHEDULED_WATERING: { text: 'Podlewanie (harmonogram)', className: 'status-ok' },
	OK_LEAVING: { text: 'Opuszcza stację', className: 'status-ok' },
	OK_SEARCHING: { text: 'Powrót do bazy', className: 'status-ok' },
	INITIATE_NEXT_ACTION: { text: 'Następne działanie', className: 'status-ok' },

	// Statusy "Ostrzeżenie" / Neutralne / Oczekujące
	PAUSED: { text: 'Wstrzymano', className: 'status-warn' },
	OFF: { text: 'Wyłączony', className: 'status-warn' },
	IDLE: { text: 'Bezczynny', className: 'status-warn' },
	PARKED: { text: 'Zaparkowany', className: 'status-warn' },
	PARKED_TIMER: { text: 'Zaparkowany', className: 'status-warn' },
	PARKED_UNTIL_NEXT_TASK: { text: 'Zaparkowany (wg harmonogramu)', className: 'status-warn' },
	PARKED_UNTIL_FURTHER_NOTICE: { text: 'Zaparkowany (do odwołania)', className: 'status-warn' },
	PARKED_PARK_SELECTED: { text: 'Zaparkowany (do odwołania)', className: 'status-warn' },
	PAUSED_IN_CS: { text: 'Wstrzymano w Bazie', className: 'status-warn' },
	UNAVAILABLE: { text: 'Uśpiony', className: 'status-warn' },
	CLOSED: { text: 'Zamknięte', className: 'status-warn' },
	WARNING: { text: 'Ostrzeżenie', className: 'status-warn' },
	PARKED_AUTOTIMER: { text: 'Zaparkowany (Sensor Control)', className: 'status-warn' },
	PARKED_FROST: { text: 'Niska temperatura (zaparkowany)', className: 'status-warn' },
	STOPPED_IN_GARDEN: { text: 'Zatrzymano w ogrodzie', className: 'status-warn' },
	SEARCHING_FOR_SATELLITES: { text: 'Szukam satelity', className: 'status-warn' },
	NONE: { text: 'Brak', className: 'status-warn' },

	// Statusy "Błąd" / Negatywne
	OFFLINE: { text: 'Offline', className: 'status-error' },
	ERROR: { text: 'Błąd', className: 'status-error' },
};

/**
 * Przetwarza surową wartość statusu na obiekt z klasą CSS i przetłumaczonym tekstem.
 * @param {string} value - Wartość statusu z API.
 * @returns {{className: string, text: string}}
 */
export const getStatusInfo = value => {
	if (value === undefined || value === null) {
		return { className: '', text: '' };
	}
	const upperValue = String(value).toUpperCase();
	// Zwróć zdefiniowany obiekt lub domyślny, jeśli status nie został znaleziony
	return statusMap[upperValue] || { className: '', text: String(value) };
};

/**
 * Funkcja do tłumaczenia błędów kosiarki
 * @param {string} errorCode - Kod błędu zaworu z API Gardena.
 * @returns {string} Przetłumaczony komunikat o błędzie.
 */

export const getMowerErrorInfo = errorCode => {
	if (!errorCode) return null;

	switch (errorCode.toUpperCase()) {
		case 'NO_MESSAGE':
			return 'Brak wiadomości';
		case 'OUTSIDE_WORKING_AREA':
			return 'Poza obszarem roboczym';
		case 'NO_LOOP_SIGNAL':
			return 'Brak sygnału w przewodzie pętli';
		// ... reszta kodów błędów kosiarki (bez zmian)
		default:
			return `Nieznany błąd: ${errorCode}`;
	}
};

/**
 * Funkcja do tłumaczenia błędów zaworów
 * @param {string} errorCode - Kod błędu zaworu z API Gardena.
 * @returns {string} Przetłumaczony komunikat o błędzie.
 */
export const getValveErrorInfo = errorCode => {
	if (!errorCode) return null;

	switch (errorCode.toUpperCase()) {
		case 'NO_MESSAGE':
			return 'Brak wiadomości';
		// ... reszta kodów błędów zaworów (bez zmian)
		default:
			return `Nieznany błąd zaworu: ${errorCode}`;
	}
};

/**
 * Funkcja do tłumaczenia błędów głównego sterownika nawadniania
 * @param {string} errorCode - Kod błędu głównego sterownika nawadniania z API Gardena.
 * @returns {string} Przetłumaczony komunikat o błędzie.
 */
export const getWateringControllerErrorInfo = errorCode => {
	if (!errorCode) return null;

	switch (errorCode.toUpperCase()) {
		case 'NO_MESSAGE':
			return 'Brak błędu';
		// ... reszta kodów błędów sterownika (bez zmian)
		default:
			return `Nieznany błąd sterownika: ${errorCode}`;
	}
};

/**
 * Generuje skonsolidowany obiekt statusu dla nagłówka aplikacji.
 * @param {object} device - Obiekt urządzenia.
 * @returns {{displayName: string, statusMessage: string, dotClass: string}}
 */
export const getConsolidatedDeviceStatus = device => {
	if (!device) return { displayName: 'Brak urządzenia', statusMessage: '', dotClass: 'status-unknown' };

	const attributes = device.attributes;
	const deviceName = device.displayName;
	let statusMessage = '';
	let dotClass = 'status-unknown';

	const rfLinkState = attributes?.rfLinkState?.value?.toLowerCase();
	const generalState = attributes?.state?.value?.toLowerCase();
	const activity = attributes?.activity?.value?.toLowerCase();

	if (rfLinkState === 'offline' || generalState === 'offline') {
		statusMessage = `OFFLINE`;
		dotClass = 'status-offline';
	} else if (rfLinkState === 'online') {
		if (device.type === 'MOWER') {
			if (generalState === 'ok') {
				if (activity === 'mowing') {
					statusMessage = `KOSZENIE AKTYWNE`;
					dotClass = 'status-online';
				} else if (activity === 'charging') {
					statusMessage = `ŁADOWANIE (${attributes?.batteryLevel?.value !== undefined ? attributes.batteryLevel.value : 'N/A'}%)`;
					dotClass = 'status-charging';
				} else if (['parked', 'none', 'idle', 'paused'].includes(activity)) {
					statusMessage = `GOTOWY`;
					dotClass = 'status-ready';
				} else {
					statusMessage = `ONLINE`;
					dotClass = 'status-online';
				}
			} else {
				const stateInfo = getStatusInfo(generalState);
				statusMessage = `: ${stateInfo.text.toUpperCase()}`; // Wyświetlamy przetłumaczony stan
				dotClass = stateInfo.className === 'status-ok' ? 'status-ready' : 'status-problem';
			}
		} else if (device.type === 'SMART_WATERING_COMPUTER') {
			if (generalState === 'ok') {
				if (['running', 'open', 'manual_watering'].includes(activity)) {
					statusMessage = `PODLEWANIE`;
					dotClass = 'status-online';
				} else {
					statusMessage = `GOTOWY`;
					dotClass = 'status-ready';
				}
			} else {
				const stateInfo = getStatusInfo(generalState);
				statusMessage = `ONLINE (${stateInfo.text})`;
				dotClass = 'status-ready';
			}
		} else if (device.type === 'SMART_PLUG') {
			statusMessage = `ONLINE`;
			dotClass = 'status-online';
		} else {
			statusMessage = `ONLINE`;
			dotClass = 'status-online';
		}
	} else {
		statusMessage = `STATUS NIEZNANY`;
		dotClass = 'status-unknown';
	}
	return { displayName: deviceName, statusMessage: statusMessage, dotClass: dotClass };
};
