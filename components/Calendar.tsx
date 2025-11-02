import React, { useMemo } from 'react';
import { Task, Person, Project, TaskType, Client } from '../types';

interface CalendarProps {
  currentDate: Date;
  tasks: Task[];
  people: Person[];
  projects: Project[];
  clients: Client[];
  colorMode: 'type' | 'person' | 'client';
  onDayClick: (date: string) => void;
  onTaskClick: (task: Task) => void;
}

type ColorSet = { bg: string; border: string; text: string; bar: string; barText: string };

const defaultColors: ColorSet = { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', bar: 'bg-gray-400', barText: 'text-white font-semibold' };

const getTaskDisplayColors = (
    task: Task, 
    mode: 'type' | 'person' | 'client', 
    people: Person[], 
    projects: Project[], 
    clients: Client[]
): ColorSet => {
    if (mode === 'person') {
        const person = people.find(p => p.id === task.personId);
        if (person) {
            return {
                bg: person.color, border: person.color.replace('bg-', 'border-').replace('-200', '-400'),
                text: person.textColor, bar: person.color.replace('-200', '-500'), barText: person.textColor.replace('-800', '-900') + ' font-semibold'
            };
        }
        return defaultColors;
    }

    if (mode === 'client') {
        const project = projects.find(p => p.id === task.projectId);
        const client = clients.find(c => c.id === project?.clientId);
        if (client) {
             return {
                bg: client.color, border: client.color.replace('bg-', 'border-').replace('-200', '-400'),
                text: client.textColor, bar: client.color.replace('-200', '-500'), barText: client.textColor.replace('-800', '-900') + ' font-semibold'
            };
        }
        return defaultColors;
    }
    
    // Default: by type
    switch (task.type) {
        case TaskType.PREPARATION: return { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', bar: 'bg-yellow-400', barText: 'text-yellow-900 font-semibold' };
        case TaskType.FILMING: return { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', bar: 'bg-red-500', barText: 'text-white font-semibold' };
        case TaskType.EDITING: return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', bar: 'bg-green-500', barText: 'text-white font-semibold' };
        default: return defaultColors;
    }
}


const Calendar: React.FC<CalendarProps> = ({ currentDate, tasks, people, projects, clients, colorMode, onDayClick, onTaskClick }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const days = [];
    for (let date = 1; date <= lastDayOfMonth.getDate(); date++) {
      days.push(new Date(year, month, date));
    }
    return days;
  }, [year, month]);

  const startingDayOfWeek = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);
  const blanks = Array(startingDayOfWeek).fill(null);
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const getPerson = (id?: string) => people.find(p => p.id === id);

  const sortedTasks = useMemo(() => {
      return [...tasks].sort((a, b) => {
          const aIsMulti = a.deadline && a.date < a.deadline;
          const bIsMulti = b.deadline && b.date < b.deadline;
          if (aIsMulti && !bIsMulti) return -1;
          if (!aIsMulti && bIsMulti) return 1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [tasks]);

  return (
    <div className="grid grid-cols-7 h-full">
      {weekDays.map(day => (
        <div key={day} className="text-center font-semibold text-sm text-slate-500 py-2 border-b">
          {day}
        </div>
      ))}

      {blanks.map((_, index) => (
        <div key={`blank-${index}`} className="border-r border-b border-slate-100"></div>
      ))}

      {daysInMonth.map(day => {
        const dateStr = day.toISOString().split('T')[0];
        const dayTasks = sortedTasks.filter(task => {
            if (task.deadline && task.date <= task.deadline) { // Multi-day task
                return dateStr >= task.date && dateStr <= task.deadline;
            }
            return task.date === dateStr; // Single-day task
        });
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        const dayOfWeek = day.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const isSingleMultiDayTask =
          dayTasks.length === 1 &&
          dayTasks[0].deadline &&
          dayTasks[0].date < dayTasks[0].deadline;
        
        return (
          <div 
            key={dateStr}
            className={`relative border-r border-b border-slate-100 p-2 pt-1 flex flex-col min-h-[120px] hover:bg-slate-50 transition-colors duration-200 group ${isWeekend ? 'bg-slate-50' : ''}`}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              // Only trigger day click if clicking on the empty area of the cell
              if (target.dataset.dayCell) {
                 if (isSingleMultiDayTask) {
                    onTaskClick(dayTasks[0]);
                 } else {
                    onDayClick(dateStr);
                 }
              }
            }}
            data-day-cell="true"
          >
            <div className="flex justify-center mb-1">
                <span className={`font-semibold text-sm w-6 h-6 flex items-center justify-center ${isToday ? 'bg-blue-600 text-white rounded-full' : isWeekend ? 'text-red-500' : 'text-slate-700'}`}>
                  {day.getDate()}
                </span>
            </div>
            <div className="space-y-1 flex-grow overflow-hidden">
              {dayTasks.map(task => {
                const person = getPerson(task.personId);
                const isMultiDay = task.deadline && task.date < task.deadline;
                const colors = getTaskDisplayColors(task, colorMode, people, projects, clients);
                
                if (isMultiDay) {
                    const isStart = task.date === dateStr;
                    const isEnd = task.deadline === dateStr;
                    const isMiddle = !isStart && !isEnd;

                    let barClass = `w-full h-7 text-xs flex items-center ${colors.bar} ${colors.barText}`;
                    if (isStart) barClass += ' rounded-l-md pl-2';
                    if (isEnd) barClass += ' rounded-r-md pr-2 justify-end';
                    if (isMiddle) barClass += '';

                    return (
                        <div key={task.id} onClick={() => onTaskClick(task)} className="w-full cursor-pointer group/bar relative" title={`${task.title} - ${person?.name || '미정'}`}>
                            <div className={barClass} >
                               {(isStart || (startingDayOfWeek + day.getDate() - 1) % 7 === 0) && <span className="truncate">{task.title}</span>}
                            </div>
                        </div>
                    );
                }
                
                // Single Day Task
                return (
                  <div 
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`p-1.5 rounded-md text-xs cursor-pointer ${colors.bg} ${colors.border} ${colors.text} hover:brightness-105 transition-all`}
                  >
                    <div>
                      <span className="font-bold">{task.type}</span>
                    </div>
                    <p className="truncate font-medium">{task.title}</p>
                    <p className="truncate text-xs">{person ? person.name : '미정'}</p>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => onDayClick(dateStr)}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Add task"
            >
              +
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Calendar;