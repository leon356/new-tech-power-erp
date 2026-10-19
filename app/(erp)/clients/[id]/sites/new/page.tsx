
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NewSitePage() {
    const router = useRouter()
    const params = useParams()
    const clientId = params.id as string

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        site_name: '',
        address_line_1: '',
        address_line_2: '',
        suburb: '',
        province: '',
        city: '',
        postal_code: '',
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        notes: '',
    })

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        setLoading(true)
        setError('')

        const supabase = createClient()

        const { error } = await supabase
            .from('sites')
            .insert({
                client_id: clientId,
                ...formData,
            })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        router.push(`/clients/${clientId}`)
        router.refresh()
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
                    Add Site
                </h1>

                <p className="mt-1 text-sm text-gray-600">
                    Add a property or installation location for this client.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Form */}
            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >

                {/* Site information */}
                <div className="rounded-xl border bg-white p-6">

                    <h2 className="mb-5 text-lg font-semibold text-gray-800">
                        Site Information
                    </h2>

                    <div className="space-y-4">

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Site Name *
                            </label>

                            <input
                                name="site_name"
                                value={formData.site_name}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Home, Main Office, Warehouse"
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Address Line 1
                            </label>

                            <input
                                name="address_line_1"
                                value={formData.address_line_1}
                                onChange={handleChange}
                                placeholder="Street address"
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Address Line 2
                            </label>

                            <input
                                name="address_line_2"
                                value={formData.address_line_2}
                                onChange={handleChange}
                                placeholder="Unit, complex, building, etc."
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                            />
                        </div>

                        

                        <div className="grid gap-4 sm:grid-cols-2">

                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Suburb
                                </label>

                                <input
                                    name="suburb"
                                    value={formData.suburb}
                                    onChange={handleChange}
                                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    City
                                </label>

                                <input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                                />
                            </div>

                        </div>

                        

                        <div className="grid gap-4 sm:grid-cols-2">

                            <div className="max-w-xs">

                            <label className="text-sm font-medium text-gray-700">
                                Postal Code
                            </label>

                            <input
                                name="postal_code"
                                value={formData.postal_code}
                                onChange={handleChange}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                            />

                        </div>


                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Province
                                </label>
                                <input
                                    name="province"
                                    value={formData.province}
                                    onChange={handleChange}
                                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                                />
                            </div>

                        </div>

                    </div>

                </div>

                {/* Site contact */}
                <div className="rounded-xl border bg-white p-6">

                    <h2 className="mb-5 text-lg font-semibold text-gray-800">
                        Site Contact
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Contact Person
                            </label>

                            <input
                                name="contact_person"
                                value={formData.contact_person}
                                onChange={handleChange}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Contact Phone
                            </label>

                            <input
                                name="contact_phone"
                                value={formData.contact_phone}
                                onChange={handleChange}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                            />
                        </div>

                        <div className="sm:col-span-2">

                            <label className="text-sm font-medium text-gray-700">
                                Contact Email
                            </label>

                            <input
                                type="email"
                                name="contact_email"
                                value={formData.contact_email}
                                onChange={handleChange}
                                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                            />

                        </div>

                    </div>

                </div>

                {/* Notes */}
                <div className="rounded-xl border bg-white p-6">

                    <h2 className="mb-5 text-lg font-semibold text-gray-800">
                        Notes
                    </h2>

                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Any useful information about the site..."
                        className="w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                    />

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
                        disabled={loading}
                        className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Site'}
                    </button>

                </div>

            </form>

        </div>
    )
}
