import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useNotificationContext } from '@/context/NotificationContext';
import Loader from '@/components/common/Loader';
import CustomSelect from '@/components/common/CustomSelect';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useScheduleCalculator } from '@/hooks/useScheduleCalculator';
import ScheduleForm from '@/components/schedule/ScheduleForm';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import TaskDetailModal from '@/components/schedule/TaskDetailModal';
import * as scheduleApi from '@/utils/scheduleApi';

const SchedulePage = () => {
	const { devices: allDevices } = useAppContext();
	const { showToastNotification } = useNotificationContext();

	const [schedules, setSchedules] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showConfirmationModal, setShowConfirmationModal] = useState(false);
	const [modalConfig, setModalConfig] = useState({ message: '', onConfirm: () => {} });
	const [selectedDeviceForSchedule, setSelectedDeviceForSchedule] = useState('all');
	const [selectedTask, setSelectedTask] = useState(null);

	const fetchSchedules = useCallback(async () => {
		try {
			setLoading(true);
			const data = await scheduleApi.getSchedules();
			setSchedules(data);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSchedules();
	}, [fetchSchedules]);

	const scheduledTasks = useScheduleCalculator(schedules, selectedDeviceForSchedule);

	const handleAddSchedule = async newSchedule => {
		try {
			await scheduleApi.addSchedule(newSchedule);
			await fetchSchedules();
			showToastNotification('Harmonogram został pomyślnie dodany!', 'success');
		} catch (err) {
			showToastNotification(`Błąd: ${err.message}`, 'error');
		}
	};

	const handleToggleSchedule = async (id, currentStatus) => {
		try {
			await scheduleApi.toggleSchedule(id, !currentStatus);
			await fetchSchedules();
			showToastNotification(`Zadanie zostało ${!currentStatus ? 'włączone' : 'wyłączone'}.`, 'success');
		} catch (err) {
			showToastNotification(`Błąd: ${err.message}`, 'error');
		}
		setSelectedTask(null);
	};

	const handleDelete = async id => {
		setSelectedTask(null);
		openConfirmationModal('Czy na pewno chcesz usunąć to zadanie?', async () => {
			try {
				await scheduleApi.deleteSchedule(id);
				await fetchSchedules();
				showToastNotification('Harmonogram został pomyślnie usunięty!', 'success');
			} catch (err) {
				showToastNotification(`Błąd: ${err.message}`, 'error');
			}
			setShowConfirmationModal(false);
		});
	};

	const openConfirmationModal = (message, onConfirmAction) => {
		setModalConfig({ message: message, onConfirm: onConfirmAction });
		setShowConfirmationModal(true);
	};

	const handleMassAction = actionType => {
		const deviceName = allDevices.find(d => d.id === selectedDeviceForSchedule)?.displayName || 'wybranego urządzenia';
		const messages = {
			delete:
				selectedDeviceForSchedule === 'all'
					? 'Czy na pewno chcesz usunąć WSZYSTKIE harmonogramy?'
					: `Czy na pewno chcesz usunąć wszystkie harmonogramy dla "${deviceName}"?`,
			disable:
				selectedDeviceForSchedule === 'all'
					? 'Czy na pewno chcesz wstrzymać WSZYSTKIE harmonogramy?'
					: `Czy na pewno chcesz wstrzymać harmonogramy dla "${deviceName}"?`,
			enable:
				selectedDeviceForSchedule === 'all'
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
				await scheduleApi.performMassAction(actionType, selectedDeviceForSchedule);
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
					{loading && <Loader />}
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
					<ScheduleGrid tasks={scheduledTasks} onTaskClick={setSelectedTask} />
				</div>
			</div>

			<TaskDetailModal
				task={selectedTask}
				onToggle={handleToggleSchedule}
				onDelete={handleDelete}
				onClose={() => setSelectedTask(null)}
			/>

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
