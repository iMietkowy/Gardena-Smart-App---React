import React from 'react';

/**
 * Reużywalny komponent do wyboru czasu trwania za pomocą presetów lub pola input.
 * @param {Array} presets - Tablica obiektów presetów, np. [{ label: '1 godzina', minutes: 60 }]
 * @param {string|number} durationValue - Aktualnie wybrana wartość czasu trwania w minutach.
 * @param {Function} onPresetClick - Funkcja wywoływana po kliknięciu presetu.
 * @param {string} customInputValue - Wartość dla pola input.
 * @param {Function} onCustomInputChange - Funkcja obsługująca zmianę w polu input.
 * @param {number} maxDuration - Maksymalna dozwolona wartość.
 * @param {string} unitLabel - Etykieta jednostki, np. 'godzinach' lub 'minutach'.
 * @param {string} inputPlaceholder - Placeholder dla pola input.
 */
const DurationSelector = ({
	presets,
	durationValue,
	onPresetClick,
	customInputValue,
	onCustomInputChange,
	maxDuration,
	unitLabel,
	inputPlaceholder,
}) => {
	return (
		<div className='duration-selection-container'>
			<label>Czas trwania:</label>
			<div className='btn-group'>
				{presets.map(preset => (
					<button
						type='button'
						key={preset.minutes}
						className={`btn-toggle ${durationValue == preset.minutes ? 'active' : ''}`}
						onClick={() => onPresetClick(preset.minutes)}
					>
						{preset.label}
					</button>
				))}
			</div>
			<div className='duration-input-group'>
				<label htmlFor='customDurationInput'>Niestandardowy czas (w {unitLabel}):</label>
				<input
					type='text'
					className='custom-duration-input'
					id='customDurationInput'
					value={customInputValue}
					onChange={onCustomInputChange}
					max={maxDuration}
					placeholder={inputPlaceholder}
				/>
			</div>
		</div>
	);
};

export default DurationSelector;