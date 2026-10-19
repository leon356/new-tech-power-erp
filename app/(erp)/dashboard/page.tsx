import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Active jobs
  const { count: activeJobs } = await supabase
    .from('jobs')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .not('status', 'in', '(completed,cancelled)')

  // Open tasks
  const { count: openTasks } = await supabase
    .from('tasks')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .neq('status', 'completed')

  // Recent jobs
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select('id, job_number, title, status, created_at')
    .order('created_at', {
      ascending: false,
    })
    .limit(5)

  // Recent documents
  const { data: recentDocuments } = await supabase
    .from('documents')
    .select('id, name, created_at')
    .order('created_at', {
      ascending: false,
    })
    .limit(5)

  // Recent tasks
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .order('created_at', {
      ascending: false,
    })
    .limit(5)

  // Combine activity
  const activity = [
    ...(recentJobs || []).map((job) => ({
      id: `job-${job.id}`,
      type: 'Job',
      title: `${job.job_number} — ${job.title}`,
      status: job.status,
      created_at: job.created_at,
    })),

    ...(recentDocuments || []).map((document) => ({
      id: `document-${document.id}`,
      type: 'Document',
      title: document.name,
      status: 'uploaded',
      created_at: document.created_at,
    })),

    ...(recentTasks || []).map((task) => ({
      id: `task-${task.id}`,
      type: 'Task',
      title: task.title,
      status: task.status,
      created_at: task.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 8)

  function formatStatus(status: string) {
    return status
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      'en-ZA',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  return (
    <div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Welcome to the New Tech Power ERP.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-600">
            Active Jobs
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-700">
            {activeJobs ?? 0}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-600">
            Open Quotes
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-700">
            0
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-600">
            Tasks Due
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-700">
            {openTasks ?? 0}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-600">
            Low Stock Items
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-700">
            0
          </p>
        </div>

      </div>

      {/* Recent Activity */}
      <div className="mt-8 rounded-xl border bg-white">

        <div className="border-b p-6">
          <h2 className="font-semibold text-gray-800">
            Recent Activity
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Latest activity across your ERP.
          </p>
        </div>

        {activity.length > 0 ? (

          <div className="divide-y">

            {activity.map((item) => (

              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-5"
              >

                <div className="min-w-0">

                  <p className="truncate text-sm font-medium text-gray-800">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {item.type} • {formatDate(item.created_at)}
                  </p>

                </div>

                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-600">
                  {formatStatus(item.status)}
                </span>

              </div>

            ))}

          </div>

        ) : (

          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">
              No activity yet.
            </p>
          </div>

        )}

      </div>

    </div>
  )
}
