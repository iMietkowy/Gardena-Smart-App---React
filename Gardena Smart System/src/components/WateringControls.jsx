import React, { useState, useEffect } from 'react';
import { useNotificationContext } from '../context/NotificationContext';

const WateringControls = ({ device, onCommand, isSubmitting }) => {
	const { showToastNotification } = useNotificationContext();
	const [selectedValveServiceId, setSelectedValveServiceId] = useState('');
	const [controlValue, setControlValue] = useState('');
	const [customMinutesInput, setCustomMinutesInput] = useState('');

	useEffect(() => {
		if (device?._valveServices?.length > 0) {
			const activeWateringStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
			const activeValve = device._valveServices.find(v =>
				activeWateringStates.includes(v.attributes?.activity?.value?.toUpperCase())
			);
			if (activeValve) {
				setSelectedValveServiceId(activeValve.id);
			}
		} else {
			setSelectedValveServiceId('');
		}
		setControlValue('');
		setCustomMinutesInput('');
	}, [device]);

	const isAnyValveActive = () => {
		const activeStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
		return device._valveServices?.some(valve =>
			activeStates.includes(valve.attributes?.activity?.value?.toUpperCase())
		);
	};

	const durationPresets = [
		{ label: '1 min', minutes: 1 },
		{ label: '5 min', minutes: 5 },
		{ label: '15 min', minutes: 15 },
		{ label: '30 min', minutes: 30 },
	];
	const maxDuration = 90;

	const handleStartWatering = e => {
		e.preventDefault();
		if (!selectedValveServiceId) {
			showToastNotification('Proszę wybrać sekcję podlewania.', 'error');
			return;
		}
		if (!controlValue || parseInt(controlValue, 10) <= 0) {
			showToastNotification('Proszę ustawić czas trwania podlewania.', 'error');
			return;
		}
		onCommand('startWatering', controlValue, selectedValveServiceId);
	};

	const getPrimaryButtonText = () => {
		if (isSubmitting) {
			return 'Wysyłanie...';
		}
		if (!selectedValveServiceId) {
			return 'Wybierz sekcję';
		}
		return 'Uruchom podlewanie';
	};

	return (
		<form onSubmit={handleStartWatering}>
			{device._valveServices?.length > 0 && (
				<div className='valve-selection'>
					<label className='valve-selection-label'>Wybierz sekcję:</label>
					<div className='btn-group'>
						{device._valveServices.map(valve => (
							<label key={valve.id} className={`btn-toggle ${selectedValveServiceId === valve.id ? 'active' : ''}`}>
								<input
									type='radio'
									name='selectedValve'
									value={valve.id}
									checked={selectedValveServiceId === valve.id}
									onChange={e => {
										setSelectedValveServiceId(e.target.value);
									}}
								/>
								{valve.attributes?.name?.value || `Zawór ${valve.id.split(':').pop()}`}
							</label>
						))}
					</div>
				</div>
			)}

			{selectedValveServiceId && (
				<div className='duration-selection-container'>
					<label>Czas trwania:</label>
					<div className='btn-group'>
						{durationPresets.map(preset => (
							<button
								type='button'
								key={preset.minutes}
								className={`btn-toggle ${controlValue == preset.minutes ? 'active' : ''}`}
								onClick={() => {
									setControlValue(preset.minutes.toString());
									setCustomMinutesInput(preset.minutes.toString());
								}}
							>
								{preset.label}
							</button>
						))}
					</div>
					<div className='duration-input-group'>
						<label htmlFor='controlValue'>Niestandardowy czas (w minutach):</label>
						<input
							type='text'
							className='custom-duration-input'
							id='controlValue'
							value={customMinutesInput}
							onChange={e => {
								const rawValue = e.target.value;
								if (!/^[0-9]*$/.test(rawValue) && rawValue !== '') {
									return;
								}
								setCustomMinutesInput(rawValue);

								const numericValue = parseInt(rawValue, 10);
								if (isNaN(numericValue) || rawValue === '') {
									setControlValue('');
								} else {
									let finalValue = Math.min(numericValue, maxDuration);
									if (numericValue > maxDuration) {
										showToastNotification(`Maksymalny czas to ${maxDuration} minut.`, 'info');
										setCustomMinutesInput(finalValue.toString());
									}
									setControlValue(String(finalValue));
								}
							}}
							min='0'
							max={maxDuration}
							step='1'
							placeholder='np. 45'
						/>
					</div>
				</div>
			)}

			<div className='btn-group' style={{ justifyContent: 'center', marginTop: '1rem' }}>
				<button
					type='submit'
					className='btn btn--primary btn--rounded'
					disabled={!selectedValveServiceId || !controlValue || isSubmitting}
				>
					{getPrimaryButtonText()}
				</button>
				<button
					type='button'
					onClick={() => {
						if (!selectedValveServiceId && isAnyValveActive()) {
							const activeStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
							const activeValve = device._valveServices.find(v =>
								activeStates.includes(v.attributes?.activity?.value?.toUpperCase())
							);
							if (activeValve) {
								onCommand('stopWatering', null, activeValve.id);
								return;
							}
						}

						onCommand('stopWatering', null, selectedValveServiceId);
					}}
					className='btn btn--danger btn--rounded'
					disabled={isSubmitting || !selectedValveServiceId || !isAnyValveActive()}
				>
					Stop
				</button>
			</div>
		</form>
	);
};

export default WateringControls;
