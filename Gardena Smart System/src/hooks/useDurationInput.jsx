import { useState, useCallback } from 'react';
import { useNotificationContext } from '../context/NotificationContext';

/**
 * Custom hook do zarządzania polem wejściowym czasu trwania.
 * @param {number} maxDuration - Maksymalny dozwolony czas trwania.
 * @param {string} unit - Jednostka czasu ('minutes' lub 'hours').
 * @param {number} [initialValue=0] - Początkowa wartość w jednostkach.
 * @returns {{
 * durationValue: string,
 * setDurationValue: Function,
 * handleDurationChange: Function,
 * handlePresetClick: Function,
 * customInputValue: string,
 * setCustomInputValue: Function
 * }}
 */
export const useDurationInput = (maxDuration, unit, initialValue = '') => {
	const { showToastNotification } = useNotificationContext();
	const [durationValue, setDurationValue] = useState(initialValue);
	const [customInputValue, setCustomInputValue] = useState(initialValue);

	const conversionFactor = unit === 'hours' ? 60 : 1;

	const handleDurationChange = useCallback(
		e => {
			const rawValue = e.target.value.replace(',', '.');
			if (!/^[0-9]*(\.?[0-9]*)?$/.test(rawValue)) {
				return;
			}
			setCustomInputValue(rawValue);

			const numericValue = parseFloat(rawValue);
			if (isNaN(numericValue) || rawValue === '') {
				setDurationValue('');
				return;
			}

			let finalValue = numericValue;
			if (unit === 'hours') {
				finalValue = Math.min(numericValue, maxDuration);
				if (numericValue > maxDuration) {
					showToastNotification(`Maksymalny czas to ${maxDuration} godzin.`, 'info');
					setCustomInputValue(finalValue.toString());
				}
				setDurationValue(String(finalValue * conversionFactor));
			} else {
				// unit === 'minutes'
				finalValue = Math.min(numericValue, maxDuration);
				if (numericValue > maxDuration) {
					showToastNotification(`Maksymalny czas to ${maxDuration} minut.`, 'info');
					setCustomInputValue(finalValue.toString());
				}
				setDurationValue(String(finalValue));
			}
		},
		[maxDuration, unit, conversionFactor, showToastNotification]
	);

	const handlePresetClick = useCallback(
		presetMinutes => {
			setDurationValue(String(presetMinutes));
			if (unit === 'hours') {
				setCustomInputValue((presetMinutes / conversionFactor).toString());
			} else {
				setCustomInputValue(String(presetMinutes));
			}
		},
		[unit, conversionFactor]
	);

	return {
		durationValue,
		setDurationValue,
		handleDurationChange,
		handlePresetClick,
		customInputValue,
		setCustomInputValue,
	};
};
