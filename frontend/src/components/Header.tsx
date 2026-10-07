import React from 'react';

type HeaderView = 'landing' | 'campus-shelf' | 'equipment-browse' | 'equipment-detail' | 'owner-equipment' | 'my-bookings';

interface HeaderProps {
  currentView: HeaderView;
  onNavigate: (view: HeaderView) => void;
  onOpenListGear: () => void;
  onOpenHowItWorks: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenListGear,
  onOpenHowItWorks,
  onOpenNotifications,
  unreadCount,
}) => {
  const navItems = [
    { id: 'landing', label: 'Home' },
    { id: 'equipment-browse', label: 'Browse' },
    { id: 'my-bookings', label: 'My bookings' },
    { id: 'owner-equipment', label: 'My gear' },
  ] as const;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#dfe3df] bg-[#fdf9f1]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#094d48] text-sm font-bold text-white shadow-sm">
              G
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-[#094d48]">GearLoop</div>
            </div>
          </button>
        </div>

        <nav className="hidden items-center gap-2 rounded-full border border-[#dfe3df] bg-white/70 p-1 md:flex">
          {navItems.map((item) => {
            const active = currentView === item.id || (item.id === 'equipment-browse' && currentView === 'equipment-detail');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id as HeaderView)}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#094d48] text-white shadow-sm'
                    : 'text-[#404947] hover:bg-[#f4f5f2] hover:text-[#1c1c17]'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenHowItWorks}
            className="rounded-full px-3 py-2 text-sm font-medium text-[#404947] transition-colors hover:bg-[#f4f5f2] hover:text-[#1c1c17]"
          >
            How it works
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe3df] bg-white text-[#404947] transition-colors hover:border-[#094d48] hover:text-[#094d48]"
            aria-label="Open notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#994531] ring-2 ring-[#fdf9f1]" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenListGear}
            className="hidden rounded-full bg-[#094d48] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(9,77,72,0.18)] transition-transform hover:-translate-y-0.5 sm:inline-flex"
          >
            List gear
          </button>
        </div>
      </div>
    </header>
  );
};
