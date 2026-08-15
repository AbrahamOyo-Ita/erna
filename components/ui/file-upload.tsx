'use client'

import Image from 'next/image'
import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { FileImage, ShieldCheck, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FilePreview = { file: File; url: string }

type FileUploadProps = {
  name: string
  ariaLabel: string
  title: string
  description: string
  helperText: string
  accept?: string
  multiple?: boolean
  required?: boolean
  maxFiles?: number
  maxSizeMb?: number
  disabled?: boolean
  className?: string
  onFilesChange?: (files: File[]) => void
}

function acceptedTypes(accept: string) {
  return accept.split(',').map(value => value.trim()).filter(Boolean)
}

function fileMatches(file: File, accept: string[]) {
  return accept.some(type => type.endsWith('/*') ? file.type.startsWith(type.slice(0, -1)) : file.type === type)
}

export function FileUpload({
  name,
  ariaLabel,
  title,
  description,
  helperText,
  accept = 'image/jpeg,image/png,image/webp',
  multiple = false,
  required,
  maxFiles = multiple ? 6 : 1,
  maxSizeMb = 5,
  disabled,
  className,
  onFilesChange,
}: FileUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<FilePreview[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => previews.forEach(preview => URL.revokeObjectURL(preview.url)), [previews])

  function updateInput(files: File[]) {
    if (inputRef.current && typeof DataTransfer !== 'undefined') {
      const transfer = new DataTransfer()
      files.forEach(file => transfer.items.add(file))
      inputRef.current.files = transfer.files
    }
    setPreviews(previous => {
      previous.forEach(preview => URL.revokeObjectURL(preview.url))
      return files.map(file => ({ file, url: URL.createObjectURL(file) }))
    })
    onFilesChange?.(files)
  }

  function restoreInput() {
    if (inputRef.current && typeof DataTransfer !== 'undefined') {
      const transfer = new DataTransfer()
      previews.forEach(preview => transfer.items.add(preview.file))
      inputRef.current.files = transfer.files
    }
  }

  function validate(next: File[]) {
    const files = multiple ? next.slice(0, maxFiles) : next.slice(0, 1)
    const allowed = acceptedTypes(accept)
    const invalidType = files.find(file => !fileMatches(file, allowed))
    const oversized = files.find(file => file.size > maxSizeMb * 1024 * 1024)

    if (next.length > maxFiles) {
      setError(`Choose no more than ${maxFiles} files.`)
      restoreInput()
      return
    }
    if (invalidType) {
      setError(`${invalidType.name} is not an accepted image type.`)
      restoreInput()
      return
    }
    if (oversized) {
      setError(`${oversized.name} is larger than ${maxSizeMb} MB.`)
      restoreInput()
      return
    }

    setError('')
    updateInput(files)
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    validate(Array.from(event.target.files ?? []))
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (!disabled) validate(Array.from(event.dataTransfer.files))
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  function removeFile(index: number) {
    updateInput(previews.filter((_, itemIndex) => itemIndex !== index).map(preview => preview.file))
    setError('')
  }

  return (
    <div className={cn('file-upload', dragging && 'is-dragging', disabled && 'is-disabled', className)}>
      <input
        ref={inputRef}
        id={inputId}
        className="file-upload-input"
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required && previews.length === 0}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={handleInput}
      />
      <div
        className="file-upload-dropzone"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-controls={inputId}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={handleKeyboard}
        onDragEnter={event => { event.preventDefault(); if (!disabled) setDragging(true) }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }}
        onDrop={handleDrop}
      >
        <span className="file-upload-mark"><UploadCloud aria-hidden="true" /></span>
        <span className="file-upload-copy"><strong>{title}</strong><small>{description}</small></span>
        <span className="file-upload-action">Browse files</span>
      </div>
      {previews.length > 0 && (
        <div className="file-upload-previews" aria-label="Selected files">
          {previews.map((preview, index) => (
            <div className="file-upload-preview" key={`${preview.file.name}-${preview.file.lastModified}`}>
              {preview.file.type.startsWith('image/')
                ? <Image src={preview.url} alt={`Preview of ${preview.file.name}`} width={72} height={72} unoptimized />
                : <span><FileImage aria-hidden="true" /></span>}
              <span><strong>{preview.file.name}</strong><small>{(preview.file.size / 1024 / 1024).toFixed(2)} MB</small></span>
              <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${preview.file.name}`}><X aria-hidden="true" /></button>
            </div>
          ))}
        </div>
      )}
      <p className="file-upload-helper"><ShieldCheck aria-hidden="true" />{helperText}</p>
      {error && <p className="file-upload-error" role="alert">{error}</p>}
    </div>
  )
}
