import React, { useState, useMemo, useEffect } from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';
import { daysOfWeekUIOrder } from '../utils/constants';

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

		const startDate = new Date();
		startDate.setHours(parseInt(startHour, 10), parseInt(startMinute, 10));
		const endDate = new Date();
		endDate.setHours(parseInt(endHour, 10), parseInt(endMinute, 10));

		if (endDate <= startDate) {
			showToastNotification('Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.', 'error');
			return;
		}

		const durationInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
		const cronDays = days.map(dayShort => daysOfWeekUIOrder.find(d => d.short === dayShort)?.cronIndex).join(',');
		const cron = `${startMinute} ${startHour} * * ${cronDays}`;

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
