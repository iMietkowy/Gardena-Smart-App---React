import React, { useState } from 'react'; 
import { daysOfWeekUIOrder } from '@/utils/constants';
import { useWindowWidth } from '@/hooks/useWindowWidth'; // Importuj hook do sprawdzania szerokości okna

const ScheduleGrid = ({ tasks, onTaskClick }) => {
	const hourOptions = Array.from({ length: 24 }, (_, i) => ({
		value: String(i).padStart(2, '0'),
		label: String(i).padStart(2, '0'),
	}));
	const paddingHorizontal = 2;

	// Stan do zarządzania widocznością i zawartością tooltipa
	const [hoveredTask, setHoveredTask] = useState(null);
	const [tooltipContent, setTooltipContent] = useState('');
	const [tooltipCoords, setTooltipCoords] = useState({ x: 0, y: 0 });

	const windowWidth = useWindowWidth(); // Użyj hooka do pobrania szerokości okna
	const isMobile = windowWidth <= 767; // Definiuj, kiedy uznajemy za widok mobilny (np. do 767px)

	// Funkcja obsługująca najechanie myszką na zadanie
	const handleMouseEnter = (event, task) => {
		// Nie pokazuj tooltipa na urządzeniach mobilnych
		if (isMobile) {
			return;
		}

		// Określ klasę statusu
		const statusClass = task.enabled ? 'status-ok' : 'status-warn';
		const statusText = task.enabled ? 'Włączony' : 'Wyłączony';

		// Tworzenie tekstu tooltipa z tagami HTML dla stylizacji
		const tooltipText = 
			`<strong>Urządzenie:</strong> ${task.deviceName}\n` +
			`<strong>Akcja:</strong> ${task.action.includes('Watering') ? 'Podlewanie' : 'Koszenie'}\n` +
			`<strong>Czas:</strong> ${task.displayStartTime} - ${task.displayEndTime}\n` +
			`<strong>W dni:</strong> ${task.dayUIShorts.join(', ')}\n` +
			`<strong>Status:</strong> <span class="${statusClass}">${statusText}</span>`; 
		
		setHoveredTask(task);
		setTooltipContent(tooltipText);
		
		// Oblicz pozycję tooltipa względem elementu, który wywołał zdarzenie
		const targetRect = event.currentTarget.getBoundingClientRect();
		setTooltipCoords({
			// Pozycjonowanie po prawej stronie elementu + niewielki margines
			x: targetRect.left - 130, 
			// Wyrównanie do góry elementu
			y: targetRect.top - 270,
		});
	};

	// Funkcja obsługująca opuszczenie myszką zadania
	const handleMouseLeave = () => {
		setHoveredTask(null);
		setTooltipContent('');
	};

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
								onClick={() => onTaskClick(task)}
								onMouseEnter={(event) => handleMouseEnter(event, task)} 
								onMouseLeave={handleMouseLeave} 
							>
								<div className='task-header'>
									<span className='task-times'>
										{task.displayStartTime} - {task.displayEndTime}
									</span>
								</div>
								<span className='task-name'>{task.deviceName}</span>
								<span className='task-action'>{task.action.includes('Watering') ? 'Podlewanie' : 'Koszenie'}</span>
							</div>
						);
					})}
				</div>
			))}

			{/* Niestandardowy komponent tooltipa będzie renderowany tylko, jeśli nie jest to widok mobilny */}
			{hoveredTask && !isMobile && (
				<div
					className='custom-tooltip'
					style={{
						left: tooltipCoords.x, 
						top: tooltipCoords.y,
					}}
				>
					<div className='custom-tooltip-content'>
						{tooltipContent.split('\n').map((line, index) => (
							<p key={index} dangerouslySetInnerHTML={{ __html: line }}></p>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default ScheduleGrid;
