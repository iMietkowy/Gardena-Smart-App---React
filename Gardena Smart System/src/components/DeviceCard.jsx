import React from 'react';
import { Link } from 'react-router-dom';
import DeviceStatusDisplay from './DeviceStatusDisplay';
import mowerImage from '../img/Gardena_Mower_Sileno_Life.png';
import wateringComputerImage from '../img/GARDENA_smart_Irrigation_Control.png';
import smartPlugImage from '../img/Gardena_smart_plug.png';
import defaultDeviceImage from '../img/logo.svg';

const DeviceCard = ({ device }) => {
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
					<DeviceStatusDisplay device={device} isDetailed={false} />
				</div>
			</div>
			<div className='device-card__actions'>
				<button className='btn btn--primary btn--pill'>Szczegóły i sterowanie</button>
			</div>
		</Link>
	);
};

export default DeviceCard;
