import Link from 'next/link'
import { ArrowLeft, Plus, MapPin, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !client) {
    return (
      <div>
        <Link
          href="/clients"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to Clients
        </Link>

        <div className="mt-8 rounded-xl border bg-white p-8">
          <h1 className="text-xl font-bold text-gray-900">
            Client not found
          </h1>
        </div>
      </div>
    )
  }

  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const clientName =
    client.client_type === 'business'
      ? client.company_name
      : `${client.first_name || ''} ${client.last_name || ''}`.trim()

  return (
    <div>

      {/* Back */}
      <Link
        href="/clients"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Clients
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {clientName}
          </h1>

          <p className="mt-1 text-sm text-gray-600 capitalize">
            {client.client_type}
          </p>
        </div>

        <Link
          href={`/clients/${id}/edit`}
          className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Pencil size={16} />
          Edit Client
        </Link>

      </div>

      {/* Contact Information */}
      <div className="mb-8 rounded-xl border bg-white p-6">

        <h2 className="mb-5 text-lg font-semibold text-gray-800">
          Contact Information
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Email
            </p>

            <p className="mt-1 text-sm text-gray-900">
              {client.email || 'Not provided'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Phone
            </p>

            <p className="mt-1 text-sm text-gray-900">
              {client.phone || 'Not provided'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Alternative Phone
            </p>

            <p className="mt-1 text-sm text-gray-900">
              {client.alternative_phone || 'Not provided'}
            </p>
          </div>

        </div>

        {client.notes && (
          <div className="mt-5 border-t pt-5">

            <p className="text-xs font-medium uppercase text-gray-500">
              Notes
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
              {client.notes}
            </p>

          </div>
        )}

      </div>

      {/* Sites */}
      <div>

        <div className="mb-5 flex items-center justify-between">

          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Sites
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Properties and installation locations for this client.
            </p>
          </div>

          <Link
            href={`/clients/${id}/sites/new`}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus size={18} />
            Add Site
          </Link>

        </div>

        {sites && sites.length > 0 ? (

          <div className="grid gap-4 md:grid-cols-2">

            {sites.map((site) => (

              <div
                key={site.id}
                className="relative rounded-xl border bg-white transition hover:bg-gray-50"
              >

                {/* Entire Site Card */}
                <Link
                  href={`/clients/${id}/sites/${site.id}`}
                  className="block p-5 pr-28"
                >

                  <div className="flex items-start gap-3">

                    {/* Map Pin */}
                    <div className="shrink-0 rounded-lg bg-gray-300 p-2">
                      <MapPin size={20} />
                    </div>

                    {/* Site Information */}
                    <div className="min-w-0">

                      <h3 className="font-medium text-gray-800">
                        {site.site_name || 'Unnamed Site'}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {[
                          site.address_line_1,
                          site.address_line_2,
                          site.suburb,
                          site.city,
                          site.postal_code,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'No address provided'}
                      </p>

                    </div>

                  </div>

                </Link>

                {/* Edit Button */}
                <Link
                  href={`/clients/${id}/sites/${site.id}/edit`}
                  className="absolute right-5 top-5 flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={15} />
                  Edit
                </Link>

              </div>

            ))}

          </div>

        ) : (

          <div className="rounded-xl border border-dashed bg-white p-10 text-center">

            <MapPin
              size={30}
              className="mx-auto text-gray-400"
            />

            <h3 className="mt-3 font-medium text-gray-500">
              No sites yet
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Add the first site for this client.
            </p>

            <Link
              href={`/clients/${id}/sites/new`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus size={18} />
              Add Site
            </Link>

          </div>

        )}

      </div>

    </div>
  )
}