'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'

type Photo = {
    id: string
    file_path: string
    file_name: string
    created_at: string
}

export default function SitePhotos({
    jobId,
}: {
    jobId: string
}) {
    const [photos, setPhotos] = useState<Photo[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadPhotos()
    }, [jobId])

    async function loadPhotos() {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('site_photos')
            .select('*')
            .eq('job_id', jobId)
            .order('created_at', {
                ascending: false,
            })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setPhotos(data || [])
        setLoading(false)
    }

    async function handleUpload(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        const files = e.target.files

        if (!files || files.length === 0) {
            return
        }

        setUploading(true)
        setError('')

        const supabase = createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        for (const file of Array.from(files)) {
            const fileExtension =
                file.name.split('.').pop() || 'jpg'

            const filePath =
                `${jobId}/${crypto.randomUUID()}.${fileExtension}`

            const { error: uploadError } =
                await supabase.storage
                    .from('site-photos')
                    .upload(filePath, file)

            if (uploadError) {
                setError(uploadError.message)
                continue
            }

            const { error: databaseError } =
                await supabase
                    .from('site_photos')
                    .insert({
                        job_id: jobId,
                        file_path: filePath,
                        file_name: file.name,
                        uploaded_by: user?.id || null,
                    })

            if (databaseError) {
                setError(databaseError.message)

                await supabase.storage
                    .from('site-photos')
                    .remove([filePath])
            }
        }

        await loadPhotos()

        setUploading(false)

        e.target.value = ''
    }

    async function handleDelete(photo: Photo) {
        const confirmed = window.confirm(
            `Delete ${photo.file_name}?`
        )

        if (!confirmed) {
            return
        }

        const supabase = createClient()

        const { error: storageError } =
            await supabase.storage
                .from('site-photos')
                .remove([photo.file_path])

        if (storageError) {
            setError(storageError.message)
            return
        }

        const { error: databaseError } =
            await supabase
                .from('site_photos')
                .delete()
                .eq('id', photo.id)

        if (databaseError) {
            setError(databaseError.message)
            return
        }

        setPhotos((current) =>
            current.filter((item) => item.id !== photo.id)
        )
    }

    function getPhotoUrl(filePath: string) {
        const supabase = createClient()

        const { data } = supabase.storage
            .from('site-photos')
            .getPublicUrl(filePath)

        return data.publicUrl
    }

    if (loading) {
        return (
            <div className="rounded-xl border bg-white p-6">
                <p className="text-sm text-gray-500">
                    Loading photos...
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border bg-white p-6">

            <div className="mb-5 flex items-center justify-between">

                <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                        Site Photos
                    </h2>

                    <p className="mt-1 text-sm text-gray-600">
                        Photos taken during the site assessment.
                    </p>
                </div>

                <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 ${uploading
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
                >
                    <Upload size={17} />

                    {uploading ? 'Uploading...' : 'Add Photos'}

                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={handleUpload}
                        className="hidden"
                    />
                </label>

            </div>

            {error && (
                <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            {photos.length === 0 ? (

                <div className="rounded-lg border border-dashed p-10 text-center">

                    <ImageIcon
                        size={32}
                        className="mx-auto text-gray-400"
                    />

                    <p className="mt-3 text-sm font-medium text-gray-700">
                        No photos yet
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                        Upload photos from the site assessment.
                    </p>

                </div>

            ) : (

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">

                    {photos.map((photo) => (

                        <div
                            key={photo.id}
                            className="group relative overflow-hidden rounded-lg border bg-gray-50"
                        >

                            <img
                                src={getPhotoUrl(photo.file_path)}
                                alt={photo.file_name}
                                className="aspect-square w-full object-cover"
                            />

                            <div className="flex items-center justify-between gap-2 p-2">

                                <p className="truncate text-xs text-gray-600">
                                    {photo.file_name}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(photo)}
                                    className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                    title="Delete photo"
                                >
                                    <Trash2 size={15} />
                                </button>

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </div>
    )
}
