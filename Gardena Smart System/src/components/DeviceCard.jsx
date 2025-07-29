import React from 'react';
import { Link } from 'react-router-dom';
import BatteryStatus from './BatteryStatus';
import { getStatusInfo, getMowerErrorInfo } from '../utils/statusUtils';
import mowerImage from '../img/Gardena_Mower_Sileno_Life.png';
import wateringComputerImage from '../img/GARDENA_smart_Irrigation_Control.png';
import smartPlugImage from '../img/Gardena_smart_plug.png'; 
import defaultDeviceImage from '../img/logo.svg';

const DeviceCard = ({ device }) => {
	const renderDeviceState = deviceAttributes => {
		if (!deviceAttributes) return <p className='device-state-empty'>Brak danych o stanie.</p>;

		const statusItems = [];

		if (deviceAttributes.rfLinkState?.value) {
			const { className, text } = getStatusInfo(deviceAttributes.rfLinkState.value);
			statusItems.push(
				<li key='rfLinkState'>
					<span className='status'>Stan połączenia:</span>
					<span className={className}> {text}</span>
				</li>
			);
		}

		
		if (deviceAttributes.state?.value) {
			let stateInfo;
            // Nowa zmienna do śledzenia, czy ogólny stan został nadpisany przez aktywność zaworu
            let overrideGeneralState = false;

            // Logika dla SMART_WATERING_COMPUTER: Stan ogólny powinien odzwierciedlać, czy jakiś zawór podlewa
            if (device.type === 'SMART_WATERING_COMPUTER') {
                const activeWateringStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
                const anyValveActive = device._valveServices?.some(v => activeWateringStates.includes(v.attributes?.activity?.value?.toUpperCase()));

                if (anyValveActive) {
                    stateInfo = { className: 'status-ok', text: 'Aktywny' };
                    overrideGeneralState = true;
                }
            }
            
            // Jeśli stan ogólny nie został nadpisany przez aktywność zaworu, użyj domyślnej logiki
            if (!overrideGeneralState) {
                if (
                    deviceAttributes.state.value.toUpperCase() === 'UNAVAILABLE' &&
                    deviceAttributes.rfLinkState?.value.toUpperCase() === 'ONLINE'
                ) {
                    stateInfo = { className: 'status-warn', text: 'Nieaktywny (tryb uśpienia)' };
                } else {
                    stateInfo = getStatusInfo(deviceAttributes.state.value);
                }
            }

			statusItems.push(
				<li key='generalState'>
					<span className='status'>Stan ogólny:</span>
					<span className={stateInfo.className}> {stateInfo.text}</span>
				</li>
			);
		}

		const deviceState = deviceAttributes.state?.value?.toUpperCase();
		const errorCode = deviceAttributes.lastErrorCode?.value;
		if (device.type === 'MOWER' && (deviceState === 'ERROR' || deviceState === 'WARNING') && errorCode) {
			const errorMessage = getMowerErrorInfo(errorCode);
			if (errorMessage) {
				statusItems.push(
					<li key='errorDetails'>
						<span className='status'>Szczegóły:</span>
						<span className='status-error'> {errorMessage}</span>
					</li>
				);
			}
		}

		
		if (deviceAttributes.activity?.value) {
            let activityText = '';
            let activityClass = '';

            if (device.type === 'SMART_WATERING_COMPUTER') {
                const activeWateringStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
                const activeValve = device._valveServices?.find(v => activeWateringStates.includes(v.attributes?.activity?.value?.toUpperCase()));
                if (activeValve) {
                    const valveName = activeValve.attributes?.name?.value || `Zawór ${activeValve.id.split(':').pop()}`;
                    activityText = `Podlewanie (${valveName})`;
                    activityClass = 'status-ok';
                } else {
                    const { className, text } = getStatusInfo(deviceAttributes.activity.value);
                    activityText = text;
                    activityClass = className;
                }
            } else {
                const { className, text } = getStatusInfo(deviceAttributes.activity.value);
                activityText = text;
                activityClass = className;
            }

            if (activityText) {
                statusItems.push(
                    <li key='activity'>
                        <span className='status'>Aktywność:</span>
                        <span className={activityClass}> {activityText}</span>
                    </li>
                );
            }
		}

		const batteryLevel = device.type === 'MOWER' ? deviceAttributes.batteryLevel?.value : undefined;
		if (batteryLevel !== undefined) {
			statusItems.push(
				<li key='batteryStatus'>
					<BatteryStatus level={batteryLevel} />
				</li>
			);
		}

		if (device.type === 'SMART_PLUG' && deviceAttributes.ambientTemperature?.value !== undefined) {
			statusItems.push(
				<li key='ambientTemperature'>
					<span className='status'>Temp. otoczenia:</span> {deviceAttributes.ambientTemperature.value}°C
				</li>
			);
		}

		if (statusItems.length === 0) {
			return <p className='device-state-empty'>Brak szczegółowych danych o stanie.</p>;
		}

		return <ul className='device-state-list'>{statusItems}</ul>;
	};

	const getDeviceImage = deviceType => {
		switch (deviceType) {
			case 'MOWER':
				return mowerImage;
			case 'SMART_WATERING_COMPUTER':
				return wateringComputerImage;
			case 'SMART_PLUG':
				return smartPlugImage;
			default:
				return defaultDeviceImage;
		}
	};

	const currentDeviceImage = getDeviceImage(device.type);

	return (
		<Link to={`/devices/${device.id}`} className='device-card'>
			<div className='device-card__content'>
				<h3 className='device-name'>{device.displayName || 'Unknown device'}</h3>
				<img src={currentDeviceImage} alt={`${device.displayName} device`} className='device-card-image' />
				<div className='device-state'>
					<h4 className='device-state-title'>Stan urządzenia:</h4>
					{renderDeviceState(device.attributes)}
				</div>
			</div>
			<div className='device-card__actions'>
				<button className='btn btn--primary btn--pill'>Szczegóły i sterowanie</button>
			</div>
		</Link>
	);
};

export default DeviceCard;