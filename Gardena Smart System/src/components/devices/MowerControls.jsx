import React from 'react';
import { useControlForm } from '../../hooks/useControlForm';
import { useDurationInput } from '../../hooks/useDurationInput';
import DurationSelector from '../common/DurationSelector';

const MowerControls = ({ onCommand }) => {
	const maxDuration = 6;
	const { isSubmitting, controlAction, setControlAction, handleSubmit, showToastNotification } =
		useControlForm(onCommand);
	const { durationValue, handleDurationChange, handlePresetClick, customInputValue } = useDurationInput(
		maxDuration,
		'hours'
	);

	const durationPresets = [
		{ label: '1 godzina', minutes: 60 },
		{ label: '2 godziny', minutes: 120 },
		{ label: '3 godziny', minutes: 180 },
		{ label: '6 godzin', minutes: 360 },
	];

	const handleActionChange = action => {
		setControlAction(action);
	};

	const handleSubmitForm = e => {
		e.preventDefault();
		if (!controlAction) {
			showToastNotification('Proszę wybrać akcję do wykonania.', 'error');
			return;
		}
		const valueToSend = controlAction === 'start' ? durationValue : null;
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
				<DurationSelector
					presets={durationPresets}
					durationValue={durationValue}
					onPresetClick={handlePresetClick}
					customInputValue={customInputValue}
					onCustomInputChange={handleDurationChange}
					maxDuration={maxDuration}
					unitLabel='godzinach'
					inputPlaceholder='np. 1.5'
				/>
			)}

			<button type='submit' className='btn btn--primary btn--rounded' disabled={!controlAction || isSubmitting}>
				{getButtonText()}
			</button>
		</form>
	);
};

export default MowerControls;
