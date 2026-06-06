"use client";

import React from "react";
import { Filter } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FilterSidebar } from "./FilterSidebar";

interface TagItem {
  id: number;
  name: string;
  slug: string;
  postCount?: number;
}

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

interface MobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: string | null;
  selectedTags: string[];
  tags: TagItem[];
  category: string | null;
  categories: CategoryItem[];
  year: string | null;
  onMediaTypeChange: (type: string | null) => void;
  onTagToggle: (slug: string) => void;
  onCategoryChange: (slug: string | null) => void;
  onYearChange: (year: string | null) => void;
  onClearAll: () => void;
}

export function MobileFilters(props: MobileFiltersProps) {
  const { isOpen, onClose, ...filterProps } = props;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filters" size="full">
      <FilterSidebar {...filterProps} />
    </Modal>
  );
}
