import Link from 'next/link'
import { ArrowLeft, Pencil, MapPin, Phone, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function SiteDetailsPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>
}) {
  const { id, siteId } = await params

  const supabase = await createClient()

  const { data: site, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .eq('client_id', id)
    .single()

  if (error || !site) {
    return (
      <div>
        <Link
          href={`/clients/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to Client
        </Link>

        <div className="rounded-xl border bg-white p-8">
          <h1 className="text-xl font-bold text-gray-900">
            Site not found
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            The site could not be found.
          </p>
        </div>
      </div>
    )
  }

  const address = [
    site.address_line_1,
    site.address_line_2,
    site.suburb,
    site.city,
    site.province,
    site.postal_code,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div>

      {/* Back */}
      <Link
        href={`/clients/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Client
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">

        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-300 p-2">
              <MapPin size={22} />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              {site.site_name || 'Unnamed Site'}
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Installation site details
          </p>
        </div>

        <Link
          href={`/clients/${id}/sites/${siteId}/edit`}
          className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Pencil size={16} />
          Edit Site
        </Link>

      </div>

      {/* Address */}
      <div className="mb-6 rounded-xl border bg-white p-6">

        <h2 className="mb-5 text-lg font-semibold text-gray-800">
          Site Address
        </h2>

        <div className="flex items-start gap-3">

          <MapPin
            size={20}
            className="mt-0.5 shrink-0 text-gray-500"
          />

          <div>
            {address ? (
              <p className="text-sm leading-6 text-gray-900">
                {address}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                No address provided
              </p>
            )}
          </div>

        </div>

      </div>

      {/* Site Contact */}
      <div className="mb-6 rounded-xl border bg-white p-6">

        <h2 className="mb-5 text-lg font-semibold text-gray-800">
          Site Contact
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Contact Person
            </p>

            <p className="mt-1 text-sm text-gray-900">
              {site.contact_person || 'Not provided'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Phone
            </p>

            {site.contact_phone ? (
              <a
                href={`tel:${site.contact_phone}`}
                className="mt-1 flex items-center gap-2 text-sm text-gray-900 hover:underline"
              >
                <Phone size={15} />
                {site.contact_phone}
              </a>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                Not provided
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Email
            </p>

            {site.contact_email ? (
              <a
                href={`mailto:${site.contact_email}`}
                className="mt-1 flex items-center gap-2 text-sm text-gray-900 hover:underline"
              >
                <Mail size={15} />
                {site.contact_email}
              </a>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                Not provided
              </p>
            )}
          </div>

        </div>

      </div>

      {/* Notes */}
      <div className="mb-6 rounded-xl border bg-white p-6">

        <h2 className="mb-5 text-lg font-semibold text-gray-800">
          Notes
        </h2>

        {site.notes ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-900">
            {site.notes}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            No notes for this site.
          </p>
        )}

      </div>

      {/* Jobs */}
      <div className="rounded-xl border bg-white p-6">

        <h2 className="text-lg font-semibold text-gray-800">
          Jobs & Installation History
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Jobs and installation history for this site will appear here.
        </p>

      </div>

    </div>
  )
}