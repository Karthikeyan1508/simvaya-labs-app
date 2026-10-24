'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SectionNav, type SectionNavProps } from './sidebar';

// Mobile: the same section list in a drawer, opened from the hamburger in the navbar.
export function MobileNav<T extends string>({
  open,
  onOpenChange,
  ...nav
}: SectionNavProps<T> & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[84vw] gap-0 border-r bg-background/95 p-3 backdrop-blur-xl sm:max-w-sm">
        <SheetHeader className="px-2 pt-2 pb-3">
          <SheetTitle className="text-base">Sections</SheetTitle>
        </SheetHeader>
        <SectionNav
          {...nav}
          onSelect={(id) => {
            nav.onSelect(id);
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
