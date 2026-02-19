import React, { useRef, useEffect, useCallback } from 'react';
import { RpImageEditor, RpEditorConfig, RpEditorResult } from '@rageshpikalmunde/rp-image-editor';

export interface RpImageEditorProps {
  /** Image source — File, Blob, or URL string */
  image: File | Blob | string | null;

  /** Editor configuration */
  config?: Partial<RpEditorConfig>;

  /** Called when user clicks Apply */
  onImageEdited?: (result: RpEditorResult) => void;

  /** Called when editor encounters an error */
  onError?: (error: Error) => void;

  /** Custom class name for the container */
  className?: string;

  /** Custom style for the container */
  style?: React.CSSProperties;
}

/**
 * React component that renders the image editor inline.
 * For modal usage, use the `useRpImageEditor()` hook instead.
 */
export const RpImageEditorComponent: React.FC<RpImageEditorProps> = ({
  image,
  config,
  onImageEdited,
  onError,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RpImageEditor | null>(null);

  useEffect(() => {
    if (!image || !containerRef.current) return;

    // Destroy previous editor
    if (editorRef.current) {
      editorRef.current.destroy();
    }

    const editor = new RpImageEditor(containerRef.current, config);
    editorRef.current = editor;

    editor.on('error', (err) => onError?.(err));

    editor.loadImage(image).catch((err) => onError?.(err));

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [image]); // Re-init when image changes

  return (
    <div
      ref={containerRef}
      className={className || 'rp-image-editor-host'}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 300,
        ...style,
      }}
    />
  );
};
