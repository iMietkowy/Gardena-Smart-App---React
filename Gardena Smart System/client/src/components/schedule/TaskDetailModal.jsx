import React from 'react';

const TaskDetailModal = ({ task, onToggle, onDelete, onClose }) => {
	if (!task) return null;

	const formattedCronDays = (cron) => {
		if (!cron) return '';
		const [, , , , days] = cron.split(' ');
		const dayMap = ['NIEDZ', 'PON', 'WTO', 'ŚRO', 'CZW', 'PIĄ', 'SOB'];
		return days.split(',').map(d => dayMap[d] || '').join(', ');
	};

	return (
		<div className='modal-overlay'>
			<div className='modal-content'>
				<h3 className='modal-title'>{task.deviceName}</h3>
				<div className='modal-task-details'>
					<p><strong>Akcja:</strong> {task.action.includes('Watering') ? 'Podlewanie' : 'Koszenie'}</p>
					<p><strong>Czas:</strong> {task.displayStartTime} - {task.displayEndTime}</p>
					<p><strong>W dni:</strong> {formattedCronDays(task.cron)}</p>
					<p><strong>Status:</strong> <span className={task.enabled ? 'status-ok' : 'status-warn'}>{task.enabled ? 'Włączony' : 'Wyłączony'}</span></p>
				</div>
				<div className='modal-actions vertical'>
					<button
						type='button'
						onClick={() => onToggle(task.id, task.enabled)}
						className={`btn ${task.enabled ? 'btn--secondary' : 'btn--primary'} btn--rounded`}
					>
						{task.enabled ? 'Wstrzymaj zadanie' : 'Wznów zadanie'}
					</button>
					<button
						type='button'
						onClick={() => onDelete(task.id)}
						className='btn btn--danger btn--rounded'
					>
						Usuń zadanie
					</button>
					<button
						type='button'
						onClick={onClose}
						className='btn btn--secondary btn--rounded'
					>
						Anuluj
					</button>
				</div>
			</div>
		</div>
	);
};

export default TaskDetailModal;