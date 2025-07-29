import { useMemo } from 'react';

const daysOfWeekUIOrder = [
    { short: 'PON', full: 'Poniedziałek', cronIndex: 1 }, { short: 'WTO', full: 'Wtorek', cronIndex: 2 },
    { short: 'ŚRO', full: 'Środa', cronIndex: 3 }, { short: 'CZW', full: 'Czwartek', cronIndex: 4 },
    { short: 'PIĄ', full: 'Piątek', cronIndex: 5 }, { short: 'SOB', full: 'Sobota', cronIndex: 6 },
    { short: 'NIE', full: 'Niedziela', cronIndex: 0 }
];

const cronIndexToUIShortMap = daysOfWeekUIOrder.reduce((acc, day) => {
    acc[day.cronIndex] = day.short;
    return acc;
}, {});

const getTaskGridPosition = (job) => {
    const [jobMinute, jobHour, , , jobCronDays] = job.cron.split(' ');
    const startHour = parseInt(jobHour, 10);
    const startMinute = parseInt(jobMinute, 10);
    const duration = parseInt(job.value, 10);
    const cronDayUIShorts = jobCronDays.split(',').map(dIndex => cronIndexToUIShortMap[parseInt(dIndex, 10)]).filter(Boolean);
    
    const displayStartHour = String(startHour).padStart(2, '0');
    const displayStartMinute = String(startMinute).padStart(2, '0');
    const displayStartTime = `${displayStartHour}:${displayStartMinute}`;
    
    const endMinutesTotal = startHour * 60 + startMinute + duration;
    const displayEndHour = String(Math.floor(endMinutesTotal / 60) % 24).padStart(2, '0');
    const displayEndMinute = String(endMinutesTotal % 60).padStart(2, '0');
    const displayEndTime = `${displayEndHour}:${displayEndMinute}`;

    return {
        ...job,
        start: (startHour * 60 + startMinute),
        end: (startHour * 60 + startMinute + duration),
        height: duration,
        dayUIShorts: cronDayUIShorts,
        displayStartTime,
        displayEndTime,
    };
};

const assignLanesToTasks = (tasksForDay) => {
    const sortedTasks = [...tasksForDay].sort((a, b) => a.start - b.start);
    const activeLanes = [];
    const tasksWithLanes = sortedTasks.map(task => ({ ...task, lane: -1 }));

    for (let i = 0; i < tasksWithLanes.length; i++) {
        const currentTask = tasksWithLanes[i];
        let assignedLane = -1;
        for (let l = 0; l < activeLanes.length; l++) {
            if (activeLanes[l] <= currentTask.start) {
                assignedLane = l;
                break;
            }
        }
        if (assignedLane === -1) {
            assignedLane = activeLanes.length;
            activeLanes.push(currentTask.end);
        } else {
            activeLanes[assignedLane] = currentTask.end;
        }
        currentTask.lane = assignedLane;
    }
    const maxLanes = activeLanes.length > 0 ? Math.max(...activeLanes.map((_, index) => index)) + 1 : 1;
    return tasksWithLanes.map(task => ({ ...task, totalLanes: maxLanes }));
};

export const useScheduleCalculator = (schedules, selectedDeviceForSchedule) => {
    return useMemo(() => {
        const tasksByDay = {};
        daysOfWeekUIOrder.forEach(day => (tasksByDay[day.short] = []));
        
        const filteredSchedules = selectedDeviceForSchedule === 'all'
            ? schedules
            : schedules.filter(job => job.deviceId === selectedDeviceForSchedule);
        
        filteredSchedules.forEach(job => {
            const task = getTaskGridPosition(job);
            task.dayUIShorts.forEach(dayShort => {
                if (tasksByDay[dayShort]) tasksByDay[dayShort].push(task);
            });
        });

        const collisionAwareTasksByDay = {};
        for (const dayShort in tasksByDay) {
            collisionAwareTasksByDay[dayShort] = assignLanesToTasks(tasksByDay[dayShort]);
        }
        return collisionAwareTasksByDay;
    }, [schedules, selectedDeviceForSchedule]);
};