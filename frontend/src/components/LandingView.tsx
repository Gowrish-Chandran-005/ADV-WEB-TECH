import React from 'react';
import { GearCategory, GearItem } from '../types';

interface LandingViewProps {
  items: GearItem[];
  onGoToShelf: (category?: GearCategory, searchQuery?: string) => void;
  onOpenListGear: () => void;
  onOpenHowItWorks: () => void;
  onRentItem: (item: GearItem) => void;
  onToggleBookmark: (itemId: string) => void;
  onOpenCustodyModal: () => void;
  onOpenWantedReply: (wantedId: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  items,
  onGoToShelf,
  onOpenListGear,
  onOpenHowItWorks,
  onRentItem,
}) => {
  const featuredItems = items.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="grid items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dfe3df] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#094d48]">
            <span className="h-2 w-2 rounded-full bg-[#094d48]" />
            Gear rental, made simple
          </div>

          <h1 className="max-w-xl text-4xl font-bold tracking-[-0.06em] text-[#101613] sm:text-5xl lg:text-[3.7rem]">
            Borrow the right gear for your next project.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-[#404947]">
            GearLoop helps renters discover available equipment, owners manage their listings, and bookings move from request to approval without extra friction.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onGoToShelf()}
              className="rounded-full bg-[#094d48] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(9,77,72,0.18)] transition-transform hover:-translate-y-0.5"
            >
              Browse equipment
            </button>
            <button
              type="button"
              onClick={onOpenListGear}
              className="rounded-full border border-[#dfe3df] bg-white px-5 py-3 text-sm font-semibold text-[#094d48] transition-colors hover:border-[#094d48]"
            >
              List your gear
            </button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              'Browse by category and condition',
              'Review daily pricing and deposits',
              'Request and track booking status',
            ].map((text) => (
              <div key={text} className="rounded-2xl border border-[#dfe3df] bg-white p-3 text-sm text-[#404947] shadow-sm">
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#dfe3df] bg-white p-4 shadow-[0_18px_45px_rgba(13,35,33,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Featured inventory</p>
              <h2 className="mt-1 text-2xl font-bold text-[#0c1f1c]">Available now</h2>
            </div>
            <button
              type="button"
              onClick={() => onGoToShelf()}
              className="rounded-full border border-[#dfe3df] px-3 py-1.5 text-xs font-semibold text-[#094d48]"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {featuredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onRentItem(item)}
                className="flex w-full items-center gap-3 rounded-[22px] border border-[#edf0ee] bg-[#f9faf8] p-3 text-left transition-colors hover:border-[#094d48]/40 hover:bg-white"
              >
                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[#edf2f0]">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#6b7773]">Photo</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-base font-semibold text-[#1c1c17]">{item.title}</span>
                    <span className="text-sm font-semibold text-[#094d48]">₹{item.pricePerDay}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#404947]">{item.location}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6b7773]">
                    <span>{item.condition ?? 'Good condition'}</span>
                    <span>{item.rating.toFixed(1)} rating</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { title: 'Browse gear', body: 'Find cameras, lighting, tools, and other equipment by category and price.' },
          { title: 'Review booking details', body: 'Compare total rental cost, deposit, and dates before sending a request.' },
          { title: 'Manage listings', body: 'Owners can publish, edit, and track their equipment and received bookings.' },
        ].map((card) => (
          <div key={card.title} className="rounded-[24px] border border-[#dfe3df] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Workflow</p>
            <h3 className="mt-3 text-xl font-bold text-[#101613]">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#404947]">{card.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-10 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7773]">Marketplace</p>
          <h2 className="mt-1 text-2xl font-bold text-[#101613]">Popular equipment</h2>
        </div>
        <button
          type="button"
          onClick={() => onGoToShelf()}
          className="rounded-full border border-[#dfe3df] bg-white px-4 py-2 text-sm font-semibold text-[#094d48]"
        >
          See all listings
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onOpenHowItWorks}
          className="rounded-full border border-[#dfe3df] bg-white px-4 py-2 text-sm font-semibold text-[#094d48]"
        >
          How it works
        </button>
      </div>
    </div>
  );
};
