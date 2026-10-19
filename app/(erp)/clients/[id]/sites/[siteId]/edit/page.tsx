'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function EditSitePage() {
  const router = useRouter()
  const params = useParams()

  const clientId = params.id as string
  const siteId = params.siteId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    async function loadSite() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .eq('client_id', clientId)
        .single()

      if (error || !data) {
        setError(error?.message || 'Site not found')
        setLoading(false)
        return
      }

      setFormData({
        site_name: data.site_name || '',
        address_line_1: data.address_line_1 || '',
        address_line_2: data.address_line_2 || '',
        suburb: data.suburb || '',
        province: data.province || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        contact_person: data.contact_person || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        notes: data.notes || '',
      })

      setLoading(false)
    }

    loadSite()
  }, [siteId, clientId])

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

    setSaving(true)
    setError('')

    const supabase = createClient()

    const { error } = await supabase
      .from('sites')
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId)
      .eq('client_id', clientId)

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
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            Loading site...
          </p>
        </div>
      </div>
    )
  }

  if (error && !formData.site_name && !formData.address_line_1) {
    return (
      <div className="max-w-3xl">
        <Link
          href={`/clients/${clientId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to Client
        </Link>

        <div className="rounded-xl border bg-white p-8">
          <h1 className="text-xl font-bold text-gray-900">
            Site not found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Link
        href={`/clients/${clientId}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Client
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Site
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Update the site and installation location details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Site Information
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="site_name"
                className="block text-sm font-medium text-gray-700"
              >
                Site Name
              </label>

              <input
                id="site_name"
                name="site_name"
                type="text"
                value={formData.site_name}
                onChange={handleChange}
                placeholder="e.g. Main House"
                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label
                htmlFor="address_line_1"
                className="block text-sm font-medium text-gray-700"
              >
                Address Line 1
              </label>

              <input
                id="address_line_1"
                name="address_line_1"
                type="text"
                value={formData.address_line_1}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div>
              <label
                htmlFor="address_line_2"
                className="block text-sm font-medium text-gray-700"
              >
                Address Line 2
              </label>

              <input
                id="address_line_2"
                name="address_line_2"
                type="text"
                value={formData.address_line_2}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="province"
                  className="block text-sm font-medium text-gray-700"
                >
                  Province
                </label>

                <input
                  id="province"
                  name="province"
                  type="text"
                  value={formData.province}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label
                  htmlFor="suburb"
                  className="block text-sm font-medium text-gray-700"
                >
                  Suburb
                </label>

                <input
                  id="suburb"
                  name="suburb"
                  type="text"
                  value={formData.suburb}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700"
                >
                  City
                </label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label
                  htmlFor="postal_code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Postal Code
                </label>

                <input
                  id="postal_code"
                  name="postal_code"
                  type="text"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Site Contact
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="contact_person"
                className="block text-sm font-medium text-gray-700"
              >
                Contact Person
              </label>

              <input
                id="contact_person"
                name="contact_person"
                type="text"
                value={formData.contact_person}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="contact_phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contact Phone
                </label>

                <input
                  id="contact_phone"
                  name="contact_phone"
                  type="text"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label
                  htmlFor="contact_email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contact Email
                </label>

                <input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Notes
          </h2>

          <textarea
            id="notes"
            name="notes"
            rows={5}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes about this site..."
            className="w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-700 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/clients/${clientId}`}
            className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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