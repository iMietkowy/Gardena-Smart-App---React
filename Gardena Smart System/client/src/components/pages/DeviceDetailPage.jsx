import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext.jsx';
import { useNotificationContext } from '@/context/NotificationContext.jsx';
import Loader from '@/components/common/Loader';
import MowerControls from '@/components/devices/MowerControls';
import WateringControls from '@/components/devices/WateringControls';
import PlugControls from '@/components/devices/PlugControls';
import ValveCard from '@/components/devices/ValveCard';
import DeviceStatusDisplay from '@/components/devices/DeviceStatusDisplay.jsx';
import mowerImage from '@/assets/img/Mower.png';
import wheelImage from '@/assets/img/Wheel.png';
import grassImage from '@/assets/img/Grass.png';
import ParkMowerModal from '@/components/devices/ParkMowerModal.jsx';

const DeviceDetailPage = () => {
	const { devices, loading } = useAppContext();
	const { showToastNotification, addNotificationToBell } = useNotificationContext();
	const { deviceId } = useParams();
	const navigate = useNavigate();
	const onBackToList = () => navigate('/devices');
	const device = devices.find(d => d.id === deviceId);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showDetails, setShowDetails] = useState(false);
	const [showParkMowerModal, setShowParkMowerModal] = useState(false);

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

	const renderDeviceControls = useCallback(() => {
		switch (device?.type) {
			case 'MOWER':
				return <MowerControls onCommand={sendCommand} />;
			case 'SMART_WATERING_COMPUTER':
				return <WateringControls device={device} onCommand={sendCommand} />;
			case 'SMART_PLUG':
				return <PlugControls onCommand={sendCommand} isSubmitting={isSubmitting} />;
			default:
				return (
					<p style={{ textAlign: 'center', color: 'var(--text-light)' }}>
						To urządzenie nie obsługuje zdalnego sterowania.
					</p>
				);
		}
	}, [device, sendCommand, isSubmitting]);

	if (loading && !device) {
		return <Loader />;
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

	const isMowerActive =
		device.type === 'MOWER' &&
		['MOWING', 'OK_CUTTING', 'SCHEDULED_MOWING'].includes(device.attributes?.activity?.value?.toUpperCase());

	return (
		<div className='device-detail-page'>
			<div className='device-detail-page__main-content'>
				<div className='device-title-container'>
					<h2>{device.displayName || 'Nieznane urządzenie'}</h2>
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
							<strong>Typ:</strong> {device.type || 'N/A'}
						</p>
						<p>
							<strong>Model:</strong> {device.attributes?.modelType?.value || 'N/A'}
						</p>
					</div>
				)}
				<div className='detail-section'>
					<h3>Aktualny stan:</h3>
					<DeviceStatusDisplay device={device} isDetailed={true} />
				</div>
				{isMowerActive && (
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
			{showParkMowerModal && (
				<ParkMowerModal
					onConfirm={action => {
						sendCommand(action);
						setShowParkMowerModal(false);
					}}
					onCancel={() => setShowParkMowerModal(false)}
					isSubmitting={isSubmitting}
				/>
			)}
		</div>
	);
};

export default DeviceDetailPage;
