'use client';

import { useState } from 'react';
import { Calendar, MapPin, Trash2 } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';

export default function DashboardSchedule({ schedule, onRefresh, onDelete, api }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Agenda Aberta');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date) return;
    setSaving(true);
    try {
      await api.schedule.create({ title, event_date: date, location, status });
      setTitle(''); setDate(''); setLocation(''); setStatus('Agenda Aberta');
      showToast('Evento adicionado com sucesso');
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Erro ao criar evento', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Agenda</h2>
      <div className="max-w-lg space-y-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Novo Evento</h3>
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-zinc-700 mb-1">Título</label>
            <input id="event-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm" placeholder="Ex: Casamento" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-zinc-700 mb-1">Data</label>
              <input id="event-date" type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm" />
            </div>
            <div>
              <label htmlFor="event-status" className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
              <select id="event-status" value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm bg-white">
                <option value="Agenda Aberta">Agenda Aberta</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Vagas Encerradas">Vagas Encerradas</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="event-location" className="block text-sm font-medium text-zinc-700 mb-1">Local</label>
            <input id="event-location" type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm" placeholder="Ex: São Paulo, SP" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Adicionar Evento'}
          </button>
        </form>

        {schedule.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum evento na agenda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedule.map((ev) => (
              <div key={ev.id} className="bg-white rounded-xl p-4 border border-zinc-200 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{ev.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(ev.event_date).toLocaleDateString('pt-BR')}</span>
                    {ev.location && <span className="flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    ev.status === 'Agenda Aberta' ? 'bg-emerald-50 text-emerald-600' :
                    ev.status === 'Confirmado' ? 'bg-stone-100 text-stone-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {ev.status}
                  </span>
                  <button
                    onClick={() => onDelete(ev)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    aria-label={`Excluir evento ${ev.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
