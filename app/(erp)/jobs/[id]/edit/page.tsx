'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Client = {
    id: string
    client_type: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
}

type Site = {
    id: string
    site_name: string | null
    address_line_1: string | null
    suburb: string | null
    city: string | null
    province: string | null
}

const statuses = [
    { value: 'job_created', label: 'Job Created' },
    { value: 'site_assessment', label: 'Site Assessment' },
    { value: 'system_design', label: 'System Design' },
    { value: 'materials_required', label: 'Materials Required' },
    { value: 'materials_ordered', label: 'Materials Ordered' },
    { value: 'materials_ready', label: 'Materials Ready' },
    { value: 'installation_scheduled', label: 'Installation Scheduled' },
    { value: 'installation_in_progress', label: 'Installation In Progress' },
    { value: 'installation_complete', label: 'Installation Complete' },
    { value: 'commissioning', label: 'Commissioning' },
    { value: 'handover', label: 'Handover' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' },
]

const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
]

export default function EditJobPage() {
    const router = useRouter()
    const params = useParams()
    const jobId = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [clients, setClients] = useState<Client[]>([])
    const [sites, setSites] = useState<Site[]>([])

    const [jobNumber, setJobNumber] = useState('')
    const [clientId, setClientId] = useState('')
    const [siteId, setSiteId] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState('job_created')
    const [priority, setPriority] = useState('normal')
    const [scheduledDate, setScheduledDate] = useState('')

    const supabase = createClient()

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            setError('')

            const [
                { data: clientsData, error: clientsError },
                { data: jobData, error: jobError },
            ] = await Promise.all([
                supabase
                    .from('clients')
                    .select(`
                        id,
                        client_type,
                        first_name,
                        last_name,
                        company_name
                    `)
                    .order('created_at', { ascending: false }),

                supabase
                    .from('jobs')
                    .select(`
                        id,
                        job_number,
                        client_id,
                        site_id,
                        title,
                        description,
                        status,
                        priority,
                        scheduled_date
                    `)
                    .eq('id', jobId)
                    .single(),
            ])

            if (clientsError) {
                setError(clientsError.message)
                setLoading(false)
                return
            }

            if (jobError || !jobData) {
                setError(jobError?.message || 'Job could not be found.')
                setLoading(false)
                return
            }

            setClients(clientsData || [])

            setJobNumber(jobData.job_number)
            setClientId(jobData.client_id)
            setSiteId(jobData.site_id)
            setTitle(jobData.title)
            setDescription(jobData.description || '')
            setStatus(jobData.status)
            setPriority(jobData.priority)
            setScheduledDate(jobData.scheduled_date || '')

            await loadSites(jobData.client_id)

            setLoading(false)
        }

        loadData()
    }, [jobId])

    async function loadSites(selectedClientId: string) {
        if (!selectedClientId) {
            setSites([])
            return
        }

        const { data, error } = await supabase
            .from('sites')
            .select(`
                id,
                site_name,
                address_line_1,
                suburb,
                city,
                province
            `)
            .eq('client_id', selectedClientId)
            .order('created_at', { ascending: false })

        if (error) {
            setError(error.message)
            return
        }

        setSites(data || [])
    }

    async function handleClientChange(
        e: React.ChangeEvent<HTMLSelectElement>
    ) {
        const newClientId = e.target.value

        setClientId(newClientId)
        setSiteId('')

        await loadSites(newClientId)
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        setSaving(true)
        setError('')

        if (!clientId) {
            setError('Please select a client.')
            setSaving(false)
            return
        }

        if (!siteId) {
            setError('Please select a site.')
            setSaving(false)
            return
        }

        if (!title.trim()) {
            setError('Please enter a job title.')
            setSaving(false)
            return
        }

        const { error } = await supabase
            .from('jobs')
            .update({
                client_id: clientId,
                site_id: siteId,
                title: title.trim(),
                description: description.trim() || null,
                status,
                priority,
                scheduled_date: scheduledDate || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)

        if (error) {
            setError(error.message)
            setSaving(false)
            return
        }

        router.push(`/jobs/${jobId}`)
        router.refresh()
    }

    function getClientName(client: Client) {
        if (client.client_type === 'business') {
            return client.company_name || 'Unnamed Business'
        }

        return (
            `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
            'Unnamed Client'
        )
    }

    if (loading) {
        return (
            <div className="max-w-3xl">
                <div className="rounded-xl border bg-white p-8 text-sm text-gray-500">
                    Loading job...
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl">

            {/* Back */}
            <Link
                href={`/jobs/${jobId}`}
                className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
                <ArrowLeft size={18} />
                Back to Job
            </Link>

            {/* Header */}
            <div className="mb-8">
                <p className="text-sm font-medium text-gray-500">
                    {jobNumber}
                </p>

                <h1 className="mt-1 text-2xl font-bold text-gray-800">
                    Edit Job
                </h1>

                <p className="mt-1 text-sm text-gray-600">
                    Update the job information below.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >

                {/* Client & Site */}
                <div className="rounded-xl border bg-white p-6">

                    <h2 className="mb-5 text-lg font-semibold text-gray-800">
                        Client & Site
                    </h2>

                    <div className="space-y-5">

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Client *
                            </label>

                            <select
                                value={clientId}
                                onChange={handleClientChange}
                                required
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                            >
                                <option value="">
                                    Select a client
                                </option>

                                {clients.map((client) => (
                                    <option
                                        key={client.id}
                                        value={client.id}
                                    >
                                        {getClientName(client)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Site *
                            </label>

                            <select
                                value={siteId}
                                onChange={(e) => setSiteId(e.target.value)}
                                required
                                disabled={!clientId}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none disabled:bg-gray-100 focus:border-gray-500"
                            >
                                <option value="">
                                    {!clientId
                                        ? 'Select a client first'
                                        : sites.length === 0
                                            ? 'No sites found'
                                            : 'Select a site'}
                                </option>

                                {sites.map((site) => (
                                    <option
                                        key={site.id}
                                        value={site.id}
                                    >
                                        {site.site_name || 'Unnamed Site'}
                                        {site.city
                                            ? ` — ${site.city}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>

                </div>

                {/* Job Information */}
                <div className="rounded-xl border bg-white p-6">

                    <h2 className="mb-5 text-lg font-semibold text-gray-800">
                        Job Information
                    </h2>

                    <div className="space-y-5">

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Job Number
                            </label>

                            <input
                                value={jobNumber}
                                disabled
                                className="mt-1.5 w-full rounded-lg border bg-gray-100 px-3 py-2.5 text-sm text-gray-500"
                            />

                            <p className="mt-1 text-xs text-gray-500">
                                Job numbers cannot be changed.
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Job Title *
                            </label>

                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="e.g. 8kW Solar PV Installation"
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Description
                            </label>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                placeholder="Brief description of the work..."
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                            />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">

                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Status
                                </label>

                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                                >
                                    {statuses.map((item) => (
                                        <option
                                            key={item.value}
                                            value={item.value}
                                        >
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Priority
                                </label>

                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                                >
                                    {priorities.map((item) => (
                                        <option
                                            key={item.value}
                                            value={item.value}
                                        >
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Scheduled Date
                            </label>

                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                            />
                        </div>

                    </div>

                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">

                    <Link
                        href={`/jobs/${jobId}`}
                        className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </Link>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                </div>

            </form>

        </div>
    )
}
