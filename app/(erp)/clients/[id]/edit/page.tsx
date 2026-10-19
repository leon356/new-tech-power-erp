'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ClientForm = {
    client_type: string
    first_name: string
    last_name: string
    company_name: string
    email: string
    phone: string
}

export default function EditClientPage() {
    const router = useRouter()
    const params = useParams()
    const clientId = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState<ClientForm>({
        client_type: 'individual',
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone: '',
    })

    const supabase = createClient()

    useEffect(() => {
        async function loadClient() {
            setLoading(true)
            setError('')

            const { data, error } = await supabase
                .from('clients')
                .select(`
                    client_type,
                    first_name,
                    last_name,
                    company_name,
                    email,
                    phone
                `)
                .eq('id', clientId)
                .single()

            if (error || !data) {
                setError(error?.message || 'Client could not be found.')
                setLoading(false)
                return
            }

            setFormData({
                client_type: data.client_type || 'individual',
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                company_name: data.company_name || '',
                email: data.email || '',
                phone: data.phone || '',
            })

            setLoading(false)
        }

        loadClient()
    }, [clientId])

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        setSaving(true)
        setError('')

        if (formData.client_type === 'business' && !formData.company_name.trim()) {
            setError('Please enter the company name.')
            setSaving(false)
            return
        }

        if (
            formData.client_type === 'individual' &&
            !formData.first_name.trim() &&
            !formData.last_name.trim()
        ) {
            setError('Please enter the client name.')
            setSaving(false)
            return
        }

        const { error } = await supabase
            .from('clients')
            .update({
                client_type: formData.client_type,
                first_name: formData.first_name.trim() || null,
                last_name: formData.last_name.trim() || null,
                company_name: formData.company_name.trim() || null,
                email: formData.email.trim() || null,
                phone: formData.phone.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', clientId)

        if (error) {
            setError(error.message)
            setSaving(false)
            return
        }

        router.push(`/clients/${clientId}`)
        router.refresh()
    }

    if (loading) {
        return (
            <div className="max-w-3xl">
                <div className="rounded-xl border bg-white p-8 text-sm text-gray-500">
                    Loading client...
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl">

            {/* Back */}
            <Link
                href={`/clients/${clientId}`}
                className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
                <ArrowLeft size={18} />
                Back to Client
            </Link>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">
                    Edit Client
                </h1>

                <p className="mt-1 text-sm text-gray-600">
                    Update the client's information.
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

                {/* Client Information */}
                <div className="rounded-xl border bg-white p-6">

                    <h2 className="mb-5 text-lg font-semibold text-gray-800">
                        Client Information
                    </h2>

                    <div className="space-y-5">

                        {/* Client Type */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Client Type
                            </label>

                            <select
                                name="client_type"
                                value={formData.client_type}
                                onChange={handleChange}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                            >
                                <option value="individual">
                                    Individual
                                </option>

                                <option value="business">
                                    Business
                                </option>
                            </select>
                        </div>

                        {/* Individual */}
                        {formData.client_type === 'individual' && (
                            <div className="grid gap-5 sm:grid-cols-2">

                                <div>
                                    <label className="text-sm font-medium text-gray-700">
                                        First Name
                                    </label>

                                    <input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700">
                                        Last Name
                                    </label>

                                    <input
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                                    />
                                </div>

                            </div>
                        )}

                        {/* Business */}
                        {formData.client_type === 'business' && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Company Name
                                </label>

                                <input
                                    name="company_name"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                                />
                            </div>
                        )}

                        {/* Contact */}
                        <div className="grid gap-5 sm:grid-cols-2">

                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Phone
                                </label>

                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
                                />
                            </div>

                        </div>

                    </div>

                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">

                    <Link
                        href={`/clients/${clientId}`}
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
