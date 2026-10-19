
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NewJobForm from './new-job-form'
export default async function NewJobPage() {
  const supabase = await createClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, client_type, first_name, last_name, company_name')
    .order('created_at', { ascending: false })

  if (error) {
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
          <h1 className="text-xl font-bold text-gray-800">
            Create Job
          </h1>

          <p className="mt-4 text-sm text-red-600">
            Could not load clients: {error.message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">

      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Jobs
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Create Job
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Create a new job for a client and installation site.
        </p>
      </div>

      <NewJobForm clients={clients || []} />

    </div>
  )
}
