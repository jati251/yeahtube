"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { UploadForm } from "./UploadForm";
import { HeaderUploadProps } from "@/types";

export function HeaderUpload({ isOpen, onClose, categories = [] }: HeaderUploadProps) {
  const [isMinimized, setIsMinimized] = React.useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Media"
      size="lg"
      isMinimized={isMinimized}
    >
      <UploadForm 
        onSuccess={onClose} 
        categories={categories} 
        onMinimizedChange={setIsMinimized} 
      />
    </Modal>
  );
}
