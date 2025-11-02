import React, { useState, useEffect, useMemo } from 'react';
import { Task, Person, Client, TaskType, PersonRole, Project, TaskStatus, ChecklistItem } from '../types';

const isWeekend = (dateStr: string): boolean => {
    if (!dateStr) return false;
    // Using T00:00:00 ensures the date is parsed in the local timezone, avoiding shifts.
    const date = new Date(`${dateStr}T00:00:00`);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'> & { id?: string }) => void;
  onSaveProduction: (data: any) => void;
  onDelete: (taskId: string) => void;
  taskToEdit: Task | null;
  defaultDate: string | null;
  people: Person[];
  clients: Client[];
  projects: Project[];
  mode: 'task' | 'production';
}

type SingleTaskData = {
    title: string; date: string; personId: string; clientId: string; projectId: string;
    type: TaskType; status: TaskStatus; progress: number; checklist: ChecklistItem[]; deadline: string;
};

const getNextDay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
}


const TaskModal: React.FC<TaskModalProps> = (props) => {
  const { isOpen, onClose, onSave, onSaveProduction, onDelete, taskToEdit, defaultDate, people, clients, projects, mode } = props;

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
        {mode === 'production' && !taskToEdit ? (
            <ProductionCreator {...props} />
        ) : (
            <TaskEditor {...props} />
        )}
    </div>
  );
};

// --- SINGLE TASK EDITOR ---
const TaskEditor: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, onDelete, taskToEdit, defaultDate, people, clients, projects }) => {
  const getInitialFormData = (): SingleTaskData => ({
    title: '',
    date: defaultDate || new Date().toISOString().split('T')[0],
    personId: '',
    clientId: clients[0]?.id || '',
    projectId: projects.find(p => p.clientId === clients[0]?.id)?.id || '',
    type: TaskType.FILMING,
    status: '대기',
    progress: taskToEdit?.progress || 0, // Keep progress from original task but don't show UI
    checklist: [],
    deadline: '',
  });

  const [formData, setFormData] = useState<SingleTaskData>(getInitialFormData());
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const availablePeople = useMemo(() => {
    const requiredRole: PersonRole | null = formData.type === TaskType.FILMING || formData.type === TaskType.PREPARATION ? '연출&촬영' : formData.type === TaskType.EDITING ? '후반 작업자' : null;
    if (!requiredRole) return people;
    return people.filter(p => p.role === requiredRole);
  }, [people, formData.type]);

  const availableProjects = useMemo(() => {
      return projects.filter(p => p.clientId === formData.clientId);
  }, [projects, formData.clientId]);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        const project = projects.find(p => p.id === taskToEdit.projectId);
        setFormData({
          title: taskToEdit.title,
          date: taskToEdit.date,
          personId: taskToEdit.personId || '',
          clientId: project?.clientId || '',
          projectId: taskToEdit.projectId,
          type: taskToEdit.type,
          status: taskToEdit.status,
          progress: taskToEdit.progress || 0,
          checklist: taskToEdit.checklist || [],
          deadline: taskToEdit.deadline || '',
        });
      } else {
        setFormData(getInitialFormData());
      }
    }
  }, [taskToEdit, defaultDate, isOpen, people, clients, projects]);
  
  useEffect(() => {
    if (formData.personId && !availablePeople.some(p => p.id === formData.personId)) {
      setFormData(prev => ({ ...prev, personId: '' }));
    }
  }, [availablePeople, formData.personId]);

  useEffect(() => {
    if (formData.projectId && !availableProjects.some(p => p.id === formData.projectId)) {
        setFormData(prev => ({ ...prev, projectId: availableProjects[0]?.id || '' }));
    } else if (!formData.projectId && availableProjects.length > 0) {
        setFormData(prev => ({...prev, projectId: availableProjects[0].id}));
    }
  }, [availableProjects, formData.projectId]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };
    if (name === 'clientId') { 
        newFormData.projectId = projects.find(p => p.clientId === value)?.id || '';
    }
    setFormData(newFormData);
  };
  
  const handleChecklistChange = (itemId: string, completed: boolean) => {
    setFormData(prev => ({...prev, checklist: prev.checklist.map(item => item.id === itemId ? {...item, completed} : item)}));
  }

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim() === '') return;
    const newItem: ChecklistItem = { id: `cl-${Date.now()}`, text: newChecklistItem.trim(), completed: false };
    setFormData(prev => ({...prev, checklist: [...prev.checklist, newItem]}));
    setNewChecklistItem('');
  }

  const handleDeleteChecklistItem = (itemId: string) => {
      setFormData(prev => ({...prev, checklist: prev.checklist.filter(item => item.id !== itemId)}));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.projectId) {
        alert("제목, 날짜, 프로젝트를 모두 선택해주세요."); return;
    }
    if (formData.type === TaskType.FILMING && !formData.personId) {
        alert("촬영 담당자를 지정해주세요."); return;
    }

    if (formData.type !== TaskType.FILMING) {
        if (isWeekend(formData.date)) {
            alert("촬영 외의 작업은 주말(토/일)에 시작할 수 없습니다.");
            return;
        }
        if (formData.deadline && isWeekend(formData.deadline)) {
            alert("촬영 외의 작업은 주말(토/일)에 종료될 수 없습니다.");
            return;
        }
    }
    
    const { clientId, ...rest } = formData;
    const taskData: Omit<Task, 'id'> & { id?: string } = {
        ...rest,
        id: taskToEdit?.id,
        personId: formData.personId || undefined, 
        deadline: formData.deadline || undefined,
    };
    onSave(taskData);
  };
  
  const handleDelete = () => {
    if (taskToEdit && window.confirm("이 작업을 삭제하시겠습니까?")) {
      onDelete(taskToEdit.id);
    }
  }
  
  const deadlineLabel = formData.type === TaskType.EDITING ? "편집 완료일" : formData.type === TaskType.PREPARATION ? "준비 완료일" : "연관 편집 데드라인";

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
      <form onSubmit={handleSubmit}>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">{taskToEdit ? '작업 수정' : '새 작업 추가'}</h2>
          <div className="space-y-4">
            <InputField label="제목" name="title" value={formData.title} onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="날짜" name="date" type="date" value={formData.date} onChange={handleChange} required />
              <InputField label={deadlineLabel} name="deadline" type="date" value={formData.deadline} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="클라이언트" name="clientId" value={formData.clientId} onChange={handleChange} options={clients.map(c => ({value: c.id, label: c.name}))} required />
              <SelectField label="프로젝트" name="projectId" value={formData.projectId} onChange={handleChange} options={availableProjects.map(p => ({value: p.id, label: p.name}))} required disabled={availableProjects.length === 0} />
            </div>
             <div className="grid grid-cols-2 gap-4">
              <SelectField label="작업 유형" name="type" value={formData.type} onChange={handleChange} options={Object.values(TaskType).map(t => ({value: t, label: t}))} required />
              <SelectField label="담당자" name="personId" value={formData.personId} onChange={handleChange} options={availablePeople.map(p => ({value: p.id, label: p.name}))} disabled={availablePeople.length === 0} allowUnassigned={formData.type !== TaskType.FILMING} />
            </div>
            
            {formData.type === TaskType.FILMING && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">촬영 준비 체크리스트</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                  {formData.checklist.map(item => (
                     <div key={item.id} className="flex items-center gap-2">
                       <input type="checkbox" checked={item.completed} onChange={e => handleChecklistChange(item.id, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                       <span className={`flex-grow text-sm ${item.completed ? 'line-through text-slate-400' : ''}`}>{item.text}</span>
                       <button type="button" onClick={() => handleDeleteChecklistItem(item.id)} className="text-red-500 text-xs">삭제</button>
                     </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input type="text" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="새 항목 추가..." className="flex-grow px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-500" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())} />
                  <button type="button" onClick={handleAddChecklistItem} className="px-3 py-1 text-sm font-semibold bg-slate-200 rounded-md">추가</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-3 flex justify-between items-center">
          {taskToEdit ? (<button type="button" onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-800">삭제</button>) : <div />}
           <div className="flex gap-2">
               <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-md hover:bg-slate-100 transition-colors">취소</button>
              <button type="submit" className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow">저장</button>
          </div>
        </div>
      </form>
    </div>
  );
};


// --- PRODUCTION CREATOR ---
const ProductionCreator: React.FC<TaskModalProps> = ({ onClose, onSaveProduction, defaultDate, people, clients, projects }) => {
    const [data, setData] = useState({
        title: '',
        clientId: clients[0]?.id || '',
        projectId: projects.find(p => p.clientId === (clients[0]?.id || ''))?.id || '',
        preparation: { enabled: false, date: defaultDate || '', deadline: '', personId: '' },
        filming: { enabled: true, date: defaultDate || '', personId: '' },
        editing: { enabled: true, date: getNextDay(defaultDate || ''), deadline: '', personId: '' },
    });

    const shooters = useMemo(() => people.filter(p => p.role === '연출&촬영'), [people]);
    const editors = useMemo(() => people.filter(p => p.role === '후반 작업자'), [people]);
    const availableProjects = useMemo(() => projects.filter(p => p.clientId === data.clientId), [projects, data.clientId]);

    useEffect(() => {
        setData(prev => ({...prev, projectId: availableProjects[0]?.id || ''}));
    }, [data.clientId]);
    
    const handleChange = (phase: 'preparation' | 'filming' | 'editing', field: string, value: any) => {
        setData(prev => {
            const newState = { ...prev, [phase]: { ...prev[phase], [field]: value } };
            // Auto-cascade dates
            if (phase === 'preparation' && field === 'deadline' && value) {
                newState.filming.date = getNextDay(value);
                newState.editing.date = getNextDay(newState.filming.date);
            } else if (phase === 'filming' && field === 'date' && value) {
                 newState.editing.date = getNextDay(value);
            }
            if(phase === 'preparation' && field === 'enabled' && value === true) {
                 newState.filming.date = getNextDay(newState.preparation.deadline || newState.preparation.date);
                 newState.editing.date = getNextDay(newState.filming.date);
            }
             if(phase === 'preparation' && field === 'enabled' && value === false) {
                 newState.filming.date = newState.preparation.date; // Revert to original date
                 newState.editing.date = getNextDay(newState.filming.date);
            }
            return newState;
        });
    };

    const handleCommonChange = (field: 'title' | 'clientId' | 'projectId', value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.title || !data.projectId) {
            alert("프로덕션 제목과 프로젝트를 선택해주세요."); return;
        }
        if (data.preparation.enabled) {
            if (isWeekend(data.preparation.date)) {
                alert("준비 작업은 주말(토/일)에 시작할 수 없습니다."); return;
            }
            if (data.preparation.deadline && isWeekend(data.preparation.deadline)) {
                alert("준비 작업은 주말(토/일)에 종료될 수 없습니다."); return;
            }
        }
        if (data.editing.enabled) {
            if (isWeekend(data.editing.date)) {
                alert("편집 작업은 주말(토/일)에 시작할 수 없습니다."); return;
            }
            if (data.editing.deadline && isWeekend(data.editing.deadline)) {
                alert("편집 작업은 주말(토/일)에 종료될 수 없습니다."); return;
            }
        }
        onSaveProduction(data);
    }
    
    return (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">새 프로덕션 추가</h2>
                    <div className="space-y-6">
                        {/* Common Info */}
                        <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                            <InputField label="프로덕션 제목" placeholder="예: 여름 캠페인" name="title" value={data.title} onChange={e => handleCommonChange('title', e.target.value)} required />
                             <div className="grid grid-cols-2 gap-4">
                                <SelectField label="클라이언트" name="clientId" value={data.clientId} onChange={e => handleCommonChange('clientId', e.target.value)} options={clients.map(c => ({value: c.id, label: c.name}))} required />
                                <SelectField label="프로젝트" name="projectId" value={data.projectId} onChange={e => handleCommonChange('projectId', e.target.value)} options={availableProjects.map(p => ({value: p.id, label: p.name}))} required disabled={availableProjects.length === 0} />
                            </div>
                        </div>

                        {/* Phase Forms */}
                        <PhaseForm title="준비" phase="preparation" data={data.preparation} onChange={handleChange} people={shooters} personLabel="담당자" allowUnassigned />
                        <PhaseForm title="촬영" phase="filming" data={data.filming} onChange={handleChange} people={shooters} personLabel="연출&촬영 담당" />
                        <PhaseForm title="편집" phase="editing" data={data.editing} onChange={handleChange} people={editors} personLabel="후반 작업 담당" allowUnassigned />
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 flex justify-end items-center gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-md hover:bg-slate-100 transition-colors">취소</button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow">프로덕션 생성</button>
                </div>
            </form>
        </div>
    );
};

const PhaseForm = ({ title, phase, data, onChange, people, personLabel, allowUnassigned = false }) => {
    const isMultiDay = phase !== 'filming';
    const isDisabled = !data.enabled;

    return (
        <div className="p-4 border rounded-lg relative">
            <div className="absolute top-2 right-2 flex items-center">
                <input type="checkbox" id={`${phase}-enabled`} checked={data.enabled} onChange={e => onChange(phase, 'enabled', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor={`${phase}-enabled`} className="ml-2 text-sm text-slate-600">활성화</label>
            </div>
            <h3 className={`text-lg font-semibold mb-3 ${isDisabled && 'text-slate-400'}`}>{title}</h3>
            <div className={`space-y-4`}>
                 <div className="grid grid-cols-2 gap-4">
                    <InputField label={isMultiDay ? "시작일" : "날짜"} name="date" type="date" value={data.date} onChange={e => onChange(phase, 'date', e.target.value)} disabled={isDisabled} />
                    {isMultiDay && <InputField label="완료일" name="deadline" type="date" value={data.deadline} onChange={e => onChange(phase, 'deadline', e.target.value)} disabled={isDisabled} />}
                </div>
                <SelectField label={personLabel} name="personId" value={data.personId} onChange={e => onChange(phase, 'personId', e.target.value)} options={people.map(p => ({value: p.id, label: p.name}))} allowUnassigned={allowUnassigned} disabled={isDisabled} />
            </div>
        </div>
    );
};


// --- SHARED COMPONENTS ---
const InputField = ({ label, ...props }) => (
  <div>
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-700">{label}</label>
    <input {...props} id={props.id || props.name} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" />
  </div>
);

const SelectField = ({ label, options, allowUnassigned = false, ...props }) => (
  <div>
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-700">{label}</label>
    <select {...props} id={props.id || props.name} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed">
      {props.disabled && <option>--</option>}
      {allowUnassigned && <option value="">미정</option>}
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

export default TaskModal;