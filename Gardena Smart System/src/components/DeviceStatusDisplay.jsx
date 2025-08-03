import React from 'react';
import { getStatusInfo, getMowerErrorInfo } from '../utils/statusUtils';
import BatteryStatus from './BatteryStatus';

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
		<>
			<div className='status-label'>{label}:</div>
			<div className='status-value-wrapper'>
				<span className={`status-value ${displayClassName}`}>{displayText}</span>
				{timestamp && <span className='status-timestamp'>{formatTimestamp(timestamp)}</span>}
			</div>
		</>
	);
};

const DeviceStatusDisplay = ({ device, isDetailed = false }) => {
	const attributes = device.attributes;
	if (!attributes) return <p className='device-state-empty'>Brak danych o stanie.</p>;

	const statusItems = [];

	// Stan połączenia
	if (attributes.rfLinkState?.value) {
		statusItems.push(
			<StatusItem
				key='rfLinkState'
				label='Stan połączenia'
				value={attributes.rfLinkState.value}
				timestamp={isDetailed ? attributes.rfLinkState?.timestamp : null}
			/>
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
			statusItems.push(
				<StatusItem
					key='overallState'
					label='Stan ogólny'
					value='Aktywny'
					className='status-ok'
					timestamp={activeValve.attributes?.activity?.timestamp}
				/>
			);
			statusItems.push(
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
					statusItems.push(
						<StatusItem key='endTime' label='Działa do' value={endTimeFormatted} className='status-ok' />
					);
				}
			}
		} else {
			const stateInfo = getStatusInfo(attributes.state?.value);
			statusItems.push(
				<StatusItem
					key='overallState'
					label='Stan ogólny'
					value={stateInfo.text}
					timestamp={attributes.state?.timestamp}
					className={stateInfo.className}
				/>
			);
			const activityInfo = getStatusInfo(attributes.activity?.value);
			statusItems.push(
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

				statusItems.push(
					<StatusItem
						key='lastActivity'
						label='Ostatnio podlewał'
						value={`${valveName} (zakończono)`}
						className='status-info'
						timestamp={activityTimestamp}
					/>
				);
			} else {
				statusItems.push(
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
			statusItems.push(
				<StatusItem
					key='generalState'
					label='Stan ogólny'
					value={stateValue}
					className={stateClass}
					timestamp={isDetailed ? attributes.state?.timestamp : null}
				/>
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

			statusItems.push(
				<StatusItem
					key='activity'
					label='Aktywność'
					value={activityText}
					className={activityClass}
					timestamp={isDetailed ? attributes.activity?.timestamp : null}
				/>
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
			statusItems.push(
				<StatusItem
					key='errorDetails'
					label='Szczegóły'
					value={errorMessage}
					className='status-error'
					timestamp={isDetailed ? attributes.lastErrorCode?.timestamp : null}
				/>
			);
		}
	}

	// Poziom baterii (tylko dla MOWER)
	const batteryLevel = device.type === 'MOWER' ? attributes.batteryLevel?.value : undefined;
	if (batteryLevel !== undefined) {
		if (isDetailed) {
			statusItems.push(
				<React.Fragment key='batteryStatus'>
					<div className='status-label'>Bateria:</div>
					<div className='status-value-wrapper'>
						<BatteryStatus level={batteryLevel} />
					</div>
				</React.Fragment>
			);
		} else {
			statusItems.push(
				<li key='batteryStatus'>
					<BatteryStatus level={batteryLevel} />
				</li>
			);
		}
	}

	// Temperatura otoczenia (tylko dla SMART_PLUG)
	if (device.type === 'SMART_PLUG' && attributes.ambientTemperature?.value !== undefined) {
		statusItems.push(
			<StatusItem key='ambientTemperature' label='Temp. otoczenia' value={`${attributes.ambientTemperature.value}°C`} />
		);
	}

	if (statusItems.length === 0) {
		return <p className='device-state-empty'>Brak szczegółowych danych o stanie.</p>;
	}

	return isDetailed ? (
		<div className='status-grid'>{statusItems}</div>
	) : (
		<ul className='device-state-list'>
			{statusItems.map((item, index) => (
				<li key={index}>{item}</li>
			))}
		</ul>
	);
};

export default DeviceStatusDisplay;
