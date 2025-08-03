import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNotificationContext } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';
import ConfirmationModal from './ConfirmationModal';
import { useScheduleCalculator } from '../hooks/useScheduleCalculator';
import ScheduleForm from './ScheduleForm';
import ScheduleGrid from './ScheduleGrid';

const SchedulePage = () => {
	const { devices: allDevices } = useAppContext();
	const { showToastNotification } = useNotificationContext();

	const [schedules, setSchedules] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showConfirmationModal, setShowConfirmationModal] = useState(false);
	const [modalConfig, setModalConfig] = useState({ message: '', onConfirm: () => {} });
	const [selectedDeviceForSchedule, setSelectedDeviceForSchedule] = useState('all');

	const fetchSchedules = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/schedules', { cache: 'no-cache' });
			if (!response.ok) throw new Error('Nie udało się pobrać harmonogramów');
			const data = await response.json();
			setSchedules(data);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSchedules();
	}, []);

	const scheduledTasks = useScheduleCalculator(schedules, selectedDeviceForSchedule);

	const handleAddSchedule = async newSchedule => {
		try {
			const response = await fetch('/api/schedules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newSchedule),
			});
			if (!response.ok) throw new Error((await response.json()).error || 'Nie udało się zapisać harmonogramu');
			await fetchSchedules();
			showToastNotification('Harmonogram został pomyślnie dodany!', 'success');
		} catch (err) {
			showToastNotification(`Błąd: ${err.message}`, 'error');
		}
	};

	const openConfirmationModal = (message, onConfirmAction) => {
		setModalConfig({ message: message, onConfirm: onConfirmAction });
		setShowConfirmationModal(true);
	};

	const handleToggleSchedule = async (id, currentStatus) => {
		try {
			await fetch(`/api/schedules/${id}/toggle`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: !currentStatus }),
			});
			await fetchSchedules();
			showToastNotification(`Zadanie zostało ${!currentStatus ? 'włączone' : 'wyłączone'}.`, 'success');
		} catch (err) {
			showToastNotification(err.message, 'error');
		}
	};

	const handleDelete = id => {
		openConfirmationModal('Czy na pewno chcesz usunąć ten harmonogram?', async () => {
			try {
				await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
				await fetchSchedules();
				showToastNotification('Harmonogram został pomyślnie usunięty!', 'success');
			} catch (err) {
				showToastNotification(`Błąd: ${err.message}`, 'error');
			}
			setShowConfirmationModal(false);
		});
	};

	const handleMassAction = async actionType => {
		const isAll = selectedDeviceForSchedule === 'all';
		const deviceName = allDevices.find(d => d.id === selectedDeviceForSchedule)?.displayName || 'wybranego urządzenia';
		const urls = {
			delete: isAll ? '/api/schedules/all' : `/api/schedules/device/${selectedDeviceForSchedule}`,
			disable: isAll ? '/api/schedules/all/disable' : `/api/schedules/device/${selectedDeviceForSchedule}/disable`,
			enable: isAll ? '/api/schedules/all/enable' : `/api/schedules/device/${selectedDeviceForSchedule}/enable`,
		};
		const messages = {
			delete: isAll
				? 'Czy na pewno chcesz usunąć WSZYSTKIE harmonogramy?'
				: `Czy na pewno chcesz usunąć wszystkie harmonogramy dla "${deviceName}"?`,
			disable: isAll
				? 'Czy na pewno chcesz wstrzymać WSZYSTKIE harmonogramy?'
				: `Czy na pewno chcesz wstrzymać harmonogramy dla "${deviceName}"?`,
			enable: isAll
				? 'Czy na pewno chcesz wznowić WSZYSTKIE harmonogramy?'
				: `Czy na pewno chcesz wznowić harmonogramy dla "${deviceName}"?`,
		};
		const successMessages = {
			delete: 'Harmonogramy zostały usunięte.',
			disable: 'Harmonogramy zostały wstrzymane.',
			enable: 'Harmonogramy zostały wznowione.',
		};

		openConfirmationModal(messages[actionType], async () => {
			try {
				const method = actionType === 'delete' ? 'DELETE' : 'PATCH';
				await fetch(urls[actionType], { method });
				await fetchSchedules();
				showToastNotification(successMessages[actionType], 'success');
			} catch (err) {
				showToastNotification(`Błąd: ${err.message}`, 'error');
			}
			setShowConfirmationModal(false);
		});
	};

	const filterDeviceOptions = useMemo(
		() => [
			{ value: 'all', label: 'Wszystkie urządzenia' },
			...allDevices.map(device => ({ value: device.id, label: device.displayName })),
		],
		[allDevices]
	);

	const hasSchedulesForFilter = schedules.some(
		s => selectedDeviceForSchedule === 'all' || s.deviceId === selectedDeviceForSchedule
	);
	const hasEnabledSchedules = schedules.some(
		s => (selectedDeviceForSchedule === 'all' || s.deviceId === selectedDeviceForSchedule) && s.enabled
	);
	const hasDisabledSchedules = schedules.some(
		s => (selectedDeviceForSchedule === 'all' || s.deviceId === selectedDeviceForSchedule) && !s.enabled
	);

	return (
		<div className='schedule-page'>
			<h2>Zarządzaj Harmonogramem</h2>
			<div className='schedule-container'>
				<ScheduleForm devices={allDevices} onAddSchedule={handleAddSchedule} />

				<div className='schedule-list-container'>
					<h3>Aktywne zadania</h3>
					{loading && <p>Ładowanie...</p>}
					{error && (
						<div style={{ padding: '2rem 0', textAlign: 'center' }}>
							<p className='error-title' style={{ fontWeight: 700, color: '#ef4444' }}>
								Błąd:
							</p>
							<p style={{ color: 'var(--text-light)', marginTop: '0.5rem', fontWeight: 600 }}>{error}</p>
						</div>
					)}

					<div className='schedule-filter-device'>
						<label>Pokaż harmonogram dla:</label>
						<CustomSelect
							value={selectedDeviceForSchedule}
							onChange={setSelectedDeviceForSchedule}
							options={filterDeviceOptions}
						/>
						<div className='schedule-actions-group'>
							{hasEnabledSchedules && (
								<button onClick={() => handleMassAction('disable')} className='btn btn--secondary btn--rounded'>
									Wstrzymaj
								</button>
							)}
							{hasDisabledSchedules && (
								<button onClick={() => handleMassAction('enable')} className='btn btn--primary btn--rounded'>
									Wznów
								</button>
							)}
							{hasSchedulesForFilter && (
								<button onClick={() => handleMassAction('delete')} className='btn btn--danger btn--rounded'>
									Wyczyść
								</button>
							)}
						</div>
					</div>

					<ScheduleGrid tasks={scheduledTasks} onToggle={handleToggleSchedule} onDelete={handleDelete} />
				</div>
			</div>

			{showConfirmationModal && (
				<ConfirmationModal
					message={modalConfig.message}
					onConfirm={modalConfig.onConfirm}
					onCancel={() => setShowConfirmationModal(false)}
				/>
			)}
		</div>
	);
};

export default SchedulePage;
