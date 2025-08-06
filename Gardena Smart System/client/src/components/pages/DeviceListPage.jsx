import React from 'react';
import DeviceCard from '@/components/devices/DeviceCard';
import { useAppContext } from '@/context/AppContext';
import Loader from '@/components/common/Loader';

const DeviceList = () => {
	const { devices, loading } = useAppContext();

	if (loading) {
		return <Loader message='Pobieranie listy urządzeń...' />;
	}

	if (!devices || devices.length === 0) {
		return (
			<div className='empty-device-list-message'>
				<p>Brak urządzeń do wyświetlenia.</p>
				<p>Upewnij się, że Twój serwer backendowy działa i jest połączony z Gardena Smart System.</p>
			</div>
		);
	}

	return (
		<div className='device-list'>
			{devices.map(device => (
				<DeviceCard key={device.id} device={device} />
			))}
		</div>
	);
};

export default DeviceList;