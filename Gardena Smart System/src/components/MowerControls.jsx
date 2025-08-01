import React, { useState } from 'react';
import { useControlForm } from '../hooks/useControlForm';

const MowerControls = ({ onCommand }) => {
	const {
		isSubmitting,
		controlAction,
		setControlAction,
		controlValue,
		setControlValue,
		handleSubmit,
		showToastNotification,
	} = useControlForm(onCommand);

	const [customHoursInput, setCustomHoursInput] = useState('1');

	const durationPresets = [
		{ label: '1 godzina', minutes: 60 },
		{ label: '2 godziny', minutes: 120 },
		{ label: '3 godziny', minutes: 180 },
		{ label: '6 godzin', minutes: 360 },
	];
	const maxDuration = 6;

	const handleActionChange = action => {
		setControlAction(action);
		if (action !== 'start') {
			setControlValue(null);
		}
	};

	const handleSubmitForm = e => {
		e.preventDefault();
		if (!controlAction) {
			showToastNotification('Proszę wybrać akcję do wykonania.', 'error');
			return;
		}
		const valueToSend = controlAction === 'start' ? controlValue : null;
		handleSubmit(controlAction, valueToSend);
	};

	const getButtonText = () => {
		if (isSubmitting) {
			return 'Wysyłanie...';
		}
		switch (controlAction) {
			case 'start':
				return 'Rozpocznij koszenie';
			case 'parkUntilNextTask':
				return 'Parkuj do zadania';
			case 'parkUntilFurtherNotice':
				return 'Parkuj do odwołania';
			default:
				return 'Wybierz akcję';
		}
	};

	return (
		<form onSubmit={handleSubmitForm}>
			<div className='actions-container'>
				<div className='action-selection'>
					<label>Akcje:</label>
					<div className='btn-group'>
						<button
							type='button'
							onClick={() => handleActionChange('start')}
							className={`btn-toggle ${controlAction === 'start' ? 'active' : ''}`}
						>
							Start
						</button>
						<button
							type='button'
							onClick={() => handleActionChange('parkUntilNextTask')}
							className={`btn-toggle ${controlAction === 'parkUntilNextTask' ? 'active' : ''}`}
						>
							Parkuj do zadania
						</button>
						<button
							type='button'
							onClick={() => handleActionChange('parkUntilFurtherNotice')}
							className={`btn-toggle ${controlAction === 'parkUntilFurtherNotice' ? 'active' : ''}`}
						>
							Parkuj do odwołania
						</button>
					</div>
				</div>
			</div>

			{controlAction === 'start' && (
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
									setCustomHoursInput((preset.minutes / 60).toString());
								}}
							>
								{preset.label}
							</button>
						))}
					</div>
					<div className='duration-input-group'>
						<label htmlFor='controlValue'>Niestandardowy czas (w godzinach):</label>
						<input
							type='text'
							className='custom-duration-input'
							id='controlValue'
							value={customHoursInput}
							onChange={e => {
								const rawValue = e.target.value.replace(',', '.');
								if (!/^[0-9]*\.?[0-9]*$/.test(rawValue)) return;
								setCustomHoursInput(rawValue);

								const numericValue = parseFloat(rawValue);
								if (isNaN(numericValue) || rawValue === '') {
									setControlValue('');
								} else {
									let finalValue = Math.min(numericValue, maxDuration);
									if (numericValue > maxDuration) {
										showToastNotification(`Maksymalny czas to ${maxDuration} godzin.`, 'info');
										setCustomHoursInput(finalValue.toString());
									}
									setControlValue(String(finalValue * 60));
								}
							}}
							min='0'
							max={maxDuration}
							step='0.5'
							placeholder='np. 1.5'
						/>
					</div>
				</div>
			)}

			<button type='submit' className='btn btn--primary btn--rounded' disabled={!controlAction || isSubmitting}>
				{getButtonText()}
			</button>
		</form>
	);
};

export default MowerControls;