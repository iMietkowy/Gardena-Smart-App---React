//Przetwarza surową wartość statusu na obiekt z klasą CSS i przetłumaczonym tekstem.

export const getStatusInfo = (value) => {
  if (value === undefined || value === null) {
    return { className: '', text: '' };
  }

  const upperValue = String(value).toUpperCase();
  let className = '';
  let text = String(value);

  switch (upperValue) {
    case 'ONLINE': case 'OK': case 'MOWING': case 'OK_CUTTING': case 'OK_CUTTING_TIMER_OVERRIDDEN':
    case 'CHARGING': case 'OK_CHARGING': case 'RUNNING': case 'OPEN': case 'MANUAL_WATERING':
    case 'SCHEDULED_MOWING': case 'SCHEDULED_WATERING': case 'OK_LEAVING': case 'OK_SEARCHING':
      className = 'status-ok';
      break;
    case 'PAUSED': case 'IDLE': case 'PARKED': case 'PARKED_TIMER': case 'PARKED_UNTIL_NEXT_TASK':
    case 'PARKED_UNTIL_FURTHER_NOTICE': case 'UNAVAILABLE': case 'CLOSED': case 'WARNING':
      className = 'status-warn';
      break;
    case 'OFFLINE': case 'ERROR':
      className = 'status-error';
      break;
  }

  switch (upperValue) {
    case 'ONLINE': text = 'Online'; break;
    case 'OFFLINE': text = 'Offline'; break;
    case 'OK': text = 'W porządku'; break;
    case 'ERROR': text = 'Błąd'; break;
    case 'WARNING': text = 'Ostrzeżenie'; break;
    case 'PAUSED': text = 'Wstrzymano'; break;
    case 'MOWING': case 'OK_CUTTING_TIMER_OVERRIDDEN': text = 'Koszenie (ręczne)'; break;
    case 'OK_CUTTING': case 'SCHEDULED_MOWING': text = 'Koszenie (harmonogram)'; break;
    case 'CHARGING': case 'OK_CHARGING': text = 'Ładowanie'; break;
    case 'PARKED': case 'PARKED_TIMER': text = 'Zaparkowany'; break;
    case 'IDLE': text = 'Gotowy'; break;
    case 'UNAVAILABLE': text = 'Uśpiony'; break;
    case 'CLOSED': text = 'Zamknięte'; break;
    case 'RUNNING': text = 'Działa'; break;
    case 'OPEN': text = 'Otwarte'; break;
    case 'MANUAL_WATERING': text = 'Podlewanie (ręczne)'; break;
    case 'SCHEDULED_WATERING': text = 'Podlewanie (harmonogram)'; break;
    case 'PARKED_UNTIL_NEXT_TASK': text = 'Zaparkowany (wg harmonogramu)'; break;
    case 'PARKED_UNTIL_FURTHER_NOTICE': text = 'Zaparkowany (do odwołania)'; break;
    case 'OK_LEAVING': text = 'Opuszcza stację'; break;
    case 'OK_SEARCHING': text = 'Powrót do bazy'; break;
    case 'NONE': text = 'Brak'; break;
  }

  return { className, text };
};


 //Przetwarza kod błędu kosiarki na zrozumiały komunikat.

export const getMowerErrorInfo = (errorCode) => {
    if (!errorCode) return null;

    switch (errorCode.toUpperCase()) {
        case 'NO_MESSAGE': return null;
        case 'OUTSIDE_WORKING_AREA': return 'Poza obszarem roboczym';
        case 'NO_LOOP_SIGNAL': return 'Brak sygnału w przewodzie';
        case 'TRAPPED': return 'Uwięziona';
        case 'UPSIDE_DOWN': return 'Odwrócona do góry kołami';
        case 'LIFTED': return 'Podniesiona';
        case 'LOW_BATTERY': return 'Niski poziom baterii';
        case 'EMPTY_BATTERY': return 'Bateria rozładowana';
        case 'CUTTING_SYSTEM_BLOCKED': return 'System tnący zablokowany';
        case 'STUCK_IN_CHARGING_STATION': return 'Zablokowana w stacji ładującej';
        case 'MOWER_TILTED': return 'Zbyt mocno przechylona';
        case 'WRONG_PIN': return 'Wprowadzono błędny PIN';
        default: return `Nieznany błąd: ${errorCode}`;
    }
};

/**
 * Generuje skonsolidowany obiekt statusu dla nagłówka aplikacji.
 * @param {object} device - Obiekt urządzenia.
 * @returns {{displayName: string, statusMessage: string, dotClass: string}}
 */
export const getConsolidatedDeviceStatus = (device) => {
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