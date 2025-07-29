import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useNotificationContext } from '../context/NotificationContext.jsx';
import { Edit2, Save, X } from 'lucide-react';
import MowerControls from './MowerControls';
import WateringControls from './WateringControls';
import PlugControls from './PlugControls';
import ValveCard from './ValveCard';
import BatteryStatus from './BatteryStatus';
import { getStatusInfo, getMowerErrorInfo } from '../utils/statusUtils';
import mowerImage from '../img/mower.png';
import wheelImage from '../img/wheel.png';
import grassImage from '../img/grass.png';

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

const DeviceDetailPage = () => {
	const { devices, loading, fetchGardenaDevices } = useAppContext();
	const { showToastNotification, addNotificationToBell } = useNotificationContext();
	const { deviceId } = useParams();
	const navigate = useNavigate();
	const onBackToList = () => navigate('/devices');
	const device = devices.find(d => d.id === deviceId);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isEditingName, setIsEditingName] = useState(false);
	const [newDeviceName, setNewDeviceName] = useState('');
	const [showDetails, setShowDetails] = useState(false);

	useEffect(() => {
		if (device) setNewDeviceName(device.displayName);
	}, [device]);

	const handleSaveName = async () => {
		if (!newDeviceName || newDeviceName.trim() === '') {
			showToastNotification('Nazwa nie może być pusta.', 'error');
			return;
		}
		try {
			const response = await fetch(`/api/gardena/devices/${device.commonServiceId}/name`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newDeviceName }),
			});
			if (!response.ok) throw new Error((await response.json()).error || 'Błąd serwera');
			showToastNotification('Nazwa została pomyślnie zmieniona!', 'success');
			setIsEditingName(false);
			await fetchGardenaDevices();
		} catch (err) {
			showToastNotification(`Błąd: ${err.message}`, 'error');
			addNotificationToBell(`Błąd zmiany nazwy ${device.displayName}: ${err.message}`, 'error');
		}
	};

	const sendCommand = async (action, value = null, valveServiceId = undefined) => {
		setIsSubmitting(true);
		let payload = {
			action,
			deviceType: device.type,
			valveServiceId,
		};
		if (value) payload.value = value;

		try {
			const response = await fetch(`/api/gardena/devices/${device.id}/control`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Serwer zwrócił błąd ${response.status}`);
			}
			showToastNotification('Komenda wysłana pomyślnie!', 'success');
		} catch (err) {
			const errorMessage = `Błąd: ${err.message}`;
			showToastNotification(errorMessage, 'error');
			addNotificationToBell(`Błąd sterowania ${device.displayName}: ${err.message}`, 'error');
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderDeviceState = attributes => {
		if (!attributes) return <p>Brak danych o stanie.</p>;

		const StatusItem = ({ label, value, timestamp, className = '' }) => {
			if (value === undefined || value === null) return null;

			let displayText;
			let displayClassName;

			const statusInfo = getStatusInfo(value);
			displayText = statusInfo.text;
			displayClassName = className || statusInfo.className;
			if (value === 'Aktywny') {
				displayText = 'Aktywny';
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

		const statusElements = []; // Lista elementów statusu do renderowania

		// 1. Stan połączenia (zawsze z głównego urządzenia)
		if (attributes.rfLinkState?.value) {
			const { className, text } = getStatusInfo(attributes.rfLinkState.value);
			statusElements.push(
				<StatusItem
					key='rfLinkState'
					label='Stan połączenia'
					value={text}
					timestamp={attributes.rfLinkState?.timestamp}
					className={className}
				/>
			);
		}

		// 2. Logika dla SMART_WATERING_COMPUTER
		if (device.type === 'SMART_WATERING_COMPUTER') {
			const activeWateringStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
			const activeValve = device._valveServices?.find(v =>
				activeWateringStates.includes(v.attributes?.activity?.value?.toUpperCase())
			);

			if (activeValve) {
				// Jeśli którekolwiek podlewanie jest aktywne
				const valveName = activeValve.attributes?.name?.value || `Zawór ${activeValve.id.split(':').pop()}`;
				statusElements.push(
					<StatusItem
						key='overallState'
						label='Stan ogólny'
						value='Aktywny'
						className='status-ok'
						timestamp={activeValve.attributes?.activity?.timestamp}
					/>
				);
				statusElements.push(
					<StatusItem
						key='wateringActivity'
						label='Aktywność'
						value={`Podlewanie (${valveName})`}
						className='status-ok'
						timestamp={activeValve.attributes?.activity?.timestamp}
					/>
				);

				// Czas zakończenia podlewania
				const durationInfo = activeValve.attributes?.duration;
				if (durationInfo && durationInfo.value > 0) {
					const startTime = new Date(durationInfo.timestamp);
					const endTime = new Date(startTime.getTime() + durationInfo.value * 1000);
					const now = new Date();
					if (endTime > now) {
						const endTimeFormatted = endTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
						statusElements.push(
							<StatusItem key='endTime' label='Działa do' value={endTimeFormatted} className='status-ok' />
						);
					}
				}
			} else {
				// JEŚLI ŻADNE PODLEWANIE NIE JEST AKTYWNE
				let stateInfo = getStatusInfo(attributes.state?.value);
				statusElements.push(
					<StatusItem
						key='overallState'
						label='Stan ogólny'
						value={stateInfo.text}
						timestamp={attributes.state?.timestamp}
						className={stateInfo.className}
					/>
				);

				let activityInfo = getStatusInfo(attributes.activity?.value);
				statusElements.push(
					<StatusItem
						key='activity'
						label='Aktywność'
						value={activityInfo.text}
						timestamp={attributes.activity?.timestamp}
						className={activityInfo.className}
					/>
				);

				// Logika do wyświetlania ostatniego podlewania (TYLKO ZAMKNIĘTE ZAWORY Z TIMESTAMPEM)
				const lastClosedValveActivity = device._valveServices
					?.filter(v => v.attributes?.activity?.value?.toUpperCase() === 'CLOSED' && v.attributes?.activity?.timestamp)
					.sort((a, b) => new Date(b.attributes.activity.timestamp) - new Date(a.attributes.activity.timestamp))[0];

				if (lastClosedValveActivity) {
					const activityTimestamp = lastClosedValveActivity.attributes.activity.timestamp;
					const valveName =
						lastClosedValveActivity.attributes?.name?.value || `Zawór ${lastClosedValveActivity.id.split(':').pop()}`;

					statusElements.push(
						<StatusItem
							key='lastActivity'
							label='Ostatnio podlewał'
							value={`${valveName} (zakończono)`}
							className='status-info'
							timestamp={activityTimestamp}
						/>
					);
				} else {
					statusElements.push(
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
			if (attributes.state?.value) {
				let stateInfo;
				if (
					attributes.state.value.toUpperCase() === 'UNAVAILABLE' &&
					attributes.rfLinkState?.value.toUpperCase() === 'ONLINE'
				) {
					stateInfo = { className: 'status-warn', text: 'Nieaktywny (tryb uśpienia)' };
				} else {
					stateInfo = getStatusInfo(attributes.state.value);
				}
				statusElements.push(
					<StatusItem
						key='overallState'
						label='Stan ogólny'
						value={stateInfo.text}
						className={stateInfo.className}
						timestamp={attributes.state?.timestamp}
					/>
				);
			}

			if (attributes.activity?.value) {
				const { className, text } = getStatusInfo(attributes.activity.value);
				statusElements.push(
					<StatusItem
						key='activity'
						label='Aktywność'
						value={text}
						className={className}
						timestamp={attributes.activity?.timestamp}
					/>
				);
			}
		}

		// Błędy dla kosiarek
		const errorCode = attributes.lastErrorCode?.value;
		if (
			device?.type === 'MOWER' &&
			(attributes.state?.value?.toUpperCase() === 'ERROR' ||
				attributes.attributes?.state?.value?.toUpperCase() === 'WARNING') &&
			errorCode
		) {
			const errorMessage = getMowerErrorInfo(errorCode);
			if (errorMessage) {
				statusElements.push(
					<StatusItem
						key='errorDetails'
						label='Szczegóły'
						value={errorMessage}
						className='status-error'
						timestamp={attributes.lastErrorCode?.timestamp}
					/>
				);
			}
		}

		// Bateria (tylko dla kosiarek)
		const batteryLevel = device.type === 'MOWER' ? attributes.batteryLevel?.value : undefined;
		if (batteryLevel !== undefined) {
			statusElements.push(
				<React.Fragment key='batteryStatus'>
					<div className='status-label'>Bateria:</div>
					<div className='status-value-wrapper'>
						<BatteryStatus level={batteryLevel} />
					</div>
				</React.Fragment>
			);
		}

		if (device.type === 'SMART_PLUG' && attributes.ambientTemperature?.value !== undefined) {
			statusElements.push(
				<StatusItem
					key='ambientTemperature'
					label='Temp. otoczenia'
					value={`${attributes.ambientTemperature.value}°C`}
				/>
			);
		}

		return (
			<div className='status-grid'>
				{statusElements.length > 0 ? statusElements : <p>Brak szczegółowych danych o stanie.</p>}
			</div>
		);
	};

	const renderDeviceControls = () => {
		switch (device?.type) {
			case 'MOWER':
				return <MowerControls onCommand={sendCommand} isSubmitting={isSubmitting} />;
			case 'SMART_WATERING_COMPUTER':
				return <WateringControls device={device} onCommand={sendCommand} isSubmitting={isSubmitting} />;
			case 'SMART_PLUG':
				return <PlugControls onCommand={sendCommand} isSubmitting={isSubmitting} />;
			default:
				return (
					<p style={{ textAlign: 'center', color: 'var(--text-light)' }}>
						To urządzenie nie obsługuje zdalnego sterowania.
					</p>
				);
		}
	};

	if (loading && !device) {
		return (
			<div className='loading-indicator'>
				<div className='spinner'></div>
				<p>Wczytywanie danych urządzenia...</p>
			</div>
		);
	}
	if (!device) {
		return (
			<div className='error-message'>
				<p className='error-title'>Nie znaleziono urządzenia!</p>
				<p>Urządzenie o ID "{deviceId}" nie zostało odnalezione.</p>
				<button onClick={onBackToList} className='btn btn--secondary btn--pill'>
					Wróć do listy urządzeń
				</button>
			</div>
		);
	}

	return (
		<div className='device-detail-page'>
			<div className='device-detail-page__main-content'>
				<div className='device-title-container'>
					{isEditingName ? (
						<div className='edit-name-form'>
							<input
								type='text'
								value={newDeviceName}
								onChange={e => setNewDeviceName(e.target.value)}
								className='edit-name-input'
							/>
							<button onClick={handleSaveName} className='btn-icon-action btn-save'>
								<Save size={20} />
							</button>
							<button onClick={() => setIsEditingName(false)} className='btn-icon-action btn-cancel'>
								<X size={20} />
							</button>
						</div>
					) : (
						<>
							<h2>{device.displayName || 'Nieznane urządzenie'}</h2>
							{device.commonServiceId && (
								<button onClick={() => setIsEditingName(true)} className='btn-icon-action btn-edit'>
									<Edit2 size={20} />
								</button>
							)}
						</>
					)}
				</div>

				<div className='device-button-container'>
					<button onClick={() => setShowDetails(!showDetails)} className='btn btn--outline-blue btn--pill'>
						{showDetails ? 'Ukryj Szczegóły' : 'Pokaż Szczegóły'}
					</button>
					<button onClick={onBackToList} className='btn btn--secondary btn--pill'>
						Wróć
					</button>
				</div>

				{showDetails && (
					<div className='device-info-section'>
						<p>
							<strong>ID Urządzenia:</strong> {device.id}
						</p>
						<p>
							<strong>ID Usługi (do zmiany nazwy):</strong> {device.commonServiceId}
						</p>
						<p>
							<strong>Typ:</strong> {device.type || 'N/A'}
						</p>
						<p>
							<strong>Model:</strong> {device.attributes?.modelType?.value || 'N/A'}
						</p>
					</div>
				)}
				<div className='detail-section'>
					<h3>Aktualny stan:</h3>
					{renderDeviceState(device.attributes)}
				</div>
				{device.type === 'MOWER' && (
					<div className='animation'>
						<img className='img-grass' src={grassImage} alt='Grass' />
						<img className='img-mower' src={mowerImage} alt='Mower' />
						<img className='img-wheel' src={wheelImage} alt='Wheel' />
					</div>
				)}
			</div>

			<div className='control-form'>
				<h3>Steruj urządzeniem</h3>
				{renderDeviceControls()}
			</div>

			{device.type === 'SMART_WATERING_COMPUTER' && device._valveServices?.length > 0 && (
				<div className='valve-section'>
					<h3>Szczegóły i sterowanie zaworami</h3>
					<div className='grid'>
						{device._valveServices.map(valve => (
							<ValveCard key={valve.id} valve={valve} />
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default DeviceDetailPage;
