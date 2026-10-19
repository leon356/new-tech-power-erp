
import Link from 'next/link'
import { Plus, BriefcaseBusiness } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const statusLabels: Record<string, string> = {
    job_created: 'Job Created',
    site_assessment: 'Site Assessment',
    system_design: 'System Design',
    materials_required: 'Materials Required',
    materials_ordered: 'Materials Ordered',
    materials_ready: 'Materials Ready',
    installation_scheduled: 'Installation Scheduled',
    installation_in_progress: 'Installation In Progress',
    installation_complete: 'Installation Complete',
    commissioning: 'Commissioning',
    handover: 'Handover',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
}

const priorityLabels: Record<string, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
}

export default async function JobsPage() {
    const supabase = await createClient()

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
      id,
      job_number,
      title,
      description,
      status,
      priority,
      scheduled_date,
      created_at,
      clients (
        client_type,
        first_name,
        last_name,
        company_name
      ),
      sites (
        site_name,
        address_line_1,
        province,
        city
      )
    `)
        .order('created_at', { ascending: false })

    if (error) {
        return (
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Jobs
                </h1>

                <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Could not load jobs: {error.message}
                </div>
            </div>
        )
    }

    return (
        <div>

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">

                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Jobs
                    </h1>

                    <p className="mt-1 text-sm text-gray-600">
                        Manage and track New Tech Power installations.
                    </p>
                </div>

                <Link
                    href="/jobs/new"
                    className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                    <Plus size={18} />
                    Create Job
                </Link>

            </div>

            {/* Jobs */}
            {jobs && jobs.length > 0 ? (

                <div className="space-y-3">

                    {jobs.map((job) => {

                        const client = Array.isArray(job.clients)
                            ? job.clients[0]
                            : job.clients

                        const site = Array.isArray(job.sites)
                            ? job.sites[0]
                            : job.sites

                        const clientName =
                            client?.client_type === 'business'
                                ? client.company_name
                                : `${client?.first_name || ''} ${client?.last_name || ''}`.trim()

                        return (
                            <Link
                                key={job.id}
                                href={`/jobs/${job.id}`}
                                className="block rounded-xl border bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
                            >

                                <div className="flex items-start justify-between gap-4">

                                    <div className="flex gap-4">

                                        <div className="mt-1 rounded-lg bg-gray-400 p-2.5">
                                            <BriefcaseBusiness size={20} />
                                        </div>

                                        <div>

                                            <div className="flex flex-wrap items-center gap-2">

                                                <span className="text-xs font-semibold text-gray-500">
                                                    {job.job_number}
                                                </span>

                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                                    {statusLabels[job.status] || job.status}
                                                </span>

                                            </div>

                                            <h2 className="mt-2 font-semibold text-gray-800">
                                                {job.title}
                                            </h2>

                                            <p className="mt-1 text-sm text-gray-600">
                                                {clientName || 'Unknown Client'}
                                                {site?.site_name && (
                                                    <> • {site.site_name}</>
                                                )}
                                            </p>

                                            {(site?.city || site?.province) && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {[site.city, site.province]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </p>
                                            )}

                                        </div>

                                    </div>

                                    <div className="shrink-0 text-right">

                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${job.priority === 'urgent'
                                                ? 'bg-red-100 text-red-700'
                                                : job.priority === 'high'
                                                    ? 'bg-orange-300 text-orange-700'
                                                    : job.priority === 'low'
                                                        ? 'bg-gray-300 text-gray-600'
                                                        : 'bg-blue-300 text-blue-700'
                                                }`}
                                        >
                                            {priorityLabels[job.priority] || job.priority}
                                        </span>

                                        {job.scheduled_date && (
                                            <p className="mt-2 text-xs text-gray-500">
                                                Scheduled:{' '}
                                                {new Date(job.scheduled_date).toLocaleDateString(
                                                    'en-ZA'
                                                )}
                                            </p>
                                        )}

                                    </div>

                                </div>

                            </Link>
                        )
                    })}

                </div>

            ) : (

                <div className="rounded-xl border bg-white p-12 text-center">

                    <BriefcaseBusiness
                        size={36}
                        className="mx-auto text-gray-400"
                    />

                    <h2 className="mt-4 text-lg font-semibold text-gray-800">
                        No jobs yet
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        Create your first job to start tracking an installation.
                    </p>

                    <Link
                        href="/jobs/new"
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
                    >
                        <Plus size={18} />
                        Create Job
                    </Link>

                </div>

            )}

        </div>
    )
}
