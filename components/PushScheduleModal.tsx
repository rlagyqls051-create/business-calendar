import React, { useState } from 'react';
import { Task, Person } from '../types';

interface PushScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (daysToPush: number) => void;
  conflictInfo: {
    taskToSave: Task;
    conflictingTask: Task;
    person: Person;
  } | null;
}

const PushScheduleModal: React.FC<PushScheduleModalProps> = ({ isOpen, onClose, onConfirm, conflictInfo }) => {
  const [daysToPush, setDaysToPush] = useState(1);

  if (!isOpen || !conflictInfo) return null;

  const { taskToSave, conflictingTask, person } = conflictInfo;

  const handleConfirm = () => {
    if (daysToPush > 0) {
      onConfirm(daysToPush);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-2">스케줄 충돌 감지</h2>
          <p className="text-sm text-slate-600 mb-4">
            <strong>{person.name}</strong>님은 해당 날짜에 이미 '<strong>{conflictingTask.title}</strong>' 작업이 있습니다.
            <br />
            새 작업 '<strong>{taskToSave.title}</strong>'을(를) 추가하고 기존 스케줄을 뒤로 미루시겠습니까?
          </p>
          
          <div className="bg-slate-100 p-4 rounded-md">
            <label htmlFor="daysToPush" className="block text-sm font-medium text-slate-700">
              이후 모든 작업을 미룰 날짜 수:
            </label>
            <div className="flex items-center gap-2 mt-2">
              <input
                id="daysToPush"
                type="number"
                value={daysToPush}
                onChange={(e) => setDaysToPush(Math.max(1, parseInt(e.target.value, 10)))}
                min="1"
                className="w-20 text-center px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span>일</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {conflictingTask.date}부터 시작되는 {person.name}님의 모든 작업이 {daysToPush}일씩 뒤로 밀립니다.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 flex justify-end items-center gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-md hover:bg-slate-100 transition-colors">
            취소 (저장 안함)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow"
          >
            확인 및 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushScheduleModal;
