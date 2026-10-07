import { useEffect, useMemo, useState } from 'react';
import {
  getCategories,
  getEquipmentImages,
  getPublishedEquipment,
  type EquipmentCategory,
  type EquipmentRecord,
} from '../services/equipmentService';

interface EquipmentBrowsePageProps {
  onSelectEquipment: (equipmentId: string) => void;
}

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function EquipmentBrowsePage({ onSelectEquipment }: EquipmentBrowsePageProps) {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [imagesByEquipment, setImagesByEquipment] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [categoriesResponse, equipmentResponse] = await Promise.all([
          getCategories(),
          getPublishedEquipment(),
        ]);

        setCategories(categoriesResponse);
        setEquipment(equipmentResponse);

        const imageMap: Record<string, string[]> = {};
        for (const item of equipmentResponse) {
          const images = await getEquipmentImages(item.id);
          imageMap[item.id] = images.map((image) => image.image_url);
        }
        setImagesByEquipment(imageMap);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load equipment.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredEquipment = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return equipment.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [item.name, item.brand, item.model, item.description, item.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const categoryMatch = selectedCategory === 'all' || item.category_id === selectedCategory;
      const conditionMatch = selectedCondition === 'all' || item.condition === selectedCondition;
      const priceMatch = (item.price_per_day ?? 0) <= maxPrice;

      return matchesSearch && categoryMatch && conditionMatch && priceMatch;
    });
  }, [equipment, maxPrice, search, selectedCategory, selectedCondition]);

  const conditions = ['Excellent', 'Good', 'Fair', 'Needs Repair'];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 rounded-[28px] border border-[#dfe3df] bg-[#fffaf3] p-6 shadow-[0_14px_30px_rgba(12,32,28,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Marketplace</p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#094d48]">Browse GearLoop equipment</h2>
      </div>

      <div className="mb-6 grid gap-4 rounded-[26px] border border-[#dfe3df] bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Search</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, brand, model, or location"
            className="w-full rounded-2xl border border-[#dfe3df] bg-[#fafaf9] px-3 py-2.5 text-[#1c1c17] outline-none transition-colors focus:border-[#094d48]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Category</label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full rounded-2xl border border-[#dfe3df] bg-[#fafaf9] px-3 py-2.5 text-[#1c1c17] outline-none transition-colors focus:border-[#094d48]"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Condition</label>
          <select
            value={selectedCondition}
            onChange={(event) => setSelectedCondition(event.target.value)}
            className="w-full rounded-2xl border border-[#dfe3df] bg-[#fafaf9] px-3 py-2.5 text-[#1c1c17] outline-none transition-colors focus:border-[#094d48]"
          >
            <option value="all">All conditions</option>
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 rounded-[22px] border border-[#dfe3df] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Max price / day</label>
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className="w-full sm:w-72"
            />
          </div>
          <div className="rounded-full bg-[#edf9f7] px-3 py-1.5 text-sm font-semibold text-[#094d48]">
            Up to {money.format(maxPrice)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-6 text-[#404947]">Loading equipment...</div>
      ) : error ? (
        <div className="rounded-[28px] border border-[#f0d0c5] bg-[#fff2ee] p-6 text-[#994531]">{error}</div>
      ) : filteredEquipment.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-8 text-center text-[#404947]">
          No equipment matches the current filters.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredEquipment.map((item) => {
            const categoryName = categories.find((category) => category.id === item.category_id)?.name ?? 'Uncategorized';
            const primaryImage = imagesByEquipment[item.id]?.[0] ?? '';

            return (
              <article key={item.id} className="overflow-hidden rounded-[28px] border border-[#dfe3df] bg-white shadow-[0_12px_28px_rgba(12,32,28,0.04)] transition-transform hover:-translate-y-0.5">
                <div className="h-56 bg-[#edf2f0]">
                  {primaryImage ? (
                    <img src={primaryImage} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#6b7773]">No image available</div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#edf9f7] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#094d48]">
                      {categoryName}
                    </span>
                    <span className="text-xs text-[#404947]">{item.condition}</span>
                  </div>

                  <h3 className="text-xl font-bold text-[#101613]">{item.name}</h3>
                  <p className="mt-2 text-sm text-[#404947]">{item.brand || 'Brand not provided'} · {item.model || 'Model N/A'}</p>
                  <p className="mt-3 text-sm leading-6 text-[#404947]">{item.description || 'No description added yet.'}</p>

                  <div className="mt-4 flex items-center justify-between text-sm text-[#404947]">
                    <span className="font-semibold text-[#094d48]">{money.format(item.price_per_day ?? 0)}/day</span>
                    <span>{item.location || 'Location not set'}</span>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectEquipment(item.id)}
                      className="inline-flex items-center justify-center rounded-full bg-[#094d48] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      View details
                    </button>
                    <span className="text-xs text-[#6b7773]">{item.status}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
