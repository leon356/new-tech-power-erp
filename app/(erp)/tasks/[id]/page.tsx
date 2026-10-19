import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
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

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      clients (
        id,
        first_name,
        last_name,
        company_name,
        client_type
      ),
      jobs (
        id,
        job_number,
        title
      ),
      assigned_profile:profiles!tasks_assigned_to_fkey (
        first_name,
        last_name
      ),
      created_profile:profiles!tasks_created_by_fkey (
        first_name,
        last_name
      )
    `)
    .eq('id', id)
    .single()

  if (error || !task) {
    return (
      <div>
        <Link
          href="/tasks"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to Tasks
        </Link>

        <div className="rounded-xl border bg-white p-8">
          <h1 className="text-xl font-semibold text-gray-800">
            Task not found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            This task could not be found or may have been deleted.
          </p>
        </div>
      </div>
    )
  }

  const client = Array.isArray(task.clients)
    ? task.clients[0]
    : task.clients

  const job = Array.isArray(task.jobs)
    ? task.jobs[0]
    : task.jobs

  const assignedProfile = Array.isArray(task.assigned_profile)
    ? task.assigned_profile[0]
    : task.assigned_profile

  const createdProfile = Array.isArray(task.created_profile)
    ? task.created_profile[0]
    : task.created_profile

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

  const createdByName =
    `${createdProfile?.first_name || ''} ${
      createdProfile?.last_name || ''
    }`.trim()

  return (
    <div className="max-w-4xl">

      {/* Back */}
      <Link
        href="/tasks"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Tasks
      </Link>

      {/* Header */}
      <div className="mb-8">

        <div className="flex flex-wrap items-center gap-3">

          <h1 className="text-2xl font-bold text-gray-800">
            {task.title}
          </h1>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              priorityStyles[task.priority] ||
              priorityStyles.normal
            }`}
          >
            {task.priority}
          </span>

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
            {statusLabels[task.status] || task.status}
          </span>

        </div>

        <p className="mt-2 text-sm text-gray-500">
          Task created {new Date(task.created_at).toLocaleDateString(
            'en-ZA',
            {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }
          )}
        </p>

      </div>

      <div className="space-y-6">

        {/* Description */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Description
          </h2>

          {task.description ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {task.description}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              No description provided.
            </p>
          )}

        </div>

        {/* Task information */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Task Information
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {statusLabels[task.status] || task.status}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Priority
              </p>

              <p className="mt-1 text-sm font-medium capitalize text-gray-800">
                {task.priority}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Due Date
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {task.due_date
                  ? new Date(task.due_date).toLocaleDateString(
                      'en-ZA',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }
                    )
                  : 'No due date'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Assigned To
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {assignedName || 'Unassigned'}
              </p>
            </div>

            {task.completed_at && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Completed
                </p>

                <p className="mt-1 text-sm font-medium text-green-700">
                  {new Date(
                    task.completed_at
                  ).toLocaleDateString(
                    'en-ZA',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Created By
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {createdByName || 'Unknown'}
              </p>
            </div>

          </div>

        </div>

        {/* Client */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Client
          </h2>

          {client ? (

            <Link
              href={`/clients/${client.id}`}
              className="block rounded-lg border p-4 hover:bg-gray-50"
            >
              <p className="font-medium text-gray-800">
                {clientName || 'Unnamed Client'}
              </p>

              <p className="mt-1 text-xs capitalize text-gray-500">
                {client.client_type}
              </p>
            </Link>

          ) : (

            <p className="text-sm text-gray-500">
              No client linked to this task.
            </p>

          )}

        </div>

        {/* Job */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Related Job
          </h2>

          {job ? (

            <Link
              href={`/jobs/${job.id}`}
              className="block rounded-lg border p-4 hover:bg-gray-50"
            >
              <p className="font-medium text-gray-800">
                {job.job_number}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {job.title}
              </p>
            </Link>

          ) : (

            <p className="text-sm text-gray-500">
              No job linked to this task.
            </p>

          )}

        </div>

        {/* Completion */}
        {task.status === 'completed' && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-5">

            <CheckCircle2
              size={22}
              className="text-green-600"
            />

            <div>
              <p className="font-medium text-green-800">
                Task completed
              </p>

              {task.completed_at && (
                <p className="mt-1 text-sm text-green-700">
                  Completed on{' '}
                  {new Date(
                    task.completed_at
                  ).toLocaleDateString(
                    'en-ZA',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </p>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  )
}
