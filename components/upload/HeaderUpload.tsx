"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { UploadForm } from "./UploadForm";
import { HeaderUploadProps } from "@/types";

export function HeaderUpload({ isOpen, onClose, categories = [] }: HeaderUploadProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Media"
      size="lg"
    >
      <UploadForm 
        onSuccess={onClose} 
        categories={categories} 
      />
    </Modal>
  );
}
