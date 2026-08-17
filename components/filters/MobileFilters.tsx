"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { FilterSidebar } from "./FilterSidebar";
import { MobileFiltersProps } from "@/types";

export function MobileFilters(props: MobileFiltersProps) {
  const { isOpen, onClose, ...filterProps } = props;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advanced Filters" size="md">
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        <FilterSidebar {...filterProps} />
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
        >
          Apply Filters
        </button>
      </div>
    </Modal>
  );
}
