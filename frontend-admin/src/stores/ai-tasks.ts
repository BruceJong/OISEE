import { create } from 'zustand';
import type { AiTask } from '@/api/ai-tasks';

interface AiTasksState {
  tasks: AiTask[];
  // 往 store 里推入/更新一批任务
  setTasks: (tasks: AiTask[]) => void;
  upsertTask: (task: AiTask) => void;
  // 清除已完成/失败的旧任务
  clearDone: () => void;
}

export const useAiTasksStore = create<AiTasksState>()((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  upsertTask: (task) =>
    set((state) => {
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        const next = [...state.tasks];
        next[idx] = task;
        return { tasks: next };
      }
      return { tasks: [task, ...state.tasks] };
    }),
  clearDone: () =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status === 'PENDING' || t.status === 'RUNNING'),
    })),
}));

export function getActiveTasks(tasks: AiTask[]) {
  return tasks.filter((t) => t.status === 'PENDING' || t.status === 'RUNNING');
}
