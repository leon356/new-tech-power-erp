import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DocumentsPage() {
    const supabase = await createClient()

    const { data: documents, error } = await supabase
        .from('documents')
        .select(`
      *,
      clients (
        first_name,
        last_name,
        company_name,
        client_type
      ),
      jobs (
        job_number,
        title
      )
    `)
        .order('created_at', {
            ascending: false,
        })

    if (error) {
        return (
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Documents
                </h1>

                <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Could not load documents: {error.message}
                </div>
            </div>
        )
    }

    function getClientName(client: any) {
        if (!client) return null

        if (client.client_type === 'business') {
            return client.company_name || 'Unnamed Business'
        }

        return (
            `${client.first_name || ''} ${client.last_name || ''
                }`.trim() || 'Unnamed Client'
        )
    }

    function formatFileSize(bytes: number | null) {
        if (!bytes) return ''

        if (bytes < 1024) {
            return `${bytes} B`
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`
        }

        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div>

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">

                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Documents
                    </h1>

                    <p className="mt-1 text-sm text-gray-600">
                        Store and manage documents for clients and jobs.
                    </p>
                </div>

                <Link
                    href="/documents/new"
                    className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                    <Plus size={18} />
                    Upload Document
                </Link>

            </div>

            {/* Document list */}
            {documents && documents.length > 0 ? (

                <div className="overflow-hidden rounded-xl border bg-white">

                    <div className="divide-y">

                        {documents.map((document) => {

                            const client = Array.isArray(document.clients)
                                ? document.clients[0]
                                : document.clients

                            const job = Array.isArray(document.jobs)
                                ? document.jobs[0]
                                : document.jobs

                            const clientName =
                                getClientName(client)

                            const { data: publicUrl } =
                                supabase.storage
                                    .from('documents')
                                    .getPublicUrl(document.file_path)

                            return (
                                <div
                                    key={document.id}
                                    className="flex items-center justify-between gap-6 p-5 hover:bg-gray-50"
                                >

                                    <div className="min-w-0">

                                        <a
                                            href={publicUrl.publicUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-gray-800 hover:underline"
                                        >
                                            {document.name}
                                        </a>

                                        <div className="mt-1 flex flex-wrap gap-x-2 text-sm text-gray-500">

                                            {job && (
                                                <span>
                                                    {job.job_number}
                                                </span>
                                            )}

                                            {clientName && (
                                                <>
                                                    {job && <span>•</span>}
                                                    <span>{clientName}</span>
                                                </>
                                            )}

                                            {document.file_type && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {document.file_type}
                                                    </span>
                                                </>
                                            )}

                                            {document.file_size && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {formatFileSize(
                                                            document.file_size
                                                        )}
                                                    </span>
                                                </>
                                            )}

                                        </div>

                                    </div>

                                    <a
                                        href={publicUrl.publicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Open
                                    </a>

                                </div>
                            )
                        })}

                    </div>

                </div>

            ) : (

                <div className="rounded-xl border bg-white p-12 text-center">

                    <h2 className="text-lg font-semibold text-gray-800">
                        No documents yet
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        Upload your first document to get started.
                    </p>

                    <Link
                        href="/documents/new"
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
                    >
                        <Plus size={18} />
                        Upload Document
                    </Link>

                </div>

            )}

        </div>
    )
}
