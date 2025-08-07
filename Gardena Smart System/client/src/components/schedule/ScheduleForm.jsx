import React, { useState, useMemo, useEffect } from 'react';
import { useNotificationContext } from '@/context/NotificationContext';
import CustomSelect from '@/components/common/CustomSelect';
import { daysOfWeekUIOrder } from '@/utils/constants';

const ScheduleForm = ({ devices, onAddSchedule }) => {
	const { showToastNotification } = useNotificationContext();

	const [selectedDeviceId, setSelectedDeviceId] = useState('');
	const [selectedValveId, setSelectedValveId] = useState('');
	const [action, setAction] = useState('');
	const [startHour, setStartHour] = useState('08');
	const [startMinute, setStartMinute] = useState('00');
	const [endHour, setEndHour] = useState('09');
	const [endMinute, setEndMinute] = useState('00');
	const [days, setDays] = useState([]);

	const schedulableDevices = useMemo(() => {
		return devices.filter(d => d.type === 'MOWER' || d.type === 'SMART_WATERING_COMPUTER');
	}, [devices]);

	const selectedDevice = useMemo(() => {
		return devices.find(d => d.id === selectedDeviceId);
	}, [devices, selectedDeviceId]);

	useEffect(() => {
		setSelectedValveId('');
		setAction('');
	}, [selectedDeviceId]);

	const handleDayChange = dayShort => {
		setDays(prev => (prev.includes(dayShort) ? prev.filter(d => d !== dayShort) : [...prev, dayShort]));
	};

	const handleSubmit = e => {
		e.preventDefault();

		if (!selectedDeviceId || !action || days.length === 0) {
			showToastNotification('Proszę wypełnić wszystkie pola formularza.', 'error');
			return;
		}

		const localStartHour = parseInt(startHour, 10);
		const localStartMinute = parseInt(startMinute, 10);
		const localEndHour = parseInt(endHour, 10);
		const localEndMinute = parseInt(endMinute, 10);

		const startTimeInMinutes = localStartHour * 60 + localStartMinute;
		const endTimeInMinutes = localEndHour * 60 + localEndMinute;

		if (endTimeInMinutes <= startTimeInMinutes) {
			showToastNotification('Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.', 'error');
			return;
		}

		const durationInMinutes = endTimeInMinutes - startTimeInMinutes;

		// --- NOWA, NIEZAWODNA LOGIKA PRZELICZANIA CZASU NA UTC ---
		
		// getTimezoneOffset() zwraca różnicę w minutach (np. -120 dla UTC+2).
		// Dzielimy przez -60, aby uzyskać przesunięcie w godzinach (np. 2 dla UTC+2).
		const timezoneOffsetHours = new Date().getTimezoneOffset() / -60;

		let utcStartHour = localStartHour - timezoneOffsetHours;
		let dayOffset = 0; // O ile dni trzeba przesunąć harmonogram

		// Obsługa sytuacji, gdy przeliczenie na UTC cofa nas do poprzedniego dnia
		if (utcStartHour < 0) {
			utcStartHour += 24; // np. -2 staje się 22
			dayOffset = -1; // Zadanie w UTC jest dzień wcześniej
		}
		// Obsługa sytuacji, gdy przeliczenie na UTC przenosi nas do następnego dnia
		if (utcStartHour >= 24) {
			utcStartHour -= 24; // np. 25 staje się 1
			dayOffset = 1; // Zadanie w UTC jest dzień później
		}

		const cronDays = days
			.map(dayShort => {
				const selectedDay = daysOfWeekUIOrder.find(d => d.short === dayShort);
				if (!selectedDay) return null;

				let utcDay = selectedDay.cronIndex + dayOffset;

				// Poprawna obsługa "zawijania" się tygodnia
				if (utcDay < 0) {
					utcDay = 6; // Przesunięcie z Niedzieli (0) na Sobotę (6)
				}
				if (utcDay > 6) {
					utcDay = 0; // Przesunięcie z Soboty (6) na Niedzielę (0)
				}
				return utcDay;
			})
			.filter(day => day !== null)
			.join(',');
		
		if (!cronDays) {
			showToastNotification('Proszę wybrać przynajmniej jeden dzień tygodnia.', 'error');
			return;
		}

		const cron = `${localStartMinute} ${utcStartHour} * * ${cronDays}`;
		// --- KONIEC NOWEJ LOGIKI ---

		const deviceName = selectedDevice?.displayName || 'Urządzenie';
		const valveName = selectedDevice?._valveServices?.find(v => v.id === selectedValveId)?.attributes?.name?.value;
		const fullDeviceName = valveName ? `${deviceName} - ${valveName}` : deviceName;

		const newSchedule = {
			cron,
			deviceId: selectedDeviceId,
			valveServiceId: selectedValveId,
			deviceName: fullDeviceName,
			action,
			value: durationInMinutes,
			deviceType: selectedDevice?.type,
			enabled: true,
		};

		onAddSchedule(newSchedule);
	};

	const deviceOptions = schedulableDevices.map(d => ({ value: d.id, label: d.displayName }));
	const valveOptions = selectedDevice?._valveServices.map(v => ({ value: v.id, label: v.attributes.name.value })) || [];
	const actionOptions = useMemo(() => {
		if (!selectedDevice) return [];
		if (selectedDevice.type === 'MOWER') return [{ value: 'start', label: 'Rozpocznij koszenie' }];
		if (selectedDevice.type === 'SMART_WATERING_COMPUTER')
			return [{ value: 'startWatering', label: 'Rozpocznij podlewanie' }];
		return [];
	}, [selectedDevice]);

	const hourOptions = useMemo(
		() =>
			Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') })),
		[]
	);
	const minuteOptions = useMemo(
		() =>
			Array.from({ length: 60 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') })),
		[]
	);

	return (
		<div className='schedule-form-container'>
			<h3>Nowe zadanie</h3>
			<form onSubmit={handleSubmit} className='schedule-form'>
				<label>Urządzenie</label>
				<CustomSelect
					value={selectedDeviceId}
					onChange={setSelectedDeviceId}
					options={deviceOptions}
					placeholder='-- Wybierz urządzenie --'
				/>

				{selectedDevice?.type === 'SMART_WATERING_COMPUTER' && (
					<>
						<label>Zawór</label>
						<CustomSelect
							value={selectedValveId}
							onChange={setSelectedValveId}
							options={valveOptions}
							placeholder='-- Wybierz zawór --'
						/>
					</>
				)}

				{selectedDevice && (
					<>
						<label>Akcja</label>
						<CustomSelect
							value={action}
							onChange={setAction}
							options={actionOptions}
							placeholder='-- Wybierz akcję --'
						/>
					</>
				)}

				<div className='time-range-selector'>
					<div className='time-picker-group'>
						<label>Od:</label>
						<CustomSelect value={startHour} onChange={setStartHour} options={hourOptions} />
						<span>:</span>
						<CustomSelect value={startMinute} onChange={setStartMinute} options={minuteOptions} />
					</div>
					<div className='time-picker-group'>
						<label>Do:</label>
						<CustomSelect value={endHour} onChange={setEndHour} options={hourOptions} />
						<span>:</span>
						<CustomSelect value={endMinute} onChange={setEndMinute} options={minuteOptions} />
					</div>
				</div>

				<label>Dni tygodnia</label>
				<div className='btn-group'>
					{daysOfWeekUIOrder.map(day => (
						<button
							type='button'
							key={day.short}
							onClick={() => handleDayChange(day.short)}
							className={`btn-toggle ${days.includes(day.short) ? 'active' : ''}`}
						>
							{day.short}
						</button>
					))}
				</div>

				<button type='submit' className='btn btn--primary btn--rounded'>
					Dodaj do harmonogramu
				</button>
			</form>
		</div>
	);
};

export default ScheduleForm;