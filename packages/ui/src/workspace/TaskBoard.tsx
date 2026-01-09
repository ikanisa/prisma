/**
 * Task Board Component
 * 
 * Kanban-style task board for managing engagement tasks across status columns.
 */

import React, { useState } from 'react';
import type { WorkspaceTask, TaskBoardProps, TaskStatus, TaskPriority } from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
    todo: { label: 'To Do', color: '#6b7280', bg: '#f3f4f6' },
    in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
    in_review: { label: 'In Review', color: '#8b5cf6', bg: '#f5f3ff' },
    blocked: { label: 'Blocked', color: '#ef4444', bg: '#fef2f2' },
    completed: { label: 'Completed', color: '#10b981', bg: '#d1fae5' },
};

const priorityConfig: Record<TaskPriority, { color: string; icon: string }> = {
    low: { color: '#6b7280', icon: '↓' },
    medium: { color: '#f59e0b', icon: '=' },
    high: { color: '#ef4444', icon: '↑' },
    urgent: { color: '#dc2626', icon: '⚡' },
};

function formatDueDate(date: Date | undefined): { text: string; overdue: boolean } {
    if (!date) return { text: '', overdue: false };

    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
    if (days === 0) return { text: 'Due today', overdue: false };
    if (days === 1) return { text: 'Tomorrow', overdue: false };
    if (days <= 7) return { text: `${days}d`, overdue: false };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
}

// ============================================================================
// TASK CARD
// ============================================================================

interface TaskCardProps {
    task: WorkspaceTask;
    onClick?: (task: WorkspaceTask) => void;
    isDragging?: boolean;
}

function TaskCard({ task, onClick, isDragging }: TaskCardProps): React.ReactElement {
    const priority = priorityConfig[task.priority];
    const dueInfo = formatDueDate(task.dueDate);

    return (
        <div
            onClick={() => onClick?.(task)}
            draggable
            style={{
                background: 'white',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid var(--color-border, #e5e7eb)',
                boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.12)' : '0 1px 2px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.2s',
                opacity: isDragging ? 0.8 : 1,
                transform: isDragging ? 'rotate(3deg) scale(1.02)' : 'none',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
            }}>
                <span style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.4,
                    flex: 1,
                }}>
                    {task.title}
                </span>
                <span style={{
                    color: priority.color,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginLeft: '8px',
                }}>
                    {priority.icon}
                </span>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginBottom: '8px',
                }}>
                    {task.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-secondary)',
                        }}>
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Assignee */}
                    {task.assigneeName && (
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--color-primary, #3b82f6)',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }} title={task.assigneeName}>
                            {task.assigneeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                    )}

                    {/* Workpaper ref */}
                    {task.workpaperId && (
                        <span style={{
                            fontSize: '0.7rem',
                            color: 'var(--color-text-tertiary)',
                            fontFamily: 'monospace',
                        }}>
                            WP
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Comments */}
                    {task.commentCount && task.commentCount > 0 && (
                        <span style={{
                            fontSize: '0.7rem',
                            color: 'var(--color-text-tertiary)',
                        }}>
                            💬 {task.commentCount}
                        </span>
                    )}

                    {/* Due date */}
                    {dueInfo.text && (
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: dueInfo.overdue ? 600 : 400,
                            color: dueInfo.overdue ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
                        }}>
                            {dueInfo.text}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// TASK COLUMN
// ============================================================================

interface TaskColumnProps {
    status: TaskStatus;
    tasks: WorkspaceTask[];
    onTaskClick?: (task: WorkspaceTask) => void;
    onTaskDrop?: (taskId: string, newStatus: TaskStatus) => void;
    onAddTask?: () => void;
}

function TaskColumn({ status, tasks, onTaskClick, onTaskDrop, onAddTask }: TaskColumnProps): React.ReactElement {
    const [isDragOver, setIsDragOver] = useState(false);
    const config = statusConfig[status];

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            onTaskDrop?.(taskId, status);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
                flex: 1,
                minWidth: '280px',
                maxWidth: '320px',
                background: isDragOver ? config.bg : 'var(--color-bg-tertiary, #f9fafb)',
                borderRadius: '12px',
                padding: '12px',
                border: isDragOver ? `2px dashed ${config.color}` : '2px solid transparent',
                transition: 'background 0.2s, border 0.2s',
            }}
        >
            {/* Column Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--color-border-light)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: config.color,
                    }} />
                    <span style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: 'var(--color-text-primary)',
                    }}>
                        {config.label}
                    </span>
                    <span style={{
                        background: 'var(--color-bg-secondary)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'var(--color-text-secondary)',
                    }}>
                        {tasks.length}
                    </span>
                </div>
                {status === 'todo' && onAddTask && (
                    <button
                        onClick={onAddTask}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.25rem',
                            color: 'var(--color-text-tertiary)',
                            padding: '4px',
                            lineHeight: 1,
                        }}
                    >
                        +
                    </button>
                )}
            </div>

            {/* Tasks */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minHeight: '100px',
            }}>
                {tasks.map(task => (
                    <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                    >
                        <TaskCard task={task} onClick={onTaskClick} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// TASK BOARD
// ============================================================================

export function TaskBoard({
    tasks,
    columns = ['todo', 'in_progress', 'in_review', 'completed'],
    onTaskClick,
    onTaskMove,
    onTaskCreate,
}: TaskBoardProps): React.ReactElement {
    // Group tasks by status
    const tasksByStatus = new Map<TaskStatus, WorkspaceTask[]>();
    for (const status of columns) {
        tasksByStatus.set(status, tasks.filter(t => t.status === status));
    }

    return (
        <div style={{
            display: 'flex',
            gap: '16px',
            padding: '16px',
            overflowX: 'auto',
            minHeight: '500px',
        }}>
            {columns.map(status => (
                <TaskColumn
                    key={status}
                    status={status}
                    tasks={tasksByStatus.get(status) ?? []}
                    onTaskClick={onTaskClick}
                    onTaskDrop={onTaskMove}
                    onAddTask={status === 'todo' ? () => onTaskCreate?.(status) : undefined}
                />
            ))}
        </div>
    );
}

export default TaskBoard;
