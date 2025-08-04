import React from 'react';
import { getStatusInfo, getMowerErrorInfo } from '../../utils/statusUtils';
import BatteryStatus from '../common/BatteryStatus';

const formatTimestamp = isoString => {
	if (!isoString) return '';
	const date = new Date(isoString);
	const now = new Date();
	const diffSeconds = Math.round((now - date) / 1000);
	if (diffSeconds < 60) return 'przed chwilą';
	const diffMinutes = Math.round(diffSeconds / 60);
	if (diffMinutes < 60) return `${diffMinutes} min temu`;
	const diffHours = Math.round(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} godz. temu`;
	return date.toLocaleString('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

const StatusItem = ({ label, value, timestamp, className = '' }) => {
	if (value === undefined || value === null || value === '') return null;

	let displayText = value;
	let displayClassName = className;

	if (typeof value === 'string') {
		const statusInfo = getStatusInfo(value);
		displayText = statusInfo.text;
		displayClassName = className || statusInfo.className;
	}

	return (
		// Zwracamy parę divów, które są oczekiwane przez status-grid
		<>
			<div className='status-label'>{label}:</div>
			<div className='status-value-wrapper'>
				<span className={`status-value ${displayClassName}`}>{displayText}</span>
				{timestamp && <span className='status-timestamp'> {formatTimestamp(timestamp)}</span>}
			</div>
		</>
	);
};

const DeviceStatusDisplay = ({ device, isDetailed = false }) => {
	const attributes = device.attributes;
	if (!attributes) return <p className='device-state-empty'>Brak danych o stanie.</p>;

	const detailedStatusItems = [];
	const cardStatusItems = [];

	// Stan połączenia
	if (attributes.rfLinkState?.value) {
		const content = (
			<StatusItem
				key='rfLinkState'
				label='Stan połączenia'
				value={attributes.rfLinkState.value}
				timestamp={attributes.rfLinkState?.timestamp}
			/>
		);
		detailedStatusItems.push(content);
		cardStatusItems.push(
			<li key='rfLinkState'>
				<span className='status'>Stan połączenia:</span>
				<span className={getStatusInfo(attributes.rfLinkState.value).className}>
					{' '}
					{getStatusInfo(attributes.rfLinkState.value).text}
				</span>
			</li>
		);
	}

	// Logika dla podlewania
	if (device.type === 'SMART_WATERING_COMPUTER' && isDetailed) {
		const activeWateringStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
		const activeValve = device._valveServices?.find(v =>
			activeWateringStates.includes(v.attributes?.activity?.value?.toUpperCase())
		);

		if (activeValve) {
			const valveName = activeValve.attributes?.name?.value || `Zawór ${activeValve.id.split(':').pop()}`;
			detailedStatusItems.push(
				<StatusItem
					key='overallState'
					label='Stan ogólny'
					value='Aktywny'
					className='status-ok'
					timestamp={activeValve.attributes?.activity?.timestamp}
				/>
			);
			detailedStatusItems.push(
				<StatusItem
					key='wateringActivity'
					label='Aktywność'
					value={`Podlewanie (${valveName})`}
					className='status-ok'
					timestamp={activeValve.attributes?.activity?.timestamp}
				/>
			);
			const durationInfo = activeValve.attributes?.duration;
			if (durationInfo && durationInfo.value > 0) {
				const startTime = new Date(durationInfo.timestamp);
				const endTime = new Date(startTime.getTime() + durationInfo.value * 1000);
				const now = new Date();
				if (endTime > now) {
					const endTimeFormatted = endTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
					detailedStatusItems.push(
						<StatusItem key='endTime' label='Działa do' value={endTimeFormatted} className='status-ok' />
					);
				}
			}
		} else {
			const stateInfo = getStatusInfo(attributes.state?.value);
			detailedStatusItems.push(
				<StatusItem
					key='overallState'
					label='Stan ogólny'
					value={stateInfo.text}
					timestamp={attributes.state?.timestamp}
					className={stateInfo.className}
				/>
			);
			const activityInfo = getStatusInfo(attributes.activity?.value);
			detailedStatusItems.push(
				<StatusItem
					key='activity'
					label='Aktywność'
					value={activityInfo.text}
					timestamp={attributes.activity?.timestamp}
					className={activityInfo.className}
				/>
			);
			const lastClosedValveActivity = device._valveServices
				?.filter(v => v.attributes?.activity?.value?.toUpperCase() === 'CLOSED' && v.attributes?.activity?.timestamp)
				.sort((a, b) => new Date(b.attributes.activity.timestamp) - new Date(a.attributes.activity.timestamp))[0];

			if (lastClosedValveActivity) {
				const activityTimestamp = lastClosedValveActivity.attributes.activity.timestamp;
				const valveName =
					lastClosedValveActivity.attributes?.name?.value || `Zawór ${lastClosedValveActivity.id.split(':').pop()}`;

				detailedStatusItems.push(
					<StatusItem
						key='lastActivity'
						label='Ostatnio podlewał'
						value={`${valveName} (zakończono)`}
						className='status-info'
						timestamp={activityTimestamp}
					/>
				);
			} else {
				detailedStatusItems.push(
					<StatusItem
						key='noRecentActivity'
						label='Ostatnio podlewał'
						value='Brak danych'
						className='status-warn'
						timestamp={null}
					/>
				);
			}
		}
	} else {
		// Logika dla ogólnego stanu
		if (attributes.state?.value) {
			let stateValue = attributes.state.value;
			let stateClass = '';
			if (
				attributes.state.value.toUpperCase() === 'UNAVAILABLE' &&
				attributes.rfLinkState?.value.toUpperCase() === 'ONLINE'
			) {
				stateValue = 'Nieaktywny (tryb uśpienia)';
				stateClass = 'status-warn';
			} else {
				const { text, className } = getStatusInfo(stateValue);
				stateValue = text;
				stateClass = className;
			}
			detailedStatusItems.push(
				<StatusItem
					key='generalState'
					label='Stan ogólny'
					value={stateValue}
					className={stateClass}
					timestamp={isDetailed ? attributes.state?.timestamp : null}
				/>
			);
			cardStatusItems.push(
				<li key='generalState'>
					<span className='status'>Stan ogólny:</span>
					<span className={stateClass}> {stateValue}</span>
				</li>
			);
		}

		// Logika dla aktywności
		if (attributes.activity?.value) {
			let activityText = attributes.activity.value;
			let activityClass = '';

			// Nadpisanie aktywności dla SMART_WATERING_COMPUTER, jeśli nie jest w trybie szczegółowym
			if (device.type === 'SMART_WATERING_COMPUTER' && !isDetailed) {
				const activeWateringStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
				const anyValveActive = device._valveServices?.some(v =>
					activeWateringStates.includes(v.attributes?.activity?.value?.toUpperCase())
				);
				if (anyValveActive) {
					activityText = 'Aktywny';
					activityClass = 'status-ok';
				} else {
					const { text, className } = getStatusInfo(attributes.activity.value);
					activityText = text;
					activityClass = className;
				}
			} else {
				const { text, className } = getStatusInfo(attributes.activity.value);
				activityText = text;
				activityClass = className;
			}
			detailedStatusItems.push(
				<StatusItem
					key='activity'
					label='Aktywność'
					value={activityText}
					className={activityClass}
					timestamp={attributes.activity?.timestamp}
				/>
			);
			cardStatusItems.push(
				<li key='activity'>
					<span className='status'>Aktywność:</span>
					<span className={activityClass}> {activityText}</span>
				</li>
			);
		}
	}

	// Szczegóły błędu (tylko dla MOWER)
	const errorCode = attributes.lastErrorCode?.value;
	if (
		device.type === 'MOWER' &&
		(attributes.state?.value?.toUpperCase() === 'ERROR' || attributes.state?.value?.toUpperCase() === 'WARNING') &&
		errorCode
	) {
		const errorMessage = getMowerErrorInfo(errorCode);
		if (errorMessage) {
			detailedStatusItems.push(
				<StatusItem
					key='errorDetails'
					label='Szczegóły'
					value={errorMessage}
					className='status-error'
					timestamp={attributes.lastErrorCode?.timestamp}
				/>
			);
			cardStatusItems.push(
				<li key='errorDetails'>
					<span className='status'>Szczegóły:</span>
					<span className='status-error'> {errorMessage}</span>
				</li>
			);
		}
	}

	// Poziom baterii (tylko dla MOWER)
	const batteryLevel = device.type === 'MOWER' ? attributes.batteryLevel?.value : undefined;
	if (batteryLevel !== undefined) {
		detailedStatusItems.push(
			<React.Fragment key='batteryStatus'>
				<div className='status-label'>Bateria:</div>
				<div className='status-value-wrapper'>
					<BatteryStatus level={batteryLevel} />
				</div>
			</React.Fragment>
		);
		cardStatusItems.push(
			<li key='batteryStatus'>
				<BatteryStatus level={batteryLevel} />
			</li>
		);
	}

	// Temperatura otoczenia (tylko dla SMART_PLUG)
	if (device.type === 'SMART_PLUG' && attributes.ambientTemperature?.value !== undefined) {
		detailedStatusItems.push(
			<StatusItem key='ambientTemperature' label='Temp. otoczenia' value={`${attributes.ambientTemperature.value}°C`} />
		);
		cardStatusItems.push(
			<li key='ambientTemperature'>
				<span className='status'>Temp. otoczenia:</span> {attributes.ambientTemperature.value}°C
			</li>
		);
	}

	if (isDetailed) {
		if (detailedStatusItems.length === 0) {
			return <p className='device-state-empty'>Brak szczegółowych danych o stanie.</p>;
		}
		return <div className='status-grid'>{detailedStatusItems}</div>;
	} else {
		if (cardStatusItems.length === 0) {
			return <p className='device-state-empty'>Brak szczegółowych danych o stanie.</p>;
		}
		return <ul className='device-state-list'>{cardStatusItems}</ul>;
	}
};

export default DeviceStatusDisplay;