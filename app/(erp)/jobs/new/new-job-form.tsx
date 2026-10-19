
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    site_name: string
    address_line_1: string | null
    province: string | null
    city: string | null
}

export default function NewJobForm({
    clients,
}: {
    clients: Client[]
}) {
    const router = useRouter()

    const [selectedClient, setSelectedClient] = useState('')
    const [sites, setSites] = useState<Site[]>([])
    const [loadingSites, setLoadingSites] = useState(false)

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('normal')
    const [scheduledDate, setScheduledDate] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleClientChange(
        e: React.ChangeEvent<HTMLSelectElement>
    ) {
        const clientId = e.target.value

        setSelectedClient(clientId)
        setSites([])

        if (!clientId) {
            return
        }

        setLoadingSites(true)

        const supabase = createClient()

        const { data, error } = await supabase
            .from('sites')
            .select(
                'id, site_name, address_line_1, province, city'
            )
            .eq('client_id', clientId)
            .order('created_at', {
                ascending: false,
            })

        if (error) {
            setError(error.message)
        } else {
            setSites(data || [])
        }

        setLoadingSites(false)
    }

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault()

        setLoading(true)
        setError('')

        const form = new FormData(e.currentTarget)

        const siteId = form.get('site_id') as string

        if (!selectedClient) {
            setError('Please select a client.')
            setLoading(false)
            return
        }

        if (!siteId) {
            setError('Please select a site.')
            setLoading(false)
            return
        }

        if (!title.trim()) {
            setError('Please enter a job title.')
            setLoading(false)
            return
        }

        const supabase = createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        const { error } = await supabase
            .from('jobs')
            .insert({
                client_id: selectedClient,
                site_id: siteId,
                title: title.trim(),
                description: description.trim() || null,
                priority,
                scheduled_date: scheduledDate || null,
                created_by: user?.id || null,
            })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        router.push('/jobs')
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

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6"
        >

            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {error}
                </div>
            )}

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
                            value={selectedClient}
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
                            name="site_id"
                            required
                            disabled={!selectedClient || loadingSites}
                            className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none disabled:bg-gray-100 focus:border-gray-500"
                        >
                            <option value="">
                                {!selectedClient
                                    ? 'Select a client first'
                                    : loadingSites
                                        ? 'Loading sites...'
                                        : sites.length === 0
                                            ? 'No sites found'
                                            : 'Select a site'}
                            </option>

                            {sites.map((site) => (
                                <option
                                    key={site.id}
                                    value={site.id}
                                >
                                    {site.site_name}
                                    {site.address_line_1
                                        ? ` — ${site.address_line_1}`
                                        : site.city
                                            ? ` — ${site.city}`
                                            : ''}
                                </option>
                            ))}
                        </select>

                        {selectedClient && sites.length === 0 && !loadingSites && (
                            <p className="mt-2 text-xs text-gray-600">
                                This client has no sites yet. Add a site from
                                the client's profile first.
                            </p>
                        )}
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
                            Job Title *
                        </label>

                        <input
                            name="title"
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
                            name="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Brief description of the work..."
                            className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Priority
                            </label>

                            <select
                                name="priority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Scheduled Date
                            </label>

                            <input
                                type="date"
                                name="scheduled_date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                            />
                        </div>

                    </div>

                </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">

                <Link
                    href="/jobs"
                    className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </Link>

                <button
                    type="submit"
                    disabled={
                        loading ||
                        !selectedClient ||
                        sites.length === 0
                    }
                    className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? 'Creating...' : 'Create Job'}
                </button>

            </div>

        </form>
    )
}

