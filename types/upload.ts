import { CategoryItem } from "@/types/category";

export interface SelectedFile {
  file: File;
  preview: string;
  id: string;
}

export interface UploadFormProps {
  onSuccess?: () => void;
  categories?: CategoryItem[];
  onMinimizedChange?: (minimized: boolean) => void;
}

export interface FileDropzoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | File[]) => void;
  acceptType: string;
  isDragOver: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  uploading: boolean;
}

export interface FilePreviewGridProps {
  files: SelectedFile[];
  onRemoveFile: (id: string) => void;
  onAddMoreClick: () => void;
  isVideoFile: (file: File) => boolean;
  uploading: boolean;
}

export interface UploadMetadataFieldsProps {
  title: string;
  onTitleChange: (title: string) => void;
  channel: "public" | "private";
  onChannelChange: (channel: "public" | "private") => void;
  category: string;
  onCategoryChange: (category: string) => void;
  categories: CategoryItem[];
  tags: string[];
  tagInput: string;
  onTagInputChange: (tagInput: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  albumMode: boolean;
  onAlbumModeChange: (albumMode: boolean) => void;
  instantUpload: boolean;
  onInstantUploadChange: (instantUpload: boolean) => void;
  fileCount: number;
  uploading: boolean;
}

export interface UploadProgressProps {
  progress: number;
  totalProgress?: number;
  isBulk?: boolean;
  statusText?: string;
  className?: string;
}

export interface HeaderUploadProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: CategoryItem[];
}
