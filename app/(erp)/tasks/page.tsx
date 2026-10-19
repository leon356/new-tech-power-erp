import Link from 'next/link'
import { Plus } from 'lucide-react'
import TaskActions from './task-actions'
import { createClient } from '@/lib/supabase/server'

const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
}

const priorityStyles: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    normal: 'bg-blue-50 text-blue-700',
    high: 'bg-orange-50 text-orange-700',
    urgent: 'bg-red-50 text-red-700',
}

export default async function TasksPage() {
    const supabase = await createClient()

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
            *,
            clients (
                first_name,
                last_name,
                company_name,
                client_type
            ),
            jobs (
                job_number,
                title
            ),
            assigned_profile:profiles!tasks_assigned_to_fkey (
                first_name,
                last_name
            )
        `)
        .order('due_date', {
            ascending: true,
            nullsFirst: false,
        })

    if (error) {
        return (
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Tasks
                </h1>

                <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Could not load tasks: {error.message}
                </div>
            </div>
        )
    }

    const pendingTasks =
        tasks?.filter(
            (task) =>
                task.status === 'pending' ||
                task.status === 'in_progress'
        ) || []

    return (
        <div>

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">

                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Tasks
                    </h1>

                    <p className="mt-1 text-sm text-gray-600">
                        Manage tasks and work that needs to be completed.
                    </p>
                </div>

                <Link
                    href="/tasks/new"
                    className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                    <Plus size={18} />
                    New Task
                </Link>

            </div>

            {/* Summary */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3">

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-gray-500">
                        Open Tasks
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-800">
                        {pendingTasks.length}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-gray-500">
                        Due Today
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-800">
                        {pendingTasks.filter(
                            (task) =>
                                task.due_date ===
                                new Date().toISOString().split('T')[0]
                        ).length}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-gray-500">
                        Completed
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-800">
                        {tasks?.filter(
                            (task) => task.status === 'completed'
                        ).length || 0}
                    </p>
                </div>

            </div>

            {/* Task list */}
            {tasks && tasks.length > 0 ? (

                <div className="overflow-hidden rounded-xl border bg-white">

                    <div className="divide-y">

                        {tasks.map((task) => {

                            const client = Array.isArray(task.clients)
                                ? task.clients[0]
                                : task.clients

                            const job = Array.isArray(task.jobs)
                                ? task.jobs[0]
                                : task.jobs

                            const assignedProfile =
                                Array.isArray(task.assigned_profile)
                                    ? task.assigned_profile[0]
                                    : task.assigned_profile

                            const clientName =
                                client?.client_type === 'business'
                                    ? client.company_name
                                    : `${client?.first_name || ''} ${
                                        client?.last_name || ''
                                    }`.trim()

                            const assignedName =
                                `${assignedProfile?.first_name || ''} ${
                                    assignedProfile?.last_name || ''
                                }`.trim()

                            return (
                                <div
                                    key={task.id}
                                    className="relative flex min-h-[96px] items-center"
                                >

                                    {/* Full clickable row */}
                                    <Link
                                        href={`/tasks/${task.id}`}
                                        className="absolute inset-0 z-0 transition-colors hover:bg-gray-50"
                                        aria-label={`Open task ${task.title}`}
                                    />

                                    {/* Task information */}
                                    <div className="relative z-10 min-w-0 flex-1 px-5 py-5 pointer-events-none">

                                        <div className="flex items-center gap-3">

                                            <h2
                                                className={`font-medium ${
                                                    task.status === 'completed'
                                                        ? 'text-gray-400 line-through'
                                                        : 'text-gray-800'
                                                }`}
                                            >
                                                {task.title}
                                            </h2>

                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    priorityStyles[task.priority] ||
                                                    priorityStyles.normal
                                                }`}
                                            >
                                                {task.priority}
                                            </span>

                                        </div>

                                        <div className="mt-1 flex flex-wrap gap-x-2 text-sm text-gray-500">

                                            {job && (
                                                <span>
                                                    {job.job_number}
                                                </span>
                                            )}

                                            {clientName && (
                                                <>
                                                    {job && <span>•</span>}
                                                    <span>
                                                        {clientName}
                                                    </span>
                                                </>
                                            )}

                                            {assignedName && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        Assigned to {assignedName}
                                                    </span>
                                                </>
                                            )}

                                        </div>

                                        {task.due_date && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                Due: {task.due_date}
                                            </p>
                                        )}

                                    </div>

                                    {/* Actions */}
                                    <div className="relative z-20 flex shrink-0 items-center gap-3 px-5">

                                        <TaskActions
                                            taskId={task.id}
                                            status={task.status}
                                        />

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                task.status === 'completed'
                                                    ? 'bg-green-50 text-green-700'
                                                    : task.status === 'in_progress'
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : task.status === 'cancelled'
                                                            ? 'bg-gray-100 text-gray-500'
                                                            : 'bg-yellow-50 text-yellow-700'
                                            }`}
                                        >
                                            {statusLabels[task.status] ||
                                                task.status}
                                        </span>

                                    </div>

                                </div>
                            )
                        })}

                    </div>

                </div>

            ) : (

                <div className="rounded-xl border bg-white p-12 text-center">

                    <h2 className="text-lg font-semibold text-gray-800">
                        No tasks yet
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        Create your first task to start tracking work.
                    </p>

                    <Link
                        href="/tasks/new"
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
                    >
                        <Plus size={18} />
                        New Task
                    </Link>

                </div>

            )}

        </div>
    )
}
