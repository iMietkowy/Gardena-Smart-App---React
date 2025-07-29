import React from 'react';

const BatteryStatus = ({ level }) => {
	if (level === undefined || level === null) {
		return null;
	}

	let batteryColorClass = '';
	if (level < 20) {
		batteryColorClass = 'battery-red';
	} else if (level <= 50) {
		batteryColorClass = 'battery-orange';
	} else {
		batteryColorClass = 'battery-green';
	}

		return (
		<div className='battery-status-bar'>
			<div className='battery-progress-container'>
				<div className={`battery-progress-fill ${batteryColorClass}`} style={{ width: `${level}%` }}>
                    
                    <span className="battery-text">{level}%</span>
                </div>
			</div>
		</div>
	);
};

export default BatteryStatus;
