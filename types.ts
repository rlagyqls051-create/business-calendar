export enum TaskType {
  PREPARATION = '준비',
  FILMING = '촬영',
  EDITING = '편집',
}

export type PersonRole = '연출&촬영' | '후반 작업자';
export type TaskStatus = '대기' | '진행중' | '완료';

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  color: string;
  textColor: string;
}

export interface Client {
  id:string;
  name: string;
  color: string;
  textColor: string;
}

export interface Project {
    id: string;
    name: string;
    clientId: string;
    absoluteDeadline?: string; // YYYY-MM-DD
}

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  personId?: string; // Optional for unassigned tasks
  projectId: string;
  type: TaskType;
  status: TaskStatus;
  checklist?: ChecklistItem[];
  progress?: number; // 0-100
  deadline?: string; // YYYY-MM-DD, for multi-day tasks
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  taskId: string;
}