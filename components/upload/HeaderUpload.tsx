"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { UploadForm } from "./UploadForm";

interface HeaderUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HeaderUpload({ isOpen, onClose }: HeaderUploadProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Media"
      size="lg"
    >
      <UploadForm onSuccess={onClose} />
    </Modal>
  );
}
