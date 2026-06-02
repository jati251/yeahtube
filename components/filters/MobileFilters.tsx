"use client";

import React from "react";
import { Filter, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FilterSidebar } from "./FilterSidebar";

interface TagItem {
  id: number;
  name: string;
  slug: string;
  postCount?: number;
}

interface MobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: string | null;
  selectedTags: string[];
  tags: TagItem[];
  onMediaTypeChange: (type: string | null) => void;
  onTagToggle: (slug: string) => void;
  onClearAll: () => void;
}

export function MobileFilters(props: MobileFiltersProps) {
  const { isOpen, onClose, ...filterProps } = props;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={onClose}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
      >
        <Filter className="h-4 w-4" />
        Filters
      </button>

      {/* Mobile drawer via Modal */}
      <Modal isOpen={isOpen} onClose={onClose} title="Filters" size="full">
        <FilterSidebar {...filterProps} />
      </Modal>
    </>
  );
}
