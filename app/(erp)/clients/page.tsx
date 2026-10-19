import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { search } = await searchParams
  const searchTerm = search?.trim() || ''

  const supabase = await createClient()

  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (searchTerm) {
    query = query.or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
    )
  }

  const { data: clients, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold">
          Clients
        </h1>

        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          Could not load clients: {error.message}
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
            Clients
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage New Tech Power clients.
          </p>
        </div>

        <Link
          href="/clients/new"
          className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus size={18} />
          Add Client
        </Link>

      </div>

      {/* Search */}
      <form
        method="GET"
        className="mb-6 flex gap-3"
      >
        <div className="relative flex-1 text-gray-700">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            name="search"
            defaultValue={searchTerm}
            placeholder="Search clients by name, company, email or phone..."
            className="w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
          />

        </div>

        <button
          type="submit"
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Search
        </button>

        {searchTerm && (
          <Link
            href="/clients"
            className="flex items-center rounded-lg border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </Link>
        )}

      </form>

      {/* Client list */}
      {clients && clients.length > 0 ? (

        <div className="overflow-hidden rounded-xl border bg-white">

          <div className="divide-y">

            {clients.map((client) => (

              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center justify-between p-5 hover:bg-gray-50"
              >
                <div>

                  <h2 className="font-bold text-gray-700">
                    {client.client_type === 'business'
                      ? client.company_name
                      : `${client.first_name || ''} ${client.last_name || ''}`.trim()
                    }
                  </h2>

                  <p className="mt-1 text-sm text-gray-700">
                    {client.email || 'No email'}
                    {client.phone && ` • ${client.phone}`}
                  </p>

                </div>

                <span className="rounded-full bg-gray-300 px-3 py-1 text-xs capitalize text-gray-800">
                  {client.client_type}
                </span>

              </Link>

            ))}

          </div>

        </div>

      ) : (

        <div className="rounded-xl border bg-white p-12 text-center">

          <h2 className="text-lg font-semibold">
            {searchTerm ? 'No clients found' : 'No clients yet'}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {searchTerm
              ? `No clients matched "${searchTerm}".`
              : 'Add your first client to get started.'
            }
          </p>

          {searchTerm ? (
            <Link
              href="/clients"
              className="mt-5 inline-flex items-center rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear Search
            </Link>
          ) : (
            <Link
              href="/clients/new"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
            >
              <Plus size={18} />
              Add Client
            </Link>
          )}

        </div>

      )}

    </div>
  )
}