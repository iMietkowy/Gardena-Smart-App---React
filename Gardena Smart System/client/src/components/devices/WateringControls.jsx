import React, { useState, useEffect } from 'react';
import { useControlForm } from '@/hooks/useControlForm';
import { useDurationInput } from '@/hooks/useDurationInput';
import DurationSelector from '@/components/common/DurationSelector'; // Import nowego komponentu

const WateringControls = ({ device, onCommand }) => {
	const maxDuration = 90; // W minutach
	const { isSubmitting, handleSubmit, showToastNotification } = useControlForm(onCommand);

	const {
		durationValue,
		setDurationValue,
		handleDurationChange,
		handlePresetClick,
		customInputValue,
		setCustomInputValue,
	} = useDurationInput(maxDuration, 'minutes');

	const [selectedValveServiceId, setSelectedValveServiceId] = useState('');

	useEffect(() => {
		if (device._valveServices?.length > 0) {
			const activeWateringStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
			const activeValve = device._valveServices.find(v =>
				activeWateringStates.includes(v.attributes?.activity?.value?.toUpperCase())
			);
			if (activeValve) {
				setSelectedValveServiceId(activeValve.id);
			} else {
				setSelectedValveServiceId(device._valveServices[0].id);
			}
		} else {
			setSelectedValveServiceId('');
		}
		setDurationValue(''); // Resetuj stan wartości czasu trwania
		setCustomInputValue(''); // Resetuj stan pola wejściowego
	}, [device, setDurationValue, setCustomInputValue]);

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

	const handleStartWatering = e => {
		e.preventDefault();
		if (!selectedValveServiceId) {
			showToastNotification('Proszę wybrać sekcję podlewania.', 'error');
			return;
		}
		if (!durationValue || parseInt(durationValue, 10) <= 0) {
			showToastNotification('Proszę ustawić czas trwania podlewania.', 'error');
			return;
		}
		handleSubmit('startWatering', durationValue, selectedValveServiceId);
	};

	const handleStopWatering = () => {
		let valveToStop = selectedValveServiceId;
		if (!valveToStop) {
			const activeStates = ['MANUAL_WATERING', 'SCHEDULED_WATERING', 'RUNNING', 'OPEN'];
			const activeValve = device._valveServices.find(v =>
				activeStates.includes(v.attributes?.activity?.value?.toUpperCase())
			);
			if (activeValve) {
				valveToStop = activeValve.id;
			}
		}
		if (valveToStop) {
			handleSubmit('stopWatering', null, valveToStop);
		}
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
				<DurationSelector
					presets={durationPresets}
					durationValue={durationValue}
					onPresetClick={handlePresetClick}
					customInputValue={customInputValue}
					onCustomInputChange={handleDurationChange}
					maxDuration={maxDuration}
					unitLabel='minutach'
					inputPlaceholder='np. 45'
				/>
			)}

			<div className='btn-group' style={{ justifyContent: 'center', marginTop: '1rem' }}>
				<button
					type='submit'
					className='btn btn--primary btn--rounded'
					disabled={!selectedValveServiceId || !durationValue || isSubmitting}
				>
					{getPrimaryButtonText()}
				</button>
				<button
					type='button'
					onClick={handleStopWatering}
					className='btn btn--danger btn--rounded'
					disabled={isSubmitting || !isAnyValveActive()}
				>
					Stop
				</button>
			</div>
		</form>
	);
};

export default WateringControls;
