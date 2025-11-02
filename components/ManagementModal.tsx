import React, { useState, useEffect, useMemo } from 'react';
import { Person, Client, PersonRole, Project } from '../types';

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  clients: Client[];
  projects: Project[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

const colors = [
  { color: 'bg-blue-200 border-blue-400', textColor: 'text-blue-800' },
  { color: 'bg-green-200 border-green-400', textColor: 'text-green-800' },
  { color: 'bg-yellow-200 border-yellow-400', textColor: 'text-yellow-800' },
  { color: 'bg-purple-200 border-purple-400', textColor: 'text-purple-800' },
  { color: 'bg-pink-200 border-pink-400', textColor: 'text-pink-800' },
  { color: 'bg-indigo-200 border-indigo-400', textColor: 'text-indigo-800' },
  { color: 'bg-red-200 border-red-400', textColor: 'text-red-800' },
  { color: 'bg-teal-200 border-teal-400', textColor: 'text-teal-800' },
];

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

const ManagementModal: React.FC<ManagementModalProps> = ({ isOpen, onClose, people, clients, projects, setPeople, setClients, setProjects }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'projects'>('team');
  
  // State for forms
  const [personForm, setPersonForm] = useState<{id: string | null; name: string; role: PersonRole}>({ id: null, name: '', role: '연출&촬영' });
  const [clientForm, setClientForm] = useState<{id: string | null; name: string;}>({ id: null, name: '' });
  const [projectForm, setProjectForm] = useState<{id: string | null; name: string; clientId: string}>({ id: null, name: '', clientId: '' });
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { shooters, editors } = useMemo(() => {
    return people.reduce((acc: {shooters: Person[], editors: Person[]}, person) => {
        if (person.role === '연출&촬영') acc.shooters.push(person);
        else acc.editors.push(person);
        return acc;
    }, { shooters: [], editors: [] });
  }, [people]);
  
  const projectsOfSelectedClient = useMemo(() => {
    if (!selectedClientId) return [];
    return projects.filter(p => p.clientId === selectedClientId);
  }, [projects, selectedClientId]);

  useEffect(() => {
    if (isOpen && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
    if (!isOpen) { // Reset forms on close
      setPersonForm({ id: null, name: '', role: '연출&촬영' });
      setClientForm({ id: null, name: '' });
      setProjectForm({ id: null, name: '', clientId: '' });
      setSelectedClientId(null);
    }
  }, [isOpen, clients, selectedClientId]);

  if (!isOpen) return null;

  // --- Handlers ---
  const handlePersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personForm.name) return;
    if (personForm.id) {
        setPeople(people.map(p => p.id === personForm.id ? { ...p, name: personForm.name, role: personForm.role } : p));
    } else {
        setPeople([...people, { ...personForm, id: `person-${Date.now()}`, ...getRandomColor() }]);
    }
    setPersonForm({ id: null, name: '', role: '연출&촬영' });
  };
  
  const deletePerson = (id: string) => window.confirm("정말로 이 팀원을 삭제하시겠습니까?") && setPeople(people.filter(p => p.id !== id));
  
  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name) return;
    if (clientForm.id) {
        setClients(clients.map(c => c.id === clientForm.id ? { ...c, name: clientForm.name } : c));
    } else {
        const newClient = { id: `client-${Date.now()}`, name: clientForm.name, ...getRandomColor() };
        setClients([...clients, newClient]);
        setSelectedClientId(newClient.id); // select new client
    }
    setClientForm({ id: null, name: '' });
  };

  const deleteClient = (id: string) => {
    if (window.confirm("클라이언트를 삭제하면 하위 프로젝트도 모두 삭제됩니다. 계속하시겠습니까?")) {
      setClients(clients.filter(c => c.id !== id));
      setProjects(projects.filter(p => p.clientId !== id));
      if (selectedClientId === id) setSelectedClientId(clients.length > 1 ? clients.find(c => c.id !== id)!.id : null);
    }
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name || !selectedClientId) return;
    if (projectForm.id) {
        setProjects(projects.map(p => p.id === projectForm.id ? { ...p, name: projectForm.name } : p));
    } else {
        setProjects([...projects, { ...projectForm, id: `project-${Date.now()}`, clientId: selectedClientId }]);
    }
    setProjectForm({ id: null, name: '', clientId: selectedClientId });
  };
  
  const deleteProject = (id: string) => window.confirm("정말로 이 프로젝트를 삭제하시겠습니까?") && setProjects(projects.filter(p => p.id !== id));
  
  // --- Render Functions ---
  const renderTeamManagement = () => (
    <div>
        <form onSubmit={handlePersonSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg flex flex-col sm:flex-row gap-2 items-end">
             {/* Person form content */}
            <div className="flex-grow w-full">
                <label className="block text-sm font-medium text-slate-700">이름</label>
                <input type="text" name="name" value={personForm.name} onChange={e => setPersonForm({...personForm, name: e.target.value})} className="mt-1 w-full form-input" placeholder="이름 입력"/>
            </div>
            <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-slate-700">역할</label>
                <select name="role" value={personForm.role} onChange={e => setPersonForm({...personForm, role: e.target.value as PersonRole})} className="mt-1 w-full form-select">
                    <option value="연출&촬영">연출&촬영</option>
                    <option value="후반 작업자">후반 작업자</option>
                </select>
            </div>
            <button type="submit" className="w-full sm:w-auto btn-primary whitespace-nowrap">{personForm.id ? '수정' : '추가'}</button>
            {personForm.id && <button type="button" onClick={() => setPersonForm({id: null, name: '', role: '연출&촬영'})} className="w-full sm:w-auto btn-secondary">취소</button>}
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EntityList title="연출&촬영" items={shooters} onEdit={item => setPersonForm(item)} onDelete={deletePerson} />
            <EntityList title="후반 작업자" items={editors} onEdit={item => setPersonForm(item)} onDelete={deletePerson} />
        </div>
    </div>
  );

  const renderProjectManagement = () => (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {/* Clients Column */}
        <div className="md:col-span-1 bg-slate-50 p-3 rounded-lg flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-2">클라이언트</h3>
            <form onSubmit={handleClientSubmit} className="flex gap-2 mb-4">
                 <input type="text" placeholder={clientForm.id ? '수정...' : '새 클라이언트...'} value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="form-input text-sm flex-grow"/>
                 <button type="submit" className="btn-primary text-sm px-3">{clientForm.id ? '✓' : '+'}</button>
                 {clientForm.id && <button type="button" onClick={() => setClientForm({id:null, name:''})} className="btn-secondary text-sm px-3">×</button>}
            </form>
            <div className="space-y-2 overflow-y-auto">
                {clients.map(client => (
                    <div key={client.id} onClick={() => setSelectedClientId(client.id)}
                         className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedClientId === client.id ? 'bg-blue-200' : 'hover:bg-slate-200'}`}>
                        <span className="text-sm font-medium">{client.name}</span>
                        <div className="flex gap-2">
                            <button onClick={(e) => {e.stopPropagation(); setClientForm(client);}} className="text-xs text-blue-600 hover:underline">수정</button>
                            <button onClick={(e) => {e.stopPropagation(); deleteClient(client.id);}} className="text-xs text-red-600 hover:underline">삭제</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        {/* Projects Column */}
        <div className="md:col-span-2 flex flex-col h-full">
             {selectedClientId ? (
                 <>
                    <h3 className="text-lg font-semibold mb-2">{clients.find(c => c.id === selectedClientId)?.name} 프로젝트</h3>
                    <form onSubmit={handleProjectSubmit} className="flex gap-2 mb-4">
                         <input type="text" placeholder={projectForm.id ? '수정...' : '새 프로젝트...'} value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} className="form-input text-sm flex-grow"/>
                         <button type="submit" className="btn-primary text-sm px-3">{projectForm.id ? '✓' : '+'}</button>
                         {projectForm.id && <button type="button" onClick={() => setProjectForm({id:null, name:'', clientId: selectedClientId})} className="btn-secondary text-sm px-3">×</button>}
                    </form>
                    <div className="space-y-2 overflow-y-auto border p-2 rounded-md flex-grow">
                        {projectsOfSelectedClient.length > 0 ? projectsOfSelectedClient.map(proj => (
                            <div key={proj.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100">
                                <span className="text-sm">{proj.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setProjectForm(proj)} className="text-xs text-blue-600 hover:underline">수정</button>
                                    <button onClick={() => deleteProject(proj.id)} className="text-xs text-red-600 hover:underline">삭제</button>
                                </div>
                            </div>
                        )) : <p className="text-sm text-slate-500 text-center py-4">프로젝트가 없습니다.</p>}
                    </div>
                </>
             ) : <div className="flex items-center justify-center h-full text-slate-500">클라이언트를 선택하세요.</div>}
        </div>
     </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
            <h2 className="text-xl font-bold">관리</h2>
        </div>
        <div className="border-b border-slate-200">
            <nav className="flex" aria-label="Tabs">
                 <button onClick={() => setActiveTab('team')} className={`tab-button ${activeTab === 'team' ? 'tab-active' : ''}`}>팀 관리</button>
                 <button onClick={() => setActiveTab('projects')} className={`tab-button ${activeTab === 'projects' ? 'tab-active' : ''}`}>클라이언트/프로젝트 관리</button>
            </nav>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
            {activeTab === 'team' ? renderTeamManagement() : renderProjectManagement()}
        </div>
        <div className="bg-slate-50 px-6 py-3 flex justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">닫기</button>
        </div>
        <style>{`
            .form-input { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; }
            .form-input:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #3b82f6; }
            .form-select { display: block; width: 100%; padding: 0.5rem 2.5rem 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; background-color: #fff; -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
            .btn-primary { padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600; background-color: #2563eb; color: white; border-radius: 0.375rem; transition: background-color 0.2s; }
            .btn-primary:hover { background-color: #1d4ed8; }
            .btn-secondary { padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 0.375rem; transition: background-color 0.2s; }
            .btn-secondary:hover { background-color: #f1f5f9; }
            .tab-button { padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 500; color: #475569; }
            .tab-button:hover { color: #1e293b; }
            .tab-active { border-bottom: 2px solid #2563eb; color: #1d4ed8; }
        `}</style>
      </div>
    </div>
  );
};

interface EntityListProps<T extends {id: string, name: string}> {
    title: string;
    items: T[];
    onEdit: (item: T) => void;
    onDelete: (id: string) => void;
}

const EntityList = <T extends {id: string, name: string}>({ title, items, onEdit, onDelete }: EntityListProps<T>) => (
    <div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="space-y-2 border rounded-lg p-2 min-h-[100px]">
            {items.length > 0 ? items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-md border">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(item)} className="text-xs text-blue-600 hover:underline">수정</button>
                        <button onClick={() => onDelete(item.id)} className="text-xs text-red-600 hover:underline">삭제</button>
                    </div>
                </div>
            )) : <p className="text-sm text-slate-500 p-4 text-center">항목이 없습니다.</p>}
        </div>
    </div>
);


export default ManagementModal;