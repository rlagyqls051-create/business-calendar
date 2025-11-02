import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Task, Person, Client, TaskType, PersonRole, Project, TaskStatus, ChecklistItem, Notification } from './types';
import Calendar from './components/Calendar';
import TaskModal from './components/TaskModal';
import ManagementModal from './components/ManagementModal';
import PushScheduleModal from './components/PushScheduleModal';

// --- MOCK DATA ---
const MOCK_PEOPLE_DATA: Person[] = [
  { id: '1', name: '김민준', role: '연출&촬영', color: 'bg-blue-200 border-blue-400', textColor: 'text-blue-800' },
  { id: '2', name: '이서연', role: '후반 작업자', color: 'bg-green-200 border-green-400', textColor: 'text-green-800' },
  { id: '3', name: '박도윤', role: '연출&촬영', color: 'bg-yellow-200 border-yellow-400', textColor: 'text-yellow-800' },
  { id: '4', name: '최지우', role: '후반 작업자', color: 'bg-purple-200 border-purple-400', textColor: 'text-purple-800' },
];

const MOCK_CLIENTS_DATA: Client[] = [
  { id: 'a', name: 'A-엔터테인먼트', color: 'bg-red-200 border-red-400', textColor: 'text-red-800' },
  { id: 'b', name: 'B-코스메틱', color: 'bg-teal-200 border-teal-400', textColor: 'text-teal-800' },
  { id: 'c', name: 'C-푸드', color: 'bg-orange-200 border-orange-400', textColor: 'text-orange-800' },
];

const MOCK_PROJECTS_DATA: Project[] = [
    { id: 'p1', name: '신인 아이돌 MV', clientId: 'a', absoluteDeadline: '2024-07-31' },
    { id: 'p2', name: '여름시즌 뷰티 화보', clientId: 'b', absoluteDeadline: '2024-08-15' },
    { id: 'p3', name: '간편식 브이로그', clientId: 'c', absoluteDeadline: '2024-08-10' },
    { id: 'p4', name: '연말 시상식 스케치', clientId: 'a' },
]

const MOCK_TASKS_DATA: Task[] = [
  { id: 't0', date: '2024-07-08', title: 'MV 컨셉 회의 및 준비', personId: '1', projectId: 'p1', type: TaskType.PREPARATION, status: '완료', progress: 100, deadline: '2024-07-09' },
  { id: 't1', date: '2024-07-10', title: '인트로 영상 촬영', personId: '1', projectId: 'p1', type: TaskType.FILMING, status: '완료', progress: 100, checklist: [{id: 'c1', text: '조명 세트 확인', completed: true}] },
  { id: 't2', date: '2024-07-11', title: '인트로 영상 편집', personId: '2', projectId: 'p1', type: TaskType.EDITING, status: '진행중', progress: 50, deadline: '2024-07-17' },
  { id: 't3', date: '2024-07-15', title: 'B-roll 촬영', personId: '3', projectId: 'p2', type: TaskType.FILMING, status: '대기', progress: 0 },
  { id: 't4', date: '2024-07-15', title: '제품 리뷰 촬영', personId: '1', projectId: 'p3', type: TaskType.FILMING, status: '진행중', progress: 80 },
  { id: 't5', date: '2024-07-23', title: '1차 편집본', personId: '4', projectId: 'p2', type: TaskType.EDITING, status: '대기', progress: 0, deadline: '2024-07-26' },
  { id: 't6', date: '2024-07-25', title: '최종 편집 및 색보정', personId: '2', projectId: 'p3', type: TaskType.EDITING, status: '대기', progress: 0 },
  { id: 't7', date: new Date().toISOString().split('T')[0], title: '홍보 영상 촬영', personId: '1', projectId: 'p4', type: TaskType.FILMING, status: '대기', progress: 0 },
  { id: 't8', date: new Date().toISOString().split('T')[0], title: '오늘의 편집', personId: '2', projectId: 'p1', type: TaskType.EDITING, status: '진행중', progress: 20 },
  { id: 't9', date: '2024-07-18', title: '미정 편집', projectId: 'p2', type: TaskType.EDITING, status: '대기', progress: 0, deadline: '2024-07-22' },
];

// Helper to add days to a date string
const addDaysToDate = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

type ColorMode = 'type' | 'person' | 'client';

const App: React.FC = () => {
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS_DATA);
  const [people, setPeople] = useState<Person[]>(MOCK_PEOPLE_DATA);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS_DATA);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS_DATA);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{ taskToSave: Task, conflictingTask: Task, person: Person } | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'task' | 'production'>('task');


  // Collaboration features state
  const [currentUser, setCurrentUser] = useState<Person>(MOCK_PEOPLE_DATA[0]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [filters, setFilters] = useState<{ role: PersonRole | 'all'; personId: string | null; clientId: string | null, projectId: string | null }>({
    role: 'all',
    personId: null,
    clientId: null,
    projectId: null,
  });

  const [colorMode, setColorMode] = useState<ColorMode>('type');


  // Automatic notifications effect
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const generatedNotifications: Notification[] = [];

    tasks.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        if (!project) return;
        const client = clients.find(c => c.id === project.clientId);
        if (!client) return;

        if (task.type === TaskType.EDITING && task.deadline === todayStr && task.status !== '완료') {
            generatedNotifications.push({
                id: `notif-deadline-${task.id}`,
                message: `[마감] ${client.name} - ${project.name} 편집 완료 예정일입니다.`,
                read: false,
                taskId: task.id,
            });
        }

        if (task.type === TaskType.FILMING && task.date === tomorrowStr) {
            generatedNotifications.push({
                id: `notif-prep-${task.id}`,
                message: `[준비] ${client.name} - ${project.name} 촬영이 내일입니다. 체크리스트를 확인하세요.`,
                read: false,
                taskId: task.id,
            });
        }
    });
    
    setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newUniqueNotifications = generatedNotifications.filter(n => !existingIds.has(n.id));
        return [...newUniqueNotifications, ...prev].slice(0, 20);
    });
  }, []); 


  // Date handlers
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Modal handlers
  const openModalForNewTask = (date: string, mode: 'task' | 'production' = 'production') => {
    setSelectedTask(null);
    setSelectedDate(date);
    setModalMode(mode);
    setIsTaskModalOpen(true);
  };

  const openModalForEditTask = (task: Task) => {
    setSelectedTask(task);
    setSelectedDate(task.date);
    setModalMode('task');
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setSelectedDate(null);
  };
  
  // CRUD and Logic
  const addAssignmentNotification = (task: Task) => {
    if (!task.personId) return;
    const assignee = people.find(p => p.id === task.personId);
    if (assignee) {
        const newNotif: Notification = {
            id: `notif-assign-${task.id}-${Date.now()}`,
            message: `${assignee.name}님에게 '${task.title} (${task.type})' 작업이 할당되었습니다.`,
            read: false,
            taskId: task.id,
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
    }
  };

  const handleSaveProduction = (data: any) => {
    const { title, projectId, preparation, filming, editing } = data;
    const newTasks: Task[] = [];
    const baseId = Date.now();

    if (preparation.enabled) {
        newTasks.push({
            id: `task-${baseId}-prep`, title: `${title} (준비)`, projectId,
            date: preparation.date, deadline: preparation.deadline,
            personId: preparation.personId || undefined, type: TaskType.PREPARATION,
            status: '대기', progress: 0,
        });
    }
     if (filming.enabled) {
        newTasks.push({
            id: `task-${baseId}-film`, title: `${title} (촬영)`, projectId,
            date: filming.date, personId: filming.personId || undefined,
            type: TaskType.FILMING, status: '대기', progress: 0,
        });
    }
    if (editing.enabled) {
        newTasks.push({
            id: `task-${baseId}-edit`, title: `${title} (편집)`, projectId,
            date: editing.date, deadline: editing.deadline,
            personId: editing.personId || undefined, type: TaskType.EDITING,
            status: '대기', progress: 0,
        });
    }
    setTasks(prev => [...prev, ...newTasks]);
    newTasks.forEach(addAssignmentNotification);
    closeTaskModal();
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'> & { id?: string }, force = false) => {
    const originalTask = taskData.id ? tasks.find(t => t.id === taskData.id) : null;
    const savedTask = taskData.id 
      ? { ...tasks.find(t => t.id === taskData.id)!, ...taskData } as Task
      : { ...taskData, id: `task-${Date.now()}` } as Task;
      
    // Conflict detection for schedule push
    if (!force && savedTask.type === TaskType.EDITING && savedTask.personId) {
        const conflictingTask = tasks.find(t => 
            t.id !== savedTask.id &&
            t.personId === savedTask.personId &&
            t.type === TaskType.EDITING &&
            (
                (savedTask.date >= t.date && savedTask.date <= (t.deadline || t.date)) ||
                (t.date >= savedTask.date && t.date <= (savedTask.deadline || savedTask.date))
            )
        );

        if (conflictingTask) {
            const person = people.find(p => p.id === savedTask.personId);
            if (person) {
                setConflictInfo({ taskToSave: savedTask, conflictingTask, person });
                setIsPushModalOpen(true);
                return; // Stop saving until user decides
            }
        }
    }
    
    let updatedTasks: Task[];
    if (taskData.id) {
        updatedTasks = tasks.map(t => (t.id === taskData.id ? savedTask : t));
        if (originalTask && originalTask.personId !== savedTask.personId) {
            addAssignmentNotification(savedTask);
        }
    } else {
        updatedTasks = [...tasks, savedTask];
        addAssignmentNotification(savedTask);
    }
    
    if (savedTask && originalTask?.status !== '완료' && savedTask.status === '완료' && savedTask.type === TaskType.FILMING) {
        const editingExists = tasks.some(t => t.projectId === savedTask.projectId && t.title.includes(savedTask.title) && t.type === TaskType.EDITING);
        if (!editingExists) {
            const newEditingTask: Task = {
                id: `task-${Date.now() + 1}`,
                date: addDaysToDate(savedTask.date, 1),
                title: `${savedTask.title.replace('(촬영)','')} (편집)`,
                projectId: savedTask.projectId,
                type: TaskType.EDITING,
                status: '대기', progress: 0,
            };
            updatedTasks.push(newEditingTask);
        }
    }

    setTasks(updatedTasks);
    closeTaskModal();
  };

  const handlePushSchedule = (daysToPush: number) => {
    if (!conflictInfo) return;
    const { taskToSave, person } = conflictInfo;
    const startDate = taskToSave.date;
    const warnings: string[] = [];

    const updatedTasks = tasks.map(task => {
        if (task.personId === person.id && task.date >= startDate && task.id !== taskToSave.id) {
            const project = projects.find(p => p.id === task.projectId);
            const newDate = addDaysToDate(task.date, daysToPush);
            const newDeadline = task.deadline ? addDaysToDate(task.deadline, daysToPush) : undefined;
            
            if (project?.absoluteDeadline && newDeadline && newDeadline > project.absoluteDeadline) {
                warnings.push(`'${task.title}' 작업이 프로젝트 최종 마감일(${project.absoluteDeadline})을 초과합니다.`);
            }
            return { ...task, date: newDate, deadline: newDeadline };
        }
        return task;
    });

    if (warnings.length > 0) {
        if (!window.confirm(`경고:\n${warnings.join('\n')}\n\n계속 진행하시겠습니까?`)) {
            setIsPushModalOpen(false);
            setConflictInfo(null);
            return;
        }
    }
    
    setTasks(updatedTasks);
    handleSaveTask(taskToSave, true); // Force save the initial task
    setIsPushModalOpen(false);
    setConflictInfo(null);
  };


  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    closeTaskModal();
  };
  
  const handleNotifToggle = () => {
    setIsNotifOpen(prev => {
        if (!prev) { 
            setNotifications(current => current.map(n => ({ ...n, read: true })));
        }
        return !prev;
    });
  };

  const handleFilterChange = (type: 'role' | 'personId' | 'clientId' | 'projectId', value: string | null) => {
      setFilters(prev => {
          const newFilters = {...prev};
          if (type === 'role') {
            newFilters.role = value as PersonRole | 'all';
            newFilters.personId = null;
          } else if (type === 'clientId') {
            newFilters.clientId = value;
            newFilters.projectId = null;
          }
          else {
            newFilters[type] = value;
          }
          return newFilters;
      });
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const person = task.personId ? people.find(p => p.id === task.personId) : null;
      const project = projects.find(p => p.id === task.projectId);
      
      const personMatch = filters.personId ? task.personId === filters.personId : true;
      const clientMatch = filters.clientId ? project?.clientId === filters.clientId : true;
      const projectMatch = filters.projectId ? task.projectId === filters.projectId : true;
      
      let roleMatch = true;
      if (filters.role !== 'all') {
          if (person) roleMatch = person.role === filters.role;
          else roleMatch = false;
      }
      
      return personMatch && clientMatch && roleMatch && projectMatch;
    });
  }, [tasks, filters, people, projects]);

  const peopleForFilter = useMemo(() => {
      if (filters.role === 'all') return people;
      return people.filter(p => p.role === filters.role);
  }, [people, filters.role]);
  
  const projectsForFilter = useMemo(() => {
      if (!filters.clientId) return [];
      return projects.filter(p => p.clientId === filters.clientId);
  }, [projects, filters.clientId]);

  const FilterButton = useCallback(<T,>({ label, value, activeValue, onClick }: { label: string, value: T, activeValue: T, onClick: (value: T) => void}) => {
    const isActive = value === activeValue;
    return (
      <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap ${
          isActive ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'
        }`}
      >
        {label}
      </button>
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">팀 스케쥴 캘린더</h1>
            <p className="text-slate-500 mt-1">프로젝트와 팀원의 일정을 관리하세요.</p>
        </div>
        <div className="flex items-center gap-4">
             <div className="relative">
                <button onClick={handleNotifToggle} className="relative p-2 rounded-full hover:bg-slate-200">
                    <BellIcon />
                    {notifications.some(n => !n.read) && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
                </button>
                {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-20 border">
                        <div className="p-3 font-bold text-sm border-b">알림</div>
                        <ul className="py-1 max-h-80 overflow-y-auto">
                           {notifications.length > 0 ? notifications.map((n) => {
                                const isDeadline = n.message.startsWith('[마감]');
                                const isPrep = n.message.startsWith('[준비]');
                                return (
                                    <li key={n.id} className="px-4 py-2.5 text-sm text-slate-700 border-b last:border-b-0 hover:bg-slate-50">
                                        <div className="flex items-start gap-3">
                                            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isDeadline ? 'bg-red-500' : isPrep ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
                                            <span>{n.message}</span>
                                        </div>
                                    </li>
                                )
                            }) : <li className="px-3 py-4 text-sm text-slate-500 text-center">새로운 알림이 없습니다.</li>}
                        </ul>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <UserCircleIcon />
                <select value={currentUser.id} onChange={e => setCurrentUser(people.find(p => p.id === e.target.value)!)} className="font-semibold text-slate-700 bg-transparent border-0 rounded-md focus:ring-0">
                    {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
        </div>
      </header>
      
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex-grow flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center space-x-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100 transition-colors"><ChevronLeftIcon /></button>
            <h2 className="text-xl font-semibold w-36 text-center">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
            <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100 transition-colors"><ChevronRightIcon /></button>
            <button onClick={handleToday} className="ml-4 px-4 py-2 text-sm font-semibold border border-slate-300 rounded-md hover:bg-slate-100 transition-colors">Today</button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setIsManagementModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors shadow">
                <UsersIcon />
                <span>팀/프로젝트 관리</span>
            </button>
            <button onClick={() => openModalForNewTask(new Date().toISOString().split('T')[0])} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow">
                <PlusIcon />
                <span>새 프로덕션 추가</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4 border-t pt-4">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold w-16 text-slate-600">색상 기준:</span>
                {/* Fix: Explicitly cast value to ColorMode to ensure correct type inference for the generic FilterButton component. */}
                <FilterButton label="작업 유형별" value={'type' as ColorMode} activeValue={colorMode} onClick={setColorMode} />
                <FilterButton label="담당자별" value={'person' as ColorMode} activeValue={colorMode} onClick={setColorMode} />
                <FilterButton label="클라이언트별" value={'client' as ColorMode} activeValue={colorMode} onClick={setColorMode} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold w-16 text-slate-600">역할:</span>
                <FilterButton label="전체" value={'all'} activeValue={filters.role} onClick={(val) => handleFilterChange('role', val)} />
                <FilterButton label="연출&촬영" value={'연출&촬영'} activeValue={filters.role} onClick={(val) => handleFilterChange('role', val)} />
                <FilterButton label="후반 작업자" value={'후반 작업자'} activeValue={filters.role} onClick={(val) => handleFilterChange('role', val)} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold w-16 text-slate-600">담당자:</span>
                <FilterButton label="전체" value={null} activeValue={filters.personId} onClick={(val) => handleFilterChange('personId', val)} />
                {peopleForFilter.map(p => <FilterButton key={p.id} label={p.name} value={p.id} activeValue={filters.personId} onClick={(val) => handleFilterChange('personId', val)} />)}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold w-16 text-slate-600">클라이언트:</span>
                <FilterButton label="전체" value={null} activeValue={filters.clientId} onClick={(val) => handleFilterChange('clientId', val)} />
                {clients.map(c => <FilterButton key={c.id} label={c.name} value={c.id} activeValue={filters.clientId} onClick={(val) => handleFilterChange('clientId', val)} />)}
            </div>
            {filters.clientId && (
                 <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold w-16 text-slate-600">프로젝트:</span>
                    <FilterButton label="전체" value={null} activeValue={filters.projectId} onClick={(val) => handleFilterChange('projectId', val)} />
                    {projectsForFilter.map(p => <FilterButton key={p.id} label={p.name} value={p.id} activeValue={filters.projectId} onClick={(val) => handleFilterChange('projectId', val)} />)}
                </div>
            )}
        </div>

        <div className="flex-grow">
          <Calendar 
            currentDate={currentDate} 
            tasks={filteredTasks}
            people={people}
            projects={projects}
            clients={clients}
            colorMode={colorMode}
            onDayClick={(date) => openModalForNewTask(date, 'task')}
            onTaskClick={openModalForEditTask}
          />
        </div>
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={closeTaskModal}
        onSave={handleSaveTask}
        onSaveProduction={handleSaveProduction}
        onDelete={handleDeleteTask}
        taskToEdit={selectedTask}
        defaultDate={selectedDate}
        people={people}
        clients={clients}
        projects={projects}
        mode={modalMode}
      />
      <ManagementModal 
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        people={people}
        clients={clients}
        projects={projects}
        setPeople={setPeople}
        setClients={setClients}
        setProjects={setProjects}
      />
      <PushScheduleModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        onConfirm={handlePushSchedule}
        conflictInfo={conflictInfo}
      />
    </div>
  );
};

// --- ICONS ---
const ChevronLeftIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>);
const ChevronRightIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>);
const UsersIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-3-5.197M15 21a9 9 0 00-9-9" /></svg>);
const BellIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>);
const UserCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>);

export default App;
