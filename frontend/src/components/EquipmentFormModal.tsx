import { useEffect, useMemo, useState } from 'react';
import {
  addEquipmentImage,
  createEquipment,
  updateEquipment,
  type EquipmentRecord,
} from '../services/equipmentService';
import { equipmentFormSchema, type EquipmentFormValues } from '../lib/validation/equipment';

interface CategoryOption {
  id: string;
  name: string;
}

interface EquipmentFormModalProps {
  categories: CategoryOption[];
  equipment: EquipmentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm: EquipmentFormValues = {
  name: '',
  category_id: '',
  brand: '',
  model: '',
  description: '',
  condition: 'Good',
  price_per_day: 0,
  security_deposit: 0,
  location: '',
  is_published: true,
};

export function EquipmentFormModal({ categories, equipment, isOpen, onClose, onSaved }: EquipmentFormModalProps) {
  const [form, setForm] = useState<EquipmentFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setMessage(null);
    setErrors({});
    setSelectedFiles([]);

    if (equipment) {
      setForm({
        name: equipment.name ?? '',
        category_id: equipment.category_id ?? '',
        brand: equipment.brand ?? '',
        model: equipment.model ?? '',
        description: equipment.description ?? '',
        condition: (equipment.condition as EquipmentFormValues['condition']) || 'Good',
        price_per_day: Number(equipment.price_per_day ?? 0),
        security_deposit: Number(equipment.security_deposit ?? 0),
        location: equipment.location ?? '',
        is_published: Boolean(equipment.is_published),
      });
      return;
    }

    setForm({ ...emptyForm, category_id: categories[0]?.id ?? '' });
  }, [categories, equipment, isOpen]);

  const saveDisabled = useMemo(() => isSubmitting, [isSubmitting]);

  const updateField = <K extends keyof EquipmentFormValues>(field: K, value: EquipmentFormValues[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async () => {
    const parsed = equipmentFormSchema.safeParse(form);

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0]?.toString() ?? 'form';
        nextErrors[fieldName] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      const payload = parsed.data;
      let savedEquipment: EquipmentRecord;

      if (equipment) {
        savedEquipment = await updateEquipment(equipment.id, {
          name: payload.name,
          category_id: payload.category_id,
          brand: payload.brand || null,
          model: payload.model || null,
          description: payload.description || null,
          condition: payload.condition,
          price_per_day: payload.price_per_day,
          security_deposit: payload.security_deposit,
          location: payload.location || null,
          is_published: payload.is_published,
        });
      } else {
        savedEquipment = await createEquipment({
          name: payload.name,
          category_id: payload.category_id,
          brand: payload.brand || null,
          model: payload.model || null,
          description: payload.description || null,
          condition: payload.condition,
          price_per_day: payload.price_per_day,
          security_deposit: payload.security_deposit,
          location: payload.location || null,
          is_published: payload.is_published,
        });
      }

      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        try {
          await addEquipmentImage(savedEquipment.id, file, index);
        } catch (uploadError) {
          console.error('Image upload failed', uploadError);
          setMessage('Equipment was saved, but one or more images could not be uploaded.');
        }
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'Unable to save equipment right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#122927]/55 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(12,32,28,0.16)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Owner tools</p>
            <h3 className="text-2xl font-bold text-[#094d48]">{equipment ? 'Edit gear' : 'Add gear'}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-[#404947]">Close</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Name</label>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            />
            {errors.name && <p className="mt-1 text-sm text-[#994531]">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Category</label>
            <select
              value={form.category_id}
              onChange={(event) => updateField('category_id', event.target.value)}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="mt-1 text-sm text-[#994531]">{errors.category_id}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Condition</label>
            <select
              value={form.condition}
              onChange={(event) => updateField('condition', event.target.value as EquipmentFormValues['condition'])}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Needs Repair">Needs Repair</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Brand</label>
            <input
              value={form.brand}
              onChange={(event) => updateField('brand', event.target.value)}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Model</label>
            <input
              value={form.model}
              onChange={(event) => updateField('model', event.target.value)}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Price per day</label>
            <input
              type="number"
              min={0}
              value={form.price_per_day}
              onChange={(event) => updateField('price_per_day', Number(event.target.value))}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            />
            {errors.price_per_day && <p className="mt-1 text-sm text-[#994531]">{errors.price_per_day}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Security deposit</label>
            <input
              type="number"
              min={0}
              value={form.security_deposit}
              onChange={(event) => updateField('security_deposit', Number(event.target.value))}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            />
            {errors.security_deposit && <p className="mt-1 text-sm text-[#994531]">{errors.security_deposit}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Location</label>
            <input
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              className="w-full rounded-2xl border border-[#dfe3df] px-3 py-2.5 outline-none focus:border-[#094d48]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Photos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
              className="w-full rounded-2xl border border-dashed border-[#dfe3df] bg-[#f7f3eb] px-3 py-3"
            />
            {selectedFiles.length > 0 && <p className="mt-2 text-sm text-[#404947]">{selectedFiles.length} image(s) selected</p>}
          </div>

          <div className="md:col-span-2 flex items-center justify-between rounded-2xl bg-[#edf9f7] px-4 py-3">
            <span className="text-sm text-[#094d48]">Publish this listing immediately</span>
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) => updateField('is_published', event.target.checked)}
              className="h-4 w-4 accent-[#094d48]"
            />
          </div>
        </div>

        {message && <div className="mt-4 rounded-2xl border border-[#f0d0c5] bg-[#fff2ee] p-3 text-sm text-[#994531]">{message}</div>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[#dfe3df] px-4 py-2 text-sm font-medium text-[#404947]">
            Cancel
          </button>
          <button
            type="button"
            disabled={saveDisabled}
            onClick={handleSubmit}
            className="rounded-full bg-[#094d48] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : equipment ? 'Save changes' : 'Add equipment'}
          </button>
        </div>
      </div>
    </div>
  );
}
