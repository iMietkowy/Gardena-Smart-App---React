import React from 'react';
import { daysOfWeekUIOrder } from '../utils/constants';

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
	value: String(i).padStart(2, '0'),
	label: String(i).padStart(2, '0'),
}));

const ScheduleGrid = ({ tasks, onToggle, onDelete }) => {
	return (
		<div className='schedule-grid'>
			<div className='grid-cell day-header-placeholder'></div>
			{daysOfWeekUIOrder.map(day => (
				<div key={day.full} className='grid-cell day-header'>
					{day.full}
				</div>
			))}

			<div className='hour-labels-column'>
				{hourOptions.map(hour => (
					<div key={hour.value} className='grid-cell hour-label'>
						{hour.label}:00
					</div>
				))}
			</div>

			{daysOfWeekUIOrder.map(day => (
				<div key={day.short} className='day-column'>
					{hourOptions.map(hour => (
						<div key={hour.value} className='hour-line' style={{ top: `${parseInt(hour.value, 10) * 60}px` }}></div>
					))}
					{tasks[day.short]?.map(task => {
						const topOffsetPx = task.start;
						const heightPx = task.height;
						const laneOffsetPercent = task.lane * (100 / task.totalLanes);
						const laneWidthPercent = 100 / task.totalLanes;
						const paddingHorizontal = 2;
						const taskClasses = `task-event ${task.action.includes('Watering') ? 'watering-task' : 'mowing-task'} ${!task.enabled ? 'disabled' : ''}`;

						return (
							<div
								key={task.id}
								className={taskClasses}
								style={{
									top: `${topOffsetPx}px`,
									height: `${heightPx}px`,
									left: `${laneOffsetPercent}%`,
									width: `calc(${laneWidthPercent}% - ${paddingHorizontal * 2}px)`,
									marginLeft: `${paddingHorizontal}px`,
									zIndex: 10 + task.lane,
								}}
							>
								<div className='task-header'>
									<span className='task-times'>
										{task.displayStartTime} - {task.displayEndTime}
									</span>
									<div className='task-controls'>
										<label className='switch'>
											<input type='checkbox' checked={task.enabled} onChange={() => onToggle(task.id, task.enabled)} />
											<span className='slider round'></span>
										</label>
										<button
											className='delete-task-btn'
											onClick={e => {
												e.stopPropagation();
												onDelete(task.id);
											}}
										>
											×
										</button>
									</div>
								</div>
								<span className='task-name'>{task.deviceName}</span>
								<span className='task-action'>{task.action.includes('Watering') ? 'Podlewanie' : 'Koszenie'}</span>
							</div>
						);
					})}
				</div>
			))}
		</div>
	);
};

export default ScheduleGrid;
