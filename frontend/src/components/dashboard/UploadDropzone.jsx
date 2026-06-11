'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Image, X, Check } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function compressToWebP(file, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      reject(new Error(`Formato não suportado: ${file.type}`));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Falha na compressão')); return; }
          const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
            type: 'image/webp',
          });
          resolve({ file: webpFile, originalName: file.name, width: img.width, height: img.height });
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem'));
    };

    img.src = url;
  });
}

export default function UploadDropzone({ albumId, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const addToQueue = useCallback(async (files) => {
    const valid = Array.from(files).filter((f) => ALLOWED_TYPES.includes(f.type));
    if (valid.length === 0) return;

    setDragging(false);

    const compressed = [];
    for (const file of valid) {
      try {
        const result = await compressToWebP(file);
        compressed.push(result);
      } catch {
        // skip failed compression
      }
    }

    setQueue((prev) => [...prev, ...compressed.map((r) => ({ ...r, status: 'pending', progress: 0 }))]);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      addToQueue(e.dataTransfer.files);
    },
    [addToQueue],
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e) => {
    addToQueue(e.target.files);
    e.target.value = '';
  };

  const uploadAll = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token || queue.length === 0) return;

    setUploading(true);

    const updated = [...queue];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'done') continue;
      updated[i].status = 'uploading';
      setQueue([...updated]);

      try {
        const form = new FormData();
        form.append('file', updated[i].file);
        const params = albumId ? `?album_id=${albumId}` : '';

        const res = await fetch(
          `/api/media/upload${params}`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
        );

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        updated[i] = { ...updated[i], status: 'done', result: data };
        setQueue([...updated]);
        onUploadComplete?.(data);
      } catch {
        updated[i] = { ...updated[i], status: 'error' };
        setQueue([...updated]);
      }
    }

    setUploading(false);
  };

  const clearQueue = () => setQueue([]);

  const pendingCount = queue.filter((f) => f.status === 'pending').length;
  const doneCount = queue.filter((f) => f.status === 'done').length;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          dragging
            ? 'border-zinc-900 bg-zinc-50'
            : 'border-zinc-200 hover:border-zinc-300 bg-white'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={handleInputChange}
        />
        <Upload className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm text-zinc-600">
          <span className="font-medium text-zinc-900">Clique para selecionar</span> ou arraste as fotos aqui
        </p>
        <p className="text-xs text-zinc-400 mt-1">JPEG, PNG, WebP • Compressão automática para WebP</p>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-zinc-700">
              {doneCount}/{queue.length} concluídas
            </span>
            <div className="flex gap-2">
              {!uploading && pendingCount > 0 && (
                <button
                  onClick={uploadAll}
                  className="text-xs bg-zinc-900 text-white px-4 py-1.5 rounded-full hover:bg-zinc-800 transition-colors"
                >
                  Enviar {pendingCount} foto{pendingCount > 1 ? 's' : ''}
                </button>
              )}
              {!uploading && (
                <button
                  onClick={clearQueue}
                  className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {queue.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                {item.status === 'done' && item.result?.thumbnail_url ? (
                  <img src={item.result.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-5 h-5 text-zinc-300 m-auto mt-2.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700 truncate">{item.originalName}</p>
                <p className="text-xs text-zinc-400">
                  {item.width}×{item.height} → WebP
                </p>
              </div>
              <div className="flex-shrink-0">
                {item.status === 'pending' && (
                  <span className="text-xs text-zinc-400">Aguardando</span>
                )}
                {item.status === 'uploading' && (
                  <span className="text-xs text-zinc-500 animate-pulse">Enviando…</span>
                )}
                {item.status === 'done' && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
                {item.status === 'error' && (
                  <span className="text-xs text-red-500">Erro</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
