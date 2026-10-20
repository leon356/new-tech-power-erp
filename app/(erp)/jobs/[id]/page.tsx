import Link from 'next/link'
import SiteAssessment from './site-assessment'
import SitePhotos from './site-photos'
import StatusSelector from './status-selector'
import { ArrowLeft, CalendarDays, MapPin, User, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import JobMaterials from './job-materials'

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

const statuses = [
    'job_created',
    'site_assessment',
    'system_design',
    'materials_required',
    'materials_ordered',
    'materials_ready',
    'installation_scheduled',
    'installation_in_progress',
    'installation_complete',
    'commissioning',
    'handover',
    'completed',
]

const priorityLabels: Record<string, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
}

export default async function JobDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const supabase = await createClient()

    const { data: job, error } = await supabase
        .from('jobs')
        .select(`
      *,
      clients (
        id,
        client_type,
        first_name,
        last_name,
        company_name,
        email,
        phone
      ),
      sites (
        id,
        site_name,
        address_line_1,
        address_line_2,
        suburb,
        city,
        province,
        postal_code,
        contact_person,
        contact_phone
      )
    `)
        .eq('id', id)
        .single()

    if (error || !job) {
        return (
            <div>
                <Link
                    href="/jobs"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft size={18} />
                    Back to Jobs
                </Link>

                <div className="rounded-xl border bg-white p-8">
                    <h1 className="text-xl font-semibold text-gray-800">
                        Job not found
                    </h1>

                    <p className="mt-2 text-sm text-gray-600">
                        We could not find this job.
                    </p>
                </div>
            </div>
        )
    }

    const client = job.clients
    const site = job.sites

    const clientName =
        client?.client_type === 'business'
            ? client.company_name || 'Unnamed Business'
            : `${client?.first_name || ''} ${client?.last_name || ''}`.trim() ||
            'Unnamed Client'

    const currentStatusIndex = statuses.indexOf(job.status)

    return (
        <div className="max-w-6xl">

            {/* Back */}
            <Link
                href="/jobs"
                className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
                <ArrowLeft size={18} />
                Back to Jobs
            </Link>

            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                <div>
                    <p className="text-sm font-medium text-gray-500">
                        {job.job_number}
                    </p>

                    <h1 className="mt-1 text-3xl font-bold text-gray-800">
                        {job.title}
                    </h1>

                    <p className="mt-2 text-sm text-gray-600">
                        {statusLabels[job.status] || job.status}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">

                    {/* Edit Job */}
                    <Link
                        href={`/jobs/${job.id}/edit`}
                        className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Pencil size={16} />
                        Edit Job
                    </Link>

                    <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium capitalize text-gray-700">
                        {priorityLabels[job.priority] || job.priority}
                    </span>

                    <StatusSelector
                        jobId={job.id}
                        currentStatus={job.status}
                    />

                </div>

            </div>

            {/* Main grid */}
            <div className="grid gap-6 lg:grid-cols-3">

                {/* Main column */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Job Progress */}
                    <div className="rounded-xl border bg-white p-6">

                        <h2 className="mb-6 text-lg font-semibold text-gray-800">
                            Job Progress
                        </h2>

                        <div className="space-y-4">

                            {statuses.map((status, index) => {

                                const isComplete =
                                    currentStatusIndex >= 0 &&
                                    index <= currentStatusIndex

                                const isCurrent =
                                    index === currentStatusIndex

                                return (
                                    <div
                                        key={status}
                                        className="flex items-center gap-4"
                                    >

                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                                                isComplete
                                                    ? 'border-gray-800 bg-gray-800 text-white'
                                                    : 'border-gray-300 bg-white text-gray-400'
                                            }`}
                                        >
                                            {index + 1}
                                        </div>

                                        <div
                                            className={
                                                isCurrent
                                                    ? 'font-semibold text-gray-900'
                                                    : isComplete
                                                        ? 'text-gray-700'
                                                        : 'text-gray-400'
                                            }
                                        >
                                            {statusLabels[status]}
                                        </div>

                                    </div>
                                )
                            })}

                        </div>

                    </div>

                    {/* Site Assessment */}
                    <SiteAssessment jobId={job.id} />

                    {/* Site Photos */}
                    <SitePhotos jobId={job.id} />

                    {/* Job Materials */}
                    <JobMaterials jobId={job.id} />
                    
                    {/* Description */}
                    <div className="rounded-xl border bg-white p-6">

                        <h2 className="mb-4 text-lg font-semibold text-gray-800">
                            Description
                        </h2>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                            {job.description || 'No description provided.'}
                        </p>

                    </div>

                </div>

                {/* Sidebar */}
                <div className="space-y-6">

                    {/* Client */}
                    <div className="rounded-xl border bg-white p-6">

                        <h2 className="mb-4 text-lg font-semibold text-gray-800">
                            Client
                        </h2>

                        <div className="flex items-start gap-3">

                            <User
                                size={20}
                                className="mt-0.5 text-gray-500"
                            />

                            <div>

                                <p className="font-medium text-gray-800">
                                    {clientName}
                                </p>

                                {client?.email && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {client.email}
                                    </p>
                                )}

                                {client?.phone && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {client.phone}
                                    </p>
                                )}

                            </div>

                        </div>

                        {client?.id && (
                            <Link
                                href={`/clients/${client.id}`}
                                className="mt-4 inline-block text-sm font-medium text-gray-700 hover:text-black"
                            >
                                View Client →
                            </Link>
                        )}

                    </div>

                    {/* Site */}
                    <div className="rounded-xl border bg-white p-6">

                        <h2 className="mb-4 text-lg font-semibold text-gray-800">
                            Site
                        </h2>

                        <div className="flex items-start gap-3">

                            <MapPin
                                size={20}
                                className="mt-0.5 text-gray-500"
                            />

                            <div>

                                <p className="font-medium text-gray-800">
                                    {site?.site_name || 'Unnamed Site'}
                                </p>

                                {site?.address_line_1 && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {site.address_line_1}
                                    </p>
                                )}

                                {site?.address_line_2 && (
                                    <p className="text-sm text-gray-600">
                                        {site.address_line_2}
                                    </p>
                                )}

                                {(site?.suburb ||
                                    site?.city ||
                                    site?.province ||
                                    site?.postal_code) && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {[
                                            site.suburb,
                                            site.city,
                                            site.province,
                                            site.postal_code,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                )}

                            </div>

                        </div>

                    </div>

                    {/* Schedule */}
                    <div className="rounded-xl border bg-white p-6">

                        <h2 className="mb-4 text-lg font-semibold text-gray-800">
                            Schedule
                        </h2>

                        <div className="flex items-start gap-3">

                            <CalendarDays
                                size={20}
                                className="mt-0.5 text-gray-500"
                            />

                            <div>

                                <p className="text-sm text-gray-500">
                                    Scheduled Date
                                </p>

                                <p className="mt-1 font-medium text-gray-800">
                                    {job.scheduled_date
                                        ? new Date(
                                            job.scheduled_date
                                        ).toLocaleDateString(
                                            'en-ZA',
                                            {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            }
                                        )
                                        : 'Not scheduled'}
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    )
}
