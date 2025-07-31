//Przetwarza surową wartość statusu na obiekt z klasą CSS i przetłumaczonym tekstem.

export const getStatusInfo = value => {
	if (value === undefined || value === null) {
		return { className: '', text: '' };
	}

	const upperValue = String(value).toUpperCase();
	let className = '';
	let text = String(value);

	switch (upperValue) {
		case 'ONLINE':
		case 'OK':
		case 'ON':
		case 'MOWING':
		case 'OK_CUTTING':
		case 'OK_CUTTING_TIMER_OVERRIDDEN':
		case 'CHARGING':
		case 'OK_CHARGING':
		case 'RUNNING':
		case 'OPEN':
		case 'MANUAL_WATERING':
		case 'SCHEDULED_MOWING':
		case 'SCHEDULED_WATERING':
		case 'OK_LEAVING':
		case 'OK_SEARCHING':
		case 'INITIATE_NEXT_ACTION':
			className = 'status-ok';
			break;
		case 'PAUSED':
		case 'OFF':	
		case 'IDLE':
		case 'PARKED':
		case 'PARKED_TIMER':
		case 'PARKED_UNTIL_NEXT_TASK':
		case 'PARKED_UNTIL_FURTHER_NOTICE':
		case 'PAUSED_IN_CS':
		case 'UNAVAILABLE':
		case 'CLOSED':
		case 'WARNING':
		case 'PARKED_AUTOTIMER':
		case 'PARKED_FROST':
		case 'STOPPED_IN_GARDEN':
		case 'SEARCHING_FOR_SATELLITES':
			className = 'status-warn';
			break;
		case 'OFFLINE':
		case 'ERROR':
			className = 'status-error';
			break;
	}

	switch (upperValue) {
		case 'ONLINE':
			text = 'Online';
			break;
		case 'OFFLINE':
			text = 'Offline';
			break;
		case 'OK':
			text = 'W porządku';
			break;
		case 'ERROR':
			text = 'Błąd';
			break;
		case 'WARNING':
			text = 'Ostrzeżenie';
			break;
		case 'PAUSED':
			text = 'Wstrzymano';
			break;
		case 'PAUSED_IN_CS':
			text = 'Wtrzymano w Bazie';
		case 'MOWING':
		case 'OK_CUTTING_TIMER_OVERRIDDEN':
			text = 'Koszenie (ręczne)';
			break;
		case 'OK_CUTTING':
		case 'SCHEDULED_MOWING':
			text = 'Koszenie (harmonogram)';
			break;
		case 'CHARGING':
		case 'OK_CHARGING':
			text = 'Ładowanie';
			break;
		case 'PARKED':
		case 'PARKED_TIMER':
			text = 'Zaparkowany';
			break;
		case 'IDLE':
			text = 'Bezczynny';
			break;
		case 'UNAVAILABLE':
			text = 'Uśpiony';
			break;
		case 'CLOSED':
			text = 'Zamknięte';
			break;
		case 'RUNNING':
			text = 'Działa';
			break;
		case 'OPEN':
			text = 'Otwarte';
			break;
		case 'MANUAL_WATERING':
			text = 'Podlewanie (ręczne)';
			break;
		case 'SCHEDULED_WATERING':
			text = 'Podlewanie (harmonogram)';
			break;
		case 'PARKED_UNTIL_NEXT_TASK':
			text = 'Zaparkowany (wg harmonogramu)';
			break;
		case 'PARKED_UNTIL_FURTHER_NOTICE':
			text = 'Zaparkowany (do odwołania)';
			break;
		case 'PARKED_AUTOTIMER':
			text = 'Zaparkowany (Sensor Controle)';
			break;
		case 'PARKED_FROST':
			text = 'Niska temperatura (zaparkowany)';
			break;
		case 'OK_LEAVING':
			text = 'Opuszcza stację';
			break;
		case 'OK_SEARCHING':
			text = 'Powrót do bazy';
			break;
		case 'STOPPED_IN_GARDEN':
			text = 'Zatrzymano w ogrodzie';
			break;
		case 'INITIATE_NEXT_ACTION':
			text = 'Następne działanie';
			break;
		case 'SEARCHING_FOR_SATELLITES':
			text = 'Szukam satelity';
			break;
			case 'ON':
			text = 'Włączony';
			break;
			case 'OFF':
			text = 'Wyłączony';
			break;
		case 'NONE':
			text = 'Brak';
			break;
	}

	return { className, text };
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
		case 'WRONG_LOOP_SIGNAL':
			return 'Błędny sygnał w przewodzie pętli';
		case 'LOOP_SENSOR_PROBLEM_FRONT':
			return 'Awaria czujnika pętli (przód)';
		case 'LOOP_SENSOR_PROBLEM_REAR':
			return 'Awaria czujnika pętli (tył)';
		case 'LEFT_LOOP_SENSOR':
			return 'Awaria czujnika pętli (lewy)';
		case 'RIGHT_LOOP_SENSOR':
			return 'Awaria czujnika pętli (prawy)';
		case 'WRONG_PIN':
			return 'Wprowadzono błędny kod PIN';
		case 'TRAPPED':
			return 'Uwięziona';
		case 'UPSIDE_DOWN':
			return 'Odwrócona do góry kołami';
		case 'LOW_BATTERY':
			return 'Niski poziom baterii';
		case 'EMPTY_BATTERY':
			return 'Bateria rozładowana';
		case 'NO_DRIVE':
			return 'Brak napędu';
		case 'TEMPORARY_LIFT':
			return 'Tymczasowo podniesiona';
		case 'LIFTED':
			return 'Podniesiona';
		case 'STUCK_IN_CHARGING_STATION':
			return 'Zablokowana w stacji ładującej';
		case 'CHARGING_STATION_BLOCKED':
			return 'Stacja ładująca zablokowana';
		case 'COLLISION_SENSOR_PROBLEM_REAR':
			return 'Awaria czujnika kolizji (tył)';
		case 'COLLISION_SENSOR_PROBLEM_FRONT':
			return 'Awaria czujnika kolizji (przód)';
		case 'WHEEL_MOTOR_BLOCKED_RIGHT':
			return 'Silnik prawego koła zablokowany';
		case 'WHEEL_MOTOR_BLOCKED_LEFT':
			return 'Silnik lewego koła zablokowany';
		case 'WHEEL_DRIVE_PROBLEM_RIGHT':
			return 'Problem z napędem prawego koła';
		case 'WHEEL_DRIVE_PROBLEM_LEFT':
			return 'Problem z napędem lewego koła';
		case 'CUTTING_DRIVE':
			return 'Awaria napędu ostrzy';
		case 'CUTTING_SYSTEM_BLOCKED':
			return 'System tnący zablokowany';
		case 'INVALID_SUB_DEVICE_COMBINATION':
			return 'Nieprawidłowa kombinacja pod-urządzenia/ID kosiarki';
		case 'SETTINGS_RESTORED':
			return 'Ustawienia NVRAM przywrócone do domyślnych';
		case 'ELECTRONIC_PROBLEM':
			return 'Nierozwiązany błąd NVRAM';
		case 'STEEP_SLOPE':
			return 'Zbyt strome nachylenie';
		case 'CHARGING_SYSTEM_PROBLEM':
			return 'Problem z systemem ładowania';
		case 'STOP_BUTTON_FAIL':
			return 'Awaria przycisku Start/Stop';
		case 'TILT_SENSOR_PROBLEM':
			return 'Awaria czujnika nachylenia';
		case 'MOWER_TILTED':
			return 'Osiągnięto maksymalny kąt nachylenia';
		case 'ANGLE_CUTTING_MEANS_OFF':
			return 'Ostrza wyłączone na zboczu';
		case 'WHEEL_MOTOR_OVERLOADED_RIGHT':
			return 'Silnik prawego koła przeciążony';
		case 'WHEEL_MOTOR_OVERLOADED_LEFT':
			return 'Silnik lewego koła przeciążony';
		case 'CHARGING_CURRENT_TOO_HIGH':
			return 'Zbyt wysoki prąd ładowania';
		case 'TEMPORARY_PROBLEM':
			return 'Brak połączenia z podrzędnym mikrokontrolerem';
		case 'CUTTING_OVERLOAD':
			return 'System tnący przeciążony';
		case 'CUTTING_HEIGHT_RANGE':
			return 'Ograniczony zakres wysokości koszenia';
		case 'CUTTING_HEIGHT_DRIFT':
			return 'Dryf wysokości koszenia';
		case 'CUTTING_HEIGHT_LIMITED':
			return 'Ograniczona wysokość koszenia';
		case 'CUTTING_HEIGHT_DRIVE':
			return 'Problem z systemem napędu wysokości koszenia';
		case 'CUTTING_HEIGHT_CURRENT':
			return 'Zbyt wysoki prąd wysokości koszenia';
		case 'CUTTING_HEIGHT_DIRECTION':
			return 'Praca w przeciwnym kierunku';
		case 'CUTTING_HEIGHT_BLOCKED':
			return 'Wysokość koszenia zablokowana';
		case 'CUTTING_HEIGHT_PROBLEM':
			return 'Niezdefiniowany problem z wysokością koszenia';
		case 'MOWER_TO_CS_COM':
			return 'Problemy z komunikacją z CS';
		case 'ULTRASONIC_ERROR':
			return 'Błąd zgłoszony z czujnika ultradźwiękowego';
		case 'GUIDE_1_NOT_FOUND':
			return 'Przewód prowadzący 1 nieobecny w systemie';
		case 'GUIDE_2_NOT_FOUND':
			return 'Przewód prowadzący 2 nieobecny w systemie';
		case 'GUIDE_3_NOT_FOUND':
			return 'Przewód prowadzący 3 nieobecny w systemie';
		case 'GPS_TRACKER_MODULE_ERROR':
			return 'Problem z sygnałem GPS';
		case 'WEAK_GPS_SIGNAL':
			return 'Słaby sygnał GPS';
		case 'DIFFICULT_FINDING_HOME':
			return 'Problem ze znalezieniem stacji bazowej';
		case 'GUIDE_CALIBRATION_ACCOMPLISHED':
			return 'Kalibracja przewodu prowadzącego zakończona sukcesem';
		case 'GUIDE_CALIBRATION_FAILED':
			return 'Kalibracja przewodu prowadzącego nie powiodła się';
		case 'TEMPORARY_BATTERY_PROBLEM':
			return 'Tymczasowy problem z baterią';
		case 'TOO_LOW_VOLTAGE_BAT_A':
			return 'Zbyt niskie napięcie baterii A';
		case 'TOO_LOW_VOLTAGE_BAT_B':
			return 'Zbyt niskie napięcie baterii B';
		case 'BATTERY_PROBLEM':
			return 'Nie znaleziono prawidłowej baterii';
		case 'ALARM_MOWER_SWITCHED_OFF':
			return 'Alarm: główny wyłącznik wyłączony';
		case 'ALARM_MOWER_STOPPED':
			return 'Alarm: przycisk Stop naciśnięty';
		case 'ALARM_MOWER_LIFTED':
			return 'Alarm: podniesiona';
		case 'ALARM_MOWER_TILTED':
			return 'Alarm: odwrócona do góry kołami';
		case 'ALARM_MOTION':
			return 'Alarm: ruch kosiarki';
		case 'ALARM_GEOFENCE':
			return 'Alarm: poza geostrefą';
		case 'CONNECTION_CHANGED':
			return 'Komunikacja z CS OK';
		case 'CONNECTION_NOT_CHANGED':
			return 'Komunikacja z CS nie powiodła się';
		case 'COM_BOARD_NOT_AVAILABLE':
			return 'Płyta komunikacyjna niedostępna';
		case 'SLIPPED':
			return 'Poślizg';
		case 'INVALID_BATTERY_COMBINATION':
			return 'Nieprawidłowa kombinacja baterii dla tego urządzenia';
		case 'IMBALANCED_CUTTING_DISC':
			return 'Wykryto niewyważoną tarczę tnącą';
		case 'SAFETY_FUNCTION_FAULTY':
			return 'Funkcja bezpieczeństwa uszkodzona';
		case 'RR_WHEEL_BLOCKED':
			return 'Tylne prawe koło zablokowane';
		case 'RL_WHEEL_BLOCKED':
			return 'Tylne lewe koło zablokowane';
		case 'RR_WHEEL_DRIVE':
			return 'Tylne prawe koło z napędem';
		case 'RL_WHEEL_DRIVE':
			return 'Tylne lewe koło z napędem';
		case 'REAR_RIGHT_WHEEL_OVERLOADED':
			return 'Tylne prawe koło przeciążone';
		case 'REAR_LEFT_WHEEL_OVERLOADED':
			return 'Tylne lewe koło przeciążone';
		case 'ANGULAR_SENSOR_DEFECT':
			return 'Nieprawidłowe wartości z czujnika kątowego';
		case 'INVALID_SYSTEM_CONF':
			return 'Nieprawidłowa konfiguracja systemu';
		case 'NO_POWER_IN_CS':
			return 'Brak zasilania w stacji ładującej';
		case 'SWITCH_CORD_SENSOR_DEFECT':
			return 'Nieprawidłowe wartości z czujnika kabla przełącznika';
		case 'MAP_NOT_VALID':
			return 'Zaprogramowany obszar roboczy (mapa terenu) nie istnieje lub jest nieprawidłowy';
		case 'NO_POSITION':
			return 'System pozycjonowania wysokiej rozdzielczości nie ma prawidłowej pozycji';
		case 'NO_RS_COMMUNICATION':
			return 'Zakłócenie komunikacji ze stacją referencyjną';
		case 'FOLDING_SENSOR_ACTIVATED':
			return 'Mechanizm składania zespołu tnącego nie jest zablokowany';
		case 'ULTRASONIC_SENSOR_1_DEFECT':
			return 'Brak komunikacji, błąd lub test czujnika ultradźwiękowego 1 nie powiodły się';
		case 'ULTRASONIC_SENSOR_2_DEFECT':
			return 'Brak komunikacji, błąd lub test czujnika ultradźwiękowego 2 nie powiodły się';
		case 'ULTRASONIC_SENSOR_3_DEFECT':
			return 'Brak komunikacji, błąd lub test czujnika ultradźwiękowego 3 nie powiodły się';
		case 'ULTRASONIC_SENSOR_4_DEFECT':
			return 'Brak komunikacji, błąd lub test czujnika ultradźwiękowego 4 nie powiodły się';
		case 'CUTTING_DRIVE_MOTOR_1_DEFECT':
			return 'Silnik tnący 1 ma usterkę w elektronice napędu lub silniku';
		case 'CUTTING_DRIVE_MOTOR_2_DEFECT':
			return 'Silnik tnący 2 ma usterkę w elektronice napędu lub silniku';
		case 'CUTTING_DRIVE_MOTOR_3_DEFECT':
			return 'Silnik tnący 3 ma usterkę w elektronice napędu lub silniku';
		case 'LIFT_SENSOR_DEFECT':
			return 'Jeden z czujników podnoszenia jest uszkodzony';
		case 'COLLISION_SENSOR_DEFECT':
			return 'Jeden z czujników kolizji jest uszkodzony';
		case 'DOCKING_SENSOR_DEFECT':
			return 'Czujnik dokowania jest uszkodzony';
		case 'FOLDING_CUTTING_DECK_SENSOR_DEFECT':
			return 'Czujnik sprawdzający zablokowaną pozycję dźwigni zwalniającej zespołu tnącego jest uszkodzony';
		case 'LOOP_SENSOR_DEFECT':
			return 'Jeden lub więcej czujników pętli jest uszkodzonych';
		case 'COLLISION_SENSOR_ERROR':
			return 'Kosiarka jest zablokowana lub czujnik kolizji jest uszkodzony';
		case 'NO_CONFIRMED_POSITION':
			return 'System pozycjonowania wysokiej rozdzielczości nie ma potwierdzonej pozycji';
		case 'MAJOR_CUTTING_DISK_IMBALANCE':
			return 'Poważne niewyważenie tarczy tnącej';
		case 'COMPLEX_WORKING_AREA':
			return 'Obszar roboczy zawiera zbyt wiele punktów orientacyjnych';
		case 'MOBILE_LOOP_DEFECT':
			return 'Wykryto usterkę pętli mobilnej';
		case 'DESTINATION_NOT_REACHABLE':
			return 'Błąd: kosiarka nie dotarła do celu';
		case 'DESTINATION_NOT_REACHABLE_WARNING':
			return 'Ostrzeżenie: kosiarka nie dotarła do celu';
		case 'BATTERY_NEAR_END_OF_LIFE':
			return 'Bateria zbliża się do końca żywotności';
		case 'BATTERY_FET_ERROR':
			return 'Błąd BMS (FET rozładowania baterii)';
		case 'EDGEMOTOR_BLOCKED':
			return 'Silnik krawędziowy zablokowany';
		case 'INVALID_SW_CONFIGURATION':
			return 'Nieprawidłowa konfiguracja oprogramowania';
		case 'NO_CORRECTION_DATA':
			return 'Brak danych korekcyjnych';
		case 'INVALID_CORRECTION_DATA':
			return 'Nieprawidłowe dane korekcyjne';
		case 'WAIT_STOP_PRESSED':
			return 'Kosiarka czeka: przycisk Stop naciśnięty';
		case 'WAIT_FOR_SAFETY_PIN':
			return 'Kosiarka czeka: wymagany kod PIN';
		case 'NO_CHARGING_STATION_SIGNAL':
			return 'Brak sygnału ze stacji ładującej';
		case 'RADAR_ERROR':
			return 'Błąd zgłoszony z radaru';
		case 'WORK_AREA_TAMPERED':
			return 'Obszar roboczy naruszony (stacja referencyjna/ładująca została przesunięta)';
		case 'WAIT_UPDATING':
			return 'Kosiarka czeka: aktualizacja oprogramowania';
		case 'WAIT_POWER_UP':
			return 'Kosiarka włącza się';
		case 'OFF_DISABLED':
			return 'Kosiarka wyłączona (przełącznik główny)';
		case 'OFF_HATCH_OPEN':
			return 'Kosiarka w stanie oczekiwania (klapka otwarta)';
		case 'OFF_HATCH_CLOSED':
			return 'Kosiarka w stanie oczekiwania (klapka zamknięta)';
		case 'PARKED_DAILY_LIMIT_REACHED':
			return 'Kosiarka zaparkowana: osiągnięto dzienny limit koszenia';
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
		case 'CONCURRENT_LIMIT_REACHED':
			return 'Osiągnięto limit jednoczesnego podlewania (max 2 zawory jednocześnie)';
		case 'NOT_CONNECTED':
			return 'Zawór nie był podłączony';
		case 'VALVE_CURRENT_MAX_EXCEEDED':
			return 'Prąd zaworu przekroczył dozwolone maksimum';
		case 'TOTAL_CURRENT_MAX_EXCEEDED':
			return 'Całkowity prąd przekroczył dozwolone maksimum';
		case 'WATERING_CANCELED':
			return 'Podlewanie zostało anulowane';
		case 'MASTER_VALVE':
			return 'Zawór główny nie jest podłączony';
		case 'WATERING_DURATION_TOO_SHORT':
			return 'Czas podlewania był zbyt krótki';
		case 'VALVE_BROKEN':
			return 'Awaria zaworu (uszkodzone połączenie elektryczne lub cewka)';
		case 'FROST_PREVENTS_STARTING':
			return 'Mróz uniemożliwia uruchomienie zaworu';
		case 'LOW_BATTERY_PREVENTS_STARTING':
			return 'Niski poziom baterii uniemożliwia uruchomienie zaworu';
		case 'VALVE_POWER_SUPPLY_FAILED':
			return 'Awaria zasilania zaworu';
		case 'UNKNOWN':
			return 'Nieznany błąd zaworu';
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
		case 'VOLTAGE_DROP':
			return 'Wykryto spadek napięcia (VDD_IN)';
		case 'WRONG_POWER_SUPPLY':
			return 'Podłączono niewłaściwe zasilanie (błędna częstotliwość)';
		case 'NO_MCU_CONNECTION':
			return 'Błąd komunikacji z podrzędnym mikrokontrolerem';
		case 'OVERTEMPERATURE':
			return 'Sterownik nawadniania zbyt gorący';
		case 'EEPROM':
			return 'Nie można odczytać/zapisać pamięci EEPROM';
		case 'UNKNOWN':
			return 'Nieznany błąd sterownika';
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
		statusMessage = `: OFFLINE`;
		dotClass = 'status-offline';
	} else if (rfLinkState === 'online') {
		if (device.type === 'MOWER') {
			if (generalState === 'ok') {
				if (activity === 'mowing') {
					statusMessage = `: KOSZENIE AKTYWNE`;
					dotClass = 'status-online';
				} else if (activity === 'charging') {
					statusMessage = `: ŁADOWANIE (${attributes?.batteryLevel?.value !== undefined ? attributes.batteryLevel.value : 'N/A'}%)`;
					dotClass = 'status-charging';
				} else if (['parked', 'none', 'idle', 'paused'].includes(activity)) {
					statusMessage = `: GOTOWY`;
					dotClass = 'status-ready';
				} else {
					statusMessage = `: ONLINE`;
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
					statusMessage = `: PODLEWANIE`;
					dotClass = 'status-online';
				} else {
					statusMessage = `: GOTOWY`;
					dotClass = 'status-ready';
				}
			} else {
				const stateInfo = getStatusInfo(generalState);
				statusMessage = `: ONLINE (${stateInfo.text})`;
				dotClass = 'status-ready';
			}
		} else if (device.type === 'SMART_PLUG') {
			statusMessage = `: ONLINE`;
			dotClass = 'status-online';
		} else {
			statusMessage = `: ONLINE`;
			dotClass = 'status-online';
		}
	} else {
		statusMessage = `: STATUS NIEZNANY`;
		dotClass = 'status-unknown';
	}
	return { displayName: deviceName, statusMessage: statusMessage, dotClass: dotClass };
};
